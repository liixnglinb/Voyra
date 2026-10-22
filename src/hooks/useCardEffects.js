import { useEffect } from 'react';

/* ============================================================================
   卡片动效层（2026-10-13 重写）
   ---------------------------------------------------------------------------
   v5 之前的现状：只有「金色光斑跟随」（--spot-x/y）。
   --tilt-x/y 与 --art-x/y 虽然每帧都在写，但它们的消费者类名
   （.vr-unified-card / .vr-mathmodel-card / .vr-showcase-visual）
   在 JSX 里**一次都没有渲染** —— 那是死代码，每个 pointermove 白写 4 个变量。

   v5 激活它们，并新增三层：
     ① 光斑跟随   --spot-x/y    金色光斑跟着指针走（已有）
     ② 卡片倾斜   --tilt-x/y    整卡绕 X/Y 轴微转，幅度 ±3.2deg
     ③ 内容视差   --par-x/y     截图反向微移 ±5px，比卡片慢 → 立体感
     ④ 高度抬升   --lift        CSS :hover 给，不用 JS

   性能约定（照旧，且更严格）：
     · 所有几何量走 rAF 节流，pointermove 每帧最多一次 setProperty 批次
     · getBoundingClientRect 按 revision 缓存，只在 scroll/resize 时失效
     · pointermove / pointerout 全部 { passive: true }
     · prefers-reduced-motion 下完全停手（matchMedia 双重保险：注册前查 + change 监听）
     · hover:none / 触摸设备不启用（避免移动端掉帧与误触）
   ========================================================================== */

export default function useCardEffects(rootRef, dependency) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    /* 参与指针交互的元素。.sc-card 是首页橱窗卡本体；
       .vr-mathmodel-card / .vr-contact-row / .vr-experience-card 是
       「关于我」区块里的三类卡，它们也各有光斑消费者。 */
    const POINTER_TARGET =
      '[data-voyra-card], .sc-card, .vr-mathmodel-card, .vr-contact-row, .vr-experience-card';

    const cards = [...root.querySelectorAll(POINTER_TARGET)];

    /* rect 缓存：getBoundingClientRect 会触发强制布局，pointermove 里绝不能直接调。
       用 revision 号做失效标记，scroll/resize 时 revision+1 就全体作废。 */
    const rects = new WeakMap();
    let revision = 0;
    let frame = 0;
    let pending = null;
    let active = null;

    const reset = (card) => {
      if (!card) return;
      card.removeAttribute('data-pointer-active');
      ['--spot-x', '--spot-y', '--tilt-x', '--tilt-y', '--par-x', '--par-y'].forEach((key) =>
        card.style.removeProperty(key),
      );
    };

    /* 指针是否在卡片内部（用于区分「进入」与「移动」，减少 reset 抖动） */
    const isInside = (card, x, y, rect) =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    const onMove = (event) => {
      if (motion.matches || !pointer.matches || event.pointerType === 'touch') return;
      const card = event.target.closest?.(POINTER_TARGET);
      if (!card || !root.contains(card)) return;

      pending = { card, x: event.clientX, y: event.clientY };
      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        const p = pending;
        if (!p) return;
        const { card: target, x, y } = p;

        /* 1. 取缓存的 rect（miss 才测一次） */
        let cached = rects.get(target);
        if (!cached || cached.revision !== revision) {
          cached = { revision, rect: target.getBoundingClientRect() };
          rects.set(target, cached);
        }
        const { rect } = cached;

        /* 2. 指针已离开卡片范围：直接复位，不要继续写变量
           （pointerout 在某些情况下不触发，尤其是元素被 transform 移走时） */
        if (!isInside(target, x, y, rect)) {
          if (active === target) { reset(target); active = null; }
          pending = null;
          return;
        }

        if (active !== target) { reset(active); active = target; }

        /* 3. 归一化坐标 0~1 */
        const px = Math.min(1, Math.max(0, (x - rect.left) / rect.width));
        const py = Math.min(1, Math.max(0, (y - rect.top) / rect.height));

        /* ── ① 光斑：跟着指针精确走 ──────────────────────────────────────────
           半径 170px 的径向渐变，光心就是指针位置。 */
        target.style.setProperty('--spot-x', `${(px * 100).toFixed(2)}%`);
        target.style.setProperty('--spot-y', `${(py * 100).toFixed(2)}%`);

        /* ── ② 卡片倾斜：绕 X/Y 轴微转 ─────────────────────────────────────
           幅度 ±3.2deg。比参考站的 ±5deg 小 —— 本站卡片是 300px 高的浅色卡，
           5deg 在浅底上能明显看到梯形畸变，3.2deg 只在边缘有一点厚度感。
           只有真正有 transform 消费者的目标才写（.sc-card 现在有了）。 */
        const TILT = 3.2;
        const dx = (px - 0.5) * 2;   // -1 ~ 1
        const dy = (py - 0.5) * 2;
        target.style.setProperty('--tilt-x', `${(-dy * TILT).toFixed(3)}deg`);
        target.style.setProperty('--tilt-y', `${(dx * TILT).toFixed(3)}deg`);

        /* ── ③ 内容视差：截图反向微移 ─────────────────────────────────────
           卡片向右倾时截图往左移一点，两层速度差 = 立体感。
           幅度 ±5px —— 比 Vercel 那套常用的 ±8px 收小，因为本站截图
           本身信息密度高（终端、日历），位移大了会看不清内容。 */
        const PAR = 5;
        target.style.setProperty('--par-x', `${(-dx * PAR).toFixed(2)}px`);
        target.style.setProperty('--par-y', `${(-dy * PAR).toFixed(2)}px`);

        target.setAttribute('data-pointer-active', '');
      });
    };

    const onOut = (event) => {
      if (active && !active.contains(event.relatedTarget)) {
        reset(active);
        active = null;
        pending = null;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const invalidate = () => { revision += 1; };

    const preferenceChanged = () => {
      if (motion.matches || !pointer.matches) {
        reset(active);
        active = null;
        pending = null;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    /* 卡片可见性：只有进入视口的卡才跑入场/舞台动画，
       离开视口的暂停（IntersectionObserver，见 CSS 里的 animation-play-state）。 */
    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach(({ target, isIntersecting }) =>
                target.toggleAttribute('data-card-visible', isIntersecting),
              );
            },
            { root: null, rootMargin: '80px' },
          )
        : null;

    cards.forEach((card) => {
      card.setAttribute('data-card-visible', '');
      observer?.observe(card);
    });

    const onVisibility = () => root.toggleAttribute('data-page-hidden', document.hidden);
    onVisibility();

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
