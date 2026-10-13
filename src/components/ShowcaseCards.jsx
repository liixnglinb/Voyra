import React from 'react';
import {
  ArrowUpRight, Globe, CalendarRange, Film, Lightbulb, Shapes,
  Sparkles, Bot, Route, Milk, Dices, ClipboardCheck, Star, Workflow,
  /* Store / Ticket：2026-10-13 新增的 VoyraAI 商城与推荐通道用。
     两张卡都带 logo，图标只在外链 logo 加载失败时兜底。 */
  Store, Ticket,
} from 'lucide-react';
import { SHOWCASE_CARDS, SHOWCASE_GROUPS, CARD_BY_ID } from '../data/showcase-cards';
import { STAGES } from './stages';
import { toHashUrl } from '../lib/hash-url';

/* ==========================================================================
   首页橱窗卡 · 统一产品名片
   --------------------------------------------------------------------------
   骨架（眉标 / 图标 / 标题 / 描述 / 序号 / CTA）完全共用，卡片之间只允许在
   两个维度上不同 —— 基调（tone）与舞台画面（stage）。
   配色收敛到黑 / 金 / 白 / 蓝四色，差异交给「4 基调 × 19 画面」的组合，
   而不是靠堆色相。

   2026-10 按参考站 oiloil.org 重做「长度、宽度与内部风格」：
     · 列表改**单列全宽**（参考站产品区就是一列全宽卡），卡片净宽 ≈746px；
     · 卡内改「文字 1.15fr | 舞台 1fr」左右分栏，奇偶左右交替；
     · 标题 40px / 800、图标盒 40px、序号 42px 空心描边 —— 全部照搬参考站。
   数据里的 `layout` 字段保留但**不再参与渲染**（契约不破）：参考站没有版式
   变体，而且产品区只剩 2 张卡，凑不出有意义的组合。
   ========================================================================== */

/* lucide 图标名 → 组件。数据里存字符串是为了让 showcase-cards.js 保持零 React 依赖，
   将来那份数据若要迁到 worker / 静态生成，不用改。 */
const ICONS = {
  Globe, CalendarRange, Film, Lightbulb, Shapes, Sparkles, Bot,
  Route, Milk, Dices, ClipboardCheck, Star, Workflow, Store, Ticket,
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
  /* 墨：舞台反色成深色底 + 浅色描边。19 张里最重的一档。
     底色不用纯黑（#000/#111 会变成一块生硬的黑板），改成炭灰，面板再亮一档 ——
     深色面板要能看出层次，而不是糊成一片。
     色温：跟全站的暖米纸张同一侧（偏暖的中性灰）。原先带一点蓝调，放在米色页面上
     像一块从别的产品搬来的石墨板。 */
  ink: {
    accent: '#8A6D1F', accentInk: '#634E16',
    /* 2026-10-13（v2）：底色从 #141311 提到 #1F1E1C，面板从 #33312E 提到 #3A3835。
       原来的纯黑舞台贴在米白卡上像「一张黑卡叠一张白卡」，对比过硬、边界生硬。
       提亮后仍是四基调里最重的一档，但和纸面卡壳的关系变成「深色面板浮在白纸上」
       而不是「两个不相干的块贴在一起」。 */
    stgInk: '#FFFFFF', stgText: '#FFFFFF', stgPanel: '#3A3835', stgBg1: '#242220', stgBg2: '#1F1E1C',
  },
  /* 金：暖米色舞台 + 金调描边，站内金家族。这一档就是全站的基准色温。
     v2 同样把 bg1 压低一档（原 #F2E8D2 偏亮，与卡壳白底几乎同色、失去面板感）。 */
  gold: {
    accent: '#8A6D1F', accentInk: '#634E16',
    stgInk: '#8A6D1F', stgText: '#6B5417', stgPanel: '#FFFCF3', stgBg1: '#F2E7CC', stgBg2: '#FBF6EA',
  },
  /* 蓝：整页唯一的冷色。底色是"降过饱和的冷灰蓝"而不是天蓝 —— 天蓝（原 #E6EEFC）
     在米色页面上是一块会跳出来的补色，压得整页发花；降饱和后它仍是冷的那一档，
     但和暖调页面同处一个亮度层，靠色相而不是靠明度抢眼。
     描边与文字用的 stgInk/stgText 保持原来的正蓝：那是图形与数据该有的重量。 */
  blue: {
    accent: '#1F5FE0', accentInk: '#1644A1',
    stgInk: '#1F5FE0', stgText: '#1F5FE0', stgPanel: '#FFFFFF', stgBg1: '#E9EDF6', stgBg2: '#FFFFFF',
  },
  /* 纸：近白舞台 + 黑细线，最克制的一档，像技术图纸。
     底色从冷灰（原 #F0F0EE）换成暖灰：站点的纸是米白的，冷灰压在上面显脏。 */
  paper: {
    accent: '#1A1A1A', accentInk: '#000000',
    stgInk: '#1A1A1A', stgText: '#1A1A1A', stgPanel: '#FFFFFF', stgBg1: '#F1EEE6', stgBg2: '#FFFFFF',
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
     现在由数据显式给 seq，取不到数字就不渲染。
     2026-10-13（v2）：v1 用 42px 空心描边数字钉在左下角占一整格，
     信息价值为零却和 CTA 争视觉重心 —— 序号信息眉标里已经有了（'01 / 接口网关'），
     属于重复表达。现在彻底删掉这一元素，把左下角让给 Meta 行。 */
  const [noCode, noLabel] = String(card.no ?? '').split('/').map((part) => part.trim());
  /* v2 新增：Meta 行三标签。缺 meta 的卡不渲染这一行（不写占位符，
     空标签比没有标签更难看）。 */
  const meta = Array.isArray(card.meta) ? card.meta.filter(Boolean).slice(0, 3) : [];
  /* v3 新增：品牌带。只有声明了 brands 的卡才渲染（目前仅 VoyraAI 两张），
     其它卡不出现这条横带 —— 它不是通用装饰，是「售卖范围」的索引。
     数据里写 slug 与品牌名，路径在这里统一拼，避免每张卡写全 URL。 */
  const brands = Array.isArray(card.brands) ? card.brands : null;
  /* 版式字段保留在数据里但不再驱动渲染（参考站没有版式变体）。
     类名照旧带上 layout-<x>，只是 CSS 里已无对应规则 —— 这样数据契约不破，
     日后想恢复某种版式也能从 DOM 上一眼看到原值。 */
  const layout = card.layout || 'copy';

  return (
    <a
      href={href}
      {...linkProps}
      /* layout-<x> 类名保留但 CSS 里已无对应规则（版式变体取消）。
         留着是为了不改数据契约，也方便日后想恢复某种版式时一眼看到原值。 */
      className={`sc-card st-${card.family} layout-${layout}`}
      /* data-voyra-card 是 useCardEffects 的挂钩。 */
      data-voyra-card
      style={toneVars(card.tone)}
      aria-label={`${card.name}：${card.cta}${card.external ? '（新标签页）' : ''}`}
    >
      {/* 指针跟随的金色光斑 —— 参考站 .card-spotlight 的招牌效果。
          --spot-x / --spot-y 由 useCardEffects 的 rAF 写入（已做 rect 缓存，
          不会在 pointermove 上触发强制布局）。
          aria-hidden：纯装饰；它盖在卡面之上但不拦截指针（pointer-events:none）。 */}
      <span className="sc-spotlight" aria-hidden="true" />
      {/* ── 品牌带（v3 新增）─────────────────────────────────────────────────
         用户 2026-10-13 要求「上面最好有我售卖的那些东西的图标」。
         放在 .sc-body 之外、卡片最顶端横跨全宽 —— 它是一个**横带**，
         不是两栏布局里的某一栏，放进 grid 会和文字栏抢列宽。

         为什么放顶部而不是塞进舞台：舞台是「产品长什么样」的演示，
         品牌带是「我卖哪些牌子」的索引，两件事层级不同。
         读者扫到卡片上半部就知道卖什么，不用读完描述再去看演示。

         顺序即优先级：ChatGPT / Gemini / X Premium 是站内精选前三，
         与舞台前三行一一对应；Claude / 多邻国 / Gmail 是品类补位。
         aria-hidden：品牌识别由 aria-label 承担，读屏器念一串 logo 是噪音。 */}
      {brands ? (
        <div className="sc-brandstrip" aria-hidden="true">
          {brands.map((b) => (
            <img
              key={b.slug}
              className="sc-brandstrip-logo"
              src={`/voyraai/brands/${b.slug}.svg`}
              alt=""
              width="22"
              height="22"
              loading="lazy"
              decoding="async"
            />
          ))}
        </div>
      ) : null}
      <div className="sc-body">
        {/* v2 结构：眉标 / 文案 / 页脚三段各占一行，舞台独占一列跨满三行
            （见 .sc-body 的 grid-template-areas）。这样舞台高度自动等于文字段总高，
            不必给舞台写死高度，两张卡也自然等高。 */}
        <span className="sc-eyebrow">
          {noLabel ? (<><b>{noCode}</b>{noLabel}</>) : null}
        </span>

        <div className="sc-copy">
          <div className="sc-title-row">
            <span className={`sc-brand${card.logo ? ' has-logo' : ''}`} aria-hidden="true">
              {card.logo
                ? <img src={card.logo} alt="" width="40" height="40" loading="lazy" decoding="async" />
                : <Icon size={20} strokeWidth={1.9} />}
            </span>
            <h3 className="sc-title">{card.name}</h3>
          </div>
          <p className="sc-desc" title={card.desc}>{desc}</p>
          {/* Meta 行：平台 · 形态 · 状态。放在描述与 CTA 之间 ——
              视觉上紧跟描述（同一段「说明」），又与 CTA 之间留足 22px，
              避免两行小字粘在一起。 */}
          {meta.length ? (
            <ul className="sc-meta">
              {meta.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
        </div>

        <div className="sc-stage">
          <Stage />
        </div>

        <div className="sc-foot">
          <span className="sc-cta">
            {card.cta} <ArrowUpRight size={15} />
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
