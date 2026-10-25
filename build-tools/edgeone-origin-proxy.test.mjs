import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forwardOrigin} from './edgeone-origin-proxy.mjs';
test('preview forwards share to original D1 service and returns a link for the incoming host',async()=>{
  const request=new Request('https://preview.example/share',{method:'POST',headers:{Origin:'https://preview.example','Content-Type':'application/json'},body:'{"code":"demo"}'});
  const result=await forwardOrigin(request,async(url,options)=>{
    assert.equal(url,'https://voyra-121.pages.dev/share');assert.equal(options.headers.get('Origin'),'https://preview.example');assert.equal(new TextDecoder().decode(options.body),'{"code":"demo"}');assert.equal(options.redirect,'manual');
    return Response.json({ok:true,id:'ABC1234',url:'https://voyra-121.pages.dev/s/ABC1234'});
  });assert.equal(result.headers.get('Cache-Control'),'no-store');assert.equal((await result.json()).url,'https://preview.example/s/ABC1234');
});
test('short-link redirect keeps the user on the current host without changing the share ID',async()=>{
  const result=await forwardOrigin(new Request('https://preview.example/s/ABC1234'),async()=>new Response(null,{status:302,headers:{Location:'https://voyra-121.pages.dev/#/timetable?tab=courses&shareId=ABC1234'}}));
  assert.equal(result.status,302);assert.equal(result.headers.get('Location'),'https://preview.example/#/timetable?tab=courses&shareId=ABC1234');
});
test('upstream authentication failure is preserved and never cached',async()=>{
  const result=await forwardOrigin(new Request('https://preview.example/modelflow/api/admin/codes',{headers:{Origin:'https://untrusted.example','X-Admin-Pass':'test'}}),async(_url,options)=>{assert.equal(options.headers.get('Origin'),'https://untrusted.example');assert.equal(options.headers.get('X-Admin-Pass'),'test');return Response.json({ok:false},{status:403});});assert.equal(result.status,403);assert.equal(result.headers.get('Cache-Control'),'no-store');
});
test('unrecognized routes cannot turn this function into an arbitrary proxy',async()=>{
  for(const path of ['/https://attacker.example/','//attacker.example/','/admin/secrets','/share/../../other']){let called=false;const response=await forwardOrigin(new Request('https://preview.example'+path),async()=>{called=true;});assert.equal(response.status,404);assert.equal(called,false);}
});
test('network failure returns a retryable error without claiming that data was saved',async()=>{
  const response=await forwardOrigin(new Request('https://preview.example/share?id=ABC1234'),async()=>{throw Error('offline');});assert.equal(response.status,502);assert.equal((await response.json()).ok,false);
});
