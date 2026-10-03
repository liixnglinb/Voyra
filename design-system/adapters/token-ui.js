/* Keyboard, filter and chart semantics. No scanner or pricing operations. */
(() => {
  'use strict';
  const navigation = document.querySelectorAll('#nav a[data-view],#setNav a[data-cat]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const chartAnimations = new WeakMap();
  const syncChartMotion = () => {
    if (!window.Chart) return;
    for (const chart of Object.values(Chart.instances)) {
      if (reducedMotion.matches) {
        if (!chartAnimations.has(chart)) chartAnimations.set(chart, chart.options.animation);
        chart.stop(); chart.options.animation = false; chart.update('none');
      } else if (chartAnimations.has(chart)) {
        chart.options.animation = chartAnimations.get(chart); chartAnimations.delete(chart);
      }
    }
  };
  reducedMotion.addEventListener('change', syncChartMotion);
  const sync = () => {
    navigation.forEach((item) => {
      item.setAttribute('role','button'); item.tabIndex=0;
      item.setAttribute('aria-current',item.classList.contains('active')?'page':'false');
    });
    document.querySelectorAll('.dd').forEach((group)=>{
      const button=group.querySelector('.dd-btn'),menu=group.querySelector('.dd-menu');
      if(!button||!menu)return;
      button.setAttribute('aria-expanded',String(!menu.hidden));
      button.setAttribute('aria-controls',menu.id);button.setAttribute('aria-haspopup','menu');
      menu.setAttribute('role','menu');
      menu.querySelectorAll('button').forEach((option)=>{option.setAttribute('role','menuitemradio');option.setAttribute('aria-checked',String(option.classList.contains('on')));option.tabIndex=-1;});
    });
    document.querySelectorAll('.chart-controls button').forEach((button)=>{button.setAttribute('aria-pressed',String(button.classList.contains('active')||button.classList.contains('on')));});
    document.querySelectorAll('canvas').forEach((canvas)=>{
      canvas.setAttribute('role','img');
      const section=canvas.closest('.card,.agent-panel');
      const heading=section?.querySelector('h3,h4');
      canvas.setAttribute('aria-label',(heading?.textContent||'统计图')+'。精确数值见同一区域的文字及明细表。');
    });
    document.querySelectorAll('.ar-head,.t10-row[data-model]').forEach((item)=>{item.tabIndex=0;item.setAttribute('role','button');});
    if (reducedMotion.matches) syncChartMotion();
  };
  document.addEventListener('keydown',(e)=>{
    const target=e.target;
    const nav=target.closest('#nav a[data-view],#setNav a[data-cat],.ar-head,.t10-row[data-model]');
    if(nav&&(e.key==='Enter'||e.key===' ')){e.preventDefault();nav.click();return;}
    const group=target.closest('.dd'); if(!group)return;
    const button=group.querySelector('.dd-btn'),menu=group.querySelector('.dd-menu');if(!button||!menu)return;
    const options=[...menu.querySelectorAll('button:not(:disabled)')];
    if(e.key==='Escape'&&!menu.hidden){e.preventDefault();closeAllDropdowns();button.focus();return;}
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault();
      if(menu.hidden){button.click();}
      const index=options.indexOf(document.activeElement);
      const next=e.key==='Home'?0:e.key==='End'?options.length-1:e.key==='ArrowDown'?(index+1)%options.length:(index-1+options.length)%options.length;
      options[next]?.focus();
    }
  });
  document.addEventListener('click',(e)=>{const option=e.target.closest('.dd-menu button');if(option){option.closest('.dd')?.querySelector('.dd-btn')?.focus();}});
  document.addEventListener('focusout',(e)=>{const group=e.target.closest('.dd');if(group&&!group.contains(e.relatedTarget))closeAllDropdowns();});
  sync();
  let frame=0;
  const observer=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;sync();});});
  observer.observe(document.querySelector('main'),{attributes:true,attributeFilter:['class','hidden'],childList:true,subtree:true});
  navigation.forEach((item)=>observer.observe(item,{attributes:true,attributeFilter:['class']}));
  try{const saved=sessionStorage.getItem('voyra-token-view');if(['overview','models','settings'].includes(saved))switchView(saved);}catch{ /* UI state only */ }
})();
