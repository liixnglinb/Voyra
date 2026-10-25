// Exercise the shipped browser bundle and real Bmob SDK against a shared fake REST backend.
// No electronAPI replacement and no requests or writes to real user accounts.
import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(process.argv[2]||'dist'),out=resolve('output/schedule-sync-20261025'),uid='schedule-sync-e2e',key=`ClassScheduleData_${uid}`;
const c=id=>({id,name:id,periods:[{day:1,slot:'1-2',f:1,t:20,type:'every'}]});
const payload=(...ids)=>({courses:ids.map(c),settings:{startDate:'2026-10-19',overrideWeek:1,timeSlots:null}});
const rows=[{objectId:'legacy-a',userKey:uid,key:'schedule-classes-v1',value:JSON.stringify(payload('旧课表'))},{objectId:'legacy-b',userKey:uid,key:'schedule-classes-v1',value:JSON.stringify(payload('历史手机课程'))}],writes=[],errors=[],flows=[];
let failUpload=false,seq=0;
const csp=(await readFile(resolve(root,'_headers'),'utf8')).match(/Content-Security-Policy:\s*(.+)/)[1];
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const servers=[];
for(let i=0;i<2;i++){const server=createServer(async(req,res)=>{try{let path=new URL(req.url,'http://localhost').pathname;if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+sep))throw Error('path');const data=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','content-security-policy':csp});res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));servers.push(server);}
const origins=process.env.SCHEDULE_SYNC_URL_A?[process.env.SCHEDULE_SYNC_URL_A,process.env.SCHEDULE_SYNC_URL_B]:servers.map(s=>`http://127.0.0.1:${s.address().port}/`);
const browser=await chromium.launch({channel:'chrome',headless:true}),pages=[];
async function pageFor(index,{sdk=true,expired=false,authed=true,local=payload(),user=uid}={}){
 const context=await browser.newContext({viewport:index?{width:390,height:844}:{width:1365,height:950},timezoneId:'Asia/Shanghai',reducedMotion:'reduce'});
 await context.addInitScript(({sdk,expired,authed,local,user})=>{if(sessionStorage.getItem('sync-test-seeded'))return;sessionStorage.setItem('sync-test-seeded','1');
  if(authed)localStorage.setItem('voyra_session_v1',JSON.stringify({uid:user,username:user,loginAt:Date.now(),expiresAt:Date.now()+(expired?-864e5:864e5)}));
  if(sdk)localStorage.setItem('bmob',JSON.stringify({objectId:user,username:user,sessionToken:`fake-token-${user}`}));
  localStorage.setItem(`ClassScheduleData_${user}`,JSON.stringify(local));localStorage.setItem('voyra-sched-guide-v1','1');localStorage.setItem('keep-health-backup','original');
 },{sdk,expired,authed,local,user});
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());
  if(url.hostname!=='api.bmobcloud.com'){if(origins.some(o=>new URL(o).origin===url.origin))return route.continue();return route.abort();}
  const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify(body)});
  try{
   if(req.method()==='OPTIONS')return reply({});
   if(/\/login$/.test(url.pathname)||(/\/users$/.test(url.pathname)&&req.method()==='POST')){
    const name=req.method()==='GET'?url.searchParams.get('username'):req.postDataJSON().username;
    return reply({objectId:name,username:name,sessionToken:`fake-token-${name}`,createdAt:'2026-10-25 19:00:00'});
   }
   assert.ok(url.pathname.includes('/classes/user_data'),'unexpected SDK route');
   const auth=req.headers()['x-bmob-session-token'];
   if(!auth&&req.method()==='GET'){const raw=JSON.parse(url.searchParams.get('where')||'{}'),where=Object.assign({},...(raw.$and||[raw]));assert.notEqual(where.key,'schedule-classes-v1','unauthenticated timetable query');return reply({results:[]});}
   assert.ok(auth?.startsWith('fake-token-'),'SDK session missing');const owner=auth.slice('fake-token-'.length);
   if(req.method()==='GET'){
    const raw=JSON.parse(url.searchParams.get('where')||'{}'),where=Object.assign({},...(raw.$and||[raw]));assert.equal(where.userKey,owner,'query owner');
    const selected=rows.filter(r=>r.userKey===where.userKey&&r.key===where.key),skip=Number(url.searchParams.get('skip')||0),limit=Number(url.searchParams.get('limit')||100);
    return reply({results:selected.slice(skip,skip+limit)});
   }
   if(failUpload)return reply({code:100,error:'simulated upload unavailable'},503);
   assert.ok(['POST','PUT'].includes(req.method()),'no deletes allowed');const data=req.postDataJSON();assert.equal(data.userKey,owner);assert.deepEqual(data.ACL,{[owner]:{read:true,write:true}});
   const id=url.pathname.split('/').filter(Boolean).at(-1);let row;
   if(req.method()==='PUT'){row=rows.find(r=>r.objectId===id);assert.equal(row?.userKey,owner);Object.assign(row,data);}else{row={...data,objectId:`device-${++seq}`,createdAt:'2026-10-25 19:00:00'};rows.push(row);}
   writes.push({owner,key:data.key,method:req.method()});return reply({objectId:row.objectId,updatedAt:'2026-10-25 19:00:00'});
  }catch(e){errors.push(e.message);return reply({error:'isolated test backend rejected request',code:400},400);}
 });
 const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));await page.goto(origins[index]+'#/timetable?tab=courses',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'功能',exact:true}).waitFor();return {context,page};
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
async function synced(page){await page.locator('.cs-page[data-sync-state="synced"]').waitFor();assert.equal(await page.getByRole('button',{name:'同步课表',exact:true}).count(),0);assert.equal(await page.locator('.cs-sync-bar').count(),0);}
async function add(page,name){await page.getByRole('button',{name:'功能',exact:true}).click();await page.getByRole('menuitem').filter({hasText:'手动添加课程'}).click();await page.getByRole('textbox',{name:'课程名称',exact:true}).fill(name);await page.locator('.mbox-foot').getByRole('button',{name:'添加课程',exact:true}).click();const later=page.getByRole('button',{name:'稍后再说',exact:true});if(await later.isVisible())await later.click();}
async function login(page,name){await page.getByRole('textbox',{name:'账号 ACCOUNT',exact:false}).fill(name);await page.locator('#agm-pass').fill('fake-password-123');await page.locator('.agm-submit').click();await page.locator('.agm-overlay').waitFor({state:'hidden'});}
try{
 const pc=await pageFor(0),phone=await pageFor(1,{local:payload('手机未上传课程')});await synced(pc.page);await synced(phone.page);
 assert.equal((await saved(pc.page)).courses.length,2);assert.equal((await saved(phone.page)).courses.length,3);
 await pc.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await pc.page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).courses.length===3,key);flows.push('separate origins merge local phone data and every historical cloud row');
 await add(phone.page,'手机新添加');await synced(phone.page);await pc.page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await pc.page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).courses.some(c=>c.name==='手机新添加'),key);flows.push('already-open desktop refreshes on visibility change');
 await add(pc.page,'电脑新添加');await synced(pc.page);await phone.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await synced(phone.page);assert.ok((await saved(phone.page)).courses.some(c=>c.name==='电脑新添加'));flows.push('desktop to phone background sync uses real SDK authentication and private ACL');
 failUpload=true;await add(phone.page,'断网上传保留');await phone.page.locator('.cs-page[data-sync-state="error"]').waitFor();assert.ok((await saved(phone.page)).courses.some(c=>c.name==='断网上传保留'));
 failUpload=false;await phone.page.getByRole('button',{name:'重试同步'}).click();await synced(phone.page);await pc.page.evaluate(()=>window.dispatchEvent(new Event('focus')));await pc.page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).courses.some(c=>c.name==='断网上传保留'),key);flows.push('failed upload remains local; retry reaches the other device');
 await phone.page.screenshot({path:resolve(out,'mobile-synced.png')});await pc.context.close();await phone.context.close();
 const missing=await pageFor(1,{sdk:false,local:payload('凭据失效保留')});await missing.page.getByRole('button',{name:'重新登录',exact:true}).waitFor();assert.ok((await saved(missing.page)).courses.length===1);await missing.page.getByRole('button',{name:'重新登录',exact:true}).click();await login(missing.page,uid);await synced(missing.page);assert.ok((await saved(missing.page)).courses.some(c=>c.name==='凭据失效保留'));flows.push('missing SDK session shows guidance; same-account login immediately uploads retained data');
 await missing.page.getByRole('button',{name:'账户',exact:true}).click();await missing.page.getByRole('button',{name:'退出登录',exact:true}).click();assert.ok((await saved(missing.page)).courses.length>0);assert.equal(await missing.page.evaluate(()=>localStorage.getItem('keep-health-backup')),'original');await missing.context.close();flows.push('logout preserves timetable, health data and backups');
 const expired=await pageFor(1,{expired:true,local:payload('过期保留')});assert.equal((await saved(expired.page)).courses[0].name,'过期保留');assert.equal(await expired.page.evaluate(()=>localStorage.getItem('keep-health-backup')),'original');await expired.context.close();flows.push('expired custom session preserves local records');
 const fresh=await pageFor(1,{sdk:false,authed:false,user:'new-sync-user',local:payload('注册前本机记录')});await fresh.page.locator('.ag-fab-login').click();await fresh.page.getByRole('button',{name:'注册一个',exact:true}).click();await fresh.page.locator('#agm-user').fill('new-sync-user');await fresh.page.locator('#agm-pass').fill('fake-password-123');await fresh.page.locator('#agm-confirm').fill('fake-password-123');await fresh.page.locator('.agm-submit').click();await synced(fresh.page);assert.ok(rows.some(r=>r.userKey==='new-sync-user'&&r.key==='schedule-classes-v1'));assert.equal(await fresh.page.evaluate(()=>JSON.parse(localStorage.getItem('bmob')).objectId),'new-sync-user');await fresh.context.close();flows.push('registration persists real SDK session before private cloud writes');
 assert.deepEqual(errors,[]);await mkdir(out,{recursive:true});await writeFile(resolve(out,'browser-report.json'),JSON.stringify({flows,errors,isolatedWrites:writes.length,sites:origins.map(u=>new URL(u).origin)},null,2));console.log(JSON.stringify({passed:true,flows,errors,isolatedWrites:writes.length}));
}catch(error){console.log(JSON.stringify({errors,flows,pages:await Promise.all(pages.filter(p=>!p.isClosed()).map(async p=>({notice:await p.locator('.cs-sync-notice').allTextContents(),bar:await p.locator('.cs-sync-bar').allTextContents(),rows:rows.length})))}));throw error;}finally{await browser.close();await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));}
