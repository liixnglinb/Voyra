import React from 'react';
import { Heart } from 'lucide-react';

/**
 * RouteLoader — 工具页路由级等待加载动效
 * 每个变体对应站点的视觉语言（黑白金 / 暗色星空 / 暖色奶油），零依赖纯 CSS 实现。
 * 通过各路由自己的 <Suspense fallback={<RouteLoader variant="..." />}> 展示：
 * 懒加载分包期间、以及 MindMapFrame iframe 就绪前。
 */

const CFG = {
  timetable: { label: 'SCHEDULE HUB', hint: '日程中心加载中…', accent: '#9a7515' },
  prompts: { label: 'PROMPT LIBRARY', hint: '提示词库加载中…', accent: '#9a7515' },
  uikit: { label: 'UI KIT GALLERY', hint: '组件图鉴加载中…', accent: '#1b1b1b', full: true },
  skills: { label: 'GITHUB SKILL RADAR', hint: '正在拉取 GitHub 热榜…', accent: '#9a7515' },
  agents: { label: 'AI AGENT RADAR', hint: '正在点亮 Agent 星空…', accent: '#a78bfa', dark: true, full: true },
  mindmap: { label: 'MIND MAPPING', hint: '正在加载思维导图…', accent: '#9a7515' },
  baby: { label: 'BABY CARE', hint: '宝宝护理加载中…', accent: '#E8835E' },
  pelican: { label: 'AI MODEL SHOWCASE', hint: '动画画廊加载中…', accent: '#a48830' },
};

function Graphic({ variant }) {
  switch (variant) {
    case 'timetable':
      return (
        <div className="rl-cal" aria-hidden="true">
          <span className="rl-cal-band" />
          <span className="rl-cal-grid">
            {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.14}s` }} />)}
          </span>
        </div>
      );
    case 'prompts':
      return (
        <div className="rl-type" aria-hidden="true">
          <span className="rl-line-row"><i className="rl-line" style={{ width: '86%', animationDelay: '0s' }} /><i className="rl-caret" /></span>
          <i className="rl-line" style={{ width: '62%', animationDelay: '0.35s' }} />
          <i className="rl-line" style={{ width: '74%', animationDelay: '0.7s' }} />
        </div>
      );
    case 'uikit':
      return (
        <div className="rl-morph-wrap" aria-hidden="true">
          <span className="rl-morph" />
          <span className="rl-morph-dot" />
        </div>
      );
    case 'skills':
      return (
        <div className="rl-rank" aria-hidden="true">
          {[0.6, 1, 0.78, 0.45].map((h, i) => (
            <i key={i} style={{ height: `${h * 100}%`, animationDelay: `${i * 0.16}s` }} />
          ))}
        </div>
      );
    case 'agents':
      return (
        <div className="rl-orbit-wrap" aria-hidden="true">
          <span className="rl-stars">
            {[[8, 14], [72, 10], [16, 66], [78, 70], [46, 4]].map(([x, y], i) => (
              <i key={i} style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.45}s` }} />
            ))}
          </span>
          <span className="rl-orbit"><i /></span>
          <span className="rl-orbit o2"><i /></span>
          <span className="rl-core" />
        </div>
      );
    case 'mindmap':
      return (
        <svg className="rl-mm" viewBox="0 0 96 64" width="96" height="64" aria-hidden="true">
          <path className="rl-mm-path" style={{ animationDelay: '0s' }} d="M48 32 C 60 32, 66 16, 82 13" />
          <path className="rl-mm-path" style={{ animationDelay: '0.3s' }} d="M48 32 C 62 34, 70 40, 84 40" />
          <path className="rl-mm-path" style={{ animationDelay: '0.6s' }} d="M48 32 C 36 32, 30 44, 14 50" />
          <circle className="rl-mm-node" style={{ animationDelay: '0.28s' }} cx="84" cy="13" r="4.5" />
          <circle className="rl-mm-node" style={{ animationDelay: '0.58s' }} cx="86" cy="40" r="4.5" />
          <circle className="rl-mm-node" style={{ animationDelay: '0.88s' }} cx="12" cy="50" r="4.5" />
          <circle className="rl-mm-core" cx="48" cy="32" r="8.5" />
        </svg>
      );
    case 'baby':
      return (
        <div className="rl-baby-wrap" aria-hidden="true">
          <span className="rl-baby"><Heart size={38} fill="currentColor" strokeWidth={0} /></span>
          <span className="rl-baby-shadow" />
        </div>
      );
    case 'pelican':
      return (
        <figure className="rl-pelican" aria-hidden="true">
          <svg viewBox="0 0 220 108" width="188" height="92">
            {/* 后轮 */}
            <g className="rl-pg-rear">
              <circle cx="58" cy="78" r="24" fill="none" stroke="#1b1b1b" strokeWidth="3" />
              <g className="rl-pg-spokes">
                <line x1="58" y1="54" x2="58" y2="102" stroke="#1b1b1b" strokeWidth="2" />
                <line x1="34" y1="78" x2="82" y2="78" stroke="#1b1b1b" strokeWidth="2" />
                <line x1="41" y1="61" x2="75" y2="95" stroke="#1b1b1b" strokeWidth="2" />
                <line x1="75" y1="61" x2="41" y2="95" stroke="#1b1b1b" strokeWidth="2" />
              </g>
            </g>
            {/* 前轮 */}
            <g className="rl-pg-front">
              <circle cx="158" cy="78" r="24" fill="none" stroke="#1b1b1b" strokeWidth="3" />
              <g className="rl-pg-spokes">
                <line x1="158" y1="54" x2="158" y2="102" stroke="#1b1b1b" strokeWidth="2" />
                <line x1="134" y1="78" x2="182" y2="78" stroke="#1b1b1b" strokeWidth="2" />
                <line x1="141" y1="61" x2="175" y2="95" stroke="#1b1b1b" strokeWidth="2" />
                <line x1="175" y1="61" x2="141" y2="95" stroke="#1b1b1b" strokeWidth="2" />
              </g>
            </g>
            {/* 车架 */}
            <g stroke="#1b1b1b" strokeWidth="4" strokeLinecap="round" fill="none">
              <line x1="58" y1="78" x2="108" y2="78" />
              <line x1="108" y1="78" x2="108" y2="46" />
              <line x1="108" y1="46" x2="60" y2="40" />
              <line x1="108" y1="46" x2="158" y2="50" />
              <line x1="108" y1="78" x2="158" y2="78" />
              <line x1="158" y1="50" x2="158" y2="78" />
            </g>
            {/* 曲柄 + 踏板 */}
            <circle cx="108" cy="78" r="7" fill="none" stroke="#1b1b1b" strokeWidth="2" />
            <g className="rl-pg-crank">
              <line x1="108" y1="78" x2="108" y2="70" stroke="#888" strokeWidth="3" strokeLinecap="round" />
              <path d="M 101 70 h 14" stroke="#a48830" strokeWidth="3" strokeLinecap="round" />
            </g>
            {/* 座管 + 座椅（金色） */}
            <line x1="108" y1="48" x2="112" y2="40" stroke="#1b1b1b" strokeWidth="4" strokeLinecap="round" />
            <path d="M 101 39 h 24" stroke="#a48830" strokeWidth="5" strokeLinecap="round" />
            {/* 车把（金色） */}
            <line x1="158" y1="50" x2="161" y2="42" stroke="#1b1b1b" strokeWidth="4" strokeLinecap="round" />
            <path d="M 156 41 h 26" stroke="#a48830" strokeWidth="5" strokeLinecap="round" />
            {/* 鹈鹕 */}
            <g className="rl-pg-pel">
              <path d="M 98 40 C 95 22, 122 14, 134 30 C 142 40, 138 52, 124 47 C 116 45, 104 47, 98 40 Z" fill="#f4f1e6" stroke="#1b1b1b" strokeWidth="3" strokeLinejoin="round" />
              <path d="M 113 26 C 124 20, 133 28, 129 40" fill="#1b1b1b" />
              <path d="M 132 28 C 140 22, 148 20, 151 18" stroke="#1b1b1b" strokeWidth="6" fill="none" strokeLinecap="round" />
              <circle cx="158" cy="15" r="6.5" fill="#f4f1e6" stroke="#1b1b1b" strokeWidth="3" />
              <circle cx="160" cy="13.5" r="1.6" fill="#1b1b1b" />
              <g className="rl-pg-beak">
                <path d="M 164 15 L 189 13 L 188 19 L 163 20 Z" fill="#e0b53a" stroke="#a48830" strokeWidth="2" strokeLinejoin="round" />
                <line x1="164" y1="16.5" x2="187" y2="16.5" stroke="#a48830" strokeWidth="1.4" />
                <path d="M 164 20 C 172 30, 184 26, 188 20 Z" fill="#f7d97a" stroke="#d9a832" strokeWidth="2" opacity="0.92" />
              </g>
            </g>
          </svg>
        </figure>
      );
    default:
      return <span className="rl-dot" aria-hidden="true" />;
  }
}

export default function RouteLoader({ variant = 'timetable' }) {
  const cfg = CFG[variant] || CFG.timetable;
  return (
    <div className={`rl${cfg.dark ? ' is-dark' : ''}${cfg.full ? ' is-full' : ''}`} role="status" aria-label={cfg.hint}>
      <style>{`
        .rl { min-height:56vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:22px; padding:48px 24px; }
        .rl.is-full { min-height:100vh; height:100vh; }
        .rl.is-dark { background:#04060e; }
        .rl-label { color:${cfg.accent}; font:700 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.22em; }
        .rl-hint { color:${cfg.dark ? '#6b7280' : '#b8b8b8'}; font-size:12px; }
        .rl * { box-sizing:border-box; }

        /* 日程中心：周历格逐格点亮 */
        .rl-cal { width:68px; border:1.5px solid rgba(27,27,27,.16); border-radius:11px; overflow:hidden; background:#fff; box-shadow:0 10px 24px -18px rgba(20,20,20,.5); }
        .rl-cal-band { display:block; height:13px; background:linear-gradient(90deg,#a48830,#d4a930); }
        .rl-cal-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; padding:8px; }
        .rl-cal-grid i { height:7px; border-radius:2.5px; background:#ececea; animation:rl-cell 1.7s ease-in-out infinite; }
        @keyframes rl-cell { 0%,100% { background:#ececea; transform:scale(1); } 45% { background:#d4a930; transform:scale(1.12); } }

        /* 提示词库：文稿逐行打入 + 光标闪烁 */
        .rl-type { width:132px; display:grid; gap:10px; padding:16px 15px; border:1.5px solid rgba(27,27,27,.14); border-radius:12px; background:#fff; box-shadow:0 10px 24px -18px rgba(20,20,20,.5); }
        .rl-type .rl-line-row { display:flex; align-items:center; gap:5px; }
        .rl-line { display:block; height:7px; border-radius:4px; background:#e6e6e3; transform-origin:left center; animation:rl-line 2.1s cubic-bezier(.22,1,.36,1) infinite; }
        .rl-caret { display:block; width:2px; height:11px; border-radius:1px; background:#a48830; animation:rl-blink 0.9s steps(2, start) infinite; }
        @keyframes rl-line { 0% { transform:scaleX(0); opacity:.35; } 42%,72% { transform:scaleX(1); opacity:1; } 100% { transform:scaleX(1); opacity:.3; } }
        @keyframes rl-blink { 0%,49% { opacity:1; } 50%,100% { opacity:0; } }

        /* 组件图鉴：变形胶囊（呼应站点的变形胶囊导航） */
        .rl-morph-wrap { position:relative; width:88px; height:56px; display:grid; place-items:center; }
        .rl-morph { width:52px; height:26px; background:linear-gradient(135deg,#1b1b1b,#3d3d3d); box-shadow:0 12px 26px -14px rgba(27,27,27,.6); animation:rl-morph 2.4s cubic-bezier(.65,0,.35,1) infinite; }
        .rl-morph-dot { position:absolute; right:6px; top:4px; width:9px; height:9px; border-radius:50%; background:#d4a930; animation:rl-dot 2.4s cubic-bezier(.65,0,.35,1) infinite; }
        @keyframes rl-morph { 0%,100% { border-radius:99px; transform:rotate(0deg); } 33% { border-radius:7px; transform:rotate(90deg); } 66% { border-radius:50%; transform:rotate(180deg); } }
        @keyframes rl-dot { 0%,100% { transform:translate(0,0); } 33% { transform:translate(-26px,10px); } 66% { transform:translate(-30px,-2px); } }

        /* Skill 热榜：排行条交替升降 */
        .rl-rank { display:flex; align-items:flex-end; gap:7px; height:46px; }
        .rl-rank i { width:10px; border-radius:4px 4px 2px 2px; background:linear-gradient(180deg,#d4a930,#a48830); transform-origin:bottom center; animation:rl-bar 1.5s ease-in-out infinite; }
        @keyframes rl-bar { 0%,100% { transform:scaleY(.3); opacity:.55; } 50% { transform:scaleY(1); opacity:1; } }

        /* AI Agent：暗色星空轨道 */
        .rl-orbit-wrap { position:relative; width:92px; height:92px; }
        .rl-stars { position:absolute; inset:0; }
        .rl-stars i { position:absolute; width:3px; height:3px; border-radius:50%; background:#c4b5fd; animation:rl-twinkle 2.2s ease-in-out infinite; }
        @keyframes rl-twinkle { 0%,100% { opacity:.15; transform:scale(.8); } 50% { opacity:1; transform:scale(1.25); } }
        .rl-orbit { position:absolute; inset:0; border:1px solid rgba(124,92,255,.28); border-radius:50%; animation:rl-spin 3.2s linear infinite; }
        .rl-orbit i { position:absolute; top:-3.5px; left:50%; width:7px; height:7px; margin-left:-3.5px; border-radius:50%; background:#c4b5fd; box-shadow:0 0 10px rgba(124,92,255,.9); }
        .rl-orbit.o2 { inset:15px; animation-duration:2.1s; animation-direction:reverse; border-color:rgba(59,130,246,.24); }
        .rl-orbit.o2 i { background:#93c5fd; box-shadow:0 0 10px rgba(59,130,246,.9); }
        .rl-core { position:absolute; left:50%; top:50%; width:26px; height:26px; margin:-13px 0 0 -13px; border-radius:50%; background:radial-gradient(circle at 35% 32%, #c4b5fd, #7C5CFF 68%); box-shadow:0 0 22px rgba(124,92,255,.75); animation:rl-pulse 2s ease-in-out infinite; }
        @keyframes rl-spin { to { transform:rotate(360deg); } }
        @keyframes rl-pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.16); } }

        /* 思维导图：中心节点向两侧生长分支 */
        .rl-mm { overflow:visible; }
        .rl-mm-path { fill:none; stroke:#a48830; stroke-width:2; stroke-linecap:round; stroke-dasharray:64; stroke-dashoffset:64; opacity:0; animation:rl-draw 2.4s ease-in-out infinite; }
        .rl-mm-node { fill:#ffe08a; stroke:#a48830; stroke-width:1.5; opacity:0; transform-origin:center; transform-box:fill-box; animation:rl-node 2.4s ease-in-out infinite; }
        .rl-mm-core { fill:#1b1b1b; animation:rl-core-pulse 2.4s ease-in-out infinite; }
        @keyframes rl-draw { 0% { stroke-dashoffset:64; opacity:0; } 12% { opacity:1; } 48%,78% { stroke-dashoffset:0; opacity:1; } 100% { stroke-dashoffset:0; opacity:0; } }
        @keyframes rl-node { 0%,20% { opacity:0; } 50%,78% { opacity:1; } 100% { opacity:0; } }
        @keyframes rl-core-pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.12); } }

        /* AI 动画画廊：鹈鹕骑自行车（呼应页面核心意象，网格纸卡片底） */
        .rl-pelican { margin:0; display:grid; place-items:center; width:236px; height:140px; border:1px solid rgba(27,27,27,.12); border-radius:14px; background-color:#fff; background-image:linear-gradient(rgba(0,0,0,.031) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.031) 1px,transparent 1px); background-size:32px 32px; box-shadow:0 16px 36px -28px rgba(20,20,20,.55); }
        .rl-pg-spokes { transform-origin:center; transform-box:fill-box; animation:rl-pg-spin 0.9s linear infinite; }
        @keyframes rl-pg-spin { to { transform:rotate(360deg); } }
        .rl-pg-crank { transform-origin:center; transform-box:fill-box; animation:rl-pg-spin 0.55s linear infinite; }
        .rl-pg-pel { animation:rl-pg-bob 0.8s ease-in-out infinite; }
        @keyframes rl-pg-bob { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-3px); } }
        .rl-pg-beak { transform-origin:18% 72%; transform-box:fill-box; animation:rl-pg-beak 0.7s ease-in-out infinite; }
        @keyframes rl-pg-beak { 0%,100% { transform:rotate(0deg); } 50% { transform:rotate(-6deg); } }

        /* 宝宝护理：暖色小爱心弹跳 */
        .rl-baby-wrap { display:flex; flex-direction:column; align-items:center; gap:7px; }
        .rl-baby { display:block; color:#E8835E; animation:rl-bounce 1.4s cubic-bezier(.36,0,.64,1) infinite; }
        .rl-baby-shadow { width:34px; height:7px; border-radius:50%; background:rgba(232,131,94,.28); animation:rl-bshadow 1.4s cubic-bezier(.36,0,.64,1) infinite; }
        @keyframes rl-bounce { 0%,100% { transform:translateY(0) scale(1,1); } 32% { transform:translateY(-15px) scale(.95,1.06); } 62% { transform:translateY(0) scale(1.08,.9); } }
        @keyframes rl-bshadow { 0%,100% { transform:scaleX(1); opacity:.85; } 32% { transform:scaleX(.62); opacity:.4; } 62% { transform:scaleX(1.15); opacity:.95; } }

        @media (prefers-reduced-motion:reduce) {
          .rl, .rl * , .rl *::before, .rl *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; }
        }
      `}</style>
      <Graphic variant={variant} />
      <span className="rl-label">{cfg.label}</span>
      <span className="rl-hint">{cfg.hint}</span>
    </div>
  );
}
