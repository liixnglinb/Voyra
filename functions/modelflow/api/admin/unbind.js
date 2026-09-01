// POST /modelflow/api/admin/unbind {code}  解绑机器（换设备/换码前用）
import { ensure, requireAdmin, json, preflight, readBody } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  await ensure(env.DB);
  const guard = await requireAdmin(request, env);
  if (!guard.ok) return guard.response;
  const d = await readBody(request);
  const code = (d.code || "").trim().toUpperCase();
  await env.DB.prepare("UPDATE codes SET bound_mid='', bound_at='' WHERE code=?").bind(code).run();
  return json({ ok: true });
}
