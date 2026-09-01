// ModelFlow 授权服务共享库（Cloudflare Pages Functions）
// 下划线开头，不产生路由。被 functions/modelflow/api/*.js 引用。
//
// D1 绑定：Pages 项目 → Settings → Functions → D1 bindings，变量名必须为 DB
// 表结构见 migrations/0001_mflic.sql（首次可由本库 ensure() 自动建表）。

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

// 首次运行自动建表 + 播种 5 个授权码（幂等）
export async function ensure(db) {
  if (!db) throw new Error("D1 binding 'DB' 未配置");
  db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS codes(
      code TEXT PRIMARY KEY, note TEXT DEFAULT '', is_admin INTEGER DEFAULT 0,
      bound_mid TEXT DEFAULT '', bound_at TEXT DEFAULT '',
      revoked INTEGER DEFAULT 0, created_at TEXT)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT)`),
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
