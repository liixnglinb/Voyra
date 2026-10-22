import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import assert from 'node:assert/strict';
import { DOWNLOAD_PRODUCTS } from './download-products.mjs';

const root = resolve('dist'), output = resolve('output/playwright/download-pages');
await mkdir(output, { recursive: true });
const headersText = await readFile(resolve(root, '_headers'), 'utf8');
const csp = headersText.match(/Content-Security-Policy:\s*(.+)/)[1];
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    let file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (file.endsWith('/')) file += 'index.html';
    const target = resolve(root, '.' + file);
    if (!target.startsWith(root + sep)) throw Error('invalid path');
    const bytes = await readFile(target);
    res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream', 'content-security-policy': csp }); res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { layouts: [], interactions: [], motion: [], errors: [], screenshots: [] };
const version = '9.8.7';
const fixtureAssets = p => p.assets.map((a, i) => ({ name: a.file.replace(p.version, version), size: 68157440 + i * 1048576, browser_download_url: `https://github.com/${p.repo}/releases/download/${p.id === 'billtrace' ? 'latest' : 'v' + version}/${a.file.replace(p.version, version)}`, url: 'https://api.github.com/repos/' + p.repo + '/releases/assets/123' }));
async function pageFor(width, mode = 'success', reducedMotion = 'reduce', javaScriptEnabled = true) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion, hasTouch: width <= 600, javaScriptEnabled });
  await context.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__copied = text; } } }); });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
  await page.route('**/*', async route => {
    const request = route.request(), url = request.url();
    const p = DOWNLOAD_PRODUCTS.find(p => p.endpoints.some(endpoint => url === new URL(endpoint, origin).href || url === 'https://gh-proxy.com/' + endpoint));
    if (p) {
      if (mode === 'failure') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) });
      const assets = mode === 'no-assets' ? [] : fixtureAssets(p);
      const payload = url.includes('/bt-api/') ? { version, direct: assets[0]?.browser_download_url, size: assets[0]?.size, published: '2026-10-22T02:00:00Z' } : url.includes('api.github.com') ? { tag_name: p.id === 'billtrace' ? 'latest' : 'v' + version, name: 'Release v' + version, assets, published_at: '2026-10-22T02:00:00Z' } : { version, assets: assets.map(a => ({ name: a.name, size: mode === 'zero-size' ? 0 : a.size, url: a.browser_download_url })), sha256: 'a'.repeat(64), published: '2026-10-22T02:00:00Z' };
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(payload) });
    }
    if (!url.startsWith(origin)) return route.fulfill({ status: 206, headers: { 'content-type': 'application/octet-stream', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'range' }, body: Buffer.alloc(2097152, 1) });
    return route.continue();
  });
  return { context, page };
}
try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const { context, page } = await pageFor(width);
    for (const p of DOWNLOAD_PRODUCTS) {
      await page.goto(`${origin}/${p.slug}/`, { waitUntil: 'networkidle' });
      await page.waitForFunction(v => [...document.querySelectorAll('[data-version]')].every(el => el.textContent === 'v' + v), version);
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
      const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, h1: document.querySelector('h1').getBoundingClientRect().width, brokenImages: [...document.images].filter(img => !img.complete || !img.naturalWidth).map(img => img.src), badLinks: [...document.querySelectorAll('a')].filter(a => !a.getAttribute('href') || a.getAttribute('href') === '#').map(a => a.textContent), inlineExecutable: [...document.scripts].filter(s => !s.src && s.type !== 'application/json').length }));
      assert.ok(layout.scrollWidth <= width + 1, `${p.slug} ${width}: page overflow ${layout.scrollWidth}`);
      assert.deepEqual(layout.brokenImages, [], `${p.slug}: broken images`);
      assert.deepEqual(layout.badLinks, [], `${p.slug}: placeholder links`);
      assert.equal(layout.inlineExecutable, 0);
      const direct = page.getByRole('button', { name: '官方直连', exact: true });
      await direct.click();
      const main = page.locator('.dp-download-option [data-download-kind]').first();
      assert.equal(await main.getAttribute('href'), fixtureAssets(p)[0].browser_download_url);
      await page.getByRole('button', { name: '备用镜像', exact: true }).click();
      assert.equal(await main.getAttribute('href'), (p.backupPrefix || 'https://ghfast.top/') + fixtureAssets(p)[0].browser_download_url);
      await page.getByRole('button', { name: '国内镜像', exact: true }).click();
      assert.equal(await main.getAttribute('href'), 'https://gh-proxy.com/' + fixtureAssets(p)[0].browser_download_url);
      if (width === 1440) {
        await page.locator('[data-copy-kind]').first().click();
        await page.waitForFunction(() => !!window.__copied);
        assert.equal(await page.evaluate(() => window.__copied), 'https://gh-proxy.com/' + fixtureAssets(p)[0].browser_download_url);
        await page.reload({ waitUntil: 'networkidle' });
        assert.equal(await page.getByRole('button', { name: '国内镜像', exact: true }).getAttribute('aria-pressed'), 'true');
        await page.locator('.dp-faq-list summary').first().click();
        assert.equal(await page.locator('.dp-faq-list details').first().getAttribute('open'), '');
        if (p.id === 'token') {
          const tab = page.getByRole('tab', { name: '模型明细', exact: true });
          await tab.click();
          assert.match(await page.locator('#product-shot').getAttribute('src'), /models.webp$/);
          await tab.press('ArrowRight');
          assert.equal(await page.getByRole('tab', { name: '扫描与缓存', exact: true }).getAttribute('aria-selected'), 'true');
          assert.match(await page.locator('[data-shot-enlarge]').first().getAttribute('href'), /scan.webp$/);
          await page.getByRole('tab', { name: '用量总览', exact: true }).click();
        }
      }
      if ([1440, 390].includes(width)) {
        await page.evaluate(() => scrollTo(0, 0)); await page.mouse.move(0, 0);
        const file = `${width}-${p.slug}.png`;
        await page.screenshot({ path: resolve(output, file), fullPage: true });
        await page.screenshot({ path: resolve(output, `hero-${file}`) });
        report.screenshots.push(file);
      }
      report.layouts.push({ app: p.id, ...layout });
    }
    console.log(`${width}px: all five pages, images and download routes pass`);
    await context.close();
  }
  const expectedMotion = { checkin: 'dp-course-scan', toolbox: 'dp-disk-orbit', billtrace: 'dp-receipt-arrive', token: 'dp-packet-flow', chronicle: 'dp-timeline-trace' };
  for (const width of [1440, 390, 320]) {
    const { context, page } = await pageFor(width, 'success', 'no-preference');
    for (const p of DOWNLOAD_PRODUCTS) {
      await page.goto(`${origin}/${p.slug}/`, { waitUntil: 'networkidle' });
      const stage = page.locator('.dp-hero-visual');
      await stage.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.dp-hero-visual').hasAttribute('data-motion-running'));
      await page.waitForTimeout(1800);
      const readMotion = name => page.evaluate(name => {
        const animations = document.querySelector('.dp-hero-visual').getAnimations({ subtree: true }).filter(a => a instanceof CSSAnimation);
        const lead = animations.find(a => a.animationName === name);
        return { names: animations.map(a => a.animationName), time: lead?.currentTime, state: lead?.playState, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      }, name);
      const before = await readMotion(expectedMotion[p.id]);
      await page.waitForTimeout(160);
      const after = await readMotion(expectedMotion[p.id]);
      assert.ok(before.names.includes(expectedMotion[p.id]), `${p.id}: distinctive motion missing`);
      assert.ok(after.time > before.time + 80, `${p.id}: animation clock must advance`);
      assert.equal(after.overflow, false, `${p.id} ${width}: animated overflow`);
      if (width === 1440) {
        const box = await stage.boundingBox();
        await page.mouse.move(box.x + box.width * .8, box.y + box.height * .3);
        await page.waitForTimeout(200);
        assert.ok(await stage.evaluate(el => Math.abs(parseFloat(el.style.getPropertyValue('--dp-ry'))) > .5), `${p.id}: pointer depth`);
        await page.mouse.move(0, 0);
        await page.waitForTimeout(600);
      }
      if (width !== 320) {
        const file = `motion-${width}-${p.slug}.png`;
        await page.screenshot({ path: resolve(output, file) });
        report.screenshots.push(file);
      }
      await page.getByRole('button', { name: '暂停预览动效', exact: true }).click();
      const stopped = await readMotion(expectedMotion[p.id]);
      await page.waitForTimeout(150);
      const still = await readMotion(expectedMotion[p.id]);
      assert.equal(still.state, 'paused');
      assert.ok(Math.abs(still.time - stopped.time) < 2, `${p.id}: manual pause`);
      if (width === 1440) {
        await page.reload({ waitUntil: 'networkidle' });
        assert.equal(await page.getByRole('button', { name: '播放预览动效', exact: true }).count(), 1);
      }
      await page.getByRole('button', { name: '播放预览动效', exact: true }).click();
      await page.locator('#download').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => !document.querySelector('.dp-hero-visual').hasAttribute('data-motion-running'));
      assert.ok(await stage.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a instanceof CSSAnimation).every(a => a.playState === 'paused')), `${p.id}: offscreen pause`);
      await stage.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.dp-hero-visual').hasAttribute('data-motion-running'));
      if (width === 1440) {
        // Headless Chrome keeps every tab visible; deliver the browser visibility
        // signal explicitly to verify background suspension and restoration.
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
        assert.equal(await stage.getAttribute('data-motion-running'), null);
        assert.ok(await stage.evaluate(el => el.getAnimations({ subtree: true }).filter(a => a instanceof CSSAnimation).every(a => a.playState === 'paused')));
        await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
        await page.waitForFunction(() => document.querySelector('.dp-hero-visual').hasAttribute('data-motion-running'));
      }
      if (p.id === 'token' && width === 1440) {
        await page.getByRole('tab', { name: '模型明细', exact: true }).click();
        await page.locator('#product-shot').evaluate(img => img.decode());
        assert.match(await page.locator('[data-shot-enlarge]').first().getAttribute('href'), /models.webp$/);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.body.hasAttribute('data-motion-paused') && document.getAnimations().every(a => a.playState !== 'running'));
      assert.ok(await page.evaluate(() => document.getAnimations().every(a => a.playState !== 'running')), `${p.id}: reduced motion must stop all animations`);
      assert.equal(await page.locator('h1').evaluate(el => getComputedStyle(el).opacity), '1');
      assert.equal(await page.locator('[data-motion-toggle]').isVisible(), false);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      report.motion.push({ app: p.id, width, clock: true, pause: true, offscreen: true, reducedMotion: true, pointerDepth: width === 1440 });
    }
    console.log(`${width}px: five distinct motion systems, pause/resume, offscreen and reduced motion pass`);
    await context.close();
  }
  const staticPage = await pageFor(390, 'success', 'no-preference', false);
  for (const p of DOWNLOAD_PRODUCTS) {
    await staticPage.page.goto(`${origin}/${p.slug}/`, { waitUntil: 'networkidle' });
    assert.equal(await staticPage.page.locator('h1').evaluate(el => getComputedStyle(el).opacity), '1');
    assert.match(await staticPage.page.locator('[data-download-kind]').first().getAttribute('href'), /^https:\/\//);
    await staticPage.page.locator('.dp-faq-list summary').first().click();
    assert.equal(await staticPage.page.locator('.dp-faq-list details').first().getAttribute('open'), '');
  }
  await staticPage.context.close();
  for (const mode of ['failure', 'no-assets', 'zero-size']) {
    const { context, page } = await pageFor(390, mode);
    for (const p of DOWNLOAD_PRODUCTS.filter(p => mode !== 'zero-size' || ['token', 'chronicle'].includes(p.id))) {
      await page.goto(`${origin}/${p.slug}/`, { waitUntil: 'networkidle' });
      if (mode !== 'zero-size') {
        await page.waitForFunction(() => document.querySelector('[data-release-state]').textContent.includes('仍可使用'));
        assert.equal(await page.locator('[data-version]').first().textContent(), 'v' + p.version);
        assert.match(await page.locator('[data-download-kind]').first().getAttribute('href'), /^https:\/\//);
      } else {
        await page.waitForFunction(() => document.querySelector('[data-size]').textContent.includes('发布页'));
        assert.doesNotMatch(await page.locator('.dp-download').innerText(), /null MB|NaN|undefined/);
      }
      report.interactions.push({ app: p.id, mode, passed: true });
    }
    await context.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close(); await new Promise(resolve => server.close(resolve));
}
console.log('Download UI, metadata, copy, source choice, screenshots and offline fallbacks passed under the production CSP.');
