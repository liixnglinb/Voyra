// POST /modelflow/api/activate  {code, mid}
// 软件激活：一码一机 + 一机一码；管理员码不限机不绑定。与旧 VPS 行为一致。
import { ensure, tokenFor, now, json, preflight, readBody } from "../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  await ensure(env.DB);
  const d = await readBody(request);
  const code = (d.code || "").trim().toUpperCase();
  const mid = (d.mid || "").trim();
  if (!code || !mid) return json({ ok: false, msg: "参数缺失" }, 400);

  const r = await env.DB.prepare("SELECT * FROM codes WHERE code=?").bind(code).first();
  if (!r || r.revoked) return json({ ok: false, msg: "授权码无效或已吊销" }, 403);

  if (r.is_admin) {
    return json({ ok: true, admin: true, token: await tokenFor(code, mid), code });
  }

  // 一机一码：该设备已绑定其他未吊销码 → 拒绝
  const other = await env.DB
    .prepare("SELECT code FROM codes WHERE bound_mid=? AND code<>? AND revoked=0")
    .bind(mid, code).first();
  if (other) {
    return json({ ok: false, msg: `该设备已绑定授权码 ${other.code}，如需更换请先联系管理员解绑` }, 403);
  }
  // 一码一机：该码已绑别的机器 → 拒绝
  if (r.bound_mid && r.bound_mid !== mid) {
    return json({ ok: false, msg: "该授权码已绑定其他机器" }, 403);
  }
  // 首次绑定
  if (!r.bound_mid) {
    await env.DB.prepare("UPDATE codes SET bound_mid=?, bound_at=? WHERE code=?")
      .bind(mid, now(), code).run();
  }
  return json({ ok: true, admin: false, token: await tokenFor(code, mid), code });
}
