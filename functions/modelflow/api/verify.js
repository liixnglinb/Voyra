// POST /modelflow/api/verify  {code}
// 下载门禁的服务端校验（存在且未吊销即可）。下载页默认用前端哈希，此接口备用。
import { guardDB, ensure, json, preflight, readBody } from "../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);
  const d = await readBody(request);
  const code = (d.code || "").trim().toUpperCase();
  const r = await env.DB.prepare("SELECT is_admin,bound_mid,note,revoked FROM codes WHERE code=?").bind(code).first();
  if (!r || r.revoked) return json({ ok: false, msg: "授权码无效或已吊销" }, 403);
  return json({ ok: true, admin: !!r.is_admin, bound: !!r.bound_mid, note: r.note || "" });
}

export async function onRequestGet() {
  return json({ ok: true, service: "modelflow-license" });
}
