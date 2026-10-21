// GET /s/:id
// 分享短链跳转：查 D1 → 302 到 https://<host>/#/timetable?share=<VOYRA2:...>
// 找不到时返回一个极简说明页（不跳首页，避免用户以为链接有效）。

export async function onRequestGet({ params, request, env }) {
  const id = String(params.id || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
  const origin = new URL(request.url).origin;

  if (!id) return notFound(origin);
  if (!env || !env.DB) return notFound(origin, "分享服务未启用");

  let row = null;
  try {
    row = await env.DB.prepare("SELECT code FROM share_links WHERE id=?").bind(id).first();
  } catch {
    return notFound(origin, "分享服务暂时不可用");
  }
  if (!row || !row.code) return notFound(origin);

  const target = `${origin}/#/timetable?share=${encodeURIComponent(row.code)}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      "Cache-Control": "no-store",
    },
  });
}

function notFound(origin, msg) {
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>分享链接已失效</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FAF9F5;color:#1b1b1b;
font:14px/1.7 system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding:24px;text-align:center}
h1{font-size:17px;margin:0 0 8px}p{color:#6c757d;margin:0 0 18px}
a{display:inline-block;padding:10px 18px;border-radius:10px;background:#1b1b1b;color:#fff;text-decoration:none;font-weight:700}</style>
</head><body><div><h1>分享链接无效或已过期</h1>
<p>${msg || "短链保留 180 天，可能已被清理。让同学重新生成一次即可。"}</p>
<a href="${origin}/#/timetable">去课表页</a></div></body></html>`;
  return new Response(html, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
