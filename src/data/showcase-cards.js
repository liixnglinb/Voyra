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
 *         卡片之间只允许在「配色族」和「stage 视觉元素」两个维度上有差异，
 *         骨架（编号 / 图标 / 标题 / 描述 / 标签 / CTA）完全共用。
 *
 * 四个 stage 模板
 * ---------------------------------------------------------------------------
 *   icon-tile     大图标 + 主题色光晕 + 环绕小图标。表达「这是一个工具/产品」。
 *   flow-nodes    圆点连成流程线，节点可标注。表达「这是一条流水线/多步流程」。
 *   badge-cluster 指标徽章堆叠成网格。表达「这是一份数据/榜单/统计」。
 *   metric-panel  大数字 + 细分项列表。表达「这是实时运行的状态看板」。
 *
 * 六个配色族（替代原先 17 个互不相关的 --p-accent）
 * ---------------------------------------------------------------------------
 *   core   基础服务   #2A60E4 蓝
 *   ai     AI 智能    #8B5CF6 紫
 *   life   生活记录   #20BF6B 绿
 *   tool   实用工具   #F27B34 橙
 *   learn  学习成长   #C29214 金
 *   mute   中性兜底   #1B1B1B 墨
 * 同族产品在列表里会自然形成家族感，也让对比度测试的成本从 17 份降到 6 份。
 */

/* 阶段标签：显示在 stage 顶部的小字，说明「这块区域在演示什么」 */
export const SHOWCASE_CARDS = [
  /* ══════════════ 产品 · 基础服务族 ══════════════ */
  {
    id: 'api',
    no: '01 / API GATEWAY',
    name: 'Voyra Relay API',
    desc: '统一 API 网关，接入海量 AI 模型，集中管理请求、路由与成本。',
    cta: '访问网关',
    foot: 'PROD GATEWAY',
    href: 'https://apilxl.bbroot.com/',
    external: true,
    family: 'core',
    Icon: 'Globe',
    stage: { kind: 'metric-panel', status: 'RELAY CLUSTER ACTIVE', metric: '42ms', metricLabel: 'AVG LATENCY', items: [['请求路由', 'Smart Failover'], ['可用性', '99.98%'], ['异常切换', '自动']] },
  },
  {
    id: 'timetable',
    no: '02 / WORKSPACE',
    name: '日程中心',
    desc: '课程表与日历日程二合一，每周课程与每日安排一站管理。',
    cta: '打开日程',
    foot: 'SCHEDULE & PLANNER',
    href: '/timetable',
    family: 'core',
    Icon: 'CalendarRange',
    stage: { kind: 'icon-tile', glyph: 'CalendarRange', items: [['周视图', '课程表'], ['日程', '日历'], ['规划', '待办']] },
  },

  /* ══════════════ 产品 · AI 智能族 ══════════════ */
  {
    id: 'pelican',
    no: '03 / BENCHMARK SHOW',
    name: 'AI 模型对比秀',
    desc: '同一题交给 16 个 AI 模型分别生成，效果一页对比。',
    cta: '查看对比',
    foot: '16 SVG ANIMATIONS',
    href: '/pelican-gallery',
    family: 'ai',
    Icon: 'Film',
    stage: { kind: 'badge-cluster', title: '同题多模型', badge: '16 模型实时', items: [['DeepSeek-V4 Pro', '182'], ['GLM-5.3 Flash', '124'], ['Kimi-K3', '98'], ['GPT-5.6 sol', '165']] },
  },
  {
    id: 'prompts',
    no: '04 / PROMPT HUB',
    name: '提示词库',
    desc: '把常用指令、模板和使用场景放在一个随时可检索的位置。',
    cta: '管理提示词',
    foot: 'READY-TO-USE TEMPLATES',
    href: '/prompts',
    family: 'ai',
    Icon: 'Lightbulb',
    stage: { kind: 'flow-nodes', title: '提问 → 审查 → 执行', nodes: ['提问', '审查', '执行'] },
  },
  {
    id: 'uikit',
    no: '05 / DESIGN SYSTEM',
    name: '组件图鉴',
    desc: '网页与后台常见界面组件：名称、外观、场景与原理一页讲清。',
    cta: '查看图鉴',
    foot: '40 INTERACTIVE COMPONENTS',
    href: '/uikit',
    family: 'ai',
    Icon: 'Shapes',
    stage: { kind: 'badge-cluster', title: '组件货架', badge: '40 个可交互', items: [['导航', 'Rail / Tabs'], ['输入', 'Field / Picker'], ['反馈', 'Toast / Modal']] },
  },
  {
    id: 'skills',
    no: '06 / GITHUB HUB',
    name: 'Skill 热榜',
    desc: 'GitHub 优质 Skill 与每周热点，星数排行每天自动刷新。',
    cta: '查看热榜',
    foot: 'RANKING & RADAR',
    href: '/skills',
    family: 'ai',
    Icon: 'Sparkles',
    stage: { kind: 'badge-cluster', title: '本周上升', badge: '每日刷新', items: [['#1 文档处理', '12.4k'], ['#2 代码审查', '9.8k'], ['#3 数据清洗', '7.1k']] },
  },
  {
    id: 'agents',
    no: '07 / AUTONOMOUS WORKFLOW',
    name: 'AI Agent',
    desc: '汇集 Agent 与 Skill 的实用入口，快速进入合适的工作流。',
    cta: '查看资源',
    foot: 'PIPELINE & SUBAGENTS',
    href: '/agents',
    family: 'ai',
    Icon: 'Bot',
    stage: { kind: 'flow-nodes', title: '编排与调度', nodes: ['主控', '子任务', '汇总'] },
  },
  {
    id: 'mindmap',
    no: '08 / THOUGHT TREE',
    name: '思维导图',
    desc: '将学习与创作中的线索展开为可继续补充的结构。',
    cta: '打开导图',
    foot: 'HIERARCHICAL STRUCTURING',
    href: '/mindmap',
    family: 'ai',
    Icon: 'Route',
    stage: { kind: 'flow-nodes', title: '层级展开', nodes: ['主题', '分支', '叶子'] },
  },

  /* ══════════════ 产品 · 生活记录族 ══════════════ */
  {
    id: 'care',
    no: '09 / FAMILY CARE',
    name: '宝宝护理',
    desc: '记录宝宝的作息、喂养和成长数据，让日常护理有迹可循。',
    cta: '进入护理',
    foot: 'DAILY LOG & HEALTH',
    href: '/baby-care',
    family: 'life',
    Icon: 'Milk',
    stage: { kind: 'metric-panel', status: '今日已记录', metric: '6', metricLabel: '小时睡眠', items: [['喂养', '5 次 / 620ml'], ['体温', '36.5℃ 正常'], ['成长', '月龄 +1']] },
  },
  {
    id: 'diet',
    no: '11 / HEALTH & NUTRITION',
    name: '饮食打卡',
    desc: '三餐执行、饮水与力量训练每日打卡，多端同步。',
    cta: '今日打卡',
    foot: 'HABIT & DIET TRACKER',
    href: '/diet-checkin',
    family: 'life',
    Icon: 'ClipboardCheck',
    stage: { kind: 'flow-nodes', title: '三餐与习惯', nodes: ['早餐', '午餐', '晚餐'] },
  },

  /* ══════════════ 产品 · 实用工具族 ══════════════ */
  {
    id: 'draw',
    no: '10 / LUCKY DRAW',
    name: '随机抽人',
    desc: '课堂点名、活动抽奖随机抽取，支持花名册识别。',
    cta: '开始抽取',
    foot: 'RANDOM ROSTER SELECTOR',
    href: '/draw',
    family: 'tool',
    Icon: 'Dices',
    stage: { kind: 'flow-nodes', title: '花名册 → 抽取', nodes: ['导入', '抽取', '公布'] },
  },

  /* ══════════════ Skills ══════════════ */
  {
    id: 'mathmodel',
    no: 'SKILL / CUMCM WORKFLOW',
    name: '数学建模 Skill',
    desc: '国赛（CUMCM）数学建模十阶段工作流，从题意到提交一条流水线。',
    cta: '打开 Skill 仓库',
    foot: '10-STAGE CUMCM PIPELINE',
    href: 'https://github.com/liixnglinb/Mathmodel-skill',
    external: true,
    family: 'learn',
    Icon: 'Star',
    stage: { kind: 'flow-nodes', title: '十阶段', nodes: ['题意', '建模', '求解', '论文'] },
  },

  /* ══════════════ 应用 · AI 智能族（织流） ══════════════ */
  {
    id: 'modelflow',
    no: 'APP 01 / LOCAL AGENT PIPELINE',
    name: '织流 Jacquard',
    desc: '本地智能体流水线工作台：流程可编辑，交给本机 CLI 逐步执行，产物实时落盘。',
    cta: '下载软件',
    foot: 'WINDOWS 10/11 · ZERO TELEMETRY',
    href: '/modelflow/',
    logo: '/modelflow/logo-256.png',
    family: 'ai',
    stage: { kind: 'icon-tile', glyph: 'HardDrive', items: [['流程可编辑', '本机'], ['逐步执行', 'CLI 驱动'], ['产物落盘', 'data/']] },
  },

  /* ══════════════ 应用 · 实用工具族 ══════════════ */
  {
    id: 'checkin',
    no: 'APP 02 / ATTENDANCE AUTOMATION',
    name: '学习通自动签到助手',
    desc: '桌面端常驻后台，自动监听课程签到活动，支持普通、位置、二维码三种签到。',
    cta: '下载软件',
    foot: 'DESKTOP BACKGROUND DAEMON',
    href: '/checkin/',
    logo: '/checkin/favicon.png',
    family: 'tool',
    stage: { kind: 'badge-cluster', title: '监听中', badge: '后台常驻', items: [['签到活动', '2 个待处理'], ['防风控', '已启用'], ['推送提醒', '手势 / 拍照']] },
  },
  {
    id: 'toolbox',
    no: 'APP 03 / DISK CLEANUP',
    name: '磁盘清理助手',
    desc: 'Windows 磁盘清理工作台：扫描、分类与目录分析一站完成，完整路径预览后再确认清理。',
    cta: '下载软件',
    foot: 'WINDOWS 10/11 · RECYCLE BIN FIRST',
    href: '/local-toolbox/',
    logo: '/local-toolbox/favicon.png',
    family: 'tool',
    stage: { kind: 'metric-panel', status: '本机磁盘 C:', metric: '118', metricLabel: 'GB 可用 / 256', items: [['聊天软件缓存', '14.2 GB'], ['显卡与系统临时', '3.8 GB'], ['目录百科', '75 条']] },
  },
  {
    id: 'billtrace',
    no: 'APP 04 / AUTO EXPENSE TRACKER',
    name: '账迹 BillTrace',
    desc: 'Android 自动记账 App：付款后 2 秒自动入库、智能分类，三引擎全自动采集，数据本地加密。',
    cta: '下载 APK',
    foot: 'ANDROID · LOCAL ENCRYPTION',
    href: '/billtrace/',
    logo: '/billtrace/icon-512.png',
    family: 'life',
    stage: { kind: 'badge-cluster', title: '2 秒自动入库', badge: '通知 + 短信双引擎', items: [['支付宝', '已捕获'], ['美团外卖', '−¥35.80'], ['地铁出行', '−¥4.00']] },
  },
  {
    id: 'token',
    no: 'APP 05 / USAGE OBSERVATORY',
    name: 'Token Monitor',
    desc: '本机 AI 编程工具用量看板：Token、请求与缓存明细一目了然，来源与时间筛选可随时恢复。',
    cta: '下载软件',
    foot: 'WINDOWS · 12 DATA SOURCES',
    href: '/token-monitor/',
    logo: '/token-monitor/favicon.png',
    family: 'ai',
    stage: { kind: 'metric-panel', status: '本机采集', metric: '128.4k', metricLabel: 'TOKENS 今日', items: [['输入 / 输出', '92k / 36k'], ['缓存命中', '61%'], ['覆盖工具', '12 类']] },
  },
  {
    id: 'zenew',
    no: 'APP 06 / FSRS SCHEDULING',
    name: '知新 Zenew',
    desc: '把大学课程变成记得住的练习：四本词书 + 教材 PDF 导入，AI 生成知识卡片，FSRS 安排复习时机。',
    cta: '下载软件',
    foot: 'WINDOWS 10/11 · FSRS SPACED REPETITION',
    href: '/zenew/',
    logo: '/zenew/icon.png',
    family: 'learn',
    stage: { kind: 'flow-nodes', title: '学习四步', nodes: ['导入', '四选一', '辨析', '复习'] },
  },

  /* ══════════════ 应用 · 实用工具族（AI 轨迹） ══════════════ */
  {
    id: 'chronicle',
    no: 'APP 07 / AI OBSERVATORY',
    name: 'AI 轨迹',
    desc: '本机优先的 AI 工作观测台：自动解析 12 个数据源，把会话、任务和产出整理成日报、档案与趋势。',
    cta: '下载软件',
    foot: 'WINDOWS 10/11 · 12 LOCAL SOURCES',
    href: '/ai-chronicle/',
    logo: '/ai-chronicle/icon.png',
    family: 'tool',
    stage: { kind: 'metric-panel', status: '今日观测', metric: '37', metricLabel: '会话数', items: [['产出文件', '24 份'], ['完成任务', '61 项'], ['数据源', '12 类本地']] },
  },
];

/** 按 Tab 分组，供 Dashboard 直接消费 */
export const SHOWCASE_GROUPS = {
  products: ['api', 'timetable', 'pelican', 'prompts', 'uikit', 'skills', 'agents', 'mindmap', 'care', 'draw', 'diet'],
  skills: ['mathmodel'],
  apps: ['modelflow', 'checkin', 'toolbox', 'billtrace', 'token', 'zenew', 'chronicle'],
};

export const CARD_BY_ID = Object.fromEntries(SHOWCASE_CARDS.map((c) => [c.id, c]));
