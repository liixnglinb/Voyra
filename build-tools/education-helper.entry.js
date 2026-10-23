/* Built into a self-contained userscript. School credentials never enter the bridge. */
import {HUHST,EDU_VERSION,activeJob,allowedReturnOrigin,allowedSchoolURL,validJobId,chooseEducationNetwork,schoolDocuments,describeTimetable,collectEducationTimetable} from '../src/lib/education-automation.js';
import {encodeScheduleShare} from '../src/lib/schedule-share.js';

function runHelper(){
const KEY='voyra.education.job.v2',PAGE='voyra-edu:request',REPLY='voyra-edu:reply';
const get=()=>GM_getValue(KEY,null),set=value=>GM_setValue(KEY,value);
const isSite=allowedReturnOrigin(location.origin);
const expired=get();if(expired&&!activeJob(expired))set(null);
const emit=value=>document.dispatchEvent(new CustomEvent(REPLY,{detail:JSON.stringify(value)}));
function request(url,{method='GET',body,signal,timeout=10000}={}){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(signal.reason);return;}
    let done=false,abort=()=>{};
    const end=(fn,value)=>{if(done)return;done=true;signal?.removeEventListener('abort',abort);fn(value);};
    const xhr=GM_xmlhttpRequest({method,url,data:body,timeout,headers:body?{'Content-Type':'application/x-www-form-urlencoded'}:{},
      onload:r=>end(resolve,{status:r.status,text:r.responseText,url:r.finalUrl||url}),
      ontimeout:()=>end(reject,Error('连接超时')),onerror:()=>end(reject,Error('无法连接')),onabort:()=>end(reject,Error('已停止'))});
    abort=()=>{xhr.abort();end(reject,signal.reason||Error('已停止'));};signal?.addEventListener('abort',abort,{once:true});
  });
}
function publish(job){
  if(!activeJob(job)||job.returnOrigin!==location.origin)return;
  emit({type:'status',id:job.id,status:job.status,network:job.network,progress:job.progress,message:job.message,code:job.code,semester:job.semester,weeks:job.weeks});
}
if(isSite){
  let controller;
  GM_addValueChangeListener(KEY,(_key,_old,value)=>publish(value));
  document.addEventListener(PAGE,async event=>{
    if(typeof event.detail!=='string'||event.detail.length>1000)return;
    let command;try{command=JSON.parse(event.detail);}catch{return;}
    if(command.type==='ping'){emit({type:'ready',version:EDU_VERSION});return;}
    if(!validJobId(command.id))return;
    const current=get();
    if(command.type==='status'){if(current?.id===command.id)publish(current);return;}
    if(command.type==='cancel'||command.type==='ack'){
      if(current?.id===command.id&&current.returnOrigin===location.origin){controller?.abort();set({...current,status:command.type==='ack'?'saved':'cancelled',code:undefined,progress:undefined});publish(get());}return;
    }
    if(command.type!=='start')return;
    if(activeJob(current)&&!['cancelled','saved','error','ready'].includes(current.status)){emit({type:'status',id:command.id,status:'error',message:'已有导入任务，请先停止后再开始。'});return;}
    controller?.abort();controller=new AbortController();const probeController=controller;
    const job={id:command.id,created:Date.now(),returnOrigin:location.origin,status:'probing',message:'正在检测校园内网…'};set(job);publish(job);
    try{
      const route=await chooseEducationNetwork((url,signal)=>request(url,{signal,timeout:5500}),probeController.signal);
      if(get()?.id!==job.id||get()?.status!=='probing')return;
      const next={...job,...route,status:'waiting',message:route.network==='campus'?'校园内网可用，请在学校页面登录。':'内网未连通，已切换学校外网入口。请先登录 VPN，再进入教务系统。'};
      set(next);publish(next);
      // Extension API creates the tab even after the asynchronous connectivity probe.
      GM_openInTab(route.url,{active:true,insert:true,setParent:true});
    }catch(error){if(!probeController.signal.aborted&&get()?.id===job.id){const value={...job,status:'error',message:error.message};set(value);publish(value);}}
  });
  emit({type:'ready',version:EDU_VERSION});
}else if(allowedSchoolURL(location.href)&&window.top===window.self){
  let controller=null,checking=false,paused=false,lastSignature='',checkpoint=new Map(),timer,navTried=false,wasLogin=false;
  const scanId=[...crypto.getRandomValues(new Uint8Array(12))].map(v=>v.toString(16).padStart(2,'0')).join('');
  let initial=get();if(!activeJob(initial)||!['waiting','scanning','error','ready'].includes(initial.status))return;
  const id=initial.id;
  const host=document.createElement('div');host.dataset.voyraHelper='';host.style.cssText='position:fixed;right:12px;bottom:max(12px,env(safe-area-inset-bottom));width:calc(100vw - 24px);max-width:340px;z-index:2147483647';
  const root=host.attachShadow({mode:'open'});
  root.innerHTML=`<style>:host{font:14px/1.65 system-ui,-apple-system,"Microsoft YaHei",sans-serif;color:#364735}*{box-sizing:border-box}section{background:#fffef8;border:1px solid #dedfc8;border-radius:18px;box-shadow:0 14px 50px #18250f40;overflow:hidden}header{display:flex;gap:8px;align-items:center;background:#f4f1df;padding:10px 14px}header b{flex:1;font-size:13px}button,a{font:inherit;cursor:pointer;min-height:44px;border-radius:10px;padding:8px 12px;text-align:center}header button{border:0;background:transparent;min-width:44px;font-size:18px;padding:4px}.body{padding:14px}h3{font-size:16px;margin:0 0 7px}p{font-size:12px;margin:0 0 10px;color:#78836b;overflow-wrap:anywhere}progress{width:100%;height:7px;accent-color:#9b8132;margin:7px 0 12px}.actions{display:flex;gap:8px}.actions button,.actions a{flex:1;border:1px solid #e0e2d4;background:white;color:#6b775e;font-size:12px}.actions .primary{background:#9b8132;border-color:#9b8132;color:white}footer{font-size:10px;color:#929a83;margin-top:11px}.collapsed .body{display:none}button:focus-visible,a:focus-visible{outline:2px solid #477d63;outline-offset:2px}@media(prefers-reduced-motion:no-preference){section{animation:enter .2s ease-out}@keyframes enter{from{opacity:0;transform:translateY(8px)}}}</style><section><header><b>Voyra · 教务导入助手</b><button aria-label="收起助手" title="收起助手">−</button></header><div class="body"><h3></h3><p role="status" aria-live="polite"></p><progress hidden></progress><div class="actions"><button class="retry">重新检测</button><button class="primary back" hidden>返回 Voyra 核对</button><button class="stop">停止</button></div><footer>只读取课表，不读取账号密码。选好学期后请保持此页打开。</footer></div></section>`;
  document.body.append(host);
  const title=root.querySelector('h3'),message=root.querySelector('[role=status]'),progress=root.querySelector('progress'),back=root.querySelector('.back');
  root.querySelector('header button').onclick=event=>{const collapsed=root.querySelector('section').classList.toggle('collapsed');event.currentTarget.textContent=collapsed?'+':'−';event.currentTarget.setAttribute('aria-label',collapsed?'展开助手':'收起助手');};
  function render(job){
    if(!job||job.id!==id||!activeJob(job)){stop();host.remove();return;}
    if(['cancelled','saved'].includes(job.status)){stop();title.textContent=job.status==='saved'?'已保存到 Voyra':'已停止导入';message.textContent='你可以关闭此页面。';progress.hidden=true;back.hidden=true;return;}
    title.textContent=job.status==='ready'?'课表已识别，等待核对':job.status==='scanning'?'正在读取各周课表':job.status==='error'?'识别已暂停':'请在学校页面完成登录';
    message.textContent=job.message||'';progress.hidden=!job.progress||job.status!=='scanning';
    if(job.progress){progress.max=job.progress.total;progress.value=job.progress.done;}
    back.hidden=job.status!=='ready';root.querySelector('.retry').disabled=job.status==='scanning';
  }
  function update(patch){const job=get();if(job?.id!==id||['cancelled','saved'].includes(job.status)||!activeJob(job))return;set({...job,...patch});render(get());}
  function stop(){paused=true;controller?.abort();clearInterval(timer);}
  root.querySelector('.stop').onclick=()=>{stop();update({status:'cancelled',code:undefined,progress:undefined});};
  back.onclick=()=>{const job=get();if(activeJob(job)&&job.id===id)GM_openInTab(job.returnOrigin+'/#/timetable?tab=courses&eduImport='+id,{active:true,insert:true});};
  root.querySelector('.retry').onclick=()=>{controller?.abort();paused=false;checking=false;lastSignature='';update({status:'waiting',message:'正在重新检查页面…',progress:undefined});check(true);};
  GM_addValueChangeListener(KEY,(_key,_old,value)=>render(value));
  async function readWeek(form,option,signal){
    const params=new URLSearchParams(form.params);params.set(form.weekName,option.value);
    const url=new URL(form.url);let body;
    if(form.method==='GET')for(const [key,value]of params)url.searchParams.set(key,value);else body=params.toString();
    const response=await request(url.href,{method:form.method,body,signal,timeout:15000});
    if(response.status!==200||!allowedSchoolURL(response.url)||new URL(response.url).origin!==new URL(form.url).origin)throw Error('学校课表查询失败或登录已过期，请重新登录后重试。');
    return new DOMParser().parseFromString(response.text,'text/html');
  }
  async function check(force=false){
    if(paused||checking)return;
    const job=get();if(!activeJob(job)||job.id!==id||['cancelled','saved','ready'].includes(job.status))return;
    if(job.lease&&job.lease.owner!==scanId&&job.lease.until>Date.now())return;
    const docs=schoolDocuments(document),login=docs.some(doc=>[...doc.querySelectorAll('input[type=password]')].some(el=>el.getClientRects().length));
    if(login){if(!wasLogin)update({status:'waiting',message:'请完成学校登录与验证码。助手会在登录后继续，等待登录期间不会切换入口。'});wasLogin=true;return;}
    wasLogin=false;
    let description;
    try{for(const doc of docs){description=describeTimetable(doc,doc.location?.href||location.href);if(description)break;}}
    catch(error){paused=true;update({status:'error',message:error.message});return;}
    if(!description){
      if(!navTried){
        const links=docs.flatMap(doc=>[...doc.querySelectorAll('a[href]')]).filter(link=>/^(?:我的课表|个人课表|学期理论课表|学生个人课表|个人课表查询|课表查询)$/.test(link.textContent.trim()));
        const link=links.find(link=>{try{const url=new URL(link.getAttribute('href'),link.ownerDocument.location.href);return allowedSchoolURL(url.href)&&!/logout|delete|save/i.test(url.pathname)&&/xskb|xskbcx|skb/i.test(url.pathname);}catch{return false;}});
        if(link){navTried=true;link.click();update({status:'waiting',message:'已打开课表查询，请确认学期；课表加载后自动识别。'});return;}
      }
      if(job.status!=='waiting'||!job.message?.includes('我的课表'))update({status:'waiting',message:'请进入「我的课表 / 学期理论课表」并选择本学期。若课表在嵌入页面中，请在新窗口打开课表；助手会自动检测。'});
      return;
    }
    const signature=JSON.stringify([description.url,description.semester,description.form?.params.toString(),description.rows]);
    if(!force&&lastSignature===signature)return;lastSignature=signature;checking=true;controller=new AbortController();
    try{
      update({status:'scanning',lease:{owner:scanId,until:Date.now()+30000},message:description.semester?`正在识别 ${description.semester}…`:'正在读取所选学期课表…',progress:undefined,code:undefined});
      // Two school tabs may discover a timetable simultaneously. Only the last lease holder reads.
      await new Promise(resolve=>setTimeout(resolve,120));
      controller.signal.throwIfAborted();
      if(get()?.lease?.owner!==scanId)return;
      const result=await collectEducationTimetable(description,{read:readWeek,signal:controller.signal,checkpoint,
        onProgress:value=>{if(get()?.lease?.owner!==scanId)controller.abort();else update({status:'scanning',lease:{owner:scanId,until:Date.now()+30000},progress:value,message:`已读取 ${value.done} / ${value.total} 周，正在检查第 ${value.week} 周…`});}});
      controller.signal.throwIfAborted();
      const code=encodeScheduleShare(result.courses,{},true);
      if(code.length>200000)throw Error('课表内容过大，请使用 Excel 导入。');
      if(get()?.lease?.owner!==scanId)return;
      update({status:'ready',lease:undefined,code,semester:result.semester,weeks:result.weeks,progress:undefined,message:`${result.semester ? result.semester+'：' : ''}已识别 ${result.courses.length} 门课程${result.mode==='weekly'?'，完整检查 '+result.weeks.length+' 个周次':''}。返回核对后保存；学期不对时，请改学期后点「重新检测」。`});
    }catch(error){if(!controller.signal.aborted){paused=true;update({status:'error',lease:undefined,message:error.message,progress:undefined});}}
    finally{checking=false;}
  }
  render(initial);timer=setInterval(check,1800);check();
  // Polling is bounded and ignores our own overlay updates; no full-DOM observer loop.
  addEventListener('pagehide',()=>{controller?.abort();clearInterval(timer);if(get()?.lease?.owner===scanId)update({status:'waiting',lease:undefined,progress:undefined,message:'课表页面已切换，正在等待新页面继续检测。'});},{once:true});
}
}
runHelper();
