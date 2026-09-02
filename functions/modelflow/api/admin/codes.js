// GET  /modelflow/api/admin/codes   列出全部授权码（需 X-Admin-Pass）
// POST /modelflow/api/admin/codes   同上（兼容旧前端 POST 调用）
// 数据库存 SHA-256 哈希；列表只返回哈希前 8 位作为标识，不暴露完整哈希或明文。
import { guardDB, ensure, requireAdmin, json, preflight } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

async function handle({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);
  const guard = await requireAdmin(request, env);
  if (!guard.ok) return guard.response;
  const { results } = await env.DB
    .prepare("SELECT * FROM codes ORDER BY created_at DESC, code ASC").all();
  const codes = (results || []).map((c) => ({
    ...c,
    code_short: (c.code || "").slice(0, 8), // 只暴露前 8 位作为标识
    code: undefined, // 不返回完整哈希
  }));
  return json({ codes });
}
export const onRequestGet = handle;
export const onRequestPost = handle;
