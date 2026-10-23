import {htmlTimetableRows,parseEducationRows,educationSlot} from './education-import.js';

export const HUHST={id:'huhst',name:'湖南人文科技学院',intranet:'http://10.1.1.149/jsxsd/',vpn:'http://vpn.huhst.edu.cn:9900/'};
export const EDU_VERSION='2.0.0';
export const EDU_TTL=60*60*1000;
export const validJobId=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
export const allowedReturnOrigin=origin=>origin==='https://lxlrwxs.top'||/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin);
export const allowedSchoolURL=url=>{
  try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)&&['10.1.1.149','vpn.huhst.edu.cn'].includes(u.hostname);}catch{return false;}
};
export const activeJob=job=>job&&validJobId(job.id)&&allowedReturnOrigin(job.returnOrigin)&&Date.now()-job.created>=0&&Date.now()-job.created<EDU_TTL;

// Runs on the user's device, never on a server. A slow login is not a network failure.
export async function chooseEducationNetwork(request,signal){
  signal?.throwIfAborted();
  try{
    const response=await request(HUHST.intranet,signal);
    signal?.throwIfAborted();
    const school=/湖南人文|教务|强智|jsxsd|jkingo|caslogin/i.test(response.text||'');
    if(response.status>=200&&response.status<400&&school&&allowedSchoolURL(response.url||HUHST.intranet))return {network:'campus',url:HUHST.intranet};
  }catch(error){if(signal?.aborted)throw error;}
  signal?.throwIfAborted();
  return {network:'vpn',url:HUHST.vpn};
}
export function mergeEducationWeeks(batches){
  const map=new Map();
  for(const courses of batches)for(const course of courses){
    const key=JSON.stringify([course.name,course.teacher||'',course.room||'',course.note||'']);
    if(!map.has(key))map.set(key,{...course,periods:[]});
    const target=map.get(key);
    for(const p of course.periods||[])if(!target.periods.some(existing=>JSON.stringify(existing)===JSON.stringify(p)))target.periods.push({...p});
  }
  return [...map.values()].map((course,index)=>{
    const ordered=course.periods.sort((a,b)=>a.day-b.day||a.slot.localeCompare(b.slot)||a.f-b.f),periods=[];
    for(const p of ordered){const last=periods.at(-1);if(last&&last.day===p.day&&last.slot===p.slot&&last.type===p.type&&p.f===last.t+1)last.t=p.t;else periods.push({...p});}
    return {...course,id:`edu-auto-${index}`,periods};
  });
}
export function schoolDocuments(root){
  const docs=[root];
  for(let depth=0,offset=0;depth<3;depth++){
    const current=docs.slice(offset);offset=docs.length;
    for(const doc of current)for(const frame of doc.querySelectorAll('iframe,frame'))try{if(frame.contentDocument&&!docs.includes(frame.contentDocument))docs.push(frame.contentDocument);}catch{/* The helper also runs inside school frames. */}
  }
  return docs;
}
export function timetableDocument(doc){
  for(const table of doc.querySelectorAll('table')){
    if(table.closest('[data-voyra-helper]'))continue;
    const rows=htmlTimetableRows(table.outerHTML,doc);
    if(rows.some(row=>row.filter(cell=>/^(?:星期|周)\s*[一二三四五六日天](?:\s|$)/.test(cell)).length>=3)&&rows.some(row=>row.slice(0,3).some(cell=>educationSlot(cell))))return {doc,table,rows};
  }
  return null;
}
function weekNumber(option){
  const match=option.textContent.trim().match(/^(?:第\s*)?(\d{1,2})\s*(?:周)?$/);
  return match?Number(match[1]):null;
}
export function describeTimetable(doc,url=doc.location?.href){
  const found=timetableDocument(doc);if(!found)return null;
  const selectors=[...doc.querySelectorAll('select')].map(select=>({select,weeks:[...select.options].map(option=>({week:weekNumber(option),value:option.value})).filter(option=>option.week>=1&&option.week<=30)}));
  const control=selectors.find(({select,weeks})=>weeks.length>=2&&(/zc|week|zhou/i.test(select.name)||/周/.test(select.textContent)));
  if(!control)return {...found,url,weeks:[],semester:semesterLabel(doc)};
  if(control.weeks.some(option=>option.week>20))throw Error('教务系统超过 20 周，当前课表暂不支持完整保存；请先使用 Excel 分段导入。');
  const form=control.select.form;
  if(!form||!control.select.name)throw Error('未找到周次查询表单。请选择「学期理论课表」后重试，或使用手动导入。');
  const action=new URL(form.getAttribute('action')||url,url);
  if(!allowedSchoolURL(action.href)||action.origin!==new URL(url).origin||!/xskb|xskbcx|kbxx|skb|kb.*cx/i.test(action.pathname))throw Error('未识别到安全的课表查询地址，请打开「我的课表 / 学期理论课表」。');
  const params=new URLSearchParams();
  for(const el of form.elements){
    if(!el.name||el.disabled||/password|file|submit|button|reset/i.test(el.type)||((el.type==='checkbox'||el.type==='radio')&&!el.checked))continue;
    if(el.tagName==='SELECT'&&el.multiple){for(const option of el.selectedOptions)params.append(el.name,option.value);}else params.append(el.name,el.value);
  }
  return {...found,url,form:{url:action.href,method:form.method.toUpperCase()==='POST'?'POST':'GET',params,weekName:control.select.name},weeks:[...new Map(control.weeks.map(option=>[option.week,option])).values()].sort((a,b)=>a.week-b.week),semester:semesterLabel(doc)};
}
function semesterLabel(doc){
  const select=[...doc.querySelectorAll('select')].find(el=>/xnxq|semester|term/i.test(el.name));
  return select?.selectedOptions[0]?.textContent.trim().slice(0,100)||'';
}
export async function collectEducationTimetable(description,{read,signal,onProgress=()=>{},checkpoint=new Map()}={}){
  signal?.throwIfAborted();
  if(!description.weeks.length){
    const courses=parseEducationRows(description.rows,{requireWeeks:true});
    if(!courses.length)throw Error('当前课表没有有效课程，请先选择正确学期。');
    return {courses:mergeEducationWeeks([courses]),weeks:[],semester:description.semester,mode:'semester'};
  }
  const key=JSON.stringify([description.form.url,description.form.params.toString(),description.semester,description.weeks]);
  if(checkpoint.key!==key){checkpoint.clear();checkpoint.key=key;}
  const total=description.weeks.length;
  for(const option of description.weeks){
    signal?.throwIfAborted();if(checkpoint.has(option.week))continue;
    onProgress({done:checkpoint.size,total,week:option.week});
    const doc=await read(description.form,option,signal);
    signal?.throwIfAborted();
    const found=timetableDocument(doc);
    if(!found&&doc.querySelector('input[type=password]'))throw Error('学校登录已失效，请重新登录后点「重新检测」。');
    if(!found)throw Error(`第 ${option.week} 周未返回完整课表，已暂停。请重新检测以继续；已读取的周次会保留。`);
    const echo=[...doc.querySelectorAll('select')].find(el=>el.name===description.form.weekName);
    if(!echo||echo.value!==option.value)throw Error(`第 ${option.week} 周的返回页面未确认周次，已暂停以免误导入。可改用学期课表。`);
    checkpoint.set(option.week,parseEducationRows(found.rows,{week:option.week}));
    onProgress({done:checkpoint.size,total,week:option.week});
  }
  const courses=mergeEducationWeeks([...checkpoint.values()]);
  if(!courses.length)throw Error('这些周次都没有课程，请检查所选学期。');
  return {courses,weeks:description.weeks.map(option=>option.week),semester:description.semester,mode:'weekly'};
}
