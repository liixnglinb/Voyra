import { useEffect } from 'react';

/* Delegated, demand-driven pointer work. Scroll/reveal/tilt use separate layers. */
export default function useCardEffects(rootRef, dependency) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const cards = [...root.querySelectorAll('[data-voyra-card], .vr-mathmodel-card, .vr-contact-row, .vr-experience-card')];
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
      const card = event.target.closest('[data-voyra-card], .vr-mathmodel-card, .vr-contact-row');
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
        target.style.setProperty('--spot-x', `${px * 100}%`);
        target.style.setProperty('--spot-y', `${py * 100}%`);
        /* 3D 物理倾斜：鼠标在右 → rotateY 正（卡片向右转）；
           鼠标在下 → rotateX 正（卡片低头）。角度极限 ±8deg（杂志封面微翻转）。 */
        const maxTilt = 8;
        target.style.setProperty('--tilt-x', `${(py - 0.5) * maxTilt * 2}deg`);
        target.style.setProperty('--tilt-y', `${(px - 0.5) * maxTilt * 2}deg`);
        /* 艺术图反向微移，增强透视厚度感（极限 ±16px） */
        target.style.setProperty('--art-x', `${(0.5 - px) * 16}px`);
        target.style.setProperty('--art-y', `${(0.5 - py) * 16}px`);
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
