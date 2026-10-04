import React from 'react';
import {
  ArrowUpRight, HardDrive, Globe, CalendarRange, Film, Lightbulb, Shapes,
  Sparkles, Bot, Route, Milk, Dices, ClipboardCheck, Star,
} from 'lucide-react';
import { SHOWCASE_CARDS, SHOWCASE_GROUPS, CARD_BY_ID } from '../data/showcase-cards';

/* ==========================================================================
   首页 19 张产品卡 · 统一产品名片（方案 A）
   --------------------------------------------------------------------------
   改造前：19 个独立组件 + 19 段专属 stage 样式，共约 2962 行。
           每张卡都是「微缩软件界面」的复刻，因此 19 张卡长成 19 种样子，
           放在一起像拼贴；stage 内容还与对应下载页重复，且不可交互。
   改造后：1 个 ProductCard + 4 套 stage 模板。
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
  Route, Milk, Dices, ClipboardCheck, Star, HardDrive,
};

/** 数据里的 Icon 字段（字符串）→ lucide 组件；缺图标时回落到卡片族默认图形。 */
function resolveIcon(name, family) {
  return ICONS[name] || ICONS[family] || Sparkles;
}

/* ── 模板一：icon-tile ──────────────────────────────────────────────
   大图标落在主题色光晕上，四周环绕三条能力说明。
   用于日程中心、织流 —— 它们本身就是「一个产品」，不需要演示流程。 */
function StageIconTile({ stage, Icon }) {
  const Glyph = stage.glyph ? ICONS[stage.glyph] : null;
  return (
    <div className="st-tile">
      <span className="st-tile-glow" aria-hidden="true" />
      <span className="st-tile-icon" aria-hidden="true">
        {Glyph ? <Glyph size={30} strokeWidth={1.5} /> : <Icon size={30} strokeWidth={1.5} />}
      </span>
      <ul className="st-tile-list">
        {stage.items.map(([k, v]) => (
          <li key={k}>
            <b>{k}</b>
            <span>{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── 模板二：flow-nodes ─────────────────────────────────────────────
   3-4 个圆点由一条 SVG 虚线连接，节点下方标注名称。
   用于提示词库、AI Agent、思维导图、饮食打卡、随机抽人、数模、知新 ——
   它们的共同点是「一件事分几步走」。 */
function StageFlowNodes({ stage }) {
  const nodes = stage.nodes;
  return (
    <div className="st-flow">
      <span className="st-flow-title">{stage.title}</span>
      <div className="st-flow-track">
        <svg viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
          <line
            x1="4" y1="4" x2="96" y2="4"
            stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <ul>
          {nodes.map((n) => (
            <li key={n} className="st-flow-node">
              <span className="st-flow-dot" aria-hidden="true" />
              <span className="st-flow-label">{n}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── 模板三：badge-cluster ──────────────────────────────────────────
   顶部一行标题 + 徽章，下方键值对堆叠。
   用于模型对比秀、组件图鉴、Skill 热榜、学习通签到、账迹。 */
function StageBadgeCluster({ stage }) {
  return (
    <div className="st-badges">
      <div className="st-badges-top">
        <span className="st-badges-title">{stage.title}</span>
        <span className="st-badges-badge">{stage.badge}</span>
      </div>
      <ul>
        {stage.items.map(([k, v]) => (
          <li key={k}>
            <span className="st-badges-k">{k}</span>
            <span className="st-badges-v">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── 模板四：metric-panel ──────────────────────────────────────────
   顶部状态条 + 左侧一个大数字 + 右侧细分项列表。
   用于 API 网关、宝宝护理、磁盘清理、Token Monitor、AI 轨迹 ——
   它们的共同点是「有一个当前值值得被看见」。 */
function StageMetricPanel({ stage }) {
  return (
    <div className="st-metric">
      <div className="st-metric-top">
        <span className="st-metric-dot" aria-hidden="true" />
        <span className="st-metric-status">{stage.status}</span>
      </div>
      <div className="st-metric-body">
        <div className="st-metric-hero">
          <b className="st-metric-val">{stage.metric}</b>
          <span className="st-metric-label">{stage.metricLabel}</span>
        </div>
        <ul className="st-metric-list">
          {stage.items.map(([k, v]) => (
            <li key={k}>
              <span>{k}</span>
              <b>{v}</b>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const STAGE_TEMPLATES = {
  'icon-tile': StageIconTile,
  'flow-nodes': StageFlowNodes,
  'badge-cluster': StageBadgeCluster,
  'metric-panel': StageMetricPanel,
};

/**
 * 单张产品卡。
 * @param {object} card      showcase-cards.js 里的一条数据
 * @param {boolean} isMobile 移动端：描述换成短文案（沿用既有约定）
 * @param {string} shortDesc 移动端短文案
 */
export function ProductCard({ card, isMobile = false, shortDesc }) {
  const Icon = resolveIcon(card.Icon, card.family);
  const Stage = STAGE_TEMPLATES[card.stage.kind];
  const linkProps = card.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const desc = (isMobile && shortDesc) || card.desc;

  return (
    <a
      href={card.href}
      {...linkProps}
      className={`sc-card st-${card.family}`}
      aria-label={`${card.name}：${card.cta}${card.external ? '（新标签页）' : ''}`}
    >
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">{card.no}</span>
          <div className="sc-title-row">
            <span className="sc-brand" aria-hidden="true">
              {card.logo
                ? <img src={card.logo} alt="" width="26" height="26" loading="lazy" decoding="async" />
                : <Icon size={19} strokeWidth={1.9} />}
            </span>
            <h3 className="sc-title">{card.name}</h3>
          </div>
          <p className="sc-desc" title={card.desc}>{desc}</p>
        </div>
      </header>

      <div className="sc-stage">
        <Stage stage={card.stage} Icon={Icon} />
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">{card.foot}</span>
        <span className="sc-cta">
          {card.cta} <ArrowUpRight size={14} />
        </span>
      </footer>
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
