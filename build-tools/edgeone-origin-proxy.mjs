const ORIGIN='https://voyra-121.pages.dev';
const route=/^(?:\/share\/?|\/s\/[A-Za-z0-9]{7}\/?|\/ocr\/?|\/(?:ac-api|bt-api|tm-api)\/latest\/?|\/prompt-admin\/verify\/?|\/modelflow\/api\/[a-z/-]+)$/;

// The preview serves its static site locally while all existing API state remains in Cloudflare.
// Preserve Origin and authentication: the proxy does not override the upstream access checks.
export async function forwardOrigin(request,fetcher=fetch){
  const incoming=new URL(request.url);
  if(!route.test(incoming.pathname))return new Response('Not found',{status:404});
  const target=new URL(ORIGIN);target.pathname=incoming.pathname;target.search=incoming.search;
  const headers=new Headers(request.headers);headers.delete('host');headers.delete('content-length');headers.set('Accept-Encoding','identity');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),14000);
  try{
    const response=await fetcher(target.href,{method:request.method,headers,redirect:'manual',signal:controller.signal,
      ...(!['GET','HEAD'].includes(request.method)?{body:await request.arrayBuffer()}:{})});
    const outputHeaders=new Headers(response.headers);outputHeaders.set('Cache-Control','no-store');
    const location=outputHeaders.get('Location');
    if(location){const url=new URL(location,target);if([ORIGIN,'https://lxlrwxs.top'].includes(url.origin))outputHeaders.set('Location',incoming.origin+url.pathname+url.search+url.hash);}
    if(request.method==='POST'&&incoming.pathname==='/share'&&response.ok){
      const data=await response.json();if(data.ok&&/^[A-Za-z0-9]{7}$/.test(data.id))data.url=incoming.origin+'/s/'+data.id;
      outputHeaders.delete('Content-Length');outputHeaders.delete('Content-Encoding');outputHeaders.set('Content-Type','application/json; charset=utf-8');
      return new Response(JSON.stringify(data),{status:response.status,headers:outputHeaders});
    }
    if(incoming.pathname.startsWith('/s/')&&outputHeaders.get('Content-Type')?.includes('text/html')){
      const html=(await response.text()).replaceAll(ORIGIN+'/',incoming.origin+'/');outputHeaders.delete('Content-Length');outputHeaders.delete('Content-Encoding');
      return new Response(html,{status:response.status,headers:outputHeaders});
    }
    return new Response(response.body,{status:response.status,headers:outputHeaders});
  }catch{return new Response(JSON.stringify({ok:false,error:'origin_unavailable'}),{status:502,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
  finally{clearTimeout(timeout);}
}
export default function onRequest({request}){return forwardOrigin(request);}
