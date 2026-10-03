(() => {
  'use strict';
  const cards = [...document.querySelectorAll('.card,.dl-card,.feature-card,.feature,.feat,.omni-card,.step,.dl-panel')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const syncTheme = () => {
    const body = getComputedStyle(document.body);
    const surface = body.backgroundColor === 'rgba(0, 0, 0, 0)' ? getComputedStyle(document.documentElement).backgroundColor : body.backgroundColor;
    const values = surface.match(/[\d.]+/g)?.slice(0,3).map(Number);
    const transparent = surface.includes('rgba') && surface.endsWith(', 0)');
    const dark = values && !transparent && (values[0]*.2126+values[1]*.7152+values[2]*.0722)<90;
    document.documentElement.dataset.voyraTheme = dark ? 'dark' : 'light';
  };
  syncTheme();
  let frame = 0;
  let current;
  let pending;
  let revision = 0;
  const cache = new WeakMap();
  const clear = (card) => {
    if (!card) return;
    card.removeAttribute('data-pointer-active');
    ['--landing-x','--landing-y','--landing-lift'].forEach((key) => card.style.removeProperty(key));
  };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => entries.forEach(({ target,isIntersecting }) => target.toggleAttribute('data-card-visible',isIntersecting)), { rootMargin:'80px' }) : null;
  cards.forEach((card) => {card.setAttribute('data-voyra-landing-card','');card.setAttribute('data-card-visible','');observer?.observe(card);});
  document.addEventListener('pointermove',(e) => {
    if (motion.matches || !pointer.matches || e.pointerType === 'touch') return;
    const card=e.target.closest('[data-voyra-landing-card]');
    if (!card) return;
    if (current !== card) {clear(current);current=card;}
    pending={card,x:e.clientX,y:e.clientY};
    if (frame) return;
    frame=requestAnimationFrame(() => {
      frame=0;
      if (!pending || motion.matches) return;
      const {card:target,x,y}=pending;
      let value=cache.get(target);
      if (!value || value.revision !== revision) {value={revision,rect:target.getBoundingClientRect()};cache.set(target,value);}
      const {rect}=value;
      target.style.setProperty('--landing-x',`${Math.min(100,Math.max(0,(x-rect.left)/rect.width*100))}%`);
      target.style.setProperty('--landing-y',`${Math.min(100,Math.max(0,(y-rect.top)/rect.height*100))}%`);
      target.style.setProperty('--landing-lift','-2px');
      target.setAttribute('data-pointer-active','');
    });
  },{passive:true});
  document.addEventListener('pointerout',(e) => {if(current&&!current.contains(e.relatedTarget)){clear(current);current=null;pending=null;if(frame)cancelAnimationFrame(frame);frame=0;}},{passive:true});
  document.addEventListener('scroll',()=>{revision+=1;},{capture:true,passive:true});
  window.addEventListener('resize',()=>{revision+=1;});
  motion.addEventListener('change',()=>{if(motion.matches){clear(current);pending=null;}});
  document.addEventListener('visibilitychange',()=>{cards.forEach((card)=>{card.style.animationPlayState=document.hidden?'paused':'';});});
})();
