// POST /modelflow/api/verify  {code}
// 下载门禁的服务端校验：存在且未吊销即可通过，通过后返回 COS 预签名下载 URL（5 分钟有效）。
// 防爆破：同一 IP 每分钟最多 10 次，超过封禁 5 分钟。
// 来源限制：仅允许从 lxlrwxs.top 网页发起（防脚本直接调用 / 第三方网站嵌入下载）。
// 授权码哈希存储：数据库只存 SHA-256，查询前先转哈希。
import { guardDB, ensure, json, preflight, readBody, getClientIP, checkRateLimit, signCosUrl, hashCode, checkWebOrigin, latestVersion } from "../../_mf.js";

export const onRequestOptions = () => preflight();

export async function onRequestPost({ request, env }) {
  const g = guardDB(env); if (g) return g;
  await ensure(env.DB);

  // 来源限制：必须从自有网页进入下载
  if (!checkWebOrigin(request)) {
    return json({ ok: false, msg: "请从官方下载页进入下载" }, 403);
  }

  // 防爆破：速率限制
  const ip = getClientIP(request);
  const rl = await checkRateLimit(env.DB, ip, "verify", 10, 60, 300);
  if (!rl.allowed) {
    return json({ ok: false, msg: `尝试过于频繁，请 ${rl.retryAfter} 秒后再试` }, 429);
  }

  const d = await readBody(request);
  const code = (d.code || "").trim().toUpperCase();
  const codeHash = await hashCode(code);
  const r = await env.DB.prepare("SELECT is_admin,bound_mid,note,revoked FROM codes WHERE code=?").bind(codeHash).first();
  if (!r || r.revoked) return json({ ok: false, msg: "授权码无效或已吊销" }, 403);

  // 验证通过，生成 COS 预签名下载 URL（桶已设为私有，直链 403）
  const version = d.version || "latest";
  let key = null;
  if (version === "latest") {
    const lv = await latestVersion();
    if (lv) key = `ModelFlow-${lv}-setup.exe`;
  } else {
    key = `ModelFlow-${version}-setup.exe`;
  }
  const downloadUrl = key ? await signCosUrl(env, key, 300) : null;

  return json({
    ok: true,
    download_url: downloadUrl, // 版本读取失败/未配置 COS 密钥时为 null，前端回退
  });
}

export async function onRequestGet() {
  return json({ ok: true, service: "modelflow-license" });
}
