import {sessionRequest,endDeviceSession} from './device-session';
const SESSION_KEY='voyra_session_v1';
export const RETENTION_DAYS=180;
export const SESSION_DAYS=30;
export function getSession(){try{const value=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');if(!value?.uid)return null;if(Date.now()>value.expiresAt){clearSession();return null;}return value;}catch{return null;}}
export const isAuthed=()=>!!getSession();
export const currentUid=()=>getSession()?.uid||null;
export function clearSession(){let token;try{token=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')?.deviceToken;localStorage.removeItem(SESSION_KEY);localStorage.removeItem('bmob');}catch{}if(token)void endDeviceSession(token);}
export function userKey(base){const uid=currentUid();return uid?base+'_'+uid:base+'_local';}
function setSession(result){const user=result.user;if(!user?.objectId||!result.deviceToken)throw Error('登录服务未返回有效凭证。');const value={uid:user.objectId,username:user.username||'',loginAt:Date.now(),expiresAt:result.expiresAt,deviceToken:result.deviceToken};localStorage.setItem(SESSION_KEY,JSON.stringify(value));localStorage.removeItem('bmob');return user;}
export async function login(username,password){const previous=getSession()?.deviceToken;return setSession(await sessionRequest('/auth',{action:'login',username,password},previous));}
export async function register(username,password){const previous=getSession()?.deviceToken;return setSession(await sessionRequest('/auth',{action:'register',username,password},previous));}
export function logout(){clearSession();}
