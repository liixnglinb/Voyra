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
// 注意：不再硬编码初始授权码（SEED_CODES 已移除）。
// 固定码写在源码中有泄露风险；首次部署后请通过管理后台 setup → 登录 → 生成授权码。
// 已有的旧初始码（H2DTH/2FMGW/NFE8H/GX7VJ/9GAQF）若仓库曾公开，应在管理后台吊销并重新生成。

const enc = new TextEncoder();
function bufToHex(buf) {
  return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
export async function sha256Hex(str) {
  return bufToHex(await crypto.subtle.digest("SHA-256", enc.encode(String(str))));
}
// 授权码哈希：数据库只存 SHA-256，不存明文。查询/更新前先调此函数。
export async function hashCode(code) {
  return sha256Hex((code || "").trim().toUpperCase());
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

// ========== 授权码对称加密（AES-GCM） ==========
// 数据库 code 字段存 SHA-256 哈希（用于验证），code_enc 字段存 AES-GCM 密文（用于管理员查看明文）。
// 加密密钥从 COS_SECRET_KEY 派生（SHA-256 取 32 字节），无需额外配置环境变量。
// 5 位码哈希可暴力破解（32^5≈3355万），加密比哈希更安全：数据库泄露无密钥无法解密。
function b64encode(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64decode(str) {
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
async function getCodeKey(env) {
  const secret = env.CODE_ENC_KEY || env.COS_SECRET_KEY || "modelflow-fallback-key";
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
// 加密明文授权码 → base64(iv[12] + ciphertext+tag)
export async function encryptCode(plain, env) {
  const key = await getCodeKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain));
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(ct), 12);
  return b64encode(out);
}
// 解密密文 → 明文；失败返回 null
export async function decryptCode(encStr, env) {
  if (!encStr) return null;
  try {
    const key = await getCodeKey(env);
    const raw = b64decode(encStr);
    const iv = raw.slice(0, 12);
    const ct = raw.slice(12);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}

export function now() {
  // 东八区时间字符串，与旧服务 time.strftime("%Y-%m-%d %H:%M:%S") 风格一致
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace("T", " ");
}

// 统一 CORS / JSON —— 仅允许自有域名跨域调用（防第三方网站嵌入授权接口）
const ALLOWED_ORIGIN = "https://lxlrwxs.top";
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,X-Admin-Pass",
      "Vary": "Origin",
      "Cache-Control": "no-store",
    },
  });
}
export function preflight() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,X-Admin-Pass",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    },
  });
}
export async function readBody(request) {
  try { return await request.json(); } catch (e) { return {}; }
}

// 网页来源校验：仅允许从 lxlrwxs.top 发起的请求（用于下载验证等网页端接口）。
// 软件端接口（activate/check）不调用此函数，因为 Python requests 不带 Origin。
export function checkWebOrigin(request) {
  const origin = (request.headers.get("Origin") || "").toLowerCase();
  const referer = (request.headers.get("Referer") || "").toLowerCase();
  const allowed = "https://lxlrwxs.top";
  if (origin && origin.startsWith(allowed)) return true;
  if (!origin && referer && referer.startsWith(allowed)) return true;
  return false;
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

// 首次运行自动建表（幂等）+ 自动迁移明文码为哈希。
// 不再播种固定授权码——固定码硬编码在源码中有泄露风险。
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
  // 迁移：旧版明文存储的授权码（长度 != 64）自动转为 SHA-256 哈希
  const migrated = await db.prepare("SELECT v FROM meta WHERE k='codes_hashed'").first();
  if (!migrated) {
    const { results } = await db.prepare("SELECT code FROM codes").all();
    for (const row of results || []) {
      if (row.code && row.code.length !== 64) {
        const h = await hashCode(row.code);
        await db.prepare("UPDATE codes SET code=? WHERE code=?").bind(h, row.code).run();
      }
    }
    await db.prepare("INSERT OR REPLACE INTO meta(k,v) VALUES('codes_hashed','1')").run();
  }
  // 迁移：新增 code_enc 字段（AES-GCM 密文，用于管理员查看明文），幂等
  const encCol = await db.prepare("SELECT v FROM meta WHERE k='code_enc_added'").first();
  if (!encCol) {
    try {
      await db.prepare("ALTER TABLE codes ADD COLUMN code_enc TEXT DEFAULT ''").run();
    } catch { /* 已存在则忽略 */ }
    await db.prepare("INSERT OR REPLACE INTO meta(k,v) VALUES('code_enc_added','1')").run();
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
  // 开始时间提前 60 秒，处理时钟偏移（与腾讯云 Python SDK 一致）
  const startSec = nowSec - 60;
  const endSec = nowSec + expiresSeconds;
  const signTime = `${startSec};${endSec}`;
  const uriPath = "/" + key.split("/").map(encodeURIComponent).join("/");

  // GET 下载预签名：只签 host 头，不签查询参数（与 Python SDK 一致）
  const headers = { "host": host };
  const headerList = Object.keys(headers).sort().join(";");
  const urlParamList = "";
  const headerString = Object.keys(headers).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(headers[k])}`).join("&");

  // HttpString = method\nuri\n(空 query)\nheaders\n
  const httpString = `get\n${uriPath}\n\n${headerString}\n`;
  const httpStringHash = await sha1Hex(httpString);

  // StringToSign = algorithm\nsign-time\nsha1(httpString)\n
  const stringToSign = `sha1\n${signTime}\n${httpStringHash}\n`;

  // SignKey = HMAC-SHA1(SecretKey, sign_time) —— 注意：只用 sign_time，不是完整消息（与 Python SDK 一致）
  const signKey = await hmacSha1Hex(secretKey, signTime);

  // Signature = HMAC-SHA1(SignKey, StringToSign)
  const signature = await hmacSha1Hex(signKey, stringToSign);

  // 最终 URL
  const q = `q-sign-algorithm=sha1&q-ak=${encodeURIComponent(secretId)}&q-sign-time=${encodeURIComponent(signTime)}&q-key-time=${encodeURIComponent(signTime)}&q-header-list=${headerList}&q-url-param-list=${urlParamList}`;
  return `https://${host}${uriPath}?${q}&q-signature=${signature}`;
}
