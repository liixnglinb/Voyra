import assert from 'node:assert/strict';
import http from 'node:http';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, sep, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { chronicleFixture, startSoftwareFixtures } from './software-ui-fixtures.mjs';

// Built frontends + in-memory responses only. Never starts a software backend.
const args=Object.fromEntries(process.argv.slice(2).filter((x)=>x.includes('=')).map((x)=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];}));
for(const id of ['chronicle','disk','token','checkin','jacquard']) assert.ok(args[id]&&/^(?:[A-Za-z]:[\\/]|\/)/.test(args[id]),'Provide '+id+'=absolute-directory');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(args.output||resolve(root,'output/ui-refactor-phase2/regression'));
await mkdir(output,{recursive:true});
let executable=args.browser;
if(!executable)for(const candidate of ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']){try{await access(candidate);executable=candidate;break;}catch{}}
assert.ok(executable,'Pass browser=absolute-browser-executable');
const contentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const servers=[];
async function serveBuild(directory,port){
  const target=resolve(directory,'dist');await access(resolve(target,'index.html'));
  const server=http.createServer(async(req,res)=>{
    try{const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const file=resolve(target,pathname==='/'?'index.html':pathname.slice(1));if(!file.startsWith(target+sep)){res.writeHead(403);res.end();return;}const bytes=await readFile(file);res.writeHead(200,{'Content-Type':contentTypes[extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}
  });
  await new Promise((done)=>server.listen(port,'127.0.0.1',done));servers.push(server);
}
const report={date:new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'}),executedAt:new Date().toISOString(),scope:'UI-only fixtures; no real software operations',checks:[],pageErrors:[],mockDeletes:0};
let fixtures,browser,context;
const test=async(name,action)=>{try{await action();report.checks.push({name,status:'passed'});console.log('PASS '+name);}catch(error){report.checks.push({name,status:'failed',error:error.message});console.error('FAIL '+name+': '+error.message);}};
const pageFor=async(id)=>{const page=await context.newPage();page.setDefaultTimeout(5000);page.on('pageerror',(e)=>report.pageErrors.push({id,message:e.message}));return page;};
const screenshot=(page,name)=>page.screenshot({path:resolve(output,name+'.png'),scale:'css'});
const fit=async(page)=>{const metrics=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth}));assert.ok(metrics.documentWidth<=metrics.width,'Page overflow: '+JSON.stringify(metrics));};
async function bridge(page,failInitially=false,data=chronicleFixture()){
  await page.addInitScript(({data,failed})=>{
    window.__qaFail=failed;window.__qaCalls=0;
    window.desktopAPI={ingest:()=>{window.__qaCalls++;if(window.__qaFail)throw Error('模拟读取失败，未读取真实日志');return Promise.resolve(data);},setWindowTheme:async()=>({ok:true}),onUpdateStatus:()=>()=>{},getRuntimeInfo:async()=>({version:'ui-preview',platform:'UI preview',arch:'x64',dataPath:'UI-Preview',logPath:'UI-Preview',zoom:1,packaged:false}),getDesktopPrefs:async()=>({autoStart:false,minimizeToTray:false,notifyOnIngest:false}),getUpdateStatus:async()=>({state:'unavailable'}),getSkippedUpdate:async()=>({skippedVersion:null}),scanSources:async()=>({ok:true,scannedAt:'ui-preview',sources:[]}),setZoom:async()=>({ok:true,zoom:1}),reportError:async()=>({ok:true}),openPath:async()=>({ok:false,message:'UI 验证不打开真实文件'})};
  },{data,failed:failInitially});
}
try{
  await serveBuild(args.chronicle,5191);await serveBuild(args.disk,5192);
  fixtures=await startSoftwareFixtures({token:args.token,jacquard:args.jacquard,checkin:args.checkin},{token:5193,jacquard:5194,checkin:5195});
  browser=await chromium.launch({executablePath:executable,headless:true});
  context=await browser.newContext({viewport:{width:1440,height:900},timezoneId:'Asia/Shanghai'});
  const ai=await pageFor('chronicle');await bridge(ai);
  await test('AI 轨迹：来源筛选与返回恢复',async()=>{
    await ai.goto('http://127.0.0.1:5191/?theme=light',{waitUntil:'domcontentloaded'});
    await ai.locator('.primary-nav').getByRole('button',{name:/会话档案/}).click();
    const source=ai.getByRole('button',{name:/Codex · 1/});await source.click();assert.equal(await source.getAttribute('aria-pressed'),'true');assert.equal(await ai.locator('.history-day-card').count(),1);
    await ai.locator('.primary-nav').getByRole('button',{name:/项目集/}).click();await ai.locator('.primary-nav').getByRole('button',{name:/会话档案/}).click();assert.equal(await source.getAttribute('aria-pressed'),'true');
    await screenshot(ai,'chronicle-history');await fit(ai);
  });
  await test('AI 轨迹：命令无结果、会话定位和清除筛选',async()=>{
    await ai.keyboard.press('Control+k');await ai.getByRole('combobox').fill('no-matching-command');await ai.getByText('没有匹配的结果',{exact:true}).waitFor();
    await ai.getByRole('combobox').fill('统一软件 UI');await ai.getByRole('option').filter({hasText:'统一软件 UI 规范'}).click();assert.match(await ai.locator('.global-search input').inputValue(),/统一软件 UI/);
    await ai.locator('.global-search input').fill('no-matching-session');await ai.getByRole('button',{name:'清除筛选与搜索'}).click();assert.equal(await ai.locator('.global-search input').inputValue(),'');
  });
  await test('AI 轨迹：失败保留与同步失败可重试',async()=>{
    await ai.locator('.primary-nav').getByRole('button',{name:/今日工作台/}).click();await ai.evaluate(()=>{window.__qaFail=true;});await ai.getByRole('button',{name:'重新采集',exact:true}).click();await ai.getByText('本次采集未完成',{exact:true}).first().waitFor();assert.ok(await ai.locator('.summary-cell').count()>0);await screenshot(ai,'chronicle-error');
    await ai.evaluate(()=>{window.__qaFail=false;});await ai.getByRole('button',{name:'重试采集'}).click();await ai.locator('.data-state-banner').waitFor({state:'detached'});
  });
  await test('AI 轨迹：首次采集失败在档案页可恢复',async()=>{
    const initial=await pageFor('chronicle-initial');await bridge(initial,true);await initial.goto('http://127.0.0.1:5191/?view=history&theme=dark',{waitUntil:'domcontentloaded'});await initial.getByRole('button',{name:'重试采集'}).waitFor();await initial.evaluate(()=>{window.__qaFail=false;});await initial.getByRole('button',{name:'重试采集'}).click();await initial.locator('.data-state-banner').waitFor({state:'detached'});await screenshot(initial,'chronicle-dark');await initial.close();
  });
  await test('AI 轨迹：分析图表精确明细可键盘阅读',async()=>{
    await ai.locator('.primary-nav').getByRole('button',{name:/分析/}).click();const summary=ai.locator('.chart-data-details summary');await summary.focus();await ai.keyboard.press('Enter');await ai.getByRole('region',{name:'每日节奏明细'}).waitFor();assert.ok(await ai.locator('.chart-data-table tbody tr').count()>=7);await screenshot(ai,'chronicle-insights-table');await summary.focus();await ai.keyboard.press('Enter');await ai.getByRole('region',{name:'每日节奏明细'}).waitFor({state:'hidden'});
  });
  await test('AI 轨迹：成果软件筛选、返回与清除',async()=>{
    await ai.locator('.primary-nav').getByRole('button',{name:/成果集/}).click();await ai.getByRole('combobox',{name:'筛选软件'}).selectOption('Codex');assert.ok(await ai.locator('.artifact-row').count()>0);await ai.locator('.primary-nav').getByRole('button',{name:/项目集/}).click();await ai.locator('.primary-nav').getByRole('button',{name:/成果集/}).click();assert.equal(await ai.getByRole('combobox',{name:'筛选软件'}).inputValue(),'Codex');await ai.locator('.global-search input').fill('no-artifact-match');await ai.getByRole('button',{name:'清除筛选与搜索'}).click();assert.equal(await ai.getByRole('combobox',{name:'筛选软件'}).inputValue(),'all');await ai.locator('.artifact-row').first().waitFor();
  });
  await test('AI 轨迹：未知日期会话不丢失、不伪造日期',async()=>{
    const sample=chronicleFixture();sample.sessions[0].start=null;sample.sessions[0].end=null;const unknown=await pageFor('chronicle-unknown');await bridge(unknown,false,sample);await unknown.goto('http://127.0.0.1:5191/?view=history&theme=light',{waitUntil:'domcontentloaded'});await unknown.getByRole('button',{name:/日期未知/}).click();await unknown.locator('.session-row').filter({hasText:'统一软件 UI 规范'}).waitFor();await screenshot(unknown,'chronicle-unknown-date');await unknown.close();
  });
  const token=await pageFor('token');
  await test('Token：未知价格、合法零价格与套餐不混淆',async()=>{
    await token.goto('http://127.0.0.1:5193/',{waitUntil:'domcontentloaded'});await token.locator('#kCost').filter({hasText:'未定价'}).waitFor();await screenshot(token,'token-unpriced');
    fixtures.token.summary.matrix[0].unpriced=0;fixtures.token.summary.matrix[0].priced=2;fixtures.token.summary.kpi_all.unpriced_tokens=0;await token.reload({waitUntil:'domcontentloaded'});await token.locator('#kCost').filter({hasText:'¥0.00'}).waitFor();
    fixtures.token.summary.kpi_all.plan_models=['unknown-preview'];fixtures.token.summary.kpi_all.plan_tokens=150000;await token.reload({waitUntil:'domcontentloaded'});await token.locator('#kCost').filter({hasText:'套餐'}).waitFor();
  });
  await test('Token：键盘范围、筛选恢复与清除',async()=>{
    await token.locator('.dd-btn').first().focus();await token.keyboard.press('ArrowDown');await token.keyboard.press('End');await token.keyboard.press('Enter');await token.locator('#ddRangeVal').filter({hasText:'全部'}).waitFor();await token.reload({waitUntil:'domcontentloaded'});await token.locator('#ddRangeVal').filter({hasText:'全部'}).waitFor();await token.locator('#clearFilters').click();await token.locator('#ddRangeVal').filter({hasText:'近 7 天'}).waitFor();await fit(token);
  });
  await test('Token：HTTP 失败保留统计并恢复',async()=>{
    fixtures.token.fail=true;await token.locator('#settingsBtn').click();await token.locator('#setNav [data-cat=data]').click();await token.locator('#reload').click();await token.locator('#collectionStateTitle').filter({hasText:/未完成|失败/}).waitFor();await token.locator('#setBack').click();assert.equal(await token.locator('#kTok').innerText(),'150,000');await screenshot(token,'token-error');fixtures.token.fail=false;await token.locator('#collectionRetry').click();await token.locator('#collectionState').waitFor({state:'hidden'});
  });
  await test('Token：运行时减少动态效果关闭图表动画',async()=>{
    await token.emulateMedia({reducedMotion:'reduce'});await token.waitForFunction(()=>Object.values(Chart.instances).every((chart)=>chart.options.animation===false));await screenshot(token,'token-reduced-motion');await token.emulateMedia({reducedMotion:'no-preference'});
  });
  const checkin=await pageFor('checkin');
  await test('学习通：监听失败不假成功、服务断开和恢复',async()=>{
    await checkin.goto('http://127.0.0.1:5195/',{waitUntil:'domcontentloaded'});await checkin.locator('.nav-item[data-view=courses]').click();fixtures.checkin.rejectListen=true;await checkin.locator('#listenToggleBtn').click();await checkin.locator('#listenState').filter({hasText:'未能改变监听状态'}).waitFor();assert.match(await checkin.locator('#listenToggleBtn').innerText(),/停止监听/);fixtures.checkin.rejectListen=false;await checkin.locator('#listenToggleBtn').click();await checkin.locator('#listenToggleBtn').filter({hasText:'开启监听'}).waitFor();
    fixtures.checkin.fail=true;await checkin.locator('#serviceNoticeTitle').filter({hasText:'无法连接本地服务'}).waitFor({timeout:8000});assert.ok(await checkin.locator('#listenToggleBtn').isDisabled());await screenshot(checkin,'checkin-offline');fixtures.checkin.fail=false;await checkin.locator('#serviceRetry').click();await checkin.locator('#serviceNotice').waitFor({state:'hidden'});
  });
  await test('学习通：二维码弹窗焦点与账号空态',async()=>{
    await checkin.locator('#btnQrModal').click();await checkin.getByRole('dialog').waitFor();await checkin.keyboard.press('Escape');await checkin.getByRole('dialog').waitFor({state:'hidden'});await checkin.waitForFunction(()=>document.activeElement===document.getElementById('btnQrModal'));
    fixtures.checkin.status.accounts=[];await checkin.reload({waitUntil:'domcontentloaded'});await checkin.locator('#serviceNoticeTitle').filter({hasText:'尚未配置学习通账号'}).waitFor();assert.equal(await checkin.locator('#chipCookie').innerText(),'未配置账号');assert.ok(await checkin.locator('#listenToggleBtn').isDisabled());assert.ok(await checkin.locator('#scanNowBtn').isDisabled());assert.match(await checkin.locator('#coursesBody').innerText(),/未配置账号/);await screenshot(checkin,'checkin-no-account');
  });
  const jacquard=await pageFor('jacquard');
  await test('织流：列表读取失败保留内容，重试恢复',async()=>{
    await jacquard.goto('http://127.0.0.1:5194/#/pipelines',{waitUntil:'domcontentloaded'});await jacquard.getByRole('link',{name:/设计验证流程/}).waitFor();fixtures.jacquard.failPaths.add('/api/skills');await jacquard.getByRole('link',{name:'技能库',exact:true}).click();await jacquard.locator('#workspaceStateTitle').filter({hasText:'页面内容未能完整读取'}).waitFor();assert.equal(await jacquard.getByRole('link',{name:/设计验证流程/}).count(),1);await screenshot(jacquard,'jacquard-error');fixtures.jacquard.failPaths.clear();await jacquard.locator('#workspaceRetry').click();await jacquard.locator('#workspaceState').waitFor({state:'hidden'});await jacquard.getByRole('button',{name:/ui-preview-skill/}).first().waitFor();
  });
  await test('织流：技能详情可键盘打开，Esc 后恢复焦点',async()=>{
    const item=jacquard.getByRole('button',{name:/ui-preview-skill/}).first();await item.focus();await jacquard.keyboard.press('Enter');await jacquard.getByRole('dialog').waitFor();await screenshot(jacquard,'jacquard-dialog');await jacquard.keyboard.press('Escape');await jacquard.getByRole('dialog').waitFor({state:'detached'});await jacquard.waitForFunction(()=>document.activeElement?.classList.contains('pl-row-main'));assert.ok(await item.evaluate((x)=>x===document.activeElement));await fit(jacquard);
  });
  const disk=await pageFor('disk');const diskState={queryFail:false,status:'completed'};const now=Date.now();
  const files=Array.from({length:8},(_,i)=>({id:i+1,path:'Q:/UI-Preview/'+('长目录/'.repeat(i===0?20:1))+'cache-'+i+'.bin',size:(i+1)*1048576,mtime:Math.floor(now/1000),ctime:null,ext:'.bin',magic:null,category:'cache',is_locked:i===7?1:0,is_dir:0,purpose:'UI 模拟文件，不访问真实文件',owner:'UI Preview',recommendation:i===7?'system':'recommend',risk:i===7?'high':'low'}));
  await disk.route('http://127.0.0.1:18650/**',async(route)=>{
    const path=new URL(route.request().url()).pathname,payload=JSON.parse(route.request().postData()||'{}');let result={items:[],ok:false,message:'UI fixture'},code=200;
    if(path==='/api/drives')result={items:[{drive:'Q:',label:'UI Preview',total:1e10,free:5e9}]};
    else if(path==='/api/scan/recent')result={exists:true,scan_id:'ui-preview',status:diskState.status};
    else if(path.startsWith('/api/scan/status'))result={scan_id:'ui-preview',drive:'Q:',status:diskState.status,files_count:8,dirs_seen:2,bytes_scanned:37e6,errors:0,current_path:'Q:/UI-Preview',start_ms:now-30000,end_ms:now,elapsed_ms:30000,message:''};
    else if(path.startsWith('/api/files/statistics'))result={total_files:8,total_bytes:37e6,categories:{cache:{count:7,bytes:30e6}},recommendations:{recommend:{count:7,bytes:30e6}}};
    else if(path==='/api/files/query'){if(diskState.queryFail){result={detail:'模拟读取失败'};code=503;}else result={items:payload.needs_ai?[]:files,total:payload.needs_ai?0:8,page:0,page_size:500};}
    else if(path==='/api/files/select-all')result={paths:files.filter((f)=>!f.is_locked).map((f)=>f.path),count:7};
    else if(path==='/api/delete/'){report.mockDeletes++;result={ok:files.slice(0,2).map((f)=>({path:f.path,size:f.size})),failed:files.slice(2,7).map((f)=>({path:f.path,error:'模拟文件被占用'})),freed_bytes:3*1048576};}
    else if(path==='/api/cache/overview')result={candidates:[],items:[],count:0,total_bytes:0,groups:[]};
    else if(path==='/api/config')result={app:'UI Preview',large_file_mb:100,page_size:500};
    await route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(result)});
  });
  await test('磁盘：完整预览、安全焦点、Esc 不删除',async()=>{
    await disk.goto('http://127.0.0.1:5192/?backend=18650',{waitUntil:'domcontentloaded'});await disk.locator('.rail-item[title="清理"]').click();await disk.getByRole('tab',{name:/文件/}).click();await disk.getByRole('table',{name:'扫描文件明细'}).waitFor();
    // Selection is acknowledged by the API; wait for the visible result, not an optimistic checkbox state.
    const selectAll=disk.getByRole('checkbox',{name:/全选当前筛选/});await selectAll.click();await disk.getByRole('button',{name:'移到回收站 (7)',exact:true}).waitFor();assert.ok(await selectAll.isChecked());
    await selectAll.click();await disk.getByRole('button',{name:'移到回收站 (0)',exact:true}).waitFor();assert.ok(!await selectAll.isChecked());
    await selectAll.click();await disk.getByRole('button',{name:'移到回收站 (7)',exact:true}).click();await disk.getByRole('alertdialog').waitFor();assert.equal(await disk.evaluate(()=>document.activeElement.textContent),'取消');await disk.getByRole('button',{name:/继续查看路径/}).click();assert.equal(await disk.locator('.mf-path').count(),7);await screenshot(disk,'disk-preview');await disk.keyboard.press('Escape');await disk.getByRole('alertdialog').waitFor({state:'detached'});assert.equal(report.mockDeletes,0);assert.ok(await disk.getByRole('button',{name:'移到回收站 (7)',exact:true}).evaluate((x)=>x===document.activeElement));
  });
  await test('磁盘：模拟部分成功报告和焦点',async()=>{
    await disk.getByRole('button',{name:'移到回收站 (7)',exact:true}).click();await disk.getByRole('alertdialog').getByRole('button',{name:'移到回收站 (7)',exact:true}).click();await disk.getByRole('heading',{name:'部分清理完成'}).waitFor();await disk.getByRole('button',{name:'关闭报告',exact:true}).waitFor();await disk.waitForFunction(()=>document.activeElement?.textContent==='关闭报告');assert.equal(report.mockDeletes,1);assert.equal(await disk.locator('.rf-row').count(),5);await screenshot(disk,'disk-partial');await disk.getByRole('button',{name:'关闭报告',exact:true}).click();
  });
  await test('磁盘：列表读取失败可重试；密集行保持 44px',async()=>{
    diskState.queryFail=true;await disk.getByRole('button',{name:'刷新',exact:true}).click();await disk.getByRole('button',{name:'重试读取'}).waitFor();diskState.queryFail=false;await disk.getByRole('button',{name:'重试读取'}).click();await disk.getByRole('button',{name:'重试读取'}).waitFor({state:'detached'});assert.equal(Math.round((await disk.locator('.file-row').first().boundingBox()).height),44);await fit(disk);await screenshot(disk,'disk-table');
  });
  await test('磁盘：未知进度不伪造百分比，取消确认可安全退出',async()=>{
    diskState.status='running';const progress=disk.getByRole('progressbar',{name:'磁盘扫描'});await progress.waitFor();assert.equal(await progress.getAttribute('aria-valuenow'),null);assert.match(await progress.getAttribute('aria-valuetext'),/暂时无法计算进度/);await disk.getByRole('button',{name:'取消扫描',exact:true}).click();await disk.getByRole('alertdialog',{name:'取消当前扫描？'}).waitFor();await disk.keyboard.press('Escape');await disk.getByRole('alertdialog').waitFor({state:'detached'});assert.equal(report.mockDeletes,1);diskState.status='completed';await progress.waitFor({state:'detached'});
  });
  await test('小窗口：五款软件核心页面无整页横向溢出',async()=>{
    for(const [page,id] of [[ai,'chronicle'],[token,'token'],[disk,'disk'],[checkin,'checkin'],[jacquard,'jacquard']]){await page.setViewportSize({width:1024,height:768});await fit(page);await screenshot(page,id+'-compact');}
    await checkin.setViewportSize({width:390,height:844});await fit(checkin);
    const mobileNav=await checkin.locator('#nav .nav-item').evaluateAll((items)=>items.map((item)=>{const box=item.getBoundingClientRect();return {left:box.left,right:box.right,width:box.width};}));assert.equal(mobileNav.length,6);assert.ok(mobileNav.every((box)=>box.left>=-1&&box.right<=391),'All six mobile nav entries must remain visible');assert.ok(await checkin.getByRole('button',{name:'打开二维码上传与签到'}).isVisible());await screenshot(checkin,'checkin-mobile');
  });
  report.fixtureRequests=fixtures.requests;
  assert.equal(report.pageErrors.length,0,'Uncaught page errors');
} finally {
  if(context)await context.close();if(browser)await browser.close();if(fixtures)await fixtures.close();
  for(const server of servers)await new Promise((done)=>server.close(done));
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2),'utf8');
}
console.log(JSON.stringify({passed:report.checks.filter((x)=>x.status==='passed').length,failed:report.checks.filter((x)=>x.status==='failed').length,pageErrors:report.pageErrors.length,mockDeletes:report.mockDeletes}));
if(report.checks.some((x)=>x.status==='failed')||report.pageErrors.length)process.exitCode=1;
