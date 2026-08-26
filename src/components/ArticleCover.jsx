import React from 'react';

/* 统一风格的文章封面：米白网格底 + 黑描边主题图形 + 金色高亮 + 大序号 + 主题标签
   每篇文章一个 theme，图形呼应文章主题，构图与配色语言完全同构 */

const TAGS = {
  workspace: 'WORKSPACE',
  prompt: 'PROMPT',
  skill: 'SKILL',
  component: 'COMPONENT',
  schedule: 'SCHEDULE',
  cloud: 'CLOUD',
};

const S = { stroke: '#1b1b1b', strokeWidth: 1.2, fill: '#fff' };
const SOFT = { fill: 'rgba(27,27,27,.14)' };
const GOLD = { fill: '#ffe08a', stroke: '#1b1b1b', strokeWidth: 1.2 };
const DARK = { fill: '#1b1b1b' };

function Art({ theme }) {
  switch (theme) {
    /* 工作台：主面板 + 两个挂件 + 连接线 */
    case 'workspace':
      return <svg viewBox="0 0 200 112" className="vr-ac-svg" aria-hidden="true">
        <rect x="56" y="14" width="92" height="62" rx="3" {...S} />
        <line x1="56" y1="26" x2="148" y2="26" {...S} />
        <circle cx="62" cy="20" r="1.8" {...DARK} />
        <circle cx="68" cy="20" r="1.8" {...SOFT} />
        <rect x="63" y="33" width="42" height="9" {...GOLD} />
        <rect x="63" y="48" width="66" height="4" {...SOFT} />
        <rect x="63" y="57" width="54" height="4" {...SOFT} />
        <rect x="63" y="66" width="60" height="4" {...SOFT} />
        <rect x="20" y="30" width="28" height="20" rx="3" {...S} />
        <rect x="25" y="36" width="14" height="3" {...GOLD} />
        <rect x="25" y="43" width="18" height="2.5" {...SOFT} />
        <rect x="154" y="48" width="26" height="22" rx="3" {...S} />
        <rect x="159" y="55" width="12" height="3" {...DARK} />
        <rect x="159" y="61" width="16" height="2.5" {...SOFT} />
        <line x1="48" y1="40" x2="56" y2="40" {...S} />
        <line x1="148" y1="59" x2="154" y2="59" {...S} />
        <circle cx="100" cy="92" r="2.4" {...GOLD} />
        <line x1="108" y1="92" x2="140" y2="92" {...S} />
      </svg>;
    /* 提示词：对话气泡 + 光标 + 规格条 */
    case 'prompt':
      return <svg viewBox="0 0 200 112" className="vr-ac-svg" aria-hidden="true">
        <rect x="30" y="16" width="96" height="34" rx="8" {...S} />
        <path d="M 44 50 L 44 60 L 56 50" {...S} />
        <rect x="40" y="27" width="52" height="5" {...SOFT} />
        <rect x="40" y="37" width="38" height="5" {...SOFT} />
        <rect x="98" y="27" width="4" height="10" {...DARK} />
        <rect x="86" y="58" width="92" height="36" rx="8" {...GOLD} />
        <path d="M 160 94 L 160 104 L 148 94" {...GOLD} />
        <rect x="96" y="69" width="46" height="5" {...DARK} />
        <rect x="96" y="80" width="60" height="5" fill="rgba(27,27,27,.4)" />
        <rect x="30" y="88" width="26" height="10" rx="3" {...S} />
        <line x1="62" y1="93" x2="78" y2="93" {...S} />
      </svg>;
    /* 技能插槽：插槽格 + 斜插的金色技能块 */
    case 'skill':
      return <svg viewBox="0 0 200 112" className="vr-ac-svg" aria-hidden="true">
        <rect x="58" y="22" width="34" height="34" rx="4" {...S} />
        <rect x="100" y="22" width="34" height="34" rx="4" {...S} />
        <rect x="58" y="64" width="34" height="34" rx="4" {...S} />
        <rect x="100" y="64" width="34" height="34" rx="4" {...S} />
        <circle cx="75" cy="39" r="5" {...SOFT} />
        <circle cx="117" cy="81" r="5" {...SOFT} />
        <rect x="63" y="69" width="24" height="4" {...SOFT} />
        <rect x="105" y="27" width="24" height="4" {...SOFT} />
        <g transform="rotate(-14 150 40)">
          <rect x="128" y="26" width="44" height="30" rx="4" {...GOLD} />
          <rect x="135" y="38" width="30" height="5" {...DARK} />
        </g>
        <line x1="92" y1="39" x2="100" y2="39" {...S} strokeDasharray="3 3" />
        <line x1="92" y1="81" x2="100" y2="81" {...S} strokeDasharray="3 3" />
      </svg>;
    /* 组件：三张堆叠卡片，顶卡金顶条 */
    case 'component':
      return <svg viewBox="0 0 200 112" className="vr-ac-svg" aria-hidden="true">
        <rect x="52" y="34" width="84" height="56" rx="5" {...S} fill="rgba(255,255,255,.55)" />
        <rect x="62" y="24" width="84" height="56" rx="5" {...S} fill="rgba(255,255,255,.8)" />
        <rect x="72" y="14" width="84" height="60" rx="5" {...S} />
        <rect x="72" y="14" width="84" height="10" rx="5" {...GOLD} />
        <rect x="80" y="32" width="30" height="22" rx="3" {...SOFT} />
        <rect x="116" y="34" width="32" height="5" {...SOFT} />
        <rect x="116" y="44" width="24" height="5" {...SOFT} />
        <rect x="80" y="60" width="52" height="6" rx="3" {...DARK} />
        <circle cx="170" cy="88" r="2.4" {...GOLD} />
        <line x1="30" y1="88" x2="160" y2="88" {...S} strokeDasharray="4 4" />
      </svg>;
    /* 日程中枢：日历格 + 金色高亮日 + 事件条 */
    case 'schedule':
      return <svg viewBox="0 0 200 112" className="vr-ac-svg" aria-hidden="true">
        <rect x="42" y="16" width="116" height="80" rx="4" {...S} />
        <rect x="42" y="16" width="116" height="14" rx="4" {...DARK} />
        <rect x="50" y="20" width="20" height="5" {...GOLD} />
        {[0, 1, 2, 3, 4].map((c) => [0, 1, 2].map((r) => (
          <rect key={`${c}-${r}`} x={52 + c * 21.5} y={38 + r * 18} width="16" height="13" rx="2"
            {...(c === 2 && r === 1 ? GOLD : { ...S, fill: 'rgba(27,27,27,.05)' })} />
        )))}
        <rect x="164" y="52" width="24" height="10" rx="3" {...GOLD} />
        <line x1="158" y1="57" x2="164" y2="57" {...S} />
        <rect x="12" y="52" width="22" height="10" rx="3" {...S} />
        <line x1="34" y1="57" x2="42" y2="57" {...S} />
      </svg>;
    /* 云端同步：云 + 双向同步箭头 + 节点 */
    case 'cloud':
      return <svg viewBox="0 0 200 112" className="vr-ac-svg" aria-hidden="true">
        <path d="M 66 46 a 16 16 0 0 1 30 -8 a 13 13 0 0 1 24 6 a 11 11 0 0 1 -2 22 L 76 66 a 13 13 0 0 1 -10 -20 Z" {...S} />
        <rect x="84" y="42" width="24" height="6" {...GOLD} />
        <line x1="96" y1="70" x2="96" y2="84" {...S} strokeDasharray="3 3" />
        <path d="M 91 80 L 96 86 L 101 80" {...S} />
        <rect x="62" y="88" width="68" height="14" rx="4" {...S} />
        <rect x="70" y="93" width="18" height="4" {...GOLD} />
        <rect x="94" y="93" width="26" height="4" {...SOFT} />
        <circle cx="160" cy="34" r="4" {...S} />
        <circle cx="172" cy="52" r="2.6" {...DARK} />
        <line x1="120" y1="34" x2="156" y2="34" {...S} strokeDasharray="4 4" />
        <rect x="20" y="30" width="24" height="10" rx="3" {...S} />
        <line x1="44" y1="35" x2="58" y2="38" {...S} strokeDasharray="3 3" />
      </svg>;
    default:
      return null;
  }
}

export default function ArticleCover({ article, index, transition = false, className = '' }) {
  return (
    <span
      className={`vr-article-cover vr-cover-${article.theme} ${className}`.trim()}
      style={transition ? { viewTransitionName: 'article-cover' } : undefined}
      aria-hidden="true"
    >
      <span className="vr-ac-kicker">VOYRA / NOTES</span>
      <span className="vr-ac-no">{String(index + 1).padStart(2, '0')}</span>
      <span className="vr-ac-art"><Art theme={article.theme} /></span>
      <span className="vr-ac-tag">{TAGS[article.theme] || 'NOTES'}</span>
    </span>
  );
}
