// POST /modelflow/api/admin/gen {n, note, is_admin}  生成授权码
// 数据库只存 SHA-256 哈希；生成时返回明文码（仅此次，管理员需自行保存/发给用户）。
import { guardDB, ensure, requireAdmin, ALPHABET, now, json, preflight, readBody, hashCode } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

function genCode() {
  const a = new Uint8Array(5);
  crypto.getRandomValues(a);
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPHABET[a[i] % ALPHABET.length];
  return s;
}

export async function onRequestPost({ request, env }) {
  const g = guardDB(env); if (g) return g;
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
    let code, codeHash, tries = 0;
    while (tries++ < 20) {
      code = genCode();
      codeHash = await hashCode(code);
      const exist = await env.DB.prepare("SELECT code FROM codes WHERE code=?").bind(codeHash).first();
      if (!exist) break;
    }
    await env.DB.prepare("INSERT INTO codes(code,note,is_admin,created_at) VALUES(?,?,?,?)")
      .bind(codeHash, note, isAdmin, t).run();
    out.push(code); // 仅返回明文给管理员（数据库存哈希）
  }
  return json({ ok: true, codes: out });
}
