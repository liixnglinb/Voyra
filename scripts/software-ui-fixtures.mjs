import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { createRequire } from 'node:module';

/** Local QA-only fixtures. No forwarding, real accounts or actual file operations. */
export function chronicleFixture(now = Date.now()) {
  const session = (id,tool,name,title) => ({id,tool,toolName:name,toolColor:'#80651c',title,project:'UI Preview',projectPath:'UI-Preview',start:now-3600000,end:now-600000,turns:12,tokensIn:14000,tokensOut:3000,tokensCached:4000,model:'preview-model',hasTokens:true,artifacts:[{name:'ui-spec.md',path:'UI-Preview/ui-spec.md',size:2048,mtime:now}]});
  return {generatedAt:now,cacheStats:{hit:2,miss:0},sources:[{id:'codex',name:'Codex',kind:'connected',status:'connected',sessionCount:1,lastActivity:now,detail:'设计验证来源',note:'未读取真实日志'}],sessions:[session('qa-codex','codex','Codex','统一软件 UI 规范 · 设计验证'),session('qa-claude','claude','Claude Code','验证部分失败与键盘操作 · 设计验证')]};
}

export async function startSoftwareFixtures(roots, ports = {token:5183,jacquard:5184,checkin:5185}) {
  const date = new Date().toLocaleDateString('sv-SE');
  const row = {date,agent:'codex',model:'unknown-preview',session:'preview',tokens:150000,inp:120000,out:30000,cr:0,cw:0,requests:2,cost:0,priced:0,unpriced:2};
  const state = {
    token:{fail:false,busy:false,reloads:0,summary:{range:{min:date,max:date},agents:[{name:'codex',tokens:150000,requests:2,cost:0}],matrix:[row],coverage:[],scan_errors:[],cny_rate:7.1,cache_stats:{hit:1,miss:0,verdict:0},kpi_all:{tokens:150000,requests:2,cost:0,plan_models:[],plan_tokens:0,unpriced_tokens:150000},_meta:{built_at:'ui-preview-v1'}}},
    checkin:{fail:false,rejectListen:false,status:{version:'0.0.0-ui-preview',mode:'hybrid',port:ports.checkin,accounts:[{username:'ui-preview',name:'设计验证账号',schoolname:'示例大学'}],courses:[{courseName:'设计验证课程',courseId:1,classId:2}],watchCourses:[],trend:[],courseStats:[],recent:[],recordCount:0,successCount:0,failCount:0,cookieValid:true,imConnected:false,qrPending:false,listening:true,listeningCount:1,todayStats:{total:0,success:0,fail:0},notifyDesktop:false}},
    jacquard:{failPaths:new Set(),data:{'/api/settings':{ui_theme:'light',ui_lang:'zh',ui_font:'os'},'/api/agents':{agents:[],default_engine:'',paths:{}},'/api/pipelines':{pipelines:[{name:'ui-preview-flow',label:'设计验证流程',desc:'仅用于布局验证，不运行真实任务',steps:[{key:'step-1',label:'复核界面',skill:'preview',out:'preview.md'}]}]},'/api/skills':{skills:[{name:'ui-preview-skill',chars:1200,desc:'设计验证用技能'}]},'/api/runs':{runs:[{id:'ui-preview-run',label:'设计验证运行',pipeline:'ui-preview-flow',status:'failed',created_at:'2026-10-03 10:00',steps:[]}]},'/api/providers':{presets:[],default:null},'/api/health':{ok:true,version:'ui-preview'},'/api/update':{phase:'idle'},'/api/stats':{},'/api/agents/capabilities':{}}},
    requests:[],servers:[],
  };
  const requireCheckin=createRequire(resolve(roots.checkin,'package.json'));
  const buildCheckin=requireCheckin('./build/server/console-ui.js').getConsolePage;
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
  for (const id of ['token','jacquard','checkin']) {
    const staticRoot=resolve(roots[id],id==='token'?'webapp/static':id==='jacquard'?'static':'assets');
    const server=http.createServer(async(req,res)=>{
      const url=new URL(req.url,'http://127.0.0.1');
      const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
      try {
        if(url.pathname.startsWith('/api/')) {
          state.requests.push({product:id,method:req.method,path:url.pathname});
          if(id==='token') {
            if(state.token.fail)return send({detail:'UI 测试服务不可用'},503);
            if(url.pathname==='/api/summary')return send(state.token.summary);
            if(url.pathname==='/api/settings')return send({built_at:state.token.summary._meta.built_at,busy:state.token.busy,settings:{refresh_minutes:0}});
            if(url.pathname==='/api/reload'){state.token.reloads+=1;return send({ok:true});}
            return send({state:'unavailable',version:'0.0.0-ui-preview'});
          }
          if(id==='checkin') {
            if(url.pathname==='/api/status')return send(state.checkin.status,state.checkin.fail?503:200);
            if(url.pathname==='/api/disclaimer')return send({accepted:true});
            if(url.pathname==='/api/listen') {
              if(state.checkin.rejectListen)return send({ok:false,message:'设计验证：服务拒绝更改'});
              let body='';for await(const chunk of req)body+=chunk;
              state.checkin.status.listening=Boolean(JSON.parse(body||'{}').on);
              return send({ok:true,listening:state.checkin.status.listening,listeningCount:1});
            }
            if(url.pathname==='/api/scan-now')return send({ok:false,message:'设计验证不执行真实签到'});
            return send({days:[],logs:[],ok:false,message:'仅用于 UI 验证'});
          }
          if(state.jacquard.failPaths.has(url.pathname))return send({detail:'UI 测试读取失败'},503);
          if(req.method!=='GET')return send({detail:'UI 验证禁止真实任务或修改'},409);
          if(url.pathname.startsWith('/api/skills/ui-preview-skill'))return send({name:'ui-preview-skill',content:'# UI Preview\n不执行真实任务。'});
          return send(state.jacquard.data[url.pathname]||{});
        }
        if(id==='checkin'&&url.pathname==='/'){res.writeHead(200,{'Content-Type':mime['.html']});res.end(buildCheckin(state.checkin.status,'ui-preview-only',{scriptNonce:'test-only'}));return;}
        const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/static\//,'').replace(/^\/assets\//,'').replace(/^\//,'');
        const file=resolve(staticRoot,relative);
        if(!file.startsWith(staticRoot+sep)){res.writeHead(403);res.end();return;}
        const content=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(content);
      } catch {res.writeHead(404);res.end();}
    });
    await new Promise((done)=>server.listen(ports[id],'127.0.0.1',done));state.servers.push(server);
  }
  state.close=()=>Promise.all(state.servers.map((server)=>new Promise((done)=>server.close(done))));
  return state;
}
