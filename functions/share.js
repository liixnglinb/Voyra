// POST /share  { code: "VOYRA2:..." }
// 课表分享短链：把口令正文存进 D1，只返回一个 7 位短 ID。
// 返回 { ok:true, id, url: "https://lxlrwxs.top/s/<id>" }；D1 未绑定或写入失败时
// 返回 ok:false，前端自动回退到长链接（功能不受影响）。
//
// 表：share_links(id TEXT PRIMARY KEY, code TEXT, created_at INTEGER)
// 保留 180 天，写入时顺手清理过期行（个人用量，一次 DELETE 足够轻）。

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function reply(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: HEADERS });
}

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ"; // 去掉易混 0O1lI
function makeId(len = 7) {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: HEADERS });
}

export async function onRequestPost({ request, env }) {
  if (!env || !env.DB) return reply({ ok: false, error: "no_db" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: "bad_request" }, 400);
  }
  const code = String(body.code || "").trim();
  if (!code.startsWith("VOYRA2:") || code.length < 20) {
    return reply({ ok: false, error: "bad_code" }, 400);
  }
  if (code.length > 20000) return reply({ ok: false, error: "too_large" }, 413);

  const db = env.DB;
  try {
    await db.prepare("CREATE TABLE IF NOT EXISTS share_links(id TEXT PRIMARY KEY, code TEXT NOT NULL, created_at INTEGER NOT NULL)").run();
    /* 顺手清理 180 天前的旧链 */
    await db.prepare("DELETE FROM share_links WHERE created_at < ?").bind(Math.floor(Date.now() / 1000) - 180 * 86400).run();

    let id = makeId();
    for (let i = 0; i < 3; i++) {
      const exist = await db.prepare("SELECT id FROM share_links WHERE id=?").bind(id).first();
      if (!exist) break;
      id = makeId();
    }
    await db.prepare("INSERT INTO share_links(id, code, created_at) VALUES(?,?,?)")
      .bind(id, code, Math.floor(Date.now() / 1000)).run();

    const origin = new URL(request.url).origin;
    return reply({ ok: true, id, url: `${origin}/s/${id}` });
  } catch (e) {
    return reply({ ok: false, error: "db_failed", message: e && e.message ? e.message : "写入失败" }, 500);
  }
}
