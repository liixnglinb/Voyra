import {mergeSchedule,unpackSchedule,sameSchedule} from './schedule-data.js';

export const SCHEDULE_CLOUD_KEY='schedule-classes-v1';
const DEVICE_KEY='voyra.schedule.device.v1';
const normalError=error=>{
  if(['AUTH_REQUIRED','UPSTREAM_AUTH_REQUIRED',211].includes(error?.code)||([122,209].includes(Number(error?.code))&&/session|登录|expired|凭据/i.test(error?.message||error?.error||''))){const result=Error('请在任意一台设备验证账号，其他已登录设备会自动恢复同步。本机课表已保留。');result.code='AUTH_REQUIRED';return result;}
  if(error instanceof Error)return error;
  return Object.assign(Error(error?.error||error?.message||'云端暂时不可用，本机课表已保留。'),{code:error?.code});
};

// Each browser keeps its own cloud row. Different devices never overwrite one another's row.
// Legacy and duplicate rows remain readable and are merged; no historical row is deleted.
export function createScheduleCloud({Bmob,uid,storage,assertCurrent,now=()=>Date.now(),timeoutMs=15000}){
  const localKey=`ClassScheduleData_${uid}`,deviceKey=`${DEVICE_KEY}_${uid}`;
  let queue=Promise.resolve();
  async function request(promise){
    let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('云端连接超时，本机课表已保留，请稍后重试。')),timeoutMs);})]);}finally{clearTimeout(timer);}
  }
  function deviceId(){
    let id=storage.getItem(deviceKey);
    if(!id){id=crypto.randomUUID();storage.setItem(deviceKey,id);}
    return id;
  }
  async function rows(){
    const found=[];
    for(let offset=0;offset<5000;offset+=100){
      assertCurrent();const query=Bmob.Query('user_data');query.equalTo('userKey','==',uid);query.equalTo('key','==',SCHEDULE_CLOUD_KEY);query.order('createdAt','objectId');query.limit(100);query.skip(offset);
      const batch=await request(query.find());assertCurrent();
      if(!Array.isArray(batch))throw Error('云端响应格式异常，未覆盖本机课表。');
      if(batch.some(row=>!row||!row.objectId||(row.userKey!=null&&row.userKey!==uid)||(row.key!=null&&row.key!==SCHEDULE_CLOUD_KEY)))throw Error('云端课表归属不匹配，已停止同步。');
      found.push(...batch);if(batch.length<100)return found;
    }
    throw Error('云端课表版本过多，请先导出备份后处理。');
  }
  function archive(records){
    if(!records.length)return;
    assertCurrent();const key=localKey+'.cloud-rows-v1',value=records.map(({objectId,value,createdAt,updatedAt})=>({objectId,value,createdAt,updatedAt}));
    const old=JSON.parse(storage.getItem(key)||'[]');
    if(JSON.stringify(old.at(-1)?.rows)===JSON.stringify(value))return;
    storage.setItem(key,JSON.stringify([...old,{time:now(),rows:value}].slice(-8)));
  }
  function collect(records){
    let value=unpackSchedule(null);
    for(const row of records){let payload;try{payload=typeof row.value==='string'?JSON.parse(row.value):row.value;unpackSchedule(payload);}catch{throw Error('云端有无法读取的课表版本，原文已备份，未覆盖任何记录。');}
      if(payload==null)throw Error('云端课表版本为空，已停止同步并保留备份。');
      value=mergeSchedule(value,payload);
    }
    return value;
  }
  async function read(){const records=await rows();archive(records);return {records,value:collect(records)};}
  async function load(){try{return (await read()).value;}catch(error){throw normalError(error);}}
  async function commit(payload){
    assertCurrent();const id=deviceId(),{records,value}=await read(),merged=mergeSchedule(value,payload);
    const mine=records.find(row=>{const value=typeof row.value==='string'?JSON.parse(row.value):row.value;return value?._scheduleSync?.deviceId===id;});
    if(mine&&sameSchedule(merged,typeof mine.value==='string'?JSON.parse(mine.value):mine.value))return {ok:true,value:merged};
    assertCurrent();const query=Bmob.Query('user_data');if(mine)query.set('id',mine.objectId);
    query.set('userKey',uid);query.set('key',SCHEDULE_CLOUD_KEY);query.set('value',JSON.stringify({...merged,_scheduleSync:{...merged._scheduleSync,deviceId:id}}));query.set('ACL',{[uid]:{read:true,write:true}});
    const result=await request(query.save());assertCurrent();
    if(!result||result.error||result.code||(!result.objectId&&!result.updatedAt&&!result.createdAt))throw normalError(result||Error('云端未确认保存，本机课表已保留。'));
    return {ok:true,value:merged};
  }
  async function save(payload){
    const task=()=>globalThis.navigator?.locks?.request?globalThis.navigator.locks.request(`voyra-schedule:${uid}:${deviceId()}`,()=>commit(payload)):commit(payload);
    const pending=queue.then(task,task);queue=pending.catch(()=>{});
    try{return await pending;}catch(error){throw normalError(error);}
  }
  return {load,save};
}
