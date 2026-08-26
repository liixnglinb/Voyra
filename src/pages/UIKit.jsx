import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Home } from 'lucide-react';
import { UI_CATS, UI_COMPONENTS } from '../data/uikit-components';

/* ============================================================
   UI 组件图鉴 · 开发者查阅工具页
   - 页面自身即 01 号组件的活演示：顶部通栏导航，滚动后变形为悬浮胶囊吸顶
   - 40 个组件 × 6 分类，每张卡片：中文名 / 英文专业名 / 外观 / 场景 / 原理
   - 每张卡片内嵌循环动效演示，点击卡片展开 / 收起
   ============================================================ */

export default function UIKit() {
  const [shrunk, setShrunk] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [cat, setCat] = useState('all');
  const rootRef = useRef(null);

  useEffect(() => {
    const findScroller = (el) => {
      let node = el && el.parentElement;
      while (node) {
        const oy = getComputedStyle(node).overflowY;
        if (oy === 'auto' || oy === 'scroll') return node;
        node = node.parentElement;
      }
      return null;
    };
    const scroller = findScroller(rootRef.current);
    const onScroll = () => {
      const y = scroller ? scroller.scrollTop : window.scrollY;
      setShrunk(y > 90);
    };
    if (scroller) scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      if (scroller) scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const toggle = (no) => setOpenId((cur) => (cur === no ? null : no));
  const jump = (catKey) => {
    setCat(catKey);
    window.setTimeout(() => document.getElementById(`cat-${catKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const shown = cat === 'all' ? UI_COMPONENTS : UI_COMPONENTS.filter((c) => c.cat === cat);

  return <div className="uikit-page" ref={rootRef}>
    <style>{`
      .uikit-page { min-height:100vh; color:#1b1b1b; background:#fff;
        background-image:linear-gradient(rgba(0,0,0,.031) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.031) 1px,transparent 1px);
        background-size:32px 32px;
        font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; }
      .uikit-page * { box-sizing:border-box; }
      .uikit-page button { cursor:pointer; font:inherit; }
      .uikit-page button:focus-visible, .uikit-page a:focus-visible { outline:2px solid #1b1b1b; outline-offset:3px; }

      /* ===== 变形胶囊导航 ===== */
      .ui-nav { position:fixed; top:18px; left:50%; transform:translateX(-50%); z-index:60;
        display:flex; align-items:center; justify-content:space-between; gap:24px;
        width:min(100% - 48px, 1160px); padding:15px 24px;
        border:1px solid rgba(27,27,27,.07); border-radius:16px; background:rgba(255,255,255,.4);
        transition:width .5s cubic-bezier(.16,1,.3,1), padding .5s cubic-bezier(.16,1,.3,1), top .5s cubic-bezier(.16,1,.3,1), border-radius .5s cubic-bezier(.16,1,.3,1), background .4s ease, box-shadow .4s ease, border-color .4s ease; }
      .ui-nav.is-shrunk { top:12px; width:min(100% - 40px, 680px); padding:9px 20px;
        border:1px solid rgba(27,27,27,.1); border-radius:999px; background:rgba(255,255,255,.85);
        backdrop-filter:blur(14px) saturate(140%); -webkit-backdrop-filter:blur(14px) saturate(140%);
        box-shadow:0 14px 34px -18px rgba(20,20,20,.4); }
      .ui-nav-logo { display:inline-flex; align-items:center; gap:8px; color:#1b1b1b; font-weight:760; font-size:14.5px; text-decoration:none; white-space:nowrap; }
      .ui-nav-logo i { width:9px; height:9px; flex:0 0 auto; border:1.5px solid #a48830; border-radius:50%; }
      .ui-nav-logo em { font-style:normal; color:#999; font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.06em; transition:opacity .3s ease; }
      .ui-nav.is-shrunk .ui-nav-logo em { opacity:0; width:0; overflow:hidden; }
      .ui-nav-links { display:inline-flex; align-items:center; gap:4px; }
      .ui-nav-links button, .ui-nav-home { display:inline-flex; align-items:center; gap:5px; border:0; border-radius:8px; padding:7px 11px; background:transparent; color:#666; font-size:12.5px; font-weight:600; text-decoration:none; white-space:nowrap; transition:background .18s ease, color .18s ease; }
      .ui-nav-links button:hover, .ui-nav-home:hover { background:#ffe08a; color:#1b1b1b; }
      .ui-nav-links button { transition:background .18s ease, color .18s ease, opacity .35s ease, max-width .45s cubic-bezier(.16,1,.3,1), padding .45s cubic-bezier(.16,1,.3,1); }
      .ui-nav.is-shrunk .ui-nav-links button { max-width:0; opacity:0; padding:7px 0; overflow:hidden; }
      .ui-nav.is-shrunk .ui-nav-home { background:transparent; }
      .ui-nav.is-shrunk .ui-nav-home:hover { background:#ffe08a; }

      /* ===== Hero ===== */
      .ui-hero { width:min(100% - 48px, 1160px); margin:0 auto; padding:150px 0 40px; text-align:left; }
      .ui-hero-kicker { color:#a0a0a0; font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.14em; }
      .ui-hero h1 { margin:18px 0 0; font-size:clamp(52px, 8vw, 96px); font-weight:800; line-height:.98; letter-spacing:-.02em; }
      .ui-hero h1 span { color:transparent; -webkit-text-stroke:2px #1b1b1b; text-shadow:6px 6px 0 rgba(255,224,138,.45); }
      .ui-hero p { max-width:560px; margin:26px 0 0; color:#5c5c5c; font-size:15.5px; line-height:1.9; }
      .ui-hero-stats { display:flex; flex-wrap:wrap; gap:10px 26px; margin-top:30px; color:#666; font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .ui-hero-stats b { color:#1b1b1b; font-size:15px; font-weight:750; margin-right:6px; }
      .ui-hero-cue { display:inline-flex; align-items:center; gap:7px; margin-top:30px; color:#999; font-size:12.5px; animation:ui-cue 1.8s ease-in-out infinite; }
      @keyframes ui-cue { 50% { transform:translateY(5px); } }

      /* ===== 分类筛选 ===== */
      .ui-cats { position:sticky; top:0; z-index:40; width:min(100% - 48px, 1160px); margin:0 auto;
        display:flex; align-items:center; gap:6px; padding:12px 0; overflow-x:auto; scrollbar-width:none;
        background:linear-gradient(180deg, rgba(255,255,255,.95) 80%, transparent); }
      .ui-cats::-webkit-scrollbar { display:none; }
      .ui-cat { flex:0 0 auto; display:inline-flex; align-items:center; gap:6px; border:1px solid rgba(27,27,27,.13); border-radius:99px; padding:8px 15px; background:#fff; color:#666; font-size:12.5px; font-weight:650; transition:all .18s ease; }
      .ui-cat b { color:#b5b5b5; font:600 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .ui-cat:hover { border-color:rgba(27,27,27,.3); color:#1b1b1b; }
      .ui-cat.is-active { border-color:#d7b846; background:#ffe08a; color:#1b1b1b; }
      .ui-cat.is-active b { color:rgba(27,27,27,.5); }

      /* ===== 卡片列表 ===== */
      .ui-list { width:min(100% - 48px, 880px); margin:0 auto; padding:16px 0 90px; display:grid; gap:16px; }
      .ui-card { position:relative; border:1px solid rgba(27,27,27,.12); border-radius:14px; background:rgba(255,255,255,.92);
        padding:20px 22px 18px; cursor:pointer; overflow:hidden;
        transition:border-color .22s ease, box-shadow .22s ease, transform .22s cubic-bezier(.16,1,.3,1); }
      .ui-card:hover { border-color:rgba(164,136,48,.5); box-shadow:0 16px 32px -26px rgba(0,0,0,.4); transform:translateY(-2px); }
      .ui-card.is-open { border-color:rgba(164,136,48,.65); box-shadow:0 22px 44px -30px rgba(0,0,0,.45); cursor:default; }
      .ui-card-top { display:flex; align-items:flex-start; gap:14px; }
      .ui-no { flex:0 0 auto; color:transparent; -webkit-text-stroke:1px rgba(164,136,48,.55); font:800 30px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .ui-card-name { display:grid; gap:3px; min-width:0; }
      .ui-card-name h3 { margin:0; font-size:19px; font-weight:760; letter-spacing:-.01em; }
      .ui-card-name em { color:#a48830; font:650 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace; font-style:normal; }
      .ui-card-cat { margin-left:auto; flex:0 0 auto; padding:4px 11px; border:1px solid rgba(27,27,27,.12); border-radius:99px; color:#888; font-size:11px; font-weight:600; }
      .ui-chevron { flex:0 0 auto; align-self:center; color:#999; transition:transform .35s cubic-bezier(.16,1,.3,1); }
      .ui-card.is-open .ui-chevron { transform:rotate(180deg); color:#a48830; }
      .ui-look { margin:13px 0 0; color:#5c5c5c; font-size:13.5px; line-height:1.85; }
      .ui-detail { display:grid; grid-template-rows:0fr; transition:grid-template-rows .5s cubic-bezier(.16,1,.3,1); }
      .ui-card.is-open .ui-detail { grid-template-rows:1fr; }
      .ui-detail-inner { overflow:hidden; }
      .ui-detail-body { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:20px; padding-top:16px; }
      .ui-demo { border:1px solid rgba(27,27,27,.1); border-radius:11px; background:#fafaf8; padding:14px; align-self:start; overflow:hidden; }
      .ui-demo p { margin:11px 0 0; color:#a0a0a0; font-size:10.5px; text-align:center; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
      .ui-fields { display:grid; gap:14px; align-content:start; }
      .ui-field h4 { display:flex; align-items:center; gap:7px; margin:0; font-size:12px; font-weight:750; color:#1b1b1b; }
      .ui-field h4::before { content:""; width:8px; height:8px; border-radius:2px; background:#ffe08a; border:1px solid rgba(164,136,48,.5); }
      .ui-field p { margin:6px 0 0; color:#5c5c5c; font-size:12.5px; line-height:1.85; }

      /* ===== 迷你演示通用 ===== */
      .uikit-page .ui-demo p { text-align:center; }
      .d-browser { border:1px solid #e2e2e2; border-radius:8px; background:#fff; padding:10px; display:grid; gap:8px; }
      .d-browser i { width:7px; height:7px; border-radius:50%; background:#ddd; display:inline-block; margin-right:4px; }
      .d-nav-wide { display:flex; align-items:center; justify-content:space-between; border:1px dashed #cfcfcf; border-radius:6px; padding:8px 10px; font-size:10px; color:#777; }
      .d-nav-wide b { font-size:10px; color:#1b1b1b; }
      .d-nav-morph { margin:0 auto; display:flex; align-items:center; justify-content:space-between; font-size:10px; color:#8a6d1c;
        border:1px dashed #cfcfcf; border-radius:6px; padding:8px 10px; width:100%; background:#fff;
        animation:dk-morph 3.2s cubic-bezier(.16,1,.3,1) infinite; }
      .d-nav-morph b { font-size:10px; color:#1b1b1b; }
      @keyframes dk-morph {
        0%, 38% { width:100%; border-radius:6px; border-style:dashed; border-color:#cfcfcf; background:#fff; box-shadow:none; padding:8px 10px; color:#777; }
        55%, 88% { width:72%; border-radius:99px; border-style:solid; border-color:rgba(164,136,48,.5); background:#fff9df; box-shadow:0 4px 12px -6px rgba(164,136,48,.6); padding:8px 14px; color:#8a6d1c; }
        100% { width:100%; border-radius:6px; border-style:dashed; border-color:#cfcfcf; background:#fff; box-shadow:none; padding:8px 10px; color:#777; }
      }
      .d-tabs { display:flex; gap:6px; }
      .d-tab { flex:1; min-width:0; display:inline-flex; align-items:center; gap:5px; padding:7px 8px; border:1px solid #e2e2e2; border-radius:7px; background:#f4f4f2; font-size:9px; color:#666; white-space:nowrap; overflow:hidden; }
      .d-tab.is-on { background:#fff; color:#1b1b1b; font-weight:650; border-bottom:2px solid #d4a930; }
      .d-fav { display:grid; place-items:center; width:14px; height:14px; flex:0 0 14px; border-radius:4px; background:#1b1b1b; color:#ffe08a; font:800 8px/1 sans-serif; font-style:normal; }
      .d-fav2 { background:#24292e; color:#fff; }
      .d-fav3 { background:#3b5bff; color:#fff; }
      .d-tab1 { animation:dk-tab 3s infinite; }
      .d-tab2 { animation:dk-tab 3s 1s infinite; }
      .d-tab3 { animation:dk-tab 3s 2s infinite; }
      @keyframes dk-tab { 0%, 30% { background:#f4f4f2; color:#666; border-bottom-width:1px; border-bottom-color:#e2e2e2; } 38%, 92% { background:#fff; color:#1b1b1b; font-weight:650; border-bottom-width:2px; border-bottom-color:#d4a930; } 100% { background:#f4f4f2; color:#666; border-bottom-width:1px; border-bottom-color:#e2e2e2; } }
      .d-token-head, .d-token-row { display:grid; grid-template-columns:56px 1fr 34px; gap:8px; align-items:center; padding:6px 8px; font-size:10px; }
      .d-token-head { color:#a0a0a0; border-bottom:1px solid #e8e8e8; }
      .d-token-row { border-bottom:1px solid #f0f0f0; }
      .d-token-row b { font-weight:600; color:#333; }
      .d-token-row code { font:9px/1.4 ui-monospace,monospace; color:#8a6d1c; background:#fff9df; border-radius:4px; padding:2px 6px; }
      .d-token-row em { color:#a48830; font-style:normal; font-weight:700; }
      .d-token-copy { animation:dk-copy 2.6s infinite; }
      @keyframes dk-copy { 0%, 55% { color:#a48830; } 62%, 90% { color:#3a8a4d; } 100% { color:#a48830; } }
      .d-dash { display:grid; grid-template-columns:1fr 1fr; grid-template-rows:auto auto; gap:7px; }
      .d-dash .d-kpi { border:1px solid #e5e5e5; border-radius:7px; padding:8px 10px; background:#fff; }
      .d-dash .d-kpi span { display:block; font-size:8.5px; color:#a0a0a0; }
      .d-dash .d-kpi b { font-size:15px; color:#1b1b1b; }
      .d-dash .d-chart { grid-column:1 / -1; display:flex; align-items:flex-end; gap:6px; height:52px; border:1px solid #e5e5e5; border-radius:7px; padding:8px; background:#fff; }
      .d-dash .d-chart i { flex:1; border-radius:3px 3px 0 0; background:linear-gradient(180deg,#d4a930,#efe3b0); transform-origin:bottom; animation:dk-bar 2.4s ease-in-out infinite; }
      .d-dash .d-chart i:nth-child(2) { animation-delay:.2s; } .d-dash .d-chart i:nth-child(3) { animation-delay:.4s; }
      .d-dash .d-chart i:nth-child(4) { animation-delay:.6s; } .d-dash .d-chart i:nth-child(5) { animation-delay:.8s; }
      @keyframes dk-bar { 0%, 100% { transform:scaleY(.55); } 50% { transform:scaleY(1); } }
      .d-masonry { columns:3; column-gap:6px; }
      .d-masonry span { display:block; margin-bottom:6px; border-radius:5px; background:linear-gradient(135deg,#fff3c4,#ffe08a); border:1px solid rgba(164,136,48,.35); break-inside:avoid; }
      .d-masonry .d-fall { animation:dk-fall 2.8s ease-in infinite; }
      @keyframes dk-fall { 0% { opacity:0; transform:translateY(-26px); } 18%, 82% { opacity:1; transform:translateY(0); } 100% { opacity:0; transform:translateY(-26px); } }
      .d-slider { display:grid; grid-template-columns:74px 1fr 30px; align-items:center; gap:8px; margin-bottom:9px; font-size:10px; color:#555; }
      .d-track { position:relative; height:5px; border-radius:99px; background:#e8e8e4; display:block; }
      .d-fill { position:absolute; left:0; top:0; height:100%; border-radius:99px; background:#d4a930; display:block; }
      .d-knob { position:absolute; top:50%; width:12px; height:12px; border-radius:50%; background:#fff; border:2px solid #a48830; transform:translate(-50%,-50%); display:block; }
      .d-knob-anim { animation:dk-knob 2.6s ease-in-out infinite; }
      .d-knob-anim2 { animation:dk-knob2 3.4s ease-in-out infinite; }
      @keyframes dk-knob { 0%, 100% { left:30%; } 50% { left:78%; } }
      @keyframes dk-knob2 { 0%, 100% { left:82%; } 50% { left:38%; } }
      .d-slider b { text-align:right; font-weight:700; color:#1b1b1b; }
      .d-ctx-input { position:relative; border:1px solid #e0e0e0; border-radius:7px; background:#fff; padding:9px 11px; font-size:10px; color:#999; }
      .d-ctx-input::after { content:"|"; color:#a48830; animation:dk-caret 1s steps(1) infinite; }
      @keyframes dk-caret { 50% { opacity:0; } }
      .d-ctx-input em { position:absolute; right:9px; bottom:6px; font:9px/1 ui-monospace,monospace; font-style:normal; color:#a48830; }
      .d-ctx-bar { height:6px; margin-top:7px; border-radius:99px; background:#eee; overflow:hidden; }
      .d-ctx-bar i { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg,#d4a930,#e8c96a); animation:dk-ctx 3s ease-in-out infinite; }
      @keyframes dk-ctx { 0% { width:8%; } 70% { width:86%; background:linear-gradient(90deg,#e07830,#e8a06a); } 100% { width:8%; } }
      .d-select { display:flex; align-items:center; justify-content:space-between; border:1px solid #e0e0e0; border-radius:7px; background:#fff; padding:8px 11px; font-size:10.5px; font-weight:650; color:#333; }
      .d-select i { color:#999; font-style:normal; animation:dk-caret 1.4s steps(1) infinite; }
      .d-select-panel { border:1px solid rgba(164,136,48,.4); border-radius:7px; background:#fff; box-shadow:0 8px 18px -10px rgba(164,136,48,.4); margin-top:6px; overflow:hidden; transform-origin:top; animation:dk-drop 3s cubic-bezier(.16,1,.3,1) infinite; }
      .d-select-panel span { display:block; padding:6px 11px; font-size:9.5px; color:#666; }
      .d-select-panel span.on { background:#fff9df; color:#8a6d1c; font-weight:700; }
      @keyframes dk-drop { 0%, 30% { opacity:0; transform:scaleY(.6); } 45%, 82% { opacity:1; transform:scaleY(1); } 95%, 100% { opacity:0; transform:scaleY(.6); } }
      .d-usage { display:flex; align-items:center; gap:12px; }
      .d-usage-copy b { display:block; font-size:16px; color:#1b1b1b; }
      .d-usage-copy span { font-size:9px; color:#a0a0a0; }
      .d-card-demo { border:1px solid #e5e5e5; border-radius:8px; background:#fff; overflow:hidden; animation:dk-card 2.6s ease-in-out infinite; }
      .d-card-demo .d-card-img { height:44px; background:linear-gradient(135deg,#fff3c4,#ffe08a); }
      .d-card-demo .d-card-body { padding:8px 10px; font-size:9.5px; color:#666; }
      .d-card-demo .d-card-body b { display:block; font-size:10.5px; color:#1b1b1b; margin-bottom:2px; }
      @keyframes dk-card { 0%, 100% { transform:translateY(0); box-shadow:0 1px 2px rgba(0,0,0,.06); } 50% { transform:translateY(-5px); box-shadow:0 12px 22px -12px rgba(0,0,0,.35); } }
      .d-stat { text-align:left; }
      .d-stat b { display:inline-block; font-size:24px; font-weight:800; color:#1b1b1b; font-variant-numeric:tabular-nums; }
      .d-stat .d-nums { display:inline-flex; overflow:hidden; height:24px; vertical-align:bottom; }
      .d-stat .d-nums i { display:block; font-style:normal; animation:dk-num 2.4s cubic-bezier(.16,1,.3,1) infinite; }
      @keyframes dk-num { 0%, 12% { transform:translateY(0); } 45%, 78% { transform:translateY(-24px); } 100% { transform:translateY(-48px); } }
      .d-stat .d-trend { margin-left:6px; font:700 10px/1 ui-monospace,monospace; color:#3a8a4d; }
      .d-tl { position:relative; padding-left:16px; display:grid; gap:9px; }
      .d-tl::before { content:""; position:absolute; left:4px; top:6px; bottom:6px; width:1.5px; background:#e2e2e2; }
      .d-tl-item { position:relative; font-size:9.5px; color:#666; }
      .d-tl-item::before { content:""; position:absolute; left:-15.5px; top:2px; width:8px; height:8px; border-radius:50%; background:#cfcfcf; border:1.5px solid #fff; box-shadow:0 0 0 1px #e2e2e2; }
      .d-tl-item.done { color:#1b1b1b; font-weight:650; }
      .d-tl-item.done::before { background:#d4a930; box-shadow:0 0 0 1px #d4a930; }
      .d-tl-item.now::before { background:#fff; border-color:#d4a930; box-shadow:0 0 0 2px rgba(212,169,48,.4); animation:dk-pulse 1.6s ease-in-out infinite; }
      @keyframes dk-pulse { 50% { box-shadow:0 0 0 5px rgba(212,169,48,.15); } }
      .d-carousel { overflow:hidden; border:1px solid #e5e5e5; border-radius:8px; background:#fff; }
      .d-carousel-track { display:flex; width:300%; animation:dk-car 4.5s ease-in-out infinite; }
      .d-carousel-track i { flex:1; height:52px; font-style:normal; display:grid; place-items:center; font-size:10px; color:#8a6d1c; }
      .d-carousel-track i:nth-child(1) { background:linear-gradient(135deg,#fff3c4,#ffe08a); }
      .d-carousel-track i:nth-child(2) { background:linear-gradient(135deg,#e8f0ff,#c9dcff); color:#3b5bff; }
      .d-carousel-track i:nth-child(3) { background:linear-gradient(135deg,#e6f7ef,#c9ecd9); color:#2f9e6e; }
      @keyframes dk-car { 0%, 28% { transform:translateX(0); } 36%, 61% { transform:translateX(-33.333%); } 69%, 94% { transform:translateX(-66.666%); } 100% { transform:translateX(0); } }
      .d-empty { display:grid; place-items:center; gap:6px; padding:12px 0 4px; }
      .d-empty i { width:34px; height:34px; border-radius:10px; border:1.5px dashed #cfcfcf; display:block; animation:dk-float 2.6s ease-in-out infinite; }
      .d-empty span { font-size:9.5px; color:#a0a0a0; }
      @keyframes dk-float { 50% { transform:translateY(-4px); } }
      .d-skel { display:grid; gap:7px; }
      .d-skel i { display:block; height:10px; border-radius:4px; background:linear-gradient(90deg,#f0f0ee 25%,#fafaf8 50%,#f0f0ee 75%); background-size:200% 100%; animation:sk-shimmer 1.3s infinite; font-style:normal; }
      .d-skel i:nth-child(2) { width:88%; } .d-skel i:nth-child(3) { width:62%; }
      @keyframes sk-shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
      .d-toast { display:flex; justify-content:flex-end; min-height:64px; align-items:flex-start; padding-top:4px; }
      .d-toast span { display:inline-flex; align-items:center; gap:6px; border:1px solid #e2e2e2; border-radius:8px; background:#fff; box-shadow:0 8px 20px -10px rgba(0,0,0,.3); padding:7px 12px; font-size:10px; color:#333; animation:dk-toast 3s cubic-bezier(.16,1,.3,1) infinite; }
      .d-toast span::before { content:"✓"; color:#3a8a4d; font-weight:800; }
      @keyframes dk-toast { 0% { opacity:0; transform:translateY(-14px); } 12%, 78% { opacity:1; transform:translateY(0); } 92%, 100% { opacity:0; transform:translateY(-10px); } }
      .d-modal-stage { position:relative; height:74px; border-radius:8px; background:#ececea; overflow:hidden; }
      .d-modal-stage::before { content:""; position:absolute; inset:0; background:rgba(20,20,20,.35); animation:dk-fade 3s ease-in-out infinite; }
      .d-modal-box { position:absolute; left:50%; top:50%; width:64%; padding:9px 11px; border-radius:8px; background:#fff; box-shadow:0 12px 26px -10px rgba(0,0,0,.4); font-size:9.5px; color:#333; transform:translate(-50%,-50%); animation:dk-modal 3s cubic-bezier(.34,1.56,.64,1) infinite; }
      .d-modal-box b { display:block; font-size:10.5px; margin-bottom:3px; color:#1b1b1b; }
      @keyframes dk-modal { 0%, 18% { opacity:0; transform:translate(-50%,-46%) scale(.85); } 30%, 80% { opacity:1; transform:translate(-50%,-50%) scale(1); } 94%, 100% { opacity:0; transform:translate(-50%,-46%) scale(.85); } }
      @keyframes dk-fade { 0%, 18% { opacity:0; } 30%, 80% { opacity:1; } 94%, 100% { opacity:0; } }
      .d-drawer-stage { position:relative; height:74px; border-radius:8px; background:#f1f1ef; border:1px solid #e5e5e5; overflow:hidden; }
      .d-drawer-panel { position:absolute; right:0; top:0; bottom:0; width:46%; background:#fff; border-left:1px solid #e5e5e5; padding:9px 10px; font-size:9px; color:#666; box-shadow:-8px 0 18px -10px rgba(0,0,0,.25); animation:dk-drawer 3.2s cubic-bezier(.16,1,.3,1) infinite; }
      .d-drawer-panel b { display:block; font-size:10px; color:#1b1b1b; margin-bottom:4px; }
      @keyframes dk-drawer { 0%, 22% { transform:translateX(100%); } 38%, 78% { transform:translateX(0); } 92%, 100% { transform:translateX(100%); } }
      .d-tip-wrap { display:grid; place-items:center; padding:14px 0 20px; }
      .d-tip-trigger { position:relative; border:1px solid #e0e0e0; border-radius:7px; background:#fff; padding:6px 14px; font-size:10px; color:#555; }
      .d-tip-bubble { position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%); background:#1b1b1b; color:#fff; border-radius:6px; padding:5px 9px; font-size:9px; white-space:nowrap; animation:dk-tip 2.8s cubic-bezier(.16,1,.3,1) infinite; }
      .d-tip-bubble::after { content:""; position:absolute; top:100%; left:50%; transform:translateX(-50%); border:4px solid transparent; border-top-color:#1b1b1b; }
      @keyframes dk-tip { 0%, 22% { opacity:0; transform:translateX(-50%) translateY(4px) scale(.9); } 34%, 80% { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } 92%, 100% { opacity:0; transform:translateX(-50%) translateY(4px) scale(.9); } }
      .d-prog { height:8px; border-radius:99px; background:#eee; overflow:hidden; }
      .d-prog i { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg,#d4a930,#e8c96a); animation:dk-prog 2.8s cubic-bezier(.4,0,.2,1) infinite; }
      @keyframes dk-prog { 0% { width:4%; } 75% { width:96%; } 100% { width:4%; } }
      .d-spinner { display:grid; place-items:center; padding:8px 0; }
      .d-spinner i { width:26px; height:26px; border-radius:50%; border:3px solid #eee; border-top-color:#a48830; display:block; animation:sk-rot 0.8s linear infinite; }
      @keyframes sk-rot { to { transform:rotate(360deg); } }
      .d-sidebar-stage { display:flex; height:74px; border:1px solid #e5e5e5; border-radius:8px; overflow:hidden; background:#fff; }
      .d-sidebar { width:52px; flex:0 0 auto; background:#1b1b1b; display:grid; align-content:start; gap:6px; padding:9px 8px; transition:width .5s cubic-bezier(.16,1,.3,1); overflow:hidden; animation:dk-sidebar 3.4s cubic-bezier(.16,1,.3,1) infinite; }
      .d-sidebar i { height:7px; border-radius:4px; background:rgba(255,255,255,.35); display:block; font-style:normal; }
      .d-sidebar i:first-child { background:#ffe08a; }
      .d-sidebar-main { flex:1; padding:9px 10px; font-size:9px; color:#a0a0a0; }
      @keyframes dk-sidebar { 0%, 22% { width:52px; } 38%, 78% { width:26px; } 92%, 100% { width:52px; } }
      .d-split { display:flex; gap:5px; height:64px; }
      .d-split i { border-radius:8px; display:block; font-style:normal; transition:flex 1.2s cubic-bezier(.16,1,.3,1); }
      .d-split .d-split-l { background:linear-gradient(135deg,#fff3c4,#ffe08a); border:1px solid rgba(164,136,48,.4); animation:dk-splitl 3.6s ease-in-out infinite; }
      .d-split .d-split-r { flex:1; background:#fff; border:1px solid #e5e5e5; display:grid; place-items:center; font-size:9px; color:#999; }
      @keyframes dk-splitl { 0%, 100% { flex:.9; } 50% { flex:1.6; } }
      .d-grid-demo { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; animation:dk-gridcols 4s ease-in-out infinite; }
      .d-grid-demo span { height:30px; border-radius:6px; background:linear-gradient(135deg,#fff3c4,#ffe08a); border:1px solid rgba(164,136,48,.35); }
      @keyframes dk-gridcols { 0%, 28% { grid-template-columns:repeat(4,1fr); } 40%, 72% { grid-template-columns:repeat(2,1fr); } 85%, 100% { grid-template-columns:repeat(4,1fr); } }
      .d-trans { display:inline-block; padding:7px 16px; border-radius:8px; font-size:10.5px; font-weight:700; color:#fff; animation:dk-trans 2.4s ease-in-out infinite; }
      @keyframes dk-trans { 0%, 100% { background:#1b1b1b; } 50% { background:#d4a930; } }
      .d-ease { display:flex; align-items:flex-end; gap:14px; height:64px; justify-content:center; }
      .d-ease i { width:16px; height:16px; border-radius:50%; background:#1b1b1b; display:block; animation:dk-ease 2s infinite; }
      .d-ease i:nth-child(1) { background:#c9c9c9; animation-timing-function:linear; }
      .d-ease i:nth-child(2) { background:#8a8a8a; animation-timing-function:ease-in; }
      .d-ease i:nth-child(3) { animation-timing-function:cubic-bezier(.16,1,.3,1); }
      @keyframes dk-ease { 0% { transform:translateY(-44px); } 55%, 100% { transform:translateY(0); } }
      .d-spring { display:grid; place-items:center; padding:6px 0; }
      .d-spring i { display:grid; place-items:center; width:52px; height:30px; border-radius:9px; background:#1b1b1b; color:#ffe08a; font:700 10px/1 sans-serif; font-style:normal; animation:dk-spring 2.2s cubic-bezier(.34,1.56,.64,1) infinite; }
      @keyframes dk-spring { 0% { transform:scale(.5); opacity:0; } 22%, 78% { transform:scale(1); opacity:1; } 100% { transform:scale(.5); opacity:0; } }
      .d-fade { display:grid; place-items:center; gap:8px; }
      .d-fade i { display:grid; place-items:center; width:100%; height:34px; border-radius:8px; background:#fff9df; border:1px solid rgba(164,136,48,.4); color:#8a6d1c; font:650 10px/1 sans-serif; font-style:normal; animation:dk-fade 2.8s ease-in-out infinite; }
      @keyframes dk-fade { 0%, 100% { opacity:.12; transform:translateY(6px); } 50% { opacity:1; transform:translateY(0); } }
      .d-bread { display:flex; align-items:center; gap:6px; font-size:10px; color:#999; flex-wrap:wrap; }
      .d-bread b { color:#1b1b1b; font-weight:650; }
      .d-bread em { font-style:normal; animation:dk-bread 2.8s ease-in-out infinite; }
      @keyframes dk-bread { 0%, 100% { color:#a48830; } 50% { color:#1b1b1b; } }
      .d-steps { display:flex; align-items:center; gap:0; }
      .d-step { display:grid; justify-items:center; gap:4px; font-size:8.5px; color:#a0a0a0; }
      .d-step i { display:grid; place-items:center; width:20px; height:20px; border-radius:50%; background:#eee; color:#999; font:700 9px/1 sans-serif; font-style:normal; }
      .d-step.done i { background:#d4a930; color:#fff; }
      .d-step.done { color:#1b1b1b; }
      .d-step.now i { background:#fff; border:2px solid #d4a930; color:#a48830; animation:dk-pulse 1.6s ease-in-out infinite; }
      .d-step.now { color:#1b1b1b; font-weight:700; }
      .d-step-line { width:22px; height:1.5px; background:#e2e2e2; margin:0 3px 14px; }
      .d-step-line.fill { background:#d4a930; }
      .d-drop-wrap { position:relative; display:inline-block; }
      .d-drop-trigger { display:inline-flex; align-items:center; gap:6px; border:1px solid #e0e0e0; border-radius:7px; background:#fff; padding:6px 12px; font-size:10px; font-weight:650; color:#333; }
      .d-drop-menu { position:absolute; top:calc(100% + 5px); left:0; width:110px; background:#fff; border:1px solid rgba(164,136,48,.4); border-radius:8px; box-shadow:0 10px 22px -12px rgba(164,136,48,.45); overflow:hidden; transform-origin:top; animation:dk-drop 3s cubic-bezier(.16,1,.3,1) infinite; z-index:2; }
      .d-drop-menu span { display:block; padding:6px 11px; font-size:9.5px; color:#666; }
      .d-drop-menu span:hover { background:#fff9df; }
      .d-backtop { display:flex; justify-content:center; padding:6px 0; }
      .d-backtop i { display:grid; place-items:center; width:30px; height:30px; border-radius:9px; background:#1b1b1b; color:#ffe08a; font-style:normal; animation:dk-backtop 2.4s ease-in-out infinite; }
      @keyframes dk-backtop { 0%, 100% { opacity:0; transform:translateY(8px); } 30%, 70% { opacity:1; transform:translateY(0); } }
      .d-input-demo { position:relative; border:1.5px solid #d4a930; border-radius:8px; background:#fff; padding:9px 11px; font-size:10.5px; color:#333; box-shadow:0 0 0 3px rgba(255,224,138,.5); animation:dk-focus 2.6s ease-in-out infinite; }
      .d-input-demo::after { content:"|"; color:#a48830; animation:dk-caret 1s steps(1) infinite; }
      @keyframes dk-focus { 0%, 100% { box-shadow:0 0 0 0 rgba(255,224,138,0); border-color:#d4d4d4; } 50% { box-shadow:0 0 0 3px rgba(255,224,138,.5); border-color:#d4a930; } }
      .d-rate { display:flex; gap:3px; font-size:17px; }
      .d-rate i { color:#e2e2e2; font-style:normal; animation:dk-rate 2.4s steps(1) infinite; }
      .d-rate i:nth-child(1) { animation-delay:0s; } .d-rate i:nth-child(2) { animation-delay:.24s; }
      .d-rate i:nth-child(3) { animation-delay:.48s; } .d-rate i:nth-child(4) { animation-delay:.72s; }
      .d-rate i:nth-child(5) { animation-delay:.96s; }
      @keyframes dk-rate { 0% { color:#e2e2e2; } 20%, 85% { color:#d4a930; } 95%, 100% { color:#e2e2e2; } }
      .d-check { display:grid; gap:8px; }
      .d-check-row { display:flex; align-items:center; gap:8px; font-size:10px; color:#555; }
      .d-check-box { position:relative; width:16px; height:16px; flex:0 0 16px; border:1.5px solid #cfcfcf; border-radius:4px; background:#fff; }
      .d-check-box::after { content:""; position:absolute; left:4px; top:1px; width:5px; height:9px; border:solid #fff; border-width:0 2px 2px 0; transform:rotate(45deg) scale(0); }
      .d-check-box.on { background:#d4a930; border-color:#d4a930; }
      .d-check-box.on::after { transform:rotate(45deg) scale(1); transition:transform .2s cubic-bezier(.34,1.56,.64,1); }
      .d-cal { border:1px solid #e5e5e5; border-radius:8px; background:#fff; padding:8px; }
      .d-cal-head { display:flex; align-items:center; justify-content:space-between; font-size:9.5px; font-weight:700; color:#1b1b1b; padding-bottom:5px; }
      .d-cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:2px; }
      .d-cal-grid span { display:grid; place-items:center; height:16px; border-radius:4px; font-size:8px; color:#888; }
      .d-cal-grid span.sel { background:#d4a930; color:#fff; font-weight:700; animation:dk-sel 2.4s ease-in-out infinite; }
      @keyframes dk-sel { 50% { box-shadow:0 0 0 3px rgba(212,169,48,.3); } }

      /* ===== Footer ===== */
      .ui-footer { width:min(100% - 48px, 880px); margin:0 auto; padding:0 0 46px; color:#b5b5b5; font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }

      @media (max-width:820px) {
        .ui-hero { padding-top:130px; }
        .ui-hero h1 { font-size:clamp(40px, 11vw, 64px); }
        .ui-detail-body { grid-template-columns:1fr; }
        .ui-nav-links button { display:none; }
      }
      @media (prefers-reduced-motion:reduce) {
        .uikit-page *, .uikit-page *::before, .uikit-page *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
      }
    `}</style>

    <nav className={`ui-nav${shrunk ? ' is-shrunk' : ''}`}>
      <a className="ui-nav-logo" href="#/"><i />UI 组件图鉴<em>UI COMPENDIUM</em></a>
      <div className="ui-nav-links">
        {UI_CATS.filter((x) => x.key !== 'all').map((x) => (
          <button key={x.key} type="button" onClick={() => jump(x.key)}>{x.label}</button>
        ))}
      </div>
      <a className="ui-nav-home" href="#/"><Home size={14} />返回主页</a>
    </nav>

    <header className="ui-hero">
      <span className="ui-hero-kicker">UI COMPENDIUM · FOR DEVELOPERS</span>
      <h1>界面组件<br /><span>图鉴</span></h1>
      <p>
        专门讲解网页与后台系统里常见界面组件的查阅手册：每个部件叫什么名字、长什么样子（动效演示）、
        用在什么场景、又是怎么实现的。点击任意卡片展开完整讲解，再点一次收起。
      </p>
      <div className="ui-hero-stats">
        <span><b>{UI_COMPONENTS.length}</b>个组件</span>
        <span><b>{UI_CATS.length - 1}</b>大分类</span>
        <span><b>5</b>个讲解维度</span>
        <span><b>40+</b>个循环动效</span>
      </div>
      <span className="ui-hero-cue">↓ 向下滚动，导航会变形为胶囊</span>
    </header>

    <div className="ui-cats" role="tablist" aria-label="组件分类">
      {UI_CATS.map((x) => {
        const count = x.key === 'all' ? UI_COMPONENTS.length : UI_COMPONENTS.filter((c) => c.cat === x.key).length;
        return (
          <button key={x.key} type="button" className={`ui-cat${cat === x.key ? ' is-active' : ''}`} onClick={() => setCat(x.key)}>
            {x.label} <b>{count}</b>
          </button>
        );
      })}
    </div>

    <main className="ui-list">
      {shown.map((c) => {
        const open = openId === c.no;
        return (
          <article
            key={c.no}
            id={`comp-${c.no}`}
            className={`ui-card${open ? ' is-open' : ''}`}
            onClick={() => toggle(c.no)}
            role="button"
            tabIndex={0}
            aria-expanded={open}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c.no); } }}
          >
            <div className="ui-card-top">
              <span className="ui-no">{c.no}</span>
              <span className="ui-card-name"><h3>{c.name}</h3><em>{c.en}</em></span>
              <span className="ui-card-cat">{UI_CATS.find((x) => x.key === c.cat)?.label || c.cat}</span>
              <ChevronDown size={18} className="ui-chevron" />
            </div>
            <p className="ui-look">{c.look}</p>
            <div className="ui-detail">
              <div className="ui-detail-inner">
                <div className="ui-detail-body">
                  <Demo type={c.demo} />
                  <div className="ui-fields">
                    <div className="ui-field"><h4>使用场景</h4><p>{c.scene}</p></div>
                    <div className="ui-field"><h4>实现原理</h4><p>{c.how}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </main>

    <footer className="ui-footer">VOYRA / UI COMPENDIUM · 纯前端查阅手册 · 持续收录新组件</footer>
  </div>;
}

/* ============ 循环动效演示（40 种） ============ */
function Demo({ type }) {
  switch (type) {
    case 'pillnav':
      return <div className="ui-demo">
        <div className="d-browser"><i /><i /><i />
          <div className="d-nav-wide"><b>通栏态</b><span>内容左右分开排布</span></div>
          <div className="d-nav-morph"><b>LOGO</b><span>收缩为悬浮胶囊 ↻</span></div>
        </div>
        <p>滚动时通栏 ⇄ 胶囊 循环变形</p>
      </div>;
    case 'favicon':
      return <div className="ui-demo">
        <div className="d-tabs">
          <span className="d-tab d-tab1 is-on"><i className="d-fav">V</i>Voyra 工具中心</span>
          <span className="d-tab d-tab2"><i className="d-fav d-fav2">G</i>GitHub</span>
          <span className="d-tab d-tab3"><i className="d-fav d-fav3">M</i>MCP 文档</span>
        </div>
        <p>当前标签轮流高亮切换</p>
      </div>;
    case 'pagination':
      return <div className="ui-demo">
        <div className="d-pager"><i>‹</i><b>1</b><span>2</span><span>3</span><span>…</span><span>8</span><i>›</i></div>
        <p>当前页高亮 · 省略号折叠</p>
      </div>;
    case 'breadcrumb':
      return <div className="ui-demo">
        <div className="d-bread"><span>首页</span> / <span>产品</span> / <em>Voyra Pro 详情</em></div>
        <p>当前页加粗 · 上级可点击返回</p>
      </div>;
    case 'steps':
      return <div className="ui-demo">
        <div className="d-steps">
          <span className="d-step done"><i>✓</i>填写</span><span className="d-step-line fill" />
          <span className="d-step now"><i>2</i>确认</span><span className="d-step-line" />
          <span className="d-step"><i>3</i>支付</span>
        </div>
        <p>已完成打钩 · 当前步脉冲</p>
      </div>;
    case 'dropdown':
      return <div className="ui-demo">
        <div className="d-drop-wrap">
          <span className="d-drop-trigger">帅帅你阿历 ▾</span>
          <div className="d-drop-menu"><span>个人设置</span><span>我的密钥</span><span>退出登录</span></div>
        </div>
        <p>点击触发 · 缩放淡入展开</p>
      </div>;
    case 'backtop':
      return <div className="ui-demo">
        <div className="d-backtop"><i>↑</i></div>
        <p>滚过一屏淡入 · 点击回顶部</p>
      </div>;
    case 'tabs':
      return <div className="ui-demo">
        <div className="d-tabs">
          <span className="d-tab d-tab1 is-on">描述</span>
          <span className="d-tab d-tab2">参数</span>
          <span className="d-tab d-tab3">评价</span>
        </div>
        <p>指示条随选中页签滑动</p>
      </div>;
    case 'sampling':
      return <div className="ui-demo">
        <div className="d-slider"><span>Temperature</span><i className="d-track"><i className="d-fill" style={{ width: '70%' }} /><i className="d-knob d-knob-anim" /></i><b>0.7</b></div>
        <div className="d-slider"><span>Top-P</span><i className="d-track"><i className="d-fill" style={{ width: '82%' }} /><i className="d-knob d-knob-anim2" /></i><b>0.9</b></div>
        <p>滑杆来回拖动 · 数值同步</p>
      </div>;
    case 'context':
      return <div className="ui-demo">
        <div className="d-ctx-input">输入你的问题…<em>7,120 / 8,192</em></div>
        <div className="d-ctx-bar"><i /></div>
        <p>token 增长 · 逼近上限变色</p>
      </div>;
    case 'model':
      return <div className="ui-demo">
        <div className="d-select">voyra-pro-max <i>▾</i></div>
        <div className="d-select-panel"><span className="on">voyra-pro-max</span><span>voyra-lite</span><span>voyra-vision</span></div>
        <p>下拉展开 · 选中项高亮</p>
      </div>;
    case 'toggle':
      return <div className="ui-demo">
        <div className="d-toggle-row"><i className="d-toggle on" /><span>深色模式</span><i className="d-toggle" /><span>通知推送</span></div>
        <p>滑块位移过渡 · 开关循环</p>
      </div>;
    case 'input':
      return <div className="ui-demo">
        <div className="d-input-demo">you@example.com</div>
        <p>聚焦金框 · 光标闪烁</p>
      </div>;
    case 'slider':
      return <div className="ui-demo">
        <div className="d-slider"><span>价格区间</span><i className="d-track"><i className="d-fill" style={{ width: '60%' }} /><i className="d-knob d-knob-anim" /></i><b>¥600</b></div>
        <div className="d-slider"><span>音量</span><i className="d-track"><i className="d-fill" style={{ width: '45%' }} /><i className="d-knob d-knob-anim2" /></i><b>45</b></div>
        <p>拖拽旋钮 · 填充段跟随</p>
      </div>;
    case 'rate':
      return <div className="ui-demo">
        <div className="d-rate"><i>★</i><i>★</i><i>★</i><i>★</i><i>★</i></div>
        <p>星星逐个点亮循环</p>
      </div>;
    case 'checkbox':
      return <div className="ui-demo">
        <div className="d-check">
          <span className="d-check-row"><i className="d-check-box on" />全选</span>
          <span className="d-check-row"><i className="d-check-box on" />前端组件</span>
          <span className="d-check-row"><i className="d-check-box" />后台模板</span>
        </div>
        <p>对勾描画 · 全选联动</p>
      </div>;
    case 'datepicker':
      return <div className="ui-demo">
        <div className="d-cal">
          <div className="d-cal-head"><span>‹</span>2026 年 8 月<span>›</span></div>
          <div className="d-cal-grid">
            {Array.from({ length: 31 }, (_, i) => <span key={i} className={i === 25 ? 'sel' : ''}>{i + 1}</span>)}
          </div>
        </div>
        <p>点日期选中 · 当月面板</p>
      </div>;
    case 'tokens':
      return <div className="ui-demo">
        <div className="d-token-head"><span>名称</span><span>密钥</span><span>操作</span></div>
        <div className="d-token-row"><b>生产环境</b><code>sk-voyra-••••••••7f2a</code><em className="d-token-copy">已复制</em></div>
        <div className="d-token-row"><b>测试环境</b><code>sk-voyra-••••••••c91d</code><em>复制</em></div>
        <p>密钥脱敏 · 复制反馈循环</p>
      </div>;
    case 'dashboard':
      return <div className="ui-demo">
        <div className="d-dash">
          <div className="d-kpi"><span>今日调用</span><b>12,480</b></div>
          <div className="d-kpi"><span>成功率</span><b>99.2%</b></div>
          <div className="d-chart"><i /><i /><i /><i /><i /></div>
        </div>
        <p>柱状图呼吸起伏</p>
      </div>;
    case 'masonry':
      return <div className="ui-demo">
        <div className="d-masonry">
          <span style={{ height: 44 }} /><span className="d-fall" style={{ height: 30 }} /><span style={{ height: 56 }} />
          <span style={{ height: 28 }} /><span style={{ height: 50 }} /><span style={{ height: 36 }} />
        </div>
        <p>新卡落入最矮列循环</p>
      </div>;
    case 'usage':
      return <div className="ui-demo">
        <div className="d-usage">
          <i className="d-ring" />
          <div className="d-usage-copy"><b>$ 36.50</b><span>已用 73% · 剩 $ 13.50</span></div>
        </div>
        <p>SVG 圆环 · 阈值变色告警</p>
      </div>;
    case 'card':
      return <div className="ui-demo">
        <div className="d-card-demo">
          <div className="d-card-img" />
          <div className="d-card-body"><b>Voyra Pro 模板</b>图在上 · 信息在下 · 整卡可点</div>
        </div>
        <p>悬浮抬升 + 投影加深</p>
      </div>;
    case 'statistic':
      return <div className="ui-demo">
        <div className="d-stat">
          <b>
            <span className="d-nums">
              <i>12,480<br />13,102<br />15,877</i>
            </span>
          </b>
          <span className="d-trend">↑ 12%</span>
          <div>今日调用 · 环比上升</div>
        </div>
        <p>数字滚动 + 趋势箭头</p>
      </div>;
    case 'timeline':
      return <div className="ui-demo">
        <div className="d-tl">
          <span className="d-tl-item done">已下单 · 10:24</span>
          <span className="d-tl-item done">已发货 · 14:02</span>
          <span className="d-tl-item now">运输中 · 预计明天</span>
        </div>
        <p>节点状态 · 当前脉冲</p>
      </div>;
    case 'carousel':
      return <div className="ui-demo">
        <div className="d-carousel">
          <div className="d-carousel-track"><i>Banner 1</i><i>Banner 2</i><i>Banner 3</i></div>
        </div>
        <p>自动轮播 · 循环衔接</p>
      </div>;
    case 'empty':
      return <div className="ui-demo">
        <div className="d-empty"><i /><span>还没有数据，点击「新建」开始</span></div>
        <p>插画浮动 + 行动引导</p>
      </div>;
    case 'skeleton':
      return <div className="ui-demo">
        <div className="d-skel"><i /><i /><i /></div>
        <p>流光扫过 · 布局与内容一致</p>
      </div>;
    case 'toast':
      return <div className="ui-demo">
        <div className="d-toast"><span>已保存</span></div>
        <p>滑入 · 停留 · 自动滑出</p>
      </div>;
    case 'modal':
      return <div className="ui-demo">
        <div className="d-modal-stage">
          <div className="d-modal-box"><b>确认删除？</b>此操作不可恢复，请谨慎操作。</div>
        </div>
        <p>遮罩变暗 · 弹性缩放弹出</p>
      </div>;
    case 'drawer':
      return <div className="ui-demo">
        <div className="d-drawer-stage">
          <div className="d-drawer-panel"><b>详情面板</b>从右侧滑出，背后列表仍可见。</div>
        </div>
        <p>右侧滑入 · 滑出循环</p>
      </div>;
    case 'tooltip':
      return <div className="ui-demo">
        <div className="d-tip-wrap">
          <span className="d-tip-trigger">悬停我<i className="d-tip-bubble">这个图标是用来导出的</i></span>
        </div>
        <p>气泡浮现 · 箭头指向触发器</p>
      </div>;
    case 'progress':
      return <div className="ui-demo">
        <div className="d-prog"><i /></div>
        <p>0 → 100% 循环增长</p>
      </div>;
    case 'spinner':
      return <div className="ui-demo">
        <div className="d-spinner"><i /></div>
        <p>旋转圆环 · 经典加载态</p>
      </div>;
    case 'sidebar':
      return <div className="ui-demo">
        <div className="d-sidebar-stage">
          <div className="d-sidebar"><i /><i /><i /><i /></div>
          <div className="d-sidebar-main">内容区</div>
        </div>
        <p>侧栏折叠 ⇄ 展开循环</p>
      </div>;
    case 'split':
      return <div className="ui-demo">
        <div className="d-split">
          <i className="d-split-l" />
          <i className="d-split-r">登录表单</i>
        </div>
        <p>左右分栏比例变化</p>
      </div>;
    case 'grid':
      return <div className="ui-demo">
        <div className="d-grid-demo">
          <span /><span /><span /><span /><span /><span /><span /><span />
        </div>
        <p>宽屏 4 列 ⇄ 窄屏 2 列</p>
      </div>;
    case 'transition':
      return <div className="ui-demo">
        <div style={{ textAlign: 'center' }}><span className="d-trans">Hover 过渡</span></div>
        <p>背景色平滑渐变循环</p>
      </div>;
    case 'easing':
      return <div className="ui-demo">
        <div className="d-ease"><i /><i /><i /></div>
        <p>线性 / 缓入 / 缓出 对比</p>
      </div>;
    case 'spring':
      return <div className="ui-demo">
        <div className="d-spring"><i>♥ 点赞</i></div>
        <p>过冲回弹 · 弹簧质感</p>
      </div>;
    case 'fade':
      return <div className="ui-demo">
        <div className="d-fade"><i>内容淡入淡出</i></div>
        <p>透明度 + 位移循环</p>
      </div>;
    default:
      return null;
  }
}
