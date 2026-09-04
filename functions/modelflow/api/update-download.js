// POST /modelflow/api/update-download  {code, token, version}
// 软件在线更新时调用：验证已激活用户的 code+token，返回 COS 预签名下载 URL。
// 只有已激活（bound_mid 非空）且 token 匹配的用户才能下载更新包。
// 防爆破：同一 IP 每分钟最多 5 次，超过封禁 10 分钟。
import { guardDB, ensure, json, preflight, readBody, getClientIP, checkRateLimit, signCosUrl, tokenFor, hashCode, latestVersion } from "../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);

  // 防爆破
  const ip = getClientIP(request);
  const rl = await checkRateLimit(env.DB, ip, "update_download", 5, 60, 600);
  if (!rl.allowed) {
    return json({ ok: false, msg: `尝试过于频繁，请 ${rl.retryAfter} 秒后再试` }, 429);
  }

  const d = await readBody(request);
  const code = (d.code || "").trim().toUpperCase();
  const token = (d.token || "").trim().toLowerCase();
  const version = (d.version || "").trim();

  if (!code || !token) return json({ ok: false, msg: "参数缺失" }, 400);

  // 注意：数据库 code 字段存 SHA-256 哈希，查询前必须转哈希
  const codeHash = await hashCode(code);
  const r = await env.DB.prepare("SELECT * FROM codes WHERE code=?").bind(codeHash).first();
  if (!r || r.revoked) return json({ ok: false, msg: "授权码无效或已吊销" }, 403);

  if (r.is_admin) {
    // 管理员码：不绑定机器，token 非空即可（管理员自己知道）
    // 但仍做基本校验：token 长度应为 32
    if (token.length !== 32) return json({ ok: false, msg: "令牌无效" }, 403);
  } else {
    // 普通码：必须已绑定机器，且 token 与 bound_mid 计算出的一致
    if (!r.bound_mid) return json({ ok: false, msg: "该授权码尚未激活，请先在软件内激活" }, 403);
    const expected = await tokenFor(code, r.bound_mid);
    if (token !== expected) return json({ ok: false, msg: "令牌无效，请重新激活" }, 403);
  }

  // 验证通过，生成预签名下载 URL
  let key = null;
  if (version) {
    key = `ModelFlow-${version}-setup.exe`;
  } else {
    const lv = await latestVersion();
    if (lv) key = `ModelFlow-${lv}-setup.exe`;
  }
  if (!key) {
    return json({ ok: false, msg: "暂时无法获取最新版本，请稍后重试" }, 503);
  }
  const downloadUrl = await signCosUrl(env, key, 600); // 更新包给 10 分钟有效期
  if (!downloadUrl) {
    return json({ ok: false, msg: "服务未配置 COS 密钥，无法生成下载链接" }, 500);
  }

  return json({ ok: true, download_url: downloadUrl });
}
