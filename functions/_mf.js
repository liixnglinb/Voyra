// ModelFlow 授权服务共享库（Cloudflare Pages Functions）
// 下划线开头，不产生路由。被 functions/modelflow/api/*.js 引用。
//
// D1 绑定：Pages 项目 → Settings → Functions → D1 bindings，变量名必须为 DB
// 表结构见 migrations/0001_mflic.sql（首次可由本库 ensure() 自动建表）。
//
// 环境变量（Pages → Settings → Environment variables）：
//   COS_SECRET_ID / COS_SECRET_KEY — 腾讯云 COS 密钥，用于生成预签名下载 URL
//   （未配置时 verify 返回 ok 但不带 download_url，前端回退到 manifest.url）

// 与桌面端 app/licensing.py 保持一致的 HMAC 密钥（客户端内置同值，仅用于离线令牌校验）
export const SECRET = "1adee14c497b3b976a3beb1aa602744a8a54b04782e2b2526ccb0800924b9af3";
export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去除易混 I O 0 1
export const SEED_CODES = ["H2DTH", "2FMGW", "NFE8H", "GX7VJ", "9GAQF"];

const enc = new TextEncoder();
function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
export async function sha256Hex(str) {
  return bufToHex(await crypto.subtle.digest("SHA-256", enc.encode(String(str))));
}
// HMAC-SHA256(key, msg) → hex（与 Python hmac.new(...).hexdigest() 等价）
export async function hmacHex(keyStr, msgStr) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(keyStr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msgStr));
  return bufToHex(sig);
}
// SHA-1 / HMAC-SHA1（腾讯云 COS 预签名算法要求，Cloudflare Workers 支持 SHA-1）
export async function sha1Hex(str) {
  return bufToHex(await crypto.subtle.digest("SHA-1", enc.encode(String(str))));
}
export async function hmacSha1Hex(keyStr, msgStr) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(keyStr), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msgStr));
  return bufToHex(sig);
}
export async function tokenFor(code, mid) {
  return (await hmacHex(SECRET, `${code}|${mid}`)).slice(0, 32);
}

export function now() {
  // 东八区时间字符串，与旧服务 time.strftime("%Y-%m-%d %H:%M:%S") 风格一致
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

// 统一 CORS / JSON
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,X-Admin-Pass",
      "Cache-Control": "no-store",
    },
  });
}
export function preflight() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,X-Admin-Pass",
      "Access-Control-Max-Age": "86400",
    },
  });
}
export async function readBody(request) {
  try { return await request.json(); } catch (e) { return {}; }
}

// D1 未绑定时的友好拦截：返回 503 提示，而不是让 Worker 抛异常
export function guardDB(env) {
  if (!env || !env.DB) {
    return json({
      ok: false,
      setup: true,
      msg: "后台尚未启用：请在 Cloudflare 控制台为 voyra 项目绑定 D1 数据库（绑定变量名填 DB）后刷新重试",
    }, 503);
  }
  return null;
}

// 首次运行自动建表 + 播种 5 个授权码（幂等）
export async function ensure(db) {
  if (!db) throw new Error("D1 binding 'DB' 未配置");
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS codes(
      code TEXT PRIMARY KEY, note TEXT DEFAULT '', is_admin INTEGER DEFAULT 0,
      bound_mid TEXT DEFAULT '', bound_at TEXT DEFAULT '',
      revoked INTEGER DEFAULT 0, created_at TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS rate_limit(
      ip TEXT NOT NULL, action TEXT NOT NULL, count INTEGER DEFAULT 0,
      window_start INTEGER DEFAULT 0, banned_until INTEGER DEFAULT 0,
      PRIMARY KEY (ip, action))`),
  ]);
  const t = now();
  for (const code of SEED_CODES) {
    await db.prepare("INSERT OR IGNORE INTO codes(code,note,is_admin,created_at) VALUES(?,?,0,?)")
      .bind(code, "初始授权码", t).run();
  }
}

// 管理密码：哈希存 meta.admin_pass_hash；返回是否通过
export async function checkAdmin(env, pass) {
  await ensure(env.DB);
  const row = await env.DB.prepare("SELECT v FROM meta WHERE k='admin_pass_hash'").first();
  if (!row || !row.v) return { ok: false, reason: "not_setup" };
  const h = await sha256Hex(pass || "");
  return { ok: h === row.v };
}
export async function requireAdmin(request, env) {
  const pass = request.headers.get("X-Admin-Pass") || "";
  const r = await checkAdmin(env, pass);
  if (!r.ok) return { ok: false, response: json({ ok: false, msg: r.reason === "not_setup" ? "管理后台尚未初始化" : "管理密码错误" }, 403) };
  return { ok: true };
}

// ========== 客户端 IP + 速率限制（防爆破） ==========

export function getClientIP(request) {
  return request.headers.get("CF-Connecting-IP") ||
    (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim() ||
    "unknown";
}

// 同一 IP 在 windowSeconds 内超过 maxAttempts 次则封禁 banSeconds
// action 用于区分不同接口（verify / activate / admin_login）
export async function checkRateLimit(db, ip, action, maxAttempts, windowSeconds, banSeconds) {
  const nowSec = Math.floor(Date.now() / 1000);
  let row = await db.prepare("SELECT * FROM rate_limit WHERE ip=? AND action=?").bind(ip, action).first();
  if (!row) {
    await db.prepare("INSERT OR IGNORE INTO rate_limit(ip,action,count,window_start,banned_until) VALUES(?,?,1,?,0)")
      .bind(ip, action, nowSec).run();
    return { allowed: true };
  }
  if (row.banned_until > nowSec) {
    return { allowed: false, retryAfter: row.banned_until - nowSec };
  }
  if (nowSec - row.window_start > windowSeconds) {
    await db.prepare("UPDATE rate_limit SET count=1, window_start=?, banned_until=0 WHERE ip=? AND action=?")
      .bind(nowSec, ip, action).run();
    return { allowed: true };
  }
  if (row.count >= maxAttempts) {
    await db.prepare("UPDATE rate_limit SET banned_until=? WHERE ip=? AND action=?")
      .bind(nowSec + banSeconds, ip, action).run();
    return { allowed: false, retryAfter: banSeconds };
  }
  await db.prepare("UPDATE rate_limit SET count=count+1 WHERE ip=? AND action=?").bind(ip, action).run();
  return { allowed: true };
}

// ========== 腾讯云 COS 预签名下载 URL ==========

// 生成 GET 请求的预签名 URL（默认 5 分钟有效）。
// COS 桶设为私有后，只有通过此接口拿到签名 URL 才能下载 exe。
// 需要环境变量 COS_SECRET_ID / COS_SECRET_KEY；未配置时返回 null。
export async function signCosUrl(env, key, expiresSeconds = 300) {
  const secretId = env.COS_SECRET_ID;
  const secretKey = env.COS_SECRET_KEY;
  if (!secretId || !secretKey) return null;
  const bucket = "modelflow-1447874637";
  const region = "ap-guangzhou";
  const host = `${bucket}.cos.${region}.myqcloud.com`;
  const nowSec = Math.floor(Date.now() / 1000);
  const endSec = nowSec + expiresSeconds;
  const signTime = `${nowSec};${endSec}`;
  const uriPath = "/" + key.split("/").map(encodeURIComponent).join("/");

  // GET 下载预签名：只签 host 头，不签查询参数（与腾讯云 Python SDK 一致）
  const headers = { "host": host };
  const headerList = Object.keys(headers).sort().join(";");
  const urlParamList = ""; // 空：查询参数不参与签名
  const headerString = Object.keys(headers).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(headers[k])}`).join("&");

  // HttpString = method\nuri\n(空 query)\nheaders\n
  const httpString = `get\n${uriPath}\n\n${headerString}\n`;
  const httpStringHash = await sha1Hex(httpString);

  // StringToSign = algorithm\nsign-time\nsha1(httpString)\n
  const stringToSign = `sha1\n${signTime}\n${httpStringHash}\n`;

  // SignKey = HMAC-SHA1(SecretKey, "q-sign-algorithm=sha1&q-ak=...&q-sign-time=...")
  const signKeyMsg = `q-sign-algorithm=sha1&q-ak=${secretId}&q-sign-time=${signTime}`;
  const signKey = await hmacSha1Hex(secretKey, signKeyMsg);

  // Signature = HMAC-SHA1(SignKey, StringToSign)
  const signature = await hmacSha1Hex(signKey, stringToSign);

  // 最终 URL（查询参数不参与签名，但仍需放在 URL 里）
  const q = `q-sign-algorithm=sha1&q-ak=${encodeURIComponent(secretId)}&q-sign-time=${encodeURIComponent(signTime)}&q-key-time=${encodeURIComponent(signTime)}&q-header-list=${headerList}&q-url-param-list=${urlParamList}`;
  return `https://${host}${uriPath}?${q}&q-signature=${signature}`;
}
