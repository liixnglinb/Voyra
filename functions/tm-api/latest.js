// GET /tm-api/latest
// 返回 Token Monitor 最新版本信息。双通道取数，尽量拿到版本号与下载地址：
//   1) GitHub API（信息最全，但匿名请求可能 403 限流）
//   2) Releases 重定向解析（无需 API/认证，几乎不会失败；资产名按构建规则拼装）
// 上游全部异常时返回 200 + error，由前端沿用页面兜底值。
const REPO = "liixnglinb/token-monitor";
const UA = "voyra-token-monitor-proxy";
const RELEASE = `https://github.com/${REPO}/releases`;

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300",
};

function reply(obj) {
  return new Response(JSON.stringify(obj), { status: 200, headers: HEADERS });
}

async function fromApi() {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": UA },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const v = String(d.tag_name || "").replace(/^v/, "");
    if (!v) return null;
    return {
      version: v,
      source: "api",
      published: d.published_at || null,
      assets: (d.assets || []).map((a) => ({ name: a.name, size: a.size, url: a.browser_download_url })),
    };
  } catch (_) {
    return null;
  }
}

async function fromRedirect() {
  try {
    const r = await fetch(`${RELEASE}/latest`, {
      redirect: "manual",
      headers: { "User-Agent": UA },
    });
    const loc = r.headers.get("Location") || r.headers.get("location") || "";
    const m = loc.match(/\/tag\/([^/?#]+)/);
    if (!m) return null;
    const v = decodeURIComponent(m[1]).replace(/^v/, "");
    if (!v) return null;
    const asset = (name) => ({ name, size: 0, url: `${RELEASE}/download/v${v}/${name}` });
    return {
      version: v,
      source: "redirect",
      published: null,
      assets: [
        asset(`TokenMonitor-setup-v${v}.exe`),
        asset(`TokenMonitor-portable-v${v}.zip`),
        asset("TokenMonitor.exe"),
      ],
    };
  } catch (_) {
    return null;
  }
}

// 安装包校验值：发布目录里与 exe 同名的 .sha256 是纯文本，但资产站不允许跨域直接取，
// 这里由 Functions 代取一次（直连失败时走国内镜像兜底；都失败就只是没有该字段）
async function attachSha(out) {
  const sum = (out.assets || []).find(
    (a) => /\.sha256$/i.test(a.name) && /setup/i.test(a.name) && /^https?:/i.test(a.url || "")
  );
  if (!sum) return out;
  for (const url of [sum.url, "https://gh-proxy.com/" + sum.url]) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (!r.ok) continue;
      const m = (await r.text()).match(/[0-9a-fA-F]{64}/);
      if (m) { out.sha256 = m[0].toLowerCase(); break; }
    } catch (_) {
      /* 换下一个通道 */
    }
  }
  return out;
}

export async function onRequestGet() {
  const out = await attachSha((await fromApi()) || (await fromRedirect()) || null);
  if (!out) return reply({ error: "unavailable" });
  return reply(out);
}
