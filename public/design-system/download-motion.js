/* Native motion only; release metadata and download actions are independent. */
(() => {
  const body = document.body;
  const stage = document.querySelector('.dp-hero-visual');
  const toggle = document.querySelector('[data-motion-toggle]');
  if (!stage || !toggle || !Element.prototype.animate) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const preferenceKey = 'voyra.download-motion.paused';
  const entrances = new Set();
  const interactions = new Set();
  const resetPointers = [];
  let paused = false, visible = false, heroVisible = false;
  try { paused = sessionStorage.getItem(preferenceKey) === 'true'; } catch {}
  const canAnimate = () => !reduced.matches && !paused && !document.hidden;

  // Individual transform properties keep authored rotations, such as the phone.
  ['.dp-demo-rows>div', '.dp-demo-metrics>div', '.dp-capacity-bar>i', '.dp-phone-row', '.dp-journal-rows>div', '.dp-flow-packets path'].forEach(selector => {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.style.setProperty('--dp-i', index);
      if (element.matches('.dp-journal-rows>div')) element.querySelector('i')?.style.setProperty('--dp-i', index);
    });
  });

  function animate(element, keyframes, options = {}, group = entrances) {
    if (!element || !canAnimate()) return;
    const animation = element.animate(keyframes, { duration: 750, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards', ...options });
    group.add(animation);
    animation.finished.then(() => group.delete(animation), () => group.delete(animation));
    return animation;
  }
  function finishEntrances() {
    for (const animation of entrances) animation.finish();
    entrances.clear();
    for (const animation of interactions) animation.cancel();
    interactions.clear();
  }
  function syncMotion() {
    body.toggleAttribute('data-motion-paused', paused || reduced.matches);
    body.toggleAttribute('data-hero-visible', heroVisible);
    stage.toggleAttribute('data-motion-running', visible && canAnimate());
    toggle.hidden = reduced.matches;
    toggle.toggleAttribute('data-paused', paused);
    toggle.setAttribute('aria-label', paused ? '播放预览动效' : '暂停预览动效');
    toggle.querySelector('[data-motion-label]').textContent = paused ? '播放动效' : '暂停动效';
    if (!canAnimate()) {
      finishEntrances();
      resetPointers.forEach(reset => reset());
    }
  }
  toggle.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem(preferenceKey, String(paused)); } catch {}
    syncMotion();
  });
  reduced.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  body.classList.add('dp-motion-ready');
  syncMotion();

  const revealFrames = [
    { opacity: 0, transform: 'translate3d(0,26px,0)' },
    { opacity: 1, transform: 'translate3d(0,0,0)' },
  ];
  [...document.querySelector('.dp-hero-copy').children].forEach((element, i) => {
    animate(element, revealFrames, { delay: 70 + i * 95, duration: 1000 });
  });
  animate(stage, [
    { opacity: 0, transform: 'translate3d(0,32px,0) scale(.96)' },
    { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' },
  ], { delay: 220, duration: 1250 });

  const revealTargets = document.querySelectorAll('.dp-section-heading,.dp-feature,.dp-start-intro,.dp-steps>li,.dp-download,.dp-faq>div,.dp-footer-top,.dp-related>a');
  if ('IntersectionObserver' in window) {
    const previewObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === stage) visible = entry.isIntersecting;
        else heroVisible = entry.isIntersecting;
      }
      syncMotion();
    }, { threshold: 0 });
    previewObserver.observe(stage);
    previewObserver.observe(document.querySelector('.dp-hero'));
    const revealObserver = new IntersectionObserver(entries => {
      let batch = 0;
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        target.setAttribute('data-revealed', '');
        animate(target, revealFrames, { delay: (batch++ % 3) * 90, duration: 850 });
        revealObserver.unobserve(target);
      }
    }, { threshold: .08, rootMargin: '0px 0px -30px 0px' });
    revealTargets.forEach(element => revealObserver.observe(element));
  } else {
    visible = heroVisible = true;
    revealTargets.forEach(element => element.setAttribute('data-revealed', ''));
    syncMotion();
  }

  // Pointer work is event-driven: no permanent render loop or touch scroll work.
  function pointerSurface(surface, tilt) {
    let frame = 0, latest;
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0;
      surface.style.removeProperty('--dp-px'); surface.style.removeProperty('--dp-py');
      surface.style.removeProperty('--dp-rx'); surface.style.removeProperty('--dp-ry');
    };
    resetPointers.push(reset);
    surface.addEventListener('pointermove', event => {
      if (!pointer.matches || !canAnimate() || event.pointerType === 'touch') return;
      latest = event;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = surface.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (latest.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (latest.clientY - rect.top) / rect.height));
        surface.style.setProperty('--dp-px', `${x * 100}%`);
        surface.style.setProperty('--dp-py', `${y * 100}%`);
        if (tilt) {
          surface.style.setProperty('--dp-rx', `${(0.5 - y) * 5}deg`);
          surface.style.setProperty('--dp-ry', `${(x - 0.5) * 6}deg`);
        }
      });
    }, { passive: true });
    surface.addEventListener('pointerleave', reset);
    surface.addEventListener('pointercancel', reset);
  }
  pointerSurface(stage, true);
  document.querySelectorAll('.dp-feature').forEach(card => pointerSurface(card, false));
  pointer.addEventListener('change', () => resetPointers.forEach(reset => reset()));

  const progress = document.createElement('span');
  progress.className = 'dp-scroll-progress'; progress.setAttribute('aria-hidden', 'true');
  document.querySelector('.dp-header').append(progress);
  let scrollFrame = 0;
  function updateScroll() {
    scrollFrame = 0;
    const distance = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${distance > 0 ? Math.max(0, Math.min(1, scrollY / distance)) : 0})`;
    body.toggleAttribute('data-scrolled', scrollY > 12);
  }
  const queueScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll); };
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', queueScroll, { passive: true });
  updateScroll();

  document.querySelectorAll('.dp-button').forEach(button => button.addEventListener('pointerdown', () => {
    animate(button, [{ scale: 1 }, { scale: .97, offset: .35 }, { scale: 1 }], { duration: 300 }, interactions);
  }));
  document.querySelectorAll('.dp-faq-list details').forEach(detail => detail.addEventListener('toggle', () => {
    if (detail.open) animate(detail.querySelector('p'), [{ opacity: 0, translate: '0 -5px' }, { opacity: 1, translate: '0 0' }], { duration: 350 }, interactions);
  }));
  const shot = document.getElementById('product-shot');
  if (shot) {
    let previous;
    const showShot = () => {
      previous?.cancel();
      previous = animate(shot, [{ opacity: .25, transform: 'translateX(9px) scale(1.015)' }, { opacity: 1, transform: 'translateX(0) scale(1)' }], { duration: 450 }, interactions);
    };
    // Wait for the actual image, so a slow connection never animates an empty pane.
    shot.addEventListener('load', showShot);
  }
})();
