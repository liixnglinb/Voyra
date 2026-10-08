// GET /bt-api/latest
// 账迹 BillTrace 的版本代理，给 App 内的「检查更新」用。
//
// 与 ac-api / tm-api 的差别：账迹发布走**固定 tag `latest`**（每次推 main 就地覆盖资产），
// 没有版本化的 tag 可读，所以版本号只能从 Release 标题里解析（标题形如「账迹 BillTrace v0.5.0」）。
//
// 三级兜底（2026-10-08 线上实测得出的顺序，别随手改）：
//   1. 直连 api.github.com —— 本机通，但 Cloudflare 出口 IP 被大量共享，线上实测被限流；
//   2. gh-proxy 代理同一个 API —— 线上实测 200，能拿到 size 与完整正文，是现在的主力路径；
//   3. Release 页 HTML 解析 —— 只剩版本号（size/notes 拿不到），但至少不会让 App 报错。
// 拿不到资产字节数就返回 0：App 会显示「当前 vX」，而不是编一个体积出来。
//
// 下载地址给的是 gh-proxy 镜像（国内直连 GitHub Releases 经常只有几百 KB/s）；
// 镜像不通时 App 自己会退回直链，所以这里把两条都带上。
const REPO = "liixnglinb/BillTrace";
const UA = "voyra-billtrace-proxy";
const ASSET = "BillTrace.apk";
const DIRECT = `https://github.com/${REPO}/releases/download/latest/${ASSET}`;
const MIRROR = `https://gh-proxy.com/${DIRECT}`;

const API = `https://api.github.com/repos/${REPO}/releases/tags/latest`;
const API_MIRROR = `https://gh-proxy.com/${API}`;

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  // 比桌面端那两条短：发版后要尽快能被 App 看到
  "Cache-Control": "public, max-age=60",
};

function reply(value) {
  return new Response(JSON.stringify(value), { status: 200, headers: HEADERS });
}

async function tryApi(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": UA,
    },
  });
  if (!response.ok) return { fail: "http-" + response.status };
  const data = await response.json();
  const title = String(data.name || "");
  const body = String(data.body || "");
  const match = title.match(/v(\d+\.\d+\.\d+)/) || body.match(/v(\d+\.\d+\.\d+)/);
  if (!match) return { fail: "no-version-in-payload" };
  const assets = data.assets || [];
  const asset = assets.find((a) => a.name === ASSET) || assets[0] || {};
  return {
    value: {
      version: match[1],
      url: MIRROR,
      direct: DIRECT,
      size: asset.size || 0,
      published: asset.updated_at || data.published_at || null,
      notes: body.slice(0, 600),
      source: url === API ? "api" : "api-mirror",
    },
  };
}

async function fromApi(onDiag) {
  let last = "not-tried";
  for (const url of [API, API_MIRROR]) {
    try {
      const r = await tryApi(url);
      if (r.value) return r.value;
      last = r.fail;
    } catch (e) {
      last = "exception:" + (e && e.message ? e.message : e);
    }
  }
  onDiag && onDiag(last);
  return null;
}

/** 最后一道：Release 页 HTML 里只有版本号可用（标题就带着它）。 */
async function fromHtml(onDiag) {
  try {
    const response = await fetch(`https://github.com/${REPO}/releases/tag/latest`, {
      headers: { "User-Agent": UA },
    });
    if (!response.ok) {
      onDiag && onDiag("http-" + response.status);
      return null;
    }
    const html = await response.text();
    const match = html.match(/v(\d+\.\d+\.\d+)/);
    if (!match) {
      onDiag && onDiag("no-version-in-html:" + html.length);
      return null;
    }
    return {
      version: match[1],
      url: MIRROR,
      direct: DIRECT,
      size: 0,
      published: null,
      notes: "",
      source: "html",
    };
  } catch (e) {
    onDiag && onDiag("exception:" + (e && e.message ? e.message : e));
    return null;
  }
}

export async function onRequestGet() {
  const diag = { api: "not-tried", html: "not-tried" };
  let result = await fromApi((m) => { diag.api = m; });
  if (!result) result = await fromHtml((m) => { diag.html = m; });
  if (!result) return reply({ error: "unavailable", diag });
  return reply(result);
}
