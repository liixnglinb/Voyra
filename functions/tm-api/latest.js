// GET /tm-api/latest
// 代理 GitHub Releases 最新版本信息，规避浏览器直连 api.github.com 时的
// CORS 拦截与匿名限流（上游异常时仍返回 200 + error 字段，由前端走兜底值）。
const REPO = "liixnglinb/token-monitor";
const UA = "voyra-token-monitor-proxy";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300",
};

export async function onRequestGet() {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": UA },
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "upstream " + r.status }), { status: 200, headers: HEADERS });
    }
    const d = await r.json();
    const out = {
      version: String(d.tag_name || "").replace(/^v/, ""),
      published: d.published_at || null,
      assets: (d.assets || []).map((a) => ({ name: a.name, size: a.size, url: a.browser_download_url })),
    };
    return new Response(JSON.stringify(out), { status: 200, headers: HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e).slice(0, 140) }), { status: 200, headers: HEADERS });
  }
}
