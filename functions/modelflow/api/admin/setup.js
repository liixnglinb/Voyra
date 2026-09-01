// POST /modelflow/api/admin/setup {pass}
// 仅当后台尚未设置管理密码时允许初始化（自举，避免在公开仓库里硬编码密码）。
import { guardDB, ensure, sha256Hex, json, preflight, readBody } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);
  const d = await readBody(request);
  const pass = (d.pass || "").trim();
  if (pass.length < 6) return json({ ok: false, msg: "管理密码至少 6 位" }, 400);

  const row = await env.DB.prepare("SELECT v FROM meta WHERE k='admin_pass_hash'").first();
  if (row && row.v) return json({ ok: false, msg: "管理密码已设置，如需重置请在已登录状态操作" }, 409);

  const h = await sha256Hex(pass);
  await env.DB.prepare("INSERT INTO meta(k,v) VALUES('admin_pass_hash',?)").bind(h).run();
  return json({ ok: true });
}
