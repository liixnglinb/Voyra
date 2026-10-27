import md5 from 'hydrogen-js-sdk/src/lib/utf8md5.js';
const API='https://api.bmobcloud.com',enc=new TextEncoder();
export const DEVICE_TTL=30*86400000;
export class ServiceError extends Error{constructor(code,message,status=400){super(message);Object.assign(this,{code,status});}}
export const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Authorization, Origin','X-Content-Type-Options':'nosniff'}});
export const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const randomToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const hash=async value=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))));
export const upstreamAuthError=error=>Number(error?.code)===211||([122,209].includes(Number(error?.code))&&/session|登录|凭据|expired/i.test(error?.message||error?.error||''));
export function configured(env){return !!(env.DB&&env.VITE_BMOB_APPLICATION_ID&&env.VITE_BMOB_REST_API_KEY);}
export async function bodyJSON(request,max=1048576){
 if(Number(request.headers.get('content-length')||0)>max)throw new ServiceError('TOO_LARGE','请求过大，未修改云端数据。',413);
 const reader=request.body?.getReader();if(!reader)throw new ServiceError('BAD_REQUEST','请求内容为空。');let size=0;const parts=[];
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new ServiceError('TOO_LARGE','请求过大，未修改云端数据。',413);}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
 try{const result=JSON.parse(new TextDecoder().decode(bytes));if(!result||Array.isArray(result)||typeof result!=='object')throw Error();return result;}catch{throw new ServiceError('BAD_REQUEST','请求格式不正确。');}
}
export function checkOrigin(request){const origin=request.headers.get('Origin');if(!origin)return;const allowed=['https://lxlrwxs.top','https://www.lxlrwxs.top','https://voyra-121.pages.dev','https://voyra-overseas.edgeone.dev'];if(!allowed.includes(origin)&&!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin))throw new ServiceError('ORIGIN_DENIED','请求来源不受支持。',403);}
export async function ensureSessions(env){
 if(!configured(env))throw new ServiceError('SERVICE_UNAVAILABLE','登录同步服务暂不可用，本机数据已保留。',503);
 await env.DB.batch([
  env.DB.prepare('CREATE TABLE IF NOT EXISTS voyra_device_sessions (token_hash TEXT PRIMARY KEY,uid TEXT NOT NULL,username TEXT NOT NULL,upstream_token TEXT NOT NULL,issued_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,revoked_at INTEGER NOT NULL DEFAULT 0)'),
  env.DB.prepare('CREATE INDEX IF NOT EXISTS voyra_device_sessions_uid ON voyra_device_sessions(uid,issued_at)')
 ]);
}
export async function upstream(env,path,method='GET',data=null,sessionToken='',query=null){
 const secret=env.VITE_BMOB_APPLICATION_ID,key=env.VITE_BMOB_REST_API_KEY,headers={'Content-Type':'application/json'},body=data===null?'':JSON.stringify(data);
 if(key.length===32){headers['X-Bmob-Application-Id']=secret;headers['X-Bmob-REST-API-Key']=key;}
 else{const timestamp=String(Math.round(Date.now()/1000)),nonce=hex(crypto.getRandomValues(new Uint8Array(8)));Object.assign(headers,{'X-Bmob-SDK-Type':'wechatApp','X-Bmob-Safe-Timestamp':timestamp,'X-Bmob-Noncestr-Key':nonce,'X-Bmob-Secret-Key':secret,'X-Bmob-SDK-Version':'10','X-Bmob-Safe-Sign':md5.utf8MD5(path+timestamp+key+nonce+body+'10')});}
 if(sessionToken)headers['X-Bmob-Session-Token']=sessionToken;
 const url=new URL(API+path);if(query)for(const [k,v]of Object.entries(query))url.searchParams.set(k,String(v));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{const response=await (typeof env.__fetch==='function'?env.__fetch:fetch)(url.href,{method,headers,body:body||undefined,signal:controller.signal,redirect:'error'});let result;try{result=await response.json();}catch{throw new ServiceError('UPSTREAM_UNAVAILABLE','云端响应异常，本机数据已保留。',502);}
  if(!response.ok||result.error){const error=new ServiceError(result.code||'UPSTREAM_UNAVAILABLE',String(result.error||'云端暂不可用。'),502);throw error;}return result;
 }catch(error){if(error instanceof ServiceError)throw error;throw new ServiceError('UPSTREAM_UNAVAILABLE','云端连接暂不可用，本机数据已保留。',502);}finally{clearTimeout(timer);}
}
export function bearer(request){const value=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!value)throw new ServiceError('AUTH_REQUIRED','请验证当前账号以恢复同步，本机数据已保留。',401);return value;}
export async function deviceSession(env,request){await ensureSessions(env);const tokenHash=await hash(bearer(request)),record=await env.DB.prepare('SELECT * FROM voyra_device_sessions WHERE token_hash=? AND revoked_at=0 AND expires_at>?').bind(tokenHash,Date.now()).first();if(!record)throw new ServiceError('AUTH_REQUIRED','当前设备登录已到期，请验证账号。本机数据已保留。',401);return record;}
export async function issueSession(env,user,request){
 const uid=String(user.objectId||''),username=String(user.username||'');if(!/^[A-Za-z0-9_-]{1,80}$/.test(uid)||typeof user.sessionToken!=='string'||!user.sessionToken)throw new ServiceError('UPSTREAM_UNAVAILABLE','后台未确认登录，请重试。',502);
 const token=randomToken(),now=Date.now(),expiresAt=now+DEVICE_TTL;
 const statements=[env.DB.prepare('INSERT INTO voyra_device_sessions(token_hash,uid,username,upstream_token,issued_at,expires_at,revoked_at) VALUES(?,?,?,?,?,?,0)').bind(await hash(token),uid,username,user.sessionToken,now,expiresAt)];
 const previous=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(previous)statements.push(env.DB.prepare('UPDATE voyra_device_sessions SET revoked_at=? WHERE token_hash=?').bind(now,await hash(previous)));
 await env.DB.batch(statements);
 return {ok:true,user:{objectId:uid,username},deviceToken:token,expiresAt};
}
export async function withUpstreamSession(env,device,operation){
 const tried=new Set();for(let attempt=0;attempt<3;attempt++){
  const records=await env.DB.prepare('SELECT upstream_token FROM voyra_device_sessions WHERE uid=? AND expires_at>? ORDER BY issued_at DESC,rowid DESC LIMIT 12').bind(device.uid,Date.now()).all();
  const token=records.results.map(r=>r.upstream_token).find(token=>token&&!tried.has(token));if(!token)break;tried.add(token);
  try{return await operation(token);}catch(error){if(!upstreamAuthError(error))throw error;}
 }
 throw new ServiceError('UPSTREAM_AUTH_REQUIRED','请在任意一台设备验证账号，其他已登录设备会自动恢复同步。本机数据已保留。',401);
}
export async function authHandler({request,env,waitUntil}){
 try{checkOrigin(request);if(request.method==='GET')return json({ok:true,ready:configured(env),multiDevice:true});if(request.method!=='POST')return json({ok:false,error:'METHOD_NOT_ALLOWED'},405);
  const input=await bodyJSON(request,8192);await ensureSessions(env);
  if(input.action==='logout'){const session=await deviceSession(env,request);await env.DB.prepare('UPDATE voyra_device_sessions SET revoked_at=? WHERE token_hash=?').bind(Date.now(),session.token_hash).run();return json({ok:true});}
  if(input.action==='exchange'){
   if(!/^[A-Za-z0-9_-]{1,80}$/.test(input.uid||'')||typeof input.sessionToken!=='string'||!input.sessionToken||input.sessionToken.length>1024)throw new ServiceError('AUTH_REQUIRED','请验证当前账号以恢复多设备同步。',401);
   const checked=await upstream(env,'/1/checkSession/'+encodeURIComponent(input.uid),'GET',null,input.sessionToken);if(checked.msg!=='ok')throw new ServiceError('AUTH_REQUIRED','请验证当前账号以恢复多设备同步。',401);
   const user=await upstream(env,'/1/users/'+encodeURIComponent(input.uid),'GET',null,input.sessionToken);if(user.objectId!==input.uid)throw new ServiceError('AUTH_REQUIRED','账号验证未通过。',401);
   return json(await issueSession(env,{...user,sessionToken:input.sessionToken},request));
  }
  if(!['login','register'].includes(input.action)||typeof input.username!=='string'||!input.username.trim()||input.username.length>100||typeof input.password!=='string'||!input.password||input.password.length>256)throw new ServiceError('BAD_REQUEST','请填写有效的账号和密码。');
  const user=await upstream(env,input.action==='register'?'/1/users':'/1/login','POST',{username:input.username.trim(),password:input.password});
  const result=await issueSession(env,{...user,username:user.username||input.username.trim()},request);
  if(waitUntil)waitUntil(env.DB.prepare('DELETE FROM voyra_device_sessions WHERE expires_at<?').bind(Date.now()-7*86400000).run().catch(()=>{}));return json(result);
 }catch(error){return serviceFailure(error);}
}
export function serviceFailure(error){
 if(!(error instanceof ServiceError))return json({ok:false,code:'SERVICE_UNAVAILABLE',error:'同步服务暂不可用，本机数据已保留。'},503);
 if(upstreamAuthError(error))return json({ok:false,code:'AUTH_REQUIRED',error:'登录凭据需要验证，本机数据已保留。'},401);
 const code=error?.code||'SERVICE_UNAVAILABLE',messages={101:'账号或密码不正确。',202:'该账号已存在。',122:'云端权限验证未通过，本机数据已保留。',121:'云端服务额度暂不可用，本机数据已保留。'};
 const safe=typeof code==='string'?error.message:messages[code]||'云端暂不可用，本机数据已保留。';
 return json({ok:false,code,error:safe||'服务暂不可用。'},error.status||503);
}
export async function cloudHandler({request,env}){
 try{checkOrigin(request);if(request.method!=='POST')return json({ok:false,code:'METHOD_NOT_ALLOWED'},405);const input=await bodyJSON(request),session=await deviceSession(env,request),uid=session.uid;
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(input.key||''))throw new ServiceError('BAD_REQUEST','数据类型无效。');
  return await withUpstreamSession(env,session,async token=>{
   if(input.action==='list'){
    const offset=Number(input.offset||0),limit=Number(input.limit||100);if(!Number.isInteger(offset)||offset<0||offset>=5000||!Number.isInteger(limit)||limit<1||limit>100)throw new ServiceError('BAD_REQUEST','分页参数无效。');
    const result=await upstream(env,'/1/classes/user_data','GET',null,token,{where:JSON.stringify({userKey:uid,key:input.key}),order:'createdAt,objectId',limit,skip:offset});if(!Array.isArray(result.results)||result.results.some(row=>row.userKey!==uid||row.key!==input.key))throw new ServiceError('UPSTREAM_UNAVAILABLE','云端数据归属异常，未写入本机。',502);return json({ok:true,results:result.results});
   }
   if(!['save','delete'].includes(input.action))throw new ServiceError('BAD_REQUEST','操作无效。');
   if(input.action==='delete'&&input.key==='schedule-classes-v1')throw new ServiceError('BAD_REQUEST','课表历史版本不支持整体删除。');
   const id=input.objectId;if(id!==undefined){if(!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw new ServiceError('BAD_REQUEST','记录编号无效。');const row=await upstream(env,'/1/classes/user_data/'+encodeURIComponent(id),'GET',null,token);if(row.userKey!==uid||row.key!==input.key)throw new ServiceError('ACCESS_DENIED','这条记录不属于当前账号。',403);}
   if(input.action==='delete'){if(!id)throw new ServiceError('BAD_REQUEST','缺少记录编号。');await upstream(env,'/1/classes/user_data/'+encodeURIComponent(id),'DELETE',null,token);return json({ok:true});}
   if(typeof input.value!=='string')throw new ServiceError('BAD_REQUEST','数据内容格式无效。');
   const value=await upstream(env,'/1/classes/user_data'+(id?'/'+encodeURIComponent(id):''),id?'PUT':'POST',{userKey:uid,key:input.key,value:input.value,ACL:{[uid]:{read:true,write:true}}},token);return json({ok:true,...value});
  });
 }catch(error){return serviceFailure(error);}
}
