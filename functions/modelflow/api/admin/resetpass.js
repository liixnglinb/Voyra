// POST /modelflow/api/admin/resetpass {pass}  已登录状态下修改管理密码
import { ensure, requireAdmin, sha256Hex, json, preflight, readBody } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  await ensure(env.DB);
  const guard = await requireAdmin(request, env);
  if (!guard.ok) return guard.response;
  const d = await readBody(request);
  const pass = (d.pass || "").trim();
  if (pass.length < 6) return json({ ok: false, msg: "管理密码至少 6 位" }, 400);
  const h = await sha256Hex(pass);
  await env.DB.prepare("UPDATE meta SET v=? WHERE k='admin_pass_hash'").bind(h).run();
  return json({ ok: true });
}
