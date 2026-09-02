// POST /modelflow/api/check {code, mid, token}
// 软件启动时的在线授权校验（权威判断）。
// 本地 HMAC 只是快速预检；本接口验证：token 正确性、授权码是否存在/未吊销、设备绑定是否匹配。
// 攻击者伪造的 license.json 在此接口会因"码不存在/已吊销/设备不匹配"被拒绝。
// 限流：同 IP 每分钟 20 次（每次软件启动都会调用，比 verify/activate 宽松），超限封 2 分钟。
import { guardDB, ensure, json, preflight, readBody, getClientIP, checkRateLimit, tokenFor, hashCode } from "../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);

  const ip = getClientIP(request);
  const rl = await checkRateLimit(env.DB, ip, "check", 20, 60, 120);
  if (!rl.allowed) {
    return json({ ok: false, msg: `请求过于频繁，请 ${rl.retryAfter} 秒后再试` }, 429);
  }

  const d = await readBody(request);
  const code = (d.code || "").trim().toUpperCase();
  const mid = (d.mid || "").trim();
  const token = (d.token || "").trim();
  if (!code || !mid || !token) return json({ ok: false, msg: "参数缺失" }, 400);

  // 1. token 格式校验（HMAC-SHA256(SECRET, code|mid) 前32位）
  const expectToken = await tokenFor(code, mid);
  if (token !== expectToken) {
    return json({ ok: false, msg: "令牌无效", reason: "bad_token" }, 403);
  }

  // 2. 授权码存在性 + 吊销状态（哈希查询）
  const codeHash = await hashCode(code);
  const r = await env.DB.prepare("SELECT is_admin, bound_mid, revoked FROM codes WHERE code=?").bind(codeHash).first();
  if (!r) {
    return json({ ok: false, msg: "授权码不存在", reason: "not_found" }, 403);
  }
  if (r.revoked) {
    return json({ ok: false, msg: "授权码已吊销", reason: "revoked" }, 403);
  }

  // 3. 设备绑定校验（管理员码 is_admin=1 不限机不绑定）
  if (!r.is_admin && r.bound_mid && r.bound_mid !== mid) {
    return json({ ok: false, msg: "该授权码已绑定其他设备", reason: "device_mismatch" }, 403);
  }

  return json({
    ok: true,
    admin: !!r.is_admin,
    server_time: new Date().toISOString(),
  });
}

export async function onRequestGet() {
  return json({ ok: true, service: "modelflow-license-check" });
}
