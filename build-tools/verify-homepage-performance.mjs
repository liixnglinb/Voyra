import {chromium} from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';

const before=resolve(process.argv[2]||'output/performance-20261025/before-dist');
const after=resolve(process.argv[3]||'dist'),out=resolve('output/performance-20261025');
await mkdir(out,{recursive:true});
const mime={'.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
async function serve(root){
  const csp=(await readFile(resolve(root,'_headers'),'utf8')).match(/Content-Security-Policy:\s*(.+)/)[1];
  const server=createServer(async(req,res)=>{
    try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root+sep))throw Error('invalid path');
      const bytes=await readFile(file),extension=extname(file),compressed=['.js','.html','.css','.svg'].includes(extension),body=compressed?gzipSync(bytes):bytes;
      res.writeHead(200,{'Content-Type':mime[extension]||'application/octet-stream','Content-Security-Policy':csp,'Content-Length':body.length,...(compressed?{'Content-Encoding':'gzip'}:{})});res.end(body);
    }catch{res.writeHead(404);res.end();}
  });await new Promise(done=>server.listen(0,'127.0.0.1',done));return {server,origin:`http://127.0.0.1:${server.address().port}`};
}
const servers=await Promise.all([serve(before),serve(after)]),browser=await chromium.launch({channel:'chrome',headless:true});
const report={vantage:'Controlled local 4G simulation: 150ms latency, 2Mbps down, 4x CPU. Not a mainland carrier measurement.',runs:[],flows:[],errors:[]};
async function make(origin,{slow=false,delayHero=0,saveData=false}={}){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.addInitScript(saveData=>{window.__lcp=0;new PerformanceObserver(list=>{window.__lcp=list.getEntries().at(-1)?.startTime||0;}).observe({type:'largest-contentful-paint',buffered:true});if(saveData)Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true}});},saveData);
  await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==origin||!['GET','HEAD'].includes(req.method()))return route.abort('blockedbyclient');if(delayHero&&url.pathname==='/hero-preload.js')await new Promise(done=>setTimeout(done,delayHero));return route.continue();});
  const page=await context.newPage(),requests=[];page.on('request',req=>requests.push(req.url()));page.on('pageerror',e=>report.errors.push(e.message));
  const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  if(slow){await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:250000,uploadThroughput:62500,connectionType:'cellular4g'});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
  return {context,page,requests};
}
try{
  for(const [index,label]of ['before','after'].entries()){
    const {origin}=servers[index],test=await make(origin,{slow:true});await test.page.goto(origin,{waitUntil:'load'});await test.page.waitForTimeout(3200);await test.page.locator('.vr-person-frame.is-ready').waitFor();
    const data=await test.page.evaluate(()=>({lcp:window.__lcp,navigation:performance.getEntriesByType('navigation').map(n=>({dom:n.domContentLoadedEventEnd,load:n.loadEventEnd})),resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,encoded:r.encodedBodySize,decoded:r.decodedBodySize})),cards:[...document.querySelectorAll('[data-voyra-card]')].map(el=>({id:el.dataset.cardId,text:el.querySelector('h3')?.textContent,rect:{width:el.offsetWidth,height:el.offsetHeight}}))}));
    const prompt=test.requests.filter(url=>/\/PromptLibrary-[^/]+\.js/.test(url));assert.equal(prompt.length,index===0?1:0,label+' prompt download');
    assert.equal(test.requests.filter(url=>/\/PelicanGallery-[^/]+\.js/.test(url)).length,0,'Gallery is never downloaded for homepage metadata');
    report.runs.push({label,...data,jsGzip:data.resources.filter(r=>r.name.endsWith('.js')).reduce((sum,r)=>sum+r.encoded,0)});
    await test.page.screenshot({path:resolve(out,label+'-mobile.png'),fullPage:false});
    if(index===1){
      await test.page.goto(origin+'/#/prompts',{waitUntil:'domcontentloaded'});await test.page.locator('body').getByText('提示词库',{exact:true}).first().waitFor();await test.page.waitForFunction(()=>!!document.querySelector('.pl-page, .prompt-library, .pl-root')||document.body.innerText.includes('新建提示词'));
      assert.equal(test.requests.filter(url=>/\/PromptLibrary-[^/]+\.js/.test(url)).length,1);report.flows.push('Homepage downloads no unused prompt bundle; opening the real prompts route still loads it once');
      await test.page.goto(origin+'/#/pelican-gallery',{waitUntil:'domcontentloaded'});await test.page.locator('.pg-page').waitFor();assert.equal(await test.page.locator('.pg-card').count(),16);assert.equal(test.requests.filter(url=>/\/PelicanGallery-[^/]+\.js/.test(url)).length,1);report.flows.push('Gallery is a separate chunk and still renders all 16 models');
    }
    await test.context.close();
  }
  assert.deepEqual(report.runs[1].cards,report.runs[0].cards,'Card content, order and dimensions must remain identical');
  assert.ok(report.runs[1].jsGzip<report.runs[0].jsGzip-35000,'Cold homepage saves at least 35KB of compressed JS');
  const hero=await make(servers[1].origin,{delayHero:4000});const start=Date.now();await hero.page.goto(servers[1].origin,{waitUntil:'domcontentloaded'});await hero.page.getByRole('heading',{name:/Voyra/}).first().waitFor();const elapsed=Date.now()-start;assert.ok(elapsed<3500,'Homepage must not wait for a stalled preload helper');report.flows.push('A delayed hero preload script no longer blocks the actual homepage render');await hero.context.close();
  const route=await make(servers[1].origin);await route.page.goto(servers[1].origin+'/#/health',{waitUntil:'networkidle'});assert.equal(route.requests.filter(url=>/\/hero\/|\/PromptLibrary-/.test(url)).length,0,'A tool route does not fetch homepage images or prompts');report.flows.push('Opening a tool directly does not download Hero layers or unrelated prompt data');await route.context.close();
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify({runs:report.runs.map(({label,lcp,navigation,jsGzip})=>({label,lcp,navigation,jsGzip})),savedGzip:report.runs[0].jsGzip-report.runs[1].jsGzip,flows:report.flows,errors:report.errors}));
}finally{await writeFile(resolve(out,'comparison.json'),JSON.stringify(report,null,2));await browser.close();await Promise.all(servers.map(({server})=>new Promise(done=>server.close(done))));}
