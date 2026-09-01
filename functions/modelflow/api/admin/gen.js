// POST /modelflow/api/admin/gen {n, note, is_admin}  生成授权码
import { ensure, requireAdmin, ALPHABET, now, json, preflight, readBody } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

function genCode() {
  const a = new Uint8Array(5);
  crypto.getRandomValues(a);
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPHABET[a[i] % ALPHABET.length];
  return s;
}

export async function onRequestPost({ request, env }) {
  await ensure(env.DB);
  const guard = await requireAdmin(request, env);
  if (!guard.ok) return guard.response;
  const d = await readBody(request);
  const n = Math.max(1, Math.min(parseInt(d.n, 10) || 1, 100));
  const note = (d.note || "").trim().slice(0, 60);
  const isAdmin = d.is_admin ? 1 : 0;
  const t = now();
  const out = [];
  for (let i = 0; i < n; i++) {
    let code, tries = 0;
    while (tries++ < 20) {
      code = genCode();
      const exist = await env.DB.prepare("SELECT code FROM codes WHERE code=?").bind(code).first();
      if (!exist) break;
    }
    await env.DB.prepare("INSERT INTO codes(code,note,is_admin,created_at) VALUES(?,?,?,?)")
      .bind(code, note, isAdmin, t).run();
    out.push(code);
  }
  return json({ ok: true, codes: out });
}
