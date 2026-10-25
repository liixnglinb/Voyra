import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import assert from 'node:assert/strict';
import { seedSchedulePreview } from './schedule-dialog-fixtures.mjs';

const root = resolve(process.argv[2] || 'dist'), out = resolve('output/playwright/schedule-dialogs');
await mkdir(out, { recursive: true });
const csp = (await readFile(resolve(root, '_headers'), 'utf8')).match(/Content-Security-Policy:\s*(.+)/)[1];
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2', '.ttf':'font/ttf', '.json':'application/json' };
const server = createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep)) throw Error('invalid path');
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'content-security-policy':csp }); res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel:'chrome', headless:true });
const report = { layouts:[], interactions:[], errors:[] };
const viewports = [{width:320,height:568},{width:360,height:740},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:768,height:1024},{width:1440,height:1000}];
async function makePage(viewport, authed = true) {
  const context = await browser.newContext({ viewport, hasTouch:viewport.width < 768, reducedMotion:'reduce', timezoneId:'Asia/Shanghai' });
  await seedSchedulePreview(context);
  if (!authed) await context.addInitScript(() => localStorage.removeItem('voyra_session_v1'));
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort('blockedbyclient'));
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error' && /content.security.policy|violates.*policy/i.test(msg.text())) report.errors.push(msg.text()); });
  await page.goto(`${origin}/#/timetable`, {waitUntil:'domcontentloaded'});
  await page.getByRole('button', {name:'功能',exact:true}).waitFor();
  return {context,page};
}
async function open(page, name) {
  await page.getByRole('button', {name:'功能',exact:true}).click();
  await page.getByRole('menuitem').filter({hasText:name}).click();
  await page.locator('.cs-dialog').waitFor();
}
async function layout(page, name, screenshot = false) {
  await page.waitForFunction(() => { const box=document.querySelector('.cs-dialog')?.getBoundingClientRect(); return box && box.bottom<=innerHeight && box.top>=0; });
  const check = await page.locator('.cs-dialog').evaluate(el => {
    const rect = el.getBoundingClientRect(), body = el.querySelector('.mbox-body'), foot = el.querySelector('.mbox-foot').getBoundingClientRect();
    return { name:el.getAttribute('aria-label'), width:innerWidth, height:innerHeight, left:rect.left, right:rect.right, top:rect.top, bottom:rect.bottom, bodyOverflow:body.scrollWidth - body.clientWidth, footTop:foot.top, footBottom:foot.bottom };
  });
  assert.ok(check.left >= 7 && check.right <= check.width - 7, `${name}: horizontal bounds ${JSON.stringify(check)}`);
  assert.ok(check.top >= 7 && check.bottom <= check.height - 7, `${name}: vertical bounds ${JSON.stringify(check)}`);
  assert.ok(check.bodyOverflow <= 1, `${name}: content overflow ${JSON.stringify(check)}`);
  assert.ok(check.footTop >= 0 && check.footBottom <= check.height, `${name}: footer must remain visible`);
  report.layouts.push({case:name,...check});
  if (screenshot) await page.screenshot({path:resolve(out,`after-${check.width}-${name}.png`)});
}
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('ClassScheduleData_schedule-ui-preview')));
try {
  for (const viewport of viewports) {
    const {context,page} = await makePage(viewport);
    assert.equal(await page.getByRole('button',{name:'同步课表',exact:true}).count(),0);
    assert.equal(await page.locator('.cs-sync-bar').count(),0);
    await page.getByRole('button',{name:'功能',exact:true}).click();
    const menu = await page.getByRole('menu',{name:'本页功能'}).boundingBox();
    assert.ok(menu.x >= 0 && menu.x + menu.width <= viewport.width + 1, `${viewport.width}: menu bounds`);
    assert.ok(menu.y >= 0 && menu.y + menu.height <= viewport.height - 6, `${viewport.width}: vertical menu bounds`);
    await page.getByRole('menuitem').filter({hasText:'周次与时间设置'}).click();
    await layout(page,'week',[320,390,1440].includes(viewport.width));
    if (viewport.width < 768) {
      const targets = await page.locator('.cs-week-picker>button').evaluateAll(els => els.map(el => ({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));
      assert.ok(targets.every(({w,h}) => w >= 43 && h >= 44), 'Week choices need touch-sized targets');
    }
    await page.getByRole('button',{name:'调整作息时间'}).click();
    await layout(page,'time',[320,390,1440].includes(viewport.width));
    await page.getByRole('button',{name:'晚自习 2下课时间 22:15',exact:true}).click();
    await layout(page,'time-picker',[320,390,1440].includes(viewport.width));
    const picker = await page.locator('.tp-pop').boundingBox();
    const body = await page.locator('.cs-dialog .mbox-body').boundingBox();
    assert.ok(picker.x >= body.x && picker.x+picker.width <= body.x+body.width+1, 'Time picker must stay inside body');
    assert.ok(picker.height <= body.height + 1, 'Time picker fits available dialog body height');
    await page.locator('.mbox-x').click();
    for (const [name,id] of [['本周课程明细','detail'],['导入课表','import'],['手动添加课程','add'],['清空课表','clear']]) {
      await open(page,name);
      await layout(page,id,[320,390,1440].includes(viewport.width));
      if (id === 'import') {
        for (const mode of ['教务导入','图片识别','分享链接','备份','Excel']) {
          await page.locator('.cs-modes').getByRole('button',{name:mode,exact:true}).click();
          await layout(page,`import-${mode}`);
        }
      }
      if (id === 'add') {
        assert.equal(await page.getByLabel('教室',{exact:true}).isVisible(),true);
        assert.equal(await page.getByLabel('老师',{exact:true}).isVisible(),false);
        await page.locator('.cs-session-editor>summary').click();
        await page.getByRole('button',{name:'周四',exact:true}).click();
        assert.equal(await page.getByRole('button',{name:'周四',exact:true}).getAttribute('aria-pressed'),'true');
        await page.getByRole('checkbox',{name:'这一时段使用自定义时间'}).check();
        await layout(page,'custom-time');
        if (viewport.width < 768) {
          const sizes = await page.locator('.cs-day-picker>button,.cs-slot-picker>button').evaluateAll(els => els.map(el => ({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));
          assert.ok(sizes.every(({w,h})=>w>=44 && h>=44),'Weekday/slot choices need touch-sized targets');
        }
      }
      await page.locator('.mbox-x').click();
    }
    const week=Number((await page.locator('.cs-weekcard h3').textContent()).match(/\d+/)[0]);
    await page.locator('.cs-grid td.empty[data-day="4"][data-slot="3-4"]').dblclick();
    await layout(page,'quick-add',[320,390,1440].includes(viewport.width));
    assert.equal(await page.locator('.cs-session-editor').getAttribute('open'),null);
    assert.equal(await page.getByLabel('课程名称',{exact:true}).isVisible(),true);
    assert.equal(await page.getByLabel('教室',{exact:true}).isVisible(),true);
    await page.getByLabel('课程名称',{exact:true}).fill('这周的临时课程');
    await page.getByLabel('教室',{exact:true}).fill('博学楼 501');
    await page.locator('.cs-session-editor>summary').click();
    assert.equal(await page.getByRole('button',{name:'单节课',exact:true}).getAttribute('aria-pressed'),'true');
    assert.equal(await page.getByLabel('起始周',{exact:true}).inputValue(),String(week));
    assert.equal(await page.getByLabel('结束周',{exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'周四',exact:true}).getAttribute('aria-pressed'),'true');
    await layout(page,'quick-add-expanded');
    await page.locator('.mbox-foot').getByRole('button',{name:'添加课程',exact:true}).click();
    const quick=(await saved(page)).courses.find(c=>c.name==='这周的临时课程');
    assert.deepEqual(quick.periods[0],{day:4,slot:'3-4',f:week,t:week,type:'every'});
    await open(page,'周次与时间设置');await page.getByRole('button',{name:`第 ${week+1} 周`,exact:true}).click();await page.locator('.mbox-x').click();
    assert.equal(await page.locator('.cs-grid .n').filter({hasText:'这周的临时课程'}).count(),0);
    console.log(`${viewport.width}×${viewport.height}: menu, all six dialogs, five import modes and custom time fit`);
    await context.close();
  }

  const {context,page} = await makePage({width:390,height:844});
  await open(page,'周次与时间设置');
  await page.getByRole('button',{name:'第 8 周',exact:true}).click();
  assert.equal((await page.locator('.cs-week-number').textContent()).replace(/\s/g,''),'08周');
  await page.getByRole('button',{name:'第 8 周',exact:true}).press('ArrowDown');
  assert.equal((await page.locator('.cs-week-number').textContent()).replace(/\s/g,''),'13周');
  assert.equal((await saved(page)).settings.overrideWeek,null);
  await page.getByRole('button',{name:'调整作息时间'}).click();
  await page.getByRole('button',{name:'1-2 节上课时间 08:20',exact:true}).click();
  await page.getByRole('listbox',{name:'分钟',exact:true}).getByRole('option',{name:'25',exact:true}).tap();
  await page.getByRole('listbox',{name:'分钟',exact:true}).press('ArrowDown');
  await page.getByRole('button',{name:'确定时间',exact:true}).click();
  await page.getByRole('button',{name:'1-2 节上课时间 08:30',exact:true}).waitFor();
  assert.equal((await saved(page)).settings.timeSlots['1-2'],'08:30-10:00');
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === '1-2 节上课时间 08:30');
  await page.getByRole('button',{name:'1-2 节上课时间 08:30',exact:true}).click();
  await page.getByRole('button',{name:'1-2 节下课时间 10:00',exact:true}).click();
  assert.equal(await page.locator('.tp-preview').innerText(),'10:00');
  await page.getByRole('listbox',{name:'小时',exact:true}).press('Home');
  await page.getByRole('button',{name:'确定时间',exact:true}).click();
  assert.equal(await page.locator('.tp-pop').count(),1);
  assert.equal((await saved(page)).settings.timeSlots['1-2'],'08:30-10:00');
  await page.locator('.tp-pop').getByRole('button',{name:'取消',exact:true}).click();
  await page.getByRole('button',{name:'恢复默认',exact:true}).click();
  assert.equal((await saved(page)).settings.timeSlots,null);
  await page.locator('.mbox-x').click();
  report.interactions.push('Week persistence, arrow navigation, time editing, field switching, invalid range and restore defaults');

  await open(page,'手动添加课程');
  await page.locator('.mbox-foot').getByRole('button',{name:'添加课程',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'先填写课程名称'}).waitFor();
  assert.equal(await page.getByLabel('课程名称',{exact:true}).evaluate(el=>el===document.activeElement),true);
  await page.getByLabel('课程名称',{exact:true}).fill('手机布局验证课程');
  await page.locator('.cs-session-editor>summary').click();
  await page.getByRole('button',{name:'周四',exact:true}).click();
  await page.locator('.cs-slot-picker').getByRole('button',{name:/7-8 节/}).click();
  await page.getByRole('button',{name:'单节课',exact:true}).click();
  await page.getByLabel('起始周',{exact:true}).fill('12');
  await page.getByRole('checkbox',{name:'这一时段使用自定义时间'}).check();
  const beforeInvalid=(await saved(page)).courses.length;
  await page.locator('.mbox-foot').getByRole('button',{name:'添加课程',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'请填写完整的自定义时间'}).waitFor();
  assert.equal((await saved(page)).courses.length,beforeInvalid);
  await page.getByLabel('时段 1 自定义开始时间',{exact:true}).fill('14:05');
  await page.getByLabel('时段 1 自定义结束时间',{exact:true}).fill('15:20');
  await page.locator('.cs-course-extras>summary').click();
  await page.getByLabel('老师',{exact:true}).fill('布局老师');
  await page.getByLabel('教室',{exact:true}).fill('设计楼 101');
  await page.setViewportSize({width:390,height:460});
  await page.getByLabel('课程名称',{exact:true}).focus();
  await layout(page,'reduced-available-height',true);
  await page.setViewportSize({width:390,height:844});
  await page.locator('.mbox-foot').getByRole('button',{name:'添加课程',exact:true}).click();
  await page.locator('.cs-dialog').waitFor({state:'detached'});
  const course=(await saved(page)).courses.find(c=>c.name==='手机布局验证课程');
  assert.equal(course.teacher,'布局老师'); assert.equal(course.room,'设计楼 101');
  assert.deepEqual(course.periods[0],{day:4,slot:'7-8',f:12,t:12,type:'every',customTime:{start:'14:05',end:'15:20'}});
  report.interactions.push('Thursday, one-off course, custom time, optional fields, reduced height and save/close');

  await open(page,'导入课表');
  await page.locator('.cs-modes').getByRole('button',{name:'备份',exact:true}).click();
  await page.locator('input[type=file][accept=".json,application/json"]').setInputFiles({name:'test-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({courses:[{id:'backup-one',name:'备份导入验证',periods:[{day:1,slot:'1-2',f:1,t:20,type:'every'}]}]}))});
  await page.locator('.mbox-foot').getByRole('button',{name:'导入 1 门课程',exact:true}).click();
  assert.ok((await saved(page)).courses.some(c=>c.name==='备份导入验证'));
  await open(page,'本周课程明细');
  await page.locator('.cs-course-detail').first().getByRole('button',{name:'编辑课程'}).click();
  await page.getByLabel('课程名称',{exact:true}).fill('高等数学 · 已编辑');
  await page.locator('.cs-course-extras>summary').click();
  await page.getByLabel('老师',{exact:true}).fill('');
  await page.locator('.mbox-foot').getByRole('button',{name:'保存修改',exact:true}).click();
  assert.ok((await saved(page)).courses.some(c=>c.name==='高等数学 · 已编辑'));
  assert.equal((await saved(page)).courses.find(c=>c.name==='高等数学 · 已编辑').teacher,'');
  await open(page,'清空课表');
  const first=page.locator('.mbox-x');
  const last=page.locator('.mbox-foot').getByRole('button',{name:'确认清空'});
  await last.focus(); await page.keyboard.press('Tab');
  assert.equal(await first.evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Escape');
  await page.locator('.cs-dialog').waitFor({state:'detached'});
  await open(page,'清空课表');
  await page.getByRole('button',{name:'确认清空',exact:true}).click();
  assert.equal((await saved(page)).courses.length,0);
  report.interactions.push('Backup preview/import, editing, focus trap, Escape and clear isolated fixture data');
  await context.close();

  const anon=await makePage({width:390,height:844},false);
  await open(anon.page,'手动添加课程');
  await anon.page.getByLabel('课程名称',{exact:true}).fill('尚未登录的草稿');
  await anon.page.locator('.mbox-foot').getByRole('button',{name:'添加课程',exact:true}).click();
  await anon.page.getByRole('form',{name:'登录',exact:true}).waitFor();
  assert.equal(await anon.page.getByLabel('课程名称',{exact:true}).inputValue(),'尚未登录的草稿');
  await anon.context.close();
  report.interactions.push('Unauthenticated save retains draft and opens existing login');
  assert.deepEqual(report.errors,[]);
} finally {
  await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
  await browser.close(); await new Promise(done=>server.close(done));
}
console.log(`Passed ${report.layouts.length} dialog layouts and ${report.interactions.length} interaction groups under production CSP.`);
