# AI 提示词 · 首页橱窗卡片优化（舞台小卡片动效 / 配色 / 内容 / 字体）

> 把本文件全文交给 AI 编码智能体执行即可。所有背景、约束、验收标准已内置，无需额外上下文。

---

## 一、项目背景（先读再改）

- 技术栈：Vite + React 18 + React Router（Hash 路由）的静态站，部署在 Cloudflare Pages。
- 首页是单页多 Tab（Dashboard.jsx），其中「橱窗卡片」是核心视觉模块，共渲染 **10 张卡片**。
- 相关文件（只允许改这几个）：
  - `src/data/showcase-cards.js` —— 卡片数据（`SHOWCASE_CARDS` 全量、`SHOWCASE_GROUPS` 决定渲染哪 10 张：产品 4 + 技能 1 + 应用 5）。**不要改动 SHOWCASE_GROUPS 的成员与顺序。**
  - `src/components/ShowcaseCards.jsx` —— 卡片渲染组件（`ProductCard` 是唯一卡片组件）。
  - `src/components/stages.jsx` —— 舞台组件（`STAGES`），即**卡片右侧/左侧那块展示真实数据的小场景**。
  - `src/styles/dashboard-cards.css` —— 卡片外壳样式（`.sc-*` 段）。
  - `src/styles/stage-scenes.css` —— 舞台场景样式。
- 卡片结构：`.sc-card`（白卡外壳）内分 `.sc-body` 两列（1.12fr / 1fr，偶数行左右交替）：一列是文字（眉标/标题/描述/CTA），另一列是 **`.sc-stage` 舞台**。**本次优化重点是舞台内的小卡片元素**（舞台里承载真实数据的那块 mini 卡片/图形）。

## 二、视觉规范（必须严格遵守，这是站点的既定语言）

1. **v5 视觉语言**：纯白圆角大卡（22px 圆角、1px #EAEAEA 边框、多层柔和阴影）、浅米色纸感网格背景、留白优先、强字号对比、阴影分层代替描边、动效有分寸。
2. **四色体系，禁止第五种色相**：整站卡片只用 黑 / 金 / 白 / 蓝。每张卡有 `tone ∈ {ink(黑底白线舞台), gold(金), blue(蓝), paper(纸)}` 与 `layout ∈ {copy(文字在上), stage(舞台在上), bleed(舞台出血)}`。
   - 强调色唯一：金色 `#A48830`（浅金 `#ffe08a`、深金文字 `#6B5417`）。
   - 任何新配色都必须落在现有 tone 的色板内，**不得引入紫/绿/红等新色相**。
3. **舞台原则**：「一个焦点（大数字/关键词）+ 一行小注 + 干净几何」。元素要少、字号要大，禁止铺满小字。
4. **文案必须真实**：舞台里出现的数字/金额/状态必须是该产品真实字段（如 42ms、118 GB、¥39.80、12.4k、会话 12），不许编造占位文案。

## 三、修改需求（按优先级）

### 1. 增加动效（本次重点：舞台内左侧的小卡片）
- 给舞台内的小卡片增加**克制的微动效**：
  - 入场：`opacity 0→1` + `translateY(8px→0)`，多张小卡片间错峰 60–90ms；
  - 悬停：`translateY(-2px)` + 阴影轻微加深（或 1.02 缩放），150–200ms ease；
  - 可选：一个非常缓慢的环境动效（如 6–8s 的呼吸/漂浮，幅度 ≤3px），让页面有生命感。
- **铁律**：
  - 只允许动 `transform` 和 `opacity`（合成层动画，禁止 top/left/width/height 引起重排）；
  - **禁止给 `.sc-card` 自身挂 animation** —— 曾因 `animation-fill-mode: both` 锁死 transform，导致悬停位移全部失效；入场动画一律挂在祖先 `.vr-card-entry[data-reveal]` 或舞台内层元素上；
  - 必须写 `@media (prefers-reduced-motion: reduce)` 关闭所有动效，并给依赖动画初始态的元素显式写回终态（否则进度条/名单会消失）；
  - `.sc-stage` 的 `overflow: hidden` 不能删（负责裁切舞台越界内容）。

### 2. 统一配色
- 舞台小卡片的底色、描边、文字全部对齐所在卡的 tone 色板与四色体系；
- 舞台 CSS 变量分组（不得混用）：
  - `--stg-ink / --stg-ink-rgb`：舞台图形描边与实心块（对比度 ≥ 3:1 即可，WCAG 1.4.11）；
  - `--stg-text / --stg-text-rgb`：舞台文字（必须 ≥ 4.5:1）；
  - `--stg-panel / --stg-bg1 / --stg-bg2`：舞台面板与底色；
  - `--p-accent / --p-rgb`：卡片外壳强调色（`--p-rgb` 必须是**逗号分隔**的 RGB，如 `164,136,48`，供 `rgba(var(--p-rgb), α)` 使用）。

### 3. 内容匹配
- 小卡片里展示的内容，必须与「点进卡片之后」的落地页 / 工具实际功能一致；
- 数据驱动：优先从 `showcase-cards.js` 该卡片的字段取值渲染，不要在 JSX 里写死与数据无关的文案。

### 4. 字体微调（卡外文字）
- 只做微调：标题/描述/眉标的字号、字重、字距、行高，保持现有的强字号对比层级；
- 不要大改版式结构，不要改卡片尺寸与栅格。

## 四、历史踩坑（照做可以少走三小时弯路）

1. **舞台类名陷阱**：舞台根节点渲染为 `stg stg-<kind>`（如 `stg-week`）。**内层容器绝对不能再叫 `.stg-<kind>`**——同名规则会覆盖舞台根的 `display:flex`，舞台塌成一条窄缝，且构建不报错。内层一律另起名字（如 `stg-grid`、`stg-arc-chart`）。
2. `flex: 1` 在纵向 flex 里长的是**高度**；想让子元素撑满宽度用 `align-self: stretch`。
3. `minmax(0, 1fr)` 的网格行在高度不确定时会塌成 0；舞台网格要么有确定高度（`flex:1 + min-height:0`），要么用固定 `grid-auto-rows`。
4. 删 DOM 元素时，`scripts/verify-cards.mjs` 里的选择器会变成 null 抛错——删元素必须同步改校验脚本。
5. 舞台必须用 HTML 而非 SVG 承载文字（SVG 会被非等比拉伸写不了字）；只有纯图形（折线/弧线）才用 SVG。

## 五、验收标准（全部通过才算完成）

```bash
npm run test:ui          # UI 设计系统基线 10/10
npm run build            # 构建通过
npm run cards:palette    # 卡片调色板校验
npm run cards:verify     # 舞台完整性守卫（舞台类名/结构断言）
npm run cards:a11y       # 对比度校验
```

人工核对项：
- [ ] 舞台小卡片有入场动效（错峰、克制），悬停有反馈；
- [ ] `prefers-reduced-motion` 下动效关闭且元素不消失；
- [ ] 所有舞台配色落在四色体系内，无新色相；
- [ ] 舞台文字对比度 ≥ 4.5:1，描边 ≥ 3:1；
- [ ] 小卡片内容与对应落地页功能一致，无占位假文案；
- [ ] 卡外字体仅微调，版式结构未变；
- [ ] 移动端（≤768px）不溢出、不塌陷；
- [ ] 改动范围仅限第一节列出的文件。

---

## 附：当前 10 张卡片清单（渲染顺序）

产品区 4 张、技能区 1 张、应用区 5 张（具体 id 见 `SHOWCASE_GROUPS`：`api`、`timetable`、`voyraai-mall`、`health` / `mathmodel` / `checkin`、`toolbox`、`billtrace`、`token`、`chronicle`）。执行前先读 `showcase-cards.js` 确认每张卡的 `tone / layout / stage` 字段，再动样式。
