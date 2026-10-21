// POST /ocr  { image: "<base64，不含 data: 前缀>" }
// 课程表图片识别：服务端调腾讯云 OCR（GeneralAccurateOCR，带坐标的高精度印刷体），
// 只做「图片 → 文本块 + 坐标」，把行列还原交给前端（见 ClassSchedule 的 parseOcrGrid）。
//
// 密钥：优先 OCR_SECRET_ID / OCR_SECRET_KEY（Pages 环境变量，建议单独建一对只开 OCR 的密钥），
// 未配置时回退到已有的 COS_SECRET_ID / COS_SECRET_KEY（同一腾讯云账号，需该密钥有 OCR 权限）。
// 两对都没有时返回 ok:false + 明确提示，前端展示「图片识别未配置」而不是静默失败。
//
// 返回：{ ok:true, items:[{text,x,y,w,h}], count } 或 { ok:false, error }

const HOST = "ocr.tencentcloudapi.com";
const SERVICE = "ocr";
const ACTION = "GeneralAccurateOCR";
const VERSION = "2018-11-19";
const REGION = "ap-guangzhou";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function reply(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: HEADERS });
}

const enc = new TextEncoder();

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(str) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(str)));
}

async function hmac(keyBytes, str) {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(str)));
}

/* TC3-HMAC-SHA256 签名（腾讯云 API 3.0 标准流程） */
async function signTc3(secretId, secretKey, payload, timestamp) {
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const contentType = "application/json; charset=utf-8";
  const canonicalHeaders = `content-type:${contentType}\nhost:${HOST}\n`;
  const signedHeaders = "content-type;host";
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, await sha256Hex(payload)].join("\n");
  const scope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = ["TC3-HMAC-SHA256", String(timestamp), scope, await sha256Hex(canonicalRequest)].join("\n");

  const kDate = await hmac(enc.encode("TC3" + secretKey), date);
  const kService = await hmac(kDate, SERVICE);
  const kSigning = await hmac(kService, "tc3_request");
  const signature = hex(await hmac(kSigning, stringToSign));

  return `TC3-HMAC-SHA256 Credential=${secretId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: HEADERS });
}

export async function onRequestPost({ request, env }) {
  const secretId = env.OCR_SECRET_ID || env.COS_SECRET_ID;
  const secretKey = env.OCR_SECRET_KEY || env.COS_SECRET_KEY;
  if (!secretId || !secretKey) {
    return reply({ ok: false, error: "not_configured", message: "图片识别服务未配置密钥" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return reply({ ok: false, error: "bad_request", message: "请求体不是合法 JSON" }, 400);
  }

  const image = String(body.image || "").replace(/^data:[^,]+,/, "").replace(/\s+/g, "");
  if (!image) return reply({ ok: false, error: "no_image", message: "没有收到图片" }, 400);
  /* base64 体积上限 ~6MB（原图约 4.5MB），前端已压到 1600px 长边，正常在 300KB~1MB */
  if (image.length > 8 * 1024 * 1024) {
    return reply({ ok: false, error: "too_large", message: "图片太大，请压缩后再试" }, 413);
  }

  const payload = JSON.stringify({ ImageBase64: image });
  const timestamp = Math.floor(Date.now() / 1000);

  try {
    const authorization = await signTc3(secretId, secretKey, payload, timestamp);
    const upstream = await fetch(`https://${HOST}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        /* 不要手动设 Host：Workers 的 fetch 里 Host 是受保护头，写了可能被丢或报错；
           请求本来就发往 ocr.tencentcloudapi.com，实际 Host 与签名一致。 */
        Authorization: authorization,
        "X-TC-Action": ACTION,
        "X-TC-Version": VERSION,
        "X-TC-Region": REGION,
        "X-TC-Timestamp": String(timestamp),
      },
      body: payload,
    });

    const data = await upstream.json();
    const res = data && data.Response;
    if (!res) return reply({ ok: false, error: "upstream", message: "OCR 服务无响应" });

    if (res.Error) {
      const code = res.Error.Code || "unknown";
      const friendly = /AuthFailure|UnauthorizedOperation|InvalidCredential/i.test(code)
        ? "OCR 密钥未授权：请给腾讯云密钥开通「文字识别 OCR」权限（QcloudOCRFullAccess）"
        : res.Error.Message || code;
      return reply({ ok: false, error: code, message: friendly });
    }

    const items = (res.TextDetections || []).map((d) => {
      const p = d.ItemPolygon || {};
      return {
        text: String(d.DetectedText || "").trim(),
        conf: d.Confidence || 0,
        x: p.X || 0,
        y: p.Y || 0,
        w: p.Width || 0,
        h: p.Height || 0,
      };
    }).filter((i) => i.text);

    return reply({ ok: true, items, count: items.length });
  } catch (e) {
    return reply({ ok: false, error: "fetch_failed", message: `OCR 调用失败：${e && e.message ? e.message : "未知错误"}` });
  }
}
