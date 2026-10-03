/* Shared modal contract for server-rendered apps. Never performs business actions. */
(() => {
  'use strict';
  const records = new Map();
  let stack = [], stamp = 0, frame = 0;
  const selector = '.modal-mask .modal,.modal.open .modal-box,.detail-modal-box,.up-card';
  const isVisible = (node) => node.isConnected && !node.closest('[hidden]') && node.getClientRects().length > 0;
  const items = (node) => [...node.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(isVisible);
  const safelyFocus = (node) => {
    const safe = node.querySelector('[data-safe-focus],.modal-close:not(:disabled),.modal-x:not(:disabled),#disclaimerReject:not(:disabled),#updateLater:not(:disabled)');
    (safe && isVisible(safe) ? safe : node).focus({preventScroll:true});
  };
  const sync = () => {
    frame = 0;
    for (const [node, record] of records) {
      if (!isVisible(node)) {
        records.delete(node);
        if (record.restore?.isConnected) record.restore.focus({preventScroll:true});
      }
    }
    document.querySelectorAll(selector).forEach((node) => {
      if (!isVisible(node) || records.has(node)) return;
      node.setAttribute('role',node.getAttribute('role')||'dialog');
      node.setAttribute('aria-modal','true');node.tabIndex=-1;
      const heading=node.querySelector('h1,h2,h3,.modal-title,.detail-modal-title');
      if (heading) {if(!heading.id)heading.id='voyra-dialog-heading-'+(++stamp);node.setAttribute('aria-labelledby',heading.id);}
      else if (!node.getAttribute('aria-label') && !node.getAttribute('aria-labelledby')) node.setAttribute('aria-label','操作详情');
      node.querySelectorAll('.modal-close,.modal-x').forEach((button)=>{if(!button.getAttribute('aria-label'))button.setAttribute('aria-label','关闭弹窗');});
      records.set(node,{restore:document.activeElement instanceof HTMLElement?document.activeElement:null});
      safelyFocus(node);
    });
    stack=[...records.keys()];
  };
  const requestSync = () => {if(!frame)frame=requestAnimationFrame(sync);};
  const observer=new MutationObserver(requestSync);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','hidden','disabled']});
  document.addEventListener('keydown',(event)=>{
    const node=stack[stack.length-1];if(!node||!isVisible(node))return;
    if(event.key==='Tab'){
      const options=items(node),first=options[0],last=options[options.length-1];
      if(!first){event.preventDefault();node.focus();return;}
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===node)){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!node.contains(document.activeElement))){event.preventDefault();first.focus();}
    }
    if(event.key==='Escape'){
      const close=node.querySelector('.modal-close:not(:disabled),.modal-x:not(:disabled),[data-dialog-close]:not(:disabled)');
      if(node.getAttribute('aria-busy')==='true') {event.preventDefault();event.stopImmediatePropagation();return;}
      if(close){event.preventDefault();event.stopImmediatePropagation();close.click();}
    }
  },true);
  sync();
})();
