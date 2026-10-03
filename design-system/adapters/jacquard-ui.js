/* Frontend read-state tracking; execution, permissions and output writes stay untouched. */
(() => {
  'use strict';
  const errors = new Map();
  const tracked = /^\/api\/(pipelines|skills|runs|agents|providers)(\/|$|\?)/;
  const text = (key) => window.t ? window.t(key) : key;
  const paint = () => {
    const box=document.getElementById('workspaceState');if(!box)return;
    box.hidden=errors.size===0;
    document.getElementById('workspaceStateTitle').textContent=text('ui.readFailed');
    document.getElementById('workspaceStateText').textContent=text('ui.keepResults');
    document.getElementById('workspaceStateDetails').textContent=[...errors.values()].slice(0,3).join(' · ');
    document.getElementById('workspaceRetry').textContent=text('ui.retryRead');
  };
  window.voyraRead = async (url, options) => {
    const key=String(url).split('?')[0];
    try {
      const response=await fetch(url,options);
      if(!response.ok)throw new Error('HTTP '+response.status);
      const data=response.headers.get('content-type')?.includes('application/json')?await response.json():await response.text();
      if(data&&typeof data==='object'&&data.detail)throw new Error(String(data.detail));
      errors.delete(key);paint();return data;
    } catch(error) {
      if(tracked.test(key)){errors.set(key,String(error.message||error));paint();}
      throw error;
    }
  };
  window.voyraReadError = (message) => {errors.set('view',String(message));paint();};
  window.voyraReadReady = () => {errors.delete('view');paint();};
  document.getElementById('workspaceRetry')?.addEventListener('click',()=>{
    // Re-render only. Never calls task creation, deletion or install actions.
    if(window.navGuardAsk&&!window.navGuardAsk())return;
    window.nav?.resolve();
  });
  window.addEventListener('hashchange',paint);
})();
