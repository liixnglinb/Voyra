// POST /modelflow/api/admin/revoke {code, revoked}  吊销 / 恢复
import { guardDB, ensure, requireAdmin, json, preflight, readBody } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);
  const guard = await requireAdmin(request, env);
  if (!guard.ok) return guard.response;
  const d = await readBody(request);
  const code = (d.code || "").trim().toUpperCase();
  const revoked = d.revoked ? 1 : 0;
  await env.DB.prepare("UPDATE codes SET revoked=? WHERE code=?").bind(revoked, code).run();
  return json({ ok: true });
}
