import { chromium } from 'playwright-core';

const URL = 'http://127.0.0.1:5173/';
const browser = await chromium.launch();
const out = {};

/* 1 · prefers-reduced-motion: 动效与位移必须全关 */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.sc-card');
  await page.waitForTimeout(900);
  out.reducedMotion = await page.evaluate(() => {
    const c = document.querySelector('.sc-card');
    const stage = c.querySelector('.sc-stage');
    const anim = c.querySelector('.stg *');
    return {
      cardTransform: getComputedStyle(c).transform,
      cardTransition: getComputedStyle(c).transitionDuration,
      /* 流光/光斑已移除（旧时代手法），这里改验环境光与舞台动画是否已停 */
      driftAnim: getComputedStyle(stage, '::before').animationName,
      stageAnim: anim ? getComputedStyle(anim).animationName : '(none)',
      stageAnimDur: anim ? getComputedStyle(anim).animationDuration : '',
      brandTransition: getComputedStyle(c.querySelector('.sc-brand')).transitionDuration,
      /* 进度条必须已展开 —— 否则关掉动画后会停在 scaleX(0)，舞台看着是空的 */
      barTransform: (() => { const b = c.querySelector('.stg-bar i'); return b ? getComputedStyle(b).transform : '(none)'; })(),
    };
  });
  out.reducedMotionErrors = errors;
  await ctx.close();
}

/* 2 · forced-colors: 轮廓必须仍在 */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, forcedColors: 'active' });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.sc-card');
  await page.waitForTimeout(700);
  out.forcedColors = await page.evaluate(() => {
    const c = document.querySelector('.sc-card');
    const s = c.querySelector('.sc-stage');
    return { cardBorder: getComputedStyle(c).borderTopWidth + ' ' + getComputedStyle(c).borderTopStyle, stageBorder: getComputedStyle(s).borderTopWidth + ' ' + getComputedStyle(s).borderTopStyle };
  });
  await ctx.close();
}

/* 3 · 键盘可达性 + 链接语义 */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.sc-card');
  await page.waitForTimeout(800);
  out.a11y = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#panel-products .sc-card')];
    return {
      allAreLinks: cards.every((c) => c.tagName === 'A' && c.hasAttribute('href')),
      allHaveLabel: cards.every((c) => (c.getAttribute('aria-label') || '').length > 3),
      externalHaveRel: cards.filter((c) => c.target === '_blank').every((c) => (c.rel || '').includes('noopener')),
      /* 舞台现在整块是 HTML 图示（含真实文案），必须整体 aria-hidden，
         否则读屏器会把示意用的日志/金额当成正文念出来。 */
      /* v5：舞台不再是 .stg 三段式，改成 product-shots 的 6 种外壳
         （Window / Browser / Terminal / Spotlight / Sheet / Inline）。
         它们都是纯装饰，统一带 aria-hidden。 */
      stageAriaHidden: [...document.querySelectorAll('#panel-products .sc-stage > *')].every((s) => s.getAttribute('aria-hidden') === 'true'),
      stageCount: document.querySelectorAll('#panel-products .sc-stage > *').length,
      /* 装饰层（流光/光斑）已删除；改为校验舞台里的 SVG 图表同样不进可访问性树 */
      chartAriaHidden: [...document.querySelectorAll('#panel-products .sc-stage svg')].every((s) => s.getAttribute('aria-hidden') === 'true'),
      seqIsNumeric: cards.map((c) => c.querySelector('.sc-seq')?.textContent).every((t) => t === undefined || /^\d{1,2}$/.test(t)),
      ctaTexts: cards.slice(0, 3).map((c) => c.querySelector('.sc-cta')?.textContent.trim()),
    };
  });
  // Tab 聚焦后应有可见 outline
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  out.a11y.focusOutline = await page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return { tag: el.tagName, cls: (typeof el.className === 'string' ? el.className : '').slice(0, 30), outline: s.outlineWidth + ' ' + s.outlineStyle };
  });
  await ctx.close();
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
