import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
export function sessionFixture(initialRows=[],initialUser='schedule-sync-e2e'){
 const sql=new DatabaseSync(':memory:');
 const db={prepare(text){let args=[];const q={bind(...values){args=values;return q;},async first(){return sql.prepare(text).get(...args)||null;},async all(){return {results:sql.prepare(text).all(...args)};},async run(){return {meta:sql.prepare(text).run(...args)};}};return q;},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const rows=structuredClone(initialRows),writes=[],requests=[],users=new Map([[initialUser,{objectId:initialUser,username:initialUser}]]),tokens=new Map([[initialUser,'fake-token-'+initialUser]]);let seq=0,failUpload=false,gate=null;
 const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 const env={DB:db,VITE_BMOB_APPLICATION_ID:'isolated-test-application',VITE_BMOB_REST_API_KEY:'0'.repeat(32),async __fetch(input,options){
  const url=new URL(input),method=options.method||'GET',headers=new Headers(options.headers),token=headers.get('X-Bmob-Session-Token'),data=options.body?JSON.parse(options.body):null,path=url.pathname;requests.push({path,method,hasToken:!!token});assert.equal(options.redirect,'manual');assert.equal(url.origin,'https://api.bmobcloud.com');assert.equal(headers.has('X-Bmob-Master-Key'),false);assert.equal(url.searchParams.has('password'),false);
  if(path==='/1/login'||(path==='/1/users'&&method==='POST')){assert.equal(method,'POST');assert.equal(token,null,'auth must not carry a stale upstream token');if(data.password!=='fake-password-123')return response({code:101,error:'incorrect password'},400);if(path==='/1/users'&&users.has(data.username))return response({code:202,error:'username exists'},400);if(path==='/1/login'&&!users.has(data.username))return response({code:101,error:'unknown user'},400);const user=users.get(data.username)||{objectId:data.username,username:data.username};users.set(user.objectId,user);const fresh='fake-token-'+user.objectId+':'+(++seq);tokens.set(user.objectId,fresh);return response({...user,sessionToken:fresh});}
  const current=[...tokens.entries()].find(([,value])=>value===token)?.[0];
  if(path.startsWith('/1/checkSession/'))return response({msg:current===decodeURIComponent(path.split('/').at(-1))?'ok':'fail'});
  if(path.startsWith('/1/users/')){const uid=decodeURIComponent(path.split('/').at(-1));return current===uid?response(users.get(uid)):response({code:122,error:'权限验证不通过, session:'+token},401);}
  if(gate){const held=gate;gate=null;await held;}
  if(!current)return response({code:122,error:'权限验证不通过, session:'+token},401);
  assert.ok(path.startsWith('/1/classes/user_data'));
  const id=path==='/1/classes/user_data'?null:path.split('/').at(-1),row=id?rows.find(r=>r.objectId===id):null;
  if(id&&(!row||row.userKey!==current))return response({code:122,error:'没有记录访问权限'},403);
  if(method==='GET'){if(id)return response(row);const where=JSON.parse(url.searchParams.get('where')||'{}');assert.equal(where.userKey,current);const selected=rows.filter(r=>r.userKey===where.userKey&&r.key===where.key),skip=Number(url.searchParams.get('skip')||0),limit=Number(url.searchParams.get('limit')||100);return response({results:selected.slice(skip,skip+limit)});}
  if(failUpload)return response({code:100,error:'simulated upload unavailable'},503);
  if(method==='DELETE'){rows.splice(rows.indexOf(row),1);return response({msg:'ok'});}
  assert.equal(data.userKey,current);assert.deepEqual(data.ACL,{[current]:{read:true,write:true}});
  let target=row;if(method==='PUT'){Object.assign(target,data);}else{target={...data,objectId:'row-'+(++seq),createdAt:'2026-10-26 00:00:00'};rows.push(target);}writes.push({owner:current,key:data.key,method});return response({objectId:target.objectId,updatedAt:'2026-10-26 00:00:00'});
 }};
 return {sql,env,rows,writes,requests,users,tokens,set failUpload(value){failUpload=value;},set gate(value){gate=value;},close(){sql.close();}};
}
