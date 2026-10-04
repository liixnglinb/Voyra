// POST /prompt-admin/verify  { pass }
//
// 提示词库（/prompts）管理员解锁的服务端校验。
//
// 背景：原先口令以 djb2 哈希硬编码在公开仓库 voyra-prompt-library 的
// PromptLibrary.jsx 中。djb2 是 32 位非密码学校验和（无 salt、无迭代），
// 放在公开仓库里等同于公开口令——任何人都能离线碰撞出等价口令。
// 现在口令只保存在 Cloudflare Pages 环境变量，前端不再持有任何可离线验证的凭据。
//
// 配置：Pages → Settings → Environment variables → 新增 PROMPT_ADMIN_PASS
//       （Production 与 Preview 都要配；值建议 20 位以上随机串）
// 未配置时本接口返回 503，管理功能默认不可用（fail closed）。

const WINDOW_MS = 10 * 60 * 1000; // 统计窗口 10 分钟
const WINDOW_MAX = 5; // 窗口内最多 5 次失败
const BAN_MS = 60 * 60 * 1000; // 超限封禁 1 小时

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function clientIP(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() ||
    'unknown'
  );
}

// 恒定时间比较：避免通过响应耗时逐字节推断口令。
// 注意仍会泄露长度差异，这是有意为之的取舍（长度本身不构成可用的爆破加速）。
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

// 轻量限流：D1 可用时按 IP 计数；未绑定 DB 时跳过，由 Cloudflare 边缘防护兜底。
async function rateCheck(db, ip) {
  if (!db) return { allowed: true };
  const now = Date.now();
  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS prompt_admin_rl(
           ip TEXT PRIMARY KEY, count INTEGER DEFAULT 0,
           window_start INTEGER DEFAULT 0, banned_until INTEGER DEFAULT 0)`
      )
      .run();
    const row = await db.prepare('SELECT * FROM prompt_admin_rl WHERE ip=?').bind(ip).first();
    if (row && row.banned_until && row.banned_until > now) {
      return { allowed: false, retryAfter: Math.ceil((row.banned_until - now) / 1000) };
    }
    if (!row || now - row.window_start > WINDOW_MS) {
      await db
        .prepare(
          'INSERT OR REPLACE INTO prompt_admin_rl(ip,count,window_start,banned_until) VALUES(?,1,?,0)'
        )
        .bind(ip, now)
        .run();
      return { allowed: true };
    }
    return { allowed: row.count < WINDOW_MAX };
  } catch {
    // 限流表不可用时不应阻断正常校验，放行并交由边缘防护处理
    return { allowed: true };
  }
}

async function bumpFail(db, ip) {
  if (!db) return;
  const now = Date.now();
  try {
    await db
      .prepare(
        `UPDATE prompt_admin_rl
            SET count = count + 1,
                banned_until = CASE WHEN count + 1 >= ${WINDOW_MAX} THEN ? ELSE 0 END
          WHERE ip = ?`
      )
      .bind(now + BAN_MS, ip)
      .run();
  } catch {
    /* ignore */
  }
}

async function clearFail(db, ip) {
  if (!db) return;
  try {
    await db.prepare('DELETE FROM prompt_admin_rl WHERE ip=?').bind(ip).run();
  } catch {
    /* ignore */
  }
}

export async function onRequestPost({ request, env }) {
  const expected = env && env.PROMPT_ADMIN_PASS;
  if (!expected) {
    return json({ ok: false, msg: 'not_configured' }, 503);
  }

  const ip = clientIP(request);
  const rl = await rateCheck(env.DB, ip);
  if (!rl.allowed) {
    return json({ ok: false, msg: `尝试过于频繁，请 ${rl.retryAfter} 秒后再试` }, 429);
  }

  const body = await request.json().catch(() => ({}));
  const pass = typeof body.pass === 'string' ? body.pass : '';

  if (pass && safeEqual(pass, expected)) {
    await clearFail(env.DB, ip);
    return json({ ok: true });
  }

  await bumpFail(env.DB, ip);
  // 统一错误消息，不区分"未配置"与"密码错误"，避免探测后台状态
  return json({ ok: false, msg: '密码错误' }, 403);
}
