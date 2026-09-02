// POST /modelflow/api/admin/unbind {code}  解绑机器（换设备/换码前用）
// 管理员输入明文授权码，后端转 SHA-256 哈希后操作。
import { guardDB, ensure, requireAdmin, json, preflight, readBody, hashCode } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);
  const guard = await requireAdmin(request, env);
  if (!guard.ok) return guard.response;
  const d = await readBody(request);
  const code = (d.code || "").trim().toUpperCase();
  const codeHash = await hashCode(code);
  await env.DB.prepare("UPDATE codes SET bound_mid='', bound_at='' WHERE code=?").bind(codeHash).run();
  return json({ ok: true });
}
