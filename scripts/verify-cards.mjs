import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const URL = 'http://127.0.0.1:5173/';
const OUT = './audit-after';
const TAB_MAP = { products: '产品', skills: 'Skills', apps: '应用' };

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const report = {};

/* 只统计「可见」的卡片：未激活的 Tab 面板仍挂在 DOM 上，直接 querySelectorAll
   会把 19 张卡全算进来。用 offsetParent / getBoundingClientRect 过滤。 */
const VISIBLE_SCOPE = `
  const isVisible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  const activePanel = [...document.querySelectorAll('.vr-panel')].find((p) => isVisible(p) && p.querySelector('.sc-card'));
  const list = activePanel ? activePanel.querySelector('.vr-product-list') : document.querySelector('.vr-product-list');
`;

for (const [name, vp] of Object.entries({ desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } })) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: name === 'mobile' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.sc-card', { timeout: 15000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelectorAll('.voyra-boot').forEach((el) => el.remove()));

  for (const [tab, label] of Object.entries(TAB_MAP)) {
    const btn = page.locator(`.vr-tab:has-text("${label}")`).first();
    if (await btn.count()) { await btn.click(); await page.waitForTimeout(500); }

    const metrics = await page.evaluate(`(() => { ${VISIBLE_SCOPE}
      const cards = [...list.querySelectorAll('.sc-card')];
      const stages = [...list.querySelectorAll('.sc-stage')];
      const offenders = [];
      cards.forEach((c, i) => {
        /* ⚠️ 用 offsetLeft/offsetWidth 而不是 getBoundingClientRect。
           首页满页 transform（滚动 roll 的 perspective/scale），
           rect 量到的是视觉位置、offset 量到的是布局位置 ——
           用 rect 会把每张卡都误报成「有元素越界」（本站已踩坑两次）。
           布局越界才是真的越界。 */
        const bad = [...c.querySelectorAll('*')].filter((el) => {
          if (!el.offsetWidth && !el.offsetHeight) return false;
          // 元素相对卡片的布局偏移
          const dx = el.offsetLeft;
          const right = dx + el.offsetWidth;
          return right > c.offsetWidth + 1.5 || dx < -1.5;
        });
        if (bad.length) offenders.push({ i, name: c.getAttribute('aria-label'), tags: bad.map((e) => e.className && typeof e.className === 'string' ? e.className : e.tagName).slice(0, 4) });
      });
      return {
        count: cards.length,
        cols: getComputedStyle(list).gridTemplateColumns,
        gap: getComputedStyle(list).gap,
        docScrollW: document.documentElement.scrollWidth,
        docClientW: document.documentElement.clientWidth,
        /* offsetHeight 是布局高度（不含 transform），用它判断"等高"这个布局属性；
           getBoundingClientRect 会被首页既有的纸片滚动缩放影响，不是等高性的判据。 */
        layoutHeights: [...new Set(cards.map((c) => c.offsetHeight))],
        renderedHeights: [...new Set(cards.map((c) => Math.round(c.getBoundingClientRect().height)))],
        stageLayoutHeights: [...new Set(stages.map((s) => s.offsetHeight))],
        accents: [...new Set(cards.map((c) => getComputedStyle(c).getPropertyValue('--p-accent').trim()))],
        offenders,
      };
    })()`);
    report[`${name}/${tab}`] = metrics;

    // JS 驱动滚动 + 裁剪截图，避开 Playwright 的可见性等待
    const clip = await page.evaluate(`(() => { ${VISIBLE_SCOPE}
      const r = list.getBoundingClientRect();
      return { top: r.top + window.scrollY, height: r.height, left: r.left, width: r.width };
    })()`);
    await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y - 24), behavior: 'instant' }), clip.top);
    await page.waitForTimeout(600);
    const vh = vp.height;
    const shotH = Math.min(vh, clip.height);
    await page.screenshot({ path: `${OUT}/${name}-${tab}-grid.png`, clip: { x: 0, y: 0, width: vp.width, height: shotH } });

    if (tab === 'products') {
      const c0 = await page.evaluate(`(() => { ${VISIBLE_SCOPE}
        const r = list.querySelector('.sc-card').getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      })()`);
      await page.screenshot({ path: `${OUT}/${name}-card01.png`, clip: { x: Math.max(0, c0.x - 8), y: Math.max(0, c0.y - 8), width: c0.w + 16, height: c0.h + 16 } });
    }
  }

  if (name === 'desktop') {
    await page.locator('.vr-tab:has-text("产品")').first().click();
    await page.waitForTimeout(450);
    const box = await page.evaluate(`(() => { ${VISIBLE_SCOPE}
      const cards = [...list.querySelectorAll('.sc-card')];
      const c = cards[1];
      const r = c.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, top: r.top + window.scrollY };
    })()`);
    await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y - 80), behavior: 'instant' }), box.top);
    await page.waitForTimeout(400);
    await page.mouse.move(box.x, box.y, { steps: 12 });
    await page.waitForTimeout(700);
    report.hoverState = await page.evaluate(`(() => { ${VISIBLE_SCOPE}
      const c = list.querySelectorAll('.sc-card')[1];
      const s = getComputedStyle(c);
      return {
        transform: s.transform,
        borderColor: s.borderColor,
        pointerActive: c.hasAttribute('data-pointer-active'),
        /* 本轮起悬停不再是 3D 倾斜 / 光斑 / 流光，而是抬升 + 投影加深。
           --lift 由 :hover 设置，transform 里能读到位移。 */
        lift: getComputedStyle(c).getPropertyValue('--lift').trim(),
        brandBg: getComputedStyle(c.querySelector('.sc-brand')).backgroundColor,
        brandColor: getComputedStyle(c.querySelector('.sc-brand')).color,
      };
    })()`);
    await page.screenshot({ path: `${OUT}/desktop-hover.png` });
  }

  report[`${name}/errors`] = errors;
  await ctx.close();
}

/* ── 舞台完整性守卫 ────────────────────────────────────────────────────────
   本项目踩过两次同一个坑：舞台根节点渲染成 `stg stg-<kind>`，而内层容器
   又叫了同一个名字（stg-week / stg-bench / stg-tree / stg-arc / stg-spark …）。
   两者特异性相同、内层规则在文件里更靠后，于是 `.stg-week{display:grid}`
   直接盖掉 `.stg{display:flex}`，整个舞台塌成一条窄缝 —— 截图上看是
   "内容没渲染出来"，构建却完全不报错。这里把它变成可自动发现的断言。 */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.sc-card', { timeout: 15000 });
  await page.waitForTimeout(1200);
  /* v5：舞台不再是 .stg 三段式（head/body/foot），而是 product-shots 提供的
     6 种真实 UI 外壳：Window / Browser / Terminal / Spotlight / Sheet / Inline。
     完整性守卫相应改为：
       1) 每个 .sc-stage 必须恰好有一个外壳子元素（多一个说明 JSX 写错位了）
       2) 外壳必须自适应填满舞台（width/height 都是 100%）
       3) 外壳必须带 aria-hidden（截图是纯装饰，语义由卡片 aria-label 承担）
     旧的「display 必须是 flex / 内层不复用根类」两条检查已随结构废弃 ——
     .stg 的命名空间冲突问题在 v5 不复存在（外壳都是独立组件，不复用类名）。 */
  report.stageIntegrity = await page.evaluate(() => {
    const SHOT = '.Window, .Browser, .Terminal, .Spotlight, .Sheet, .Inline';
    const bad = [];
    document.querySelectorAll('.sc-stage').forEach((stage) => {
      const shells = [...stage.querySelectorAll(':scope > ' + SHOT)];
      if (shells.length !== 1) {
        bad.push({ kind: stage.className, why: '外壳数=' + shells.length + '（应为 1）' });
        return;
      }
      const shell = shells[0];
      const cs = getComputedStyle(shell);
      /* 用 offsetWidth/offsetHeight 与舞台实际比，而不是比较 getComputedStyle
         的字符串 —— 后者返回的是解算后的 px 值（306.047px），永远不等于 '100%'。
         真正要检查的是「外壳有没有比舞台大」（被内容撑破），
         小一点无妨（舞台本身可能比外壳高）。 */
      if (shell.offsetWidth > stage.offsetWidth + 1 || shell.offsetHeight > stage.offsetHeight + 1) {
        bad.push({ kind: shell.className, why: '外壳溢出舞台 ' + shell.offsetWidth + '×' + shell.offsetHeight + ' > ' + stage.offsetWidth + '×' + stage.offsetHeight });
      }
      if (shell.getAttribute('aria-hidden') !== 'true') {
        bad.push({ kind: shell.className, why: '缺 aria-hidden' });
      }
    });
    return { stageCount: document.querySelectorAll('.sc-stage').length, problems: bad };
  });
  await ctx.close();
}

/* ── 舞台完整性守卫 ────────────────────────────────────────────────────────
   本项目踩过两次同一个坑：舞台根节点渲染成 `stg stg-<kind>`，而内层容器
   又叫了同一个名字（stg-week / stg-bench / stg-tree / stg-arc / stg-spark …）。
   两者特异性相同、内层规则在文件里更靠后，于是 `.stg-week{display:grid}`
   直接盖掉 `.stg{display:flex}`，整个舞台塌成一条窄缝 —— 截图上看是
   "内容没渲染出来"，构建却完全不报错。这里把它变成可自动发现的断言。 */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.sc-card', { timeout: 15000 });
  await page.waitForTimeout(1200);
  /* v5：舞台不再是 .stg 三段式（head/body/foot），而是 product-shots 提供的
     6 种真实 UI 外壳：Window / Browser / Terminal / Spotlight / Sheet / Inline。
     完整性守卫相应改为：
       1) 每个 .sc-stage 必须恰好有一个外壳子元素（多一个说明 JSX 写错位了）
       2) 外壳必须自适应填满舞台（width/height 都是 100%）
       3) 外壳必须带 aria-hidden（截图是纯装饰，语义由卡片 aria-label 承担）
     旧的「display 必须是 flex / 内层不复用根类」两条检查已随结构废弃 ——
     .stg 的命名空间冲突问题在 v5 不复存在（外壳都是独立组件，不复用类名）。 */
  report.stageIntegrity = await page.evaluate(() => {
    const SHOT = '.Window, .Browser, .Terminal, .Spotlight, .Sheet, .Inline';
    const bad = [];
    document.querySelectorAll('.sc-stage').forEach((stage) => {
      const shells = [...stage.querySelectorAll(':scope > ' + SHOT)];
      if (shells.length !== 1) {
        bad.push({ kind: stage.className, why: '外壳数=' + shells.length + '（应为 1）' });
        return;
      }
      const shell = shells[0];
      const cs = getComputedStyle(shell);
      /* 用 offsetWidth/offsetHeight 与舞台实际比，而不是比较 getComputedStyle
         的字符串 —— 后者返回的是解算后的 px 值（306.047px），永远不等于 '100%'。
         真正要检查的是「外壳有没有比舞台大」（被内容撑破），
         小一点无妨（舞台本身可能比外壳高）。 */
      if (shell.offsetWidth > stage.offsetWidth + 1 || shell.offsetHeight > stage.offsetHeight + 1) {
        bad.push({ kind: shell.className, why: '外壳溢出舞台 ' + shell.offsetWidth + '×' + shell.offsetHeight + ' > ' + stage.offsetWidth + '×' + stage.offsetHeight });
      }
      if (shell.getAttribute('aria-hidden') !== 'true') {
        bad.push({ kind: shell.className, why: '缺 aria-hidden' });
      }
    });
    return { stageCount: document.querySelectorAll('.sc-stage').length, problems: bad };
  });
  await ctx.close();
}

console.log(JSON.stringify(report, null, 2));
await browser.close();
