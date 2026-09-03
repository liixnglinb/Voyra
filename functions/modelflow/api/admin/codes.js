// GET  /modelflow/api/admin/codes   列出全部授权码（需 X-Admin-Pass）
// POST /modelflow/api/admin/codes   同上（兼容旧前端 POST 调用）
// 数据库 code 字段存 SHA-256 哈希（验证用），code_enc 存 AES-GCM 密文（管理员查看明文用）。
// 列表解密 code_enc 返回明文 code_plain；旧码无密文时返回 code_short（哈希前8位）。
import { guardDB, ensure, requireAdmin, json, preflight, decryptCode } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

async function handle({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);
  const guard = await requireAdmin(request, env);
  if (!guard.ok) return guard.response;
  const { results } = await env.DB
    .prepare("SELECT * FROM codes ORDER BY created_at DESC, code ASC").all();
  const codes = [];
  for (const c of (results || [])) {
    const plain = await decryptCode(c.code_enc, env);
    codes.push({
      ...c,
      code_plain: plain || "",          // 明文授权码（管理员可查看/复制/分发）
      code_short: (c.code || "").slice(0, 8), // 哈希前8位，旧码无密文时作标识
      code: undefined,                   // 不返回完整哈希
      code_enc: undefined,               // 不返回密文
    });
  }
  return json({ codes });
}
export const onRequestGet = handle;
export const onRequestPost = handle;
