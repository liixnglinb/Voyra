// POST /share {code: "VOYRA2:..." | "VOYRA3:..."}; GET /share?id=<short-id>.
// 课表分享短链：把口令正文存进 D1，只返回一个 7 位短 ID。
// 返回 { ok:true, id, url: "https://lxlrwxs.top/s/<id>" }；D1 未绑定或写入失败时
// 返回 ok:false，前端提示重试，不再把长口令放入可见链接。
//
// 表：share_links(id TEXT PRIMARY KEY, code TEXT, created_at INTEGER)
// 保留 180 天；有界的过期清理通过 waitUntil 在响应之外执行。

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env || !env.DB) return reply({ ok: false, error: "no_db" }, 503);

  let body;
  try {
    if (Number(request.headers.get('content-length')) > 44000) return reply({ok:false,error:'too_large'},413);
    const reader = request.body?.getReader();
    if (!reader) return reply({ok:false,error:'bad_request'},400);
    const chunks=[]; let size=0;
    while (true) { const {done,value}=await reader.read(); if(done)break; size+=value.byteLength;
      if(size>44000){await reader.cancel();return reply({ok:false,error:'too_large'},413);} chunks.push(value); }
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    body=JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return reply({ ok: false, error: "bad_request" }, 400);
  }
  const code = String(body?.code || "").trim();
  if (!/^VOYRA[123]:[A-Za-z0-9_-]+$/.test(code) || code.length < 20) {
    return reply({ ok: false, error: "bad_code" }, 400);
  }
  if (code.length > 40000) return reply({ ok: false, error: "too_large" }, 413);

  const db = env.DB;
  try {
    await db.prepare("CREATE TABLE IF NOT EXISTS share_links(id TEXT PRIMARY KEY, code TEXT NOT NULL, created_at INTEGER NOT NULL)").run();
    // No existence read: one statement inserts a random ID and handles a collision.
    let id;
    for(let i=0;i<3;i++){
      const candidate=makeId();
      const result=await db.prepare('INSERT OR IGNORE INTO share_links(id,code,created_at) VALUES(?,?,?) RETURNING id')
        .bind(candidate,code,Math.floor(Date.now()/1000)).first();
      if(result?.id){id=result.id;break;}
    }
    if(!id)return reply({ok:false,error:'try_again'},503);
    // Cleanup is independent of the user's response and bounded to a small batch.
    if(typeof context.waitUntil==='function') context.waitUntil(db.prepare('DELETE FROM share_links WHERE id IN (SELECT id FROM share_links WHERE created_at < ? LIMIT 100)')
      .bind(Math.floor(Date.now()/1000)-180*86400).run().catch(()=>{}));

    const origin = new URL(request.url).origin;
    return reply({ ok: true, id, url: `${origin}/s/${id}` });
  } catch (e) {
    console.error('schedule_share_write_failed', {name:e?.name||'Error'});
    return reply({ ok: false, error: "db_failed" }, 500);
  }
}

export async function onRequestGet({request,env}) {
  const id=new URL(request.url).searchParams.get('id')||'';
  if(!/^[A-Za-z0-9]{7}$/.test(id))return reply({ok:false,error:'not_found'},404);
  if(!env?.DB)return reply({ok:false,error:'unavailable'},503);
  try{
    const row=await env.DB.prepare('SELECT code,created_at FROM share_links WHERE id=?').bind(id).first();
    if(!row)return reply({ok:false,error:'not_found'},404);
    if(Number(row.created_at)<Math.floor(Date.now()/1000)-180*86400)return reply({ok:false,error:'expired'},410);
    return reply({ok:true,code:row.code});
  }catch{return reply({ok:false,error:'unavailable'},503);}
}
