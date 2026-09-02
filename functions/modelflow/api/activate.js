// POST /modelflow/api/activate  {code, mid}
// 软件激活：一码一机 + 一机一码；管理员码不限机不绑定。与旧 VPS 行为一致。
// 防爆破：同一 IP 每分钟最多 5 次，超过封禁 10 分钟。
// 授权码哈希存储：数据库只存 SHA-256，查询前先转哈希。
// 错误消息不泄露其他授权码明文。
import { guardDB, ensure, tokenFor, now, json, preflight, readBody, getClientIP, checkRateLimit, hashCode } from "../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);

  // 防爆破：速率限制
  const ip = getClientIP(request);
  const rl = await checkRateLimit(env.DB, ip, "activate", 5, 60, 600);
  if (!rl.allowed) {
    return json({ ok: false, msg: `尝试过于频繁，请 ${rl.retryAfter} 秒后再试` }, 429);
  }

  const d = await readBody(request);
  const code = (d.code || "").trim().toUpperCase();
  const mid = (d.mid || "").trim();
  if (!code || !mid) return json({ ok: false, msg: "参数缺失" }, 400);

  const codeHash = await hashCode(code);
  const r = await env.DB.prepare("SELECT * FROM codes WHERE code=?").bind(codeHash).first();
  if (!r || r.revoked) return json({ ok: false, msg: "授权码无效或已吊销" }, 403);

  if (r.is_admin) {
    return json({ ok: true, admin: true, token: await tokenFor(code, mid), code });
  }

  // 一机一码：该设备已绑定其他未吊销码 → 拒绝（不泄露其他码明文）
  const other = await env.DB
    .prepare("SELECT code FROM codes WHERE bound_mid=? AND code<>? AND revoked=0")
    .bind(mid, codeHash).first();
  if (other) {
    return json({ ok: false, msg: "该设备已绑定其他授权码，如需更换请先联系管理员解绑" }, 403);
  }
  // 一码一机：该码已绑别的机器 → 拒绝
  if (r.bound_mid && r.bound_mid !== mid) {
    return json({ ok: false, msg: "该授权码已绑定其他机器" }, 403);
  }
  // 首次绑定
  if (!r.bound_mid) {
    await env.DB.prepare("UPDATE codes SET bound_mid=?, bound_at=? WHERE code=?")
      .bind(mid, now(), codeHash).run();
  }
  return json({ ok: true, admin: false, token: await tokenFor(code, mid), code });
}
