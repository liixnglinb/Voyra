/**
 * 首页 19 张产品卡的数据源（方案 A · 统一产品名片卡）
 *
 * 为什么要数据化
 * ---------------------------------------------------------------------------
 * 改造前：19 个独立 React 组件（ShowcaseCards.jsx 1356 行）+ 19 段专属 stage 样式
 *         （dashboard-cards.css 1606 行）。每张卡的标题、描述、标签、CTA 都硬编码在
 *         自己的 JSX 里，新增或调整一张卡要在三个地方同步（组件 / 样式 / Dashboard）。
 *
 * 改造后：19 条数据 + 1 个 ProductCard 组件 + 4 套 stage 模板。
 *         骨架（编号 / 图标 / 标题 / 描述 / CTA）完全共用。
 *
 * 四个 stage 模板
 * ---------------------------------------------------------------------------
 *   icon-tile     大图标 + 主题色光晕 + 三行「左标签右值」。表达「这是一个产品」。
 *   flow-nodes    圆点连成流程线，节点两行（名称 + 注解）。表达「一件事分几步」。
 *   badge-cluster 顶栏 + 最多 3 行键值徽章。表达「一份清单 / 榜单 / 统计」。
 *   metric-panel  顶栏 + 一个大数字 + 三行细分项。表达「当前运行状态」。
 *
 * 差异化：tone（四色基调）× layout（三种版式）
 * ---------------------------------------------------------------------------
 * 上一版给 19 张卡各配了一个色相（蓝/靛/紫/琥珀/青/金/…），结果是整页
 * 「黑字 + 黄标签 + 白卡 + 一堆蓝紫」的杂色拼盘，用户评价"太丑了"。
 *
 * 本版把配色收敛到站内既有的四个颜色 —— 黑 / 金 / 白 / 蓝 —— 并改用
 * 两个维度组合出差异，而不是靠 19 个色相：
 *
 *   tone（舞台与强调色的基调，4 种）
 *     ink    墨：舞台反色成黑底白线，卡片强调色走金。19 张里最"重"的一档。
 *     gold   金：暖米色舞台 + 金调描边，站内金 #8A6D1F 家族。
 *     blue   蓝：淡蓝舞台 + 蓝调描边，整页唯一的冷色。
 *     paper  纸：近白舞台 + 黑细线，最克制的一档，像技术图纸。
 *
 *   layout（卡内三段式的排布，3 种）
 *     copy   文字在上、舞台在下（默认，信息优先）
 *     stage  舞台在上、文字在下（演示优先，舞台更高）
 *     bleed  舞台出血贴满卡片上半部，文字压在下方留白区（海报感）
 *
 * 4 × 3 = 12 种组合，19 张卡按 Tab 分组后**组内组合两两不同**：
 *   产品 11 张占 11 种，应用 7 张占 7 种，Skills 1 张。
 * 加上 19 个各不相同的舞台画面，"每一张卡的样子都不一样"由此成立 ——
 * 靠的是版式与画面，而不是色相数量。
 *
 * 对比度（scripts/check-palette.mjs 可复核）：四个基调的强调色在白底上
 * 全部 ≥ 4.5:1；ink 基调的舞台是黑底白线，白线对黑底对比度更高。
 *
 * family 字段保留，仍只剩一个作用：resolveIcon 的图标兜底。
 *
 * seq：底部页脚里的空心序号，只收 1-2 位纯数字
 * ---------------------------------------------------------------------------
 * 之前是从 no 切 '/' 前段推导，于是 'SKILL / CUMCM WORKFLOW' 画出 192px 宽的空心
 * 单词、'APP 01 / …' 画出 255px 宽的「APP 01」，在 361px 的卡上被右缘裁断。
 * 现在显式写死，不给数字就不画。
 */

export const SHOWCASE_CARDS = [
  /* ══════════════ 产品 · 基础服务 ══════════════ */
  {
    id: 'api',
    seq: '01',
    no: '01 / API GATEWAY',
    name: 'Voyra Relay API',
    desc: '统一 API 网关，接入海量 AI 模型，集中管理请求、路由与成本。',
    cta: '访问网关',
    href: 'https://apilxl.bbroot.com/',
    external: true,
    family: 'core',
    tone: 'ink',
    layout: 'copy',
    Icon: 'Globe',
    /* 原来 status / metricLabel / 首行值三处是英文大写（RELAY CLUSTER ACTIVE、
       AVG LATENCY、Smart Failover），和其余 18 张卡的中文口吻不一致。
       单位也从数字里拆出来：'42ms' 整串塞进 34px 重体，单位被迫和数字一样大。 */
    stage: { kind: "api-hub" },
  },
  {
    id: 'timetable',
    seq: '02',
    no: '02 / WORKSPACE',
    name: '日程中心',
    desc: '课程表与日历二合一，每周课程与每日安排一站管理。',
    cta: '打开日程',
    href: '/timetable',
    family: 'core',
    tone: 'paper',
    layout: 'stage',
    Icon: 'CalendarRange',
    /* 原来三行是「周视图 | 课程表」「日程 | 日历」「规划 | 待办」——
       键和值互为同义词，等于什么都没演示。 */
    stage: { kind: "week-grid" },
  },

  /* ══════════════ 产品 · AI 智能 ══════════════ */
  {
    id: 'pelican',
    seq: '03',
    no: '03 / BENCHMARK SHOW',
    name: 'AI 模型对比秀',
    desc: '同一题交给 16 个 AI 模型分别生成，效果一页对比。',
    cta: '查看对比',
    href: '/pelican-gallery',
    family: 'ai',
    tone: 'blue',
    layout: 'bleed',
    Icon: 'Film',
    /* 原来 4 行：实测末行超出 stage 底边 2.3px，被 overflow:hidden 切掉下边框。
       而且 182 / 124 / 98 这些数没写单位，读者不知道是分数还是秒 ——
       标题改成「同题得分对比」把量纲说清，没有引入新数字。 */
    stage: { kind: "score-race" },
  },
  {
    id: 'prompts',
    seq: '04',
    no: '04 / PROMPT HUB',
    name: '提示词库',
    desc: '把常用指令、模板和使用场景放在一个随时可检索的位置。',
    cta: '管理提示词',
    href: '/prompts',
    family: 'ai',
    tone: 'gold',
    layout: 'copy',
    Icon: 'Lightbulb',
    /* 原标题「提问 → 审查 → 执行」和下面三个节点标签逐字重复，
       同一句话在 150px 高的小盒子里写了两遍。 */
    stage: { kind: "typewriter" },
  },
  {
    id: 'uikit',
    seq: '05',
    no: '05 / DESIGN SYSTEM',
    name: '组件图鉴',
    desc: '网页与后台常见界面组件：名称、外观、场景与原理一页讲清。',
    cta: '查看图鉴',
    href: '/uikit',
    family: 'ai',
    tone: 'ink',
    layout: 'stage',
    Icon: 'Shapes',
    stage: { kind: "component-bench" },
  },
  {
    id: 'skills',
    seq: '06',
    no: '06 / GITHUB HUB',
    name: 'Skill 热榜',
    desc: 'GitHub 优质 Skill 与每周热点，星数排行每天自动刷新。',
    cta: '查看热榜',
    href: '/skills',
    family: 'ai',
    tone: 'gold',
    layout: 'bleed',
    Icon: 'Sparkles',
    /* 原标题「本周上升」与右侧徽章「每日刷新」是两个互相矛盾的时间口径，
       而描述写的是"星数排行每天自动刷新"。以描述为准。 */
    stage: { kind: "podium" },
  },
  {
    id: 'agents',
    seq: '07',
    no: '07 / AUTONOMOUS WORKFLOW',
    name: 'AI Agent',
    desc: '汇集 Agent 与 Skill 的实用入口，快速进入合适的工作流。',
    cta: '查看资源',
    href: '/agents',
    family: 'ai',
    tone: 'blue',
    layout: 'copy',
    Icon: 'Bot',
    stage: { kind: "dispatch" },
  },
  {
    id: 'mindmap',
    seq: '08',
    no: '08 / THOUGHT TREE',
    name: '思维导图',
    desc: '将学习与创作中的线索展开为可继续补充的结构。',
    cta: '打开导图',
    href: '/mindmap',
    family: 'ai',
    tone: 'paper',
    layout: 'bleed',
    Icon: 'Route',
    stage: { kind: "radial-tree" },
  },

  /* ══════════════ 产品 · 生活记录 ══════════════ */
  {
    id: 'care',
    seq: '09',
    no: '09 / FAMILY CARE',
    name: '宝宝护理',
    desc: '记录宝宝的作息、喂养和成长数据，让日常护理有迹可循。',
    cta: '进入护理',
    href: '/baby-care',
    family: 'life',
    tone: 'gold',
    layout: 'stage',
    Icon: 'Milk',
    stage: { kind: "day-arc" },
  },

  /* ══════════════ 产品 · 实用工具 ══════════════ */
  {
    id: 'draw',
    seq: '10',
    no: '10 / LUCKY DRAW',
    name: '随机抽人',
    desc: '课堂点名、活动抽奖随机抽取，支持花名册识别。',
    cta: '开始抽取',
    href: '/draw',
    family: 'tool',
    tone: 'ink',
    layout: 'bleed',
    Icon: 'Dices',
    /* 原标题「花名册 → 抽取」又是节点名的复述。 */
    stage: { kind: "slot-roll" },
  },

  /* ══════════════ 产品 · 生活记录（饮食打卡） ══════════════ */
  {
    id: 'diet',
    seq: '11',
    no: '11 / HEALTH & NUTRITION',
    name: '饮食打卡',
    desc: '三餐执行、饮水与力量训练每日打卡，多端同步。',
    cta: '今日打卡',
    href: '/diet-checkin',
    family: 'life',
    tone: 'blue',
    layout: 'stage',
    Icon: 'ClipboardCheck',
    stage: { kind: "meal-stamps" },
  },

  /* ══════════════ Skills ══════════════ */
  {
    id: 'mathmodel',
    seq: '12',
    no: 'SKILL / CUMCM WORKFLOW',
    name: '数学建模 Skill',
    /* 原文写"十阶段工作流"，但 stage 只画得出 4 个节点，同一张卡上自相矛盾。
       去掉具体阶段数，改成描述能兑现的范围。 */
    desc: '国赛（CUMCM）数学建模工作流，从题意到提交一条流水线。',
    cta: '打开 Skill 仓库',
    href: 'https://github.com/liixnglinb/Mathmodel-skill',
    external: true,
    family: 'learn',
    tone: 'gold',
    layout: 'copy',
    Icon: 'Star',
    stage: { kind: "paper-build" },
  },

  /* ══════════════ 应用 ══════════════ */
  {
    id: 'modelflow',
    seq: '01',
    no: 'APP 01 / LOCAL AGENT PIPELINE',
    name: '织流 Jacquard',
    /* 原描述 37 字，在 303px 窄栏里折成 3 行，把 stage 顶掉 22px。 */
    desc: '本地智能体流水线工作台，流程可编辑，产物实时落盘。',
    cta: '下载软件',
    href: '/modelflow/',
    /* 独立静态落地页（public/<slug>/index.html），不是 SPA 路由 ——
       链接要用真实路径，加了 # 会被 HashRouter 当成未知路由重定向回首页。 */
    staticPage: true,
    logo: '/modelflow/logo-256.png',
    family: 'ai',
    tone: 'ink',
    layout: 'copy',
    Icon: 'Workflow',
    /* glyph 原来是 HardDrive —— 那是磁盘清理助手的图标，复制过来的，
       和「智能体流水线」没有关系。 */
    stage: { kind: "weave" },
  },
  {
    id: 'checkin',
    seq: '02',
    no: 'APP 02 / ATTENDANCE AUTOMATION',
    name: '学习通自动签到助手',
    desc: '常驻后台自动监听课程签到，支持普通、位置、二维码。',
    cta: '下载软件',
    href: '/checkin/',
    /* 独立静态落地页（public/<slug>/index.html），不是 SPA 路由 ——
       链接要用真实路径，加了 # 会被 HashRouter 当成未知路由重定向回首页。 */
    staticPage: true,
    logo: '/checkin/favicon.png',
    family: 'tool',
    tone: 'blue',
    layout: 'stage',
    /* 原标题「监听中」与右侧徽章「后台常驻」是同一件事说两遍。 */
    stage: { kind: "auto-click" },
  },
  {
    id: 'toolbox',
    seq: '03',
    no: 'APP 03 / DISK CLEANUP',
    name: '磁盘清理助手',
    desc: '磁盘扫描、分类与目录分析一站完成，预览后再确认清理。',
    cta: '下载软件',
    href: '/local-toolbox/',
    /* 独立静态落地页（public/<slug>/index.html），不是 SPA 路由 ——
       链接要用真实路径，加了 # 会被 HashRouter 当成未知路由重定向回首页。 */
    staticPage: true,
    logo: '/local-toolbox/favicon.png',
    family: 'tool',
    tone: 'paper',
    layout: 'bleed',
    /* metricLabel 原来是「GB 可用 / 256」—— 单位塞在标签里，和左边 34px 的
       「118」对不上。单位交给 metricUnit 承担。 */
    stage: { kind: "junk-shrink" },
  },
  {
    id: 'billtrace',
    seq: '04',
    no: 'APP 04 / AUTO EXPENSE TRACKER',
    name: '账迹 BillTrace',
    desc: '付款后 2 秒自动入库，双引擎采集，数据只存本机不上传。',
    cta: '下载 APK',
    href: '/billtrace/',
    /* 独立静态落地页（public/<slug>/index.html），不是 SPA 路由 ——
       链接要用真实路径，加了 # 会被 HashRouter 当成未知路由重定向回首页。 */
    staticPage: true,
    logo: '/billtrace/icon-512.png',
    family: 'life',
    tone: 'gold',
    layout: 'copy',
    /* 原来三行的值不是同一个量纲：第一行「已捕获」是状态，后两行是金额。
       「自动入库」本来就是这张卡要讲的事，挪进标题；三行统一成金额，
       合计 39.80 由下面两笔相加得到，没有引入新数字。 */
    stage: { kind: "banner-drop" },
  },
  {
    id: 'token',
    seq: '05',
    no: 'APP 05 / USAGE OBSERVATORY',
    name: 'Token Monitor',
    desc: '本机 AI 编程工具用量看板，Token、请求与缓存一目了然。',
    cta: '下载软件',
    href: '/token-monitor/',
    /* 独立静态落地页（public/<slug>/index.html），不是 SPA 路由 ——
       链接要用真实路径，加了 # 会被 HashRouter 当成未知路由重定向回首页。 */
    staticPage: true,
    logo: '/token-monitor/favicon.png',
    family: 'ai',
    tone: 'ink',
    layout: 'stage',
    stage: { kind: "sparkline" },
  },
  {
    id: 'zenew',
    seq: '06',
    no: 'APP 06 / FSRS SCHEDULING',
    name: '知新 Zenew',
    desc: '四本词书 + 教材 PDF 导入，AI 生成卡片，FSRS 排复习。',
    cta: '下载软件',
    href: '/zenew/',
    /* 独立静态落地页（public/<slug>/index.html），不是 SPA 路由 ——
       链接要用真实路径，加了 # 会被 HashRouter 当成未知路由重定向回首页。 */
    staticPage: true,
    logo: '/zenew/icon.png',
    family: 'learn',
    tone: 'blue',
    layout: 'bleed',
    stage: { kind: "flip-card" },
  },
  {
    id: 'chronicle',
    seq: '07',
    no: 'APP 07 / AI OBSERVATORY',
    name: 'AI 轨迹',
    desc: '本机解析 12 个数据源，把会话与产出整理成日报和趋势。',
    cta: '下载软件',
    href: '/ai-chronicle/',
    /* 独立静态落地页（public/<slug>/index.html），不是 SPA 路由 ——
       链接要用真实路径，加了 # 会被 HashRouter 当成未知路由重定向回首页。 */
    staticPage: true,
    logo: '/ai-chronicle/icon.png',
    family: 'tool',
    tone: 'gold',
    layout: 'stage',
    stage: { kind: "timeline" },
  },
];

/** 按 Tab 分组，供 Dashboard 直接消费 */
export const SHOWCASE_GROUPS = {
  products: ['api', 'timetable', 'pelican', 'prompts', 'uikit', 'skills', 'agents', 'mindmap', 'care', 'draw', 'diet'],
  skills: ['mathmodel'],
  apps: ['modelflow', 'checkin', 'toolbox', 'billtrace', 'token', 'zenew', 'chronicle'],
};

export const CARD_BY_ID = Object.fromEntries(SHOWCASE_CARDS.map((c) => [c.id, c]));
