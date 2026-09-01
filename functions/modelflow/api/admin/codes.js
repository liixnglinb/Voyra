// GET  /modelflow/api/admin/codes   列出全部授权码（需 X-Admin-Pass）
// POST /modelflow/api/admin/codes   同上（兼容旧前端 POST 调用）
import { guardDB, ensure, requireAdmin, json, preflight } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

async function handle({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);
  const guard = await requireAdmin(request, env);
  if (!guard.ok) return guard.response;
  const { results } = await env.DB
    .prepare("SELECT * FROM codes ORDER BY created_at DESC, code ASC").all();
  return json({ codes: results || [] });
}
export const onRequestGet = handle;
export const onRequestPost = handle;
