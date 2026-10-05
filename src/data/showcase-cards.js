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
 * 颜色：不再由这份数据决定
 * ---------------------------------------------------------------------------
 * 试过两条路：① 每族一个色相（19 色 → 6 色），② 6 族收敛成「黑蓝」但给了蓝的
 * 5 档明度。第一条太花；第二条更糟 —— 5 档蓝在 361px 窄卡上分不出彼此，却让人
 * 隐约觉得"这几张卡颜色好像不一样"，付出色相差异的代价，没换来任何分组信息。
 * 而且分组本身早就不成立：ai 族 7 张、mute 族 0 张。
 *
 * 现在整页一个蓝（见 dashboard-cards.css 的 .sc-card），分组职责交给 no 字段的类目词
 * （API GATEWAY / WORKSPACE / LUCKY DRAW…）—— 那是读得出来的，颜色不是。
 * family 字段保留，但只剩一个作用：resolveIcon 的图标兜底。
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
    Icon: 'Globe',
    /* 原来 status / metricLabel / 首行值三处是英文大写（RELAY CLUSTER ACTIVE、
       AVG LATENCY、Smart Failover），和其余 18 张卡的中文口吻不一致。
       单位也从数字里拆出来：'42ms' 整串塞进 34px 重体，单位被迫和数字一样大。 */
    stage: { kind: 'metric-panel', status: '网关集群运行中', metric: '42', metricUnit: 'ms', metricLabel: '平均延迟', items: [['请求路由', '智能故障切换'], ['可用性', '99.98%'], ['异常切换', '自动']] },
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
    Icon: 'CalendarRange',
    /* 原来三行是「周视图 | 课程表」「日程 | 日历」「规划 | 待办」——
       键和值互为同义词，等于什么都没演示。 */
    stage: { kind: 'icon-tile', glyph: 'CalendarRange', title: '一个日程，三种视图', badge: '二合一', items: [['课程表', '周视图'], ['日程', '日视图'], ['安排', '可待办']] },
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
    Icon: 'Film',
    /* 原来 4 行：实测末行超出 stage 底边 2.3px，被 overflow:hidden 切掉下边框。
       而且 182 / 124 / 98 这些数没写单位，读者不知道是分数还是秒 ——
       标题改成「同题得分对比」把量纲说清，没有引入新数字。 */
    stage: { kind: 'badge-cluster', title: '同题得分对比', badge: '16 模型', items: [['DeepSeek-V4 Pro', '182'], ['GPT-5.6 sol', '165'], ['GLM-5.3 Flash', '124']] },
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
    Icon: 'Lightbulb',
    /* 原标题「提问 → 审查 → 执行」和下面三个节点标签逐字重复，
       同一句话在 150px 高的小盒子里写了两遍。 */
    stage: { kind: 'flow-nodes', title: '使用流程', nodes: ['提问', '审查', '执行'], subs: ['一句需求', '逐条校验', '直接可用'] },
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
    Icon: 'Shapes',
    stage: { kind: 'badge-cluster', title: '组件货架', badge: '40 个可交互', items: [['导航', 'Rail / Tabs'], ['输入', 'Field / Picker'], ['反馈', 'Toast / Modal']] },
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
    Icon: 'Sparkles',
    /* 原标题「本周上升」与右侧徽章「每日刷新」是两个互相矛盾的时间口径，
       而描述写的是"星数排行每天自动刷新"。以描述为准。 */
    stage: { kind: 'badge-cluster', title: '星数排行', badge: '每日刷新', items: [['#1 文档处理', '12.4k'], ['#2 代码审查', '9.8k'], ['#3 数据清洗', '7.1k']] },
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
    Icon: 'Bot',
    stage: { kind: 'flow-nodes', title: '编排与调度', nodes: ['主控', '子任务', '汇总'], subs: ['规划路由', '并行执行', '验收落盘'] },
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
    Icon: 'Route',
    stage: { kind: 'flow-nodes', title: '层级展开', nodes: ['主题', '分支', '叶子'], subs: ['中心节点', '可续写', '末端'] },
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
    Icon: 'Milk',
    stage: { kind: 'metric-panel', status: '今日已记录', metric: '6', metricUnit: '小时', metricLabel: '睡眠时长', items: [['喂养', '5 次 / 620ml'], ['体温', '36.5℃ 正常'], ['成长', '月龄 +1']] },
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
    Icon: 'Dices',
    /* 原标题「花名册 → 抽取」又是节点名的复述。 */
    stage: { kind: 'flow-nodes', title: '课堂点名', nodes: ['导入', '抽取', '公布'], subs: ['班级名单', '随机滚动', '当堂结果'] },
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
    Icon: 'ClipboardCheck',
    stage: { kind: 'flow-nodes', title: '三餐节奏', nodes: ['早餐', '午餐', '晚餐'], subs: ['已记录', '已记录', '待记录'] },
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
    Icon: 'Star',
    stage: { kind: 'flow-nodes', title: 'CUMCM 流程', nodes: ['题意', '建模', '求解', '论文'], subs: ['理解题面', '建立模型', '求解验证', '成稿提交'] },
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
    logo: '/modelflow/logo-256.png',
    family: 'ai',
    Icon: 'Workflow',
    /* glyph 原来是 HardDrive —— 那是磁盘清理助手的图标，复制过来的，
       和「智能体流水线」没有关系。 */
    stage: { kind: 'icon-tile', glyph: 'Workflow', title: '本机流水线', badge: '逐步执行', items: [['流程', '可编辑'], ['驱动', '本机 CLI'], ['产物', '实时落盘']] },
  },
  {
    id: 'checkin',
    seq: '02',
    no: 'APP 02 / ATTENDANCE AUTOMATION',
    name: '学习通自动签到助手',
    desc: '常驻后台自动监听课程签到，支持普通、位置、二维码。',
    cta: '下载软件',
    href: '/checkin/',
    logo: '/checkin/favicon.png',
    family: 'tool',
    /* 原标题「监听中」与右侧徽章「后台常驻」是同一件事说两遍。 */
    stage: { kind: 'badge-cluster', title: '课程签到', badge: '后台常驻', items: [['签到活动', '2 个待处理'], ['防风控', '已启用'], ['推送提醒', '手势 / 拍照']] },
  },
  {
    id: 'toolbox',
    seq: '03',
    no: 'APP 03 / DISK CLEANUP',
    name: '磁盘清理助手',
    desc: '磁盘扫描、分类与目录分析一站完成，预览后再确认清理。',
    cta: '下载软件',
    href: '/local-toolbox/',
    logo: '/local-toolbox/favicon.png',
    family: 'tool',
    /* metricLabel 原来是「GB 可用 / 256」—— 单位塞在标签里，和左边 34px 的
       「118」对不上。单位交给 metricUnit 承担。 */
    stage: { kind: 'metric-panel', status: '本机磁盘 C:', metric: '118', metricUnit: 'GB', metricLabel: '可用 · 共 256 GB', items: [['聊天软件缓存', '14.2 GB'], ['显卡与系统临时', '3.8 GB'], ['目录百科', '75 条']] },
  },
  {
    id: 'billtrace',
    seq: '04',
    no: 'APP 04 / AUTO EXPENSE TRACKER',
    name: '账迹 BillTrace',
    desc: '付款后 2 秒自动入库，三引擎采集，数据本地加密。',
    cta: '下载 APK',
    href: '/billtrace/',
    logo: '/billtrace/icon-512.png',
    family: 'life',
    /* 原来三行的值不是同一个量纲：第一行「已捕获」是状态，后两行是金额。
       「自动入库」本来就是这张卡要讲的事，挪进标题；三行统一成金额，
       合计 39.80 由下面两笔相加得到，没有引入新数字。 */
    stage: { kind: 'badge-cluster', title: '自动入库', badge: '2 秒 · 双引擎', items: [['美团外卖', '−¥35.80'], ['地铁出行', '−¥4.00'], ['本批合计', '−¥39.80']] },
  },
  {
    id: 'token',
    seq: '05',
    no: 'APP 05 / USAGE OBSERVATORY',
    name: 'Token Monitor',
    desc: '本机 AI 编程工具用量看板，Token、请求与缓存一目了然。',
    cta: '下载软件',
    href: '/token-monitor/',
    logo: '/token-monitor/favicon.png',
    family: 'ai',
    stage: { kind: 'metric-panel', status: '本机采集 · 今日', metric: '128.4', metricUnit: 'k', metricLabel: 'TOKENS', items: [['输入 / 输出', '92k / 36k'], ['缓存命中', '61%'], ['覆盖工具', '12 类']] },
  },
  {
    id: 'zenew',
    seq: '06',
    no: 'APP 06 / FSRS SCHEDULING',
    name: '知新 Zenew',
    desc: '四本词书 + 教材 PDF 导入，AI 生成卡片，FSRS 排复习。',
    cta: '下载软件',
    href: '/zenew/',
    logo: '/zenew/icon.png',
    family: 'learn',
    stage: { kind: 'flow-nodes', title: '学习四步', nodes: ['导入', '四选一', '辨析', '复习'], subs: ['词书 / PDF', '选择题', 'AI 卡片', 'FSRS'] },
  },
  {
    id: 'chronicle',
    seq: '07',
    no: 'APP 07 / AI OBSERVATORY',
    name: 'AI 轨迹',
    desc: '本机解析 12 个数据源，把会话与产出整理成日报和趋势。',
    cta: '下载软件',
    href: '/ai-chronicle/',
    logo: '/ai-chronicle/icon.png',
    family: 'tool',
    stage: { kind: 'metric-panel', status: '今日观测', metric: '37', metricUnit: '个', metricLabel: '会话数', items: [['产出文件', '24 份'], ['完成任务', '61 项'], ['数据源', '12 类本地']] },
  },
];

/** 按 Tab 分组，供 Dashboard 直接消费 */
export const SHOWCASE_GROUPS = {
  products: ['api', 'timetable', 'pelican', 'prompts', 'uikit', 'skills', 'agents', 'mindmap', 'care', 'draw', 'diet'],
  skills: ['mathmodel'],
  apps: ['modelflow', 'checkin', 'toolbox', 'billtrace', 'token', 'zenew', 'chronicle'],
};

export const CARD_BY_ID = Object.fromEntries(SHOWCASE_CARDS.map((c) => [c.id, c]));
