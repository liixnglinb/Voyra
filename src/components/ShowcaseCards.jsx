import React from 'react';
import {
  ArrowUpRight, Globe, CalendarRange, Film, Lightbulb, Shapes,
  Sparkles, Bot, Route, Milk, Dices, ClipboardCheck, Star, Workflow,
} from 'lucide-react';
import { SHOWCASE_CARDS, SHOWCASE_GROUPS, CARD_BY_ID } from '../data/showcase-cards';
import { STAGES } from './stages';

/* ==========================================================================
   首页 19 张产品卡 · 统一产品名片（方案 A）
   --------------------------------------------------------------------------
   改造前：19 个独立组件 + 19 段专属 stage 样式，共约 2962 行。
           每张卡都是「微缩软件界面」的复刻，因此 19 张卡长成 19 种样子，
           放在一起像拼贴；stage 内容还与对应下载页重复，且不可交互。
   改造后：1 个 ProductCard + 19 个独立舞台。
           骨架（编号 / 图标 / 标题 / 描述 / 标签 / CTA）完全共用，
           卡片之间只允许在「配色族」和「stage 视觉元素」两个维度有差异。

   四套 stage 模板的选择依据（按「这块区域在演示什么」归类，不是按视觉凑）：
     icon-tile     表达「这是一个产品」——大图标 + 环绕的次要能力
     flow-nodes    表达「这是一条流程」——圆点连线，节点可标注
     badge-cluster 表达「这是一份清单 / 榜单」——键值徽章堆叠
     metric-panel  表达「这是实时状态」——一个大数字 + 细分项
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
  const desc = (isMobile && shortDesc) || card.desc;
  /* 描边序号只收纯数字。之前是从 no 字段切 '/' 前段推导，结果
     'SKILL / CUMCM WORKFLOW' 渲染出 192px 宽的空心单词、
     'APP 01 / …' 渲染出 255px 宽的「APP 01」，在 361px 的卡上被右缘裁断。
     现在由数据显式给 seq，取不到数字就不渲染。 */
  const seq = /^\d{1,2}$/.test(card.seq ?? '') ? card.seq : null;

  return (
    <a
      href={card.href}
      {...linkProps}
      className={`sc-card st-${card.family}`}
      aria-label={`${card.name}：${card.cta}${card.external ? '（新标签页）' : ''}`}
    >
      <div className="sc-body">
        <div className="sc-copy">
          <div className="sc-title-row">
            <span className="sc-brand" aria-hidden="true">
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
