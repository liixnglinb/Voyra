import {scheduleHash,stableSchedule,courseSignature} from './schedule-share.js';
const copy=value=>JSON.parse(JSON.stringify(value));
const keyOf=course=>String(course.id??`legacy-${scheduleHash(course)}`);
const timestamp=value=>Number.isFinite(Number(value))?Number(value):0;
const maxMap=(a={},b={})=>Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].map(key=>[key,Math.max(timestamp(a[key]),timestamp(b[key]))]));
export const DEFAULT_SCHEDULE_SETTINGS={startDate:'',overrideWeek:null,timeSlots:null};
export function unpackSchedule(value){
  if(value==null)return {courses:[],settings:{...DEFAULT_SCHEDULE_SETTINGS},_scheduleSync:{modified:{},removed:{},settingsAt:0}};
  if(typeof value!=='object'||!Array.isArray(value.courses)||value.courses.some(c=>!c||typeof c!=='object'))throw Error('课表数据无法读取，原数据已保留，请先导出备份。');
  return {...copy(value),settings:value.settings||{...DEFAULT_SCHEDULE_SETTINGS},_scheduleSync:{modified:{...value._scheduleSync?.modified},removed:{...value._scheduleSync?.removed},settingsAt:timestamp(value._scheduleSync?.settingsAt)}};
}
export function mergeSchedule(localValue,remoteValue){
  const local=unpackSchedule(localValue),remote=unpackSchedule(remoteValue);
  const modified=maxMap(local._scheduleSync.modified,remote._scheduleSync.modified),removed=maxMap(local._scheduleSync.removed,remote._scheduleSync.removed),rows=new Map();
  for(const payload of[local,remote])for(const course of payload.courses){
    const key=keyOf(course),revision=timestamp(payload._scheduleSync.modified[key]);
    if(timestamp(removed[key])>0&&timestamp(removed[key])>=revision)continue;
    const current=rows.get(key);
    if(!current){rows.set(key,{course,revision});continue;}
    if(stableSchedule(current.course)===stableSchedule(course))continue;
    if(courseSignature(current.course)===courseSignature(course)){rows.set(key,{course:{...course,...current.course},revision:Math.max(current.revision,revision)});continue;}
    if(revision!==current.revision){if(revision>current.revision)rows.set(key,{course,revision});continue;}
    const duplicate={...course,id:`${key}-preserved-${scheduleHash(course)}`};
    if(!timestamp(removed[keyOf(duplicate)]))rows.set(keyOf(duplicate),{course:duplicate,revision});
  }
  const settingsAt=Math.max(local._scheduleSync.settingsAt,remote._scheduleSync.settingsAt);
  const localHasSettings=local.settings.startDate||local.settings.timeSlots||local.settings.overrideWeek!=null;
  const settings=local._scheduleSync.settingsAt>remote._scheduleSync.settingsAt?local.settings:remote._scheduleSync.settingsAt>local._scheduleSync.settingsAt?remote.settings:
    (remote.settings.startDate||remote.settings.timeSlots||remote.settings.overrideWeek!=null)?remote.settings:localHasSettings?local.settings:remote.settings;
  return {...remote,...local,courses:[...rows.values()].map(v=>v.course),settings,_scheduleSync:{modified,removed,settingsAt}};
}
export class ScheduleStore{
  constructor({storage,key,cloud,isCurrent=()=>true,now=()=>Date.now()}){
    Object.assign(this,{storage,key,cloud,isCurrent,now});this.listeners=new Set();this.generation=0;this.running=null;this.status='local';this.error='';
    try{this.payload=unpackSchedule(JSON.parse(storage.getItem(key)||'null'));}catch(e){this.payload=unpackSchedule(null);this.error=e.message;this.invalid=true;this.status='error';}
  }
  snapshot(){return {payload:this.payload,status:this.status,error:this.error};}
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  emit(){for(const fn of this.listeners)fn(this.snapshot());}
  write(payload){
    if(!this.isCurrent())throw Error('账号已切换，请重新操作。');if(this.invalid)throw Error(this.error);
    const raw=this.storage.getItem(this.key);
    if(raw!==null&&this.storage.getItem(`${this.key}.original-v2`)===null)this.storage.setItem(`${this.key}.original-v2`,raw);
    this.storage.setItem(this.key,JSON.stringify(payload));this.payload=payload;
  }
  replace(courses,settings){
    const next=copy(this.payload),before=new Map(next.courses.map(c=>[keyOf(c),c]));
    const revision=Math.max(this.now(),...Object.values(next._scheduleSync.modified).map(timestamp),...Object.values(next._scheduleSync.removed).map(timestamp),next._scheduleSync.settingsAt)+1;
    if(courses!=null){next.courses=courses;const keys=new Set(courses.map(keyOf));for(const row of courses){const key=keyOf(row);if(stableSchedule(before.get(key))!==stableSchedule(row)){next._scheduleSync.modified[key]=revision;delete next._scheduleSync.removed[key];}}
      for(const key of before.keys())if(!keys.has(key))next._scheduleSync.removed[key]=revision;}
    if(settings!=null){next.settings=settings;next._scheduleSync.settingsAt=revision;}
    const disk=unpackSchedule(JSON.parse(this.storage.getItem(this.key)||'null'));
    this.write(mergeSchedule(next,disk));this.generation++;this.error='';this.status=this.cloud?'saving':'local';this.emit();this.sync();
  }
  sync(){
    if(this.running)return this.running;if(!this.cloud||!this.isCurrent()||this.invalid)return Promise.resolve();
    this.running=this.reconcile().finally(()=>{this.running=null;});return this.running;
  }
  async reconcile(){
    this.status='syncing';this.error='';this.emit();
    try{
      while(this.isCurrent()){
        const remote=await this.cloud.load();if(!this.isCurrent())return;
        if(remote!=null&&this.storage.getItem(`${this.key}.cloud-original-v2`)===null)this.storage.setItem(`${this.key}.cloud-original-v2`,JSON.stringify(remote));
        const next=mergeSchedule(this.payload,remote);
        if(stableSchedule(next)!==stableSchedule(this.payload)){this.write(next);this.emit();}
        const generation=this.generation;
        if(stableSchedule(next)!==stableSchedule(unpackSchedule(remote))){this.status='saving';this.emit();await this.cloud.save(copy(next));if(!this.isCurrent())return;}
        if(generation===this.generation)break;
      }
      if(this.isCurrent()){this.status='synced';this.emit();}
    }catch(e){if(this.isCurrent()){this.status='error';this.error=e.message||'暂时无法同步，课表已保存在本机。';this.emit();}}
  }
}
