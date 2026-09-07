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
  pelican: { label: 'AI MODEL SHOWCASE', hint: 'AI 模型对比秀加载中…', accent: '#a48830' },
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
      /* 忠实复刻画廊 GLM-5.3 生成的那只鹈鹕骑自行车：奶油白身、墨线描边、
         橙色上喙、桃色大喉囊（内藏扑腾的蓝鱼尾）、红围巾翻飞、红车架，
         双轮辐旋转 + 两段式蹬踏腿 + 近侧翼搭车把 + 眨眼与整体起伏 */
      return (
        <figure className="rl-pelican" aria-hidden="true">
          <svg viewBox="0 0 1000 600" width="620" height="372">
            <defs>
              <linearGradient id="rlG-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6db6e8" /><stop offset=".62" stopColor="#a5dbf2" /><stop offset="1" stopColor="#dcf1fa" /></linearGradient>
              <linearGradient id="rlG-road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5a5a64" /><stop offset="1" stopColor="#3c3c45" /></linearGradient>
            </defs>
            <rect width="1000" height="600" fill="url(#rlG-sky)" />
            <circle cx="882" cy="90" r="58" fill="#ffd75e" opacity="0.14" />
            <circle cx="882" cy="90" r="32" fill="#ffd75e" stroke="#f7bd3e" strokeWidth="3" />
            <g opacity=".92" fill="#ffffff"><g transform="translate(150,108) scale(.72)"><ellipse rx="44" ry="26" /><ellipse cx="40" cy="8" rx="32" ry="18" /><ellipse cx="-40" cy="10" rx="28" ry="16" /><ellipse cx="6" cy="-16" rx="30" ry="18" /></g><g transform="translate(760,80) scale(.5)"><ellipse rx="44" ry="26" /><ellipse cx="40" cy="8" rx="32" ry="18" /><ellipse cx="-40" cy="10" rx="28" ry="16" /><ellipse cx="6" cy="-16" rx="30" ry="18" /></g></g>
            <rect y="503" width="1000" height="14" fill="#6fae57" />
            <rect y="516" width="1000" height="84" fill="url(#rlG-road)" />
            <rect y="516" width="1000" height="3" fill="#2f2f38" />
            <line x1="0" y1="540" x2="1000" y2="540" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray="26 22" />

            {/* ===== 骑手整体（上下颠簸） ===== */}
            <g>
              <animateTransform attributeName="transform" type="translate" values="0 0;0 -4.5;0 0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.42 0 0.58 1;0.42 0 0.58 1" dur="1s" repeatCount="indefinite" />
              {/* 远侧翅膀（扶车把） */}
              <path d="M438 264 C470 248 508 254 542 284 C554 294 568 304 582 311 C564 324 536 324 510 313 C484 302 446 288 438 264 Z" fill="#d9cdb2" stroke="#4a4033" strokeWidth="2.5" strokeLinejoin="round" />
              {/* 远侧曲柄 */}
              <g><animateTransform attributeName="transform" type="rotate" from="0 470 445" to="360 470 445" dur="2s" repeatCount="indefinite" /><line x1="470" y1="445" x2="435" y2="445" stroke="#8a8f96" strokeWidth="6" strokeLinecap="round" /></g>
              {/* 远侧腿（两段式蹬踏） */}
              <path fill="none" stroke="#c9752a" strokeWidth="12" strokeLinecap="round" d="M440 322 Q485 382 435 439"><animate attributeName="d" dur="2s" repeatCount="indefinite" values="M440 322 Q485 382 435 439;M440 322 Q512 342 470 404;M440 322 Q501 365 505 439;M440 322 Q458 402 470 474;M440 322 Q485 382 435 439" /></path>
              {/* 远侧踏板 + 蹼足 */}
              <g><animateMotion dur="2s" repeatCount="indefinite" path="M435 445 a35 35 0 1 1 70 0 a35 35 0 1 1 -70 0" /><rect x="-13" y="0" width="26" height="7" rx="2.5" fill="#2b2b2e" /><path d="M-9 -1 Q-3 -13 9 -10 L14 -3 L14 1 L-9 1 Z" fill="#cf7c2b" stroke="#9c5a17" strokeWidth="1.5" strokeLinejoin="round" /></g>
              {/* 后轮 */}
              <g><animateTransform attributeName="transform" type="rotate" from="0 350 440" to="360 350 440" dur="1.3s" repeatCount="indefinite" /><circle cx="350" cy="440" r="70" fill="none" stroke="#2e3136" strokeWidth="12" /><circle cx="350" cy="440" r="57" fill="none" stroke="#d7dce2" strokeWidth="4" /><g stroke="#9aa0a8" strokeWidth="2.5"><line x1="293" y1="440" x2="407" y2="440" /><line x1="310" y1="400" x2="390" y2="480" /><line x1="350" y1="383" x2="350" y2="497" /><line x1="310" y1="480" x2="390" y2="400" /></g><circle cx="350" cy="440" r="10" fill="none" stroke="#6a6f76" strokeWidth="3" strokeDasharray="3 3" /><circle cx="350" cy="440" r="7" fill="#8d939b" stroke="#5c6167" strokeWidth="2" /><circle cx="350" cy="440" r="2.8" fill="#3c4046" /></g>
              {/* 前轮 */}
              <g><animateTransform attributeName="transform" type="rotate" from="0 650 440" to="360 650 440" dur="1.3s" repeatCount="indefinite" /><circle cx="650" cy="440" r="70" fill="none" stroke="#2e3136" strokeWidth="12" /><circle cx="650" cy="440" r="57" fill="none" stroke="#d7dce2" strokeWidth="4" /><g stroke="#9aa0a8" strokeWidth="2.5"><line x1="593" y1="440" x2="707" y2="440" /><line x1="610" y1="400" x2="690" y2="480" /><line x1="650" y1="383" x2="650" y2="497" /><line x1="610" y1="480" x2="690" y2="400" /></g><circle cx="650" cy="440" r="7" fill="#8d939b" stroke="#5c6167" strokeWidth="2" /><circle cx="650" cy="440" r="2.8" fill="#3c4046" /></g>
              {/* 车架（红） */}
              <g stroke="#e0492f" strokeWidth="9" strokeLinecap="round" fill="none"><path d="M420 340 L470 445" /><path d="M424 350 L604 336" /><path d="M470 445 L608 338" /><path d="M350 440 L424 344" /><path d="M350 440 L470 445" /><path d="M600 328 L616 348" strokeWidth="10" /><path d="M616 348 Q628 396 650 440" strokeWidth="7" /></g>
              {/* 座杆 + 车座 */}
              <path d="M420 342 L414 322" stroke="#7d8590" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="406" cy="320" rx="25" ry="7" fill="#4c3a2a" stroke="#33281d" strokeWidth="2" />
              {/* 把立 + 车把 */}
              <g stroke="#33383d" strokeWidth="6" strokeLinecap="round" fill="none"><path d="M604 330 L596 313" /><path d="M596 313 Q594 305 584 305 L566 305" /></g>
              <circle cx="568" cy="305" r="4.5" fill="#22262a" />
              {/* 链条（滚动） */}
              <path d="M350 430 L470 429 M470 461 L350 450" fill="none" stroke="#4d5157" strokeWidth="3.5" strokeDasharray="5 4"><animate attributeName="stroke-dashoffset" from="0" to="-9" dur="0.18s" repeatCount="indefinite" /></path>
              {/* 牙盘 */}
              <g><animateTransform attributeName="transform" type="rotate" from="0 470 445" to="360 470 445" dur="2s" repeatCount="indefinite" /><circle cx="470" cy="445" r="16" fill="#c9ced4" stroke="#55595f" strokeWidth="3" strokeDasharray="4 3" /></g>

              {/* ===== 鹈鹕 ===== */}
              {/* 尾羽 */}
              <path d="M356 272 L316 242 L344 254 L326 220 L352 244 L348 206 L370 254 Z" fill="#f3ecda" stroke="#4a4033" strokeWidth="2.5" strokeLinejoin="round" />
              {/* 身体 */}
              <g transform="rotate(-10 415 285)"><ellipse cx="415" cy="285" rx="78" ry="55" fill="#f7f1e3" stroke="#4a4033" strokeWidth="2.5" /><ellipse cx="418" cy="300" rx="58" ry="30" fill="#e9dec4" opacity=".75" /><ellipse cx="398" cy="252" rx="42" ry="18" fill="#ffffff" opacity=".4" /></g>
              {/* 头颈组（轻微摆动） */}
              <g><animateTransform attributeName="transform" type="rotate" values="0 492 235;2.5 492 235;0 492 235;-2 492 235;0 492 235" dur="2s" repeatCount="indefinite" />
                {/* 脖子（墨线 + 奶油芯） */}
                <path d="M462 252 C470 222 486 198 512 178" fill="none" stroke="#4a4033" strokeWidth="31" strokeLinecap="round" />
                <path d="M462 252 C470 222 486 198 512 178" fill="none" stroke="#f7f1e3" strokeWidth="25" strokeLinecap="round" />
                {/* 围巾 */}
                <path d="M455 205 Q473 224 496 213" fill="none" stroke="#e0492f" strokeWidth="11" strokeLinecap="round" />
                <path fill="none" stroke="#e0492f" strokeWidth="8" strokeLinecap="round" d="M468 212 C450 205 432 218 410 206"><animate attributeName="d" dur="0.8s" repeatCount="indefinite" values="M468 212 C450 205 432 218 410 206;M468 212 C452 221 428 202 408 214;M468 212 C448 210 430 224 406 200;M468 212 C450 205 432 218 410 206" /></path>
                {/* 头 */}
                <circle cx="522" cy="168" r="27" fill="#f7f1e3" stroke="#4a4033" strokeWidth="2.5" />
                <path d="M514 146 Q518 130 532 140" fill="none" stroke="#4a4033" strokeWidth="3" strokeLinecap="round" />
                {/* 上喙（橙） */}
                <path d="M541 157 C588 153 632 167 660 190 L655 198 C623 184 580 174 542 171 Z" fill="#f2a23a" stroke="#4a4033" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M556 160 L585 165" stroke="#c07f22" strokeWidth="2" strokeLinecap="round" />
                {/* 喉囊（桃） */}
                <path d="M542 171 C562 180 616 187 652 193 C648 214 620 232 590 231 C564 229 548 212 542 191 Z" fill="#f8c35f" stroke="#4a4033" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M549 190 C560 204 578 216 598 218 C584 226 566 222 553 208 Z" fill="#eba943" opacity=".55" />
                {/* 囊中鱼尾（扑腾） */}
                <path d="M592 228 L581 246 L591 241 L600 249 Z" fill="#64a9dc" stroke="#3c7ca8" strokeWidth="1.8" strokeLinejoin="round"><animateTransform attributeName="transform" type="rotate" values="0 592 230;-14 592 230;8 592 230;0 592 230" dur="0.7s" repeatCount="indefinite" /></path>
                {/* 眼睛（眨眼） */}
                <ellipse cx="531" cy="159" rx="4.6" ry="4.6" fill="#2c2823"><animate attributeName="ry" values="4.6;4.6;0.4;4.6;4.6" keyTimes="0;0.86;0.9;0.94;1" dur="4.6s" repeatCount="indefinite" /></ellipse>
                <circle cx="532.6" cy="157.2" r="1.4" fill="#ffffff"><animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;0.86;0.9;0.94;1" dur="4.6s" repeatCount="indefinite" /></circle>
                <circle cx="537" cy="181" r="5" fill="#f2a23a" opacity=".3" />
              </g>
              {/* 近侧腿（蹬踏，橙） */}
              <path fill="none" stroke="#ef8f36" strokeWidth="13" strokeLinecap="round" d="M455 330 Q520 367 505 439"><animate attributeName="d" dur="2s" repeatCount="indefinite" values="M455 330 Q520 367 505 439;M455 330 Q480 401 470 474;M455 330 Q496 393 435 439;M455 330 Q526 353 470 404;M455 330 Q520 367 505 439" /></path>
              {/* 近侧曲柄臂 */}
              <g><animateTransform attributeName="transform" type="rotate" from="0 470 445" to="360 470 445" dur="2s" repeatCount="indefinite" /><line x1="470" y1="445" x2="505" y2="445" stroke="#3c4046" strokeWidth="7" strokeLinecap="round" /></g>
              {/* 近侧踏板 + 蹼足 */}
              <g><animateMotion dur="2s" repeatCount="indefinite" path="M505 445 a35 35 0 1 1 -70 0 a35 35 0 1 1 70 0" /><rect x="-13" y="0" width="26" height="7" rx="2.5" fill="#2b2b2e" /><path d="M-9 -1 Q-3 -13 9 -10 L14 -3 L14 1 L-9 1 Z" fill="#ef8f36" stroke="#b5651d" strokeWidth="1.5" strokeLinejoin="round" /></g>
              {/* 近侧翅膀（搭在车把上） */}
              <path d="M448 262 C478 246 514 254 546 282 C558 292 572 302 586 309 C566 322 538 322 512 311 C486 300 456 286 448 262 Z" fill="#f3ecda" stroke="#4a4033" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M468 260 C494 266 520 278 543 295" fill="none" stroke="#cfc2a4" strokeWidth="2" strokeLinecap="round" />
              <path d="M460 272 C486 280 510 291 531 304" fill="none" stroke="#cfc2a4" strokeWidth="2" strokeLinecap="round" />
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

        /* AI 模型对比秀：GLM-5.3 同款鹈鹕骑自行车（天空场景卡片） */
        .rl-pelican { margin:0; width:620px; max-width:92vw; border-radius:16px; overflow:hidden; border:1px solid rgba(27,27,27,.1); box-shadow:0 24px 54px -32px rgba(20,20,20,.5); }
        .rl-pelican svg { display:block; width:100%; height:auto; }

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
