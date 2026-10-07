import React from 'react';
import {
  ArrowUpRight, Globe, CalendarRange, Film, Lightbulb, Shapes,
  Sparkles, Bot, Route, Milk, Dices, ClipboardCheck, Star, Workflow,
} from 'lucide-react';
import { SHOWCASE_CARDS, SHOWCASE_GROUPS, CARD_BY_ID } from '../data/showcase-cards';
import { STAGES } from './stages';
import { toHashUrl } from '../lib/hash-url';

/* ==========================================================================
   首页 19 张产品卡 · 统一产品名片
   --------------------------------------------------------------------------
   改造前：19 个独立组件 + 19 段专属 stage 样式，共约 2962 行。
           每张卡都是「微缩软件界面」的复刻，因此 19 张卡长成 19 种样子，
           放在一起像拼贴；stage 内容还与对应下载页重复，且不可交互。
   改造后：1 个 ProductCard + 19 个独立舞台。
           骨架（眉标 / 图标 / 标题 / 描述 / 序号 / CTA）完全共用，
           卡片之间只允许在三个维度上不同 —— 基调（tone）、版式（layout）、
           舞台画面（stage）。配色收敛到黑 / 金 / 白 / 蓝四色，
           差异交给「4 基调 × 3 版式 × 19 画面」的组合，而不是靠堆色相。
   ========================================================================== */

/* lucide 图标名 → 组件。数据里存字符串是为了让 showcase-cards.js 保持零 React 依赖，
   将来那份数据若要迁到 worker / 静态生成，不用改。 */
const ICONS = {
  Globe, CalendarRange, Film, Lightbulb, Shapes, Sparkles, Bot,
  Route, Milk, Dices, ClipboardCheck, Star, Workflow,
};

/** 数据里的 Icon 字段（字符串）→ lucide 组件；缺图标时回落到卡片族默认图形。 */
function resolveIcon(name, family) {
  return ICONS[name] || ICONS[family] || Sparkles;
}

/* ── 四色基调 ───────────────────────────────────────────────────────
   整页配色收敛到站内既有的四个颜色：黑 / 金 / 白 / 蓝。每张卡从 TONES 取一个
   基调，基调同时决定两件事：
     · 卡片强调色 —— 眉标短码、序号描边、CTA、图标盒、悬停辉光
     · 舞台画法 —— 底色、描边、面板填充

   为什么 ink 基调的强调色是金而不是黑：卡片底盘始终是白纸，黑压黑分不出层级。
   ink 的「黑」体现在舞台反色上，强调色仍交给站内金。四色因此各司其职：
     白 = 卡底 · 黑 = 舞台与正文 · 金 = 强调 · 蓝 = 冷色变体

   变量分两组前缀，避免互相污染：
     --p-*    卡片外壳
     --stg-*  舞台内部

   舞台内部又分 ink 与 text 两个色：ink 用于描边和实心块（图形对象，按
   WCAG 1.4.11 只需对底色 ≥ 3:1），text 用于真正的文字（需 ≥ 4.5:1）。
   分开是必需的 —— 金色基调的 #8A6D1F 作图形有 4.02:1（够），
   但当文字只有 4.02:1 就差一点点，所以文字改用更深的 #6B5417（5.95:1）。

   --p-rgb / --stg-ink-rgb / --stg-text-rgb 必须是**逗号分隔**的三元组：
   rgba(var(--x), α) 里若 var 展开成空格分隔的 "31 95 224"，拼出来的是非法值，
   整条声明会被丢弃，文字和图形会一起消失。
   ────────────────────────────────────────────────────────────────── */
const TONES = {
  /* 墨：舞台反色成黑底白线。19 张里最重的一档。
     面板 #3A3A3A 比底色 #1F1F1F 亮一档（1.45:1），加上 22% 白描边，
     面板在黑底上仍然读得出来 —— 面板太暗会和底糊成一片。 */
  ink: {
    accent: '#8A6D1F', accentInk: '#634E16',
    stgInk: '#FFFFFF', stgText: '#FFFFFF', stgPanel: '#3A3A3A', stgBg1: '#1F1F1F', stgBg2: '#101010',
  },
  /* 金：暖米色舞台 + 金调描边，站内金家族。 */
  gold: {
    accent: '#8A6D1F', accentInk: '#634E16',
    stgInk: '#8A6D1F', stgText: '#6B5417', stgPanel: '#FFFCF3', stgBg1: '#F2E8D2', stgBg2: '#FFFFFF',
  },
  /* 蓝：淡蓝舞台 + 蓝调描边，整页唯一的冷色。 */
  blue: {
    accent: '#1F5FE0', accentInk: '#1644A1',
    stgInk: '#1F5FE0', stgText: '#1F5FE0', stgPanel: '#FFFFFF', stgBg1: '#E6EEFC', stgBg2: '#FFFFFF',
  },
  /* 纸：近白舞台 + 黑细线，最克制的一档，像技术图纸。 */
  paper: {
    accent: '#1A1A1A', accentInk: '#000000',
    stgInk: '#1A1A1A', stgText: '#1A1A1A', stgPanel: '#FFFFFF', stgBg1: '#F0F0EE', stgBg2: '#FFFFFF',
  },
};

/* 数据里缺 tone 时的兜底：纸基调最克制，任何一张卡退到它都不会突兀。 */
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
    /* 10% 强调色。给 alpha 而不是与白混出的实色：卡片底盘本来就是白纸，
       压在白上等价，但换成 bleed 版式里压到舞台上时仍然成立。 */
    '--p-soft': `rgba(${ar}, ${ag}, ${ab}, 0.10)`,
    '--p-line': `rgba(${ar}, ${ag}, ${ab}, 0.30)`,
    '--p-glow': `rgba(${ar}, ${ag}, ${ab}, 0.30)`,
    /* CTA 悬停色。ink / gold 共用 #634E16（对白 7.98:1），
       blue 用 #1644A1（8.84:1），paper 用纯黑 —— 都比默认色更深。 */
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
  /* 三种链接，规则不同，别混：
       ① 外链（api / mathmodel）—— 绝对 https，target="_blank" 原样使用
       ② 独立静态落地页（7 张应用卡）—— public/<slug>/index.html，
          用**真实路径** `/modelflow/`。这类页不在 SPA 路由表里，
          加了 # 会被 HashRouter 当成未知路由重定向回首页。
       ③ SPA 路由（10 张产品卡）—— 站点用 HashRouter，必须走 `#/route`；
          直接给裸路径 `/timetable` 会让浏览器去请求服务端路径、hash 为空，
          永远渲染首页。这就是「点卡片跳不动」的原因。 */
  const href = card.external
    ? card.href
    : card.staticPage
      ? card.href
      : toHashUrl(card.href);
  const desc = (isMobile && shortDesc) || card.desc;
  /* 描边序号只收纯数字。之前是从 no 字段切 '/' 前段推导，结果
     'SKILL / CUMCM WORKFLOW' 渲染出 192px 宽的空心单词、
     'APP 01 / …' 渲染出 255px 宽的「APP 01」，在 361px 的卡上被右缘裁断。
     现在由数据显式给 seq，取不到数字就不渲染。 */
  const seq = /^\d{1,2}$/.test(card.seq ?? '') ? card.seq : null;
  /* 眉标取自 no 字段的「类目词」段（'01 / API GATEWAY' → 'API GATEWAY'）。
     改造前 no 在卡片上一次都没渲染，等于白存了 19 条类目信息；
     现在它拆成两段：左侧短码走强调色、右侧类目词走灰，补回杂志刊头的层级。 */
  const [noCode, noLabel] = String(card.no ?? '').split('/').map((part) => part.trim());
  /* 版式：copy 文字在上 / stage 舞台在上 / bleed 舞台出血。
     缺字段时退回 copy，保证新增数据不会渲染成一张没有排布的卡。 */
  const layout = card.layout || 'copy';

  return (
    <a
      href={href}
      {...linkProps}
      className={`sc-card st-${card.family} layout-${layout}`}
      /* data-voyra-card 是 useCardEffects 的挂钩。改造时漏挂，导致 3D 倾斜 /
         Spotlight / 视差三套指针效果整体失效，卡片悬停只剩 2px 上移。 */
      data-voyra-card
      style={toneVars(card.tone)}
      aria-label={`${card.name}：${card.cta}${card.external ? '（新标签页）' : ''}`}
    >
      {/* 装饰层：流光扫过（hover）与指针光斑（跟随 --spot-x/--spot-y）。
          两者都 pointer-events:none，不参与命中，也不进可访问性树。 */}
      <span className="sc-sheen" aria-hidden="true" />
      <span className="sc-spot" aria-hidden="true" />

      <div className="sc-body">
        {/* 眉标是三套版式共用的第一个网格项。放在 .sc-copy 之外，
            layout-stage / layout-bleed 才能把它留在最上方、
            而把「标题 + 描述」整块挪到舞台之后。 */}
        <span className="sc-eyebrow">
          {noLabel ? (<><b>{noCode}</b>{noLabel}</>) : null}
        </span>

        <div className="sc-copy">
          <div className="sc-title-row">
            <span className={`sc-brand${card.logo ? ' has-logo' : ''}`} aria-hidden="true">
              {card.logo
                ? <img src={card.logo} alt="" width="34" height="34" loading="lazy" decoding="async" />
                : <Icon size={19} strokeWidth={1.9} />}
            </span>
            <h3 className="sc-title">{card.name}</h3>
          </div>
          <p className="sc-desc" title={card.desc}>{desc}</p>
        </div>

        <div className="sc-stage">
          <Stage />
        </div>

        <div className="sc-foot">
          {seq ? <span className="sc-seq" aria-hidden="true">{seq}</span> : <span />}
          <span className="sc-cta">
            {card.cta} <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </a>
  );
}

/* ── 兼容层 ──────────────────────────────────────────────────────────
   改造前 Dashboard 用 `SPEC_CARDS.products.map((Comp, i) => <Comp />)` 渲染。
   现在改为直接传 id，但这层封装保留着，旧的具名导出也一并保留，
   这样其它文件若还 import CardModelflow 之类的名字不会立刻炸。 */
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
