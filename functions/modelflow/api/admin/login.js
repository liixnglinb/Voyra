// POST /modelflow/api/admin/login {pass}
// 防爆破：同一 IP 每 10 分钟最多 5 次，超过封禁 1 小时。
import { guardDB, ensure, checkAdmin, json, preflight, readBody, getClientIP, checkRateLimit } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);

  // 防爆破：管理员登录更严格
  const ip = getClientIP(request);
  const rl = await checkRateLimit(env.DB, ip, "admin_login", 5, 600, 3600);
  if (!rl.allowed) {
    return json({ ok: false, msg: `尝试过于频繁，请 ${rl.retryAfter} 秒后再试` }, 429);
  }

  const d = await readBody(request);
  const r = await checkAdmin(env, (d.pass || "").trim());
  if (r.ok) return json({ ok: true });
  // 统一错误消息，不区分"未设置"与"密码错误"，防止攻击者探测后台初始化状态
  return json({ ok: false, msg: "管理密码错误" }, 403);
}
