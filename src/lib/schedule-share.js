export const SCHEDULE_SLOTS = ['1-2','3-4','5-6','7-8','晚自习1','晚自习2'];
const TYPES = ['every','odd','even'];
export const stableSchedule = value => JSON.stringify(value, (_key,v) => v && typeof v==='object' && !Array.isArray(v)
  ? Object.keys(v).sort().reduce((out,key)=>{out[key]=v[key];return out;},{}) : v);
export function scheduleHash(value) {
  let n=2166136261;for(const ch of stableSchedule(value))n=Math.imul(n^ch.charCodeAt(0),16777619);
  return (n>>>0).toString(36);
}
const b64encode = value => {
  const bytes=new TextEncoder().encode(value);let text='';for(const byte of bytes)text+=String.fromCharCode(byte);
  return btoa(text).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const b64decode = value => new TextDecoder().decode(Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),ch=>ch.charCodeAt(0)));
const unescapeV2 = value => String(value||'').replace(/%(7c|7e|3b|2c)/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
export function sharedCourseShape(course) {
  const periods=Array.isArray(course.periods)&&course.periods.length?course.periods:[course];
  return {name:String(course.name||'').trim(),teacher:String(course.teacher||''),room:String(course.room||''),credit:String(course.credit||''),note:String(course.note||''),
    ...(Number.isInteger(course.color)?{color:course.color}:{}),
    periods:periods.map(p=>({day:Number(p.day),slot:p.slot,f:Number(p.f)||1,t:Number(p.t)||16,type:TYPES.includes(p.type)?p.type:'every',
      ...(p.customTime?.start&&p.customTime?.end?{customTime:{start:p.customTime.start,end:p.customTime.end}}:{})}))};
}
export const courseSignature = course => stableSchedule(sharedCourseShape(course));
export function validateSharedCourses(courses) {
  if(!Array.isArray(courses)||!courses.length||courses.length>300)throw Error('分享内容没有有效课程，或超过 300 门课程。');
  return courses.map((course,i)=>{
    if(!course||typeof course!=='object')throw Error('分享内容格式不正确。');
    const row=sharedCourseShape(course);
    if(!row.name||row.name.length>200||!row.periods.length||row.periods.length>100)throw Error('分享中有无效的课程名称或上课时段。');
    for(const p of row.periods){
      if(!Number.isInteger(p.day)||p.day<1||p.day>7||!SCHEDULE_SLOTS.includes(p.slot)||!Number.isInteger(p.f)||!Number.isInteger(p.t)||p.f<1||p.t>20||p.f>p.t)throw Error('分享中有无效的星期、节次或周次。');
      if(p.customTime&&(!/^\d{2}:\d{2}$/.test(p.customTime.start)||!/^\d{2}:\d{2}$/.test(p.customTime.end)||p.customTime.start>=p.customTime.end))throw Error('分享中有无效的自定义时间。');
    }
    return {...row,id:`shared-${scheduleHash(row)}-${i}`};
  });
}
export function encodeScheduleShare(courses,settings,withDetail=true) {
  const rows=validateSharedCourses(courses).map(({id,...row})=>withDetail?row:{...row,teacher:'',room:''});
  const data={version:3,courses:rows,settings:{startDate:settings?.startDate||'',overrideWeek:settings?.overrideWeek??null,timeSlots:settings?.timeSlots||null}};
  return 'VOYRA3:'+b64encode(JSON.stringify(data));
}
export function decodeScheduleShare(text) {
  const source=String(text||'').trim();
  let raw=source;
  if(!source.startsWith('VOYRA')){
    try {const url=new URL(source,globalThis.location?.origin||'https://lxlrwxs.top');raw=new URLSearchParams(url.hash.split('?')[1]||url.search).get('share')||source;}catch{/* raw code below */}
  }
  const match=raw.replace(/\s+/g,'').match(/VOYRA([123]):([A-Za-z0-9_-]+)/);
  if(!match)throw Error('没有识别到有效的课表分享内容。');
  let payload;
  try{
    const body=b64decode(match[2]);
    if(match[1]==='3')payload=JSON.parse(body);
    else if(match[1]==='1')payload={courses:JSON.parse(body).map(c=>({name:c.n,teacher:c.t,room:c.r,color:c.c,credit:c.k,note:c.o,
      periods:(c.p||[]).map(([day,slot,f,t,type,ct])=>({day,slot,f,t,type:TYPES[type]||'every',...(ct?{customTime:{start:ct.split('-')[0],end:ct.split('-')[1]}}:{})}))}))};
    else payload={courses:body.split('|').filter(Boolean).map(row=>{
      const [name,color,credit,note,teacher,room,periods]=row.split('~');
      return {name:unescapeV2(name),teacher:unescapeV2(teacher),room:unescapeV2(room),credit:unescapeV2(credit),note:unescapeV2(note),...(color!==''?{color:Number(color)}:{}),
        periods:String(periods||'').split(';').filter(Boolean).map(seg=>{const [day,slot,f,t,type,ct]=seg.split(',');return {day:Number(day),slot:SCHEDULE_SLOTS[Number(slot)],f:Number(f),t:Number(t),type:TYPES[type]||'every',...(ct?{customTime:{start:ct.split('-')[0],end:ct.split('-')[1]}}:{})};})};
    })};
  }catch{throw Error('分享内容无法解析，请让分享者重新生成链接。');}
  const courses=validateSharedCourses(payload?.courses);
  const rawSettings=payload?.settings;
  let settings=null;
  if(rawSettings&&typeof rawSettings==='object'){
    const startDate=String(rawSettings.startDate||'');
    if(startDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||!Number.isFinite(new Date(startDate+'T00:00:00').getTime())))throw Error('分享中的开学日期无效。');
    const overrideWeek=rawSettings.overrideWeek==null?null:Number(rawSettings.overrideWeek);
    if(overrideWeek!=null&&(!Number.isInteger(overrideWeek)||overrideWeek<1||overrideWeek>20))throw Error('分享中的当前周次无效。');
    let timeSlots=null;
    if(rawSettings.timeSlots&&typeof rawSettings.timeSlots==='object'){
      timeSlots={};for(const [slot,time]of Object.entries(rawSettings.timeSlots)){
        if(!SCHEDULE_SLOTS.includes(slot)||typeof time!=='string'||!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(time)||time.slice(0,5)>=time.slice(6))throw Error('分享中的作息时间无效。');
        timeSlots[slot]=time;
      }
    }
    settings={startDate,overrideWeek,timeSlots};
  }
  return {courses,settings,fingerprint:scheduleHash({courses:courses.map(({id,...r})=>r),settings})};
}
export function shareIdFromText(text,origin=globalThis.location?.origin||'https://lxlrwxs.top') {
  try{
    const url=new URL(String(text).trim(),origin);
    if(![new URL(origin).hostname,'lxlrwxs.top','www.lxlrwxs.top'].includes(url.hostname))return null;
    return url.pathname.match(/^\/s\/([A-Za-z0-9]{7})\/?$/)?.[1]||new URLSearchParams(url.hash.split('?')[1]||url.search).get('shareId');
  }catch{return null;}
}
export async function fetchScheduleShare(text,{fetcher=fetch,signal}={}) {
  const id=shareIdFromText(text);
  if(!id)return decodeScheduleShare(text);
  const response=await fetcher(`/share?id=${encodeURIComponent(id)}`,{signal,headers:{Accept:'application/json'}});
  const data=await response.json();
  if(!response.ok||!data.ok||!data.code)throw Error(data.error==='expired'?'分享链接已过期，请让分享者重新生成。':'分享链接暂时无法读取，请稍后重试。');
  return {...decodeScheduleShare(data.code),shareId:id};
}
export function mergeReceivedCourses(existing,incoming,idFactory=()=>`course_${crypto.randomUUID()}`) {
  const signatures=new Set(existing.map(courseSignature)),courses=[...existing];let added=0;
  for(const row of validateSharedCourses(incoming)){
    const signature=courseSignature(row);if(signatures.has(signature))continue;
    signatures.add(signature);const {id,...fields}=row;courses.push({...fields,id:idFactory()});added++;
  }
  return {courses,added,skipped:incoming.length-added};
}
