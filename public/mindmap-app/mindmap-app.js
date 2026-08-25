
(function(){
  // State
  let panelOpen=false,activeCanvasTab=1,canvasCount=2;
  let zoomLevel=100,panX=0,panY=0,minimapOn=false,hideEdgesOn=false,snapGridOn=true;
  let currentTool='move';
  let nodes=[],nodeIdCounter=0,selectedNodeId=null,expandedNodeId=null,selectedEdge=null,typeCounters={};
  let popupState={project:false,canvas:false,zoom:false,node:false,move:false,shortcuts:false,settings:false};
  let edges=[],connecting=null,workflowRunning=false,pendingUploadNodeId=null,pendingLibraryUpload=false,pendingAddPoint=null,pendingConnectSource=null,nodeMenuSuppressUntil=0,panelMode='canvas',panelQuery='',panelTypeFilter='all',panelSortAsc=true,panelCompact=false,saveTimer=null,edgeFrame=0,viewFrame=0,spaceHeld=false,hiddenTopicIds=new Set();
  let canvases={1:{nodes:[],edges:[]},2:{nodes:[],edges:[]}};
  const edgeGroups=new Map(),queuedEdgeNodeIds=new Set();
  let refreshAllEdges=false,minimapFrame=0,minimapTimer=0,minimapLastDraw=0;
  let canvasSettings={grid:true,edgeMotion:true,autosave:true,autoClosePanels:true};
  let utilityMode='',floatingCloseTimer=null,toastTimer=null,expandedResizeObserver=null,directorNodeId=null,directorSelectedObjectId=null,directorDrag=null,directorHitMap=[];
  let libraryMode='',libraryScope='project',libraryFolder='',libraryView='list',libraryQuery='',historyTypeFilter='all',undoStack=[],redoStack=[],pendingLibraryFolder='';
  let textEditorNodeId=null,textReplaceNodeId=null,textReplaceSource='canvas',replaceModalKind='text',lastTextCardClick={id:null,at:0};
  const icons={text:'icon-text-sheet',image:'icon-nt-image',video:'icon-nt-video',compose:'icon-nt-compose',director:'icon-nt-director',audio:'icon-music-note',script:'icon-nt-script',material:'icon-nt-material'};
  const nodeNames={text:'主题',image:'图片节点',video:'视频节点',compose:'视频合成',director:'导演台',audio:'音频节点',script:'脚本生成器',material:'素材库'};
  const credits={text:6,image:18,video:135,audio:1,script:6,compose:0,director:0};
  const TYPE_META={
    text:{w:120,ports:true},image:{w:360,ports:true},video:{w:360,ports:true},
    compose:{w:350,ports:true},director:{w:350,ports:true},
    audio:{w:360,ports:true},script:{w:350,ports:true},material:{w:350,ports:true}
  };
  const MODEL_CATALOG={
    'sf-wan2.1-t2v':{label:'Wan2.2-T2V',provider:'siliconflow',apiModel:'Wan-AI/Wan2.2-T2V-A14B',direct:true,freeTier:true},
    'sf-wan2.1-i2v':{label:'Wan2.2-I2V',provider:'siliconflow',apiModel:'Wan-AI/Wan2.2-I2V-A14B',direct:true,freeTier:true},
    'zhipu-cogvideox-flash':{label:'CogVideoX-Flash',provider:'zhipu',apiModel:'cogvideox-flash',direct:true,freeTier:true},
    'minimax-video-01-lite':{label:'Video-01-Lite',provider:'minimax',apiModel:'MiniMax-H3',direct:true,freeTier:true},
    'dashscope-wanx-video':{label:'Wanx-Video',provider:'dashscope',apiModel:'wan2.1-t2v-turbo',direct:true,freeTier:true},
    'custom-video':{label:'自定义视频模型',provider:'custom',apiModel:'custom-video',direct:false}
  };
  // The requested provider list does not include a text model. Text therefore stays
  // explicitly configurable instead of assigning an unrelated media model to it.
  const TEXT_MODEL_CATALOG={
    local:{label:'本地内容（不调用 API）',provider:'local',apiModel:''},
    'deepseek-v4-pro':{label:'DeepSeek V4 Pro',provider:'deepseek',apiModel:'deepseek-v4-pro',endpoint:'https://api.deepseek.com/v1/chat/completions'},
    'deepseek-v4-flash':{label:'DeepSeek V4 Flash',provider:'deepseek',apiModel:'deepseek-v4-flash',endpoint:'https://api.deepseek.com/v1/chat/completions'},
    'custom-text':{label:'自定义文本模型',provider:'custom',apiModel:''}
  };
  const IMAGE_MODEL_CATALOG={
    'sf-flux-schnell':{label:'FLUX.1-schnell',provider:'siliconflow',apiModel:'black-forest-labs/FLUX.1-schnell',direct:true},
    'sf-sdxl':{label:'Stable Diffusion XL (SDXL)',provider:'siliconflow',apiModel:'stabilityai/stable-diffusion-xl-base-1.0',direct:true},
    'wanx-2.1':{label:'Wanx-2.1（通义万相）',provider:'dashscope',apiModel:'wanx2.1-t2i-turbo',direct:true},
    'zhipu-cogview-4':{label:'CogView-4',provider:'zhipu',apiModel:'cogview-4',direct:true},
    'custom-image':{label:'自定义图像模型',provider:'custom',apiModel:'custom-image'}
  };
  const AUDIO_MODEL_CATALOG={
    'dashscope-qwen-tts':{label:'Qwen3-TTS（通义语音）',provider:'dashscope',apiModel:'qwen3-tts-instruct-flash',direct:true,freeTier:true},
    'dashscope-cosyvoice-v2':{label:'CosyVoice-V2',provider:'dashscope',apiModel:'cosyvoice-v2',direct:true},
    'custom-audio':{label:'自定义音频模型',provider:'custom',apiModel:'custom-audio'}
  };
  const HISTORY_KEY='canvas-generation-history';
  const TOOL_LIBRARY_KEY='canvas-tool-templates',MATERIAL_LIBRARY_KEY='canvas-materials',CHARACTER_LIBRARY_KEY='canvas-characters';
  const body=document.body,canvasRoot=document.getElementById('canvas-root');
  const viewport=document.getElementById('canvas-viewport'),canvasWorld=document.getElementById('canvas-world');
  const nodesLayer=document.getElementById('nodes-layer'),edgeLayer=document.getElementById('edge-svg');
  const centerHint=document.getElementById('center-hint');
  const nodeCount=document.querySelector('.node-count'),panelContent=document.getElementById('panel-content');
  const zoomVal=document.querySelector('#btn-zoom .zoom-val'),zoomReadout=document.getElementById('btn-zoom-readout');
  const btnAddNode=document.getElementById('btn-add-node');
  const moveToolIcon=document.getElementById('move-tool-icon');
  const runWorkflowBtn=document.getElementById('btn-run-workflow');
  const assetFileInput=document.getElementById('asset-file-input');
  const minimap=document.getElementById('minimap'),minimapSvg=document.getElementById('minimap-svg');
  const utilityDrawer=document.getElementById('utility-drawer'),utilityTitle=document.getElementById('utility-title'),utilityContent=document.getElementById('utility-content');
  const libraryPanel=document.getElementById('library-panel'),libraryPanelBody=document.getElementById('library-panel-body'),libraryPanelTitle=document.getElementById('library-panel-title'),librarySearchInput=document.getElementById('library-search-input');

  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function showToast(message,kind='default'){const toast=document.getElementById('app-toast');clearTimeout(toastTimer);toast.querySelector('span').textContent=message;toast.classList.toggle('validation',kind==='validation');toast.classList.remove('on');requestAnimationFrame(()=>toast.classList.add('on'));toastTimer=setTimeout(()=>toast.classList.remove('on'),1800)}
  function getNode(id){return nodes.find(n=>n.id===+id)}
  function nodeHeight(n){if(n.type==='text')return 48;if(n.type==='compose'||n.type==='director')return 350;if(n.type==='audio')return 162;if(n.type==='image'||n.type==='video')return 203;if(n.type==='script')return 250;return 150}
  function kindColor(kind){return kind==='root'?'#22C3D6':kind==='branch'?'#7FD8A8':'#8A8A8E'}
  function kindLabel(kind){return kind==='root'?'中心主题':kind==='branch'?'分支主题':'子主题'}
  function refreshHiddenTopics(){
    hiddenTopicIds=new Set();
    const childOf=new Map(nodes.map(n=>[n.id,[]]));
    // Only left-right edges count as parent-child; top/bottom edges are visual links only
    edges.forEach(e=>{if(!['top','bottom'].includes(e.fromSide)&&!['top','bottom'].includes(e.toSide)&&childOf.has(e.from)&&e.from!==e.to)childOf.get(e.from).push(e.to)});
    const collect=(id,seen)=>{if(seen.has(id))return;seen.add(id);(childOf.get(id)||[]).forEach(k=>{hiddenTopicIds.add(k);collect(k,seen)})};
    nodes.forEach(n=>{if(n.config?.collapsed)collect(n.id,new Set())});
    return hiddenTopicIds;
  }
  function visibleTopicCount(){return nodes.filter(n=>!hiddenTopicIds.has(n.id)).length}
  function placeCaretAtEnd(el){const range=document.createRange();range.selectNodeContents(el);range.collapse(false);const sel=window.getSelection();sel.removeAllRanges();sel.addRange(range)}
  function createChildTopic(parent){
    if(!parent)return;
    const childKind=parent.config?.kind==='root'?'branch':'leaf';
    const child=addNode('text',{x:parent.x+(parent.w||120)+96,y:parent.y+(parent.config?.kind==='root'?0:40),config:{kind:childKind}});
    if(!child)return;
    if(!edges.some(e=>e.from===parent.id&&e.to===child.id))edges.push({id:'edge-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),from:parent.id,fromSide:'right',to:child.id,toSide:'left'});
    if(parent.config?.collapsed)parent.config={...parent.config,collapsed:false};
    selectNode(child.id);
  }
  function isChildEdge(e){return !['top','bottom'].includes(e.fromSide)&&!['top','bottom'].includes(e.toSide)}
  function createSiblingTopic(node){
    if(!node)return;
    const parentEdge=edges.find(e=>e.to===node.id&&isChildEdge(e)),parent=parentEdge?getNode(parentEdge.from):null;
    if(parent){createChildTopic(parent);return}
    const sib=addNode('text',{x:node.x,y:node.y+120,config:{kind:'root'}});
    if(sib)selectNode(sib.id);
  }
  function promoteTopic(node){
    if(!node)return;
    const parentEdge=edges.find(e=>e.to===node.id&&isChildEdge(e));
    if(!parentEdge)return;
    const parent=getNode(parentEdge.from),grandEdge=parent?edges.find(e=>e.to===parent.id&&isChildEdge(e)):null;
    if(!grandEdge){rememberGraph();edges=edges.filter(e=>e!==parentEdge);node.config={...node.config,kind:'root'};renderAllNodes();scheduleSave();return}
    rememberGraph();
    edges=edges.filter(e=>e!==parentEdge);
    edges.push({id:'edge-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),from:grandEdge.from,fromSide:'right',to:node.id,toSide:'left'});
    node.config={...node.config,kind:getNode(grandEdge.from)?.config?.kind==='root'?'branch':'leaf'};
    renderAllNodes();scheduleSave();
  }
  function toggleTopicCollapsed(node){
    if(!node)return;
    node.config={...node.config,collapsed:!node.config?.collapsed};
    refreshHiddenTopics();
    renderAllNodes();scheduleSave();
  }
  let workflowSyncTimer=null;
  function scheduleSave(){if(!canvasSettings.autosave)return;clearTimeout(saveTimer);saveTimer=setTimeout(saveWorkflow,300)}
  let lastSavedWorkflowJson='',workflowReady=false;
  function persistActiveCanvas(){canvases[activeCanvasTab]={nodes:nodes.map(({_z,...n})=>n),edges}}
  function saveWorkflow(){if(!workflowReady&&!nodes.length)return;persistActiveCanvas();const workflow={nodes:nodes.map(({_z,...n})=>n),edges,activeCanvas:activeCanvasTab,canvases:Object.fromEntries(Object.entries(canvases).map(([k,v])=>[k,{nodes:(v.nodes||[]).map(({_z,...n})=>n),edges:v.edges||[]}]))};const json=JSON.stringify(workflow);if(json===lastSavedWorkflowJson)return;lastSavedWorkflowJson=json;try{localStorage.setItem('canvas-workflow',json)}catch(e){console.warn('Workflow save failed',e)}clearTimeout(workflowSyncTimer);workflowSyncTimer=setTimeout(()=>fetch('/api/workflow',{method:'PUT',headers:{'Content-Type':'application/json'},body:json}).catch(error=>{console.warn('Persistent workflow unavailable',error);lastSavedWorkflowJson=''}),600)}
  async function loadPersistentWorkflow(){if(nodes.length){workflowReady=true;return}try{const response=await fetch('/api/workflow',{cache:'no-store'});if(!response.ok)throw new Error('工作流服务不可用');const workflow=await response.json();if(workflow&&(Array.isArray(workflow.nodes)&&workflow.nodes.length||workflow.canvases)){localStorage.setItem('canvas-workflow',JSON.stringify(workflow));applyWorkspace(workflow);if(window.matchMedia('(max-width:720px)').matches)fitCanvasForViewport();showToast('已恢复上次画布')}}catch(error){console.warn('Persistent workflow unavailable',error)}finally{workflowReady=true}}
  function graphSnapshot(){return JSON.stringify({nodes:nodes.map(({_z,...n})=>n),edges})}
  function rememberGraph(){const snapshot=graphSnapshot();if(undoStack[undoStack.length-1]===snapshot)return;undoStack.push(snapshot);if(undoStack.length>80)undoStack.shift();redoStack=[];syncUndoRedoButtons()}
  function rebuildNodeCounters(){nodeIdCounter=Math.max(0,...nodes.map(n=>+n.id||0));typeCounters={};nodes.forEach(n=>{const suffix=+String(n.name||'').match(/\d+$/)?.[0]||1;typeCounters[n.type]=Math.max(typeCounters[n.type]||0,suffix)})}
  function restoreGraph(snapshot){try{
    const graph=JSON.parse(snapshot),rawNodes=Array.isArray(graph.nodes)?graph.nodes:[],knownIds=new Set();
    nodes=rawNodes.filter(n=>n&&Number.isFinite(+n.id)&&!knownIds.has(+n.id)&&(knownIds.add(+n.id),true)).map(n=>({...n,id:+n.id,type:'text',w:120,ports:true,input:typeof n.input==='string'?n.input:'',output:null,status:'idle',config:n.config&&typeof n.config==='object'?n.config:{},_z:1}));
    edges=(Array.isArray(graph.edges)?graph.edges:[]).filter(e=>e&&knownIds.has(+e.from)&&knownIds.has(+e.to)&&+e.from!==+e.to).map(e=>({...e,from:+e.from,to:+e.to,fromSide:['left','right','top','bottom'].includes(e.fromSide)?e.fromSide:'right',toSide:['left','right','top','bottom'].includes(e.toSide)?e.toSide:'left'}));
    nodes.forEach(n=>{const kind=n.config?.kind||(edges.some(e=>e.to===n.id)?'leaf':'root');n.config={...n.config,kind,color:n.config?.color||kindColor(kind),size:n.config?.size||'md'};});
    rebuildNodeCounters();selectedNodeId=null;selectedEdge=null;expandedNodeId=null;refreshHiddenTopics();renderAllNodes();updatePanel();body.classList.toggle('has-nodes',visibleTopicCount()>0);saveWorkflow();syncUndoRedoButtons()
  }catch(e){console.warn('History restore failed',e)}}
  function undoGraph(){if(!undoStack.length)return;redoStack.push(graphSnapshot());restoreGraph(undoStack.pop());showToast('已撤销')}
  function redoGraph(){if(!redoStack.length)return;undoStack.push(graphSnapshot());restoreGraph(redoStack.pop());showToast('已重做')}
  function syncUndoRedoButtons(){const undo=document.getElementById('btn-undo-new'),redo=document.getElementById('btn-redo-new');if(undo)undo.disabled=!undoStack.length;if(redo)redo.disabled=!redoStack.length}
  function scaleValue(){return zoomLevel/100}
  function screenToWorld(clientX,clientY){const rect=viewport.getBoundingClientRect(),scale=scaleValue();return{x:(clientX-rect.left-panX)/scale,y:(clientY-rect.top-panY)/scale}}
  function worldToScreen(x,y){const rect=viewport.getBoundingClientRect(),scale=scaleValue();return{x:rect.left+panX+x*scale,y:rect.top+panY+y*scale}}
  function applyViewTransform(immediate=false){
    const update=()=>{
      const scale=scaleValue();canvasWorld.style.transform='translate('+panX+'px,'+panY+'px) scale('+scale+')';canvasWorld.style.setProperty('--node-inverse-zoom',(1/scale).toFixed(5));
      canvasRoot.style.setProperty('--zoom',scale);canvasRoot.style.setProperty('--grid-size',(20*scale)+'px');canvasRoot.style.setProperty('--grid-x',(viewport.offsetLeft+panX)+'px');canvasRoot.style.setProperty('--grid-y',panY+'px');
      queueMinimap()
    };
    cancelAnimationFrame(viewFrame);if(immediate){update();return}viewFrame=requestAnimationFrame(update)
  }
  function queueEdges(nodeId){
    if(nodeId===undefined||nodeId===null)refreshAllEdges=true;
    else if(!refreshAllEdges)queuedEdgeNodeIds.add(+nodeId);
    if(edgeFrame)return;
    edgeFrame=requestAnimationFrame(()=>{
      edgeFrame=0;
      const targetNodeIds=refreshAllEdges?null:new Set(queuedEdgeNodeIds);
      refreshAllEdges=false;queuedEdgeNodeIds.clear();
      renderEdges(targetNodeIds)
    })
  }
  function queueMinimap(){
    if(!minimapOn)return;
    const draw=()=>{minimapFrame=0;minimapTimer=0;minimapLastDraw=performance.now();renderMinimap()};
    const delay=Math.max(0,120-(performance.now()-minimapLastDraw));
    if(delay===0){if(!minimapFrame)minimapFrame=requestAnimationFrame(draw);return}
    if(!minimapTimer)minimapTimer=setTimeout(()=>{minimapTimer=0;if(!minimapFrame)minimapFrame=requestAnimationFrame(draw)},delay)
  }
  let persistentHistory=null;
  function getHistory(){if(Array.isArray(persistentHistory))return persistentHistory;try{return JSON.parse(localStorage.getItem(HISTORY_KEY))||[]}catch(e){return[]}}
  function writeHistoryCache(list){persistentHistory=list;try{localStorage.setItem(HISTORY_KEY,JSON.stringify(list.slice(0,500)))}catch(e){}}
  async function loadPersistentHistory(){
    try{const response=await fetch('/api/history',{cache:'no-store'});if(!response.ok)throw new Error('历史服务不可用');const list=await response.json();if(Array.isArray(list)){writeHistoryCache(list);if(panelMode==='history'||panelMode==='assets')updatePanel()}}
    catch(error){console.warn('Persistent history unavailable',error)}
  }
  function addHistory(n){
    if(!n.output?.url)return;
    const clientId='local-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),record={id:clientId,clientId,nodeId:n.id,type:n.output.type,url:n.output.url,sourceUrl:n.output.url,model:n.config?.model||n.config?.imageModel||n.config?.audioModel||'',prompt:n.input||'',createdAt:new Date().toISOString(),archived:false};
    const list=getHistory();writeHistoryCache([record,...list].slice(0,500));
    fetch('/api/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)}).then(async response=>{if(!response.ok)throw new Error('历史归档失败');return response.json()}).then(saved=>{const current=getHistory(),index=current.findIndex(item=>item.clientId===clientId||item.id===clientId);if(index>=0){current[index]={...saved,clientId};writeHistoryCache([...current]);if(panelMode==='history'||panelMode==='assets')updatePanel()}}).catch(error=>{console.warn('Persistent history unavailable',error)})
  }
  const FREE_QUOTA={
    'sf-flux-schnell':{type:'image',label:'FLUX.1-schnell',daily:Infinity},
    'sf-sdxl':{type:'image',label:'SDXL',daily:Infinity},
    'wanx-2.1':{type:'image',label:'Wanx-2.1',daily:50},
    'zhipu-cogview-4':{type:'image',label:'CogView-4',daily:50},
    'sf-wan2.1-t2v':{type:'video',label:'Wan2.2-T2V',daily:30},
    'sf-wan2.1-i2v':{type:'video',label:'Wan2.2-I2V',daily:30},
    'zhipu-cogvideox-flash':{type:'video',label:'CogVideoX-Flash',daily:20},
    'minimax-video-01-lite':{type:'video',label:'Video-01-Lite',daily:10},
    'dashscope-wanx-video':{type:'video',label:'Wanx-Video',daily:10},
    'dashscope-qwen-tts':{type:'audio',label:'Qwen3-TTS',daily:null},
    'dashscope-cosyvoice-v2':{type:'audio',label:'CosyVoice-V2',daily:null}
  };
  const QUOTA_USAGE_KEY='canvas-quota-usage';
  function quotaToday(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function getQuotaUsage(){try{const all=JSON.parse(localStorage.getItem(QUOTA_USAGE_KEY)||'{}');return all[quotaToday()]||{}}catch(e){return{}}}
  function recordQuotaUse(modelId){if(!modelId||!FREE_QUOTA[modelId])return;try{const all=JSON.parse(localStorage.getItem(QUOTA_USAGE_KEY)||'{}'),today=quotaToday(),used=all[today]||{};used[modelId]=(used[modelId]||0)+1;all[today]=used;localStorage.setItem(QUOTA_USAGE_KEY,JSON.stringify(all))}catch(e){}}
  function quotaRemainingText(modelId){const q=FREE_QUOTA[modelId];if(!q)return'—';const used=getQuotaUsage()[modelId]||0;if(q.daily==null)return used?('已用 '+used+' 次'):'免费';if(q.daily===Infinity)return'不限';return Math.max(0,q.daily-used)+' / '+q.daily}
  function nodeQuotaModel(n){
    if(n?._quotaModel)return n._quotaModel;
    const cfg=n?.config||{};
    if(n?.type==='video')return MODEL_CATALOG[cfg.model]?cfg.model:'sf-wan2.1-t2v';
    if(n?.type==='image')return IMAGE_MODEL_CATALOG[cfg.imageModel]?cfg.imageModel:'sf-flux-schnell';
    if(n?.type==='audio')return AUDIO_MODEL_CATALOG[cfg.audioModel]?cfg.audioModel:'dashscope-qwen-tts';
    return cfg.model||cfg.imageModel||cfg.audioModel||''
  }
  function quotaExhausted(modelId){const q=FREE_QUOTA[modelId];if(!q||q.daily==null||q.daily===Infinity)return false;return (getQuotaUsage()[modelId]||0)>=q.daily}
  function showQuotaPopup(node){
    const existing=document.getElementById('quota-popup');if(existing)existing.remove();
    const modelId=nodeQuotaModel(node),q=FREE_QUOTA[modelId],used=getQuotaUsage()[modelId]||0;
    let text='剩余以控制台为准';
    if(q){if(q.daily==null)text=used?('已用 '+used+' 次'):'免费';else if(q.daily===Infinity)text='剩余不限';else text='剩余 '+Math.max(0,q.daily-used)+' 次'}
    const el=document.createElement('div');el.id='quota-popup';el.className='quota-chip';
    el.innerHTML='<svg class="quota-chip-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M8 1.5v13M4.2 5.2 8 1.5l3.8 3.7"/></svg><span>'+text+'</span>';
    document.body.appendChild(el);
    setTimeout(()=>{const e=document.getElementById('quota-popup');if(e)e.remove()},2600)
  }
  function setGenerationOverlay(n,status,progress){
    let el=document.getElementById('gen-progress');
    if(status!=='running'||n?.type!=='image'){if(el)el.remove();return}
    if(!el){el=document.createElement('div');el.id='gen-progress';el.className='gen-progress';el.innerHTML='<div class="gen-water"></div><div class="gen-percent">0%</div>';document.body.appendChild(el)}
    const value=Math.max(0,Math.min(100,Math.round(+progress||0)));
    el.querySelector('.gen-percent').textContent=value+'%';
    el.style.setProperty('--water-level',value+'%')
  }
  function showImageErrorToast(message){
    const existing=document.getElementById('image-error-toast');if(existing)existing.remove();
    const el=document.createElement('div');el.id='image-error-toast';el.className='image-error-toast';
    el.innerHTML='<svg class="image-error-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M8 5v3.4M8 10.8v.2"/></svg><span>'+esc(message||'图片生成失败')+'</span>';
    document.body.appendChild(el);
    setTimeout(()=>{const e=document.getElementById('image-error-toast');if(e)e.remove()},4200)
  }
  function getIncoming(nodeId){return edges.filter(e=>e.to===nodeId).map(e=>getNode(e.from)).filter(Boolean)}
  function collectInputs(nodeId){
    const result={texts:[],images:[],videos:[],audios:[]};
    getIncoming(nodeId).forEach(n=>{
      const output=n.output||{};
      const text=output.text||(['text','script'].includes(n.type)?n.input:'');
      if(text)result.texts.push(text);
      if(output.url&&output.type==='image')result.images.push(output.url);
      if(output.url&&output.type==='video')result.videos.push(output.url);
      if(output.url&&output.type==='audio')result.audios.push(output.url)
    });
    return result
  }
  function resolveNodeMentions(source){const prompt=String(source||'').trim(),seen=new Set(),references=[];prompt.replace(/@([^\n@]{1,40})/g,(_,raw)=>{const name=raw.trim(),node=nodes.find(item=>item.name===name||item.name.startsWith(name));if(!node||seen.has(node.id))return'';seen.add(node.id);const content=(node.output?.text||node.input||'').trim();if(content)references.push('【引用 '+node.name+'】\n'+content);return''});return references.length?prompt+'\n\n'+references.join('\n\n'):prompt}
  const providerNames={siliconflow:'SiliconFlow（硅基流动）',zhipu:'智谱 AI',minimax:'MiniMax（海螺）',dashscope:'阿里云 DashScope',deepseek:'DeepSeek',custom:'自定义接口'};
  function providerIsConfigured(provider){
    if(provider==='custom')return !!(configuredEndpoint('custom')&&configuredModel('custom'));
    return !!activeApiKey(provider)
  }
  function catalogOptions(catalog,selected){
    const groups={};Object.entries(catalog).forEach(([id,model])=>{
      const provider=providerNames[model.provider]||model.provider;
      (groups[model.provider]||=[]).push('<option value="'+esc(id)+'"'+(selected===id?' selected':'')+'>'+esc(model.label+' · '+provider)+'</option>')
    });
    return Object.entries(groups).map(([provider,options])=>'<optgroup label="'+esc(providerNames[provider]||provider)+'">'+options.join('')+'</optgroup>').join('')
  }
  function modelOptions(selected){return catalogOptions(MODEL_CATALOG,selected)}
  function imageModelOptions(selected){return catalogOptions(IMAGE_MODEL_CATALOG,selected)}
  function audioModelOptions(selected){return catalogOptions(AUDIO_MODEL_CATALOG,selected)}
  function textModelOptions(selected){return Object.entries(TEXT_MODEL_CATALOG).filter(([id])=>id!=='local').map(([id,m])=>'<option value="'+id+'"'+(selected===id?' selected':'')+'>'+m.label+'</option>').join('')}
  const VIDEO_CAPABILITIES={
    'sf-wan2.1-t2v':{modes:['text2video'],ratios:['16:9','9:16','1:1'],durations:[6],resolutions:['720p'],sound:false,motion:true,seed:true,negativePrompt:true},
    'sf-wan2.1-i2v':{modes:['img2video'],ratios:['16:9','9:16','1:1'],durations:[6],resolutions:['720p'],sound:false,motion:true,seed:true,negativePrompt:true},
    'zhipu-cogvideox-flash':{modes:['text2video','img2video'],ratios:['16:9','9:16','1:1'],durations:[6],resolutions:['720p'],sound:false,motion:true,seed:true,negativePrompt:true},
    'minimax-video-01-lite':{modes:['text2video','img2video','first_last'],ratios:['16:9','9:16'],durations:[6],resolutions:['720p'],sound:false,motion:true,seed:true,negativePrompt:true},
    'dashscope-wanx-video':{modes:['text2video','img2video'],ratios:['16:9','9:16','1:1'],durations:[5,10],resolutions:['720p','1080p'],sound:false,motion:true,seed:true,negativePrompt:true},
    'custom-video':{modes:['text2video','img2video','first_last','ref_all'],ratios:['16:9','9:16','1:1'],durations:[5,6,8,10,15],resolutions:['720p','1080p','4k'],sound:true,motion:true,seed:true,negativePrompt:true}
  };
  function videoCapabilities(model){
    if(VIDEO_CAPABILITIES[model])return VIDEO_CAPABILITIES[model];
    // Newly discovered providers can expose model ids that are not in the starter catalog.
    // Match only known capability families; an unknown custom endpoint keeps the full custom set.
    const id=String(model||'').toLowerCase();
    if(/wan.*i2v/.test(id))return VIDEO_CAPABILITIES['sf-wan2.1-i2v'];
    if(/wan.*t2v/.test(id))return VIDEO_CAPABILITIES['sf-wan2.1-t2v'];
    if(/cogvideo/.test(id))return VIDEO_CAPABILITIES['zhipu-cogvideox-flash'];
    if(/minimax.*video/.test(id))return VIDEO_CAPABILITIES['minimax-video-01-lite'];
    if(/kling.*omni/.test(id))return {modes:['text2video','img2video','first_last','ref_all'],ratios:['16:9','9:16','1:1'],durations:[5,10],resolutions:['720p','1080p'],sound:true,motion:true,seed:true,negativePrompt:true};
    if(/kling|seedance/.test(id))return {modes:['text2video','img2video'],ratios:['16:9','9:16','1:1'],durations:[5,10],resolutions:['720p','1080p'],sound:false,motion:true,seed:true,negativePrompt:true};
    return VIDEO_CAPABILITIES['custom-video']
  }
  function normalizeVideoConfig(config){if(!MODEL_CATALOG[config.model])config.model='sf-wan2.1-t2v';const caps=videoCapabilities(config.model);if(!caps.modes.includes(config.mode))config.mode=caps.modes[0];if(!caps.ratios.includes(config.ratio))config.ratio=caps.ratios[0];if(!caps.durations.includes(+config.duration))config.duration=caps.durations[0];if(!caps.resolutions.includes(config.resolution))config.resolution=caps.resolutions[caps.resolutions.length-1];if(!caps.sound)config.sound=false;if(!caps.motion)config.motion='balanced';if(!caps.seed)config.seed='';if(!caps.negativePrompt)config.negativePrompt='';return config}
  function videoModelName(id){return String(MODEL_CATALOG[id]?.label||id).replace(/（免费额度）/g,'')}
  function catalogModelName(catalog,id){return String(catalog[id]?.label||id).replace(/（免费额度）/g,'')}
  const COMPANY_SHORT={siliconflow:'硅基流动',dashscope:'阿里云',zhipu:'智谱',minimax:'海螺',deepseek:'',custom:''};
  function stripModelQualifier(name){return String(name||'').replace(/（[^）]*）/g,'').replace(/\([^)]*\)/g,'').trim()}
  function modelOptionName(catalog,id,model){const base=stripModelQualifier(catalogModelName(catalog,id)),short=COMPANY_SHORT[model?.provider];return short?base+'('+short+')':base}
  function modelOptionExtras(model){const lock=(model?.planModel||model?.locked)?'<svg class="video-model-lock" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="7" width="10" height="6.5" rx="1.6"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>':'';return{lock}}
  function modelSelectionBadge(model,id){
    if(quotaExhausted(id))return{label:'已用尽',className:'exhausted'};
    const connected=providerIsConfigured(model?.provider);
    return{label:connected?'已接通':'未接通',className:connected?'connected':'disconnected'}
  }
  function mediaModelControlHTML({catalog,selected,fallback,kind,title}){
    const currentId=catalog[selected]?selected:fallback,current=catalog[currentId]||{},groups={};
    Object.entries(catalog).forEach(([id,model])=>{if(model.provider==='custom'&&!providerIsConfigured('custom'))return;(groups[model.provider]||=[]).push([id,model])});
    const items=Object.entries(groups).map(([provider,models])=>'<div class="video-model-group"><div class="video-model-group-label">'+esc(providerNames[provider]||provider)+'</div>'+models.map(([id,model])=>{const badge=modelSelectionBadge(model,id),extra=modelOptionExtras(model);return'<button type="button" class="video-model-option'+(id===currentId?' active':'')+'" data-'+kind+'-model="'+esc(id)+'"><span class="video-model-option-copy"><strong>'+esc(modelOptionName(catalog,id,model))+'</strong></span>'+extra.lock+'<span class="video-model-badge '+badge.className+'">'+badge.label+'</span></button>'}).join('')+'</div>').join('');
    return {selected:currentId,html:'<div class="video-model-control '+kind+'-model-control"><button type="button" class="video-model-trigger '+kind+'-model-trigger" aria-label="选择'+title+'模型" aria-expanded="false"><span class="video-model-trigger-copy"><small>'+title+'模型</small><strong>'+esc(stripModelQualifier(catalogModelName(catalog,currentId)))+'</strong></span><svg><use href="#icon-chevron-down"/></svg></button><div class="video-model-popover '+kind+'-model-popover">'+(items||'<div class="video-model-empty">请先在设置中填写可用的'+title+'模型接口</div>')+'</div></div>'}
  }
  function videoModelControlHTML(selected){
    const entries=Object.entries(MODEL_CATALOG),current=MODEL_CATALOG[selected]||MODEL_CATALOG['custom-video'],groups={};
    entries.forEach(([id,model])=>{if(model.provider==='custom'&&!providerIsConfigured('custom'))return;(groups[model.provider]||=[]).push([id,model])});
    const items=Object.entries(groups).map(([provider,models])=>'<div class="video-model-group"><div class="video-model-group-label">'+esc(providerNames[provider]||provider)+'</div>'+models.map(([id,model])=>{const badge=modelSelectionBadge(model,id),extra=modelOptionExtras(model);return'<button type="button" class="video-model-option'+(id===selected?' active':'')+'" data-video-model="'+esc(id)+'"><span class="video-model-option-copy"><strong>'+esc(modelOptionName(MODEL_CATALOG,id,model))+'</strong></span>'+extra.lock+'<span class="video-model-badge '+badge.className+'">'+badge.label+'</span></button>'}).join('')+'</div>').join('');
    return '<div class="video-model-control"><button type="button" class="video-model-trigger" aria-label="选择视频模型" aria-expanded="false"><span class="video-model-trigger-copy"><small>视频模型</small><strong>'+esc(stripModelQualifier(videoModelName(selected)))+'</strong></span><svg><use href="#icon-chevron-down"/></svg></button><div class="video-model-popover">'+(items||'<div class="video-model-empty">请先在设置中填写可用的视频模型接口</div>')+'</div></div>'
  }
  function textModelIsConfigured(id,meta){
    if(id==='local')return false;
    const key=activeApiKey(meta.provider);
    if(meta.provider==='custom')return !!(configuredEndpoint('custom')&&configuredModel('custom'));
    if(meta.provider==='ark')return !!(key&&configuredModel('ark'));
    return !!key
  }
  function textModelDisplay(id,meta){
    const descriptions={deepseek:'DeepSeek 文本模型'};
    const dynamic=['ark','custom'].includes(meta.provider)?configuredModel(meta.provider):'';
    const name=dynamic||meta.label;
    return{id,meta,name,providerName:providerNames[meta.provider]||meta.provider,description:descriptions[meta.provider]||'已配置文本模型'}
  }
  function availableTextModels(selected){
    return Object.entries(TEXT_MODEL_CATALOG).filter(([id])=>id!=='local').map(([id,meta])=>textModelDisplay(id,meta))
  }
  function textModelControlHTML(selected){
    const models=availableTextModels(selected),current=models.find(model=>model.id===selected)||models[0],groups={};
    models.forEach(model=>{if(model.meta.provider==='custom'&&!providerIsConfigured('custom'))return;(groups[model.providerName]||=[]).push(model)});
    const options=Object.entries(groups).map(([provider,items])=>'<div class="video-model-group"><div class="video-model-group-label">'+esc(provider)+'</div>'+items.map(model=>{const badge=modelSelectionBadge(model.meta,model.id),extra=modelOptionExtras(model.meta);return'<button type="button" class="video-model-option'+(model.id===current.id?' active':'')+'" data-unified-text-model="'+esc(model.id)+'"><span class="video-model-option-copy"><strong>'+esc(model.name)+'</strong></span>'+extra.lock+'<span class="video-model-badge '+badge.className+'">'+badge.label+'</span></button>'}).join('')+'</div>').join('');
    return{selected:current.id,html:'<div class="video-model-control text-model-control"><button type="button" class="video-model-trigger unified-text-model-trigger" aria-label="选择文本模型" aria-expanded="false"><span class="video-model-trigger-copy"><small>文本模型</small><strong>'+esc(stripModelQualifier(current.name))+'</strong></span><svg><use href="#icon-chevron-down"/></svg></button><div class="video-model-popover unified-text-model-popover">'+options+'</div></div>'}
  }

  const textEditorModal=document.getElementById('text-editor-modal');
  const textMdSource=document.getElementById('text-md-source'),textMdPreview=document.getElementById('text-md-preview');
  const textNodeName=document.getElementById('text-node-name'),textMdReadpane=document.getElementById('text-md-readpane'),textModeButtons=[...document.querySelectorAll('[data-text-mode]')];
  const textReplaceModal=document.getElementById('text-replace-modal'),textReplaceList=document.getElementById('text-replace-list'),textReplaceSearch=document.getElementById('text-replace-search');
  function setTextModalVisible(modal,visible){modal.classList.toggle('open',visible);modal.setAttribute('aria-hidden',String(!visible));}
  function closeTextEditorModal(){setTextModalVisible(textEditorModal,false);textEditorNodeId=null}
  function setTextEditorMode(mode){const edit=mode==='edit';textMdSource.hidden=!edit;textMdReadpane.hidden=edit;textModeButtons.forEach(b=>{const on=b.dataset.textMode===mode;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on))});if(!edit&&textMdPreview)textMdPreview.innerHTML=renderMarkdown(textMdSource.value);if(edit)requestAnimationFrame(()=>textMdSource.focus())}
    function renderMarkdown(src){
    const md=String(src||'');if(!md.trim())return'';
    const escHtml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const inline=s=>{let t=String(s);const codeBlocks=[];t=t.replace(/`([^`]+)`/g,(m,c)=>{codeBlocks.push('<code>'+escHtml(c)+'</code>');return'\u0001'+ (codeBlocks.length-1)+'\u0001'});t=t.replace(/\[([^\[\]]+)\]\(([^)\s]+)\)/g,'<a href="'+'$2'+'" target="_blank" rel="noopener">$1</a>');t=t.replace(/\*\*([^*]+?)\*\*/g,'<strong>$1</strong>');t=t.replace(/\*([^*]+?)\*/g,'<em>$1</em>');t=t.replace(/~~([^~]+?)~~/g,'<del>$1</del>');t=t.replace(/\u0001(\d+)\u0001/g,(m,i)=>codeBlocks[+i]);return t};
    const lines=md.split(/\r?\n/);const out=[];let i=0;let inCode=false;let codeBuf=[];
    while(i<lines.length){const line=lines[i];
      if(/^```/.test(line.trim())){if(inCode){out.push('<pre><code>'+escHtml(codeBuf.join('\n'))+'</code></pre>');codeBuf=[];inCode=false;i++;continue}else{inCode=true;i++;continue}}
      if(inCode){codeBuf.push(line);i++;continue}
      const t=line.trim();
      if(/^(#{1,6})\s+/.test(t)){const level=/^(#{1,6})/.exec(t)[1].length;out.push('<h'+level+'>'+inline(t.replace(/^#{1,6}\s+/,''))+'</h'+level+'>');i++;continue}
      if(/^>\s?/.test(t)){const qt=[];while(i<lines.length&&/^>\s?/.test(lines[i].trim())){qt.push(lines[i].trim().replace(/^>\s?/,''));i++}out.push('<blockquote>'+qt.map(q=>'<p>'+inline(q)+'</p>').join('')+'</blockquote>');continue}
      if(/^([-*+])\s+/.test(t)){const items=[];while(i<lines.length&&/^([-*+])\s+/.test(lines[i].trim())){items.push('<li>'+inline(lines[i].trim().replace(/^([-*+])\s+/,''))+'</li>');i++}out.push('<ul>'+items.join('')+'</ul>');continue}
      if(/^\d+\.\s+/.test(t)){const items=[];while(i<lines.length&&/^\d+\.\s+/.test(lines[i].trim())){items.push('<li>'+inline(lines[i].trim().replace(/^\d+\.\s+/,''))+'</li>');i++}out.push('<ol>'+items.join('')+'</ol>');continue}
      if(/^---+$/.test(t)){out.push('<hr>');i++;continue}
      if(t===''){i++;continue}
      const para=[];while(i<lines.length&&lines[i].trim()!==''){para.push(lines[i]);i++}out.push('<p>'+inline(para.join(' '))+'</p>')
    }
    return out.join('\n')
  }
  function markdownPlain(src){const tmp=document.createElement('div');tmp.innerHTML=renderMarkdown(src);return(tmp.textContent||'').replace(/\s+/g,' ').trim()}
  function updateTextMdPreview(){if(textMdPreview)textMdPreview.innerHTML=renderMarkdown(textMdSource.value)}
  function openTextEditorModal(node,focusName){
    if(!node)return;
    const imageNode=node.type==='image',title=document.getElementById('text-editor-modal-title');
    textEditorNodeId=node.id;
    title.textContent=imageNode?'编辑图片描述':'编辑主题';
    const content=imageNode?(node.input||node.output?.text||''):(node.input||'');
    textMdSource.value=content;
    if(textNodeName)textNodeName.value=node.name||'';
    updateTextMdPreview();
    setTextModalVisible(textEditorModal,true);
    setTextEditorMode('edit');
    requestAnimationFrame(()=>{(focusName&&textNodeName?textNodeName:textMdSource).focus();if(!focusName){textMdSource.setSelectionRange(textMdSource.value.length,textMdSource.value.length)}})
  }
  function saveTextEditorModal(){
    const node=getNode(textEditorNodeId);if(!node)return;
    const imageNode=node.type==='image',next=textMdSource.value.trim();
    const nameChanged=!imageNode&&textNodeName&&(textNodeName.value.trim()||'')!==(node.name||'');
    const changed=next!==(node.input||'')||nameChanged;
    if(changed){rememberGraph();if(nameChanged)node.name=textNodeName.value.trim();node.input=next;node.output=null;node.status='idle';node.message='';node.progress=0;if(!imageNode)node.config={...(node.config||{}),title:undefined,html:undefined};renderAllNodes();updatePanel();scheduleSave();showToast(imageNode?'图片描述已保存':'主题已保存')}
    closeTextEditorModal()
  }
  function textReplaceCandidates(){
    const query=(textReplaceSearch.value||'').trim().toLowerCase();
    if(replaceModalKind!=='text'){
      if(textReplaceSource==='canvas')return nodes.filter(node=>node.id!==textReplaceNodeId&&node.type===replaceModalKind&&node.output?.url).map(node=>({name:node.name,url:node.output.url,type:node.output.type||replaceModalKind,kind:'node',id:node.id}));
      if(textReplaceSource==='project'||textReplaceSource==='cross')return readList(MATERIAL_LIBRARY_KEY).filter(item=>item.type===replaceModalKind&&item.url&&(!item.scope||item.scope===(textReplaceSource==='cross'?'cross':'project'))).map(item=>({name:item.name||'未命名素材',url:item.url,type:item.type,kind:'material',id:item.id}));
      return []
    }
    if(textReplaceSource==='canvas')return nodes.filter(node=>node.id!==textReplaceNodeId&&['text','script'].includes(node.type)).map(node=>({name:node.name,text:node.input||node.output?.text||'',kind:'node',id:node.id})).filter(item=>item.text);
    if(textReplaceSource==='project'||textReplaceSource==='cross')return readList(MATERIAL_LIBRARY_KEY).filter(item=>item.type==='text'&&(!item.scope||item.scope===(textReplaceSource==='cross'?'cross':'project'))).map(item=>({name:item.name||'未命名文本',text:item.text||item.content||'',kind:'material',id:item.id})).filter(item=>item.text);
    return []
  }
  function renderTextReplaceList(){
    if(textReplaceSource==='upload'){
      if(replaceModalKind!=='text'){
        const label={image:'图片',video:'视频',audio:'音频'}[replaceModalKind]||'素材';
        const uploadIcon=replaceModalKind==='image'?'icon-nt-image':replaceModalKind==='video'?'icon-nt-video':'icon-music-note';
        textReplaceList.innerHTML='<div class="text-replace-empty"><svg><use href="#'+uploadIcon+'"/></svg><div>从本地选择新的'+label+'内容</div><button class="text-modal-btn primary" id="text-replace-upload" type="button">选择'+label+'</button></div>';
        document.getElementById('text-replace-upload').addEventListener('click',()=>{pendingUploadNodeId=textReplaceNodeId;pendingLibraryUpload=false;assetFileInput.accept=replaceModalKind+'/*';closeTextReplaceModal();assetFileInput.click()});return
      }
      textReplaceList.innerHTML='<div class="text-replace-empty" style="justify-content:flex-start;padding-top:36px"><svg><use href="#icon-text-sheet"/></svg><div>粘贴或输入本地文本内容</div><textarea id="text-replace-paste" style="width:min(430px,100%);height:160px;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:#29292b;color:#eee;resize:vertical;outline:none" placeholder="输入文本内容..."></textarea><button class="text-modal-btn primary" id="text-replace-paste-save" type="button">替换内容</button></div>';
      document.getElementById('text-replace-paste-save').addEventListener('click',()=>applyTextReplacement(document.getElementById('text-replace-paste').value));return
    }
    const candidates=textReplaceCandidates(),query=(textReplaceSearch.value||'').trim().toLowerCase(),filtered=query?candidates.filter(item=>(item.name+' '+(item.text||'')).toLowerCase().includes(query)):candidates;
    const kindLabel={text:'文本',image:'图片',video:'视频',audio:'音频'}[replaceModalKind]||'素材';
    if(!filtered.length){textReplaceList.innerHTML='<div class="text-replace-empty"><svg><use href="#icon-folder"/></svg><div>'+ (textReplaceSource==='canvas'?'没有可替换的画布'+kindLabel:'没有可用'+kindLabel+'素材')+'</div></div>';return}
    if(replaceModalKind!=='text'){
      const icon=replaceModalKind==='image'?'icon-nt-image':replaceModalKind==='video'?'icon-nt-video':'icon-music-note';
      textReplaceList.innerHTML=filtered.map((item,index)=>'<button class="text-replace-item" type="button" data-media-replace-index="'+index+'"><span class="text-replace-item-icon"><svg><use href="#'+icon+'"/></svg></span><span class="text-replace-item-copy"><span class="text-replace-item-name">'+esc(item.name)+'</span><span class="text-replace-item-preview">保留节点位置和全部连接关系</span></span></button>').join('');
      textReplaceList.querySelectorAll('[data-media-replace-index]').forEach(button=>button.addEventListener('click',()=>applyMediaReplacement(filtered[+button.dataset.mediaReplaceIndex])));return
    }
    textReplaceList.innerHTML=filtered.map(item=>'<button class="text-replace-item" type="button" data-text-replace-value="'+esc(encodeURIComponent(item.text))+'"><span class="text-replace-item-icon"><svg><use href="#icon-text-sheet"/></svg></span><span class="text-replace-item-copy"><span class="text-replace-item-name">'+esc(item.name)+'</span><span class="text-replace-item-preview">'+esc(item.text)+'</span></span></button>').join('');
    textReplaceList.querySelectorAll('[data-text-replace-value]').forEach(button=>button.addEventListener('click',()=>applyTextReplacement(decodeURIComponent(button.dataset.textReplaceValue))))
  }
  function openTextReplaceModal(node){
    if(!node)return;textReplaceNodeId=node.id;replaceModalKind=node.type==='text'?'text':node.type;textReplaceSource='canvas';textReplaceSearch.value='';textReplaceSearch.placeholder='搜索画布'+({text:'文本',image:'图片',video:'视频',audio:'音频'}[replaceModalKind]||'')+'节点';document.getElementById('text-replace-modal-title').textContent='替换'+({text:'节点内容',image:'图片内容',video:'视频内容',audio:'音频内容'}[replaceModalKind]||'节点内容');textReplaceModal.querySelectorAll('[data-replace-source]').forEach(tab=>tab.classList.toggle('active',tab.dataset.replaceSource==='canvas'));renderTextReplaceList();setTextModalVisible(textReplaceModal,true)
  }
  function closeTextReplaceModal(){setTextModalVisible(textReplaceModal,false);textReplaceNodeId=null}
  function applyTextReplacement(value){
    const node=getNode(textReplaceNodeId);if(!node)return;const next=String(value||'').trim();if(!next){showToast('请选择或输入文本内容');return}
    rememberGraph();node.input=next;node.output=null;node.status='idle';node.message='文本内容已替换';node.progress=0;closeTextReplaceModal();renderAllNodes();updatePanel();scheduleSave();showToast('已替换文本内容')
  }
  function applyMediaReplacement(item){
    const node=getNode(textReplaceNodeId);if(!node||!item?.url)return;
    rememberGraph();node.output={type:node.type,url:item.url,name:item.name||'替换素材'};node.status='success';node.message='已替换'+({image:'图片',video:'视频',audio:'音频'}[node.type]||'素材')+'内容';node.progress=100;closeTextReplaceModal();renderAllNodes();updatePanel();scheduleSave();showToast('已替换内容，节点连接已保留')
  }
  function downloadTextNode(node){
    const content=(node.input||node.output?.text||'').trim();if(!content){showToast('没有可下载的文本内容');return}
    const blob=new Blob([content],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=(node.name||'文本节点')+'.txt';document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);showToast('文本已下载')
  }
  function mediaSaveButtonHTML(n){return n.output?.url?'<button class="node-save-media" type="button" data-node-action="save-media" data-media-url="'+esc(n.output.url)+'" title="保存到本地"><svg><use href="#icon-nt-upload"/></svg>保存</button>':''}
  function mediaVideoControlsHTML(){return'<div class="node-video-controls"><button class="nvc-btn nvc-play" type="button" aria-label="播放"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg></button><span class="nvc-time">0:00</span><span class="nvc-spacer"></span><div class="nvc-dots-wrap"><button class="nvc-btn nvc-dots" type="button" aria-label="更多选项"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button><div class="nvc-menu"><button type="button" class="nvc-item" data-nvc="download"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13.5h10"/></svg>下载</button><button type="button" class="nvc-item" data-nvc="rate"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12M2 8h12M2 12h8"/></svg>播放速度 <b>1x</b></button><button type="button" class="nvc-item" data-nvc="pip"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="2.5" width="13" height="9" rx="1.5"/><rect x="9" y="8.5" width="5.5" height="4" rx="1"/></svg>画中画</button></div></div></div>'}
  function saveMediaNode(node){
    const url=(node.output?.url||'').trim();if(!url){showToast('没有可保存的内容');return}
    const ext=(url.split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i)||[])[1]||(node.output?.type==='image'?'png':node.output?.type==='video'?'mp4':'mp3');
    const link=document.createElement('a');link.href='/api/download?url='+encodeURIComponent(url);link.download=(node.name||'媒体节点')+'.'+ext;document.body.appendChild(link);link.click();link.remove();showToast('已开始保存到本地')
  }
  document.querySelectorAll('#text-editor-modal [data-text-modal-close]').forEach(button=>button.addEventListener('click',closeTextEditorModal));
  document.getElementById('text-editor-save').addEventListener('click',saveTextEditorModal);
  textMdSource.addEventListener('input',updateTextMdPreview);
  textMdSource.addEventListener('keydown',ev=>{if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'){ev.preventDefault();ev.stopPropagation();saveTextEditorModal()}});
  textModeButtons.forEach(button=>button.addEventListener('click',()=>setTextEditorMode(button.dataset.textMode)));
  document.querySelectorAll('#text-replace-modal [data-text-replace-close]').forEach(button=>button.addEventListener('click',closeTextReplaceModal));
  textReplaceModal.querySelectorAll('[data-replace-source]').forEach(tab=>tab.addEventListener('click',()=>{textReplaceSource=tab.dataset.replaceSource;textReplaceModal.querySelectorAll('[data-replace-source]').forEach(item=>item.classList.toggle('active',item===tab));textReplaceSearch.value='';const label={text:'文本',image:'图片',video:'视频',audio:'音频'}[replaceModalKind]||'素材';textReplaceSearch.placeholder=textReplaceSource==='canvas'?'搜索画布'+label+'节点':'搜索'+label+'素材';renderTextReplaceList()}));
  textReplaceSearch.addEventListener('input',renderTextReplaceList);
  [textEditorModal,textReplaceModal].forEach(modal=>modal.addEventListener('pointerdown',event=>{if(event.target===modal){if(modal===textEditorModal)closeTextEditorModal();else closeTextReplaceModal()}}));
  const IMAGE_RATIOS=[
    {value:'1:1',rw:1,rh:1},{value:'1:2',rw:.55,rh:1.25},{value:'2:1',rw:1.25,rh:.55},{value:'9:16',rw:.65,rh:1.2},{value:'16:9',rw:1.2,rh:.65},
    {value:'3:4',rw:.8,rh:1.1},{value:'4:3',rw:1.1,rh:.8},{value:'3:2',rw:1.15,rh:.75},{value:'2:3',rw:.75,rh:1.15},{value:'5:4',rw:1.1,rh:.86},
    {value:'4:5',rw:.86,rh:1.1},{value:'21:9',rw:1.3,rh:.52},{value:'9:21',rw:.52,rh:1.3}
  ];
  const IMAGE_WORKFLOW_GROUPS=[
    {title:'分镜叙事',items:[
      {key:'dispatch-storyboard',name:'调度故事板',icon:'icon-book',new:true,prompt:'根据当前画面调度连续故事板，保持角色、场景和视觉风格一致'},
      {key:'storyboard',name:'故事板',icon:'icon-book',new:true,prompt:'基于当前画面生成连续故事板，明确景别、动作和镜头衔接'},
      {key:'grid-25',name:'25宫格连贯分镜',icon:'icon-grid',prompt:'生成25宫格连贯分镜，角色造型、空间关系和光线连续'},
      {key:'plot-grid-4',name:'剧情推演四宫格',icon:'icon-grid',prompt:'生成剧情推演四宫格，呈现起因、发展、转折和结果'},
      {key:'future-3s',name:'画面推演 - 3秒后',icon:'icon-clock',prompt:'推演当前画面3秒后的状态，保持人物身份、镜头和环境连续'},
      {key:'past-5s',name:'画面推演 - 5秒前',icon:'icon-clock',prompt:'推演当前画面5秒前的状态，保持人物身份、镜头和环境连续'}
    ],subgroups:[{title:'质感调节',items:[
      {key:'portrait-texture',name:'人像质感调节',icon:'icon-people',new:true,prompt:'优化人像肤质和面部细节，保留真实皮肤纹理，避免过度磨皮'},
      {key:'cinematic-light',name:'电影级光影校正',icon:'icon-image-filled',prompt:'进行电影级光影校正，改善层次、对比度和色彩关系'}
    ]}]},
    {title:'空间与机位',items:[
      {key:'panorama-720',name:'720全景',icon:'icon-nt-director',prompt:'扩展为720度全景场景，补全周围空间并保持透视一致'},
      {key:'camera-grid-9',name:'多机位九宫格',icon:'icon-grid',prompt:'生成同一场景的多机位九宫格，保持人物和环境完全一致'}
    ],subgroups:[{title:'设定图',items:[
      {key:'face-views',name:'角色脸部三视图',icon:'icon-people',prompt:'生成角色脸部正面、侧面和四分之三侧面三视图'},
      {key:'character-sheet',name:'角色设定图',icon:'icon-people',prompt:'生成完整角色设定图，包含服装、道具、配色和关键细节'},
      {key:'character-views',name:'角色三视图',icon:'icon-people',prompt:'生成角色正面、侧面和背面三视图，比例和造型保持一致'},
      {key:'scene-sheet',name:'场景设定图',icon:'icon-nt-image',prompt:'生成场景设定图，明确空间布局、材质、光线和关键陈设'},
      {key:'product-sheet',name:'产品设定图',icon:'icon-toolbox',prompt:'生成产品设定图，包含正侧背视图、结构细节和材质说明'}
    ]}]}
  ];
  function imageSummary(cfg){const qualityNames={low:'低画质',standard:'标准画质',high:'高画质'};return(cfg.ratio||'16:9')+' · '+(qualityNames[cfg.quality]||'标准画质')+' · '+String(cfg.resolution||'2k').toUpperCase()+' · '+(+cfg.count||1)+'张'}
  function ratioShapeStyle(ratio,max=24){
    const parts=String(ratio||'').split(':').map(Number),w=parts[0]||1,h=parts[1]||1,aspect=w/h;
    let width,height;
    if(aspect>=1){width=max;height=Math.max(4,Math.round(max/aspect))}
    else{height=max;width=Math.max(4,Math.round(max*aspect))}
    return'width:'+width+'px;height:'+height+'px'
  }
  function imageParameterPopoverHTML(cfg){
    const row=(key,values)=>'<div class="image-param-row">'+values.map(([value,label])=>'<button class="image-param-button'+(String(cfg[key])===String(value)?' active':'')+'" data-image-param="'+key+'" data-image-value="'+value+'">'+label+'</button>').join('')+'</div>';
    const ratios=IMAGE_RATIOS.map(item=>'<button class="image-ratio-button'+(cfg.ratio===item.value?' active':'')+'" data-image-param="ratio" data-image-value="'+item.value+'"><span class="ratio-shape" style="'+ratioShapeStyle(item.value,24)+'"></span><span>'+item.value+'</span></button>').join('');
    return'<div class="image-popover image-params-popover"><div class="image-param-section"><div class="image-param-title">画幅比例</div><div class="image-ratio-grid">'+ratios+'</div></div><div class="image-param-section"><div class="image-param-title">清晰度</div>'+row('resolution',[['1k','1K'],['2k','2K'],['4k','4K']])+'</div></div>'
  }
  function audioModelControlHTML(selected){
    return mediaModelControlHTML({catalog:AUDIO_MODEL_CATALOG,selected,fallback:'dashscope-qwen-tts',kind:'audio',title:'音频'}).html
  }
  function imageModelControlHTML(selected){
    return mediaModelControlHTML({catalog:IMAGE_MODEL_CATALOG,selected,fallback:'sf-flux-schnell',kind:'image',title:'图片'}).html
  }
  function imageWorkflowPopoverHTML(){
    const items=list=>'<div class="image-workflow-list">'+list.map(item=>'<button class="image-workflow-item" data-image-workflow="'+item.key+'"><span class="image-workflow-icon"><svg><use href="#'+item.icon+'"/></svg>'+(item.new?'<i class="image-workflow-dot"></i>':'')+'</span><span class="image-workflow-name">'+item.name+'</span></button>').join('')+'</div>';
    return'<div class="image-popover image-workflow-popover"><div class="image-workflow-grid">'+IMAGE_WORKFLOW_GROUPS.map(group=>'<section><h3 class="image-workflow-section-title">'+group.title+'</h3>'+items(group.items)+(group.subgroups||[]).map(sub=>'<h4 class="image-workflow-subtitle">'+sub.title+'</h4>'+items(sub.items)).join('')+'</section>').join('')+'</div></div>'
  }

  // Popup helpers
  function closeAll(){for(const[k,v]of Object.entries(popupState))if(v)closeP(k);body.classList.remove('popup-active')}
  function closeP(k){const el={project:document.getElementById('project-menu'),canvas:document.getElementById('canvas-popover'),zoom:document.getElementById('zoom-popup'),node:document.getElementById('node-menu'),move:document.getElementById('move-menu'),shortcuts:document.getElementById('shortcuts-overlay'),settings:document.getElementById('settings-menu')}[k];if(!el)return;const openClass=k==='shortcuts'?'on':'open';popupState[k]=false;el.classList.remove(openClass);if(k==='settings')document.getElementById('settings-scrim').classList.remove('open');setTimeout(()=>{if(!el.classList.contains(openClass))el.style.display='none'},200);body.classList.toggle('popup-active',Object.values(popupState).some(v=>v))}
  function closeP(k){const el={project:document.getElementById('project-menu'),canvas:document.getElementById('canvas-popover'),zoom:document.getElementById('zoom-popup'),node:document.getElementById('node-menu'),move:document.getElementById('move-menu'),shortcuts:document.getElementById('shortcuts-overlay'),settings:document.getElementById('settings-menu')}[k];if(!el)return;const openClass=k==='shortcuts'?'on':'open';popupState[k]=false;el.classList.remove(openClass);if(k==='settings')document.getElementById('settings-scrim').classList.remove('open');if(k==='node')pendingConnectSource=null;setTimeout(()=>{if(!el.classList.contains(openClass))el.style.display='none'},200);body.classList.toggle('popup-active',Object.values(popupState).some(v=>v))}
  function toggleP(key,force){const el={project:document.getElementById('project-menu'),canvas:document.getElementById('canvas-popover'),zoom:document.getElementById('zoom-popup'),node:document.getElementById('node-menu'),move:document.getElementById('move-menu'),shortcuts:document.getElementById('shortcuts-overlay'),settings:document.getElementById('settings-menu')}[key];if(!el)return;const openClass=key==='shortcuts'?'on':'open',o=typeof force==='boolean'?force:!el.classList.contains(openClass);popupState[key]=o;if(o){el.style.display=key==='settings'?'flex':'block';el.offsetHeight;el.classList.add(openClass);if(key==='settings')document.getElementById('settings-scrim').classList.add('open')}else{closeP(key)}body.classList.toggle('popup-active',Object.values(popupState).some(v=>v))}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function placeAbove(el,rect,gap=12){
    el.classList.add('bottom-anchor');el.style.right='auto';el.style.bottom='auto';el.style.top='0';el.style.left='0';
    const width=el.offsetWidth,height=el.offsetHeight,left=clamp(rect.left+rect.width/2-width/2,12,Math.max(12,window.innerWidth-width-12)),top=clamp(rect.top-height-gap,12,Math.max(12,window.innerHeight-height-12));
    el.style.left=left+'px';el.style.top=top+'px'
  }
  function placeBelow(el,rect,gap=8){
    el.classList.remove('bottom-anchor');el.style.right='auto';el.style.bottom='auto';el.style.top='0';el.style.left='0';
    const width=el.offsetWidth,height=el.offsetHeight,left=clamp(rect.left+rect.width/2-width/2,12,Math.max(12,window.innerWidth-width-12)),top=clamp(rect.bottom+gap,12,Math.max(12,window.innerHeight-height-12));
    el.style.left=left+'px';el.style.top=top+'px'
  }
  function placeAtPoint(el,x,y){
    el.classList.remove('bottom-anchor');el.style.right='auto';el.style.bottom='auto';el.style.top='0';el.style.left='0';
    const width=el.offsetWidth,height=el.offsetHeight,left=clamp(x-width/2,12,Math.max(12,window.innerWidth-width-12));let top=y+10;if(top+height>window.innerHeight-12)top=y-height-10;el.style.left=left+'px';el.style.top=clamp(top,12,Math.max(12,window.innerHeight-height-12))+'px'
  }
  function pos(el,rect,opts={}){if(opts.a)placeAbove(el,rect,opts.oy||8);else placeBelow(el,rect,opts.oy||8)}
  function clearFloatingClose(){clearTimeout(floatingCloseTimer)}
  function scheduleFloatingClose(closeFn){clearFloatingClose();if(canvasSettings.autoClosePanels!==false)floatingCloseTimer=setTimeout(closeFn,180)}
  function bindHoverDismiss(trigger,surface,closeFn,related=[]){
    [trigger,surface,...related].filter(Boolean).forEach(el=>{el.addEventListener('mouseenter',clearFloatingClose);el.addEventListener('mouseleave',()=>scheduleFloatingClose(()=>{if(![trigger,surface,...related].some(item=>item?.matches(':hover')))closeFn()}))})
  }

  // Project menu
  document.getElementById('btn-logo').addEventListener('click',ev=>{ev.stopPropagation();toggleP('project');if(popupState.project)pos(document.getElementById('project-menu'),ev.currentTarget.getBoundingClientRect());document.getElementById('btn-logo').classList.toggle('expanded',popupState.project)});

  // Project name (auto-save on change)
  const projectNameInput=document.getElementById('project-name-input');
  const panelProjectName=document.getElementById('panel-project-name');
  let projectNameTimer=null;
  projectNameInput.addEventListener('input',()=>{
    clearTimeout(projectNameTimer);
    projectNameTimer=setTimeout(()=>{
      const v=projectNameInput.value.trim()||'未命名项目';
      panelProjectName.textContent=v;
      localStorage.setItem('canvas-project-name',v);
    },400);
  });
  projectNameInput.addEventListener('keydown',ev=>{if(ev.key==='Enter')ev.preventDefault()});
  projectNameInput.addEventListener('blur',()=>{
    const v=projectNameInput.value.trim();
    if(!v){projectNameInput.value='未命名项目'}
    panelProjectName.textContent=projectNameInput.value.trim()||'未命名项目';
    localStorage.setItem('canvas-project-name',projectNameInput.value.trim()||'未命名项目');
  });
  const savedName=localStorage.getItem('canvas-project-name');
  if(savedName){projectNameInput.value=savedName;panelProjectName.textContent=savedName}

  // Project menu handlers
  document.getElementById('project-menu').addEventListener('click',ev=>{
    const action=ev.target.closest('[data-pm]')?.dataset.pm;
    if(!action)return;
    if(action==='all'){toggleP('project',false);document.getElementById('btn-logo').classList.remove('expanded');document.getElementById('left-panel').classList.add('show-all-projects');openPanel();document.querySelectorAll('#panel-tabs .tab-btn').forEach(b=>b.classList.remove('active'));document.querySelector('[data-ptab="assets"]').classList.add('active');showAllProjects()}
    if(action==='new'){toggleP('project',false);document.getElementById('btn-logo').classList.remove('expanded');clearCanvas()}
    if(action==='delete'){toggleP('project',false);document.getElementById('btn-logo').classList.remove('expanded');document.getElementById('delete-confirm').classList.add('open');document.getElementById('delete-confirm').style.display='flex'}
  });

  // Delete confirmation dialog
  document.getElementById('btn-delete-cancel').addEventListener('click',()=>{
    document.getElementById('delete-confirm').classList.remove('open');
    setTimeout(()=>{document.getElementById('delete-confirm').style.display='none'},200);
  });
  document.getElementById('btn-delete-confirm').addEventListener('click',()=>{
    clearCanvas();
    projectNameInput.value='未命名项目';
    panelProjectName.textContent='未命名项目';
    localStorage.removeItem('canvas-project-name');
    document.getElementById('delete-confirm').classList.remove('open');
    setTimeout(()=>{document.getElementById('delete-confirm').style.display='none'},200);
  });

  function clearCanvas(){nodes=[];edges=[];nodeIdCounter=0;typeCounters={};selectedNodeId=null;expandedNodeId=null;selectedEdge=null;undoStack=[];redoStack=[];canvasCount=2;activeCanvasTab=1;canvases={1:{nodes:[],edges:[]},2:{nodes:[],edges:[]}};renderAllNodes();renderEdges();updatePanel();syncUndoRedoButtons();body.classList.remove('has-nodes');ucLabel();renderCanvasPopover();localStorage.removeItem('canvas-workflow')}
  function showAllProjects(){
    // Show project list in panel
    const pc=document.getElementById('panel-content');
    const projects=getSavedProjects();
    if(projects.length===0){
      pc.innerHTML='<div class="empty-state">暂无项目<br><br><button class="btn-gen" style="width:auto;padding:6px 16px;font-size:12px;display:inline" id="panel-create-project">+ 创建新项目</button></div>';
      setTimeout(()=>{const b=document.getElementById('panel-create-project');if(b)b.addEventListener('click',()=>{clearCanvas();projectNameInput.value='未命名项目';panelProjectName.textContent='未命名项目';localStorage.removeItem('canvas-project-name');pc.innerHTML='<div class="empty-state">画布暂无主题</div>';nodeCount.textContent='共 0 个主题'})},100);
      return;
    }
    let h='';
    // Current project first
    h+='<div style="padding:10px;border-radius:8px;background:var(--hover-2);margin-bottom:8px;cursor:pointer"><div style="font-size:13px;color:var(--text-1);font-weight:500">'+projectNameInput.value+'</div><div style="font-size:11px;color:var(--text-4)">当前项目 · '+nodes.length+' 个主题</div></div>';
    // Other projects
    projects.filter(p=>p.name!==projectNameInput.value).forEach(p=>{
      h+='<div style="padding:10px;border-radius:8px;margin-bottom:6px;cursor:pointer;transition:background var(--dur)" onmouseenter="this.style.background=\'var(--hover)\'" onmouseleave="this.style.background=\'transparent\'" onclick="(function(){document.getElementById(\'project-name-input\').value=\''+p.name.replace(/'/g,'\\\'')+'\';document.getElementById(\'panel-project-name\').textContent=\''+p.name.replace(/'/g,'\\\'')+'\';localStorage.setItem(\'canvas-project-name\',\''+p.name.replace(/'/g,'\\\'')+'\')})()"><div style="font-size:13px;color:var(--text-2)">'+p.name+'</div><div style="font-size:11px;color:var(--text-4)">'+p.date+' · '+p.nodeCount+' 个主题</div></div>';
    });
    pc.innerHTML=h;
  }
  function getSavedProjects(){
    const projects=[];
    const current={name:projectNameInput.value||'未命名项目',nodeCount:nodes.length,date:new Date().toISOString().split('T')[0]};
    try{const wf=JSON.parse(localStorage.getItem('canvas-workflow'));if(wf&&wf.nodes)current.nodeCount=wf.nodes.length}catch(e){}
    projects.push(current);
    const saved=localStorage.getItem('canvas-projects-list');
    if(saved){try{const list=JSON.parse(saved);projects.push(...list.filter(p=>p.name!==current.name))}catch(e){}}
    return projects;
  }

  // Canvas tabs
  const canvasTabCollapsed=document.getElementById('canvas-tab-collapsed'),canvasPopover=document.getElementById('canvas-popover'),panelCanvasName=document.getElementById('panel-canvas-name');
  function renderCanvasPopover(){let h='';for(let i=1;i<=canvasCount;i++){const a=i===activeCanvasTab;h+='<div class="canvas-item'+(a?' active':'')+'" data-cv="'+i+'"><div class="cv-left"><span class="cv-dot"></span>画布 '+i+'</div><div class="cv-actions"><button class="cv-act" data-cv-rename="'+i+'"><svg><use href="#icon-pencil"/></svg></button>'+(canvasCount>1?'<button class="cv-act" data-cv-close="'+i+'"><svg><use href="#icon-x"/></svg></button>':'')+'</div></div>'}h+='<div class="canvas-add" id="cv-add-btn">+ 新建画布</div>';canvasPopover.innerHTML=h}
  function ucLabel(){canvasTabCollapsed.innerHTML='画布 '+activeCanvasTab+' <svg class="tab-chevron"><use href="#icon-chevron-down"/></svg>';panelCanvasName.innerHTML='画布 '+activeCanvasTab+' <svg class="chevron"><use href="#icon-chevron-down"/></svg>'}
  function loadCanvas(id){
    activeCanvasTab=Math.max(1,Math.min(+id||1,canvasCount));
    const target=canvases[activeCanvasTab]||{nodes:[],edges:[]};
    const raw=target.nodes||[],rawEdges=target.edges||[],known=new Set();
    nodes=raw.filter(n=>n&&Number.isFinite(+n.id)&&!known.has(+n.id)&&(known.add(+n.id),true)).map(n=>({...n,id:+n.id,type:'text',w:120,ports:true,input:typeof n.input==='string'?n.input:'',output:null,status:'idle',config:n.config&&typeof n.config==='object'?n.config:{},_z:1}));
    edges=rawEdges.filter(e=>e&&known.has(+e.from)&&known.has(+e.to)&&+e.from!==+e.to).map(e=>({...e,from:+e.from,to:+e.to,fromSide:['left','right','top','bottom'].includes(e.fromSide)?e.fromSide:'right',toSide:['left','right','top','bottom'].includes(e.toSide)?e.toSide:'left'}));
    nodes.forEach(n=>{const kind=n.config?.kind||(edges.some(e=>e.to===n.id)?'leaf':'root');n.config={...n.config,kind,color:n.config?.color||kindColor(kind),size:n.config?.size||'md'}});
    rebuildNodeCounters();
    selectedNodeId=null;expandedNodeId=null;selectedEdge=null;undoStack=[];redoStack=[];
    refreshHiddenTopics();renderAllNodes();renderEdges();updatePanel();
    body.classList.toggle('has-nodes',visibleTopicCount()>0);
    syncUndoRedoButtons();
    ucLabel();renderCanvasPopover();scheduleSave()
  }
  function switchCanvas(id){
    id=Math.max(1,Math.min(+id||1,canvasCount));
    if(id===activeCanvasTab)return;
    persistActiveCanvas();
    loadCanvas(id)
  }
  function applyWorkspace(workflow){
    const data=workflow||{};
    if(data.canvases&&typeof data.canvases==='object'){
      const map={};
      Object.entries(data.canvases).forEach(([k,v])=>{const id=+k||1;if(id>=1)map[id]={nodes:Array.isArray(v?.nodes)?v.nodes:[],edges:Array.isArray(v?.edges)?v.edges:[]}});
      if(!Object.keys(map).length)map[1]={nodes:[],edges:[]};
      canvases=map;
      canvasCount=Math.max(1,Object.keys(map).length);
      activeCanvasTab=Math.min(Math.max(1,+data.activeCanvas||1),canvasCount)
    }else{
      canvases={1:{nodes:Array.isArray(data.nodes)?data.nodes:[],edges:Array.isArray(data.edges)?data.edges:[]},2:{nodes:[],edges:[]}};
      canvasCount=2;
      activeCanvasTab=1
    }
    const active=canvases[activeCanvasTab]||{nodes:[],edges:[]};
    const normalized=(active.nodes||[]).map(n=>({...n,w:['text','image','video','audio'].includes(n.type)?(TYPE_META[n.type]?.w||350):([460,840].includes(+n.w)?(TYPE_META[n.type]?.w||350):(+n.w||TYPE_META[n.type]?.w||350)),ports:TYPE_META[n.type]?.ports??n.ports,input:n.input||'',output:n.output||null,status:n.status==='running'?'idle':n.status||'idle',message:n.status==='running'?'任务已暂停，可重新运行':n.message||'',progress:n.status==='success'?100:n.progress||0,taskId:n.taskId||'',config:n.config||{}}));
    restoreGraph(JSON.stringify({nodes:normalized,edges:active.edges||[]}));
    ucLabel();renderCanvasPopover()
  }
  canvasTabCollapsed.addEventListener('click',ev=>{ev.stopPropagation();renderCanvasPopover();toggleP('canvas');if(popupState.canvas){pos(canvasPopover,canvasTabCollapsed.getBoundingClientRect());canvasTabCollapsed.classList.add('expanded')}else{canvasTabCollapsed.classList.remove('expanded')}});
  // Delegate canvas popover clicks
  canvasPopover.addEventListener('click',ev=>{
    const item=ev.target.closest('.canvas-item');
    if(item&&!ev.target.closest('.cv-act')){switchCanvas(+item.dataset.cv);toggleP('canvas',false);canvasTabCollapsed.classList.remove('expanded')}
    if(ev.target.closest('[data-cv-close]')){
      const id=+ev.target.closest('[data-cv-close]').dataset.cvClose;
      if(canvasCount>1&&canvases[id]){
        persistActiveCanvas();
        delete canvases[id];
        const ids=Object.keys(canvases).map(Number).sort((a,b)=>a-b);
        const next={};ids.forEach((old,index)=>{next[index+1]=canvases[old]});
        canvases=next;
        canvasCount=ids.length;
        loadCanvas(Math.min(activeCanvasTab,canvasCount))
      }
    }
    if(ev.target.closest('#cv-add-btn')){
      canvasCount++;
      canvases[canvasCount]={nodes:[],edges:[]};
      loadCanvas(canvasCount)
    }
  });

  // Settings
  const runtimeApiKeys=new Map();
  let discoveredFreeModels=[],discoveredModelInventory=[];
  const activeApiKey=provider=>runtimeApiKeys.get(provider)||'';
  const settingsBtn=document.getElementById('btn-settings');
  async function restorePersistentSettings(){
    try{
      const response=await fetch('/api/settings',{cache:'no-store'});if(!response.ok)throw new Error('设置服务不可用');
      const saved=await response.json();
      Object.entries(saved.keys||{}).forEach(([provider,key])=>{if(key)runtimeApiKeys.set(provider,key)});
      if(saved.proxy!==undefined){if(saved.proxy)localStorage.setItem('apikey-proxy',saved.proxy);else localStorage.removeItem('apikey-proxy')}
      if(saved.timeout)localStorage.setItem('api-request-timeout',String(saved.timeout));
      Object.entries(saved.providerSettings||{}).forEach(([key,value])=>{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key)});
      if(runtimeApiKeys.size)settingsBtn.dataset.haskey='1';
    }catch(error){console.warn('Persistent settings unavailable',error)}
  }
  async function persistLocalSettings(payload){
    const response=await fetch('/api/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!response.ok)throw new Error('本地设置服务不可用')
  }
  settingsBtn.addEventListener('click',ev=>{ev.stopPropagation();closeAll();loadSavedKeys();toggleP('settings');if(popupState.settings)document.getElementById('settings-close').focus()});
  document.getElementById('save-apikey').addEventListener('click',async()=>{
    const keys={
      siliconflow:document.getElementById('apikey-siliconflow').value.trim(),
      dashscope:document.getElementById('apikey-dashscope').value.trim(),
      zhipu:document.getElementById('apikey-zhipu').value.trim(),
      minimax:document.getElementById('apikey-minimax').value.trim(),
      deepseek:document.getElementById('apikey-deepseek').value.trim(),
      custom:document.getElementById('apikey-custom').value.trim()
    };
    let hasAny=false;
    for(const[k,v]of Object.entries(keys)){if(v){runtimeApiKeys.set(k,v);hasAny=true}else runtimeApiKeys.delete(k)}
    if(hasAny)settingsBtn.dataset.haskey='1';else delete settingsBtn.dataset.haskey;
    const proxy=document.getElementById('apikey-proxy').value.trim();
    if(proxy)localStorage.setItem('apikey-proxy',proxy);else localStorage.removeItem('apikey-proxy');
    const timeout=clamp(+document.getElementById('api-request-timeout').value||60,10,600);
    localStorage.setItem('api-request-timeout',String(timeout));
    const providerSettings={
      'endpoint-dashscope':document.getElementById('endpoint-dashscope').value.trim(),
      'endpoint-custom':document.getElementById('endpoint-custom').value.trim(),
      'model-custom':document.getElementById('model-custom').value.trim()
    };
    for(const[k,v]of Object.entries(providerSettings)){if(v)localStorage.setItem(k,v);else localStorage.removeItem(k)}
    canvasSettings={...canvasSettings,grid:document.getElementById('setting-grid').checked,edgeMotion:document.getElementById('setting-edge-motion').checked,autosave:document.getElementById('setting-autosave').checked,autoClosePanels:document.getElementById('setting-auto-close').checked};
    localStorage.setItem('canvas-settings',JSON.stringify(canvasSettings));snapGridOn=canvasSettings.grid;syncCanvasToggleButtons();body.classList.toggle('edge-motion',canvasSettings.edgeMotion);
    try{await persistLocalSettings({keys,proxy,timeout,providerSettings})}catch(error){showToast('本地服务未运行：设置仅在本次浏览器会话保留');return}
    saveWorkflow();renderAllNodes();renderEdges();
    closeP('settings');showToast('保存成功')
  });
  document.getElementById('settings-close').addEventListener('click',()=>closeP('settings'));
  document.getElementById('settings-cancel').addEventListener('click',()=>closeP('settings'));
  document.getElementById('settings-scrim').addEventListener('click',()=>closeP('settings'));
  document.querySelectorAll('[data-secret-toggle]').forEach(button=>button.addEventListener('click',()=>{const input=button.parentElement.querySelector('[data-secret]');if(!input)return;const hidden=input.type==='password';input.type=hidden?'text':'password';button.setAttribute('aria-label',(hidden?'隐藏':'显示')+input.closest('.setting-row').querySelector('label').textContent+'密钥')}));
  document.getElementById('settings-check-video').addEventListener('click',()=>{
    const videoNode=getNode(selectedNodeId);const id=videoNode?.type==='video'?videoNode.config?.model:'sf-wan2.1-t2v';const meta={...(MODEL_CATALOG[id]||MODEL_CATALOG['custom-video'])};if(meta.provider==='custom')meta.apiModel=configuredModel(meta.provider);
    const proxy=(document.getElementById('apikey-proxy').value||'').trim()||configuredEndpoint(meta.provider),key=(document.getElementById('apikey-'+meta.provider)?.value||activeApiKey(meta.provider)||'').trim();
    if(!meta.apiModel)return showToast('请填写模型名或方舟接入点 ID');
    if(!key)return showToast('请先填写 '+meta.provider+' API Key');
    if(!proxy&&!meta.direct)return showToast('该模型需要统一代理或接口地址');
    showToast(proxy?'视频配置完整：将通过代理执行':'视频配置完整：将通过本地安全网关执行');
  });
  // Load saved keys into settings modal
  function loadSavedKeys(){
    ['siliconflow','zhipu','minimax','dashscope','deepseek','custom'].forEach(k=>{
      const v=activeApiKey(k);
      const el=document.getElementById('apikey-'+k);if(el&&v)el.value=v;
    });
    ['endpoint-dashscope','endpoint-custom','model-custom'].forEach(k=>{const el=document.getElementById(k),value=localStorage.getItem(k);if(el&&value)el.value=value});
    const proxyEl=document.getElementById('apikey-proxy');
    const proxy=localStorage.getItem('apikey-proxy');if(proxyEl&&proxy)proxyEl.value=proxy;
    document.getElementById('api-request-timeout').value=localStorage.getItem('api-request-timeout')||'60';
    const hasAny=['siliconflow','zhipu','minimax','dashscope','deepseek','custom'].some(k=>activeApiKey(k));
    if(hasAny)settingsBtn.dataset.haskey='1';
    try{canvasSettings={...canvasSettings,...JSON.parse(localStorage.getItem('canvas-settings')||'{}')}}catch(e){}
    document.getElementById('setting-grid').checked=canvasSettings.grid!==false;document.getElementById('setting-edge-motion').checked=canvasSettings.edgeMotion!==false;document.getElementById('setting-autosave').checked=canvasSettings.autosave!==false;document.getElementById('setting-auto-close').checked=canvasSettings.autoClosePanels!==false;
    const used=Object.keys(localStorage).reduce((sum,key)=>sum+(localStorage.getItem(key)?.length||0)*2,0),usedKb=used/1024;
    document.getElementById('settings-storage').textContent=visibleTopicCount()+' 主题 · '+edges.length+' 连线';document.getElementById('settings-storage-size').textContent=usedKb.toFixed(usedKb>=100?0:1)+' KB';document.getElementById('settings-storage-meter').style.width=Math.min(100,used/5242880*100)+'%'
  }
  document.getElementById('settings-clear-history').addEventListener('click',async()=>{writeHistoryCache([]);localStorage.removeItem(HISTORY_KEY);try{await fetch('/api/history',{method:'DELETE'})}catch(error){console.warn('Persistent history unavailable',error)}loadSavedKeys();if(panelMode==='history'||panelMode==='assets')updatePanel()});
  const MODEL_ENDPOINTS={siliconflow:'https://api.siliconflow.cn/v1/models',dashscope:'https://dashscope.aliyuncs.com/compatible-mode/v1/models',zhipu:'https://open.bigmodel.cn/api/paas/v4/models',minimax:'https://api.minimaxi.com/v1/models',deepseek:'https://api.deepseek.com/v1/models'};
  const FREE_ID_PATTERN=/^(gemma-|llama-3-8b|sdxl-turbo|whisper-small)/i;
  function modelText(model){return [model.id,model.name,model.display_name,model.modality,model.type,...(model.tags||[]),...(model.capabilities||[])].filter(Boolean).join(' ').toLowerCase()}
  function isFreeModel(model){const text=modelText(model),pricing=model.pricing||{},quota=model.quota||{};return !(model.deprecated===true||model.status&&model.status!=='active'||/paid_only|enterprise/.test(text))&&(String(pricing.prompt)==='0'&&String(pricing.completion)==='0'||quota.remaining>0&&quota.unit==='free_credits'||(model.tags||[]).some(tag=>['free','open_source','community'].includes(String(tag).toLowerCase()))||FREE_ID_PATTERN.test(model.id||''))}
  function modelModality(model){const text=modelText(model);if(/image-generation|text-to-image|sdxl|dall-e|seedream|flux|wanx/.test(text))return'image';if(/video-generation|text-to-video|cogvideo|kling|wan-|minimax.*video/.test(text))return'video';if(/audio-generation|\btts\b|\bstt\b|whisper|bark|musicgen|stable.audio|fish.speech|chattts|cosyvoice|edge.neural/.test(text))return'audio';return'text'}
  function discoveryEndpoint(provider){
    const raw=(provider==='custom'?document.getElementById('endpoint-custom').value:'').trim();
    if(raw){const base=raw.replace(/\/$/,'');if(/\/models$/.test(base))return base;if(/\/(chat\/completions|responses)$/.test(base))return base.replace(/\/(chat\/completions|responses)$/,'/models');return base+'/models'}
    if(provider==='dashscope'&&localStorage.getItem('endpoint-dashscope'))return dashscopeBaseUrl()+'/models';
    return MODEL_ENDPOINTS[provider]||''
  }
  function modelQuotaInfo(model){
    const quota=model.quota||model.usage||{},pricing=model.pricing||{},remaining=quota.remaining??quota.available??quota.balance??model.remaining_credits??model.credits_remaining,unit=quota.unit||quota.currency||'额度';
    const priceFree=String(pricing.prompt)==='0'&&String(pricing.completion)==='0',free=isFreeModel(model);
    const quotaText=remaining!==undefined&&remaining!==null?String(remaining)+' '+String(unit):priceFree?'免费定价（接口未返回剩余额度）':free?'免费标记（接口未返回剩余额度）':'接口未返回额度';
    return{free,quotaText,available:!(model.deprecated===true||model.status&&model.status!=='active'),status:model.status||'active'}
  }
  function renderDiscoverySummary(message){
    const host=document.getElementById('discovered-free-models');if(!host)return;
    discoveredFreeModels.forEach(model=>{
      if(model.fixed)return;
      const catalog=model.modality==='video'?MODEL_CATALOG:model.modality==='image'?IMAGE_MODEL_CATALOG:model.modality==='audio'?AUDIO_MODEL_CATALOG:TEXT_MODEL_CATALOG;
      const existing=catalog[model.id],entry={...existing,label:model.displayName,provider:model.provider,apiModel:model.id,direct:existing?.direct===true,freeTier:true};
      catalog[model.id]=model.modality==='text'?{...entry,endpoint:existing?.endpoint||(model.provider==='deepseek'?'https://api.deepseek.com/v1/chat/completions':'')}:entry;
    });
    const byProvider=discoveredModelInventory.reduce((groups,item)=>{(groups[item.provider]||=[]).push(item);return groups},{});
    const summary=message||(!discoveredModelInventory.length?'未检测到模型。请确认密钥、接口地址或浏览器跨域策略。':'检测到 '+discoveredModelInventory.length+' 个模型，其中 '+discoveredFreeModels.length+' 个已验证为免费且可用。');
    const groups=Object.entries(byProvider).map(([provider,items])=>'<div class="settings-provider-result"><div class="settings-provider-result-head"><span>'+esc(providerNames[provider]||provider)+'</span><small>'+items.length+' 个模型</small></div>'+items.map(item=>'<div class="settings-model-row"><div><strong title="'+esc(item.id)+'">'+esc(item.displayName)+'</strong><small>'+esc(item.id)+' · '+esc(item.modality)+'</small></div><div class="settings-model-tags"><span class="settings-model-tag '+(item.available?'ready':'warn')+'">'+(item.available?'可用':'不可用')+'</span>'+(item.free&&item.available?'<span class="settings-model-tag free">免费</span>':'')+'<span class="settings-model-tag" title="'+esc(item.quotaText)+'">'+esc(item.quotaText)+'</span></div></div>').join('')+'</div>').join('');
    host.innerHTML='<div class="settings-model-results"><div class="settings-model-summary">'+esc(summary)+'</div>'+groups+'</div>'
  }
  const SUPPORTED_MEDIA_MODEL_TESTS=[
    {provider:'siliconflow',modality:'image',label:'FLUX.1-schnell',apiModel:'black-forest-labs/FLUX.1-schnell',quota:'完全免费，无限量',aliases:['flux.1-schnell','black-forest-labs/flux.1-schnell']},
    {provider:'siliconflow',modality:'image',label:'Stable Diffusion XL',apiModel:'stabilityai/stable-diffusion-xl-base-1.0',quota:'完全免费，无限量',aliases:['stable-diffusion-xl','sdxl','stable-diffusion-xl-base-1.0']},
    {provider:'dashscope',modality:'image',label:'Wanx-2.1（通义万相）',apiModel:'wanx2.1-t2i-turbo',quota:'每日 50 次免费调用',aliases:['wanx2.1-t2i-turbo','wanx-2.1','wan2.1']},
    {provider:'zhipu',modality:'image',label:'CogView-4',apiModel:'cogview-4',quota:'注册送 500 次 + 每日 50 次',aliases:['cogview-4']},
    {provider:'siliconflow',modality:'video',label:'Wan2.2-T2V',apiModel:'Wan-AI/Wan2.2-T2V-A14B',quota:'以硅基流动控制台额度为准',aliases:['wan2.2-t2v','wan-ai/wan2.2-t2v','wan2.1-t2v']},
    {provider:'siliconflow',modality:'video',label:'Wan2.2-I2V',apiModel:'Wan-AI/Wan2.2-I2V-A14B',quota:'以硅基流动控制台额度为准',aliases:['wan2.2-i2v','wan-ai/wan2.2-i2v','wan2.1-i2v']},
    {provider:'zhipu',modality:'video',label:'CogVideoX-Flash',apiModel:'cogvideox-flash',quota:'注册送 100 次 + 每日 20 次',aliases:['cogvideox-flash']},
    {provider:'minimax',modality:'video',label:'Video-01-Lite',apiModel:'MiniMax-H3',quota:'以 MiniMax 控制台剩余额度为准',aliases:['minimax-h3','video-01-lite','minimax-video-01-lite']},
    {provider:'dashscope',modality:'video',label:'Wanx-Video',apiModel:'wan2.1-t2v-turbo',quota:'每日 10 次免费',aliases:['wan2.1-t2v-turbo','wanx-video','wanx2.1-video']},
    {provider:'dashscope',modality:'audio',label:'CosyVoice-V2',apiModel:'cosyvoice-v2',quota:'每月 100 万字符免费',aliases:['cosyvoice-v2','cosyvoice']},
    {provider:'deepseek',modality:'text',label:'DeepSeek V4 Pro',apiModel:'deepseek-v4-pro',quota:'以 DeepSeek 控制台剩余额度为准',aliases:['deepseek-v4-pro','deepseek-chat']},
    {provider:'deepseek',modality:'text',label:'DeepSeek V4 Flash',apiModel:'deepseek-v4-flash',quota:'以 DeepSeek 控制台剩余额度为准',aliases:['deepseek-v4-flash','deepseek-reasoner']},
  ];
  function supportedModelMatches(model,spec){const text=modelText(model);return spec.aliases.some(alias=>text.includes(alias.toLowerCase()))}
  async function checkSupportedMediaConnectivity(){
    const button=document.getElementById('refresh-model-list'),inventory=[],issues=[];
    button.disabled=true;button.textContent='正在检测…';
    try{
      for(const provider of [...new Set(SUPPORTED_MEDIA_MODEL_TESTS.map(spec=>spec.provider))]){
        const specs=SUPPORTED_MEDIA_MODEL_TESTS.filter(spec=>spec.provider===provider),key=activeApiKey(provider)||document.getElementById('apikey-'+provider)?.value.trim();
        if(!key){specs.forEach(spec=>inventory.push({...spec,id:spec.apiModel,displayName:spec.label,available:false,free:true,fixed:true,quotaText:'未填写 API Key',status:'missing_key'}));continue}
        const endpoint=discoveryEndpoint(provider);
        try{
          const response=await fetch(endpoint,{headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'}});
          if(response.status===401||response.status===403)throw new Error('密钥无效');
          if(!response.ok)throw new Error('模型列表不可用（'+response.status+'）');
          const payload=await response.json(),models=Array.isArray(payload)?payload:payload.data||payload.models||[];
          specs.forEach(spec=>{const remote=models.find(model=>supportedModelMatches(model,spec)),available=!remote||!(remote.deprecated===true||remote.status&&remote.status!=='active'),quotaText=remote?spec.quota:spec.quota+'（模型列表未显式返回）';inventory.push({...spec,id:spec.apiModel,displayName:spec.label,raw:remote||null,available,free:true,fixed:true,status:remote?'active':'reachable',quotaText})})
        }catch(error){issues.push((providerNames[provider]||provider)+'：'+(error.message||'无法访问模型列表'));specs.forEach(spec=>inventory.push({...spec,id:spec.apiModel,displayName:spec.label,available:false,free:true,fixed:true,status:'error',quotaText:error.message||'连接失败'}))}
      }
      discoveredModelInventory=inventory;discoveredFreeModels=inventory.filter(item=>item.available);console.log(JSON.stringify({supportedModels:inventory.map(({label,provider,modality,available,quotaText})=>({label,provider,modality,available,quota:quotaText}))},null,2));
      const available=inventory.filter(item=>item.available).length;renderDiscoverySummary('已检测 '+inventory.length+' 个指定模型，'+available+' 个已接通。'+(issues.length?' '+issues.join('；'):''));
    }finally{button.disabled=false;button.textContent='检测指定模型连通性'}
  }
  async function refreshFreeModels(){
    const button=document.getElementById('refresh-model-list'),providers=['siliconflow','dashscope','zhipu','minimax','deepseek','custom'].filter(provider=>activeApiKey(provider)||document.getElementById('apikey-'+provider)?.value.trim());if(!providers.length){renderDiscoverySummary('请先填写至少一个 API Key，点击保存设置后再检测模型与额度。');return}
    button.disabled=true;button.textContent='正在检测…';const found=[],inventory=[],issues=[];
    try{for(const provider of providers){const key=activeApiKey(provider)||document.getElementById('apikey-'+provider)?.value.trim(),endpoint=discoveryEndpoint(provider);if(!endpoint){issues.push((providerNames[provider]||provider)+' 未提供模型列表端点');continue}try{const response=await fetch(endpoint,{headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'}});if(response.status===401||response.status===403){issues.push((providerNames[provider]||provider)+'：密钥无效');continue}if(!response.ok){issues.push((providerNames[provider]||provider)+'：模型列表不可用（'+response.status+'）');continue}const payload=await response.json(),models=Array.isArray(payload)?payload:payload.data||payload.models||[];models.forEach(model=>{const id=String(model.id||model.model||'');if(!id)return;const quota=modelQuotaInfo(model),modality=modelModality(model),entry={id,provider,modality,displayName:model.display_name||model.name||id,raw:model,multimodal:/vision|multimodal/.test(modelText(model)),...quota};inventory.push(entry);if(entry.free&&entry.available)found.push(entry)})}catch(error){issues.push((providerNames[provider]||provider)+'：无法访问模型列表')}}
      discoveredModelInventory=inventory;discoveredFreeModels=found;console.log(JSON.stringify({models:inventory.map(({id,provider,modality,available,free,quotaText})=>({id,provider,modality,available,free,quota:quotaText})),freeModels:found.map(({id,provider,modality,quotaText})=>({id,provider,modality,quota:quotaText}))},null,2));renderDiscoverySummary(inventory.length?'已完成检测：'+inventory.length+' 个模型，'+found.length+' 个免费且可用模型。':issues.join('；')||'未发现任何模型，请检查接口地址和密钥。')
    }finally{button.disabled=false;button.textContent='检测模型与额度'}
  }
  ['refresh-model-list','settings-check-video'].forEach(id=>{
    const previous=document.getElementById(id),button=previous.cloneNode(true);
    if(id==='settings-check-video')button.textContent='检测指定模型连通性';
    if(id==='refresh-model-list')button.textContent='检测指定模型连通性';
    previous.replaceWith(button);button.addEventListener('click',checkSupportedMediaConnectivity)
  });
  loadSavedKeys();
  Promise.all([restorePersistentSettings(),loadPersistentHistory()]).then(()=>{loadSavedKeys();updatePanel()});
  snapGridOn=canvasSettings.grid!==false;hideEdgesOn=canvasSettings.hideEdges===true;body.classList.toggle('edge-motion',canvasSettings.edgeMotion!==false);body.classList.toggle('hide-edges',hideEdgesOn);syncCanvasToggleButtons();

  // Zoom
  function buildZoomPopover(){const zp=document.getElementById('zoom-popup');zp.innerHTML='<div id="zoom-input-row"><input type="number" id="zoom-num-input" value="'+zoomLevel+'" min="10" max="800"><span>%</span></div><div class="zoom-item" data-zact="+10"><span class="zm-name">放大</span><span class="zm-key">Ctrl +</span></div><div class="zoom-item" data-zact="-10"><span class="zm-name">缩小</span><span class="zm-key">Ctrl −</span></div><div class="zoom-item" data-zact="fit"><span class="zm-name">适合屏幕</span><span class="zm-key">Ctrl 0</span></div><div class="menu-divider"></div><div class="zoom-item" data-zact="50"><span class="zm-name">缩放至50%</span></div><div class="zoom-item" data-zact="100"><span class="zm-name">缩放至100%</span></div><div class="zoom-item" data-zact="200"><span class="zm-name">缩放至200%</span></div>';zp.querySelectorAll('.zoom-item').forEach(it=>it.addEventListener('click',()=>{const a=it.dataset.zact;if(a==='+10')setZoom(zoomLevel+10);else if(a==='-10')setZoom(zoomLevel-10);else if(a==='fit')fitView();else setZoom(+a)}));const ni=zp.querySelector('#zoom-num-input');ni.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();setZoom(+ni.value||100);ni.value=zoomLevel}});ni.addEventListener('blur',()=>{setZoom(+ni.value||100);ni.value=zoomLevel})}
  function setZoom(value,anchor){
    const next=Math.max(10,Math.min(800,Math.round(value))),oldScale=scaleValue(),rect=viewport.getBoundingClientRect();
    const point=anchor||{x:rect.left+rect.width/2,y:rect.top+rect.height/2};
    const worldX=(point.x-rect.left-panX)/oldScale,worldY=(point.y-rect.top-panY)/oldScale;
    zoomLevel=next;const nextScale=scaleValue();panX=point.x-rect.left-worldX*nextScale;panY=point.y-rect.top-worldY*nextScale;zoomVal.textContent=zoomLevel+'%';syncCanvasToolbar();applyViewTransform();queueEdges()
  }
  function fitView(){
    if(!nodes.length){zoomLevel=100;panX=0;panY=0;zoomVal.textContent='100%';syncCanvasToolbar();applyViewTransform();return}
    const rect=viewport.getBoundingClientRect(),minX=Math.min(...nodes.map(n=>n.x)),minY=Math.min(...nodes.map(n=>n.y)),maxX=Math.max(...nodes.map(n=>n.x+n.w)),maxY=Math.max(...nodes.map(n=>n.y+Math.max(nodeHeight(n),document.querySelector('[data-nid="'+n.id+'"]')?.offsetHeight||0)));
    const scale=Math.max(.1,Math.min(1.5,(rect.width-120)/(maxX-minX||1),(rect.height-140)/(maxY-minY||1)));zoomLevel=Math.round(scale*100);panX=(rect.width-(minX+maxX)*scale)/2;panY=(rect.height-(minY+maxY)*scale)/2;zoomVal.textContent=zoomLevel+'%';syncCanvasToolbar();applyViewTransform();queueEdges()
  }
  let compactViewport=window.matchMedia('(max-width:720px)').matches,viewportResizeTimer=0;
  function fitCanvasForViewport(){requestAnimationFrame(()=>{if(nodes.length)fitView()})}
  document.getElementById('btn-zoom').addEventListener('click',ev=>{ev.stopPropagation();closeAll();buildZoomPopover();toggleP('zoom');if(popupState.zoom)pos(document.getElementById('zoom-popup'),ev.currentTarget.getBoundingClientRect(),{a:true,al:false})});

  // Node menu
  function buildNodeMenu(){const nm=document.getElementById('node-menu');let h='<div class="menu-section-label">添加主题</div>';
    [{id:'root',label:'中心主题',icon:'icon-nt-text'},{id:'branch',label:'分支主题',icon:'icon-nt-text'},{id:'leaf',label:'子主题',icon:'icon-nt-text'}].forEach(it=>{h+='<button type="button" class="menu-item" data-nt="'+it.id+'"><svg style="width:16px;height:16px"><use href="#'+it.icon+'"/></svg>'+it.label+'</button>'});
    nm.innerHTML=h;
  }
  function selectAddNodeMenuItem(type){
    const point=pendingAddPoint;pendingAddPoint=null;
    const pendingSource=pendingConnectSource;pendingConnectSource=null;
    const kindMap={root:'root',branch:'branch',leaf:'leaf'};
    if(kindMap[type]){
      const meta=TYPE_META.text;
      const node=addNode('text',point&&meta?{x:point.x-meta.w/2,y:point.y,config:{kind:kindMap[type]}}:{config:{kind:kindMap[type]}});
      if(!node)showToast('添加主题失败，请重试','validation');
      else if(pendingSource&&pendingSource.nodeId!==node.id){
        const from=pendingSource.nodeId,to=node.id,fromSide=pendingSource.side,toSide=pendingSource.side==='right'?'left':pendingSource.side==='left'?'right':pendingSource.side==='bottom'?'top':'bottom';
        if(!edges.some(e=>e.from===from&&e.to===to)&&!wouldCreateCycle(from,to)){
          rememberGraph();
          edges.push({id:'edge-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),from,fromSide,to,toSide});
          selectedEdge=String(edges[edges.length-1].id);
          renderEdges();updatePanel();scheduleSave();
          showToast('已连接新主题')
        }
      }
      if(node)selectNode(node.id);
    }
    toggleP('node',false)
  }
  // Capture phase prevents the global canvas handler from dismissing the menu first.
  document.addEventListener('click',event=>{
    const item=event.target.closest?.('#node-menu [data-nt]');if(!item)return;
    event.preventDefault();event.stopPropagation();selectAddNodeMenuItem(item.dataset.nt)
  },true);
  btnAddNode.addEventListener('click',ev=>{ev.stopPropagation();if(popupState.node){toggleP('node',false);return}pendingAddPoint=null;pendingConnectSource=null;closeUtility();closeAll();buildNodeMenu();toggleP('node');if(popupState.node)placeAbove(document.getElementById('node-menu'),btnAddNode.getBoundingClientRect(),12)});

  // Move tool menu
  document.getElementById('btn-move-tool').addEventListener('click',ev=>{ev.stopPropagation();closeUtility();closeAll();const mm=document.getElementById('move-menu');const mAct=currentTool==='move'?' active':'';const hAct=currentTool==='hand'?' active':'';mm.innerHTML='<div class="menu-item'+mAct+'" data-mt="move"><svg style="width:16px;height:16px"><use href="#icon-move"/></svg>移动<kbd style="margin-left:auto">V</kbd></div><div class="menu-item'+hAct+'" data-mt="hand"><svg style="width:16px;height:16px"><use href="#icon-hand"/></svg>抓手工具<kbd style="margin-left:auto">H</kbd></div>';mm.querySelectorAll('.menu-item[data-mt]').forEach(m=>{if(m.dataset.mt===currentTool)m.style.background='var(--hover)';m.addEventListener('click',()=>{setTool(m.dataset.mt);toggleP('move',false)})});toggleP('move');if(popupState.move)placeAbove(mm,ev.currentTarget.getBoundingClientRect(),10)});
  function setTool(t){currentTool=t;if(t==='hand'){body.classList.add('tool-hand');moveToolIcon.innerHTML='<use href="#icon-hand"/>'}else{body.classList.remove('tool-hand','grabbing');moveToolIcon.innerHTML='<use href="#icon-move"/>'}syncCanvasToolbar()}

  // Toggle tools
  function syncCanvasToggleButtons(){
    const hideButton=document.getElementById('btn-hide-edges'),snapButton=document.getElementById('btn-snap');hideButton?.classList.toggle('on',hideEdgesOn);if(hideButton)hideButton.dataset.tooltip=hideEdgesOn?'显示连线':'隐藏连线';snapButton.classList.toggle('on',snapGridOn);snapButton.dataset.tooltip=snapGridOn?'按住 Shift 吸附网格':'启用网格吸附'
  }
  function persistCanvasToggles(){canvasSettings.grid=snapGridOn;canvasSettings.hideEdges=hideEdgesOn;localStorage.setItem('canvas-settings',JSON.stringify(canvasSettings))}
  document.getElementById('btn-snap').addEventListener('click',()=>{snapGridOn=!snapGridOn;syncCanvasToggleButtons();persistCanvasToggles()});
  const minimapButton=document.getElementById('btn-minimap');
  function setMinimapVisible(enabled){minimapOn=enabled;minimapButton.classList.toggle('on',minimapOn);minimapButton.dataset.tooltip=minimapOn?'关闭小地图':'打开小地图';minimap.classList.toggle('open',minimapOn);if(minimapOn){placeAbove(minimap,minimapButton.getBoundingClientRect(),12);renderMinimap()}}
  minimapButton.addEventListener('click',ev=>{ev.stopPropagation();setMinimapVisible(!minimapOn)});
  bindHoverDismiss(minimapButton,minimap,()=>setMinimapVisible(false));
  function arrangeLeftToRight(){
    rememberGraph();
    if(!nodes.length)return;
    refreshHiddenTopics();
    const layoutEdges=edges.filter(e=>!['top','bottom'].includes(e.fromSide)&&!['top','bottom'].includes(e.toSide));
    const childMap=new Map(nodes.map(n=>[n.id,[]]));
    layoutEdges.forEach(e=>{if(childMap.has(e.from)&&e.from!==e.to&&!childMap.get(e.from).includes(e.to))childMap.get(e.from).push(e.to)});
    const hasParent=new Set(layoutEdges.map(e=>e.to));
    const roots=nodes.filter(n=>!hasParent.has(n.id)&&!hiddenTopicIds.has(n.id));
    if(!roots.length)roots=nodes.filter(n=>!hiddenTopicIds.has(n.id)).slice(0,1);
    if(!roots.length)return;
    const W=120,H_GAP=96,LEAF_GAP=84;
    const depth=new Map(nodes.map(n=>[n.id,0])),seen=new Set(roots.map(r=>r.id)),queue=[...roots.map(r=>r.id)];
    while(queue.length){
      const id=queue.shift();
      (childMap.get(id)||[]).forEach(k=>{
        if(hiddenTopicIds.has(k))return;
        depth.set(k,Math.max(depth.get(k)||0,depth.get(id)+1));
        if(!seen.has(k)){seen.add(k);queue.push(k)}
      });
    }
    const leafY=new Map();let slot=0;
    const leafVisited=new Set();
    const walkLeaf=id=>{
      if(leafVisited.has(id))return;leafVisited.add(id);
      const kids=(childMap.get(id)||[]).filter(k=>!hiddenTopicIds.has(k)&&getNode(k));
      if(!kids.length){leafY.set(id,90+slot*LEAF_GAP);slot++}
      else kids.forEach(walkLeaf);
    };
    roots.forEach(r=>walkLeaf(r.id));
    const yOf=new Map(),computing=new Set();
    const walkY=id=>{
      if(yOf.has(id))return yOf.get(id);
      if(computing.has(id)){const fallback=90+slot*LEAF_GAP;slot++;yOf.set(id,fallback);return fallback}
      computing.add(id);
      const kids=(childMap.get(id)||[]).filter(k=>!hiddenTopicIds.has(k)&&getNode(k));
      let y;
      if(!kids.length)y=leafY.get(id)??(90+slot*LEAF_GAP);
      else{const ys=kids.map(walkY);y=ys.length?ys.reduce((a,b)=>a+b,0)/ys.length:90}
      yOf.set(id,y);computing.delete(id);return y;
    };
    roots.forEach(r=>walkY(r.id));
    nodes.forEach(n=>{if(!hiddenTopicIds.has(n.id)&&!yOf.has(n.id)){yOf.set(n.id,90+slot*LEAF_GAP);slot++}});
    nodes.forEach(n=>{if(hiddenTopicIds.has(n.id))return;n.x=80+(depth.get(n.id)||0)*(W+H_GAP);n.y=yOf.get(n.id)??90});
    renderAllNodes();setTimeout(fitView,0);scheduleSave();
  }
  document.getElementById('btn-layout-row-new').addEventListener('click',()=>{if(nodes.length===0)return;arrangeLeftToRight()});
  document.getElementById('btn-arrange').addEventListener('click',()=>{if(nodes.length===0)return;arrangeNodes()});
  document.getElementById('btn-export').addEventListener('click',()=>exportMindmapPNG());
  function exportMindmapPNG(){
    refreshHiddenTopics();
    const visible=nodes.filter(n=>!hiddenTopicIds.has(n.id));
    if(!visible.length){showToast('画布为空，无法导出','validation');return}
    const PAD=80,bounds=new Map();
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    visible.forEach(n=>{
      const el=document.querySelector('.node-group[data-nid="'+n.id+'"]');
      const h=el?el.offsetHeight:nodeHeight(n);
      bounds.set(n.id,{h});
      minX=Math.min(minX,n.x);minY=Math.min(minY,n.y);maxX=Math.max(maxX,n.x+(n.w||TYPE_META.text.w));maxY=Math.max(maxY,n.y+h);
    });
    if(!isFinite(minX)){showToast('画布为空，无法导出','validation');return}
    const W=Math.ceil(maxX-minX)+PAD*2,H=Math.ceil(maxY-minY)+PAD*2,scale=Math.min(1,4096/Math.max(W,H));
    const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');
    svg.setAttribute('xmlns',NS);svg.setAttribute('width',String(Math.round(W*scale)));svg.setAttribute('height',String(Math.round(H*scale)));svg.setAttribute('viewBox','0 0 '+W+' '+H);
    const add=(tag,attrs)=>{const el=document.createElementNS(NS,tag);Object.entries(attrs||{}).forEach(([k,v])=>el.setAttribute(k,String(v)));svg.appendChild(el);return el};
    add('rect',{width:W,height:H,fill:'#0A0A0A'});
    const edgeD=(x1,y1,x2,y2)=>{const dx=Math.max(Math.abs(x2-x1)*.42,50);return'M'+x1.toFixed(1)+','+y1.toFixed(1)+' C'+(x1+dx).toFixed(1)+','+y1.toFixed(1)+' '+(x2-dx).toFixed(1)+','+y2.toFixed(1)+' '+x2.toFixed(1)+','+y2.toFixed(1)};
    edges.forEach(e=>{
      if(hiddenTopicIds.has(e.from)||hiddenTopicIds.has(e.to))return;
      const a=getNode(e.from),b=getNode(e.to);if(!a||!b)return;
      const ha=bounds.get(a.id)?.h||nodeHeight(a),hb=bounds.get(b.id)?.h||nodeHeight(b);
      add('path',{d:edgeD(a.x+(a.w||TYPE_META.text.w)-minX+PAD,a.y+ha/2-minY+PAD,b.x-minX+PAD,b.y+hb/2-minY+PAD),fill:'none',stroke:'rgba(255,255,255,.22)','stroke-width':2});
    });
    visible.forEach(n=>{
      const kind=n.config?.kind||'leaf',color=n.config?.color||kindColor(kind),h=bounds.get(n.id)?.h||nodeHeight(n),w=n.w||TYPE_META.text.w,x=n.x-minX+PAD,y=n.y-minY+PAD;
      add('rect',{x,y,width:w,height:h,rx:12,ry:12,fill:'#1E1E1E',stroke:'rgba(255,255,255,.12)','stroke-width':1});
      add('circle',{cx:x+13,cy:y+h/2,r:3.5,fill:color});
      const childCount=edges.filter(edge=>edge.from===n.id&&!['top','bottom'].includes(edge.fromSide)&&!['top','bottom'].includes(edge.toSide)).length;
      if(n.config?.collapsed&&childCount){
        add('circle',{cx:x+w-11,cy:y+h/2,r:8,fill:'rgba(255,255,255,.88)'});
        const badge=add('text',{x:x+w-11,y:y+h/2+3,'font-size':'10px',fill:'#0d0d0f','text-anchor':'middle','font-weight':'700'});
        badge.textContent='+'+childCount;
      }
      const raw=n.name||markdownPlain(n.config?.title||n.input||''),cap=Math.max(4,Math.floor((w-32)/7.5));
      const t=add('text',{x:x+w/2+4,y:y+h/2+5,'font-size':'13px',fill:'#F4F4F5','text-anchor':'middle'});
      t.textContent=raw? (raw.length>cap?raw.slice(0,cap)+'…':raw) : '';
    });
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'}));
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      canvas.width=Math.round(W*scale);canvas.height=Math.round(H*scale);
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#0A0A0A';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      URL.revokeObjectURL(url);
      const a=document.createElement('a');
      a.download=(projectNameInput.value||'思维导图')+'.png';
      a.href=canvas.toDataURL('image/png');
      document.body.appendChild(a);a.click();a.remove();
      showToast('已导出思维导图 PNG');
    };
    img.onerror=()=>{URL.revokeObjectURL(url);showToast('导出失败，请重试','validation')};
    img.src=url;
  }
  function arrangeNodes(){
    rememberGraph();
    if(!nodes.length)return;
    refreshHiddenTopics();
    // Only left-right edges count as parent-child for layout; top/bottom edges are visual links only
    const layoutEdges=edges.filter(e=>!['top','bottom'].includes(e.fromSide)&&!['top','bottom'].includes(e.toSide));
    const childMap=new Map(nodes.map(n=>[n.id,[]]));
    layoutEdges.forEach(e=>{if(childMap.has(e.from)&&e.from!==e.to&&!childMap.get(e.from).includes(e.to))childMap.get(e.from).push(e.to)});
    const hasParent=new Set(layoutEdges.map(e=>e.to));
    let roots=nodes.filter(n=>!hasParent.has(n.id)&&!hiddenTopicIds.has(n.id));
    if(!roots.length)roots=nodes.filter(n=>!hiddenTopicIds.has(n.id)).slice(0,1);
    if(!roots.length)return;
    const placed=new Set();
    const H_GAP=100,V_GAP_ROOT=44,V_GAP_CHILD=36,NODE_W=TYPE_META.text.w;
    let slotY=80;
    // Assign a vertical slot and advance the cursor
    const nextSlot=()=>{const y=slotY;slotY+=48+V_GAP_CHILD;return y};
    // Recursively compute the vertical span of a subtree and place nodes
    const placeTree=(node,x)=>{
      if(placed.has(node.id))return 0;
      placed.add(node.id);
      node.x=x;
      const kids=(childMap.get(node.id)||[]).map(getNode).filter(k=>k&&!placed.has(k.id)&&!hiddenTopicIds.has(k.id));
      if(!kids.length){node.y=nextSlot();return nodeHeight(node)}
      // Place children first to determine their vertical range
      const childX=x+NODE_W+H_GAP;
      const childSpans=kids.map(k=>{const top=slotY;const span=placeTree(k,childX);return{node:k,top,span,bottom:slotY}});
      // Center parent among children
      const minChildTop=Math.min(...childSpans.map(c=>c.top));
      const maxChildBottom=Math.max(...childSpans.map(c=>c.bottom));
      node.y=minChildTop+(maxChildBottom-minChildTop-nodeHeight(node))/2;
      return Math.max(nodeHeight(node),maxChildBottom-minChildTop)
    };
    // Phase 1: place roots vertically, then their subtrees
    slotY=80;
    roots.forEach(root=>{
      root.x=80;
      placeTree(root,80);
      slotY+=V_GAP_ROOT-V_GAP_CHILD; // add extra gap between roots
    });
    // Phase 2: place any leftover nodes not in tree
    const leftovers=nodes.filter(n=>!placed.has(n.id)&&!hiddenTopicIds.has(n.id));
    leftovers.forEach(n=>{n.x=80;n.y=slotY;slotY+=nodeHeight(n)+V_GAP_ROOT});
    renderAllNodes();setTimeout(fitView,0);scheduleSave();
  }

  // Compact bottom canvas controls
  function syncCanvasToolbar(){
    const select=document.getElementById('btn-select-tool'),hand=document.getElementById('btn-hand-tool'),hide=document.getElementById('btn-hide-edges-new');
    select?.classList.toggle('active',currentTool==='move');hand?.classList.toggle('active',currentTool==='hand');hide?.classList.toggle('on',hideEdgesOn);if(zoomReadout)zoomReadout.textContent=zoomLevel+'%';syncUndoRedoButtons()
  }
  document.getElementById('btn-select-tool').addEventListener('click',()=>{setTool('move');syncCanvasToolbar()});
  document.getElementById('btn-hand-tool').addEventListener('click',()=>{setTool('hand');syncCanvasToolbar()});
  document.getElementById('btn-zoom-out').addEventListener('click',()=>setZoom(zoomLevel-10));
  document.getElementById('btn-zoom-in').addEventListener('click',()=>setZoom(zoomLevel+10));
  document.getElementById('btn-zoom-readout').addEventListener('click',()=>setZoom(100));
  document.getElementById('btn-fit-view').addEventListener('click',fitView);
  document.getElementById('btn-arrange-canvas')?.addEventListener('click',()=>{if(nodes.length)arrangeNodes()});
  document.getElementById('btn-undo-new').addEventListener('click',undoGraph);
  document.getElementById('btn-redo-new').addEventListener('click',redoGraph);

  // Floating material library and history
  const MATERIAL_FOLDERS_KEY='canvas-material-folders';
  const defaultMaterialFolders={project:['参考素材','场景','分镜','风格','角色','文档','音乐'],cross:['收藏','我的素材']};
  function getMaterialFolders(scope){let saved={};try{saved=JSON.parse(localStorage.getItem(MATERIAL_FOLDERS_KEY)||'{}')}catch(e){}return [...defaultMaterialFolders[scope],...(Array.isArray(saved[scope])?saved[scope]:[])].filter((name,index,array)=>array.indexOf(name)===index)}
  function saveMaterialFolder(scope,name){const clean=String(name||'').trim();if(!clean)return false;let saved={};try{saved=JSON.parse(localStorage.getItem(MATERIAL_FOLDERS_KEY)||'{}')}catch(e){}const current=Array.isArray(saved[scope])?saved[scope]:[];if(![...defaultMaterialFolders[scope],...current].includes(clean)){saved[scope]=[...current,clean];localStorage.setItem(MATERIAL_FOLDERS_KEY,JSON.stringify(saved))}return true}
  function openLibrary(mode){closeUtility();closeAll();libraryMode=mode;libraryFolder='';libraryQuery='';librarySearchInput.value='';body.classList.add('library-panel-open');renderLibraryPanel();requestAnimationFrame(()=>body.classList.add('library-panel-visible'))}
  function closeLibrary(){body.classList.remove('library-panel-visible');setTimeout(()=>{if(!body.classList.contains('library-panel-visible'))body.classList.remove('library-panel-open')},160);libraryMode='';document.querySelectorAll('.rail-tool').forEach(button=>button.classList.remove('active'))}
  function materialItemHTML(item,index){const icon=item.type==='video'?'icon-nt-video':item.type==='audio'?'icon-nt-audio':'icon-nt-image';return '<button class="library-material" data-library-material="'+index+'"><svg width="20" height="20" style="color:#a8a8aa"><use href="#'+icon+'"/></svg><strong>'+esc(item.name||'未命名素材')+'</strong><span>'+esc(item.type||'媒体')+'</span></button>'}
  function renderLibraryPanel(){
    const isHistory=libraryMode==='history',tabs=document.getElementById('library-tabs'),tools=document.getElementById('library-panel-tools');
    document.querySelectorAll('.rail-tool').forEach(button=>button.classList.toggle('active',button.id==='btn-library-'+libraryMode));
    document.getElementById('btn-library-grid').classList.toggle('active',libraryView==='grid');document.getElementById('btn-library-list').classList.toggle('active',libraryView==='list');libraryPanel.classList.toggle('list-view',libraryView==='list');
    if(isHistory){
      libraryPanelTitle.textContent='历史记录';tabs.style.display='none';tools.style.display='none';const list=getHistory().filter(item=>historyTypeFilter==='all'||item.type===historyTypeFilter);const filters=[['all','全部'],['image','图片'],['video','视频'],['audio','音频']];libraryPanelBody.innerHTML='<div class="history-filter-row">'+filters.map(([id,label])=>'<button class="history-filter '+(historyTypeFilter===id?'active':'')+'" data-history-filter="'+id+'">'+label+'</button>').join('')+'</div>'+(list.length?'<div class="library-items">'+list.map((item,index)=>materialItemHTML({...item,name:(item.type||'媒体')+' · '+(item.model||'本地')},index)).join('')+'</div>':'<div class="library-empty history-empty"><svg><use href="#icon-folder-filled"/></svg><span>暂无记录</span></div>');
      libraryPanelBody.querySelectorAll('[data-history-filter]').forEach(button=>button.addEventListener('click',()=>{historyTypeFilter=button.dataset.historyFilter;renderLibraryPanel()}));
      libraryPanelBody.querySelectorAll('[data-library-material]').forEach(button=>button.addEventListener('click',()=>{const item=list[+button.dataset.libraryMaterial],type=['image','video','audio'].includes(item.type)?item.type:'image';addNode(type,{output:{type,url:item.url,name:item.name||'历史结果'},status:'success',message:'已从历史记录载入',progress:100});closeLibrary()}));return
    }
    libraryPanelTitle.textContent='素材库';tabs.style.display='flex';tools.style.display='flex';document.querySelectorAll('[data-library-scope]').forEach(button=>button.classList.toggle('active',button.dataset.libraryScope===libraryScope));
    const all=getMaterials().map(item=>({...item,folder:item.folder||'参考素材',scope:item.scope||'project'}));
    if(!libraryFolder){const folders=getMaterialFolders(libraryScope).filter(name=>!libraryQuery||name.includes(libraryQuery));libraryPanelBody.innerHTML='<div class="library-section-label"><span>全部</span><span class="library-sort"><svg><use href="#icon-sort"/></svg></span></div><div class="library-folders">'+folders.map(name=>'<button class="library-folder" data-library-folder="'+esc(name)+'"><svg><use href="#icon-folder-filled"/></svg><span>'+esc(name)+'</span></button>').join('')+'</div>';
      libraryPanelBody.querySelectorAll('[data-library-folder]').forEach(button=>button.addEventListener('click',()=>{libraryFolder=button.dataset.libraryFolder;libraryQuery='';librarySearchInput.value='';renderLibraryPanel()}));return
    }
    const list=all.filter(item=>item.scope===libraryScope&&item.folder===libraryFolder&&(!libraryQuery||String(item.name||'').toLowerCase().includes(libraryQuery.toLowerCase())));libraryPanelBody.innerHTML='<div class="library-breadcrumb"><button id="library-back">全部</button><span>/</span><span>'+esc(libraryFolder)+'</span></div>'+(list.length?'<div class="library-items">'+list.map(materialItemHTML).join('')+'</div>':'<div class="library-empty"><svg><use href="#icon-folder-filled"/></svg><span>暂无内容</span><small>点击右上角加号上传素材，或创建文件夹</small></div>');
    document.getElementById('library-back').addEventListener('click',()=>{libraryFolder='';renderLibraryPanel()});libraryPanelBody.querySelectorAll('[data-library-material]').forEach(button=>button.addEventListener('click',()=>{const item=list[+button.dataset.libraryMaterial],type=['image','video','audio'].includes(item.type)?item.type:'image';addNode(type,{name:'素材 · '+(item.name||'未命名素材'),output:{type,url:item.url,name:item.name},status:'success',message:'已从素材库载入',progress:100});closeLibrary()}))
  }
  document.getElementById('btn-library-materials').addEventListener('click',()=>libraryMode==='materials'?closeLibrary():openLibrary('materials'));
  document.getElementById('btn-library-history').addEventListener('click',()=>libraryMode==='history'?closeLibrary():openLibrary('history'));
  document.getElementById('btn-library-close').addEventListener('click',closeLibrary);
  document.querySelectorAll('[data-library-scope]').forEach(button=>button.addEventListener('click',()=>{libraryScope=button.dataset.libraryScope;libraryFolder='';libraryQuery='';librarySearchInput.value='';renderLibraryPanel()}));
  document.getElementById('btn-library-grid').addEventListener('click',()=>{libraryView='grid';renderLibraryPanel()});document.getElementById('btn-library-list').addEventListener('click',()=>{libraryView='list';renderLibraryPanel()});
  librarySearchInput.addEventListener('input',()=>{libraryQuery=librarySearchInput.value.trim();renderLibraryPanel()});
  document.getElementById('btn-library-filter').addEventListener('click',()=>showToast('可按文件夹和媒体类型浏览素材'));
  document.getElementById('btn-library-add').addEventListener('click',()=>{const name=window.prompt('输入新文件夹名称；留空将选择文件上传');if(name!==null&&name.trim()){if(saveMaterialFolder(libraryScope,name)){libraryFolder='';renderLibraryPanel();showToast('文件夹已创建')}return}pendingUploadNodeId=null;pendingLibraryUpload=true;pendingLibraryFolder=libraryFolder||'参考素材';assetFileInput.click()});

  // Panel
  function openPanel(){panelOpen=true;body.classList.add('panel-open');const b=document.getElementById('btn-asset-panel');b.style.opacity='0';b.style.pointerEvents='none';b.style.width='0';b.style.padding='0';setTimeout(()=>{applyViewTransform();queueEdges()},270)}
  function closePanel(){panelOpen=false;body.classList.remove('panel-open');const b=document.getElementById('btn-asset-panel');b.style.opacity='';b.style.pointerEvents='';b.style.width='';b.style.padding='';setTimeout(()=>{applyViewTransform();queueEdges()},270)}
  document.getElementById('btn-asset-panel').addEventListener('click',()=>{if(panelOpen){closePanel();return}panelMode='assets';document.querySelectorAll('#panel-tabs .tab-btn').forEach(button=>button.classList.toggle('active',button.dataset.ptab==='assets'));updatePanel();openPanel()});
  document.getElementById('btn-collapse-panel').addEventListener('click',closePanel);
  document.querySelectorAll('#topbar-center .tab-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#topbar-center .tab-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');const story=b.dataset.view==='storyboard';document.getElementById('storyboard-view').classList.toggle('open',story);viewport.style.visibility=story?'hidden':'visible';if(story)renderStoryboard()}));
  document.querySelectorAll('#panel-tabs .tab-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#panel-tabs .tab-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');panelMode=b.dataset.ptab==='assets'?'assets':'canvas';panelQuery='';document.getElementById('panel-search-input').value='';updatePanel()}));

  // Double-click canvas to show add-node menu at cursor
  viewport.addEventListener('dblclick',ev=>{
    if(!ev.target.closest('#canvas-viewport')||ev.target.closest('.node-group,.node-port,.edge-hit,.edge-path,.edge-flow'))return;
    pendingAddPoint=screenToWorld(ev.clientX,ev.clientY);
    pendingConnectSource=null;
    document.getElementById('material-sub').style.display='none';document.getElementById('script-sub').style.display='none';
    closeUtility();closeAll();buildNodeMenu();toggleP('node');if(popupState.node)placeAtPoint(document.getElementById('node-menu'),ev.clientX,ev.clientY)
  });

  let copiedNodeData=null,contextAddPoint=null;
  function copySelectedNode(){const node=getNode(selectedNodeId);if(!node){showToast('请先选中一个节点');return}copiedNodeData={type:node.type,name:node.name,input:node.input,config:JSON.parse(JSON.stringify(node.config||{})),w:node.w};showToast('节点已复制')}
  function pasteNodeAt(point){if(!copiedNodeData){showToast('剪贴板中没有节点');return}const meta=TYPE_META[copiedNodeData.type];if(!meta)return;const name=(copiedNodeData.name||nodeNames[copiedNodeData.type])+' 副本';addNode(copiedNodeData.type,{x:point.x-(meta.w||copiedNodeData.w||0)/2,y:point.y,name,input:copiedNodeData.input,config:JSON.parse(JSON.stringify(copiedNodeData.config||{})),output:null,status:'idle',message:'',progress:0})}
  function removeSelectedNode(){if(!selectedNodeId)return;rememberGraph();edges=edges.filter(edge=>edge.from!==selectedNodeId&&edge.to!==selectedNodeId);nodes=nodes.filter(node=>node.id!==selectedNodeId);selectedNodeId=null;expandedNodeId=null;refreshHiddenTopics();renderAllNodes();updatePanel();scheduleSave();if(visibleTopicCount()===0)body.classList.remove('has-nodes')}
  function openCanvasContextMenu(event){const menu=document.getElementById('canvas-context-menu'),point=screenToWorld(event.clientX,event.clientY),onNode=event.target.closest('.node-group');contextAddPoint=point;const node=onNode?getNode(+onNode.dataset.nid):null;const childCount=node?edges.filter(e=>e.from===node.id&&!['top','bottom'].includes(e.fromSide)&&!['top','bottom'].includes(e.toSide)).length:0;let html='';if(node){const kind=node.config?.kind||'leaf',color=node.config?.color||kindColor(kind);if(node.id!==selectedNodeId)selectNode(node.id);html+='<button type="button" class="menu-item" data-context-action="add-child">添加子主题<span class="topic-child-hint">Enter</span></button><button type="button" class="menu-item" data-context-action="add-sibling">添加兄弟主题</button><button type="button" class="menu-item" data-context-action="rename">编辑主题</button>';if(childCount)html+='<button type="button" class="menu-item" data-context-action="toggle-collapse">'+(node.config?.collapsed?'展开子分支':'折叠子分支')+'</button>';html+='<div class="context-color-row"><span style="font-size:12px;color:var(--text-3)">主题颜色</span><span class="editor-spacer"></span>'+['#22C3D6','#7FD8A8','#8A8A8E','#E0A458','#C77DD8','#E26D6D'].map(c=>'<button type="button" class="context-color-swatch'+(color===c?' active':'')+'" data-context-color="'+c+'" style="background:'+c+'" title="'+c+'"></button>').join('')+'</div><div class="menu-divider"></div><button type="button" class="menu-item danger" data-context-action="delete">删除主题 <kbd>Del</kbd></button>'}else{html+='<button type="button" class="menu-item" data-context-add="root">添加中心主题</button><button type="button" class="menu-item" data-context-add="branch">添加分支主题</button><button type="button" class="menu-item" data-context-add="leaf">添加子主题</button>'}html+='<div class="menu-divider"></div><button type="button" class="menu-item" data-context-action="layout">自动布局 <kbd>Ctrl Enter</kbd></button>';menu.innerHTML=html;menu.style.display='block';placeAtPoint(menu,event.clientX,event.clientY);menu.querySelectorAll('[data-context-action]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.contextAction;if(action==='add-child'&&node)createChildTopic(node);if(action==='add-sibling'&&node)createSiblingTopic(node);if(action==='rename'&&node)openTextEditorModal(node,true);if(action==='toggle-collapse'&&node)toggleTopicCollapsed(node);if(action==='delete')removeSelectedNode();if(action==='layout')arrangeNodes();menu.style.display='none'}));menu.querySelectorAll('[data-context-color]').forEach(swatch=>swatch.addEventListener('click',ev=>{ev.stopPropagation();if(node){node.config={...node.config,color:swatch.dataset.contextColor};renderAllNodes();scheduleSave()}menu.style.display='none'}));menu.querySelectorAll('[data-context-add]').forEach(button=>button.addEventListener('click',()=>{pendingAddPoint=contextAddPoint;pendingConnectSource=null;selectAddNodeMenuItem(button.dataset.contextAdd);menu.style.display='none'}))}
  viewport.addEventListener('contextmenu',event=>{event.preventDefault();closeAll();closeUtility();openCanvasContextMenu(event)});

  // NODE SYSTEM
  function addNode(type,opts={}){
    if(!TYPE_META[type])return;
    rememberGraph();
    nodeIdCounter++;typeCounters[type]=(typeCounters[type]||0)+1;
    const meta=TYPE_META[type]||{w:460,ports:true};
    const rect=viewport.getBoundingClientRect(),center=screenToWorld(rect.left+rect.width/2,rect.top+rect.height/2);
    const anchor=getNode(selectedNodeId)||nodes[nodes.length-1];
    const addPoint=pendingAddPoint;pendingAddPoint=null;
    const x=opts.x??(addPoint?addPoint.x-meta.w/2:anchor?anchor.x+anchor.w+80:center.x-meta.w/2),y=opts.y??(addPoint?addPoint.y:anchor?anchor.y:center.y-120);
    const created={id:nodeIdCounter,type,name:nodeNames[type]+' '+typeCounters[type],x,y,w:meta.w,ports:meta.ports,input:'',output:null,status:'idle',message:'',progress:0,taskId:'',config:{},...opts};
    if(type==='text'&&!created.config.kind)created.config={...created.config,kind:'leaf'};
    if(type==='text'&&!created.config.color)created.config={...created.config,color:kindColor(created.config.kind)};
    if(type==='text'&&!created.config.size)created.config={...created.config,size:'md'};
    nodes.push(created);
    expandedNodeId=null;
    selectNode(nodeIdCounter);
    renderAllNodes();
    updatePanel();
    body.classList.add('has-nodes');
    scheduleSave();
    return getNode(nodeIdCounter)
  }

  function selectNode(id){
    selectedNodeId=id;selectedEdge=null;nodes.forEach(n=>n._z=(n.id===id)?100:1);
    nodesLayer.querySelectorAll('.node-group').forEach(el=>{const selected=+el.dataset.nid===id;el.classList.toggle('selected',selected);el.style.zIndex=selected?'100':'1'});
    renderEdges()
  }
  function visibleNodeBounds(group){
    const rects=[group,...group.querySelectorAll('.node-title,.node-card-a,.node-card-b,.text-model-popover.open,.image-popover.open')].filter(el=>getComputedStyle(el).display!=='none').map(el=>el.getBoundingClientRect()).filter(rect=>rect.width||rect.height);
    return{left:Math.min(...rects.map(rect=>rect.left)),top:Math.min(...rects.map(rect=>rect.top)),right:Math.max(...rects.map(rect=>rect.right)),bottom:Math.max(...rects.map(rect=>rect.bottom)),width:Math.max(...rects.map(rect=>rect.right))-Math.min(...rects.map(rect=>rect.left)),height:Math.max(...rects.map(rect=>rect.bottom))-Math.min(...rects.map(rect=>rect.top))}
  }
  // Expanding a node must not move the user's canvas view.
  function revealExpandedNode(){ }
  function settleExpandedNode(){ }

  // ---- EDGE SYSTEM ----
  function getPortPoint(nodeId,side){
    const port=nodesLayer.querySelector('.node-port[data-pnid="'+nodeId+'"][data-pside="'+side+'"]');
    if(port){const rect=port.getBoundingClientRect();return screenToWorld(rect.left+rect.width/2,rect.top+rect.height/2)}
    const node=getNode(nodeId);if(!node)return{x:0,y:0};
    const h=nodeHeight(node);
    return{x:node.x+(side==='right'?node.w:side==='left'?0:node.w/2),y:node.y+(side==='bottom'?h:side==='top'?0:h/2)}
  }
  function getEdgeAnchorPoint(nodeId,side){
    const node=getNode(nodeId);
    if(!node)return{x:0,y:0};
    const group=nodesLayer.querySelector('.node-group[data-nid="'+nodeId+'"]');
    if(group){
      const rect=group.getBoundingClientRect(),point=screenToWorld(rect.left+(side==='right'?rect.width:side==='left'?0:rect.width/2),rect.top+(side==='bottom'?rect.height:side==='top'?0:rect.height/2));
      return{x:point.x,y:point.y}
    }
    const h=nodeHeight(node);
    return{x:node.x+(side==='right'?node.w:side==='left'?0:node.w/2),y:node.y+(side==='bottom'?h:side==='top'?0:h/2)}
  }
  function curvePath(start,end,startSide='right',endSide='left'){
    const vertical=startSide==='top'||startSide==='bottom'||endSide==='top'||endSide==='bottom';
    if(vertical){
      const dy=Math.max(Math.abs(end.y-start.y)*.42,50),fromDir=startSide==='bottom'?1:startSide==='top'?-1:1,toDir=endSide==='top'?-1:endSide==='bottom'?1:-1;
      return'M'+start.x.toFixed(1)+','+start.y.toFixed(1)+' C'+start.x.toFixed(1)+','+(start.y+dy*fromDir).toFixed(1)+' '+end.x.toFixed(1)+','+(end.y+dy*toDir).toFixed(1)+' '+end.x.toFixed(1)+','+end.y.toFixed(1)
    }
    const dx=Math.max(Math.abs(end.x-start.x)*.42,50),fromDir=startSide==='right'?1:-1,toDir=endSide==='left'?-1:1;
    return'M'+start.x.toFixed(1)+','+start.y.toFixed(1)+' C'+(start.x+dx*fromDir).toFixed(1)+','+start.y.toFixed(1)+' '+(end.x+dx*toDir).toFixed(1)+','+end.y.toFixed(1)+' '+end.x.toFixed(1)+','+end.y.toFixed(1)
  }
  function renderEdges(targetNodeIds=null){
    refreshHiddenTopics();
    const live=new Set(edges.map(e=>String(e.id)));
    edgeGroups.forEach((group,id)=>{if(!live.has(id)||!group.isConnected){group.remove();edgeGroups.delete(id)}});
    const edgesToRender=targetNodeIds?edges.filter(edge=>targetNodeIds.has(edge.from)||targetNodeIds.has(edge.to)):edges;
    edgesToRender.forEach(e=>{
      if(!getNode(e.from)||!getNode(e.to)||hiddenTopicIds.has(e.from)||hiddenTopicIds.has(e.to))return;
      const id=String(e.id);let group=edgeGroups.get(id);
      if(!group){group=document.createElementNS('http://www.w3.org/2000/svg','g');group.dataset.edge=id;const hit=document.createElementNS('http://www.w3.org/2000/svg','path'),path=document.createElementNS('http://www.w3.org/2000/svg','path'),flow=document.createElementNS('http://www.w3.org/2000/svg','path');hit.setAttribute('class','edge-hit');path.setAttribute('class','edge-path');flow.setAttribute('class','edge-flow');group._edgeHit=hit;group._edgePath=path;group._edgeFlow=flow;group.append(hit,path,flow);edgeLayer.insertBefore(group,document.getElementById('edge-temp-group'));edgeGroups.set(id,group)}
      const linked=selectedNodeId===e.from||selectedNodeId===e.to,edgeSelected=id===String(selectedEdge),d=curvePath(getEdgeAnchorPoint(e.from,e.fromSide||'right'),getEdgeAnchorPoint(e.to,e.toSide||'left'),e.fromSide||'right',e.toSide||'left');
      group._edgeHit.setAttribute('d',d);group._edgePath.setAttribute('d',d);group._edgeFlow.setAttribute('d',d);group._edgePath.classList.toggle('selected',edgeSelected);group._edgePath.classList.toggle('linked',linked);group.classList.toggle('edge-linked',linked);group.classList.toggle('edge-selected',edgeSelected);group.style.display=hideEdgesOn?'none':''
    });
    if(!targetNodeIds){
      const linkedNodeIds=new Set(selectedNodeId==null?[]:edges.filter(edge=>edge.from===selectedNodeId||edge.to===selectedNodeId).flatMap(edge=>[edge.from,edge.to]));
      nodesLayer.querySelectorAll('.node-port').forEach(port=>port.classList.toggle('edge-linked',linkedNodeIds.has(+port.dataset.pnid)))
    }
    queueMinimap()
  }
  edgeLayer.addEventListener('click',ev=>{const group=ev.target.closest('g[data-edge]');if(!group)return;ev.stopPropagation();selectedNodeId=null;expandedNodeId=null;selectedEdge=group.dataset.edge;nodesLayer.querySelectorAll('.node-group').forEach(el=>el.classList.remove('selected','expanded'));renderEdges()});

  // ---- NODE RENDERING ----
  function renderNodePreview(n,fallback){
    const text=n.output?.text||(['text','script'].includes(n.type)?n.input:'');
    if(text)return '<div class="node-text-preview">'+esc(text)+'</div><span class="node-result-chip">文本输出</span>';
    if(n.output?.url){
      const url=esc(n.output.url);
      if(n.output.type==='image')return '<div class="node-media-preview"><img src="'+url+'" alt="图片输出"></div><span class="node-result-chip">图片输出</span>';
      if(n.output.type==='video')return '<div class="node-media-preview"><video src="'+url+'" controls preload="metadata"></video></div><span class="node-result-chip">视频输出</span>';
      if(n.output.type==='audio')return '<div class="node-media-preview"><audio src="'+url+'" controls preload="metadata"></audio></div><span class="node-result-chip">音频输出</span>'
    }
    return fallback
  }

  function nodeHTML(n){
    let ca='',cb='';const ic=icons[n.type]||'icon-nt-text';
    const stateNames={running:'生成中',success:'已完成',error:'失败'};
    const state=stateNames[n.status]?'<span class="node-state '+n.status+'">'+stateNames[n.status]+'</span>':'';
    if(n.type==='text'){
      const kind=n.config?.kind||'leaf',color=n.config?.color||kindColor(kind);
            const display=n.name||markdownPlain(n.config?.title||n.input||'');
      ca='<div class="topic-card"><div class="topic-body"><div class="topic-text'+(display?'':' empty')+'" title="'+esc(display)+'"><span class="topic-label">'+esc(display)+'</span></div></div></div>'
    }else if(n.type==='script'){
      const fallback='<div class="nc-placeholder"><div class="text-lines"><div style="width:80%"></div><div style="width:80%"></div><div style="width:80%"></div><div style="width:40%"></div></div></div>';
      ca=renderNodePreview(n,fallback)
    }else if(n.type==='image'){
      const fallback='<div class="image-node-empty"><svg><use href="#icon-nt-image"/></svg></div>';
      ca=n.output?.url?'<div class="media-node-result"><img src="'+esc(n.output.url)+'" alt="图片输出"></div>'+mediaSaveButtonHTML(n):fallback
    }else if(n.type==='video'){
      const fallback='<div class="media-node-empty"><div class="media-node-glyph"><svg><use href="#icon-nt-video"/></svg></div></div>';
      ca=n.output?.url?'<div class="media-node-result"><video src="'+esc(n.output.url)+'" preload="metadata"></video>'+mediaVideoControlsHTML()+'</div>'+mediaSaveButtonHTML(n):fallback
    }else if(n.type==='compose'){
      const incomingVideos=getIncoming(n.id).filter(node=>node.output?.type==='video'&&node.output.url);
      ca=n.output?.url?'<div class="media-node-result"><video src="'+esc(n.output.url)+'" preload="metadata"></video>'+mediaVideoControlsHTML()+'</div>':'<div class="compose-empty"><svg><use href="#icon-nt-compose"/></svg><strong>'+(incomingVideos.length?'已连接 '+incomingVideos.length+' 个视频片段':'空空如也')+'</strong><span>'+(incomingVideos.length?'点击节点设置片段顺序、转场和输出参数':'请连接视频节点后操作')+'</span></div>'
    }else if(n.type==='director'){
      const objectCount=n.config?.directorState?.objects?.length||2;
      ca='<div class="director-node-empty"><svg><use href="#icon-nt-director"/></svg><strong>在 3D 空间中搭建场景</strong><span>规划多机位、角色位置与镜头构图 · '+objectCount+' 个场景元素</span><button class="btn-director director-node-open"><svg><use href="#icon-expand-corners"/></svg>打开导演台</button></div>'
    }else if(n.type==='audio'){
      const fallback='<div class="media-node-empty"><div class="media-node-glyph"><svg><use href="#icon-music-note"/></svg></div></div>';
      ca=n.output?.url?'<div class="media-node-result"><div class="audio-wave"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><audio src="'+esc(n.output.url)+'" controls preload="metadata"></audio></div>'+mediaSaveButtonHTML(n):fallback
    }else{
      ca='<div class="nc-placeholder"><svg class="lg"><use href="#'+ic+'"/></svg><div style="margin-top:12px;color:var(--text-3);font-size:13px">'+esc(n.name)+'</div></div>'
    }
    const hasCB=['image','video','audio','compose','director','script'].includes(n.type);
    if(hasCB){
      const inputHtml=esc(n.input||'').replace(/\n/g,'<br>');
      const incoming=collectInputs(n.id),summary=['文本 '+incoming.texts.length,'图片 '+incoming.images.length,'视频 '+incoming.videos.length,'音频 '+incoming.audios.length].join(' · ');
      const option=(value,label,current)=>'<option value="'+value+'"'+(String(value)===String(current)?' selected':'')+'>'+label+'</option>';
      const collapse='<button class="ncb-expand" aria-label="收起配置"><svg width="14" height="14"><use href="#icon-expand"/></svg></button>';
      const status='<div class="editor-status '+(n.status==='error'?'error':n.status==='success'?'success':'')+'">'+esc(n.message||'')+'</div>';
      if(n.type==='video'){
        const cfg={model:'sf-wan2.1-t2v',mode:'auto',duration:6,ratio:'16:9',resolution:'720p',sound:false,motion:'balanced',negativePrompt:'',seed:'',webSearch:false,autoValidate:true,...n.config},canRun=!!(n.input||incoming.texts.length||incoming.images.length);
        cb='<div class="media-editor"><button class="image-panel-reference video-panel-reference" type="button" data-node-action="upload" aria-label="添加参考图片" title="添加参考图片"><svg><use href="#icon-nt-image"/></svg></button><div class="media-editor-tools"><button class="media-tool" data-node-action="upload"><svg><use href="#icon-nt-upload"/></svg>参考</button><button class="media-tool" data-media-tool="mark"><svg><use href="#icon-pencil"/></svg>标记</button><button class="media-tool" data-media-tool="effect"><svg><use href="#icon-bolt"/></svg>特效</button><button class="media-tool" data-media-tool="character"><svg><use href="#icon-people"/></svg>角色库</button><button class="media-tool" data-media-tool="camera"><svg><use href="#icon-nt-director"/></svg>运镜</button></div><div class="ncb-input media-editor-input" contenteditable="true" data-role="input" data-placeholder="描述你想要生成的画面内容，@引用素材">'+inputHtml+'</div><div class="media-editor-footer"><select class="media-select" data-field="model" aria-label="视频模型">'+modelOptions(cfg.model)+'</select><select class="media-select" data-field="mode" aria-label="生成模式">'+option('auto','自动识别',cfg.mode)+option('text2video','文生视频',cfg.mode)+option('img2video','图生视频',cfg.mode)+option('first_last','首尾帧生成',cfg.mode)+option('ref_all','全能参考',cfg.mode)+'</select><span class="media-summary">'+esc(cfg.ratio)+' · '+esc(String(cfg.resolution).toUpperCase())+' · '+esc(cfg.duration)+'s · 1个'+(cfg.sound?' · 声音':'')+'</span><span class="editor-spacer"></span><span class="media-cost"><svg><use href="#icon-bolt"/></svg>135</span><button class="ncb-send media-editor-send'+(canRun?' active':'')+'" aria-label="生成视频"'+(n.status==='running'?' disabled':'')+'><svg><use href="#icon-arrow-up"/></svg></button></div></div><div class="media-advanced"><div class="media-field"><label>画面比例</label><select data-field="ratio">'+option('16:9','16:9',cfg.ratio)+option('9:16','9:16',cfg.ratio)+option('1:1','1:1',cfg.ratio)+option('4:3','4:3',cfg.ratio)+option('3:4','3:4',cfg.ratio)+option('21:9','21:9',cfg.ratio)+'</select></div><div class="media-field"><label>清晰度</label><select data-field="resolution">'+option('480p','480P',cfg.resolution)+option('720p','720P',cfg.resolution)+option('1080p','1080P',cfg.resolution)+option('4k','4K',cfg.resolution)+'</select></div><div class="media-field"><label>时长</label><select data-field="duration">'+option(5,'5 秒',cfg.duration)+option(8,'8 秒',cfg.duration)+option(10,'10 秒',cfg.duration)+option(15,'15 秒',cfg.duration)+'</select></div><div class="media-field"><label>运动强度</label><select data-field="motion">'+option('subtle','轻微',cfg.motion)+option('balanced','自然',cfg.motion)+option('dynamic','强烈',cfg.motion)+'</select></div><label class="media-toggle"><input type="checkbox" data-field="sound"'+(cfg.sound?' checked':'')+'>生成声音</label><label class="media-toggle"><input type="checkbox" data-field="webSearch"'+(cfg.webSearch?' checked':'')+'>联网搜索</label><label class="media-toggle"><input type="checkbox" data-field="autoValidate"'+(cfg.autoValidate?' checked':'')+'>自动校验素材</label><div class="media-field"><label>随机种子</label><input type="number" data-field="seed" value="'+esc(cfg.seed)+'" min="0" placeholder="随机"></div><div class="media-field" style="grid-column:1/-1"><label>反向提示词</label><input data-field="negativePrompt" value="'+esc(cfg.negativePrompt)+'" placeholder="不希望出现的内容"></div></div>'+status
      }else if(n.type==='image'){
        let cfg={imageModel:'sf-flux-schnell',imageMode:'auto',quality:'standard',ratio:'16:9',resolution:'2k',count:1,style:'cinematic',negativePrompt:'',seed:'',...n.config};if(!IMAGE_MODEL_CATALOG[cfg.imageModel]){cfg.imageModel='sf-flux-schnell';n.config={...n.config,imageModel:cfg.imageModel}}const canRun=!!(n.input||incoming.texts.length||incoming.images.length);
        cb='<div class="media-editor image-editor"><button class="image-panel-reference" type="button" data-node-action="upload" aria-label="添加参考图片" title="添加参考图片"><svg><use href="#icon-nt-image"/></svg></button><button class="image-panel-expand" type="button" data-image-action="expand" aria-label="放大编辑器" title="放大编辑器"><svg><use href="#icon-editor-expand"/></svg></button><div class="ncb-input media-editor-input" contenteditable="true" data-role="input" data-placeholder="描述你想生成的画面...">'+inputHtml+'</div><div class="media-editor-footer image-editor-footer">'+imageModelControlHTML(cfg.imageModel)+'<div class="image-control"><button class="image-control-trigger" type="button" data-image-popover-toggle="params" aria-expanded="false" aria-label="图片参数设置"><svg class="image-ratio-glyph" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.25" y="5.1" width="15.5" height="9.8" rx="1.8" stroke="currentColor" stroke-width="1.4"/></svg><span data-image-param-summary>'+esc(cfg.ratio)+' / '+esc(String(cfg.resolution).toUpperCase())+'</span><svg class="control-chevron"><use href="#icon-chevron-down"/></svg></button>'+imageParameterPopoverHTML(cfg)+'</div><span class="editor-spacer"></span><button class="ncb-send media-editor-send'+(canRun?' active':'')+'" aria-label="生成图片" title="生成图片"'+(n.status==='running'?' disabled':'')+'><svg><use href="#icon-arrow-up"/></svg></button></div></div>'+status
      }else if(n.type==='text'){
        const rawCfg={textTask:'free',temperature:.7,...n.config},modelControl=textModelControlHTML(n.config?.textModel||''),cfg={...rawCfg,textModel:modelControl.selected},canRun=!!(n.input||incoming.texts.length||incoming.images.length);
        if(n.config?.textModel!==cfg.textModel)n.config={...n.config,textModel:cfg.textModel};
        cb='<div class="text-editor-shell"><div class="text-editor-input-wrap"><button class="text-editor-attach" type="button" data-node-action="replace-text" aria-label="选择文本内容" title="选择文本内容"><svg><use href="#icon-nt-image"/></svg></button><button class="ncb-expand text-editor-expand" type="button" data-text-node-action="edit" aria-label="放大编辑器" title="放大编辑器"><svg><use href="#icon-editor-expand"/></svg></button><div class="ncb-input text-editor-input" contenteditable="true" data-role="input" data-placeholder="描述你想生成的文本内容...">'+inputHtml+'</div></div><div class="text-editor-bottom">'+modelControl.html+'<span class="text-editor-spacer"></span><button class="ncb-send text-editor-send'+(canRun?' active':'')+'" aria-label="运行文本节点" title="运行文本节点"'+(n.status==='running'?' disabled':'')+'><svg><use href="#icon-arrow-up"/></svg></button></div></div>'
      }else if(n.type==='audio'){
        const cfg={audioModel:'dashscope-qwen-tts',...n.config};
        if(!AUDIO_MODEL_CATALOG[cfg.audioModel]){cfg.audioModel='dashscope-qwen-tts';n.config={...n.config,audioModel:cfg.audioModel}}
        const canRun=!!(n.input||incoming.texts.length);
        cb='<div class="media-editor audio-editor"><div class="ncb-input media-editor-input" contenteditable="true" data-role="input" data-placeholder="输入要合成的文本">'+inputHtml+'</div><div class="media-editor-footer">'+audioModelControlHTML(cfg.audioModel)+'<span class="editor-spacer"></span><button class="ncb-send media-editor-send'+(canRun?' active':'')+'" aria-label="生成音频" title="生成音频"'+(n.status==='running'?' disabled':'')+'><svg><use href="#icon-arrow-up"/></svg></button></div></div>'+status
      }else if(n.type==='compose'){
        const linked=getIncoming(n.id).filter(node=>node.output?.type==='video'&&node.output.url),stored=Array.isArray(n.config?.composeOrder)?n.config.composeOrder.map(Number):[],order=[...stored.filter(id=>linked.some(node=>node.id===id)),...linked.map(node=>node.id).filter(id=>!stored.includes(id))],ordered=order.map(getNode).filter(Boolean),cfg={transition:'cut',transitionDuration:.4,ratio:'source',resolution:'source',keepAudio:true,...n.config,composeOrder:order};
        if(JSON.stringify(n.config?.composeOrder||[])!==JSON.stringify(order))n.config={...n.config,composeOrder:order};
        const clips=ordered.length?ordered.map((node,index)=>'<div class="compose-clip" data-compose-id="'+node.id+'"><div class="compose-clip-preview"><video src="'+esc(node.output.url)+'" muted preload="metadata"></video></div><div class="compose-clip-meta"><span>'+(index+1)+'. '+esc(node.name)+'</span><button class="compose-order" data-compose-move="left" aria-label="前移"'+(index===0?' disabled':'')+'><svg style="transform:rotate(180deg)"><use href="#icon-expand"/></svg></button><button class="compose-order" data-compose-move="right" aria-label="后移"'+(index===ordered.length-1?' disabled':'')+'><svg><use href="#icon-expand"/></svg></button></div></div>').join(''):'<div class="compose-no-clips">连接并生成至少一个视频节点后，片段会显示在这里</div>';
        cb='<div class="compose-editor"><div class="compose-clip-list">'+clips+'</div><div class="media-advanced" style="padding:10px 0 0;border-top:1px solid #333"><div class="media-field"><label>转场</label><select data-field="transition">'+option('cut','直接切换',cfg.transition)+option('fade','淡入淡出',cfg.transition)+option('dissolve','叠化',cfg.transition)+option('slide','推镜转场',cfg.transition)+'</select></div><div class="media-field"><label>转场时长</label><select data-field="transitionDuration">'+option(.2,'0.2 秒',cfg.transitionDuration)+option(.4,'0.4 秒',cfg.transitionDuration)+option(.8,'0.8 秒',cfg.transitionDuration)+option(1.2,'1.2 秒',cfg.transitionDuration)+'</select></div><div class="media-field"><label>输出比例</label><select data-field="ratio">'+option('source','跟随素材',cfg.ratio)+option('16:9','16:9',cfg.ratio)+option('9:16','9:16',cfg.ratio)+option('1:1','1:1',cfg.ratio)+'</select></div><div class="media-field"><label>输出清晰度</label><select data-field="resolution">'+option('source','跟随素材',cfg.resolution)+option('720p','720P',cfg.resolution)+option('1080p','1080P',cfg.resolution)+option('4k','4K',cfg.resolution)+'</select></div><label class="media-toggle"><input type="checkbox" data-field="keepAudio"'+(cfg.keepAudio?' checked':'')+'>保留原始声音</label><span class="editor-spacer"></span><span class="media-cost">'+(n.status==='running'?'合成中':n.output?'已输出':'本地/接口合成')+'</span><button class="ncb-send media-editor-send'+(ordered.length?' active':'')+'" data-run-node="'+n.id+'" aria-label="合成视频"'+(!ordered.length||n.status==='running'?' disabled':'')+'><svg><use href="#icon-arrow-up"/></svg></button></div></div>'+status
      }else if(n.type==='director'){
        const cfg={scene:'',style:'电影感写实',shots:6,ratio:'16:9',...n.config};
        cb='<div class="director-quick"><div class="director-quick-row"><textarea data-field="scene" placeholder="描述场景、剧情目标和角色关系">'+esc(cfg.scene)+'</textarea><div class="director-quick-actions"><button class="btn-director"><svg width="14" height="14"><use href="#icon-expand-corners"/></svg> 打开导演台</button><button class="primary" data-director-quick-script>生成分镜脚本</button></div></div><div class="media-advanced" style="padding:10px 0 0;border-top:0"><div class="media-field"><label>视觉风格</label><input data-field="style" value="'+esc(cfg.style)+'"></div><div class="media-field"><label>镜头数量</label><input type="number" min="2" max="24" data-field="shots" value="'+esc(cfg.shots)+'"></div><div class="media-field"><label>画面比例</label><select data-field="ratio">'+option('16:9','16:9',cfg.ratio)+option('9:16','9:16',cfg.ratio)+option('1:1','1:1',cfg.ratio)+'</select></div></div></div>'+status
      }else if(n.type==='script'){
        const cfg={textModel:'local',scriptType:'storyboard',shots:6,scriptStyle:'cinematic',includeAudio:true,...n.config};
        cb='<div class="ncb-top"><div class="ncb-chips"><button class="ncb-chip">分镜脚本</button><button class="ncb-chip">角色脚本</button><button class="ncb-chip">短视频口播</button></div>'+collapse+'</div><div class="node-config-grid"><div class="node-config-field"><label>脚本类型</label><select data-field="scriptType">'+option('storyboard','分镜脚本',cfg.scriptType)+option('character','角色脚本',cfg.scriptType)+option('narration','口播脚本',cfg.scriptType)+option('shotlist','镜头清单',cfg.scriptType)+'</select></div><div class="node-config-field"><label>镜头数量</label><input type="number" data-field="shots" value="'+esc(cfg.shots)+'" min="2" max="24"></div><div class="node-config-field"><label>视觉风格</label><select data-field="scriptStyle">'+option('cinematic','电影写实',cfg.scriptStyle)+option('commercial','商业广告',cfg.scriptStyle)+option('documentary','自然纪实',cfg.scriptStyle)+option('anime','动画分镜',cfg.scriptStyle)+'</select></div><div class="node-config-field"><label>声音设计</label><label class="node-check"><input type="checkbox" data-field="includeAudio"'+(cfg.includeAudio?' checked':'')+'>包含对白与声音</label></div></div><div class="upstream-summary">上游 <strong>'+summary+'</strong></div><div class="node-section-label"><span>剧情与要求</span><span>自动结构化输出</span></div><div class="ncb-input-row"><div class="ncb-input" contenteditable="true" data-role="input" data-placeholder="描述剧情、角色、场景和成片目标">'+inputHtml+'</div></div><div class="ncb-bottom"><div><select class="text-model-select" data-field="textModel">'+textModelOptions(cfg.textModel)+'</select><span class="node-run-label">本地模式可生成基础镜头表</span></div><div class="ncb-right"><span class="ncb-credits">'+(n.status==='running'?'处理中':n.output?'已输出':'待运行')+'</span><button class="ncb-send'+(n.input||incoming.texts.length?' active':'')+'" aria-label="生成脚本"'+(n.status==='running'?' disabled':'')+'><svg><use href="#icon-send"/></svg></button></div></div>'+status
      }
    }
    const portsHtml=n.ports?'<div class="node-port port-left" data-pnid="'+n.id+'" data-pside="left" role="button" tabindex="0" aria-label="从 '+esc(n.name)+' 左侧连接"><svg><use href="#icon-plus"/></svg></div><div class="node-port port-right" data-pnid="'+n.id+'" data-pside="right" role="button" tabindex="0" aria-label="从 '+esc(n.name)+' 右侧连接"><svg><use href="#icon-plus"/></svg></div><div class="node-port port-top" data-pnid="'+n.id+'" data-pside="top" role="button" tabindex="0" aria-label="从 '+esc(n.name)+' 上侧连接"><svg><use href="#icon-plus"/></svg></div><div class="node-port port-bottom" data-pnid="'+n.id+'" data-pside="bottom" role="button" tabindex="0" aria-label="从 '+esc(n.name)+' 下侧连接"><svg><use href="#icon-plus"/></svg></div>':'';
    const cbHtml=hasCB?'<div class="node-card-b">'+cb+'</div>':'',canReplace=['image','video','audio'].includes(n.type),replaceControl=canReplace?'<button class="node-replace" data-node-action="replace-node"><svg><use href="#icon-replace"/></svg>替换</button>':'';
    const titleHtml=(n.type==='compose'||n.type==='text')?'':'<div class="node-title"><svg><use href="#'+ic+'"/></svg>'+esc(n.name)+state+'</div>';
    const textToolbar='';
    return textToolbar+titleHtml+'<div class="node-card-a text-node-scale" style="--text-node-scale:'+(n.config?.textScale||1)+'">'+ca+replaceControl+'</div>'+portsHtml+cbHtml
  }

  function isInteractiveTarget(target){return !!target.closest('button,input,select,textarea,video,audio,a,[contenteditable="true"],.ncb-input,.node-port')}
  function isEditableTarget(target){return !!(target&&target.closest&&target.closest('input,textarea,select,[contenteditable="true"],.ncb-input'))}
  function connectNewNode(source,type){
    const target=addNode(type,{x:source.x+source.w+80,y:source.y});
    if(!target)return;
    edges.push({id:Date.now(),from:source.id,fromSide:'right',to:target.id,toSide:'left'});
    renderAllNodes();scheduleSave()
  }
  function openTextEditor(n,task='free'){
    n.config={...n.config,textTask:task};selectedNodeId=n.id;expandedNodeId=n.id;nodes.forEach(node=>node._z=node.id===n.id?100:1);renderAllNodes();updatePanel();scheduleSave();settleExpandedNode(n.id);setTimeout(()=>nodesLayer.querySelector('.node-group[data-nid="'+n.id+'"] .text-editor-input')?.focus(),220)
  }
  function connectInputNode(target,type){
    const meta=TYPE_META[type]||{w:350},source=addNode(type,{x:target.x-meta.w-80,y:target.y});if(!source)return;
    edges.push({id:Date.now(),from:source.id,fromSide:'right',to:target.id,toSide:'left'});openTextEditor(target,'imagePrompt')
  }
  function handleTryAction(n,label){
    if(n.type==='text'&&label==='自己编写内容'){openTextEditor(n,'free');return}
    if(n.type==='text'&&label==='图片反推提示词'){connectInputNode(n,'image');return}
    if(n.type==='image'&&label==='图生图'){n.config={...n.config,imageMode:'image2image'};expandedNodeId=n.id;renderAllNodes();scheduleSave();settleExpandedNode(n.id);return}
    if(n.type==='image'&&label==='图片高清'){n.config={...n.config,resolution:'4k'};expandedNodeId=n.id;renderAllNodes();scheduleSave();settleExpandedNode(n.id);return}
    if(n.type==='video'&&(label.includes('首帧生成视频')||label.includes('首尾帧生成视频'))){n.config={...n.config,mode:label.includes('首尾帧')?'first_last':'img2video'};expandedNodeId=n.id;renderAllNodes();scheduleSave();settleExpandedNode(n.id);return}
    if(label.includes('上传')){pendingUploadNodeId=n.id;pendingLibraryUpload=false;assetFileInput.click();return}
    if(label.includes('文生视频')||label.includes('首帧生成视频')||label.includes('首尾帧生成视频')){connectNewNode(n,'video');return}
    if(label.includes('图生图')){connectNewNode(n,'image');return}
    if(label.includes('文字生音乐')){connectNewNode(n,'audio');return}
    if(label.includes('音频生视频')){connectNewNode(n,'video');return}
    const textPresets={'自己编写内容':'free','优化提示词':'optimize','内容扩写':'expand','摘要提炼':'summary'};
    const scriptPresets={'生成分镜脚本':'storyboard','分镜脚本':'storyboard','角色分镜脚本':'character','角色脚本':'character','短视频口播':'narration'};
    if(n.type==='text'&&textPresets[label]){n.config={...n.config,textTask:textPresets[label]};renderAllNodes();scheduleSave();return}
    if(n.type==='script'&&scriptPresets[label]){n.config={...n.config,scriptType:scriptPresets[label]};renderAllNodes();scheduleSave()}
  }
  function imageWorkflowItem(key){return IMAGE_WORKFLOW_GROUPS.flatMap(group=>[...group.items,...(group.subgroups||[]).flatMap(sub=>sub.items)]).find(item=>item.key===key)}
  function addImageWorkflowNode(source,type,item){
    const target=addNode(type,{x:source.x+source.w+100,y:source.y});if(!target)return null;
    const basePrompt=item.prompt+(source.input?'。原始创作要求：'+source.input:'');
    if(type==='script')target.config={...target.config,scriptType:'storyboard',shots:item.key==='grid-25'?25:item.key==='plot-grid-4'?4:6,scriptStyle:'cinematic'};
    if(type==='director')target.config={...target.config,scene:basePrompt,style:'电影感写实',shots:6,ratio:'16:9'};
    if(type==='image')target.config={...target.config,quality:item.key==='cinematic-light'||item.key==='portrait-texture'?'high':'standard',resolution:item.key==='cinematic-light'?'4k':'2k',ratio:item.key==='panorama-720'?'21:9':item.key==='camera-grid-9'||item.key==='grid-25'?'1:1':'16:9'};
    target.input=basePrompt;edges.push({id:'edge-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),from:source.id,fromSide:'right',to:target.id,toSide:'left'});selectedNodeId=target.id;expandedNodeId=target.id;renderAllNodes();updatePanel();scheduleSave();settleExpandedNode(target.id);return target
  }
  function applyImageWorkflow(source,key){
    const item=imageWorkflowItem(key);if(!item)return;
    const type=key==='dispatch-storyboard'?'director':key==='storyboard'?'script':'image',target=addImageWorkflowNode(source,type,item);
    if(target)showToast('已创建并连接'+target.name)
  }
  async function translateImagePrompt(n,group){
    const source=(n.input||'').trim();if(!source){showToast('请先输入需要翻译的图片提示词');return}
    const selected=Object.entries(TEXT_MODEL_CATALOG).find(([id,meta])=>id!=='local'&&textModelIsConfigured(id,meta));
    if(!selected){showToast('请先在设置中配置可用的文本模型');return}
    const [id,base]=selected,button=group.querySelector('[data-image-translate]');button?.classList.add('loading');if(button)button.disabled=true;
    let endpoint=base.endpoint,model=base.apiModel;if(['ark','custom'].includes(base.provider)){endpoint=base.provider==='ark'?endpoint:configuredEndpoint(base.provider);model=configuredModel(base.provider)}
    const proxy=(localStorage.getItem('apikey-proxy')||'').trim(),key=activeApiKey(base.provider),system='你是影视图像提示词翻译。将用户输入准确翻译为自然、可用于 AI 图像生成的英文提示词。保留主体、镜头、构图、光线、材质和风格信息；仅输出英文提示词。';
    try{
      const request={action:'generate',taskType:'text',provider:base.provider,model:model||id,input:{prompt:source,system},parameters:{temperature:.3}};
      const data=proxy?await submitProxy(proxy,key,request):await requestJSON(endpoint,{method:'POST',headers:directAuthHeaders(key),body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:source}],temperature:.3})});
      const translated=textFrom(data);if(!translated)throw new Error('接口没有返回翻译结果');n.input=translated;const input=group.querySelector('.image-editor [data-role="input"]');if(input)input.textContent=translated;group.querySelector('.media-editor-send')?.classList.add('active');scheduleSave();showToast('已翻译为英文提示词')
    }catch(error){showToast(error.message||'翻译失败')}
    finally{button?.classList.remove('loading');if(button)button.disabled=false}
  }

  assetFileInput.addEventListener('change',()=>{
    const file=assetFileInput.files?.[0];if(!file)return;
    const mediaType=file.type.startsWith('video/')?'video':file.type.startsWith('audio/')?'audio':'image';
    const targetNodeId=pendingUploadNodeId,libraryUpload=pendingLibraryUpload,libraryFolderForUpload=pendingLibraryFolder||'参考素材';pendingUploadNodeId=null;pendingLibraryUpload=false;pendingLibraryFolder='';
    const reader=new FileReader();
    reader.addEventListener('load',()=>{
      if(libraryUpload){const list=readList(MATERIAL_LIBRARY_KEY);list.unshift({id:Date.now(),name:file.name,type:mediaType,url:reader.result,folder:libraryFolderForUpload,scope:libraryScope,createdAt:new Date().toISOString()});if(writeList(MATERIAL_LIBRARY_KEY,list)){renderMaterials();if(libraryMode==='materials')renderLibraryPanel();if(panelMode==='assets')renderAssetPanel()}else {renderMaterials('素材过大，浏览器本地空间不足');showToast('素材过大，浏览器本地空间不足')}return}
      let n=targetNodeId?getNode(targetNodeId):null;if(!n)n=addNode(mediaType);if(!n)return;
      if(n.type==='video'&&mediaType==='image'){n.config={...n.config,referenceImage:reader.result};n.message='已添加参考图片';n.progress=0;renderAllNodes();updatePanel();scheduleSave();return}
      n.output={type:mediaType,url:reader.result,name:file.name};n.status='success';n.message='已上传 '+file.name;n.progress=100;addHistory(n);renderAllNodes();updatePanel();scheduleSave()
    });
    reader.readAsDataURL(file);assetFileInput.value='';assetFileInput.accept='image/*,video/*,audio/*'
  });

  function renderAllNodes(){
    if(expandedResizeObserver){expandedResizeObserver.disconnect();expandedResizeObserver=null}
    nodesLayer.innerHTML='';
    refreshHiddenTopics();
    [...nodes].sort((a,b)=>(a._z||1)-(b._z||1)).forEach(n=>{
      if(hiddenTopicIds.has(n.id))return;
      const g=document.createElement('div');g.className='node-group node-type-'+n.type+(selectedNodeId===n.id?' selected':'')+(expandedNodeId===n.id?' expanded':'');g.style.left=n.x+'px';g.style.top=n.y+'px';g.style.width=n.type==='text'?'fit-content':(n.w||120)+'px';g.dataset.nid=n.id;g.dataset.type=n.type;const selectedModelId=n.config?.discoveredModelId||n.config?.model||n.config?.imageModel||n.config?.audioModel||n.config?.textModel;if(selectedModelId){g.dataset.modelId=selectedModelId;g.dataset.modality=n.config?.discoveredModality||n.type}
      g.innerHTML=nodeHTML(n);
      g.querySelectorAll('.media-node-result video').forEach(v=>{
        const bar=v.parentElement.querySelector('.node-video-controls');if(!bar)return;
        const play=bar.querySelector('.nvc-play'),time=bar.querySelector('.nvc-time'),dots=bar.querySelector('.nvc-dots'),menu=bar.querySelector('.nvc-menu'),rateEl=bar.querySelector('[data-nvc="rate"] b');
        const fmt=s=>{s=Math.max(0,isFinite(s)?s:0);return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')};
        const setIcon=paused=>{play.querySelector('svg').innerHTML=paused?'<path d="M7 5.5h2.6v13H7zM14.4 5.5H17v13h-2.6z"/>':'<path d="M8 5.5v13l11-6.5z"/>'};
        const update=()=>{time.textContent=fmt(v.currentTime)+' / '+fmt(v.duration)};
        play.addEventListener('click',e=>{e.stopPropagation();if(v.paused)v.play();else v.pause()});
        v.addEventListener('play',()=>setIcon(false));
        v.addEventListener('pause',()=>setIcon(true));
        v.addEventListener('timeupdate',update);
        v.addEventListener('loadedmetadata',update);
        setIcon(true);update();
        dots.addEventListener('click',e=>{e.stopPropagation();menu.classList.toggle('open')});
        bar.querySelectorAll('.nvc-item').forEach(item=>item.addEventListener('click',e=>{
          e.stopPropagation();menu.classList.remove('open');
          const action=item.dataset.nvc;
          if(action==='download'){saveMediaNode(n);return}
          if(action==='pip'){if(document.pictureInPictureEnabled&&v.requestPictureInPicture)v.requestPictureInPicture().catch(()=>{});return}
          if(action==='rate'){const rates=[0.5,1,1.5,2],idx=rates.indexOf(v.playbackRate);const next=rates[(idx<0?1:idx+1)%rates.length];v.playbackRate=next;rateEl.textContent=next+'x'}
        }));
      });
      g.querySelectorAll('.media-cost').forEach(cost=>cost.remove());
      if(n.type==='video'){
        n.config=normalizeVideoConfig({model:'sf-wan2.1-t2v',mode:'text2video',duration:6,ratio:'16:9',resolution:'720p',...n.config});
        const editor=g.querySelector('.media-editor'),tools=editor?.querySelector('.media-editor-tools'),footer=editor?.querySelector('.media-editor-footer'),summary=footer?.querySelector('.media-summary'),videoCaps=videoCapabilities(n.config.model),videoModeLabels={text2video:'文生视频',img2video:'图生视频',first_last:'首尾帧',ref_all:'全能参考'};
        const nativeModelSelect=footer?.querySelector('select[data-field="model"]');if(nativeModelSelect){const template=document.createElement('template');template.innerHTML=videoModelControlHTML(n.config.model);nativeModelSelect.replaceWith(template.content.firstElementChild)}
        if(tools){tools.innerHTML='<div class="video-mode-tabs">'+videoCaps.modes.map(mode=>'<button type="button" data-video-mode="'+mode+'">'+videoModeLabels[mode]+'</button>').join('')+'</div><button type="button" class="media-panel-expand" data-video-expand aria-label="放大编辑器" title="放大编辑器"><svg><use href="#icon-editor-expand"/></svg></button>';tools.querySelectorAll('[data-video-mode]').forEach(button=>{button.classList.toggle('active',button.dataset.videoMode===n.config.mode);button.addEventListener('click',event=>{event.stopPropagation();n.config={...n.config,mode:button.dataset.videoMode};scheduleSave();renderAllNodes()})})}
        const videoModelTrigger=g.querySelector('.video-model-trigger'),videoModelPopover=g.querySelector('.video-model-popover');if(videoModelTrigger&&videoModelPopover){videoModelTrigger.addEventListener('click',event=>{event.stopPropagation();const open=!videoModelPopover.classList.contains('open');nodesLayer.querySelectorAll('.video-model-popover.open').forEach(popover=>popover.classList.remove('open'));nodesLayer.querySelectorAll('.video-model-trigger[aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'));videoModelPopover.classList.toggle('open',open);videoModelTrigger.setAttribute('aria-expanded',String(open))});videoModelPopover.querySelectorAll('[data-video-model]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();if(button.dataset.videoModel===n.config.model){videoModelPopover.classList.remove('open');videoModelTrigger.setAttribute('aria-expanded','false');return}n.config=normalizeVideoConfig({...n.config,model:button.dataset.videoModel});scheduleSave();renderAllNodes()}))}
        if(summary){const params=document.createElement('button');params.type='button';params.className='video-params-trigger';params.setAttribute('aria-expanded','false');params.textContent=n.config.ratio+' / '+n.config.duration+'S / '+String(n.config.resolution).toUpperCase();params.addEventListener('click',event=>{event.stopPropagation();const panel=g.querySelector('.node-card-b'),open=panel.classList.toggle('params-open');params.setAttribute('aria-expanded',String(open));if(open)settleExpandedNode(n.id)});summary.replaceWith(params)}
        g.querySelectorAll('[data-video-expand]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();openTextEditorModal(n)}));
        const caps=videoCapabilities(n.config.model),advanced=g.querySelector('.media-advanced'),ratioIcon=ratio=>'<span class="video-ratio-icon" style="'+ratioShapeStyle(ratio)+'"></span>';if(advanced){advanced.innerHTML='<section class="video-param-section"><div class="video-param-title">时长 <strong data-video-duration-label>'+n.config.duration+'S</strong></div><input class="video-duration-range" type="range" min="0" max="'+(caps.durations.length-1)+'" step="1" value="'+Math.max(0,caps.durations.indexOf(+n.config.duration))+'" data-video-duration-range><div class="video-duration-ends"><span>'+caps.durations[0]+'S</span><span>'+caps.durations[caps.durations.length-1]+'S</span></div></section><section class="video-param-section"><div class="video-param-title">比例</div><div class="video-ratio-options">'+caps.ratios.map(ratio=>'<button type="button" class="video-ratio-option'+(ratio===n.config.ratio?' active':'')+'" data-video-param="ratio" data-video-value="'+ratio+'">'+ratioIcon(ratio)+'<span>'+ratio+'</span></button>').join('')+'</div></section><section class="video-param-section"><div class="video-param-title">画质</div><div class="video-resolution-options">'+caps.resolutions.map(resolution=>'<button type="button" class="video-resolution-option'+(resolution===n.config.resolution?' active':'')+'" data-video-param="resolution" data-video-value="'+resolution+'">'+String(resolution).toUpperCase()+'</button>').join('')+'</div></section>'+(caps.motion?'<section class="video-param-section"><div class="video-param-title">运动幅度</div><div class="video-segmented"><button type="button" data-video-param="motion" data-video-value="subtle"'+(n.config.motion==='subtle'?' class="active"':'')+'>轻微</button><button type="button" data-video-param="motion" data-video-value="balanced"'+(n.config.motion==='balanced'?' class="active"':'')+'>自然</button><button type="button" data-video-param="motion" data-video-value="dynamic"'+(n.config.motion==='dynamic'?' class="active"':'')+'>强烈</button></div></section>':'')+(caps.sound?'<section class="video-param-section"><div class="video-param-title">声音</div><div class="video-segmented"><button type="button" data-video-param="sound" data-video-value="true"'+(n.config.sound?' class="active"':'')+'>开启</button><button type="button" data-video-param="sound" data-video-value="false"'+(!n.config.sound?' class="active"':'')+'>关闭</button></div></section>':'')+'<div class="video-capability-note">该模型支持：'+caps.modes.map(mode=>videoModeLabels[mode]).join('、')+'</div>';const syncSummary=()=>{const label=g.querySelector('[data-video-duration-label]'),trigger=g.querySelector('.video-params-trigger');if(label)label.textContent=n.config.duration+'S';if(trigger)trigger.textContent=n.config.ratio+' / '+n.config.duration+'S / '+String(n.config.resolution).toUpperCase()};advanced.querySelector('[data-video-duration-range]').addEventListener('input',event=>{n.config={...n.config,duration:caps.durations[+event.target.value]};syncSummary();scheduleSave()});advanced.querySelectorAll('[data-video-param]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.videoParam,value=key==='sound'?button.dataset.videoValue==='true':button.dataset.videoValue;n.config={...n.config,[key]:value};advanced.querySelectorAll('[data-video-param="'+key+'"]').forEach(item=>item.classList.toggle('active',item===button));syncSummary();scheduleSave()}))}
      }
      if(['script','compose'].includes(n.type)){
        const panel=g.querySelector('.node-card-b');let footer=g.querySelector('.media-editor-footer'),send=footer?.querySelector('.ncb-send');
        if(n.type==='script'){footer=g.querySelector('.ncb-bottom');send=footer?.querySelector('.ncb-send')}
        if(n.type==='compose'){
          const editor=g.querySelector('.compose-editor'),advanced=editor?.querySelector('.media-advanced');send=advanced?.querySelector('.ncb-send');
          if(editor&&advanced&&send){footer=document.createElement('div');footer.className='compose-editor-footer';const spacer=document.createElement('span');spacer.className='editor-spacer';advanced.before(footer);footer.append(spacer,send)}
        }
        if(footer&&send&&panel){const params=document.createElement('button');params.type='button';params.className='media-params-toggle';params.textContent='参数设置';params.setAttribute('aria-expanded','false');params.addEventListener('click',ev=>{ev.stopPropagation();const open=panel.classList.toggle('params-open');params.setAttribute('aria-expanded',String(open));if(open)settleExpandedNode(n.id)});footer.insertBefore(params,send)}
      }
      const sendBtn=g.querySelector('.ncb-send'),inputEl=g.querySelector('.ncb-input');
      if(sendBtn&&inputEl){
        inputEl.addEventListener('paste',e=>{
          const text=(e.clipboardData||window.clipboardData)?.getData('text/plain');
          if(!text)return;
          e.preventDefault();
          document.execCommand('insertText',false,text)
        });
        inputEl.addEventListener('input',()=>{n.input=inputEl.textContent.trim();const upstream=collectInputs(n.id);sendBtn.classList.toggle('active',!!n.input||upstream.texts.length>0||(['image','text','video'].includes(n.type)&&upstream.images.length>0));const count=g.querySelector('.audio-char-count');if(count)count.textContent=n.input.length+'/50000';if(n.type==='text')requestAnimationFrame(()=>revealExpandedNode(n.id));scheduleSave()});
        sendBtn.addEventListener('click',()=>{showQuotaPopup(n);runNode(n.id)})
      }
      if(sendBtn&&!inputEl)sendBtn.addEventListener('click',()=>{showQuotaPopup(n);runNode(n.id)});
      g.querySelectorAll('[data-run-node]').forEach(button=>button.addEventListener('click',()=>runNode(n.id)));
      const modelTrigger=g.querySelector('.text-model-trigger'),modelPopover=g.querySelector('.text-model-popover');
      if(modelTrigger&&modelPopover){
        modelTrigger.addEventListener('click',ev=>{ev.stopPropagation();const willOpen=!modelPopover.classList.contains('open');nodesLayer.querySelectorAll('.text-model-popover.open').forEach(popover=>popover.classList.remove('open'));nodesLayer.querySelectorAll('.text-model-trigger[aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'));modelPopover.classList.toggle('open',willOpen);modelTrigger.setAttribute('aria-expanded',String(willOpen));if(willOpen)settleExpandedNode(n.id)});
        modelPopover.querySelectorAll('[data-text-model]').forEach(optionEl=>optionEl.addEventListener('click',ev=>{ev.stopPropagation();const textModel=optionEl.dataset.textModel;n.config={...n.config,textModel,textTask:textModel.startsWith('deepseek-v4-')?'optimize':n.config?.textTask||'free'};modelPopover.querySelectorAll('[data-text-model]').forEach(option=>option.classList.toggle('selected',option===optionEl));modelTrigger.querySelector('.model-name').textContent=optionEl.querySelector('.text-model-option-name').textContent;modelPopover.classList.remove('open');modelTrigger.setAttribute('aria-expanded','false');scheduleSave()}))
      }
      const bindUnifiedModelControl=(kind,configKey,normalize)=>{
        const trigger=g.querySelector('.'+kind+'-model-trigger'),popover=g.querySelector('.'+kind+'-model-popover');
        if(!trigger||!popover)return;
        trigger.addEventListener('click',event=>{
          event.stopPropagation();
          const open=!popover.classList.contains('open');
          nodesLayer.querySelectorAll('.video-model-popover.open').forEach(panel=>panel.classList.remove('open'));
          nodesLayer.querySelectorAll('.video-model-trigger[aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'));
          popover.classList.toggle('open',open);trigger.setAttribute('aria-expanded',String(open));
          if(open)settleExpandedNode(n.id);
        });
        popover.querySelectorAll('[data-'+kind+'-model]').forEach(button=>button.addEventListener('click',event=>{
          event.stopPropagation();
          const dataKey=kind.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())+'Model',next=button.dataset[dataKey];
          n.config=normalize({...n.config,[configKey]:next});
          scheduleSave();renderAllNodes();
        }));
      };
      bindUnifiedModelControl('unified-text','textModel',config=>({...config,textTask:config.textModel.startsWith('deepseek-v4-')?'optimize':config.textTask||'free'}));
      bindUnifiedModelControl('image','imageModel',config=>config);
      bindUnifiedModelControl('audio','audioModel',config=>config);
      const collapseBtn=g.querySelector('.ncb-expand');if(collapseBtn)collapseBtn.addEventListener('click',()=>{expandedNodeId=null;renderAllNodes()});
      const closeImagePopovers=except=>{
        nodesLayer.querySelectorAll('.image-popover.open').forEach(popover=>{if(popover!==except)popover.classList.remove('open')});
        nodesLayer.querySelectorAll('[data-image-popover-toggle][aria-expanded="true"]').forEach(button=>{if(!except||button.nextElementSibling!==except)button.setAttribute('aria-expanded','false')})
      };
      g.querySelectorAll('[data-image-popover-toggle]').forEach(button=>button.addEventListener('click',ev=>{
        ev.stopPropagation();const popover=button.nextElementSibling,willOpen=!popover?.classList.contains('open');closeImagePopovers(willOpen?popover:null);if(!popover)return;popover.classList.toggle('open',willOpen);button.setAttribute('aria-expanded',String(willOpen));if(willOpen)settleExpandedNode(n.id)
      }));
      g.querySelectorAll('[data-image-param]').forEach(button=>button.addEventListener('click',ev=>{
        ev.stopPropagation();const key=button.dataset.imageParam,value=key==='count'?+button.dataset.imageValue:button.dataset.imageValue;n.config={...n.config,[key]:value};g.querySelectorAll('[data-image-param="'+key+'"]').forEach(optionEl=>optionEl.classList.toggle('active',optionEl===button));const cfg={ratio:'16:9',resolution:'2k',...n.config};const summary=g.querySelector('[data-image-param-summary]');if(summary)summary.textContent=cfg.ratio+' / '+String(cfg.resolution).toUpperCase();scheduleSave()
      }));
      g.querySelectorAll('[data-legacy-image-model]').forEach(button=>button.addEventListener('click',ev=>{ev.stopPropagation();n.config={...n.config,imageModel:button.dataset.imageModel};scheduleSave();renderAllNodes()}));
      g.querySelectorAll('[data-image-action="expand"]').forEach(button=>button.addEventListener('click',ev=>{ev.stopPropagation();openTextEditorModal(n)}));
      g.querySelectorAll('[data-image-workflow]').forEach(button=>button.addEventListener('click',ev=>{ev.stopPropagation();applyImageWorkflow(n,button.dataset.imageWorkflow)}));
      const translateButton=g.querySelector('[data-image-translate]');if(translateButton)translateButton.addEventListener('click',ev=>{ev.stopPropagation();translateImagePrompt(n,g)});
      g.querySelectorAll('.node-port').forEach(port=>port.addEventListener('pointerdown',beginConnection));
      g.querySelectorAll('.btn-director').forEach(dirBtn=>dirBtn.addEventListener('click',()=>openDirector(n)));
      const genBtn=g.querySelector('.btn-gen');if(genBtn&&n.type==='video')genBtn.addEventListener('click',()=>runNode(n.id));
      g.querySelectorAll('[data-field]').forEach(field=>{
        const save=()=>{n.config=n.config||{};const key=field.dataset.field;if(key==='prompt')n.input=field.value;else if(field.type==='checkbox')n.config[key]=field.checked;else if(['duration','count','shots','speed','tone','volume','pitch','strength','timbre','transitionDuration'].includes(key))n.config[key]=+field.value;else if(key==='temperature')n.config[key]=parseFloat(field.value);else if(key==='seed')n.config[key]=field.value===''?'':+field.value;else n.config[key]=field.value;const output=g.querySelector('[data-output-for="'+key+'"]');if(output)output.textContent=field.value;scheduleSave()};
        field.addEventListener('input',save);field.addEventListener('change',save)
        if(n.type==='video'&&field.dataset.field==='model')field.addEventListener('change',()=>{n.config=normalizeVideoConfig({...n.config});renderAllNodes();scheduleSave()})
      });
      g.querySelectorAll('[data-node-action="upload"]').forEach(button=>button.addEventListener('click',()=>{pendingUploadNodeId=n.id;pendingLibraryUpload=false;assetFileInput.click()}));
      g.querySelectorAll('[data-node-action="save-media"]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();saveMediaNode(n)}));
      g.querySelectorAll('[data-node-action="replace-node"]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();openTextReplaceModal(n)}));
      g.querySelectorAll('[data-node-action="replace-text"]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();openTextReplaceModal(n)}));
      g.querySelectorAll('[data-text-node-action]').forEach(button=>button.addEventListener('click',event=>{
        event.stopPropagation();const action=button.dataset.textNodeAction;
        if(action==='edit'){openTextEditorModal(n);return}
        if(action==='download'){downloadTextNode(n);return}
        if(action==='smaller'||action==='larger'){const current=Number(n.config?.textScale||1),delta=action==='larger'?.1:-.1;n.config={...n.config,textScale:Math.max(.75,Math.min(1.5,Math.round((current+delta)*100)/100))};renderAllNodes();scheduleSave()}
      }));
      g.querySelectorAll('[data-media-tool]').forEach(button=>button.addEventListener('click',()=>{const tool=button.dataset.mediaTool;if(tool==='character'){openUtility('characters');return}if(tool==='style')g.querySelector('[data-field="style"]')?.focus();if(tool==='camera')g.querySelector('[data-field="motion"]')?.focus();button.classList.toggle('active');n.config={...n.config,activeTool:button.classList.contains('active')?tool:''};scheduleSave()}));
      g.querySelectorAll('[data-compose-move]').forEach(button=>button.addEventListener('click',()=>{const id=+button.closest('[data-compose-id]').dataset.composeId,order=[...(n.config?.composeOrder||[])],index=order.indexOf(id),next=button.dataset.composeMove==='left'?index-1:index+1;if(index<0||next<0||next>=order.length)return;[order[index],order[next]]=[order[next],order[index]];n.config={...n.config,composeOrder:order};renderAllNodes();scheduleSave();settleExpandedNode(n.id)}));
      const quickScript=g.querySelector('[data-director-quick-script]');if(quickScript)quickScript.addEventListener('click',()=>generateDirectorScript(n));
      g.querySelectorAll('.nc-try-chip,.ncb-chip').forEach(ch=>ch.addEventListener('click',()=>handleTryAction(n,ch.textContent.trim())));
      g.addEventListener('pointerdown',ev=>{
        if(isInteractiveTarget(ev.target)||ev.button!==0||currentTool==='hand'||spaceHeld)return;
        const clickCard=ev.target.closest('.node-card-a');
        if(n.type==='text'&&clickCard){const now=performance.now();if(lastTextCardClick.id===n.id&&now-lastTextCardClick.at<360){lastTextCardClick={id:null,at:0};ev.preventDefault();ev.stopPropagation();selectNode(n.id);openTextEditorModal(n,false);return}lastTextCardClick={id:n.id,at:now}}
        ev.preventDefault();ev.stopPropagation();selectNode(n.id);g.setPointerCapture(ev.pointerId);body.classList.add('dragging-node');
        const scale=scaleValue(),sx=ev.clientX,sy=ev.clientY,ox=n.x,oy=n.y;let moved=false,dragCollapsed=false;g.style.transform='';
        const onMove=e=>{if(Math.hypot(e.clientX-sx,e.clientY-sy)>4&&!moved){rememberGraph();moved=true}if(!moved)return;if(!dragCollapsed&&expandedNodeId===n.id){dragCollapsed=true;expandedNodeId=null;g.classList.remove('expanded');const cb=g.querySelector('.node-card-b');if(cb)cb.style.display='none'}const nextX=ox+(e.clientX-sx)/scale,nextY=oy+(e.clientY-sy)/scale,shouldSnap=snapGridOn&&e.shiftKey;n.x=shouldSnap?Math.round(nextX/20)*20:nextX;n.y=shouldSnap?Math.round(nextY/20)*20:nextY;g.style.transform='translate3d('+(n.x-ox)+'px,'+(n.y-oy)+'px,0)';queueEdges(n.id)};
        const onUp=e=>{if(g.hasPointerCapture(e.pointerId))g.releasePointerCapture(e.pointerId);g.removeEventListener('pointermove',onMove);g.removeEventListener('pointerup',onUp);g.removeEventListener('pointercancel',onUp);if(moved){g.style.left=n.x+'px';g.style.top=n.y+'px';g.style.transform=''}body.classList.remove('dragging-node');queueEdges(n.id);scheduleSave();if(dragCollapsed||moved){dragCollapsed=false;expandedNodeId=n.id;g.classList.add('expanded');const cb=g.querySelector('.node-card-b');if(cb)cb.style.display='';settleExpandedNode(n.id)}else if(!moved&&clickCard){expandedNodeId=expandedNodeId===n.id?null:n.id;renderAllNodes();if(expandedNodeId===n.id)settleExpandedNode(n.id)}};
        g.addEventListener('pointermove',onMove);g.addEventListener('pointerup',onUp);g.addEventListener('pointercancel',onUp)
      });
      const resetPortMagnet=()=>{g.classList.remove('ports-ready','port-proximity');g.querySelectorAll('.node-port').forEach(port=>{port.style.setProperty('--magnet-x','0px');port.style.setProperty('--magnet-y','0px')})};
      g.addEventListener('pointermove',ev=>{
        if(body.classList.contains('dragging-node'))return;
        // A port must never win pointer proximity while the cursor is inside another node.
        const overlappedNode=[...nodesLayer.querySelectorAll('.node-group')].find(other=>{
          if(other===g)return false;const rect=other.getBoundingClientRect();
          return ev.clientX>=rect.left&&ev.clientX<=rect.right&&ev.clientY>=rect.top&&ev.clientY<=rect.bottom
        });
        if(overlappedNode){resetPortMagnet();return}
        const card=g.querySelector('.node-card-a'),cardRect=card?.getBoundingClientRect(),insideCard=!!(cardRect&&ev.clientX>=cardRect.left&&ev.clientX<=cardRect.right&&ev.clientY>=cardRect.top&&ev.clientY<=cardRect.bottom);
        if(insideCard){g.classList.add('ports-ready');g.classList.remove('port-proximity');g.querySelectorAll('.node-port').forEach(port=>{port.style.setProperty('--magnet-x','0px');port.style.setProperty('--magnet-y','0px')});return}
        const scale=scaleValue();let nearPort=false;
        g.querySelectorAll('.node-port').forEach(port=>{const rect=port.getBoundingClientRect(),dx=(ev.clientX-(rect.left+rect.width/2))/scale,dy=(ev.clientY-(rect.top+rect.height/2))/scale,distance=Math.hypot(dx*scale,dy*scale),snapRange=42*portSnapFactor(card);if(distance>snapRange){port.style.setProperty('--magnet-x','0px');port.style.setProperty('--magnet-y','0px');return}nearPort=true;const strength=(1-distance/snapRange)*8,limit=value=>Math.max(-strength,Math.min(strength,value));port.style.setProperty('--magnet-x',limit(dx*.18)+'px');port.style.setProperty('--magnet-y',limit(dy*.18)+'px')});
        g.classList.remove('ports-ready');g.classList.toggle('port-proximity',nearPort)
      });
      g.addEventListener('pointerleave',resetPortMagnet);
      nodesLayer.appendChild(g);
      if(expandedNodeId===n.id&&'ResizeObserver'in window){expandedResizeObserver=new ResizeObserver(()=>requestAnimationFrame(()=>{if(expandedNodeId===n.id)revealExpandedNode(n.id)}));expandedResizeObserver.observe(g)}
    });
    requestAnimationFrame(()=>renderEdges());
    body.classList.toggle('has-nodes',visibleTopicCount()>0);
  }
  document.addEventListener('pointerdown',ev=>{
    if(ev.target.closest('.image-control,.video-model-control'))return;
    nodesLayer.querySelectorAll('.image-popover.open,.video-model-popover.open').forEach(popover=>popover.classList.remove('open'));
    nodesLayer.querySelectorAll('[data-image-popover-toggle][aria-expanded="true"],.video-model-trigger[aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'))
  });

  // ---- CONNECTION (Edge creation) ----
  function wouldCreateCycle(from,to){
    const graph=new Map(nodes.map(n=>[n.id,[]]));edges.forEach(e=>graph.get(e.from)?.push(e.to));graph.get(from)?.push(to);const stack=[to],visited=new Set();while(stack.length){const id=stack.pop();if(id===from)return true;if(visited.has(id))continue;visited.add(id);(graph.get(id)||[]).forEach(next=>stack.push(next))}return false
  }
  function clearPortStates(){nodesLayer.querySelectorAll('.node-port').forEach(port=>{port.classList.remove('connecting','valid-target','invalid-target');port.style.setProperty('--magnet-x','0px');port.style.setProperty('--magnet-y','0px')})}
  function connectionPortAtPoint(clientX,clientY){
    const direct=document.elementFromPoint(clientX,clientY)?.closest('.node-port');if(direct&&validConnectionTarget(direct))return direct;
    let nearest=null,bestDistance=26*portSnapFactor();nodesLayer.querySelectorAll('.node-port').forEach(port=>{if(!validConnectionTarget(port))return;const rect=port.getBoundingClientRect(),distance=Math.hypot(clientX-(rect.left+rect.width/2),clientY-(rect.top+rect.height/2));if(distance<bestDistance){nearest=port;bestDistance=distance}});return nearest||direct
  }
  // 吸附距离因子：根据源节点框尺寸调整，节点越大吸附范围越大，但整体收紧到贴近框边缘
  function portSnapFactor(card){
    const base=Math.min(1.6,Math.max(.8,1280/(window.innerWidth||1280)));
    let nodeScale=1;
    if(card){const w=card.getBoundingClientRect?.()?.width||0;if(w>0)nodeScale=Math.min(1.6,Math.max(.7,w/300))}
    return base*nodeScale
  }
  function cancelConnection(){
    const active=connecting;if(active?.port?.hasPointerCapture?.(active.pointerId))active.port.releasePointerCapture(active.pointerId);connecting=null;body.classList.remove('connecting-edge');viewport.classList.remove('connecting-edge');
    clearPortStates();const tempGroup=document.getElementById('edge-temp-group'),tempPaths=tempGroup.querySelectorAll('path');tempGroup.setAttribute('hidden','');tempPaths.forEach(path=>path.removeAttribute('d'));
    window.removeEventListener('pointermove',onConnectionMove,true);window.removeEventListener('pointerup',onConnectionUp,true);window.removeEventListener('pointercancel',cancelConnection,true)
  }
  function validConnectionTarget(port){return !!(connecting&&port&&+port.dataset.pnid!==connecting.nodeId)}
  function onConnectionMove(ev){
    if(!connecting||ev.pointerId!==connecting.pointerId)return;ev.preventDefault();const hovered=connectionPortAtPoint(ev.clientX,ev.clientY),mousePoint=screenToWorld(ev.clientX,ev.clientY),point=validConnectionTarget(hovered)?getPortPoint(+hovered.dataset.pnid,hovered.dataset.pside):mousePoint,tempGroup=document.getElementById('edge-temp-group'),targetSide=hovered&&validConnectionTarget(hovered)?hovered.dataset.pside:(connecting.side==='right'?'left':connecting.side==='left'?'right':connecting.side==='bottom'?'top':'bottom'),d=curvePath(connecting.start,point,connecting.side,targetSide);tempGroup.removeAttribute('hidden');tempGroup.querySelectorAll('path').forEach(path=>path.setAttribute('d',d));const head=tempGroup.querySelector('.edge-temp-head');head.setAttribute('cx',point.x.toFixed(1));head.setAttribute('cy',point.y.toFixed(1));
    nodesLayer.querySelectorAll('.node-port').forEach(port=>{if(port===connecting.port)return;port.classList.toggle('valid-target',port===hovered&&validConnectionTarget(port));port.classList.toggle('invalid-target',port===hovered&&!validConnectionTarget(port))})
  }
  function onConnectionUp(ev){
    if(!connecting||ev.pointerId!==connecting.pointerId)return;ev.preventDefault();const port=connectionPortAtPoint(ev.clientX,ev.clientY);
    let added=false,sourceNode=null,targetNode=null;
    if(validConnectionTarget(port)){
      const otherId=+port.dataset.pnid,otherSide=port.dataset.pside,fromSide=connecting.side,toSide=otherSide;
      const from=connecting.nodeId,to=otherId;
      if(!edges.some(e=>e.from===from&&e.to===to)&&!wouldCreateCycle(from,to)){rememberGraph();edges.push({id:'edge-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),from,fromSide,to,toSide});selectedEdge=String(edges[edges.length-1].id);sourceNode=getNode(from);targetNode=getNode(to);if(targetNode)targetNode.message='';selectedNodeId=to;added=true;scheduleSave()}
    }else if(connecting){
      const source={nodeId:connecting.nodeId,side:connecting.side};
      nodeMenuSuppressUntil=Date.now()+400;
      closeUtility();closeAll();
      pendingAddPoint=screenToWorld(ev.clientX,ev.clientY);
      pendingConnectSource=source;
      document.getElementById('material-sub').style.display='none';document.getElementById('script-sub').style.display='none';
      buildNodeMenu();toggleP('node');if(popupState.node)placeAtPoint(document.getElementById('node-menu'),ev.clientX,ev.clientY)
    }
    cancelConnection();if(added){renderAllNodes();updatePanel();showToast('已连接主题')}else{renderEdges();updatePanel()}
  }
  function beginConnection(ev){
    const port=ev.currentTarget;
    if(!port||ev.button!==0)return;ev.preventDefault();ev.stopImmediatePropagation();if(connecting)cancelConnection();port.setPointerCapture?.(ev.pointerId);connecting={nodeId:+port.dataset.pnid,side:port.dataset.pside,start:getPortPoint(+port.dataset.pnid,port.dataset.pside),port,pointerId:ev.pointerId};body.classList.add('connecting-edge');viewport.classList.add('connecting-edge');port.classList.add('connecting');
    nodesLayer.querySelectorAll('.node-port').forEach(candidate=>{if(candidate!==port)candidate.classList.toggle('invalid-target',!validConnectionTarget(candidate))});
    window.addEventListener('pointermove',onConnectionMove,true);window.addEventListener('pointerup',onConnectionUp,true);window.addEventListener('pointercancel',cancelConnection,true)
  }

  // Pan and zoom canvas
  viewport.addEventListener('pointerdown',ev=>{
    const panGesture=ev.button===1||spaceHeld||currentTool==='hand';if(!panGesture||ev.target.closest('.node-port'))return;
    ev.preventDefault();closeAll();viewport.setPointerCapture(ev.pointerId);body.classList.add('grabbing');const sx=ev.clientX,sy=ev.clientY,ox=panX,oy=panY;
    const onMove=e=>{panX=ox+e.clientX-sx;panY=oy+e.clientY-sy;applyViewTransform();queueEdges()};
    const onUp=e=>{if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);viewport.removeEventListener('pointermove',onMove);viewport.removeEventListener('pointerup',onUp);viewport.removeEventListener('pointercancel',onUp);body.classList.remove('grabbing')};
    viewport.addEventListener('pointermove',onMove);viewport.addEventListener('pointerup',onUp);viewport.addEventListener('pointercancel',onUp)
  });
  viewport.addEventListener('wheel',ev=>{if(ev.ctrlKey||ev.metaKey){ev.preventDefault();setZoom(zoomLevel*(ev.deltaY>0?.9:1.1),{x:ev.clientX,y:ev.clientY})}else{ev.preventDefault();panX-=ev.deltaX;panY-=ev.deltaY;applyViewTransform();queueEdges()}},{passive:false});

  function renderMinimap(){
    if(!minimapOn||!minimapSvg)return;const rect=viewport.getBoundingClientRect(),viewA=screenToWorld(rect.left,rect.top),viewB=screenToWorld(rect.right,rect.bottom);
    const minX=Math.min(viewA.x,...nodes.map(n=>n.x))-80,minY=Math.min(viewA.y,...nodes.map(n=>n.y))-80,maxX=Math.max(viewB.x,...nodes.map(n=>n.x+n.w))+80,maxY=Math.max(viewB.y,...nodes.map(n=>n.y+nodeHeight(n)))+80;
    const mapScale=Math.min(200/(maxX-minX||1),118/(maxY-minY||1)),tx=x=>10+(x-minX)*mapScale,ty=y=>10+(y-minY)*mapScale;
    minimap.dataset.minX=minX;minimap.dataset.minY=minY;minimap.dataset.scale=mapScale;
    const nodeRects=nodes.map(n=>'<rect class="minimap-node" x="'+tx(n.x).toFixed(1)+'" y="'+ty(n.y).toFixed(1)+'" width="'+Math.max(3,n.w*mapScale).toFixed(1)+'" height="'+Math.max(3,nodeHeight(n)*mapScale).toFixed(1)+'" rx="2"/>').join('');
    minimapSvg.innerHTML=nodeRects+'<rect class="minimap-view" x="'+tx(viewA.x).toFixed(1)+'" y="'+ty(viewA.y).toFixed(1)+'" width="'+Math.max(3,(viewB.x-viewA.x)*mapScale).toFixed(1)+'" height="'+Math.max(3,(viewB.y-viewA.y)*mapScale).toFixed(1)+'" rx="2"/>'
  }
  minimap.addEventListener('pointerdown',ev=>{const rect=minimap.getBoundingClientRect(),mapScale=+minimap.dataset.scale||1,minX=+minimap.dataset.minX||0,minY=+minimap.dataset.minY||0,worldX=minX+(ev.clientX-rect.left-10)/mapScale,worldY=minY+(ev.clientY-rect.top-10)/mapScale;panX=viewport.clientWidth/2-worldX*scaleValue();panY=viewport.clientHeight/2-worldY*scaleValue();applyViewTransform();queueEdges()});

  const TOOL_TEMPLATES=[
    {name:'电影感推镜',desc:'缓慢推进主体，浅景深与环境光变化',prompt:'电影感缓慢推镜，主体保持稳定，浅景深，环境光自然变化，镜头运动平滑'},
    {name:'商品环绕展示',desc:'适合产品、电商和包装展示',prompt:'镜头围绕商品缓慢环绕，棚拍光线，高级商业广告质感，商品细节清晰'},
    {name:'首尾帧转场',desc:'在两张参考图之间生成连贯过渡',prompt:'从首帧自然过渡到尾帧，保持主体一致，运动连续，无突变和闪烁'},
    {name:'角色表演',desc:'稳定人物身份并加强细微表情',prompt:'人物身份与服装保持一致，自然眨眼与呼吸，细微表情变化，镜头稳定'},
    {name:'场景延时',desc:'云层、光影和人流的时间推演',prompt:'固定机位延时摄影，云层与光影快速流动，空间结构保持稳定'},
    {name:'手持跟拍',desc:'轻微手持感的动态跟随镜头',prompt:'纪录片式手持跟拍，轻微自然晃动，主体始终位于画面中心，运动真实'},
    {name:'粒子消散',desc:'主体分解为细小粒子并随风散开',prompt:'主体逐渐化为细密发光粒子，随风自然飘散，背景保持稳定'},
    {name:'垂直短视频',desc:'面向 9:16 内容的节奏化镜头',prompt:'9:16 竖屏短视频，构图紧凑，节奏清晰，主体动作有明确起承转合'}
  ];
  const DEFAULT_CHARACTERS=[
    {name:'都市女主',desc:'25岁，利落短发，冷静克制，现代极简穿搭'},
    {name:'青年导演',desc:'30岁，专注沉稳，深色工作夹克，电影从业者气质'},
    {name:'古风侠客',desc:'青年男性，束发，深色劲装，克制锐利的东方武侠气质'},
    {name:'科幻研究员',desc:'女性研究员，银灰制服，理性敏锐，近未来实验室风格'}
  ];
  function readList(key){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch(e){return[]}}
  function writeList(key,list){try{localStorage.setItem(key,JSON.stringify(list));return true}catch(e){return false}}
  function libraryCard(item,index,kind,icon,deletable){const iconHtml=icon?'<span class="library-icon"><svg><use href="#'+icon+'"/></svg></span>':'';return '<div class="library-item"><button class="library-open'+(icon?' has-icon':'')+'" data-'+kind+'="'+index+'">'+iconHtml+'<strong>'+esc(item.name)+'</strong><span>'+esc(item.desc||item.createdAt||'')+'</span></button>'+(deletable?'<button class="library-delete" data-delete-'+kind+'="'+esc(item.id)+'" aria-label="删除"><svg><use href="#icon-trash"/></svg></button>':'')+'</div>'}
  function bindLibraryAdd(buttonId,formId,focusId){
    const button=document.getElementById(buttonId),form=document.getElementById(formId);button.addEventListener('click',()=>{const opening=form.hidden;form.hidden=!opening;button.classList.toggle('active',opening);button.setAttribute('aria-expanded',String(opening));if(opening)requestAnimationFrame(()=>document.getElementById(focusId)?.focus())})
  }
  function closeUtility(){utilityMode='';utilityDrawer.classList.remove('open');document.querySelectorAll('#dock .btn-dock-ghost').forEach(btn=>btn.classList.remove('on'))}
  function openUtility(mode){
    const trigger=document.getElementById('btn-'+mode);clearFloatingClose();closeAll();utilityMode=mode;utilityDrawer.classList.remove('open');utilityDrawer.style.display='flex';document.querySelectorAll('#dock .btn-dock-ghost').forEach(btn=>btn.classList.toggle('on',btn===trigger));
    if(mode==='toolbox')renderToolbox();if(mode==='materials')renderMaterials();if(mode==='characters')renderCharacters();if(mode==='history')renderHistoryUtility();if(trigger)placeAbove(utilityDrawer,trigger.getBoundingClientRect(),12);utilityDrawer.offsetHeight;utilityDrawer.classList.add('open');utilityDrawer.style.display=''
  }
  function getToolTemplates(){return [...TOOL_TEMPLATES.map((item,index)=>({...item,id:'builtin-'+index,builtin:true})),...readList(TOOL_LIBRARY_KEY).map(item=>({...item,builtin:false}))]}
  function renderToolbox(){
    utilityTitle.textContent='工具箱';const list=getToolTemplates();
    utilityContent.innerHTML='<div class="utility-toolbar"><div class="utility-toolbar-copy"><strong>'+list.length+' 个镜头模板</strong><span>本地模板会自动保存</span></div><button class="utility-primary" id="tool-add" aria-expanded="false"><svg><use href="#icon-plus"/></svg>添加模板</button></div><form class="library-form" id="tool-form" hidden><input id="tool-name" placeholder="模板名称" required><input id="tool-desc" placeholder="用途说明" required><input id="tool-prompt" placeholder="提示词内容" required><button>保存模板</button></form><div class="library-grid">'+list.map((item,index)=>libraryCard(item,index,'template','',!item.builtin)).join('')+'</div>';
    bindLibraryAdd('tool-add','tool-form','tool-name');
    document.getElementById('tool-form').addEventListener('submit',ev=>{ev.preventDefault();const name=document.getElementById('tool-name').value.trim(),desc=document.getElementById('tool-desc').value.trim(),prompt=document.getElementById('tool-prompt').value.trim();if(!name||!prompt)return;const custom=readList(TOOL_LIBRARY_KEY);custom.push({id:Date.now(),name,desc:desc||prompt,prompt});writeList(TOOL_LIBRARY_KEY,custom);renderToolbox();if(panelMode==='assets')renderAssetPanel()});
    utilityContent.querySelectorAll('[data-template]').forEach(button=>button.addEventListener('click',()=>{const item=list[+button.dataset.template],textNode=addNode('text',{name:'模板 · '+item.name,input:item.prompt});if(textNode)connectNewNode(textNode,'video');closeUtility()}));
    utilityContent.querySelectorAll('[data-delete-template]').forEach(button=>button.addEventListener('click',ev=>{ev.stopPropagation();writeList(TOOL_LIBRARY_KEY,readList(TOOL_LIBRARY_KEY).filter(item=>String(item.id)!==button.dataset.deleteTemplate));renderToolbox();if(panelMode==='assets')renderAssetPanel()}))
  }
  function getMaterials(){
    const custom=readList(MATERIAL_LIBRARY_KEY).map(item=>({...item,source:'custom',name:item.name||'本地素材',desc:(item.type||'媒体')+' · 本地素材'}));
    const history=getHistory().filter(item=>item.url).map((item,index)=>({...item,id:'history-'+(item.id||index),source:'history',name:item.name||((item.type||'媒体')+'生成结果'),desc:new Date(item.createdAt).toLocaleString()}));return [...custom,...history]
  }
  function renderMaterials(feedback=''){
    utilityTitle.textContent='素材库';const list=getMaterials();
    utilityContent.innerHTML='<div class="utility-toolbar"><div class="utility-toolbar-copy"><strong>'+list.length+' 项素材</strong><span>图片、视频与音频</span></div><div class="utility-toolbar-actions"><button class="utility-action" id="material-upload"><svg><use href="#icon-nt-upload"/></svg>上传</button><button class="utility-primary" id="material-add" aria-expanded="false"><svg><use href="#icon-plus"/></svg>添加素材</button></div></div>'+(feedback?'<div class="utility-feedback">'+esc(feedback)+'</div>':'')+'<form class="library-form material-form" id="material-form" hidden><input id="material-name" placeholder="素材名称" required><select id="material-type"><option value="image">图片</option><option value="video">视频</option><option value="audio">音频</option></select><input id="material-url" type="url" placeholder="https://... 素材地址" required><button>保存链接</button></form><div class="library-grid">'+(list.length?list.map((item,index)=>libraryCard(item,index,'material','',item.source==='custom')).join(''):'<div class="library-empty">暂无素材</div>')+'</div>';
    bindLibraryAdd('material-add','material-form','material-name');
    document.getElementById('material-upload').addEventListener('click',()=>{pendingUploadNodeId=null;pendingLibraryUpload=true;assetFileInput.click()});
    document.getElementById('material-form').addEventListener('submit',ev=>{ev.preventDefault();const name=document.getElementById('material-name').value.trim(),type=document.getElementById('material-type').value,url=document.getElementById('material-url').value.trim();if(!name||!url)return;const custom=readList(MATERIAL_LIBRARY_KEY);custom.unshift({id:Date.now(),name,type,url,createdAt:new Date().toISOString()});writeList(MATERIAL_LIBRARY_KEY,custom);renderMaterials();if(panelMode==='assets')renderAssetPanel()});
    utilityContent.querySelectorAll('[data-material]').forEach(button=>button.addEventListener('click',()=>{const item=list[+button.dataset.material],type=['image','video','audio'].includes(item.type)?item.type:'image';addNode(type,{name:'素材 · '+item.name,output:{type,url:item.url,name:item.name},status:'success',message:'已从素材库载入',progress:100});closeUtility()}));
    utilityContent.querySelectorAll('[data-delete-material]').forEach(button=>button.addEventListener('click',ev=>{ev.stopPropagation();writeList(MATERIAL_LIBRARY_KEY,readList(MATERIAL_LIBRARY_KEY).filter(item=>String(item.id)!==button.dataset.deleteMaterial));renderMaterials();if(panelMode==='assets')renderAssetPanel()}))
  }
  function getCharacters(){return [...DEFAULT_CHARACTERS.map((item,index)=>({...item,id:'builtin-'+index,builtin:true})),...readList(CHARACTER_LIBRARY_KEY).map(item=>({...item,builtin:false}))]}
  function renderCharacters(){
    utilityTitle.textContent='角色库';const list=getCharacters();utilityContent.innerHTML='<div class="utility-toolbar"><div class="utility-toolbar-copy"><strong>'+list.length+' 个角色</strong><span>角色设定与外观描述</span></div><button class="utility-primary" id="character-add" aria-expanded="false"><svg><use href="#icon-plus"/></svg>添加角色</button></div><form class="library-form" id="character-form" hidden><input id="character-name" placeholder="角色名称" required><input id="character-desc" placeholder="外观与身份" required><input id="character-traits" placeholder="性格与表演特征"><button>保存角色</button></form><div class="library-grid">'+list.map((item,index)=>libraryCard({...item,desc:item.desc+(item.traits?' · '+item.traits:'')},index,'character','',!item.builtin)).join('')+'</div>';
    bindLibraryAdd('character-add','character-form','character-name');
    document.getElementById('character-form').addEventListener('submit',ev=>{ev.preventDefault();const name=document.getElementById('character-name').value.trim(),desc=document.getElementById('character-desc').value.trim(),traits=document.getElementById('character-traits').value.trim();if(!name||!desc)return;const custom=readList(CHARACTER_LIBRARY_KEY);custom.push({id:Date.now(),name,desc,traits});writeList(CHARACTER_LIBRARY_KEY,custom);renderCharacters();if(panelMode==='assets')renderAssetPanel()});
    utilityContent.querySelectorAll('[data-character]').forEach(button=>button.addEventListener('click',()=>{const item=list[+button.dataset.character];addNode('text',{name:'角色 · '+item.name,input:'角色设定：'+item.name+'\n'+item.desc+(item.traits?'\n表演特征：'+item.traits:'')});closeUtility()}));
    utilityContent.querySelectorAll('[data-delete-character]').forEach(button=>button.addEventListener('click',ev=>{ev.stopPropagation();writeList(CHARACTER_LIBRARY_KEY,readList(CHARACTER_LIBRARY_KEY).filter(item=>String(item.id)!==button.dataset.deleteCharacter));renderCharacters();if(panelMode==='assets')renderAssetPanel()}))
  }
  function defaultDirectorState(n){
    return{view:'director',ratio:n.config?.ratio||'16:9',objects:[
      {id:'camera-1',type:'camera',name:'机位 1',x:-2,y:1.6,z:3.6,rx:-8,ry:12,rz:0,scale:1,color:'#4c9aff',hidden:false,locked:false},
      {id:'character-1',type:'character',name:'角色 A',x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:1,color:'#d7d7d7',hidden:false,locked:false}
    ]}
  }
  function directorState(n){
    const source=n.config?.directorState,valid=source&&Array.isArray(source.objects);const state=valid?source:defaultDirectorState(n);n.config={...n.config,directorState:state};return state
  }
  function directorObjectIcon(type){return type==='camera'?'icon-nt-video':type==='light'?'icon-bolt':'icon-people'}
  function renderDirectorList(){
    const n=getNode(directorNodeId);if(!n)return;const state=directorState(n),list=document.getElementById('director-scene-list');
    list.innerHTML=state.objects.map(object=>'<div class="director-object'+(object.id===directorSelectedObjectId?' active':'')+'" data-director-object="'+esc(object.id)+'"><svg><use href="#'+directorObjectIcon(object.type)+'"/></svg><span>'+esc(object.name)+'</span><span class="director-object-actions"><button data-director-visible="'+esc(object.id)+'" class="'+(object.hidden?'on':'')+'" aria-label="'+(object.hidden?'显示':'隐藏')+'"><svg width="13" height="13"><use href="#icon-eye-off"/></svg></button><button data-director-lock="'+esc(object.id)+'" class="'+(object.locked?'on':'')+'" aria-label="'+(object.locked?'解锁':'锁定')+'"><svg width="13" height="13"><use href="#icon-magnet"/></svg></button></span></div>').join('');
    list.querySelectorAll('[data-director-object]').forEach(button=>button.addEventListener('click',ev=>{if(ev.target.closest('[data-director-visible],[data-director-lock]'))return;directorSelectedObjectId=button.dataset.directorObject;renderDirectorList();renderDirectorInspector();drawDirectorStage()}));
    list.querySelectorAll('[data-director-visible]').forEach(button=>button.addEventListener('click',ev=>{ev.stopPropagation();const object=state.objects.find(item=>item.id===button.dataset.directorVisible);if(!object)return;object.hidden=!object.hidden;renderDirectorList();drawDirectorStage();scheduleSave()}));
    list.querySelectorAll('[data-director-lock]').forEach(button=>button.addEventListener('click',ev=>{ev.stopPropagation();const object=state.objects.find(item=>item.id===button.dataset.directorLock);if(!object)return;object.locked=!object.locked;renderDirectorList();renderDirectorInspector();scheduleSave()}))
  }
  function renderDirectorInspector(){
    const n=getNode(directorNodeId),host=document.getElementById('director-inspector-content');if(!n||!host)return;const state=directorState(n),object=state.objects.find(item=>item.id===directorSelectedObjectId),typeLabel={camera:'机位',character:'角色',light:'灯光'};
    document.getElementById('director-selection-type').textContent=object?typeLabel[object.type]||object.type:'未选择';
    if(!object){host.innerHTML='<div class="director-inspector-section" style="color:#777;font-size:12px">从左侧场景列表选择一个元素</div>';return}
    const vector=(label,prefix,values)=>'<div class="director-vector"><span>'+label+'</span>'+['x','y','z'].map((axis,index)=>'<label><span>'+axis.toUpperCase()+'</span><input type="number" step="0.1" data-director-prop="'+prefix+axis+'" value="'+esc(values[index])+'"'+(object.locked?' disabled':'')+'></label>').join('')+'</div>';
    host.innerHTML='<div class="director-inspector-section"><h3>名称</h3><input class="director-name-input" data-director-prop="name" value="'+esc(object.name)+'"'+(object.locked?' disabled':'')+'></div><div class="director-inspector-section"><h3>变换</h3>'+vector('位置','',[object.x,object.y,object.z])+vector('旋转','r',[object.rx,object.ry,object.rz])+'<div class="director-vector"><span>缩放</span><label style="grid-column:2/-1"><span>S</span><input type="number" min="0.2" max="4" step="0.1" data-director-prop="scale" value="'+esc(object.scale)+'"'+(object.locked?' disabled':'')+'></label></div><label class="director-color-row"><span>颜色</span><input type="color" data-director-prop="color" value="'+esc(object.color)+'"'+(object.locked?' disabled':'')+'></label></div>';
    host.querySelectorAll('[data-director-prop]').forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.directorProp;object[key]=key==='name'||key==='color'?input.value:+input.value;if(key==='name')renderDirectorList();drawDirectorStage();scheduleSave()}))
  }
  function directorProject(object,width,height,state){
    const cameraView=state.view==='camera',scale=Math.min(width/780,height/540)*(cameraView?105:82),centerX=width/2+(cameraView?object.z*3:0),baseY=height*.66;return{x:centerX+object.x*scale,y:baseY-object.y*scale-object.z*scale*.38}
  }
  function drawDirectorStage(){
    const n=getNode(directorNodeId),canvas=document.getElementById('director-stage-canvas');if(!n||!canvas||!body.classList.contains('director-open'))return;const state=directorState(n),rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle='#111';ctx.fillRect(0,0,width,height);
    const horizon=height*.38;ctx.strokeStyle='#242424';ctx.lineWidth=1;for(let i=-10;i<=10;i++){ctx.beginPath();ctx.moveTo(width/2+i*38,horizon);ctx.lineTo(width/2+i*105,height);ctx.stroke()}for(let i=0;i<11;i++){const t=i/10,y=horizon+(height-horizon)*t*t;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke()}
    ctx.strokeStyle='#303030';ctx.beginPath();ctx.moveTo(0,horizon);ctx.lineTo(width,horizon);ctx.stroke();directorHitMap=[];
    state.objects.filter(object=>!object.hidden).forEach(object=>{const point=directorProject(object,width,height,state),selected=object.id===directorSelectedObjectId,size=24*object.scale;directorHitMap.push({id:object.id,x:point.x,y:point.y,r:Math.max(22,size)});ctx.save();ctx.translate(point.x,point.y);ctx.strokeStyle=selected?'#fff':object.color;ctx.fillStyle=object.color;ctx.lineWidth=selected?2.5:1.6;ctx.globalAlpha=object.locked?.55:1;
      if(object.type==='character'){ctx.beginPath();ctx.arc(0,-size*1.15,size*.32,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(0,-size*.82);ctx.lineTo(0,size*.55);ctx.moveTo(-size*.48,-size*.25);ctx.lineTo(size*.48,-size*.25);ctx.moveTo(0,size*.52);ctx.lineTo(-size*.4,size*1.25);ctx.moveTo(0,size*.52);ctx.lineTo(size*.4,size*1.25);ctx.stroke()}
      else if(object.type==='camera'){ctx.strokeRect(-size*.65,-size*.42,size*1.15,size*.84);ctx.beginPath();ctx.moveTo(size*.5,-size*.25);ctx.lineTo(size*.95,-size*.48);ctx.lineTo(size*.95,size*.48);ctx.lineTo(size*.5,size*.25);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.moveTo(0,size*.42);ctx.lineTo(-size*.35,size*1.05);ctx.moveTo(0,size*.42);ctx.lineTo(size*.35,size*1.05);ctx.stroke()}
      else{ctx.beginPath();ctx.arc(0,-size*.2,size*.42,0,Math.PI*2);ctx.fill();for(let i=0;i<8;i++){const angle=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(angle)*size*.62,-size*.2+Math.sin(angle)*size*.62);ctx.lineTo(Math.cos(angle)*size,-size*.2+Math.sin(angle)*size);ctx.stroke()}}
      ctx.globalAlpha=1;ctx.fillStyle=selected?'#fff':'#aaa';ctx.font='11px '+getComputedStyle(body).fontFamily;ctx.textAlign='center';ctx.fillText(object.name,0,size*1.65);ctx.restore()
    });
    document.getElementById('director-stage-label').textContent=(state.view==='camera'?'机位视角':'导演视角')+' · '+state.ratio+' · 拖动对象调整位置'
  }
  function addDirectorObject(type){
    const n=getNode(directorNodeId);if(!n)return;const state=directorState(n),count=state.objects.filter(item=>item.type===type).length+1,names={camera:'机位',character:'角色',light:'灯光'},colors={camera:'#4c9aff',character:'#d7d7d7',light:'#f0c45a'},id=type+'-'+Date.now();state.objects.push({id,type,name:names[type]+' '+count,x:(count-1)*1.2,y:type==='camera'?1.5:type==='light'?2.4:0,z:type==='camera'?3.5:0,rx:0,ry:0,rz:0,scale:1,color:colors[type],hidden:false,locked:false});directorSelectedObjectId=id;renderDirectorList();renderDirectorInspector();drawDirectorStage();scheduleSave()
  }
  function openDirector(n){
    closeAll();closeUtility();directorNodeId=n.id;const state=directorState(n);directorSelectedObjectId=state.objects[0]?.id||null;body.classList.add('director-open');document.getElementById('director-overlay').setAttribute('aria-hidden','false');document.getElementById('director-ratio').querySelector('span').textContent=state.ratio;document.querySelectorAll('[data-director-view]').forEach(button=>button.classList.toggle('active',button.dataset.directorView===state.view));renderDirectorList();renderDirectorInspector();requestAnimationFrame(drawDirectorStage)
  }
  function closeDirector(){
    if(!body.classList.contains('director-open'))return;body.classList.remove('director-open');document.getElementById('director-overlay').setAttribute('aria-hidden','true');directorNodeId=null;directorSelectedObjectId=null;directorDrag=null;renderAllNodes();scheduleSave()
  }
  function generateDirectorScript(n=getNode(directorNodeId)){
    if(!n)return;const cfg={scene:'',style:'电影感写实',shots:6,...n.config},state=directorState(n),scene=(cfg.scene||n.input||'围绕当前场景元素设计连续剧情').trim(),shots=Math.max(2,Math.min(24,+cfg.shots||6)),objects=state.objects.filter(object=>!object.hidden).map(object=>object.name+'（'+object.type+'，位置 '+object.x+','+object.y+','+object.z+'）').join('、');n.input=scene;
    const script=addNode('text',{name:'分镜文本',x:n.x+n.w+80,y:n.y,input:'请将以下场景设计为 '+shots+' 个连续镜头的分镜脚本。\n剧情：'+scene+'\n视觉风格：'+cfg.style+'\n画面比例：'+state.ratio+'\n场景元素：'+objects+'\n每个镜头包含景别、机位、运镜、画面、角色动作、时长和声音。'});
    if(script&&!edges.some(edge=>edge.from===n.id&&edge.to===script.id))edges.push({id:'edge-'+Date.now()+'-director',from:n.id,fromSide:'right',to:script.id,toSide:'left'});expandedNodeId=script?.id||null;closeDirector();renderAllNodes();updatePanel();scheduleSave();if(script)settleExpandedNode(script.id)
  }
  const directorCanvas=document.getElementById('director-stage-canvas');
  directorCanvas.addEventListener('pointerdown',ev=>{const n=getNode(directorNodeId);if(!n)return;const rect=directorCanvas.getBoundingClientRect(),x=ev.clientX-rect.left,y=ev.clientY-rect.top,hit=[...directorHitMap].reverse().find(item=>Math.hypot(x-item.x,y-item.y)<=item.r),state=directorState(n),object=hit&&state.objects.find(item=>item.id===hit.id);if(!object)return;directorSelectedObjectId=object.id;renderDirectorList();renderDirectorInspector();drawDirectorStage();if(object.locked)return;directorDrag={pointerId:ev.pointerId,startX:ev.clientX,startY:ev.clientY,x:object.x,z:object.z};directorCanvas.setPointerCapture(ev.pointerId)});
  directorCanvas.addEventListener('pointermove',ev=>{if(!directorDrag||ev.pointerId!==directorDrag.pointerId)return;const n=getNode(directorNodeId),object=directorState(n).objects.find(item=>item.id===directorSelectedObjectId);if(!object)return;const rect=directorCanvas.getBoundingClientRect(),unit=Math.min(rect.width/780,rect.height/540)*(directorState(n).view==='camera'?105:82);object.x=+(directorDrag.x+(ev.clientX-directorDrag.startX)/unit).toFixed(2);object.z=+(directorDrag.z-(ev.clientY-directorDrag.startY)/(unit*.38)).toFixed(2);renderDirectorInspector();drawDirectorStage()});
  const finishDirectorDrag=ev=>{if(!directorDrag||ev.pointerId!==directorDrag.pointerId)return;if(directorCanvas.hasPointerCapture(ev.pointerId))directorCanvas.releasePointerCapture(ev.pointerId);directorDrag=null;scheduleSave()};directorCanvas.addEventListener('pointerup',finishDirectorDrag);directorCanvas.addEventListener('pointercancel',finishDirectorDrag);
  document.getElementById('director-close').addEventListener('click',closeDirector);document.getElementById('director-save').addEventListener('click',()=>{saveWorkflow();showToast('场景已保存')});document.getElementById('director-build-script').addEventListener('click',()=>generateDirectorScript());
  document.querySelectorAll('[data-director-view]').forEach(button=>button.addEventListener('click',()=>{const n=getNode(directorNodeId);if(!n)return;directorState(n).view=button.dataset.directorView;document.querySelectorAll('[data-director-view]').forEach(item=>item.classList.toggle('active',item===button));drawDirectorStage();scheduleSave()}));
  document.querySelectorAll('[data-director-add]').forEach(button=>button.addEventListener('click',()=>addDirectorObject(button.dataset.directorAdd)));document.getElementById('director-add-menu').addEventListener('click',()=>addDirectorObject('character'));
  document.getElementById('director-ratio').addEventListener('click',ev=>{const n=getNode(directorNodeId);if(!n)return;const ratios=['16:9','9:16','1:1'],state=directorState(n),index=(ratios.indexOf(state.ratio)+1)%ratios.length;state.ratio=ratios[index];ev.currentTarget.querySelector('span').textContent=state.ratio;drawDirectorStage();scheduleSave()});
  document.getElementById('director-snapshot').addEventListener('click',()=>{const n=getNode(directorNodeId);if(!n)return;drawDirectorStage();n.output={type:'image',url:directorCanvas.toDataURL('image/png'),name:'导演台场景截图'};n.status='success';n.message='场景截图已输出';n.progress=100;addHistory(n);scheduleSave();showToast('截图已输出到导演台节点')});
  document.getElementById('director-reset').addEventListener('click',()=>{const n=getNode(directorNodeId);if(!n)return;n.config={...n.config,directorState:defaultDirectorState(n)};directorSelectedObjectId='camera-1';renderDirectorList();renderDirectorInspector();drawDirectorStage();scheduleSave()});
  document.getElementById('utility-close').addEventListener('click',closeUtility);
  ['toolbox','materials','characters','history'].forEach(mode=>{const trigger=document.getElementById('btn-'+mode);trigger.addEventListener('click',ev=>{ev.stopPropagation();utilityDrawer.classList.contains('open')&&utilityMode===mode?closeUtility():openUtility(mode)});trigger.addEventListener('mouseenter',clearFloatingClose);trigger.addEventListener('mouseleave',()=>scheduleFloatingClose(()=>{if(!utilityDrawer.matches(':hover')&&!trigger.matches(':hover'))closeUtility()}))});
  utilityDrawer.addEventListener('mouseenter',clearFloatingClose);utilityDrawer.addEventListener('mouseleave',()=>scheduleFloatingClose(()=>{const trigger=document.getElementById('btn-'+utilityMode);if(!utilityDrawer.matches(':hover')&&!trigger?.matches(':hover'))closeUtility()}));

  function renderStoryboard(){
    const ordered=[];try{workflowLayers().flat().forEach(id=>{const n=getNode(id);if(n)ordered.push(n)})}catch(e){ordered.push(...nodes)}
    const items=ordered.filter(n=>['text','script','image','video'].includes(n.type));document.getElementById('storyboard-grid').innerHTML=items.length?items.map((n,index)=>{let media='<svg width="42" height="42"><use href="#'+(icons[n.type]||'icon-grid')+'"/></svg>';if(n.output?.url&&n.output.type==='image')media='<img src="'+esc(n.output.url)+'" alt="'+esc(n.name)+'">';if(n.output?.url&&n.output.type==='video')media='<video src="'+esc(n.output.url)+'" muted preload="metadata"></video>';return'<div class="story-card"><div class="story-media">'+media+'</div><div class="story-meta"><strong>'+(index+1)+'. '+esc(n.name)+'</strong><span>'+esc(n.input||n.message||'待生成')+'</span></div></div>'}).join(''):'<div class="empty-workspace">工作流中还没有可展示的分镜节点</div>'
  }
  document.getElementById('storyboard-refresh').addEventListener('click',renderStoryboard);

  function renderHistory(){
    const history=getHistory();nodeCount.textContent='共 '+history.length+' 条记录';
    document.querySelector('#panel-header-left .label').textContent='生成历史';document.getElementById('panel-sort').hidden=true;document.getElementById('panel-filter').hidden=true;panelContent.innerHTML=history.length?history.map(item=>'<div class="history-item"><div style="font-size:12px;color:var(--text-2)">'+esc(item.type||'媒体')+' · '+esc(item.model||'本地')+'</div><div style="font-size:11px;color:var(--text-4);margin-top:4px">'+esc(new Date(item.createdAt).toLocaleString())+'</div><a style="display:inline-block;margin-top:6px;font-size:11px;color:var(--teal)" href="'+esc(item.url)+'" target="_blank" rel="noreferrer">打开结果</a></div>').join(''):'<div class="empty-state">暂无生成记录</div>'
  }
  function renderHistoryUtility(){
    utilityTitle.textContent='历史记录';const history=getHistory();utilityContent.innerHTML='<div class="utility-toolbar"><div class="utility-toolbar-copy"><strong>'+history.length+' 条生成记录</strong><span>最近生成的媒体结果</span></div></div><div class="library-grid">'+(history.length?history.map((item,index)=>libraryCard({name:(item.type||'媒体')+' · '+(item.model||'本地'),desc:new Date(item.createdAt).toLocaleString()},index,'history',item.type==='video'?'icon-nt-video':item.type==='audio'?'icon-nt-audio':'icon-nt-image',false)).join(''):'<div class="library-empty">暂无生成记录</div>')+'</div>';utilityContent.querySelectorAll('[data-history]').forEach(button=>button.addEventListener('click',()=>{const item=history[+button.dataset.history],type=['image','video','audio'].includes(item.type)?item.type:'image';addNode(type,{output:{type,url:item.url},status:'success',message:'已从历史记录载入',progress:100});closeUtility()}))
  }
  function renderAssetPanel(){
    const tools=getToolTemplates(),materials=getMaterials(),characters=getCharacters(),recent=getHistory().filter(item=>!panelQuery||String(item.model||item.type||'').toLowerCase().includes(panelQuery.toLowerCase())).slice(0,12);
    nodeCount.textContent='共 '+(tools.length+materials.length+characters.length)+' 项资产';document.querySelector('#panel-header-left .label').textContent='资产管理';document.getElementById('panel-sort').hidden=true;document.getElementById('panel-filter').hidden=true;panelSearchInput.placeholder='搜索生成记录';
    panelContent.innerHTML='<div class="asset-panel-head"><strong>我的资产</strong><span>本地保存</span></div><div class="asset-stat-grid"><div class="asset-stat"><strong>'+tools.length+'</strong><span>模板</span></div><div class="asset-stat"><strong>'+materials.length+'</strong><span>素材</span></div><div class="asset-stat"><strong>'+characters.length+'</strong><span>角色</span></div></div><div class="asset-shortcuts"><button class="asset-shortcut" data-open-library="toolbox"><svg><use href="#icon-toolbox"/></svg><span>工具箱</span><small>'+tools.length+'</small></button><button class="asset-shortcut" data-open-library="materials"><svg><use href="#icon-nt-material"/></svg><span>素材库</span><small>'+materials.length+'</small></button><button class="asset-shortcut" data-open-library="characters"><svg><use href="#icon-people"/></svg><span>角色库</span><small>'+characters.length+'</small></button></div><div class="asset-panel-head"><strong>最近生成</strong><span>'+recent.length+' 条</span></div>'+(recent.length?recent.map(item=>'<a class="asset-recent-row" href="'+esc(item.url)+'" target="_blank" rel="noreferrer"><strong>'+esc(item.type||'媒体')+' · '+esc(item.model||'本地')+'</strong><span>'+esc(new Date(item.createdAt).toLocaleString())+'</span></a>').join(''):'<div class="empty-state">暂无生成记录</div>');
    panelContent.querySelectorAll('[data-open-library]').forEach(button=>button.addEventListener('click',()=>openUtility(button.dataset.openLibrary)))
  }
  function showHistory(){
    panelMode='history';openPanel();document.querySelectorAll('#panel-tabs .tab-btn').forEach(x=>x.classList.toggle('active',x.dataset.ptab==='assets'));renderHistory()
  }
  function updatePanel(){
    if(panelMode==='history'){renderHistory();return}
    if(panelMode==='assets'){renderAssetPanel();return}
    document.querySelector('#panel-header-left .label').textContent='主题列表';document.getElementById('panel-sort').hidden=false;document.getElementById('panel-filter').hidden=false;panelSearchInput.placeholder='搜索主题';
    nodeCount.textContent='共 '+visibleTopicCount()+' 个主题';
    const list=nodes.filter(n=>{if(hiddenTopicIds.has(n.id))return false;const kind=n.config?.kind||'leaf';return (panelTypeFilter==='all'||kind===panelTypeFilter)&&(!panelQuery||(n.input||n.name||'').toLowerCase().includes(panelQuery.toLowerCase()))}).sort((a,b)=>panelSortAsc?(a.input||a.name||'').localeCompare(b.input||b.name||'','zh-CN'):(b.input||b.name||'').localeCompare(a.input||a.name||'','zh-CN'));
    panelContent.innerHTML=list.length?list.map(n=>'<button class="panel-node-row" data-panel-node="'+n.id+'"><strong>'+esc(n.input||n.name||'主题')+'</strong><span>'+esc(kindLabel(n.config?.kind||'leaf'))+'</span></button>').join(''):'<div class="empty-state">'+(nodes.length?'没有匹配的主题':'画布暂无主题')+'</div>';
    panelContent.querySelectorAll('[data-panel-node]').forEach(btn=>btn.addEventListener('click',()=>selectNode(+btn.dataset.panelNode)))
  }
  document.getElementById('panel-sort').addEventListener('click',()=>{panelSortAsc=!panelSortAsc;document.getElementById('panel-sort').classList.toggle('on',!panelSortAsc);updatePanel()});
  document.getElementById('panel-filter').addEventListener('click',()=>{const filters=[['all','全部'],['root','中心主题'],['branch','分支主题'],['leaf','子主题']];let index=filters.findIndex(item=>item[0]===panelTypeFilter);index=(index+1)%filters.length;panelTypeFilter=filters[index][0];document.querySelector('#panel-filter span').textContent=filters[index][1];updatePanel()});
  const panelSearchInput=document.getElementById('panel-search-input');
  document.getElementById('panel-search').addEventListener('click',()=>{panelSearchInput.hidden=false;panelSearchInput.focus()});
  panelSearchInput.addEventListener('input',()=>{panelQuery=panelSearchInput.value.trim();updatePanel()});panelSearchInput.addEventListener('keydown',ev=>{if(ev.key==='Escape'){panelSearchInput.value='';panelQuery='';panelSearchInput.hidden=true;updatePanel()}});panelSearchInput.addEventListener('blur',()=>{if(!panelSearchInput.value)panelSearchInput.hidden=true});
  document.getElementById('panel-view-toggle').addEventListener('click',()=>{panelCompact=!panelCompact;panelContent.classList.toggle('compact',panelCompact);document.getElementById('panel-view-toggle').classList.toggle('on',panelCompact)});

  // Shortcuts panel
  function buildShortcutsPanel(){
    const grid=document.getElementById('sc-grid');
    const cols=[
      {title:'主题',items:[['添加子主题（编辑中）','Enter'],['缩进为子主题（编辑中）','Tab'],['提升层级（编辑中）','Shift + Tab'],['自动布局','Ctrl + Enter'],['打开节点菜单','Tab'],['删除选中主题','Delete']]},
      {title:'缩放',items:[['放大','Ctrl + ＋'],['缩小','Ctrl + －'],['适应画布','Ctrl + 0'],['触控板','<svg class="sc-icon"><use href="#icon-move"/></svg> 双指缩放'],['鼠标','Ctrl + 滚轮']]},
      {title:'移动画布',items:[['键盘','Space + 拖动'],['触控板','双指拖动'],['鼠标','中键拖动'],['移动','V'],['抓手工具','H'],['自动布局','Alt + Shift + F']]},
      {title:'其他',items:[['取消操作','Escape'],['选择工具','V'],['抓手工具','H']]}
    ];
    grid.innerHTML=cols.map(c=>{const itemsHtml=c.items.map(([n,k])=>{const keysHtml=k.split(' + ').map((p,i,a)=>{const kbd=(p.includes('<svg')?p:'<kbd>'+p+'</kbd>');const plus=i<a.length-1?'<span class="sc-plus">+</span>':'';return kbd+plus}).join('');return '<div class="sc-row"><span class="sc-name">'+n+'</span><span class="sc-keys">'+keysHtml+'</span></div>'}).join('');return '<div class="sc-col"><h4>'+c.title+'</h4>'+itemsHtml+'</div>'}).join('');
  }
  const shortcutsBtn=document.getElementById('btn-shortcuts'),shortcutsPanel=document.getElementById('shortcuts-panel');
  shortcutsBtn.addEventListener('click',ev=>{ev.stopPropagation();closeUtility();closeAll();buildShortcutsPanel();toggleP('shortcuts');if(popupState.shortcuts)requestAnimationFrame(()=>placeAbove(shortcutsPanel,shortcutsBtn.getBoundingClientRect(),12))});
  document.getElementById('sc-close').addEventListener('click',()=>{toggleP('shortcuts',false)});
  bindHoverDismiss(shortcutsBtn,shortcutsPanel,()=>toggleP('shortcuts',false));
  bindHoverDismiss(btnAddNode,document.getElementById('node-menu'),()=>{toggleP('node',false);document.getElementById('material-sub').style.display='none';document.getElementById('script-sub').style.display='none'},[document.getElementById('material-sub'),document.getElementById('script-sub')]);
  bindHoverDismiss(document.getElementById('btn-move-tool'),document.getElementById('move-menu'),()=>toggleP('move',false));
  bindHoverDismiss(document.getElementById('btn-zoom'),document.getElementById('zoom-popup'),()=>toggleP('zoom',false));

  // Keyboard
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'){if(textEditorModal.classList.contains('open')){closeTextEditorModal();return}if(textReplaceModal.classList.contains('open')){closeTextReplaceModal();return}if(body.classList.contains('director-open')){closeDirector();return}if(connecting)cancelConnection();closeAll();closeUtility();return}
    const ctrl=ev.metaKey||ev.ctrlKey;
    const editing=document.activeElement===projectNameInput||isEditableTarget(document.activeElement);
    if(editing&&!(ctrl&&ev.key==='Enter'))return;
    if(ev.code==='Space'){spaceHeld=true;body.classList.add('tool-hand');ev.preventDefault();return}
    if(ctrl&&ev.key==='='){ev.preventDefault();setZoom(zoomLevel+10);return}
    if(ctrl&&ev.key==='-'){ev.preventDefault();setZoom(zoomLevel-10);return}
    if(ctrl&&ev.key==='0'){ev.preventDefault();fitView();return}
    if(ev.altKey&&ev.shiftKey&&ev.key==='F'){ev.preventDefault();arrangeNodes();return}
    if(ctrl&&ev.key.toLowerCase()==='z'){ev.preventDefault();if(ev.shiftKey)redoGraph();else undoGraph();return}
    if(ctrl&&ev.key.toLowerCase()==='y'){ev.preventDefault();redoGraph();return}
    if(ev.key==='v'||ev.key==='V'){setTool('move');if(popupState.move)toggleP('move',false);return}
    if(ev.key==='h'||ev.key==='H'){setTool('hand');if(popupState.move)toggleP('move',false);return}
    if(ev.key==='Enter'&&selectedNodeId&&!(ev.ctrlKey||ev.metaKey)){ev.preventDefault();openTextEditorModal(getNode(selectedNodeId),false);return}
    if(ev.key==='Tab'){ev.preventDefault();if(selectedNodeId){if(ev.shiftKey)promoteTopic(getNode(selectedNodeId));else createChildTopic(getNode(selectedNodeId))}else btnAddNode.click();return}
    if(ctrl&&ev.key==='Enter'){ev.preventDefault();arrangeNodes();return}
    if(ev.key==='Delete'||ev.key==='Backspace'){
      if(selectedEdge){rememberGraph();edges=edges.filter(e=>String(e.id)!==String(selectedEdge));selectedEdge=null;renderEdges();scheduleSave();return}
      if(selectedNodeId){rememberGraph();edges=edges.filter(e=>e.from!==selectedNodeId&&e.to!==selectedNodeId);nodes=nodes.filter(n=>n.id!==selectedNodeId);selectedNodeId=null;expandedNodeId=null;refreshHiddenTopics();renderAllNodes();updatePanel();scheduleSave();if(visibleTopicCount()===0)body.classList.remove('has-nodes');return}
    }
  });
  document.addEventListener('keyup',ev=>{if(ev.code==='Space'){spaceHeld=false;if(currentTool!=='hand')body.classList.remove('tool-hand')}});
  window.addEventListener('blur',()=>{spaceHeld=false;if(connecting)cancelConnection();if(currentTool!=='hand')body.classList.remove('tool-hand')});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&connecting)cancelConnection()});
  window.addEventListener('resize',()=>{applyViewTransform();queueEdges();if(expandedNodeId!==null)settleExpandedNode(expandedNodeId);if(minimapOn)placeAbove(minimap,minimapButton.getBoundingClientRect(),12);if(body.classList.contains('director-open'))drawDirectorStage();const compact=window.matchMedia('(max-width:720px)').matches;if(compact!==compactViewport){compactViewport=compact;clearTimeout(viewportResizeTimer);viewportResizeTimer=setTimeout(fitCanvasForViewport,120)}});
  viewport.addEventListener('pointerdown',ev=>{if(ev.button===0&&!spaceHeld&&currentTool==='move'&&!ev.target.closest('.node-group')){selectedNodeId=null;expandedNodeId=null;selectedEdge=null;nodesLayer.querySelectorAll('.node-group').forEach(el=>el.classList.remove('selected','expanded'));renderEdges()}});
  let marquee=null;const marqueeBox=document.getElementById('marquee-box');
  viewport.addEventListener('pointerdown',ev=>{
    if(ev.button!==0||spaceHeld||currentTool!=='move'||isInteractiveTarget(ev.target)||ev.target.closest('.node-group'))return;
    const p=screenToWorld(ev.clientX,ev.clientY);marquee={pid:ev.pointerId,sx:p.x,sy:p.y,moved:false};
    try{viewport.setPointerCapture(ev.pointerId)}catch(e){}
  });
  viewport.addEventListener('pointermove',ev=>{
    if(!marquee||ev.pointerId!==marquee.pid)return;
    const p=screenToWorld(ev.clientX,ev.clientY);
    if(!marquee.moved&&Math.hypot(p.x-marquee.sx,p.y-marquee.sy)>4)marquee.moved=true;
    if(!marquee.moved)return;
    const x=Math.min(marquee.sx,p.x),y=Math.min(marquee.sy,p.y),w=Math.abs(p.x-marquee.sx),h=Math.abs(p.y-marquee.sy);
    marquee.x=x;marquee.y=y;marquee.w=w;marquee.h=h;
    marqueeBox.hidden=false;marqueeBox.style.left=x+'px';marqueeBox.style.top=y+'px';marqueeBox.style.width=w+'px';marqueeBox.style.height=h+'px'
  });
  const finishMarquee=ev=>{
    if(!marquee||ev.pointerId!==marquee.pid)return;
    if(viewport.hasPointerCapture(ev.pointerId))viewport.releasePointerCapture(ev.pointerId);
    if(marquee.moved){
      const hit=nodes.filter(n=>n.x<marquee.x+marquee.w&&n.x+n.w>marquee.x&&n.y<marquee.y+marquee.h&&n.y+nodeHeight(n)>marquee.y);
      if(hit.length){selectedNodeId=hit[hit.length-1].id;selectedEdge=null;nodesLayer.querySelectorAll('.node-group').forEach(el=>{const selected=hit.some(n=>+el.dataset.nid===n.id);el.classList.toggle('selected',selected);el.style.zIndex=selected?'100':'1'});renderEdges();updatePanel()}
    }
    marquee=null;marqueeBox.hidden=true
  };
  viewport.addEventListener('pointerup',finishMarquee);
  viewport.addEventListener('pointercancel',finishMarquee);

  // Click away popups
  document.addEventListener('click',ev=>{if(Date.now()<nodeMenuSuppressUntil)return;
    if(!ev.target.closest('#canvas-context-menu'))document.getElementById('canvas-context-menu').style.display='none';
    if(!ev.target.closest('.text-model-control')){nodesLayer.querySelectorAll('.text-model-popover.open').forEach(popover=>popover.classList.remove('open'));nodesLayer.querySelectorAll('.text-model-trigger[aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'))}
    if(!ev.target.closest('.video-model-control')){nodesLayer.querySelectorAll('.video-model-popover.open').forEach(popover=>popover.classList.remove('open'));nodesLayer.querySelectorAll('.video-model-trigger[aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'))}
    if(!ev.target.closest('#settings-menu')&&!ev.target.closest('#btn-settings')){if(popupState.settings)closeP('settings')}
    for(const k of ['project','canvas','zoom','node','move']){const el={project:document.getElementById('project-menu'),canvas:canvasPopover,zoom:document.getElementById('zoom-popup'),node:document.getElementById('node-menu'),move:document.getElementById('move-menu')}[k];const trg={project:document.getElementById('btn-logo'),canvas:canvasTabCollapsed,zoom:document.getElementById('btn-zoom'),node:btnAddNode,move:document.getElementById('btn-move-tool')}[k];if(popupState[k]&&el&&!el.contains(ev.target)&&!trg.contains(ev.target)){toggleP(k,false);if(k==='project')document.getElementById('btn-logo').classList.remove('expanded')}}
  });

  ucLabel();
  setTool('move');
  try{
    const d=JSON.parse(localStorage.getItem('canvas-workflow'));
    if(d&&d.canvases){applyWorkspace(d)}
    else if(d&&d.nodes){
      const known=new Set();
      nodes=d.nodes.filter(n=>n&&Number.isFinite(+n.id)&&!known.has(+n.id)&&(known.add(+n.id),true)).map(n=>({...n,id:+n.id,type:'text',w:120,ports:true,input:typeof n.input==='string'?n.input:'',output:null,status:'idle',config:n.config&&typeof n.config==='object'?n.config:{},_z:1}));
      edges=(Array.isArray(d.edges)?d.edges:[]).filter(edge=>edge&&known.has(+edge.from)&&known.has(+edge.to)&&+edge.from!==+edge.to).map(edge=>({...edge,from:+edge.from,to:+edge.to,fromSide:['left','right','top','bottom'].includes(edge.fromSide)?edge.fromSide:'right',toSide:['left','right','top','bottom'].includes(edge.toSide)?edge.toSide:'left'}));
      nodes.forEach(n=>{const kind=n.config?.kind||(edges.some(e=>e.to===n.id)?'leaf':'root');n.config={...n.config,kind,color:n.config?.color||kindColor(kind),size:n.config?.size||'md'}});
      rebuildNodeCounters();
      refreshHiddenTopics();
      renderAllNodes();updatePanel();if(visibleTopicCount())body.classList.add('has-nodes')
    }
  }catch(e){console.warn('Workflow restore failed',e)}
  if(nodes.length&&window.matchMedia('(max-width:720px)').matches)fitCanvasForViewport();
  applyViewTransform();
  loadPersistentWorkflow();
  setInterval(()=>{if(canvasSettings.autosave&&workflowReady)saveWorkflow()},10000);
  runWorkflowBtn.addEventListener('click',runWorkflow);

  function setNodeState(n,status,message,progress=0){
    n.status=status;n.message=message;n.progress=progress;
    setGenerationOverlay(n,status,progress);
    const group=nodesLayer.querySelector('.node-group[data-nid="'+n.id+'"]');
    if(group){
      const title=group.querySelector('.node-title'),stateName={running:'生成中',success:'已完成',error:'失败'}[status]||'';
      if(title){
        let badge=title.querySelector('.node-state');
        if(stateName){if(!badge){badge=document.createElement('span');title.appendChild(badge)}badge.textContent=stateName;badge.className='node-state '+status}
        else if(badge)badge.remove()
      }
      const statusEl=group.querySelector('.editor-status');
      if(statusEl){statusEl.className='editor-status'+(status==='error'?' error':status==='success'?' success':'');statusEl.textContent=message||''}
      const send=group.querySelector('.ncb-send,.media-editor-send,.text-editor-send');
      if(send)send.disabled=status==='running'
    }
    scheduleSave()
  }
  function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
  function findValue(data,keys,validator){
    const queue=[data],seen=new Set(),wanted=keys.map(k=>k.toLowerCase());
    while(queue.length){
      const current=queue.shift();if(!current||typeof current!=='object'||seen.has(current))continue;seen.add(current);
      for(const[key,value]of Object.entries(current)){
        const normalized=key.toLowerCase().replace(/[^a-z0-9]/g,'');
        if(wanted.some(k=>normalized===k.replace(/[^a-z0-9]/g,''))&&validator(value))return value;
        if(value&&typeof value==='object')queue.push(value)
      }
    }
    return''
  }
  function taskIdFrom(data){const task=findValue(data,['task_id','taskId'],v=>typeof v==='string'||typeof v==='number');if(task)return task;return findValue(data,['request_id','requestId','job_id','jobId','id'],v=>typeof v==='string'||typeof v==='number')}
  function statusFrom(data){return String(findValue(data,['task_status','taskStatus','status','state'],v=>typeof v==='string')||'').toLowerCase()}
  function progressFrom(data){const value=findValue(data,['progress','percent','percentage'],v=>typeof v==='number'||/^\d+$/.test(String(v)));return Math.max(0,Math.min(100,+value||0))}
  function mediaUrlFrom(data,type){
    const typeKeys={image:['image_url','imageUrl'],video:['video_url','videoUrl'],audio:['audio_url','audioUrl']}[type]||[];
    const exact=findValue(data,[...typeKeys,'download_url','downloadUrl','file_url','fileUrl','url'],v=>typeof v==='string'&&/^(https?:|data:|blob:)/.test(v));
    if(exact)return exact;
    const queue=[data],seen=new Set();
    while(queue.length){const current=queue.shift();if(!current||typeof current!=='object'||seen.has(current))continue;seen.add(current);for(const value of Object.values(current)){if(typeof value==='string'&&/^(https?:|data:|blob:)/.test(value)&&new RegExp('\\.('+(type==='video'?'mp4|webm|mov':type==='audio'?'mp3|wav|m4a|ogg':'png|jpe?g|webp')+')(\\?|$)','i').test(value))return value;if(value&&typeof value==='object')queue.push(value)}}
    return''
  }
  function errorMessage(data,fallback){return String(findValue(data,['message','msg','reason','error_message','errorMessage'],v=>typeof v==='string')||fallback)}
  function taskState(status){if(['succeed','succeeded','success','completed','done','finished'].includes(status))return'success';if(['failed','error','cancelled','canceled'].includes(status))return'error';return'running'}
  async function requestJSON(url,options={}){
    const controller=new AbortController(),timeoutMs=clamp(+(localStorage.getItem('api-request-timeout')||60),10,600)*1000,timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const response=await fetch(url,{...options,signal:controller.signal}),text=await response.text();let data={};
      try{data=text?JSON.parse(text):{}}catch(e){data={message:text}}
      if(!response.ok)throw new Error(errorMessage(data,'HTTP '+response.status));return data
    }catch(error){
      if(error?.name==='AbortError')throw new Error('请求超时，请检查网络或增大超时设置');
      throw error
    }finally{clearTimeout(timer)}
  }
  function authHeaders(key,provider,model){
    const headers={'Content-Type':'application/json','X-Provider':provider,'X-Model':model};
    if(key){headers.Authorization='Bearer '+key;headers['X-Target-Api-Key']=key}
    return headers
  }
  function directAuthHeaders(key){const headers={'Content-Type':'application/json'};if(key)headers.Authorization='Bearer '+key;return headers}
  async function providerRequest(provider,url,{method='POST',body,dashscopeAsync=false}={}){
    return requestJSON('/api/provider-request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider,url,method,body,headers:{dashscopeAsync}})})
  }
  function configuredEndpoint(provider){if(provider==='custom')return(localStorage.getItem('endpoint-custom')||'').trim();return''}
  function configuredModel(provider,fallback=''){if(provider==='custom')return(localStorage.getItem('model-custom')||fallback).trim();return fallback}
  function dashscopeBaseUrl(){return(localStorage.getItem('endpoint-dashscope')||'https://dashscope.aliyuncs.com/api/v1').trim().replace(/\/$/,'')}
  function videoSize(ratio,resolution){
    const widths={'480p':854,'720p':1280,'1080p':1920,'4k':3840},aspects={'21:9':21/9,'16:9':16/9,'9:16':9/16,'4:3':4/3,'3:4':3/4,'1:1':1,'auto':16/9};
    const width=widths[resolution]||1280,height=Math.round(width/(aspects[ratio]||16/9));return{width,height}
  }
  function imageSize(ratio,resolution){
    const base={'1k':1024,'2k':2048,'3k':3072,'4k':4096}[String(resolution||'2k').toLowerCase()]||1024,aspects={'21:9':21/9,'16:9':16/9,'9:16':9/16,'4:3':4/3,'3:4':3/4,'3:2':3/2,'2:3':2/3,'1:1':1},aspect=aspects[ratio]||1;
    let width=base,height=base;if(aspect>1)height=Math.round(base/aspect);else if(aspect<1)width=Math.round(base*aspect);
    width=Math.max(512,Math.round(width/8)*8);height=Math.max(512,Math.round(height/8)*8);return width+'x'+height
  }
  function dashscopeImageSize(ratio,resolution){
    const base=Math.min({'1k':1024,'2k':1440,'3k':1440,'4k':1440}[String(resolution||'2k').toLowerCase()]||1024,1440),aspects={'21:9':21/9,'16:9':16/9,'9:16':9/16,'4:3':4/3,'3:4':3/4,'3:2':3/2,'2:3':2/3,'1:1':1},aspect=aspects[ratio]||1;
    let width=base,height=base;if(aspect>1)height=Math.round(base/aspect);else if(aspect<1)width=Math.round(base*aspect);
    width=Math.max(512,Math.min(1440,Math.round(width/8)*8));height=Math.max(512,Math.min(1440,Math.round(height/8)*8));return width+'*'+height
  }
  async function submitDirectVideo(meta,key,request){
    if(request.taskType==='image'&&meta.provider==='siliconflow'){
      const body={model:meta.apiModel,prompt:request.input.prompt,size:imageSize(request.parameters.ratio,request.parameters.resolution)};
      if(request.input.images?.length)body.image=request.input.images[0];
      return providerRequest(meta.provider,'https://api.siliconflow.cn/v1/images/generations',{body})
    }
    if(request.taskType==='image'&&meta.provider==='zhipu'){
      const body={model:meta.apiModel,prompt:request.input.prompt,size:imageSize(request.parameters.ratio,request.parameters.resolution)};
      return providerRequest(meta.provider,'https://open.bigmodel.cn/api/paas/v4/images/generations',{body})
    }
    if(request.taskType==='image'&&meta.provider==='dashscope'){
      const input={prompt:request.input.prompt};if(request.parameters.negativePrompt)input.negative_prompt=request.parameters.negativePrompt;
      const parameters={size:dashscopeImageSize(request.parameters.ratio,request.parameters.resolution),n:Math.max(1,Math.min(4,+request.parameters.count||1))};
      if(request.parameters.seed)parameters.seed=+request.parameters.seed;
      return providerRequest(meta.provider,dashscopeBaseUrl()+'/services/aigc/text2image/image-synthesis',{body:{model:meta.apiModel,input,parameters},dashscopeAsync:true})
    }
    const {width,height}=videoSize(request.parameters.ratio,request.parameters.resolution);
    if(request.taskType==='video'&&meta.provider==='siliconflow'){
      const body={model:meta.apiModel,prompt:request.input.prompt,image_size:width+'x'+height};if(request.input.images[0])body.image=request.input.images[0];
      return providerRequest(meta.provider,'https://api.siliconflow.cn/v1/video/submit',{body})
    }
    if(request.taskType==='video'&&meta.provider==='dashscope'){
      const input={prompt:request.input.prompt};if(request.input.images[0])input.img_url=request.input.images[0];
      return providerRequest(meta.provider,dashscopeBaseUrl()+'/services/aigc/video-generation/video-synthesis',{body:{model:meta.apiModel,input,parameters:{size:width+'*'+height,duration:request.parameters.duration,prompt_extend:true}},dashscopeAsync:true})
    }
    if(request.taskType==='video'&&meta.provider==='zhipu'){
      const body={model:meta.apiModel,prompt:request.input.prompt,quality:request.parameters.resolution==='1080p'?'quality':'speed',with_audio:request.parameters.enableSound,size:request.parameters.ratio};if(request.input.images[0])body.image_url=request.input.images[0];
      return providerRequest(meta.provider,'https://open.bigmodel.cn/api/paas/v4/videos/generations',{body})
    }
    if(request.taskType==='video'&&meta.provider==='minimax'){
      const images=(request.input.images||[]),content=[{type:'text',text:request.input.prompt}];
      if(request.parameters.mode==='first_last'&&images.length>1){content.push({type:'image_url',image_url:images[0],role:'first_frame'},{type:'image_url',image_url:images[1],role:'last_frame'})}
      else if(images[0])content.push({type:'image_url',image_url:images[0],role:'first_frame'});
      const body={model:meta.apiModel,content,duration:Math.max(4,Math.min(15,+request.parameters.duration||5)),ratio:String(request.parameters.ratio||'16:9')};
      if(request.parameters.resolution!=='480p')body.resolution='2K';
      return providerRequest(meta.provider,'https://api.minimaxi.com/v2/video_generation',{body})
    }
    if(request.taskType==='audio'&&meta.provider==='dashscope'){
      const raw=String(request.parameters?.voice||'').trim(),text=request.input.prompt;
      if(/^cosyvoice/i.test(meta.apiModel)){
        const input={text,voice:/^[a-z0-9_-]+$/i.test(raw)?raw:'longxiaochun_v2',format:'mp3',sample_rate:24000};
        const speed=+request.parameters?.speed||1;if(speed>=.5&&speed<=2&&speed!==1)input.rate=speed;
        return providerRequest(meta.provider,dashscopeBaseUrl()+'/services/audio/tts/SpeechSynthesizer',{body:{model:meta.apiModel,input}})
      }
      const input={text,voice:/^[a-z0-9_-]+$/i.test(raw)?raw:'Cherry',language_type:'Chinese'};
      return providerRequest(meta.provider,dashscopeBaseUrl()+'/services/aigc/multimodal-generation/generation',{body:{model:meta.apiModel,input}})
    }
    throw new Error('该 Provider 需要统一代理')
  }
  async function submitProxy(proxy,key,request){return requestJSON(proxy,{method:'POST',headers:authHeaders(key,request.provider,request.model),body:JSON.stringify(request)})}
  async function fetchTaskArtifact(mediaType,meta,taskId,proxy,key){
    if(!proxy)return null;
    const data=await requestJSON(proxy,{method:'POST',headers:authHeaders(key,meta.provider,meta.apiModel),body:JSON.stringify({action:'artifact',taskId,taskType:mediaType,provider:meta.provider,model:meta.apiModel})});
    const url=mediaUrlFrom(data,mediaType);return url?{url,data}:null
  }
  async function pollTask(n,mediaType,meta,taskId,proxy,key){
    for(let attempt=0;attempt<120;attempt++){
      await sleep(attempt===0?1200:(mediaType==='image'?5000:3000));let data;
      if(proxy)data=await requestJSON(proxy,{method:'POST',headers:authHeaders(key,meta.provider,meta.apiModel),body:JSON.stringify({action:'status',taskId,taskType:mediaType,provider:meta.provider,model:meta.apiModel})});
      else if(meta.provider==='siliconflow')data=await providerRequest(meta.provider,'https://api.siliconflow.cn/v1/video/status',{method:'POST',body:{requestId:taskId}});
      else if(meta.provider==='dashscope')data=await providerRequest(meta.provider,dashscopeBaseUrl()+'/tasks/'+encodeURIComponent(taskId),{method:'GET'});
      else if(meta.provider==='zhipu')data=await providerRequest(meta.provider,'https://open.bigmodel.cn/api/paas/v4/async-result/'+encodeURIComponent(taskId),{method:'GET'});
      else if(meta.provider==='minimax'){
        data=await providerRequest(meta.provider,'https://api.minimaxi.com/v2/query/video_generation/'+encodeURIComponent(taskId),{method:'GET'});
        if(data&&typeof data==='object'&&data.task&&typeof data.task==='object'){data={status:data.task.status,results:data.task.content||null,task_id:data.task.id,base_resp:data.base_resp,raw:data}}
      }
      else throw new Error('该 Provider 缺少状态查询代理');
      const status=statusFrom(data),state=taskState(status),progress=progressFrom(data)||Math.min(95,10+attempt*2),url=mediaUrlFrom(data,mediaType);
      if(url&&(state==='success'||!status))return{url,data};
      if(state==='error')throw new Error(errorMessage(data,'生成任务失败'));
      if(state==='success'){
        if(!proxy&&meta.provider==='minimax'){
          const fileId=findValue(data,['file_id','fileId'],value=>typeof value==='string'&&value);
          if(fileId){const file=await providerRequest(meta.provider,'https://api.minimaxi.com/v1/files/retrieve?file_id='+encodeURIComponent(fileId),{method:'GET'}),downloadUrl=mediaUrlFrom(file,mediaType);if(downloadUrl)return{url:downloadUrl,data:{task:data,file}}}
        }
        const artifact=await fetchTaskArtifact(mediaType,meta,taskId,proxy,key);
        if(artifact)return artifact;
        throw new Error('任务已完成，但产物接口没有返回媒体地址')
      }
      setNodeState(n,'running','生成中 '+progress+'%',progress)
    }
    throw new Error('生成任务超时')
  }
  function completeMediaNode(n,type,url,data){setGenerationOverlay(n,'success',100);const modelId=nodeQuotaModel(n);if(modelId)recordQuotaUse(modelId);n.output={type,url,raw:data};n.taskId='';n.status='success';n.message='生成完成';n.progress=100;addHistory(n);renderAllNodes();updatePanel();scheduleSave();return true}
  async function executeMediaRequest(n,type,meta,request){
    const proxy=(localStorage.getItem('apikey-proxy')||'').trim()||configuredEndpoint(meta.provider),key=activeApiKey(meta.provider);
    if(!proxy&&!meta.direct)throw new Error('该模型需要配置接口地址或统一代理');
    if(!proxy&&!key)throw new Error('请先在设置中填写 '+meta.provider+' API Key');
    if(proxy&&['ark','custom'].includes(meta.provider)&&!meta.apiModel)throw new Error('请先在设置中填写模型名或接入点 ID');
    setNodeState(n,'running','正在提交任务...',5);
    let data;
    try{data=proxy?await submitProxy(proxy,key,request):await submitDirectVideo(meta,key,request)}catch(error){if(!proxy&&/Failed to fetch|NetworkError/i.test(error.message))throw new Error('模型服务连接失败，请检查网络或设置中的 API Key');throw error}
    const immediate=mediaUrlFrom(data,type);if(immediate)return completeMediaNode(n,type,immediate,data);
    const taskId=taskIdFrom(data);if(!taskId)throw new Error(errorMessage(data,'接口未返回 taskId 或媒体地址'));
    n.taskId=String(taskId);setNodeState(n,'running','任务已提交，等待生成...',10);
    const result=await pollTask(n,type,meta,String(taskId),proxy,key);return completeMediaNode(n,type,result.url,result.data)
  }
  function textFrom(data){return String(findValue(data,['content','output_text','outputText','text'],v=>typeof v==='string'&&v.trim())||'').trim()}
  function localScriptText(n,prompt){
    const cfg={scriptType:'storyboard',shots:6,scriptStyle:'cinematic',includeAudio:true,...n.config},parts=prompt.split(/[。！？!?\n]+/).map(text=>text.trim()).filter(Boolean),shots=Math.max(2,Math.min(24,+cfg.shots||6));
    const shotTypes=['全景','中景','近景','特写'],moves=['固定镜头','缓慢推进','轻微横移','跟随拍摄'],beats=['建立场景','人物进入','线索出现','情绪推进','冲突升级','结果停留'];
    const typeNames={storyboard:'分镜',character:'角色场次',narration:'口播段落',shotlist:'镜头'},styleNames={cinematic:'电影写实',commercial:'商业广告',documentary:'自然纪实',anime:'动画分镜'};
    return Array.from({length:shots},(_,index)=>{const content=parts[index%Math.max(1,parts.length)]||prompt,number=String(index+1).padStart(2,'0'),audio=cfg.includeAudio?'｜声音：环境声与必要对白':'';return(typeNames[cfg.scriptType]||'镜头')+' '+number+'｜'+shotTypes[index%shotTypes.length]+'｜'+moves[index%moves.length]+'｜画面：'+beats[index%beats.length]+'，'+content+'｜时长：'+(index%3+3)+' 秒'+audio}).join('\n')+'\n\n整体风格：'+(styleNames[cfg.scriptStyle]||cfg.scriptStyle)
  }
  async function generateText(n){
    const cfg={textModel:'local',textTask:'free',temperature:.7,scriptType:'storyboard',shots:6,scriptStyle:'cinematic',includeAudio:true,...n.config},selected=cfg.textModel,base=TEXT_MODEL_CATALOG[selected]||TEXT_MODEL_CATALOG.local;
    const upstream=collectInputs(n.id),prompt=[resolveNodeMentions(n.input),...upstream.texts].filter(Boolean).join('\n\n'),effectivePrompt=prompt||(upstream.images.length?'请分析输入图片，并输出可直接用于图片或视频生成的详细中文提示词。':'');
    if(!effectivePrompt&&!upstream.images.length)throw new Error('请输入内容，或连接上游文本/图片节点');
    if(base.provider==='local'){
      if(upstream.images.length)throw new Error('图片反推提示词需要选择已配置的多模态文本模型');
      if(n.type==='text'&&cfg.textTask!=='free')throw new Error('该处理方式需要选择一个 AI 文本模型');
      const text=n.type==='script'?localScriptText(n,effectivePrompt):effectivePrompt;n.output={type:'text',text};n.status='success';n.message=n.type==='script'?'本地脚本已生成':'内容已输出';n.progress=100;renderAllNodes();scheduleSave();return true
    }
    const proxy=(localStorage.getItem('apikey-proxy')||'').trim(),key=activeApiKey(base.provider);
    let endpoint=base.endpoint,model=base.apiModel;
    if(['ark','custom'].includes(base.provider)){endpoint=base.provider==='ark'?endpoint:configuredEndpoint(base.provider);model=configuredModel(base.provider)}
    if(!key&&base.provider!=='custom')throw new Error('请先在设置中填写 '+base.label.split(' · ')[0]+' API Key');
    if(!proxy&&(!endpoint||!model))throw new Error('请在设置中补全接口地址和模型名');
    const textSystems={free:'你是一名视频创作助手。直接输出可用于后续图片或视频生成的中文内容。',optimize:'你是一名提示词导演。保留原意，将输入改写为主体、环境、构图、光线、动作和镜头语言清晰的生成提示词，只输出最终提示词。',expand:'你是一名影视策划。扩写输入内容，补充场景、动作、情绪和视觉细节，保持核心设定一致。',summary:'你是一名内容编辑。提炼输入的核心人物、事件、场景和视觉要点，输出简洁摘要。',translate:'你是一名影视提示词翻译。将输入准确翻译为自然英文，保留专有名词、镜头术语和风格描述，只输出译文。',imagePrompt:'你是一名视觉提示词专家。分析输入图片的主体、外观、场景、构图、镜头、光线、色彩、材质和风格，输出一段可复现该画面的详细中文生成提示词，不要解释分析过程。'};
    const scriptNames={storyboard:'连续分镜脚本',character:'角色表演脚本',narration:'短视频口播脚本',shotlist:'制作镜头清单'};
    const system=n.type==='script'?'你是一名影视分镜编剧。请输出 '+cfg.shots+' 个结构清晰、可直接连接图片或视频节点的'+(scriptNames[cfg.scriptType]||'分镜脚本')+'。视觉风格为 '+cfg.scriptStyle+'。每项必须包含编号、景别、运镜、画面、角色动作、时长'+(cfg.includeAudio?'、对白或声音设计。':'。'):textSystems[cfg.textTask]||textSystems.free;
    const request={action:'generate',taskType:'text',provider:base.provider,model:model||selected,input:{prompt:effectivePrompt,system,images:upstream.images,texts:upstream.texts},parameters:{temperature:+cfg.temperature||.7,scriptType:cfg.scriptType,shots:+cfg.shots||6,style:cfg.scriptStyle,includeAudio:cfg.includeAudio!==false}};
    setNodeState(n,'running','正在生成文本...',12);let data;
    try{
      const userContent=upstream.images.length?[{type:'text',text:effectivePrompt},...upstream.images.map(url=>({type:'image_url',image_url:{url}}))]:effectivePrompt;
      data=proxy?await submitProxy(proxy,key,request):await providerRequest(base.provider,endpoint,{body:{model,messages:[{role:'system',content:system},{role:'user',content:userContent}],temperature:+cfg.temperature||.7}})
    }catch(error){if(!proxy&&/Failed to fetch|NetworkError/i.test(error.message))throw new Error('模型服务连接失败，请检查网络或设置中的 API Key');throw error}
    const text=textFrom(data);if(!text)throw new Error('接口没有返回文本内容');
    n.output={type:'text',text,raw:data};n.status='success';n.message='AI 生成完成';n.progress=100;renderAllNodes();scheduleSave();return true
  }
  async function generateVideo(nodeId){
    const n=getNode(nodeId);if(!n)return false;
    const cfg=normalizeVideoConfig({model:'sf-wan2.1-t2v',mode:'auto',duration:6,ratio:'16:9',resolution:'720p',sound:false,motion:'balanced',negativePrompt:'',seed:'',...n.config}),base=MODEL_CATALOG[cfg.model]||MODEL_CATALOG['custom-video'],meta={...base};n.config={...n.config,...cfg};n._quotaModel=cfg.model;
    if(meta.provider==='custom')meta.apiModel=configuredModel(meta.provider);
    const upstream=collectInputs(n.id);if(n.config?.referenceImage)upstream.images=[n.config.referenceImage,...upstream.images];const prompt=(resolveNodeMentions(n.input)||upstream.texts.join('\n\n')).trim();
    if(!prompt&&!upstream.images.length&&!upstream.videos.length&&!upstream.audios.length)throw new Error('请输入提示词，或连接可用的上游素材');
    let mode=cfg.mode;if(mode==='auto')mode=upstream.images.length>1?'first_last':upstream.images.length?'img2video':'text2video';
    if(mode==='img2video'&&!upstream.images.length)throw new Error('图生视频模式需要连接或上传一张参考图');
    if(mode==='first_last'&&upstream.images.length<2)throw new Error('首尾帧模式需要连接两张图片，分别作为首帧和尾帧');
    if(mode==='ref_all'&&!(upstream.images.length||upstream.videos.length||upstream.audios.length))throw new Error('全能参考模式需要至少连接一项图片、视频或音频素材');
    const caps=videoCapabilities(cfg.model),parameters={mode,duration:+cfg.duration||5,ratio:cfg.ratio||'16:9',resolution:cfg.resolution||'720p',count:1};
    if(caps.sound)parameters.enableSound=cfg.sound===true;
    if(caps.motion)parameters.motion=cfg.motion||'balanced';
    if(caps.negativePrompt&&cfg.negativePrompt)parameters.negativePrompt=cfg.negativePrompt;
    if(caps.seed&&cfg.seed!=='')parameters.seed=+cfg.seed;
    const request={action:'generate',taskType:'video',provider:meta.provider,model:meta.apiModel,input:{prompt,images:upstream.images,videos:upstream.videos,audios:upstream.audios},parameters};
    return executeMediaRequest(n,'video',meta,request)
  }
  async function generateProxyMedia(n,type){
    if(n.output?.url&&!n.input)return true;
    const upstream=collectInputs(n.id),images=[...(n.output?.type==='image'&&n.output.url?[n.output.url]:[]),...upstream.images],prompt=(resolveNodeMentions(n.input)||upstream.texts.join('\n\n')).trim();
    if(!prompt&&(type!=='image'||!images.length))throw new Error(type==='image'?'请输入图片提示词或上传参考图':'请输入音频文本或连接文本节点');
    const cfg={imageModel:'sf-flux-schnell',imageMode:'auto',quality:'standard',ratio:'16:9',resolution:'2k',count:1,style:'cinematic',negativePrompt:'',seed:'',audioModel:'dashscope-qwen-tts',voice:'少女音色',speed:1,tone:0,volume:1,pitch:0,strength:1,timbre:0,effect:'none',...n.config};
    const selectedId=type==='image'?cfg.imageModel:cfg.audioModel,catalog=type==='image'?IMAGE_MODEL_CATALOG:AUDIO_MODEL_CATALOG,selected=catalog[selectedId]||catalog[type==='image'?'custom-image':'custom-audio'],meta={...selected,direct:selected.direct===true};n._quotaModel=selectedId;
    if(meta.provider==='custom')meta.apiModel=configuredModel('custom',meta.apiModel);
    const parameters=type==='image'?{mode:cfg.imageMode,model:meta.apiModel,quality:cfg.quality||'standard',ratio:cfg.ratio,resolution:cfg.resolution,count:+cfg.count||1,style:cfg.style,negativePrompt:cfg.negativePrompt||'',seed:cfg.seed===''?null:+cfg.seed}:{model:meta.apiModel,voice:cfg.voice,speed:+cfg.speed||1,tone:+cfg.tone||0,volume:+cfg.volume||1,pitch:+cfg.pitch||0,strength:+cfg.strength||1,timbre:+cfg.timbre||0,effect:cfg.effect||'none'};
    return executeMediaRequest(n,type,meta,{action:'generate',taskType:type,provider:meta.provider,model:meta.apiModel,input:{prompt,images,videos:upstream.videos,audios:upstream.audios},parameters})
  }
  async function runNode(nodeId){
    const n=getNode(nodeId);if(!n||n.status==='running')return false;
    const incoming=collectInputs(n.id),hasPrompt=!!(n.input||'').trim()||incoming.texts.length>0||(['text','script','image','video'].includes(n.type)&&incoming.images.length>0);
    if(['text','script','image','audio','video'].includes(n.type)&&!hasPrompt){
      n.status='idle';n.message='';n.progress=0;
      renderAllNodes();
      showToast('请输入提示词','validation');return false
    }
    try{
      if(n.type==='text'||n.type==='script')return await generateText(n);
      if(n.type==='image')return await generateProxyMedia(n,'image');
      if(n.type==='audio')return await generateProxyMedia(n,'audio');
      if(n.type==='video')return await generateVideo(n.id);
      if(n.type==='compose'){
        const linked=getIncoming(n.id).filter(node=>node.output?.type==='video'&&node.output.url),order=Array.isArray(n.config?.composeOrder)?n.config.composeOrder.map(Number):[],ordered=[...order.map(getNode).filter(node=>linked.some(item=>item.id===node?.id)),...linked.filter(node=>!order.includes(node.id))],videos=ordered.map(node=>node.output.url),cfg={transition:'cut',transitionDuration:.4,ratio:'source',resolution:'source',keepAudio:true,...n.config};if(!videos.length)throw new Error('请先连接并生成视频节点');
        if(videos.length===1)return completeMediaNode(n,'video',videos[0],{source:'passthrough'});
        return await executeMediaRequest(n,'video',{provider:'custom',apiModel:'video-compose',direct:false},{action:'generate',taskType:'video',provider:'custom',model:'video-compose',input:{videos},parameters:{mode:'compose',transition:cfg.transition,transitionDuration:+cfg.transitionDuration||.4,ratio:cfg.ratio,resolution:cfg.resolution,keepAudio:cfg.keepAudio!==false}})
      }
      n.status='success';n.message='节点已就绪';n.progress=100;renderAllNodes();scheduleSave();return true
    }catch(error){setNodeState(n,'error',error.message||'执行失败',0);if(n.type==='image')showImageErrorToast(error.message||'图片生成失败');return false}
  }
  function workflowLayers(){
    const indegree=new Map(nodes.map(n=>[n.id,0])),next=new Map(nodes.map(n=>[n.id,[]]));
    edges.forEach(e=>{if(indegree.has(e.to)&&next.has(e.from)){indegree.set(e.to,indegree.get(e.to)+1);next.get(e.from).push(e.to)}});
    let ready=nodes.filter(n=>indegree.get(n.id)===0).map(n=>n.id),visited=0;const layers=[];
    while(ready.length){layers.push(ready);const upcoming=[];ready.forEach(id=>{visited++;next.get(id).forEach(target=>{indegree.set(target,indegree.get(target)-1);if(indegree.get(target)===0)upcoming.push(target)})});ready=upcoming}
    if(visited!==nodes.length)throw new Error('工作流存在循环连线');return layers
  }
  async function runWorkflow(){
    if(workflowRunning||!nodes.length)return;workflowRunning=true;runWorkflowBtn.classList.add('running');runWorkflowBtn.querySelector('span').textContent='运行中';
    try{for(const layer of workflowLayers()){const results=await Promise.all(layer.map(runNode));if(results.some(result=>!result))throw new Error('工作流已在失败节点停止')}runWorkflowBtn.querySelector('span').textContent='完成'}catch(error){console.warn(error);runWorkflowBtn.querySelector('span').textContent='已停止'}finally{workflowRunning=false;setTimeout(()=>{runWorkflowBtn.classList.remove('running');runWorkflowBtn.querySelector('span').textContent='运行'},1200)}
  }
})();
