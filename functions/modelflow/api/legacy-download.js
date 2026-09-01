// GET /modelflow/api/legacy-download?code=XXXXX
// 旧版软件（0.7.5 及更早）的更新器兼容接口：
//   旧版 updater 直接 GET latest.json 里的 url（可能带 ?code= 查询参数），
//   COS 桶改私有后直链 403。此接口验证 code 后 302 重定向到限时预签名 URL，
//   requests 库自动跟随重定向即可正常下载。
// 防爆破：同一 IP 每分钟最多 10 次，超过封禁 5 分钟（与 verify 一致）。
import { guardDB, ensure, getClientIP, checkRateLimit, signCosUrl } from "../../_mf.js";

export async function onRequestGet({ request, env }) {
  const g = guardDB(env);
  if (g) return g;
  await ensure(env.DB);

  // 防爆破：速率限制
  const ip = getClientIP(request);
  const rl = await checkRateLimit(env.DB, ip, "legacy_download", 10, 60, 300);
  if (!rl.allowed) {
    return new Response(`尝试过于频繁，请 ${rl.retryAfter} 秒后再试`, {
      status: 429,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": String(rl.retryAfter) },
    });
  }

  // 从 query string 读取授权码（旧版 updater 可能带 ?code=XXXXX）
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();
  if (!code) {
    return new Response("缺少授权码参数 code", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 验证授权码存在且未吊销（不校验绑定，下载阶段可能尚未激活）
  const r = await env.DB.prepare("SELECT revoked FROM codes WHERE code=?").bind(code).first();
  if (!r || r.revoked) {
    return new Response("授权码无效或已吊销", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 从 COS latest.json 读取最新版本号（latest.json 保持公有读）
  const version = await latestVersion(env);
  const key = `ModelFlow-${version}-setup.exe`;

  // 生成 5 分钟有效的预签名下载 URL
  const downloadUrl = await signCosUrl(env, key, 300);
  if (!downloadUrl) {
    return new Response("服务未配置 COS 密钥，无法生成下载链接", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 302 重定向到预签名 URL（requests / 浏览器自动跟随）
  return Response.redirect(downloadUrl, 302);
}

async function latestVersion(env) {
  try {
    const resp = await fetch("https://modelflow-1447874637.cos.ap-guangzhou.myqcloud.com/latest.json");
    if (resp.ok) {
      const m = await resp.json();
      if (m && m.version) return m.version;
    }
  } catch (e) {}
  return "0.7.6"; // 回退默认版本
}
