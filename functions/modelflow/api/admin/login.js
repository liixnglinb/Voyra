// POST /modelflow/api/admin/login {pass}
import { guardDB, ensure, checkAdmin, json, preflight, readBody } from "../../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);
  const d = await readBody(request);
  const r = await checkAdmin(env, (d.pass || "").trim());
  if (r.ok) return json({ ok: true });
  return json({ ok: false, setup: r.reason === "not_setup", msg: r.reason === "not_setup" ? "尚未设置管理密码" : "管理密码错误" }, 403);
}
