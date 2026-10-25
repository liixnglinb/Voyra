import React,{useEffect,useRef,useState} from 'react';
import {Check,Copy,Download,GraduationCap,Loader2,RefreshCw,ShieldCheck,ExternalLink} from 'lucide-react';
import {EDU_TTL,EDU_VERSION,validJobId} from '../lib/education-automation';
import {decodeScheduleShare} from '../lib/schedule-share';
export const EDU_PENDING='voyra.education.pending.v2';
const COMPLETED='voyra.education.completed.v3';
const readJSON=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key)||'null')||fallback;}catch{return fallback;}};
export function educationCommand(type,id,options={}){document.dispatchEvent(new CustomEvent('voyra-edu:request',{detail:JSON.stringify({...options,type,id})}));}
export function clearEducationImport(id,type='cancel'){
  educationCommand(type,id);
  try{if(readJSON(EDU_PENDING)?.id===id)localStorage.removeItem(EDU_PENDING);}catch{/* Saving is independent of helper cleanup. */}
}
export const finishEducationImport=id=>clearEducationImport(id,'ack');
export default function EducationAssistant({owner,guard,onCourses,onManual,syncStatus,accountName}){
  const returnId=new URLSearchParams(location.hash.split('?')[1]||'').get('eduImport');
  const [installed,setInstalled]=useState(false),[version,setVersion]=useState(''),[job,setJob]=useState(null),[error,setError]=useState('');
  const [setup,setSetup]=useState(()=>new URLSearchParams(location.hash.split('?')[1]||'').get('eduSetup')==='1'),[managerReady,setManagerReady]=useState(false),[setupMessage,setSetupMessage]=useState(''),[autoSave,setAutoSave]=useState(true),[copying,setCopying]=useState(false);
  const refs=useRef({});refs.current={owner,onCourses};
  const pending=useRef(null),received=useRef(''),startTimer=useRef(null);
  useEffect(()=>{
    const saved=readJSON(EDU_PENDING),completed=readJSON(COMPLETED,[]).find?.(item=>item?.id===returnId&&item.owner===owner&&Date.now()-item.created<EDU_TTL);
    pending.current=saved&&validJobId(saved.id)&&Date.now()-saved.created<EDU_TTL&&saved.owner===owner?saved:null;
    received.current='';setJob(completed?{...completed,status:'saved'}:null);setError('');
    if(returnId&&returnId!==pending.current?.id&&!completed)setError('这次导入不属于当前账号，或任务已过期。请切回发起导入的账号，或重新开始。');
    async function listen(event){
      if(typeof event.detail!=='string'||event.detail.length>250000)return;
      let data;try{data=JSON.parse(event.detail);}catch{return;}
      if(data.type==='ready'){
        const connected=data.version===EDU_VERSION;setVersion(data.version||'');setInstalled(connected);
        if(connected){setSetup(false);setSetupMessage('助手已连接，可以开始导入。');}else setSetupMessage('检测到旧版助手，请按下方步骤更新。');
        if(pending.current)educationCommand('status',pending.current.id);return;
      }
      if(data.type!=='status'||data.id!==pending.current?.id||pending.current.owner!==refs.current.owner)return;
      setJob(previous=>({...previous,...data}));
      if(data.status==='ready'&&data.code&&received.current!==data.id){
        const task=pending.current;received.current=data.id;
        try{
          if(data.progress&&data.progress.done!==data.progress.total)throw Error('还有周次未读取完成，已暂停保存。');
          const result=decodeScheduleShare(data.code);if(!result.courses.length)throw Error('没有识别到课程');
          if(task.autoSave)setJob(previous=>({...previous,status:'saving',message:'所有周次已读取，正在合并到你的课表…'}));
          const receipt=await refs.current.onCourses(result.courses,{id:data.id,semester:data.semester,weeks:data.weeks,autoSave:task.autoSave===true});
          if(refs.current.owner!==task.owner||pending.current?.id!==task.id)return;
          if(task.autoSave){
            if(!receipt?.ok)throw Error(receipt?.error||'保存未完成，读取结果仍保留，请重试保存。');
            const complete={id:data.id,owner:task.owner,created:Date.now(),added:receipt.added,total:result.courses.length,semester:data.semester,weeks:data.weeks,progress:data.progress};
            const old=readJSON(COMPLETED,[]);localStorage.setItem(COMPLETED,JSON.stringify([...(Array.isArray(old)?old:[]).filter(item=>item?.id!==data.id),complete].slice(-8)));
            finishEducationImport(data.id);pending.current=null;setError('');setJob({...complete,status:'saved'});
          }
        }catch(e){setError(e.message||'保存未完成，读取结果仍保留。');}
      }
    }
    const ping=()=>{educationCommand('ping');if(pending.current)educationCommand('status',pending.current.id);};
    document.addEventListener('voyra-edu:reply',listen);window.addEventListener('focus',ping);document.addEventListener('visibilitychange',ping);
    ping();const timer=setInterval(ping,3000);
    return()=>{clearInterval(timer);clearTimeout(startTimer.current);document.removeEventListener('voyra-edu:reply',listen);window.removeEventListener('focus',ping);document.removeEventListener('visibilitychange',ping);};
  },[owner,returnId]);
  const start=()=>{
    if(!installed){setSetup(true);return;}if(!guard())return;
    const id=[...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');
    const next={id,owner,created:Date.now(),autoSave};
    try{localStorage.setItem(EDU_PENDING,JSON.stringify(next));}catch{setError('浏览器无法保存导入任务，请允许网站存储后重试。');return;}
    pending.current=next;received.current='';setError('');setJob({id,status:'probing',message:'正在检测校园内网，最多等待 5.5 秒…'});
    clearTimeout(startTimer.current);startTimer.current=setTimeout(()=>{if(pending.current?.id===id)setJob(previous=>previous?.id===id&&previous.status==='probing'?{...previous,status:'error',message:'助手未响应，请确认已启用，再刷新页面重新检测。'}:previous);},10000);
    educationCommand('start',id,{autoSave});
  };
  const cancel=()=>{if(pending.current)clearEducationImport(pending.current.id);setJob(null);setError('');received.current='';pending.current=null;};
  const retrySave=()=>{received.current='';setError('');if(pending.current)educationCommand('status',pending.current.id);};
  const install=()=>{
    if(!managerReady)return;window.open('/jsxsd-import.user.js','_blank','noopener,noreferrer');
    setSetupMessage('已打开安装确认页。请点「安装 / 更新」，然后返回这里刷新检测。如果仍看到代码，请展开下方排查。');
  };
  const copyCode=async()=>{
    setCopying(true);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try{const response=await fetch('/jsxsd-import.user.js',{cache:'no-store',signal:controller.signal}),code=await response.text();if(!response.ok||!code.startsWith('// ==UserScript==')||!code.includes('@version      '+EDU_VERSION))throw Error();await navigator.clipboard.writeText(code);setSetupMessage('助手内容已复制。打开 Tampermonkey → 添加新脚本 → 替换编辑器全部内容 → 保存，再回本站刷新。');}
    catch{setSetupMessage('复制未完成。请下载助手文件，在脚本管理器中导入，然后刷新本站。');}finally{clearTimeout(timer);setCopying(false);}
  };
  const busy=job&&['probing','waiting','scanning','saving'].includes(job.status),step=job?.status==='saved'?4:job?.status==='scanning'||job?.progress?3:job?.status==='waiting'?2:job?.status==='probing'?1:0;
  const progress=job?.progress;
  return <section className="cs-edu-auto" aria-label="自动教务导入">
    <div className="cs-edu-auto-title"><span><GraduationCap size={20}/></span><div><small>湖南人文科技学院</small><h3>登录学校，自动带回整学期课表</h3></div><b>{installed?'助手已连接':version?'需要更新':'首次设置'}</b></div>
    <ol className="cs-edu-pipeline" aria-label="自动导入流程">{['连接助手','选择入口','登录学校','读取各周','保存完成'].map((label,index)=><li key={label} data-state={index<step?'done':index===step?'current':'pending'}><span>{index<step?<Check size={12}/>:index+1}</span><small>{label}</small></li>)}</ol>
    {!installed?<>
      <p className="cs-edu-description">首次使用先连接浏览器助手。完成一次设置后，登录学校即可自动读取各周课程。</p>
      <button type="button" className="cs-btn primary cs-edu-open" onClick={()=>{setSetup(!setup);if(version)setManagerReady(true);}}><Download size={16}/>{setup?'收起安装步骤':'安装 / 更新导入助手'}</button>
      {setup&&<div className="cs-edu-setup" aria-label="助手安装引导">
        <div><b><span>1</span>安装脚本管理器</b><p>先安装并启用 Tampermonkey，它负责在学校网页运行导入助手。</p><a className="cs-btn" href="https://www.tampermonkey.net/" target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>打开官方下载页</a></div>
        <div><b><span>2</span>允许助手运行</b><p>在扩展的设置中启用「允许运行用户脚本」。如果没有这个开关，按官方说明启用开发者模式，并允许访问本站和学校网页。</p><a href="https://www.tampermonkey.net/faq.php?q=Q209" target="_blank" rel="noopener noreferrer">查看权限设置说明</a><label className="cs-edu-manager-check"><input type="checkbox" checked={managerReady} onChange={e=>setManagerReady(e.target.checked)}/>我已安装并启用脚本管理器</label></div>
        <div><b><span>3</span>安装助手并连接</b><p>打开安装确认窗口，选择「安装 / 更新」。完成后回到这里刷新，即可检测连接。</p><button type="button" className="cs-btn primary" disabled={!managerReady} onClick={install}>打开助手安装确认</button><button type="button" className="cs-btn" onClick={()=>location.reload()}><RefreshCw size={14}/>安装完成，刷新检测</button></div>
        <details className="cs-edu-install-help"><summary>仍然显示代码，或没有安装窗口？</summary><p>这表示脚本管理器没有接管安装。请先确认已启用管理器与用户脚本权限；也可以复制助手内容，在管理器的「添加新脚本」中替换全部内容后保存。</p><button type="button" className="cs-btn" onClick={copyCode} disabled={copying}>{copying?<Loader2 className="cs-spinning" size={14}/>:<Copy size={14}/>}复制助手内容</button><a className="cs-btn" href="/jsxsd-import.user.js" download="voyra-education-import.user.js"><Download size={14}/>下载助手文件</a></details>
        {setupMessage&&<p className="cs-edu-setup-message" role="status">{setupMessage}</p>}
      </div>}
      <p className="cs-edu-browser-note">请在支持浏览器扩展的浏览器中操作。微信内置浏览器无法运行助手，可使用手动导入，或在电脑导入后同步到手机。</p>
    </>:<>
      {job?.status==='saved'?<div className="cs-edu-complete" role="status"><Check size={24}/><div><b>课表已自动保存</b><p>{job.added?'新增 '+job.added+' 门课程':'相同课程已自动去重'} · {job.weeks?.length?'完整读取 '+job.weeks.length+' 周':'整学期课表'} · 原有课程保留</p><small>{accountName?'保存到「'+accountName+'」 · ':''}{syncStatus==='synced'?'云端已同步':syncStatus==='error'?'本机已保存，云端稍后重试':'已保存在本机，正在后台同步'}</small></div></div>:null}
      {(busy||job?.status==='error'||progress)&&job?.status!=='saved'&&<div className="cs-edu-live" role="status" aria-live="polite">{busy?<Loader2 className="cs-spinning" size={18}/>:<RefreshCw size={18}/>}<div><b>{job.status==='probing'?'正在检测学校入口':job.status==='scanning'?'正在读取每周课程':job.status==='saving'?'正在保存课表':job.status==='error'?'读取已暂停，已完成周次保留':'等待学校登录并定位课表'}</b><p>{job.message}</p>{progress&&<><div className="cs-edu-progress-numbers"><strong>{progress.done} / {progress.total} 周</strong><span>识别 {progress.courseCount||0} 门课程</span></div><progress aria-label="各周课表读取进度" max={progress.total} value={progress.done}/><div className="cs-edu-week-board">{Array.from({length:progress.total},(_,i)=>i+1).map(week=><span key={week} data-state={progress.completed?.includes(week)?'done':week===progress.week?(job.status==='error'?'error':'reading'):'waiting'} title={progress.completed?.includes(week)?(progress.counts?.[week]||0)+' 门课程':'等待检查'}>第{week}周<small>{progress.completed?.includes(week)?(progress.counts?.[week]?'已读取':'无课程'):week===progress.week?(job.status==='error'?'待重试':'读取中'):'等待'}</small></span>)}</div></>}</div></div>}
      {!busy&&<><label className="cs-edu-save-option"><input type="checkbox" checked={autoSave} onChange={e=>setAutoSave(e.target.checked)}/>读取完成后自动保存到当前账号</label><button type="button" className="cs-btn primary cs-edu-open" onClick={start}><GraduationCap size={16}/>{job?.status==='saved'?'重新导入课表':'自动选择入口并开始'}</button></>}
      {busy&&<button type="button" className="cs-quiet-action" onClick={cancel}>停止本次导入</button>}
      <p className="cs-edu-browser-note">内网优先，无法连接时切换学校 VPN。登录后会查找「我的课表」，在悬浮助手显示逐周进度；全部读取成功后返回本站{pending.current?.autoSave||autoSave?'自动保存':'核对保存'}。</p>
    </>}
    {(error||job?.status==='error')&&<p className="cs-import-error" role="alert">{error||job.message}</p>}
    {error&&pending.current&&<button type="button" className="cs-btn" onClick={retrySave}>重试保存读取结果</button>}
    <div className="cs-edu-auto-privacy"><ShieldCheck size={14}/><span>不读取账号密码 · 仅完整读取后保存 · 原有课程保留</span></div>
    <button type="button" className="cs-quiet-action" onClick={()=>{if(busy)cancel();onManual();}}>无法安装助手？使用手动导入</button>
    {installed&&<button type="button" className="cs-quiet-action" onClick={()=>educationCommand('ping')}><RefreshCw size={13}/>重新检测助手连接</button>}
  </section>;
}
