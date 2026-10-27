const SESSION_KEY='voyra_session_v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch{return null;}};
const error=(message,code='AUTH_REQUIRED')=>Object.assign(Error(message),{code});
export async function sessionRequest(path,body,token=''){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),credentials:'omit',cache:'no-store',signal:controller.signal});let result;try{result=await response.json();}catch{throw error('同步服务暂时不可用，本机数据已保留。','SERVICE_UNAVAILABLE');}if(!response.ok||result.ok===false)throw error(result.error||'同步未完成，本机数据已保留。',result.code||'SERVICE_UNAVAILABLE');return result;
 }catch(e){if(e.name==='AbortError')throw error('云端连接超时，本机数据已保留。','NETWORK_ERROR');throw e;}finally{clearTimeout(timer);}
}
const pending=new Map();
export async function ensureDeviceSession(uid){
 const session=read();if(!session||session.uid!==uid||Date.now()>session.expiresAt)throw error('请验证当前账号以恢复同步，本机数据已保留。');
 if(session.deviceToken)return session.deviceToken;
 if(pending.has(uid))return pending.get(uid);
 const task=(async()=>{let sdk;try{sdk=JSON.parse(localStorage.getItem('bmob')||'null');}catch{}if(String(sdk?.objectId||sdk?.id||'')!==String(uid)||!sdk?.sessionToken)throw error('请验证当前账号以启用多设备同步，本机数据已保留。');const issued=await sessionRequest('/auth',{action:'exchange',uid,sessionToken:sdk.sessionToken});const current=read();if(current?.uid!==uid||current?.loginAt!==session.loginAt)throw error('账号已切换，已停止旧账号同步。');localStorage.setItem(SESSION_KEY,JSON.stringify({...current,deviceToken:issued.deviceToken,expiresAt:Math.min(current.expiresAt,issued.expiresAt)}));return issued.deviceToken;})();pending.set(uid,task);try{return await task;}finally{if(pending.get(uid)===task)pending.delete(uid);}
}
export function accountCloudQuery(uid){
 return table=>{if(table!=='user_data')throw Error('Unsupported cloud table');const filters={},fields={};let limit=100,offset=0;
 const request=async action=>{const token=await ensureDeviceSession(uid);const before=read();const result=await sessionRequest('/cloud-data',{action,key:filters.key||fields.key,offset,limit,...(fields.id?{objectId:fields.id}:{}),...(action==='save'?{value:fields.value}:{})},token);if(read()?.uid!==uid||read()?.deviceToken!==before.deviceToken)throw error('账号已切换，已停止旧账号同步。');return result;};
 return {equalTo(key,_op,value){filters[key]=value;},limit(value){limit=value;},skip(value){offset=value;},order(){},set(key,value){fields[key]=value;},async find(){if(filters.userKey!==uid)throw error('账号归属不匹配。');return (await request('list')).results;},save(){if(fields.userKey!==uid)throw error('账号归属不匹配。');return request('save');}};
 };
}
export async function endDeviceSession(token){if(!token)return;try{await fetch('/auth',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action:'logout'}),credentials:'omit',cache:'no-store',keepalive:true});}catch{/* A local logout still succeeds offline; the remote token has a fixed expiry. */}}
