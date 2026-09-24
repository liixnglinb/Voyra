// GET /ac-api/latest
// AI Chronicle latest release proxy. Falls back to Releases redirect parsing
// when the anonymous GitHub API is rate-limited.
const REPO = "liixnglinb/AI-Chronicle";
const UA = "voyra-ai-chronicle-proxy";
const RELEASE = `https://github.com/${REPO}/releases`;

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300",
};

function reply(value) {
  return new Response(JSON.stringify(value), { status: 200, headers: HEADERS });
}

async function fromApi() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": UA,
        },
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    const version = String(data.tag_name || "").replace(/^v/i, "");
    if (!version) return null;
    return {
      version,
      source: "api",
      published: data.published_at || null,
      notes: data.body || "",
      assets: (data.assets || []).map((asset) => ({
        name: asset.name,
        size: asset.size,
        url: asset.browser_download_url,
      })),
    };
  } catch {
    return null;
  }
}

async function fromRedirect() {
  try {
    const response = await fetch(`${RELEASE}/latest`, {
      redirect: "manual",
      headers: { "User-Agent": UA },
    });
    const location =
      response.headers.get("Location") || response.headers.get("location") || "";
    const match = location.match(/\/tag\/([^/?#]+)/);
    if (!match) return null;
    const version = decodeURIComponent(match[1]).replace(/^v/i, "");
    const asset = (name) => ({
      name,
      size: 0,
      url: `${RELEASE}/download/v${version}/${name}`,
    });
    return {
      version,
      source: "redirect",
      published: null,
      notes: "",
      assets: [
        asset("AI-Chronicle-Setup.exe"),
        asset("AI-Chronicle-Portable.exe"),
        asset("latest.yml"),
      ],
    };
  } catch {
    return null;
  }
}

export async function onRequestGet() {
  const result = (await fromApi()) || (await fromRedirect());
  if (!result) return reply({ error: "unavailable" });
  return reply(result);
}
