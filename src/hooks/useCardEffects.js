import { useEffect } from 'react';

/* Delegated, demand-driven pointer work. Scroll/reveal/tilt use separate layers. */
export default function useCardEffects(rootRef, dependency) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    /* .sc-card 是首页 19 张橱窗卡的实际本体。它的祖先 .vr-card-entry 已经在列表里
       （负责入场与舞台暂停），但指针效果要落在卡片自己身上，所以显式补上 ——
       光靠 [data-voyra-card] 也行，写出来是为了让「哪些元素参与指针交互」一眼可读。 */
    const POINTER_TARGET = '[data-voyra-card], .sc-card, .vr-mathmodel-card, .vr-contact-row';
    const cards = [...root.querySelectorAll('[data-voyra-card], .sc-card, .vr-card-entry, .vr-mathmodel-card, .vr-contact-row, .vr-experience-card')];
    const rects = new WeakMap();
    let revision = 0;
    let frame = 0;
    let pending;
    let active;
    const reset = (card) => {
      if (!card) return;
      card.removeAttribute('data-pointer-active');
      ['--tilt-x', '--tilt-y', '--spot-x', '--spot-y', '--art-x', '--art-y'].forEach((key) => card.style.removeProperty(key));
    };
    const onMove = (event) => {
      if (motion.matches || !pointer.matches || event.pointerType === 'touch') return;
      const card = event.target.closest(POINTER_TARGET);
      if (!card || !root.contains(card)) return;
      if (active !== card) { reset(active); active = card; }
      pending = { card, x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!pending) return;
        const { card: target, x, y } = pending;
        let cached = rects.get(target);
        if (!cached || cached.revision !== revision) {
          cached = { revision, rect: target.getBoundingClientRect() };
          rects.set(target, cached);
        }
        const { rect } = cached;
        const px = Math.min(1, Math.max(0, (x - rect.left) / rect.width));
        const py = Math.min(1, Math.max(0, (y - rect.top) / rect.height));
        /* ── 只写「真的有消费者」的变量（2026-10 性能收敛）────────────────────
           原来这里无条件写 6 个自定义属性：--spot-x/y、--tilt-x/y、--art-x/y。
           但当前实际渲染的交互目标只剩三类，各自只消费其中一部分：
             .sc-card        →  --spot-x / --spot-y（金色光斑）+ --lift（CSS :hover 给）
             .vr-experience-card → --spot-x / --spot-y
             .vr-contact-row     → --spot-x / --spot-y
           而 --tilt-x/y、--art-x/y 的消费者是 .vr-unified-card / .vr-mathmodel-card /
           .vr-showcase-visual —— 这三个类名在 JSX 里**一次都没有渲染**
           （ShowcaseCard 已无调用点，是死代码）。也就是说每个 pointermove
           都在给不存在的元素写 4 个变量：既让该元素的样式每帧失效，
           又白白产生 4 次 setProperty 调用。
           现在按目标实际消费的变量写入，pointermove 的写入量减少 2/3。 */
        target.style.setProperty('--spot-x', `${px * 100}%`);
        target.style.setProperty('--spot-y', `${py * 100}%`);
        /* 只有仍挂着 3D 倾斜/视差消费者的目标才写这两组变量 */
        if (target.classList.contains('vr-unified-card') || target.classList.contains('vr-mathmodel-card')) {
          const maxTilt = 6;
          target.style.setProperty('--tilt-x', `${(py - 0.5) * maxTilt * 2}deg`);
          target.style.setProperty('--tilt-y', `${(px - 0.5) * maxTilt * 2}deg`);
        }
        if (target.querySelector('.vr-unified-visual, .vr-mathmodel-art, .vr-showcase-visual')) {
          /* 艺术图反向微移，增强透视厚度感（极限 ±16px） */
          target.style.setProperty('--art-x', `${(0.5 - px) * 16}px`);
          target.style.setProperty('--art-y', `${(0.5 - py) * 16}px`);
        }
        target.setAttribute('data-pointer-active', '');
      });
    };
    const onOut = (event) => {
      if (active && !active.contains(event.relatedTarget)) {
        reset(active); active = null; pending = null;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const invalidate = () => { revision += 1; };
    const preferenceChanged = () => { if (motion.matches || !pointer.matches) { reset(active); active = null; pending = null; } };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => target.toggleAttribute('data-card-visible', isIntersecting));
    }, { root: root.parentElement, rootMargin: '80px' }) : null;
    cards.forEach((card) => { card.setAttribute('data-card-visible', ''); observer?.observe(card); });
    const onVisibility = () => root.toggleAttribute('data-page-hidden', document.hidden);
    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerout', onOut, { passive: true });
    document.addEventListener('scroll', invalidate, { capture: true, passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', invalidate);
    motion.addEventListener('change', preferenceChanged);
    pointer.addEventListener('change', preferenceChanged);
    return () => {
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
      cards.forEach(reset);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerout', onOut);
      document.removeEventListener('scroll', invalidate, { capture: true });
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', invalidate);
      motion.removeEventListener('change', preferenceChanged);
      pointer.removeEventListener('change', preferenceChanged);
    };
  }, [rootRef, dependency]);
}
