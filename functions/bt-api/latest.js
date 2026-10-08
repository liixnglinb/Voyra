// GET /bt-api/latest
// 账迹 BillTrace 的版本代理，给 App 内的「检查更新」用。
//
// 与 ac-api / tm-api 的差别：账迹发布走**固定 tag `latest`**（每次推 main 就地覆盖资产），
// 没有版本化的 tag 可读，所以版本号只能从 Release 标题里解析（标题形如「账迹 BillTrace v0.5.0」）。
// 解析不到就返回 error，App 侧会提示"版本信息不完整"，不会拿旧版本糊弄用户。
//
// 下载地址给的是 gh-proxy 镜像（国内直连 GitHub Releases 经常只有几百 KB/s）；
// 镜像不通时 App 自己会退回直链，所以这里把两条都带上。
const REPO = "liixnglinb/BillTrace";
const UA = "voyra-billtrace-proxy";
const ASSET = "BillTrace.apk";
const DIRECT = `https://github.com/${REPO}/releases/download/latest/${ASSET}`;
const MIRROR = `https://gh-proxy.com/${DIRECT}`;

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  // 比桌面端那两条短：发版后要尽快能被 App 看到
  "Cache-Control": "public, max-age=120",
};

function reply(value) {
  return new Response(JSON.stringify(value), { status: 200, headers: HEADERS });
}

async function fromApi(onDiag) {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/releases/tags/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": UA,
        },
      },
    );
    if (!response.ok) {
      onDiag && onDiag("http-" + response.status);
      return null;
    }
    const data = await response.json();
    const title = String(data.name || "");
    const body = String(data.body || "");
    const match = title.match(/v(\d+\.\d+\.\d+)/) || body.match(/v(\d+\.\d+\.\d+)/);
    if (!match) {
      onDiag && onDiag("no-version-in-payload");
      return null;
    }
    const assets = data.assets || [];
    const asset = assets.find((a) => a.name === ASSET) || assets[0] || {};
    return {
      version: match[1],
      url: MIRROR,
      direct: DIRECT,
      size: asset.size || 0,
      published: asset.updated_at || data.published_at || null,
      notes: body.slice(0, 600),
      source: "api",
    };
  } catch (e) {
    onDiag && onDiag("exception:" + (e && e.message ? e.message : e));
    return null;
  }
}

/**
 * 兜底：匿名 GitHub API 的额度是按出口 IP 算的，Cloudflare 的出口 IP 被大量共享，
 * 实测经常直接 403 限流（这也是 ac-api 那条代理带 redirect 兜底的原因）。
 * 这里改读 Release 页面的 HTML —— 标题里就带着版本号（「账迹 BillTrace v0.5.0」）。
 * 拿不到资产字节数就返回 0：App 会显示「当前 vX」而不是编一个体积出来。
 */
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
