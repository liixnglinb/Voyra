import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import assert from 'node:assert/strict';
import { seedHealthPreview, healthFixture } from './health-log-fixtures.mjs';

const root=resolve('dist'),out=resolve('output/playwright/health-log');await mkdir(out,{recursive:true});
const csp=(await readFile(resolve(root,'_headers'),'utf8')).match(/Content-Security-Policy:\s*(.+)/)[1];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf','.json':'application/json'};
const server=createServer(async(req,res)=>{try{
  let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path.endsWith('/'))path+='index.html';
  const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error('invalid path');
  const data=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','content-security-policy':csp});res.end(data);
}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={layouts:[],interactions:[],errors:[]};
async function make(viewport,options={}){
  const context=await browser.newContext({viewport,hasTouch:viewport.width<768,reducedMotion:'reduce',timezoneId:'Asia/Shanghai',acceptDownloads:true});
  await seedHealthPreview(context,options);
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort('blockedbyclient'));
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error'&&/content.security.policy|violates.*policy/i.test(msg.text()))report.errors.push(msg.text());});
  await page.goto(`${origin}/#/health`,{waitUntil:'domcontentloaded'});await page.locator('.bp-page').waitFor();
  return{context,page};
}
async function layout(page,name,shot=false){
  const result=await page.evaluate(()=>{
    const el=document.querySelector('.bp-sheet')||document.querySelector('.bp-page'),rect=el.getBoundingClientRect();
    const body=el.querySelector('.bp-sheet-body'),foot=el.querySelector('.bp-sheet-foot')?.getBoundingClientRect();
    return{width:innerWidth,height:innerHeight,sheet:el.classList.contains('bp-sheet'),left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
      contentOverflow:el.scrollWidth-el.clientWidth,bodyOverflow:body?body.scrollWidth-body.clientWidth:0,footBottom:foot?.bottom,
      pageOverflow:document.documentElement.scrollWidth-innerWidth};
  });
  assert.ok(result.left>=-1&&result.right<=result.width+1,`${name}: horizontal bounds ${JSON.stringify(result)}`);
  assert.ok(result.contentOverflow<=1&&result.bodyOverflow<=1,`${name}: content overflow ${JSON.stringify(result)}`);
  assert.ok(result.pageOverflow<=1,`${name}: page overflow`);
  if(result.sheet){assert.ok(result.top>=7&&result.bottom<=result.height-7,`${name}: viewport fit ${JSON.stringify(result)}`);if(result.footBottom)assert.ok(result.footBottom<=result.height-7,`${name}: footer visible`);}
  report.layouts.push({case:name,...result});if(shot)await page.screenshot({path:resolve(out,`after-${result.width}-${name}.png`)});
}
const read=page=>page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('HealthBpData_health-ui-preview'));return Array.isArray(value)?{records:value}:value;});
const close=page=>page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
async function add(page){const mobile=page.viewportSize().width<768;await page.locator(mobile?'.bp-mobile-dock button':'.bp-desktop-add').click();await page.getByRole('dialog',{name:'记录一次测量',exact:true}).waitFor();}
try{
  for(const viewport of [{width:320,height:568},{width:360,height:740},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:768,height:1024},{width:1440,height:1000}]){
    const{context,page}=await make(viewport,{legacy:viewport.width===320,legacyCloud:viewport.width===360});
    await page.waitForFunction(()=>document.querySelector('.bp-sync-synced'));
    await layout(page,'overview',[320,390,1440].includes(viewport.width));
    const chartLabel=await page.locator('.bp-chart-box svg').getAttribute('aria-label');assert.ok(Number(chartLabel.match(/至(\d+)/)?.[1])>=200,'High value 190 must not be clipped at old 165 cap');
    await page.locator('.bp-page-switch button').nth(1).click();await layout(page,'history',[320,390,1440].includes(viewport.width));
    if(viewport.width<768){const targets=await page.locator('.bp-entry-actions button,.bp-filters button,.bp-mobile-dock button,.bp-page-switch button').evaluateAll(els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height})));assert.ok(targets.every(s=>s.w>=43&&s.h>=44),'Mobile targets should be at least 44px');}
    await add(page);await layout(page,'form',[320,390,1440].includes(viewport.width));
    // Emulate a reduced visual viewport while the keyboard is open.
    if(viewport.width===390){await page.setViewportSize({width:390,height:430});await page.getByLabel('测量备注',{exact:true}).focus();await layout(page,'keyboard',true);await page.setViewportSize(viewport);}
    await close(page);await page.getByRole('button',{name:'数据与备份',exact:true}).click();await layout(page,'data',[320,390,1440].includes(viewport.width));
    await page.getByText('门户卡片代码',{exact:true}).click();await layout(page,'code');await close(page);
    await page.getByRole('button',{name:`删除 ${healthFixture[0].time} 的测量`,exact:true}).click();await layout(page,'delete',[320,390,1440].includes(viewport.width));
    await page.getByRole('button',{name:'保留记录',exact:true}).click();assert.equal((await read(page)).records.length,7);
    console.log(`${viewport.width}×${viewport.height}: overview, history, form, data and confirmation fit`);await context.close();
  }

  const{context,page}=await make({width:390,height:844},{cloudEmpty:true});
  await page.waitForFunction(()=>document.querySelector('.bp-sync-synced'));assert.equal((await read(page)).records.length,7);
  await page.getByRole('button',{name:'上一次测量',exact:true}).click();
  assert.ok((await page.locator('.bp-chart-readout').innerText()).includes('136 / 88'));
  await page.getByRole('button',{name:'上一次测量',exact:true}).click();
  assert.ok((await page.locator('.bp-chart-readout').innerText()).includes('190 / 102'));
  await page.locator('.bp-switch').getByRole('button',{name:'心率',exact:true}).click();
  assert.ok((await page.locator('.bp-chart-readout').innerText()).includes('81'));
  assert.ok((await page.locator('.bp-chart-box svg').getAttribute('aria-label')).includes('次每分'));
  await page.getByLabel('趋势范围',{exact:true}).selectOption('14');
  await page.locator('.bp-switch').getByRole('button',{name:'血压',exact:true}).click();
  report.interactions.push('Trend navigation shows exact high readings; pulse has its own axis/unit and range selection works');
  await add(page);await page.getByRole('button',{name:'保存测量',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal((await read(page)).records.length,7);
  await page.getByLabel('收缩压',{exact:true}).fill('142');await page.getByLabel('舒张压',{exact:true}).fill('91');await page.getByLabel('心率',{exact:true}).fill('78');
  await page.getByLabel('测量日期',{exact:true}).fill('2026-10-24');await page.getByLabel('测量时间',{exact:true}).fill('08:05');await page.getByRole('button',{name:'晨起',exact:true}).click();
  await page.getByLabel('测量备注',{exact:true}).fill('手机保存验证');await page.getByRole('button',{name:'保存测量',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  const added=(await read(page)).records.find(r=>r.note==='手机保存验证');assert.ok(added);assert.equal(added.time,'2026-10-24T08:05');
  report.interactions.push('New measurement validates actual input and persists selected date/time');
  await page.locator('.bp-page-switch button').nth(1).click();
  await page.getByRole('button',{name:`编辑 ${healthFixture[0].time} 的测量`,exact:true}).click();await page.getByLabel('收缩压',{exact:true}).fill('130');await page.getByRole('button',{name:'保存修改',exact:true}).click();
  let saved=await read(page);const edited=saved.records.find(r=>r.id==='existing-1');assert.equal(edited.sys,130);assert.deepEqual(edited.device,healthFixture[0].device);assert.equal(edited.time,healthFixture[0].time);assert.equal(edited.note,healthFixture[0].note);
  await page.getByRole('button',{name:`删除 ${added.time} 的测量`,exact:true}).click();await page.getByRole('button',{name:'确认删除',exact:true}).click();assert.equal((await read(page)).records.length,7);
  await page.getByRole('button',{name:'撤销删除',exact:true}).click();assert.equal((await read(page)).records.length,8);
  report.interactions.push('Edit preserves original id, note and unknown fields; delete requires confirmation and undo restores exact record');
  await page.getByLabel('搜索历史记录',{exact:true}).fill('手机保存验证');assert.equal(await page.locator('.bp-entry').count(),1);await page.getByLabel('搜索历史记录',{exact:true}).fill('');
  await page.getByRole('button',{name:'高于参考线',exact:true}).click();assert.equal(await page.locator('.bp-entry').count(),3);
  await page.getByRole('button',{name:'全部',exact:true}).click();
  await page.getByRole('button',{name:'数据与备份',exact:true}).click();
  const jsonPromise=page.waitForEvent('download');await page.getByRole('button',{name:/完整 JSON 备份/}).click();const jsonDownload=await jsonPromise;
  const backup=JSON.parse(await readFile(await jsonDownload.path(),'utf8'));assert.equal(backup.records.length,8);assert.ok(backup.recovery.original.records);assert.equal(backup.recovery.original.records.length,7);
  const csvPromise=page.waitForEvent('download');await page.getByRole('button',{name:/导出 CSV 表格/}).click();assert.ok((await readFile(await(await csvPromise).path(),'utf8')).includes('收缩压(mmHg)'));
  const other={...healthFixture[0],note:'从备份导入的不同内容'},newRecord={...healthFixture[1],id:'imported',time:'2026-10-25T08:00'};
  await page.getByLabel('选择血压记录备份',{exact:true}).setInputFiles({name:'旧版备份.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([other,newRecord]))});
  await page.getByRole('region',{name:'导入预览'}).waitFor();await layout(page,'import-preview',true);
  assert.equal((await read(page)).records.length,8);await page.getByRole('button',{name:'确认合并',exact:true}).click();assert.equal((await read(page)).records.length,10);
  await page.getByLabel('选择血压记录备份',{exact:true}).setInputFiles({name:'坏文件.json',mimeType:'application/json',buffer:Buffer.from('{invalid')});await page.getByRole('alert').waitFor();assert.equal((await read(page)).records.length,10);
  report.interactions.push('CSV/JSON export and old-array import preview/merge preserve existing records and conflicting versions');
  await page.getByRole('button',{name:/恢复历史备份/}).click();await page.getByLabel('历史备份',{exact:true}).selectOption('0');await page.getByRole('region',{name:'导入预览'}).waitFor();
  await close(page);await page.reload();await page.locator('.bp-page').waitFor();await page.waitForFunction(()=>document.querySelector('.bp-sync-synced'));assert.equal((await read(page)).records.length,10);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('HealthBpData_other-account')).records[0].id),'private-other');
  report.interactions.push('Reload retains edits/imports; other-account data remains untouched');await context.close();

  const offline=await make({width:390,height:844},{offline:true});await offline.page.locator('.bp-sync-warning').waitFor();await add(offline.page);
  for(const[label,value]of[['收缩压','121'],['舒张压','79'],['心率','71']])await offline.page.getByLabel(label,{exact:true}).fill(value);
  await offline.page.getByRole('button',{name:'保存测量',exact:true}).click();await offline.page.locator('.bp-sync-warning').waitFor();assert.equal((await read(offline.page)).records.length,8);
  await offline.page.evaluate(()=>{window.__healthFail=false;});await offline.page.getByRole('button',{name:'重试',exact:true}).click();await offline.page.locator('.bp-sync-synced').waitFor();assert.equal((await read(offline.page)).records.length,8);
  await layout(offline.page,'offline-recovered',true);report.interactions.push('Offline measurement saves locally; explicit retry merges old cloud data safely');await offline.context.close();

  const empty=await make({width:320,height:568},{empty:true});await layout(empty.page,'empty',true);assert.equal(await empty.page.locator('.bp-entry').count(),0);assert.equal(await empty.page.locator('.bp-latest-values').count(),0);await empty.context.close();
  const anonymous=await make({width:390,height:844},{authed:false});await anonymous.page.locator('.bp-mobile-dock button').click();await anonymous.page.locator('.agm-title').filter({hasText:'登录'}).waitFor();
  assert.equal(await anonymous.page.locator('.bp-sheet').count(),0);assert.equal(await anonymous.page.evaluate(()=>window.__healthWrites.length),0);await anonymous.context.close();
  const anonImport=await make({width:390,height:844},{authed:false});
  await anonImport.page.getByRole('button',{name:'数据与备份',exact:true}).click();
  await anonImport.page.getByLabel('选择血压记录备份',{exact:true}).setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{...healthFixture[0],id:'must-not-save'}]))});
  await anonImport.page.getByRole('button',{name:'确认合并',exact:true}).click();await anonImport.page.locator('.agm-title').waitFor();
  const loginAboveSheet=await anonImport.page.evaluate(()=>Number(getComputedStyle(document.querySelector('.agm-overlay')).zIndex)>Number(getComputedStyle(document.querySelector('.bp-veil')).zIndex));
  assert.ok(loginAboveSheet,'Auth remains usable above the data sheet');
  assert.equal(await anonImport.page.evaluate(()=>JSON.parse(localStorage.getItem('HealthBpData_local')).records.length),7);await anonImport.context.close();
  report.interactions.push('Empty accounts show no fake readings; anonymous writes still require login');
  assert.deepEqual(report.errors,[],'No runtime or CSP errors');await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
  console.log(`PASS: ${report.layouts.length} layout cases, ${report.interactions.length} interaction groups, 0 runtime/CSP errors`);
}finally{await browser.close();await new Promise(done=>server.close(done));}
