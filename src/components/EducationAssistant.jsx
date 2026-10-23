import React,{useEffect,useRef,useState} from 'react';
import {Download,GraduationCap,Loader2,RefreshCw,ShieldCheck} from 'lucide-react';
import {EDU_TTL,validJobId} from '../lib/education-automation';
import {decodeScheduleShare} from '../lib/schedule-share';

export const EDU_PENDING='voyra.education.pending.v2';
export function educationCommand(type,id){document.dispatchEvent(new CustomEvent('voyra-edu:request',{detail:JSON.stringify({type,id})}));}
export function clearEducationImport(id,type='cancel'){
  educationCommand(type,id);
  try{const pending=JSON.parse(localStorage.getItem(EDU_PENDING)||'null');if(pending?.id===id)localStorage.removeItem(EDU_PENDING);}catch{/* Keep schedule saving independent of helper cleanup. */}
}
export const finishEducationImport=id=>clearEducationImport(id,'ack');
export default function EducationAssistant({owner,guard,onCourses,onManual}){
  const returnId=new URLSearchParams(location.hash.split('?')[1]||'').get('eduImport');
  const [installed,setInstalled]=useState(false),[job,setJob]=useState(null),[error,setError]=useState('');
  const refs=useRef({});refs.current={owner,onCourses};
  const pending=useRef(null),received=useRef('');
  useEffect(()=>{
    const saved=(()=>{try{return JSON.parse(localStorage.getItem(EDU_PENDING)||'null');}catch{return null;}})();
    pending.current=saved&&validJobId(saved.id)&&Date.now()-saved.created<EDU_TTL&&saved.owner===owner?saved:null;
    received.current='';setJob(null);setError('');
    if(returnId&&returnId!==pending.current?.id)setError('这次导入不属于当前账号，或任务已过期。请切回发起导入的账号，或重新开始。');
    function listen(event){
      if(typeof event.detail!=='string'||event.detail.length>250000)return;
      let data;try{data=JSON.parse(event.detail);}catch{return;}
      if(data.type==='ready'){setInstalled(data.version==='2.0.0');if(data.version!=='2.0.0')setError('请更新导入助手后刷新本页。');if(pending.current)educationCommand('status',pending.current.id);return;}
      if(data.type!=='status'||data.id!==pending.current?.id||pending.current.owner!==refs.current.owner)return;
      setJob(data);setError(data.status==='error'?data.message||'导入暂时失败，请重试。':'');
      if(data.status==='ready'&&data.code&&received.current!==data.id){
        try{const result=decodeScheduleShare(data.code);if(!result.courses.length)throw Error('没有识别到课程');received.current=data.id;refs.current.onCourses(result.courses,{id:data.id,semester:data.semester,weeks:data.weeks});}
        catch{setError('识别结果无法读取，请在学校页面重新检测。');}
      }
    }
    const ping=()=>{educationCommand('ping');if(pending.current)educationCommand('status',pending.current.id);};
    document.addEventListener('voyra-edu:reply',listen);window.addEventListener('focus',ping);document.addEventListener('visibilitychange',ping);
    ping();const timer=setInterval(ping,3000);
    return()=>{clearInterval(timer);document.removeEventListener('voyra-edu:reply',listen);window.removeEventListener('focus',ping);document.removeEventListener('visibilitychange',ping);};
  },[owner,returnId]);
  const start=()=>{
    if(!guard())return;
    const bytes=crypto.getRandomValues(new Uint8Array(16)),id=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
    const next={id,owner,created:Date.now()};
    try{localStorage.setItem(EDU_PENDING,JSON.stringify(next));}catch{setError('浏览器无法保存导入任务，请允许网站存储后重试。');return;}
    pending.current=next;received.current='';setError('');setJob({id,status:'probing',message:'正在检测校园内网…'});educationCommand('start',id);
  };
  const cancel=()=>{if(pending.current)educationCommand('cancel',pending.current.id);setJob(null);received.current='';try{localStorage.removeItem(EDU_PENDING);}catch{}pending.current=null;};
  const busy=job&&['probing','waiting','scanning'].includes(job.status);
  return <section className="cs-edu-auto" aria-label="自动教务导入">
    <div className="cs-edu-auto-title"><span><GraduationCap size={20}/></span><div><small>湖南人文科技学院</small><h3>登录一次，带回整学期课表</h3></div><b>{installed?'助手已连接':'首次设置'}</b></div>
    <p>内网优先 → 校外自动走 VPN → 登录后逐周识别 → 核对保存</p>
    {!installed?<>
      <ol className="cs-edu-install"><li>在支持扩展的浏览器安装 <a href="https://www.tampermonkey.net/" target="_blank" rel="noopener noreferrer">Tampermonkey</a> 并启用。</li><li><a href="/jsxsd-import.user.js" target="_blank" rel="noopener noreferrer">安装 Voyra 导入助手</a>，允许访问本站和学校页面。</li><li>返回并刷新本页，看到「助手已连接」即可开始。</li></ol>
      <a className="cs-btn primary cs-edu-open" href="/jsxsd-import.user.js" target="_blank" rel="noopener noreferrer"><Download size={16}/>安装 / 更新导入助手</a>
      <p className="cs-edu-browser-note">微信内置浏览器和部分手机浏览器无法运行扩展。可在支持 Tampermonkey 的浏览器操作，或使用下方手动导入；电脑导入后会同步到同账号手机。</p>
    </>:<>
      {busy?<div className="cs-edu-live" role="status" aria-live="polite"><Loader2 className="cs-spinning" size={18}/><div><b>{job.status==='probing'?'检测学校入口':job.status==='scanning'?'正在识别各周课程':'等待学校页面'}</b><p>{job.message}</p>{job.progress&&<progress max={job.progress.total} value={job.progress.done}/>}</div></div>:<button type="button" className="cs-btn primary cs-edu-open" onClick={start}><GraduationCap size={16}/>{job?.status==='ready'?'重新开始导入':'自动选择入口并开始'}</button>}
      {busy&&<button type="button" className="cs-quiet-action" onClick={cancel}>停止本次导入</button>}
      <p className="cs-edu-browser-note">学校页面会显示悬浮助手。请完成 VPN / 教务登录并选好学期，保持页面打开；识别完成后点「返回 Voyra 核对」。</p>
    </>}
    {error&&<p className="cs-import-error" role="alert">{error}</p>}
    <div className="cs-edu-auto-privacy"><ShieldCheck size={14}/><span>不读取账号密码 · 核对后才保存 · 保留原有课程</span></div>
    <button type="button" className="cs-quiet-action" onClick={()=>{if(busy)cancel();onManual();}}>无法安装助手？使用手动导入</button>
    {installed&&<button type="button" className="cs-quiet-action" onClick={()=>educationCommand('ping')}><RefreshCw size={13}/>重新检测助手连接</button>}
  </section>;
}
