import React from 'react';
import {
  ArrowUpRight, Globe, CalendarRange, Film, Lightbulb, Shapes,
  Sparkles, Bot, Route, Milk, Dices, ClipboardCheck, Star, Workflow,
  Store, Ticket, HeartPulse,
} from 'lucide-react';
import { SHOWCASE_CARDS, SHOWCASE_GROUPS, CARD_BY_ID } from '../data/showcase-cards';
import { STAGES } from './stages';
import { CardIllustration } from './CardIllustrations';
import { CARD_ILLUSTRATIONS } from '../data/card-illustrations';
import { toHashUrl } from '../lib/hash-url';

/* ==========================================================================
   首页橱窗卡：共用信息骨架，每个已展示产品拥有专属配色与矢量插画。
   未展示的历史卡片继续使用既有 tone / STAGES，保持组件接口兼容。
   ========================================================================== */

const ICONS = {
  Globe, CalendarRange, Film, Lightbulb, Shapes, Sparkles, Bot,
  Route, Milk, Dices, ClipboardCheck, Star, Workflow, Store, Ticket, HeartPulse,
};

function resolveIcon(name, family) {
  return ICONS[name] || ICONS[family] || Sparkles;
}

/* ── 四色基调 ───────────────────────────────────────────────────────
   整站卡片只用 黑 / 金 / 白 / 蓝 四色体系：
     · ink   墨（黑底白线舞台，强调色走金）
     · gold  金（暖米色舞台 + 金调描边，深金文字 #6B5417 保证 ≥4.5:1）
     · blue  蓝（淡蓝舞台 + 蓝调描边，全站唯一冷色）
     · paper 纸（近白舞台 + 黑细线，技术图纸质感）

   CSS 变量严格分组：
     --p-accent / --p-rgb          卡片外壳强调色（逗号分隔 RGB）
     --stg-ink / --stg-ink-rgb     舞台图形描边与实心块（≥ 3:1）
     --stg-text / --stg-text-rgb   舞台文字（≥ 4.5:1）
     --stg-panel / --stg-bg1 / --stg-bg2  舞台面板与底色
   ────────────────────────────────────────────────────────────────── */
const TONES = {
  ink: {
    accent: '#8A6D1F', accentInk: '#634E16',
    stgInk: '#FFFFFF', stgText: '#FFFFFF', stgPanel: '#3A3835', stgBg1: '#242220', stgBg2: '#1F1E1C',
  },
  gold: {
    accent: '#8A6D1F', accentInk: '#634E16',
    stgInk: '#8A6D1F', stgText: '#6B5417', stgPanel: '#FFFCF3', stgBg1: '#F2E7CC', stgBg2: '#FBF6EA',
  },
  blue: {
    accent: '#1F5FE0', accentInk: '#1644A1',
    stgInk: '#1F5FE0', stgText: '#1F5FE0', stgPanel: '#FFFFFF', stgBg1: '#E9EDF6', stgBg2: '#FFFFFF',
  },
  paper: {
    accent: '#1A1A1A', accentInk: '#000000',
    stgInk: '#1A1A1A', stgText: '#1A1A1A', stgPanel: '#FFFFFF', stgBg1: '#F1EEE6', stgBg2: '#FFFFFF',
  },
};

const TONE_FALLBACK = 'paper';

function parseHex(input) {
  const matched = /^#?([0-9a-f]{6})$/i.exec(String(input ?? '').trim());
  if (!matched) return null;
  const value = parseInt(matched[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toneVars(tone) {
  const t = TONES[tone] || TONES[TONE_FALLBACK];
  const [ar, ag, ab] = parseHex(t.accent);
  const [sr, sg, sb] = parseHex(t.stgInk);
  const [tr, tg, tb] = parseHex(t.stgText);
  return {
    '--p-accent': t.accent,
    '--p-rgb': `${ar}, ${ag}, ${ab}`,
    '--p-soft': `rgba(${ar}, ${ag}, ${ab}, 0.10)`,
    '--p-line': `rgba(${ar}, ${ag}, ${ab}, 0.30)`,
    '--p-glow': `rgba(${ar}, ${ag}, ${ab}, 0.30)`,
    '--p-ink': t.accentInk,
    '--stg-ink': t.stgInk,
    '--stg-ink-rgb': `${sr}, ${sg}, ${sb}`,
    '--stg-text': t.stgText,
    '--stg-text-rgb': `${tr}, ${tg}, ${tb}`,
    '--stg-panel': t.stgPanel,
    '--stg-bg1': t.stgBg1,
    '--stg-bg2': t.stgBg2,
  };
}

function illustrationVars(theme) {
  const rgb = parseHex(theme.accent).join(', ');
  return {
    '--p-accent': theme.accent,
    '--p-rgb': rgb,
    '--p-soft': theme.canvas,
    '--p-line': `rgba(${rgb}, 0.2)`,
    '--p-ink': theme.ink,
    '--sc-surface': theme.soft,
    '--art-canvas': theme.canvas,
    '--art-color': theme.color,
    '--art-light': theme.light,
    '--art-ink': theme.ink,
    '--art-soft': theme.soft,
  };
}

/**
 * 单张产品卡。
 * @param {object} card      showcase-cards.js 里的一条数据
 * @param {boolean} isMobile 移动端：描述换成短文案（沿用既有约定）
 * @param {string} shortDesc 移动端短文案
 */
export function ProductCard({ card, isMobile = false, shortDesc }) {
  const Icon = resolveIcon(card.Icon, card.family);
  const Stage = STAGES[card.stage?.kind];
  const linkProps = card.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const href = card.external
    ? card.href
    : card.staticPage
      ? card.href
      : toHashUrl(card.href);
  const desc = (isMobile && shortDesc) || card.desc;
  const seq = /^\d{1,2}$/.test(card.seq ?? '') ? card.seq : null;
  const layout = card.layout || 'copy';
  const tone = TONES[card.tone] ? card.tone : TONE_FALLBACK;
  const illustration = CARD_ILLUSTRATIONS[card.id];

  return (
    <a
      href={href}
      {...linkProps}
      className={`sc-card st-${card.family} tone-${tone} layout-${layout}${illustration ? ' sc-illustrated' : ''}`}
      data-voyra-card
      data-card-id={card.id}
      data-tone={tone}
      style={{ ...toneVars(tone), ...(illustration ? illustrationVars(illustration) : {}) }}
      aria-label={`${card.name}：${card.cta}${card.external ? '（新标签页）' : ''}`}
    >
      <span className="sc-spotlight" aria-hidden="true" />
      <div className="sc-body">
        <div className="sc-copy">
          {card.no ? (
            <div className="sc-eyebrow" aria-hidden="true">
              <i className="sc-eyebrow-dot" />
              <span>{card.no}</span>
            </div>
          ) : null}
          <div className="sc-title-row">
            <span className={`sc-brand${card.logo ? ' has-logo' : ''}`} aria-hidden="true">
              {card.logo
                ? <img src={card.logo} alt="" width="40" height="40" loading="lazy" decoding="async" />
                : <Icon size={20} strokeWidth={1.9} />}
            </span>
            <h3 className="sc-title">{card.name}</h3>
          </div>
          <p className="sc-desc" title={card.desc}>{desc}</p>
          <div className="sc-foot">
            <span className="sc-cta">
              {card.cta} <ArrowUpRight size={15} />
            </span>
          </div>
        </div>

        <div className="sc-stage" aria-hidden="true">
          {illustration ? <>
            <span className="sc-art-label">{illustration.label}</span>
            <CardIllustration card={card} />
          </> : Stage ? <Stage card={card} stage={card.stage} /> : null}
        </div>
      </div>
      {seq ? <span className="sc-seq" aria-hidden="true">{seq}</span> : null}
    </a>
  );
}

/* ── 兼容层 ────────────────────────────────────────────────────────── */
function makeCard(id) {
  return function CardFromId(props) {
    const card = CARD_BY_ID[id];
    if (!card) return null;
    return <ProductCard card={card} {...props} />;
  };
}

export const CardRelayApi = makeCard('api');
export const CardScheduleHub = makeCard('timetable');
export const CardPelicanGallery = makeCard('pelican');
export const CardPromptLibrary = makeCard('prompts');
export const CardUIKit = makeCard('uikit');
export const CardSkillHub = makeCard('skills');
export const CardAgentSkills = makeCard('agents');
export const CardMindMap = makeCard('mindmap');
export const CardBabyCare = makeCard('care');
export const CardDrawPicker = makeCard('draw');
export const CardDietCheckin = makeCard('diet');
export const CardMathmodelSkill = makeCard('mathmodel');
export const CardModelflow = makeCard('modelflow');
export const CardCheckin = makeCard('checkin');
export const CardLocalToolbox = makeCard('toolbox');
export const CardBillTrace = makeCard('billtrace');
export const CardTokenMonitor = makeCard('token');
export const CardZenew = makeCard('zenew');
export const CardAIChronicle = makeCard('chronicle');

export { SHOWCASE_CARDS, SHOWCASE_GROUPS, CARD_BY_ID };
