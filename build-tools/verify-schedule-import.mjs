import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {encodeScheduleShare} from '../src/lib/schedule-share.js';
const origin=process.env.SCHEDULE_IMPORT_ORIGIN||'http://127.0.0.1:8789';
const out=resolve('output/playwright/schedule-import-v2');await mkdir(out,{recursive:true});
const sender=[{id:'sender-owned-1',name:'概率论与数理统计',teacher:'龙老师',room:'致远-120',note:'分享的独立课程',periods:[{day:4,slot:'1-2',f:2,t:17,type:'odd'}]}];
const mine={id:'receiver-owned-existing',name:'接收者原有课程',teacher:'李老师',room:'A101',ownerField:{keep:true},periods:[{day:1,slot:'3-4',f:1,t:18,type:'every'}]};
const settings={startDate:'2026-09-07',overrideWeek:null,timeSlots:null};
const code=encodeScheduleShare(sender,settings),browser=await chromium.launch({channel:'chrome',headless:true});
const report={layouts:[],flows:[],errors:[],externalWrites:[]};let sharedId;
async function make(viewport,{uid='sender-ui',courses=sender,authed=true,cloudDelay=0,offline=false,ownSettings=settings}={}){
 const context=await browser.newContext({viewport,hasTouch:viewport.width<768,reducedMotion:'reduce',timezoneId:'Asia/Shanghai'});
 await context.addInitScript(({uid,courses,authed,settings,cloudDelay,offline})=>{
  if(authed)localStorage.setItem('voyra_session_v1',JSON.stringify({uid,username:uid,expiresAt:Date.now()+864e5}));
  localStorage.setItem('voyra-sched-guide-v1','1');
  localStorage.setItem(`ClassScheduleData_${uid}`,JSON.stringify({courses,settings}));
  localStorage.setItem('ClassScheduleData_other-person',JSON.stringify({courses:[{id:'private-other'}]}));
  window.__scheduleWrites=[];window.__testCloud={courses,settings};window.__testOffline=offline;
  const api={async loadData(){if(cloudDelay)await new Promise(resolve=>setTimeout(resolve,cloudDelay));if(window.__testOffline)throw Error('离线验证');return structuredClone(window.__testCloud);},
   async saveData(key,value){if(window.__testOffline)throw Error('离线验证');window.__scheduleWrites.push({key,uid:JSON.parse(localStorage.getItem('voyra_session_v1')||'null')?.uid,value:structuredClone(value)});window.__testCloud=structuredClone(value);return {ok:true};}};
  Object.defineProperty(window,'electronAPI',{configurable:true,get:()=>api,set:()=>{}});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{async read(){throw Error('permission denied');},async writeText(text){window.__copiedShare=text;}}});
 },{uid,courses,authed,settings:ownSettings,cloudDelay,offline});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===origin)return route.continue();
  if(url.hostname==='api.bmobcloud.com'){
   const value=/\/login/.test(url.pathname)?{objectId:uid,username:uid,sessionToken:'isolated-session',createdAt:'2026-10-23 00:00:00'}:
    request.method()==='GET'?{results:[]}:{objectId:'fake-meta',createdAt:'2026-10-23 00:00:00'};
   return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PUT,OPTIONS'},body:JSON.stringify(value)});
  }
  if(!['GET','HEAD'].includes(request.method()))report.externalWrites.push(url.origin+url.pathname);
  return route.abort('blockedbyclient');
 });
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
 page.on('console',msg=>{if(msg.type()==='error'&&/violates.*policy|content.security.policy/i.test(msg.text()))report.errors.push(msg.text());});
 return {context,page,uid};
}
async function go(page,path='/#/timetable?tab=courses'){await page.goto(origin+path,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'功能',exact:true}).waitFor();}
async function open(page,name){await page.getByRole('button',{name:'功能',exact:true}).click();await page.getByRole('menuitem').filter({hasText:name}).click();await page.locator('.cs-dialog').waitFor();}
async function layout(page,name,shot=false){
 const box=await page.locator('.cs-dialog').evaluate(el=>{
  const r=el.getBoundingClientRect(),x=el.querySelector('.mbox-x').getBoundingClientRect(),h=el.querySelector('.mbox-head').getBoundingClientRect(),body=el.querySelector('.mbox-body');
  return{width:innerWidth,height:innerHeight,left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:body.scrollWidth-body.clientWidth,closeRightGap:r.right-x.right,closeTop:x.top-h.top};
 });
 assert.ok(box.left>=7&&box.right<=box.width-7&&box.top>=7&&box.bottom<=box.height-7,`${name}: bounds ${JSON.stringify(box)}`);
 assert.ok(box.overflow<=1,`${name}: horizontal content overflow`);assert.ok(box.closeRightGap>=8&&box.closeRightGap<=24,`${name}: close button must stay at right edge`);
 report.layouts.push({name,...box});if(shot)await page.screenshot({path:resolve(out,`${box.width}-${name}.png`)});
}
try{
 for(const viewport of[{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:844,height:390},{width:1440,height:1000}]){
  const{context,page}=await make(viewport);await go(page);
  await page.getByRole('button',{name:'功能',exact:true}).click();const menu=await page.getByRole('menu',{name:'本页功能'}).boundingBox();
  if(viewport.width<768)assert.ok(menu.width<=231,'Mobile function menu is compact');
  if(viewport.width===390)await page.screenshot({path:resolve(out,'390-compact-menu.png')});
  await page.getByRole('menuitem').filter({hasText:'本周课程明细'}).click();await layout(page,'detail-close',true);await page.locator('.mbox-x').click();
  await open(page,'导入课表');await layout(page,'edu-school',true);
  assert.equal(await page.getByRole('link',{name:'打开教务系统',exact:true}).getAttribute('href'),'http://10.1.1.149/jsxsd/');
  await page.getByRole('radio',{name:/校外网络/}).check();
  assert.equal(await page.getByRole('link',{name:'打开教务系统',exact:true}).getAttribute('href'),'http://vpn.huhst.edu.cn:9900/');
  await page.getByRole('button',{name:'已经复制好课表，直接粘贴',exact:true}).click();await layout(page,'edu-paste',true);
  await page.getByRole('button',{name:'读取剪贴板并识别',exact:true}).click();await page.getByRole('alert').waitFor();assert.ok((await page.getByRole('alert').innerText()).includes('长按粘贴'));
  await page.locator('.cs-modes').getByRole('button',{name:'分享链接',exact:true}).click();await layout(page,'share-empty',true);
  assert.equal(await page.getByText('口令文本',{exact:false}).count(),0);assert.equal(await page.locator('textarea[readonly]').count(),0);
  await context.close();console.log(`${viewport.width}×${viewport.height}: compact menu, aligned close, guided education and share tab fit`);
 }
 const send=await make({width:390,height:844});let posts=0;
 send.page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/share')posts++;});
 await go(send.page);await open(send.page,'导入课表');await send.page.locator('.cs-modes').getByRole('button',{name:'分享链接',exact:true}).click();
 await send.page.waitForTimeout(250);assert.equal(posts,0,'Opening the sharing tab must not generate a link');
 await send.page.getByRole('button',{name:'生成分享链接',exact:true}).click();await send.page.getByRole('button',{name:'正在生成短链接…',exact:true}).waitFor();
 await send.page.getByLabel('分享短链接',{exact:true}).waitFor();const link=await send.page.getByLabel('分享短链接',{exact:true}).inputValue();sharedId=link.split('/').at(-1);
 assert.match(sharedId,/^[A-Za-z0-9]{7}$/);assert.equal(posts,1);await layout(send.page,'short-link-only',true);
 await send.page.getByRole('button',{name:'重新生成分享链接',exact:true}).click();await send.page.waitForTimeout(200);assert.equal(posts,1,'Identical content reuses cached link');
 await send.page.getByRole('button',{name:'复制链接',exact:true}).click();assert.equal(await send.page.evaluate(()=>window.__copiedShare),link);
 report.flows.push('Explicit generation makes one real local-D1 POST, reused link is cached, only short URL is shown');await send.context.close();

 const receive=await make({width:390,height:844},{uid:'recipient-ui',courses:[mine],cloudDelay:500});await go(receive.page,`/s/${sharedId}`);
 await receive.page.getByRole('dialog',{name:'接收分享课表'}).waitFor();await receive.page.getByRole('button',{name:'下载并保存',exact:true}).waitFor({state:'visible'});await layout(receive.page,'receive-preview',true);
 await receive.page.getByRole('button',{name:'下载并保存',exact:true}).click();await receive.page.getByRole('dialog',{name:'已加入你的课表'}).waitFor();await layout(receive.page,'received-saved',true);
 const received=await receive.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_recipient-ui')));
 assert.equal(received.courses.length,2);assert.deepEqual(received.courses.find(c=>c.id===mine.id).ownerField,mine.ownerField);
 assert.ok(received.courses.some(c=>c.name===sender[0].name&&c.id!==sender[0].id));
  await receive.page.waitForFunction(()=>window.__testCloud.courses.length===2);
 assert.equal(await receive.page.evaluate(()=>window.__scheduleWrites.every(w=>w.uid==='recipient-ui')),true);
 assert.equal(await receive.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_other-person')).courses[0].id),'private-other');
 await receive.page.getByRole('button',{name:'查看我的课表',exact:true}).click();await go(receive.page,`/s/${sharedId}`);await receive.page.getByRole('button',{name:'下载并保存',exact:true}).click();await receive.page.getByRole('dialog',{name:'已加入你的课表'}).waitFor();
 assert.equal(await receive.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_recipient-ui')).courses.length),2);
 report.flows.push('Short-link recipient gets a new owned copy, retains existing/other-account data, and a second download is idempotent');await receive.context.close();

 const guest=await make({width:390,height:844},{uid:'login-recipient',courses:[mine],authed:false});await go(guest.page,`/s/${sharedId}`);await guest.page.getByRole('button',{name:'下载并保存',exact:true}).click();
 await guest.page.getByRole('form',{name:'登录',exact:true}).waitFor();await guest.page.locator('#agm-user').fill('login-recipient');await guest.page.locator('#agm-pass').fill('isolated-password');await guest.page.getByRole('form',{name:'登录',exact:true}).getByRole('button',{name:'登录',exact:true}).click();
 await guest.page.getByRole('dialog',{name:'已加入你的课表'}).waitFor({timeout:15000});assert.equal(await guest.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_login-recipient')).courses.length),2);
 await layout(guest.page,'login-then-auto-save',true);report.flows.push('Guest download opens login and automatically resumes saving to the signed-in recipient after mocked login');await guest.context.close();

 const cancelled=await make({width:390,height:844},{uid:'cancelled-recipient',courses:[mine],authed:false});await go(cancelled.page,`/s/${sharedId}`);await cancelled.page.getByRole('button',{name:'下载并保存',exact:true}).click();
 await cancelled.page.getByRole('form',{name:'登录',exact:true}).getByRole('button',{name:'关闭',exact:true}).click();await cancelled.page.getByRole('button',{name:'稍后再说',exact:true}).click();
 await cancelled.page.locator('.ag-fab-login').click();await cancelled.page.locator('#agm-user').fill('cancelled-recipient');await cancelled.page.locator('#agm-pass').fill('isolated-password');await cancelled.page.getByRole('form',{name:'登录',exact:true}).getByRole('button',{name:'登录',exact:true}).click();
 await cancelled.page.locator('.ag-avatar').waitFor();assert.equal(await cancelled.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_cancelled-recipient')).courses.length),1);
 report.flows.push('Cancelling the download before login prevents a later unrelated login from importing it');await cancelled.context.close();

 const offline=await make({width:390,height:844},{uid:'offline-recipient',courses:[mine],offline:true});await go(offline.page,`/s/${sharedId}`);await offline.page.getByRole('button',{name:'下载并保存',exact:true}).click();await offline.page.getByRole('dialog',{name:'已加入你的课表'}).waitFor();
 assert.equal(await offline.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_offline-recipient')).courses.length),2);
 await offline.page.evaluate(()=>{window.__testOffline=false;});await offline.page.getByRole('button',{name:'重试云端同步',exact:true}).click();await offline.page.waitForFunction(()=>window.__testCloud.courses.length===2);
 report.flows.push('Offline recipient saves locally and later sync retry preserves both existing and received courses');await offline.context.close();

 const legacy=await make({width:390,height:844},{uid:'legacy-recipient',courses:[],ownSettings:{startDate:'',overrideWeek:null,timeSlots:null}});
 const legacyCode='VOYRA2:'+Buffer.from('旧版分享课程~~~~~~4,0,2,18,0,').toString('base64url');await go(legacy.page,'/#/timetable?share='+encodeURIComponent(legacyCode));
 await legacy.page.getByRole('button',{name:'下载并保存',exact:true}).click();await legacy.page.getByRole('button',{name:'查看我的课表',exact:true}).click();
 await legacy.page.getByRole('dialog',{name:'设置当前周次',exact:true}).waitFor();await legacy.page.getByRole('button',{name:'第 8 周',exact:true}).click();
 assert.ok(await legacy.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_legacy-recipient')).settings.startDate));
 report.flows.push('Legacy links without a semester date save first and then guide a first-time recipient to choose the current week');await legacy.context.close();

 const edu=await make({width:390,height:844},{uid:'edu-recipient',courses:[mine]});await go(edu.page);await open(edu.page,'导入课表');await edu.page.getByRole('button',{name:'已经复制好课表，直接粘贴',exact:true}).click();
 const text='节次\t周一\t周二\t周三\n1-2\t"概率论\n龙老师\n致远-120\n2-17周（单）"\t\t\n';await edu.page.getByLabel('粘贴教务课表',{exact:true}).fill(text);await edu.page.getByRole('button',{name:'识别粘贴内容',exact:true}).click();await layout(edu.page,'edu-review',true);
 assert.ok((await edu.page.locator('.cs-review').innerText()).includes('2-17周(单周)'));await edu.page.locator('.mbox-foot').getByRole('button',{name:'导入 1 门课程',exact:true}).click();
 const eduSaved=await edu.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_edu-recipient')));assert.equal(eduSaved.courses.length,2);assert.equal(eduSaved.courses[1].teacher,'龙老师');assert.equal(eduSaved.courses[1].periods[0].type,'odd');assert.equal(eduSaved.courses[1].periods[0].t,17);
 await open(edu.page,'导入课表');await edu.page.getByRole('button',{name:'内容不完整？重新复制识别',exact:true}).click();
 await edu.page.getByLabel('粘贴教务课表',{exact:true}).evaluate(el=>{
  const data=new DataTransfer();data.setData('text/plain','完整富文本课表');data.setData('text/html','<table><tr><th colspan="2">时间</th><th>周一</th><th>周二</th><th>周三</th></tr><tr><td rowspan="2">上午</td><td>1-2</td><td>大学英语<br>王教授<br>博学楼501<br>1-18周</td><td></td><td></td></tr><tr><td>3-4</td><td></td><td>线性代数<br>张老师<br>致远-101<br>3,5,7周（单）</td><td></td></tr></table>');el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));
 });
 await edu.page.locator('.mbox-foot').getByRole('button',{name:'导入 2 门课程',exact:true}).click();
 const rich=await edu.page.evaluate(()=>JSON.parse(localStorage.getItem('ClassScheduleData_edu-recipient')).courses);
 assert.equal(rich.length,4);assert.equal(rich.find(c=>c.name==='大学英语').periods[0].t,18);assert.deepEqual(rich.find(c=>c.name==='线性代数').periods.map(p=>p.f),[3,5,7]);
 report.flows.push('Education wizard handles clipboard denial, plain and rich multiline/merged tables, exact sparse weeks and merge-save');await edu.context.close();
 const missing=await make({width:390,height:844});const response=await missing.page.goto(origin+'/s/NO23456');assert.equal(response.status(),404);assert.ok((await missing.page.locator('body').innerText()).includes('无效或已过期'));await missing.context.close();
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalWrites,[]);console.log(`PASS: ${report.layouts.length} layouts, ${report.flows.length} end-to-end flows with real local Workers/D1, zero external writes`);
}finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
