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
  /* 序号：42px 空心描边数字，绝对定位在卡片左下角。
     历史三次反复，结论以参考站为准：
       v1  有（从 no 字段推导，会渲染出超宽单词，改为数据显式给 seq）
       v2  删（理由「与眉标重复」—— 错判了它的职责）
       v4  恢复（参考站 .pnum 一直在，它真正的职责不是编号，而是给左下角
              一个视觉压角：CTA 左对齐后左下有块安静空白，序号填在这里，
              卡面才有四角呼应）
     只收 1-2 位纯数字，取不到就不渲染。 */
  const seq = /^\d{1,2}$/.test(card.seq ?? '') ? card.seq : null;
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
      {/* v4：v3 在这里加过一条 6 枚品牌 logo 的顶部横带，已撤掉。
         撤掉的原因：参考站 .pcard 顶部没有任何横带，卡片信息量只有四样；
         我加上横带后信息量翻倍，且横带把「眉标→标题→描述→Meta」这条
         阅读动线的起点又往上推了一层，读者第一眼看到的是一排小图标
         而不是产品名。商品图标改放舞台内部（商品行前置 logo），
         既满足「有售卖东西的图标」，又不与参考站的极简结构冲突。 */}
      <div className="sc-body">
        {/* v4 结构：严格对齐参考站 oiloil.org 的 .pcard。
           参考站实测（Playwright 取计算值）只有四样东西：
             .pinfo  logo 40px + 标题 + 一句描述 + CTA   ← 四样都在 .pinfo 内部
             .stage  356×200、aspect-ratio 16/9 的产品界面缩略
             .pnum   42px 空心描边序号，absolute bottom:18 left:28
           **没有眉标、没有 Meta 行、没有顶部品牌带** —— 这三层都是我此前
           自己加的，加上之后卡片信息量是参考站的两倍，视觉重心被小字吃掉，
           用户连续两次反馈「不行」。v4 全部撤掉，只保留参考站验证过的四样。

           ⚠️ CTA 必须留在 .sc-copy **内部**（参考站 .pinfo 的结构）。
           v4 第一版把 .sc-foot 留在 .sc-body 外面，忘了 .sc-body 已经从
           三行网格改成两列 —— 自动放置把 CTA 排到了第二行第一列，
           卡片被撑到 377px（同行的另一张 300px），一排卡高度参差。

           商品图标不丢：它在舞台内部（商品格前置品牌 logo），
           那才是「售卖的东西」该在的位置 —— 参考站的舞台也是产品界面缩略。 */}
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
          <div className="sc-foot">
            <span className="sc-cta">
              {card.cta} <ArrowUpRight size={15} />
            </span>
          </div>
        </div>

        <div className="sc-stage">
          <Stage />
        </div>
      </div>
      {/* 序号：42px 空心描边数字，绝对定位在卡片左下角（参考站 .pnum 的做法）。
         v2 时删过一次，理由是「信息与眉标重复」—— 但参考站一直保留它，
         它真正的职责不是编号，而是**给左下角一个视觉压角**：
         参考站的 CTA 左对齐，左下角有一块安静空白，序号填在这里，
         卡面才有四角呼应。v4 恢复。 */}
      {seq ? <span className="sc-seq" aria-hidden="true">{seq}</span> : null}
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
