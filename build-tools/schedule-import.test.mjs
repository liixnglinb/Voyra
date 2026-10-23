import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {encodeScheduleShare,decodeScheduleShare,mergeReceivedCourses,shareIdFromText,fetchScheduleShare} from '../src/lib/schedule-share.js';
import {ScheduleStore,mergeSchedule} from '../src/lib/schedule-data.js';
import {parseTabularText,parseEducationRows,educationSlot} from '../src/lib/education-import.js';
import {onRequestPost,onRequestGet} from '../functions/share.js';
import {onRequestGet as shortRoute} from '../functions/s/[id].js';
const source=[{id:'owner-original',name:'概率论与数理统计',teacher:'龙老师',room:'致远-120',credit:'3',note:'内容 %7e |~;, 完整保留',color:2,periods:[{day:4,slot:'1-2',f:2,t:17,type:'odd',customTime:{start:'08:25',end:'10:05'}}]}];
const settings={startDate:'2026-09-07',overrideWeek:null,timeSlots:{'1-2':'08:25-10:05'}};
const legacyB64=value=>Buffer.from(value).toString('base64url');
const dbFixture=()=>{const sql=new DatabaseSync(':memory:');return{sql,db:{prepare(query){const statement=sql.prepare(query);return{bind(...args){return{first:async()=>statement.get(...args)||null,run:async()=>({meta:statement.run(...args)})};},run:async()=>({meta:statement.run()})};}}};};
test('v3 share roundtrip preserves punctuation, multi periods and schedule settings',()=>{
 const result=decodeScheduleShare(encodeScheduleShare(source,settings));assert.equal(result.courses[0].note,source[0].note);assert.deepEqual(result.courses[0].periods,source[0].periods);assert.deepEqual(result.settings,settings);assert.notEqual(result.courses[0].id,source[0].id);
});
test('detail toggle omits teachers and rooms only',()=>{const result=decodeScheduleShare(encodeScheduleShare(source,settings,false));assert.equal(result.courses[0].teacher,'');assert.equal(result.courses[0].room,'');assert.equal(result.courses[0].note,source[0].note);});
test('old v1 and v2 share tokens and long links remain readable',()=>{
 const v1='VOYRA1:'+legacyB64(JSON.stringify([{n:'数学',t:'张老师',r:'A101',p:[[1,'1-2',1,18,1,'']]}]));
 const v2='VOYRA2:'+legacyB64('数学~~~~张老师~A101~1,0,1,18,1,');
 for(const value of[v1,v2,`https://lxlrwxs.top/#/timetable?share=${v2}`]){const result=decodeScheduleShare(value);assert.equal(result.courses[0].name,'数学');assert.equal(result.courses[0].periods[0].type,'odd');}
});
test('receiver gets new IDs and merging same share twice never duplicates or overwrites existing courses',()=>{
 const mine={...source[0],id:'recipient-existing',name:'我原来的课程',ownerOnly:'keep'};let count=0;
 const first=mergeReceivedCourses([mine],source,()=>`recipient-${++count}`);assert.equal(first.added,1);assert.equal(first.courses[0].ownerOnly,'keep');assert.equal(first.courses[1].id,'recipient-1');assert.equal(source[0].id,'owner-original');
 const second=mergeReceivedCourses(first.courses,source,()=>`recipient-${++count}`);assert.equal(second.added,0);assert.equal(second.courses.length,2);
});
test('bad shares fail validation before any data mutation',()=>{
 assert.throws(()=>decodeScheduleShare('bad'));assert.throws(()=>encodeScheduleShare([{...source[0],periods:[{day:8,slot:'1-2',f:1,t:18}]}],settings));
 assert.throws(()=>decodeScheduleShare('VOYRA3:'+legacyB64(JSON.stringify({courses:source,settings:{...settings,overrideWeek:80}}))));
});
test('short link resolver uses only site links and supports local preview origin',async()=>{
 assert.equal(shareIdFromText('https://lxlrwxs.top/s/ABC2345'),'ABC2345');assert.equal(shareIdFromText('https://evil.example/s/ABC2345'),null);
 let requested;const result=await fetchScheduleShare('https://lxlrwxs.top/s/ABC2345',{fetcher:async url=>{requested=url;return new Response(JSON.stringify({ok:true,code:encodeScheduleShare(source,settings)}));}});
 assert.equal(requested,'/share?id=ABC2345');assert.equal(result.courses.length,1);
});
test('quoted multiline clipboard cells and escaped quotes are preserved',()=>{
 const rows=parseTabularText('节次\t周一\t周二\t周三\n1-2\t"概率论\n龙老师\n致远-120\n2-17周（单）"\t"课程含""引号"""\t\n');
 assert.ok(rows[1][1].includes('\n龙老师'));assert.equal(rows[1][2],'课程含"引号"');
 const list=parseEducationRows(rows);assert.equal(list[0].teacher,'龙老师');assert.equal(list[0].room,'致远-120');assert.deepEqual(list[0].periods,[{day:1,slot:'1-2',f:2,t:17,type:'odd'}]);
});
test('school tables with two leading columns and Chinese big periods parse actual weeks',()=>{
 const rows=[['时间','节次','星期一','星期二','星期三'],['上午','第一大节\n(01,02)','数学\n李教授\n博学楼501\n1-18([周])[01-02节]','','']];
 const list=parseEducationRows(rows);assert.equal(list.length,1);assert.equal(list[0].periods[0].t,18);assert.equal(list[0].periods[0].slot,'1-2');assert.equal(list[0].room,'博学楼501');
 assert.equal(educationSlot('第六大节'),'晚自习2');assert.equal(educationSlot('08:20-10:00'),null);
});
test('discontiguous weeks remain exact and odd/even types are strings',()=>{
 const list=parseEducationRows([['节次','周一','周二','周三'],['1-2','数学\n1,3,7周（单）','','']]);
 assert.deepEqual(list[0].periods.map(p=>[p.f,p.t,p.type]),[[1,1,'odd'],[3,3,'odd'],[7,7,'odd']]);
});
test('unrecognized clipboard content does not fabricate courses',()=>assert.deepEqual(parseEducationRows(parseTabularText('学校登录页\n用户名\n密码')),[]));
function storeFixture(payload,options={}){const values=new Map(payload?[['ClassScheduleData_receiver',JSON.stringify(payload)]]:[]);const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};return{values,storage,store:new ScheduleStore({storage,key:'ClassScheduleData_receiver',now:()=>100,...options})};}
test('empty cloud and delayed cloud responses cannot erase newly received courses',async()=>{
 let release,remote={courses:[{...source[0],id:'remote-only',name:'云端已有课'}],settings};const held=new Promise(resolve=>{release=resolve;});
 const {store}=storeFixture({courses:[],settings},{cloud:{load:async()=>{await held;return remote;},save:async value=>{remote=value;}}});
 const sync=store.sync();store.replace(mergeReceivedCourses([],source,()=> 'receiver-new').courses,null);release();await sync;assert.equal(store.payload.courses.length,2);assert.ok(remote.courses.some(c=>c.id==='receiver-new'));
 assert.equal(mergeSchedule({courses:source,settings},{courses:[],settings}).courses.length,1);
});
test('delete stays deleted after sync and original local JSON remains recoverable',async()=>{
 let remote={courses:source,settings};const {store,values}=storeFixture(remote,{cloud:{load:async()=>remote,save:async value=>{remote=value;}}});
 const original=values.get(store.key);store.replace([],null);await store.sync();assert.equal(remote.courses.length,0);assert.equal(values.get(store.key+'.original-v2'),original);
});
test('read failure retains local import; retry merges both sides without duplicates',async()=>{
 let fail=true,remote={courses:source,settings};const {store}=storeFixture({courses:[],settings},{cloud:{load:async()=>{if(fail)throw Error('offline');return remote;},save:async value=>{remote=value;}}});
 store.replace([{...source[0],id:'mine',name:'我的新课'}],null);await store.sync();assert.equal(store.status,'error');fail=false;await store.sync();assert.equal(remote.courses.length,2);assert.equal(store.status,'synced');
});
test('account switch in flight cannot write a receiving course into the next account',async()=>{
 let current=true,release,writes=0;const held=new Promise(resolve=>{release=resolve;});const {store,values}=storeFixture({courses:source,settings},{isCurrent:()=>current,cloud:{load:async()=>{await held;return {courses:[],settings};},save:async()=>{writes++;}}});
 const before=values.get(store.key),sync=store.sync();current=false;release();await sync;assert.equal(writes,0);assert.equal(values.get(store.key),before);assert.throws(()=>store.replace([],null));
});
test('corrupt storage and quota failures never report a successful save',()=>{
 const {store,storage}=storeFixture({courses:source,settings});storage.setItem=()=>{throw Error('quota');};assert.throws(()=>store.replace([],null));assert.equal(store.payload.courses.length,1);
});
test('short-link API writes and reads with real SQLite, and no long token appears in the redirect',async()=>{
 const {sql,db}=dbFixture(),background=[];const code=encodeScheduleShare(source,settings);
 const response=await onRequestPost({request:new Request('https://lxlrwxs.top/share',{method:'POST',body:JSON.stringify({code})}),env:{DB:db},waitUntil:promise=>background.push(promise)});
 assert.equal(response.status,200);const body=await response.json();assert.match(body.id,/^[A-Za-z0-9]{7}$/);assert.equal(body.url,`https://lxlrwxs.top/s/${body.id}`);await Promise.all(background);
 const read=await onRequestGet({request:new Request(`https://lxlrwxs.top/share?id=${body.id}`),env:{DB:db}});assert.equal((await read.json()).code,code);
 const redirect=await shortRoute({params:{id:body.id},request:new Request(body.url),env:{DB:db}});assert.equal(redirect.status,302);assert.equal(redirect.headers.get('Location'),`https://lxlrwxs.top/#/timetable?tab=courses&shareId=${body.id}`);assert.ok(!redirect.headers.get('Location').includes('VOYRA'));
 sql.close();
});
test('expired and nonexistent shares return actionable status and never redirect',async()=>{
 const {sql,db}=dbFixture();sql.exec('CREATE TABLE share_links(id TEXT PRIMARY KEY,code TEXT,created_at INTEGER)');sql.prepare('INSERT INTO share_links VALUES(?,?,?)').run('ABC2345','VOYRA2:test',1);
 assert.equal((await onRequestGet({request:new Request('https://lxlrwxs.top/share?id=ABC2345'),env:{DB:db}})).status,410);
 assert.equal((await shortRoute({request:new Request('https://lxlrwxs.top/s/ABC2345'),params:{id:'ABC2345'},env:{DB:db}})).status,404);sql.close();
});
test('API rejects malformed and oversized payloads without touching the database',async()=>{
 const env={DB:{prepare(){throw Error('must not query');}}};
 assert.equal((await onRequestPost({request:new Request('https://x/share',{method:'POST',body:'bad'}),env})).status,400);
 assert.equal((await onRequestPost({request:new Request('https://x/share',{method:'POST',body:JSON.stringify({code:'VOYRA3:'+ 'a'.repeat(44001)})}),env})).status,413);
 assert.equal((await onRequestGet({request:new Request('https://x/share?id=bad%2Fid'),env})).status,404);
});
