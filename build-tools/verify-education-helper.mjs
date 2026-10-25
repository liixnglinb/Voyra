import {chromium} from 'playwright-core';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {seedSchedulePreview} from './schedule-dialog-fixtures.mjs';
const dist=resolve(process.argv[2]||'dist'),csp=(await readFile(resolve(dist,'_headers'),'utf8')).match(/Content-Security-Policy:\s*(.+)/)[1];
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path.endsWith('/'))path+='index.html';const file=resolve(dist,'.'+path);if(!file.startsWith(dist+sep))throw Error('invalid path');const data=await readFile(file);res.writeHead(200,{'content-type':({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream','content-security-policy':csp,'cross-origin-opener-policy':'same-origin'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=process.env.EDUCATION_ORIGIN||`http://127.0.0.1:${server.address().port}`,out=resolve(process.env.EDUCATION_OUTPUT||'output/playwright/education-auto');await mkdir(out,{recursive:true});
const helper=await readFile('public/jsxsd-import.user.js','utf8'),browser=await chromium.launch({channel:'chrome',headless:true});
const report={origin,flows:[],layouts:[],pageErrors:[],schoolRequests:[]};
const school='http://10.1.1.149',vpn='http://vpn.huhst.edu.cn:9900';
const table=(week,full=false)=>`<table><tr><th>时段</th><th>节次</th>${['一','二','三','四','五','六','日'].map(d=>'<th>星期'+d+'</th>').join('')}</tr><tr><td>上午</td><td>1-2</td><td>${week===3?'':`数学分析<br><font title="老师">王老师</font><br><font title="教室">致远-120</font>${full?'<br>1-2,4(周)':''}`}</td>${'<td></td>'.repeat(6)}</tr><tr><td>上午</td><td>3-4</td><td></td><td>英语<br>教师：刘老师<br>教室：播馨-304${full?'<br>2-4周':''}</td>${'<td></td>'.repeat(5)}</tr></table>`;
const timetable=(week=1,full=false,total=4)=>`<!doctype html><meta charset="utf-8"><h1>学生个人课表</h1><form method="post" action="xskb_list.do"><input type="hidden" name="csrf" value="retained-school-csrf"><select name="xnxq01id"><option value="2026-2027-1">2026-2027 第一学期</option></select>${full?'':`<select name="zc">${Array.from({length:total},(_,i)=>i+1).map(w=>`<option value="${w}" ${week===w?'selected':''}>第 ${w} 周（10月）</option>`).join('')}</select>`}</form>${table(week,full)}`;
const login=`<!doctype html><meta charset="utf-8"><h1>湖南人文科技学院教务登录</h1><input aria-label="学校账号"><input aria-label="学校密码" type="password"><a href="/jsxsd/framework/xsMain.htmlx">模拟完成学校登录</a>`;
async function make({viewport={width:390,height:844},installed=true,network='campus',failWeek=0,full=false,frame=false,mismatchWeek=0,autoSave=false,menu=false,weeks=4,holdWeek=0}={}){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'});
 await context.addInitScript(origin=>{if(location.origin!==origin)return;window.__eduBeforeSeed=Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]));},origin);
 await seedSchedulePreview(context,origin);
 await context.addInitScript(origin=>{if(location.origin!==origin)return;if(window.__eduBeforeSeed?.['ClassScheduleData_schedule-ui-preview'])for(const [k,v]of Object.entries(window.__eduBeforeSeed))localStorage.setItem(k,v);},origin);
 let job=null,schoolPage=null,failures=0,releaseWeek;const opened=[],requests=[];let queue=Promise.resolve();
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin===origin)return route.continue();
  if([school,vpn].includes(url.origin)){
   let body=url.pathname.includes('xskb_list')?timetable(1,full,weeks):url.pathname.includes('xsMain')?(frame?'<h1>学生首页</h1><iframe src="'+(frame==='cross'?vpn:'')+'/jsxsd/xskb/xskb_list.htmlx"></iframe>':menu?'<h1>学生首页</h1><div data-url="/jsxsd/xskb/xskb_list.htmlx">我的课表</div>':'<h1>学生首页</h1><a href="/jsxsd/xskb/xskb_list.do">我的课表</a>'):login;
   return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body});
  }
  return route.abort('blockedbyclient');
 });
 await context.exposeBinding('__eduMockSet',({frame},value)=>{
  job=value;queue=queue.then(async()=>{for(const p of context.pages())for(const f of p.frames())if(f!==frame&&!p.isClosed())try{await f.evaluate(value=>window.__applyGM?.(value),value);}catch{/* Navigation can replace a frame. */}});return queue;
 });
 await context.exposeBinding('__eduMockOpen',async(_source,url)=>{
  opened.push(url);const p=await context.newPage();if(new URL(url).origin!==origin)schoolPage=p;await p.goto(url,{waitUntil:'domcontentloaded'});
 });
 await context.exposeBinding('__eduMockRequest',async(_source,opts)=>{
  requests.push({url:opts.url,body:opts.data});report.schoolRequests.push({url:opts.url,body:opts.data});
  if(opts.url.endsWith('/jsxsd/')){if(network==='vpn')return {error:'network unreachable'};return {status:200,text:login,url:opts.url};}
  const week=Number(new URLSearchParams(opts.data||new URL(opts.url).search).get('zc'));
  assert.equal(new URLSearchParams(opts.data).get('csrf'),'retained-school-csrf');assert.equal(new URLSearchParams(opts.data).get('xnxq01id'),'2026-2027-1');
  if(week===holdWeek)await new Promise(resolve=>{releaseWeek=resolve;});
  if(week===failWeek&&failures++===0)return {status:200,text:'<h1>网关暂不可用</h1>',url:opts.url};
  return {status:200,text:timetable(week===mismatchWeek?1:week,false,weeks),url:opts.url};
 });
 const injectionErrors=[];
 function wire(page){
  page.on('pageerror',error=>report.pageErrors.push(error.message));
  const inject=async frame=>{
   try{if(await frame.evaluate(()=>Boolean(window.__eduInjected)))return;await frame.evaluate(({job})=>{
    window.__eduInjected=true;
    window.__mockJob=job;const listeners=[];
    window.GM_getValue=()=>window.__mockJob;
    window.__applyGM=value=>{const old=window.__mockJob;window.__mockJob=value;for(const fn of listeners)fn('job',old,value,true);};
    window.GM_setValue=(_key,value)=>{window.__mockJob=value;window.__eduMockSet(value);};
    window.GM_addValueChangeListener=(_key,fn)=>listeners.push(fn);
    window.GM_openInTab=url=>window.__eduMockOpen(url);
    window.GM_xmlhttpRequest=options=>{let aborted=false;window.__eduMockRequest({url:options.url,data:options.data}).then(r=>{if(aborted)return;if(r.error)options.onerror();else options.onload({status:r.status,responseText:r.text,finalUrl:r.url});});return {abort(){aborted=true;options.onabort?.();}};};
   },{job});await frame.evaluate(helper);}catch(error){if(!/destroyed|detached|navigation/i.test(error.message))injectionErrors.push(error.message);}
  };
  if(installed){page.on('domcontentloaded',()=>inject(page.mainFrame()));page.on('framenavigated',frame=>{if(frame!==page.mainFrame())frame.waitForLoadState('domcontentloaded').then(()=>inject(frame)).catch(()=>{});});}
 }
 context.on('page',wire);
 const page=await context.newPage();await page.goto((process.env.EDUCATION_ENTRY||origin+'/')+'#/timetable?tab=courses',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'功能',exact:true}).click();await page.getByRole('menuitem').filter({hasText:'导入课表'}).click();
 if(installed){await page.getByText('助手已连接',{exact:true}).waitFor();if(!autoSave)await page.getByRole('checkbox',{name:'读取完成后自动保存到当前账号'}).uncheck();}
 return {context,page,opened,requests,getJob:()=>job,getSchool:()=>schoolPage,release:()=>releaseWeek?.(),injectionErrors};
}
async function until(fn){for(let i=0;i<100;i++){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out waiting for helper state');}
async function layout(page,name){
 const box=await page.locator('.cs-dialog').evaluate(el=>{const r=el.getBoundingClientRect(),b=el.querySelector('.mbox-body'),x=el.querySelector('.mbox-x').getBoundingClientRect();return {width:innerWidth,height:innerHeight,left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:b.scrollWidth-b.clientWidth,closeRightGap:r.right-x.right};});
 assert.ok(box.left>=7&&box.right<=box.width-7&&box.top>=7&&box.bottom<=box.height-7,JSON.stringify(box));assert.ok(box.overflow<=1);assert.ok(box.closeRightGap>=8&&box.closeRightGap<=24);report.layouts.push({name,...box});await page.screenshot({path:resolve(out,name+'.png')});
}
try{
 for(const viewport of[{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1440,height:1000}]){
  const test=await make({viewport,installed:false});await test.page.getByText('首次设置',{exact:true}).waitFor();await test.page.getByRole('button',{name:'安装 / 更新导入助手',exact:true}).click();assert.equal(test.context.pages().length,1);assert.equal(await test.page.locator('.cs-edu-install-help a[download]').getAttribute('href'),'/jsxsd-import.user.js?v=3.0.0');assert.equal(await test.page.getByRole('button',{name:'打开助手安装确认'}).isDisabled(),true);await test.page.getByRole('checkbox',{name:'我已安装并启用脚本管理器'}).check();assert.equal(await test.page.getByRole('button',{name:'打开助手安装确认'}).isEnabled(),true);await layout(test.page,viewport.width+'-install');assert.equal(test.opened.length,0);await test.page.getByRole('button',{name:'无法安装助手？使用手动导入'}).click();await test.page.getByRole('radio',{name:/校外网络/}).check();assert.equal(await test.page.getByRole('link',{name:'打开教务系统',exact:true}).getAttribute('href'),vpn+'/');await test.context.close();
 }
 report.flows.push('Uninstalled helper shows honest setup and mobile fallback; no automatic tab or fake detection');
 const main=await make({failWeek:3});await main.page.getByRole('button',{name:'自动选择入口并开始'}).click();await until(()=>main.getSchool());
 const campus=main.getSchool();await campus.getByRole('link',{name:'模拟完成学校登录'}).waitFor();await campus.getByLabel('学校密码').fill('not-a-real-password');
 await campus.waitForTimeout(6200);assert.equal(main.opened.length,1);assert.equal(main.getJob().network,'campus');assert.ok(!JSON.stringify(main.getJob()).includes('not-a-real-password'));
 await campus.screenshot({path:resolve(out,'390-school-login-overlay.png')});
 await campus.getByRole('link',{name:'模拟完成学校登录'}).click();await until(()=>main.getJob()?.status==='error');assert.match(main.getJob().message,/第 3 周/);assert.equal(main.getJob().code,undefined);
 const overlay=campus.locator('[data-voyra-helper]');await overlay.getByRole('button',{name:'重新检测',exact:true}).click();await until(()=>main.getJob()?.status==='ready');
 assert.deepEqual(main.requests.filter(r=>r.body).map(r=>Number(new URLSearchParams(r.body).get('zc'))),[1,2,3,3,4]);
 await campus.screenshot({path:resolve(out,'390-school-complete.png')});await until(async()=>await main.page.getByText('已识别 2 门课程',{exact:true}).isVisible());await layout(main.page,'390-auto-preview');
 const before=await main.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_schedule-ui-preview')));assert.equal(before.courses.length,2,'No account mutation before confirmation');
 await main.page.getByRole('button',{name:'导入 2 门课程',exact:true}).click();
 const saved=await main.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_schedule-ui-preview')));assert.equal(saved.courses.length,4);assert.equal(saved.courses.find(c=>c.name==='数学分析').teacher,'王老师');assert.equal(saved.courses.find(c=>c.name==='数学分析').room,'致远-120');assert.deepEqual(saved.courses.find(c=>c.name==='数学分析').periods.map(p=>[p.f,p.t]),[[1,2],[4,4]]);assert.equal(main.getJob().status,'saved');assert.ok(!main.getJob().code);assert.equal(saved.courses.find(c=>c.id==='preview-math').credit,'4');assert.deepEqual(main.injectionErrors,[]);
 report.flows.push('Intranet login waits without timeout redirects; failure on week 3 pauses without result, retry resumes 3–4, receiver confirms exact sparse weeks and keeps original courses');await main.context.close();
 const external=await make({network:'vpn',full:true});await external.page.getByRole('button',{name:'自动选择入口并开始'}).click();await until(()=>external.getSchool());assert.equal(external.opened[0],vpn+'/');const vp=external.getSchool();await vp.getByRole('link',{name:'模拟完成学校登录'}).click();await until(()=>external.getJob()?.status==='ready');assert.equal(external.requests.filter(r=>r.body).length,0,'Semester table does not make unnecessary weekly requests');
 await external.page.reload();await external.page.getByRole('button',{name:'功能',exact:true}).click();await external.page.getByRole('menuitem').filter({hasText:'导入课表'}).click();await external.page.getByText('已识别 2 门课程',{exact:true}).waitFor();
 assert.equal(await external.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_schedule-ui-preview')).courses.length),2);assert.deepEqual(external.injectionErrors,[]);report.flows.push('Failed private probe falls back to actual VPN root; complete semester table returns exact ranges and helper result survives app reload without saving automatically');await external.context.close();
 // A different account must never receive the prior account's pending import.
 const isolated=await make();await isolated.page.evaluate(()=>{localStorage.setItem('voyra.education.pending.v2',JSON.stringify({id:'b'.repeat(32),owner:'ClassScheduleData_someone-else',created:Date.now()}));location.hash='#/timetable?tab=courses&eduImport='+'b'.repeat(32);});await isolated.page.getByRole('alert').filter({hasText:'不属于当前账号'}).waitFor();assert.equal(await isolated.page.getByRole('button',{name:'导入 2 门课程',exact:true}).count(),0);report.flows.push('Returning task IDs are bound to the initiating account, unknown or stale tasks cannot populate preview');await isolated.context.close();
 const framed=await make({frame:true,mismatchWeek:2});await framed.page.getByRole('button',{name:'自动选择入口并开始'}).click();await until(()=>framed.getSchool());await framed.getSchool().getByRole('link',{name:'模拟完成学校登录'}).click();await until(()=>framed.getJob()?.status==='error');assert.match(framed.getJob().message,/未确认周次/);assert.equal(framed.getJob().code,undefined);assert.deepEqual(framed.requests.filter(r=>r.body).map(r=>Number(new URLSearchParams(r.body).get('zc'))),[1,2]);await framed.getSchool().locator('[data-voyra-helper]').getByRole('button',{name:'停止',exact:true}).click();await until(()=>framed.getJob()?.status==='cancelled');assert.equal(await framed.page.getByRole('button',{name:'导入 2 门课程',exact:true}).count(),0);report.flows.push('Same-origin embedded timetable is detected; mismatched week echo pauses at week 2 and stop cancels without generating or saving a result');await framed.context.close();
 const automatic=await make({autoSave:true,menu:true,weeks:20,holdWeek:10});
 assert.equal(await automatic.page.getByRole('checkbox',{name:'读取完成后自动保存到当前账号'}).isChecked(),true);
 await automatic.page.getByRole('button',{name:'自动选择入口并开始'}).click();await until(()=>automatic.getSchool());
 await automatic.getSchool().getByRole('link',{name:'模拟完成学校登录'}).click();await until(()=>automatic.getJob()?.progress?.week===10);
 assert.ok(automatic.getSchool().url().includes('/jsxsd/xskb/xskb_list.htmlx'));
 await until(async()=>await automatic.page.locator('.cs-edu-week-board>span').count()===20);
 await until(async()=>await automatic.page.locator('.cs-edu-week-board>[data-state=done]').count()===9);
 assert.equal(await automatic.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_schedule-ui-preview')).courses.length),2);
 await layout(automatic.page,'390-twenty-week-progress');automatic.release();await until(()=>automatic.getJob()?.status==='saved');
 await automatic.page.getByText('课表已自动保存',{exact:true}).waitFor();
 assert.deepEqual(automatic.requests.filter(r=>r.body).map(r=>Number(new URLSearchParams(r.body).get('zc'))),Array.from({length:20},(_,i)=>i+1));
 const autoSaved=await automatic.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_schedule-ui-preview')));
 assert.equal(autoSaved.courses.length,4);assert.equal(autoSaved.courses.find(c=>c.id==='preview-math').credit,'4');
 assert.deepEqual(autoSaved.courses.find(c=>c.name==='数学分析').periods.map(p=>[p.f,p.t]),[[1,2],[4,20]]);
 await until(()=>automatic.opened.filter(url=>new URL(url).origin===origin).length===1);await until(()=>automatic.context.pages().some(p=>p!==automatic.page&&p.url().startsWith(origin)));const returned=automatic.context.pages().find(p=>p!==automatic.page&&p.url().startsWith(origin));await returned.getByText('课表已自动保存',{exact:true}).waitFor();assert.equal(await returned.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_schedule-ui-preview')).courses.length),4);assert.deepEqual(automatic.injectionErrors,[]);
 report.flows.push('Actual xsMain.htmlx-style data-url menu opens personal timetable, all 20 dated weeks report progress, no partial save, complete result returns and saves automatically once');await automatic.context.close();
 const reload=await make({failWeek:3});await reload.page.getByRole('button',{name:'自动选择入口并开始'}).click();await until(()=>reload.getSchool());await reload.getSchool().getByRole('link',{name:'模拟完成学校登录'}).click();await until(()=>reload.getJob()?.status==='error');
 assert.equal(reload.getJob().checkpoint.entries.length,2);await reload.getSchool().reload();await until(()=>reload.getJob()?.status==='ready');
 assert.deepEqual(reload.requests.filter(r=>r.body).map(r=>Number(new URLSearchParams(r.body).get('zc'))),[1,2,3,3,4]);report.flows.push('Reloading the school page resumes persisted completed weeks and retries only unread weeks');await reload.context.close();
 const cross=await make({frame:'cross',autoSave:true});await cross.page.getByRole('button',{name:'自动选择入口并开始'}).click();await until(()=>cross.getSchool());await cross.getSchool().getByRole('link',{name:'模拟完成学校登录'}).click();await until(()=>cross.getJob()?.status==='saved');
 assert.deepEqual(cross.requests.filter(r=>r.body).map(r=>Number(new URLSearchParams(r.body).get('zc'))),[1,2,3,4]);assert.deepEqual(cross.injectionErrors,[]);report.flows.push('Matched cross-origin school frame executes the helper, shares one read lease and saves all weeks without duplicate queries');await cross.context.close();
 assert.deepEqual(report.pageErrors,[]);console.log(JSON.stringify({layouts:report.layouts.length,flows:report.flows,pageErrors:report.pageErrors}));
}finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));await browser.close();await new Promise(done=>server.close(done));}
