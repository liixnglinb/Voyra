import test from 'node:test';
import assert from 'node:assert/strict';
import {createScheduleCloud,SCHEDULE_CLOUD_KEY} from '../src/lib/schedule-cloud.js';
import {ScheduleStore,sameSchedule} from '../src/lib/schedule-data.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const course=(id,name=id)=>({id,name,periods:[{day:1,slot:'1-2',f:1,t:20,type:'every'}]});
const payload=(...ids)=>({courses:ids.map(id=>course(id)),settings:{startDate:'2026-09-01'}});
function storage(){const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,v)=>data.set(key,v)};}
function backend(initial=[]){
 const rows=clone(initial),writes=[],reads=[];let fail=false,hold=null,seq=0;
 return {rows,writes,reads,set fail(v){fail=v;},set hold(v){hold=v;},Bmob:{Query(table){
  assert.equal(table,'user_data');const filters={},fields={};let limit=100,skip=0;
  return {equalTo(k,op,v){assert.equal(op,'==');filters[k]=v;},limit(v){limit=v;},skip(v){skip=v;},order(...v){assert.deepEqual(v,['createdAt','objectId']);},set(k,v){fields[k]=v;},
   async find(){if(hold)await hold;reads.push({filters,limit,skip});return clone(rows.filter(r=>r.userKey===filters.userKey&&r.key===filters.key).slice(skip,skip+limit));},
   async save(){if(fail)throw {code:209,error:'expired'};assert.deepEqual(fields.ACL,{[fields.userKey]:{read:true,write:true}});writes.push(clone(fields));
    if(fields.id){const row=rows.find(r=>r.objectId===fields.id);assert.ok(row);Object.assign(row,clone(fields));return {updatedAt:'2026-10-25 19:00:00'};}
    const row={...clone(fields),objectId:`new-${++seq}`};rows.push(row);return {objectId:row.objectId};}
  };}}};
}
const legacy=(id,data,uid='owner')=>({objectId:id,key:SCHEDULE_CLOUD_KEY,userKey:uid,value:JSON.stringify(data)});
function device(db,uid='owner'){const local=storage();let current=true;const cloud=createScheduleCloud({Bmob:db.Bmob,uid,storage:local,assertCurrent(){if(!current)throw Error('account switched');}});return {local,cloud,stop(){current=false;},store:new ScheduleStore({storage:local,key:`ClassScheduleData_${uid}`,cloud})};}
test('all legacy duplicate rows are merged and retained; other accounts are isolated',async()=>{
 const db=backend([legacy('old',payload('old')),legacy('phone',payload('phone')),legacy('private',payload('secret'),'other')]),d=device(db);
 assert.deepEqual((await d.cloud.load()).courses.map(c=>c.id),['old','phone']);await d.cloud.save(payload('new'));
 assert.equal(db.rows.length,4);assert.equal(db.writes[0].id,undefined);assert.equal(db.rows[0].value,JSON.stringify(payload('old')));
 assert.equal(JSON.parse(d.local.getItem('ClassScheduleData_owner.cloud-rows-v1'))[0].rows.length,2);
});
test('simultaneous devices keep independent rows; later edits and removals converge',async()=>{
 const db=backend(),a=device(db),b=device(db);
 await Promise.all([a.cloud.save(payload('phone')),b.cloud.save(payload('pc'))]);assert.equal(db.rows.length,2);
 assert.equal((await a.cloud.load()).courses.length,2);await a.store.sync();await b.store.sync();
 a.store.replace(a.store.payload.courses.map(c=>c.id==='phone'?{...c,name:'已修改'}:c),null);await a.store.sync();await b.store.sync();
 assert.equal(b.store.payload.courses.find(c=>c.id==='phone').name,'已修改');
 b.store.replace(b.store.payload.courses.filter(c=>c.id!=='pc'),null);await b.store.sync();await a.store.sync();
 assert.deepEqual(a.store.payload.courses.map(c=>c.id),['phone']);assert.equal(db.rows.length,2);
});
test('pagination reads more than 100 historical versions',async()=>{
 const db=backend(Array.from({length:205},(_,i)=>legacy(String(i),payload(String(i))))),d=device(db);
 assert.equal((await d.cloud.load()).courses.length,205);assert.deepEqual(db.reads.map(r=>r.skip),[0,100,200]);
});
test('corrupt cloud is archived verbatim before failing and never overwritten',async()=>{
 const db=backend([legacy('good',payload('keep')),{...legacy('broken',payload()),value:'{corrupt'}]),d=device(db);
 await assert.rejects(d.cloud.save(payload('new')),/无法读取/);assert.equal(db.writes.length,0);
 assert.equal(JSON.parse(d.local.getItem('ClassScheduleData_owner.cloud-rows-v1'))[0].rows[1].value,'{corrupt');
});
test('failed upload stays local with auth guidance; successful retry merges both devices',async()=>{
 const db=backend([legacy('remote',payload('remote'))]),d=device(db);db.fail=true;
 d.store.replace(payload('local').courses,null);await d.store.sync();assert.equal(d.store.status,'error');assert.equal(d.store.errorCode,'AUTH_REQUIRED');
 assert.equal(JSON.parse(d.local.getItem(d.store.key)).courses.length,2);db.fail=false;await d.store.sync();assert.equal(d.store.status,'synced');assert.equal((await d.cloud.load()).courses.length,2);
});
test('account switch while reading aborts before cloud write',async()=>{
 const db=backend(),d=device(db);let release;db.hold=new Promise(r=>{release=r;});const write=d.cloud.save(payload('local'));await Promise.resolve();d.stop();release();
 await assert.rejects(write,/account switched/);assert.equal(db.writes.length,0);
});
test('corrupt local data appearing during a cloud request cannot be overwritten',async()=>{
 const d=storage();d.setItem('local',JSON.stringify(payload('keep')));let release;const cloud={load:()=>new Promise(r=>{release=r;}),save:()=>{throw Error('must not write');}};
 const store=new ScheduleStore({storage:d,key:'local',cloud});const running=store.sync();d.setItem('local','corrupt');release(payload('remote'));await running;
 assert.equal(store.status,'error');assert.equal(store.invalid,true);assert.equal(d.getItem('local'),'corrupt');
});
test('read-only refresh and course ordering do not create cloud rows or repeated writes',async()=>{
 const db=backend([legacy('remote',payload('b','a'))]),d=device(db);d.local.setItem(d.store.key,JSON.stringify(payload('a','b')));d.store.refreshLocal();await d.store.sync();await d.store.sync();
 assert.equal(db.writes.length,0);assert.ok(sameSchedule(payload('a','b'),payload('b','a')));
});
test('a stalled backend times out without overwriting local or cloud history',async()=>{
 const local=storage();local.setItem('ClassScheduleData_owner',JSON.stringify(payload('keep')));let writes=0;
 const cloud=createScheduleCloud({uid:'owner',storage:local,assertCurrent(){},timeoutMs:5,Bmob:{Query(){return {equalTo(){},order(){},limit(){},skip(){},find:()=>new Promise(()=>{}),save(){writes++;}};}}});
 await assert.rejects(cloud.save(payload('new')),/连接超时/);assert.equal(writes,0);assert.equal(JSON.parse(local.getItem('ClassScheduleData_owner')).courses[0].id,'keep');
});
