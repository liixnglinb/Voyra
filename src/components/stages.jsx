/* ==========================================================================
   19 个舞台 · v5 改为「真实产品 UI 缩略」
   --------------------------------------------------------------------------
   2026-10-13（用户第三次反馈「还是不行」后的定位）：

   对照参考站 oiloil.org 的四张截图，之前的舞台有两个方向性错误：
     ① **容器错了** —— 本站给舞台画了「1px 描边 + 圆角 14px + 径向渐变底」，
        参考站实测 .stage 是 border:0 / background:transparent / radius:0，
        产品截图直接浮在白卡上，没有面板。
     ② **内容错了** —— 本站舞台是「数据行 + 进度条」的图表，
        参考站是真实 UI：macOS 窗口、编辑器、Spotlight 搜索框、
        深色终端、框选示意 —— 没有一个是图表。
        进度条更是图表专属语汇，真实产品里没有「数据热度条」。

   v5 起：舞台透明化（见 dashboard-cards.css 的 .sc-stage），
   内容改成 product-shots.jsx 提供的真实 UI 外壳 + 真实界面元素。

   v5 之前的历史（保留以备查）：
     · 第一轮太「旧」——密集假 UI、厚描边、点阵纹理、高光扫过。
     · 第二轮太「空」——为了去掉旧手法，把内容也一起删了。
     · 第三轮是「仪表盘」——数据行 + 进度条 + 三段式（head/body/foot），
       内容密度够了，但**语汇错了**：进度条与看板是图表语言，
       真实产品界面里没有这些东西，用户三次反馈「还是不行」。
     · v5 换成「真实产品 UI 缩略」，外壳与内容见 product-shots.jsx。

   颜色取自基调变量（ProductCard 按该卡 tone 注入）：
     --stg-ink / --stg-text / --stg-text-rgb / --stg-panel
   ========================================================================== */

import React from 'react';
import { Search } from 'lucide-react';
import { Browser, Window, Terminal, Spotlight, Sheet, Inline, Term } from './product-shots';

/* 品牌 logo 方块（VoyraAI 两张卡用）。
   图形来自 simple-icons 官方 SVG，按品牌真实色写入 fill
   （不用 currentColor，否则会被卡片基调变量染成灰）。
   size 默认 14px —— 再小就糊成一个色点、失去识别作用。 */
function BrandLogo({ slug, size = 14 }) {
  return (
    <img
      className="shot-brand"
      src={`/voyraai/brands/${slug}.svg`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
    />
  );
}

function Stage({ className, children }) {
  /* aria-hidden：舞台是「这个产品大概长什么样」的示意，语义由卡片 aria-label
     承担。让读屏器去念一串示意数据只会变成噪音。 */
  /* 根修饰类用双横线 `stg--<kind>`，内层元素一律 `stg-<name>`。
     单双横线分开是刻意的：这个项目三次踩到「根类名被内层复用」——
     两者特异性相同、内层规则更靠后，`.stg-week{display:grid}` 会盖掉
     `.stg{display:flex}`，舞台塌成窄缝且构建不报错。分命名空间后
     这种冲突在构造上就不可能发生。 */
  return <div className={`stg stg--${className}`} aria-hidden="true">{children}</div>;
}

/* 三段式的头尾。head 左侧可带状态点，右侧是元信息；foot 放 2~3 个次要指标。 */
function Head({ live, title, meta }) {
  return (
    <div className="stg-head">
      {live ? <i className="stg-dot" /> : null}
      <b>{title}</b>
      {meta ? <em>{meta}</em> : null}
    </div>
  );
}

function Foot({ items }) {
  return (
    <div className="stg-foot">
      {items.map(([label, value]) => (
        <span key={label}>{label} <b>{value}</b></span>
      ))}
    </div>
  );
}

/* 进度条。ratio 0~1。 */
function Bar({ ratio, hot }) {
  return (
    <span className={`stg-bar${hot ? ' is-hot' : ''}`}>
      <i style={{ '--w': `${Math.round(ratio * 100)}%` }} />
    </span>
  );
}

/* ── 01 · Voyra Relay API ─────────────────────────────────────────────────
   真实请求日志：方法 / 路径 / 状态码 / 耗时，四列对齐。 */
const REQUESTS = [
  ['POST', '/v1/chat/completions', '200', '42ms'],
  ['POST', '/v1/embeddings', '200', '18ms'],
  ['GET', '/v1/models', '200', '6ms'],
  ['POST', '/v1/images', '429', '—'],
];

function StageApiHub() {
  return (
    <Terminal title="voyra-relay · gateway" badge="4 upstream">
      <div className="shot-nav">
        <b>端点</b>
        <span className="is-on">/v1/chat</span>
        <span>/v1/embed</span>
        <span>/v1/images</span>
        <b className="mt">模型路由</b>
        <span>claude-opus</span>
        <span>gpt-4o</span>
      </div>
      <div className="shot-log">
        <Term><span className="is-key">GET</span> /v1/chat 200 42ms</Term>
        <Term tone="dim">POST /v1/embed 200 18ms</Term>
        <Term><span className="is-key">GET</span> /v1/images 200 96ms</Term>
        <Term tone="prompt">→ failover claude → gpt-4o</Term>
      </div>
    </Terminal>
  );
}

/* ── 02 · 日程中心 ────────────────────────────────────────────────────────
   v5：改成 **macOS 日历窗口**（真实 UI），不再是五列课表网格。
   原来那套「周一~周五 × 课名」的表格是抽象示意 —— 真实课表 App 的界面
   一定是：左侧迷你月历 + 右侧当天时间轴。参考站的日历类卡片也是这个形态。 */
const WEEK_DAYS = ['一', '二', '三', '四', '五'];
const DAY_EVENTS = [
  ['08:20', '高等数学', '2-3 节'],
  ['10:20', '大学英语', '3-4 节'],
  ['14:00', '物理实验', '实验楼'],
];

function StageWeekGrid() {
  return (
    <Window title="10 月 13 日 · 星期一" meta={['100%', '14:32']}>
      <div className="shot-cal">
        <div className="shot-cal-side">
          <b>十月</b>
          <div className="shot-cal-mini">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
              <span key={d} className="shot-cal-head">{d}</span>
            ))}
            {Array.from({ length: 28 }, (_, i) => (
              <span
                key={i}
                className={`shot-cal-day${i === 12 ? ' is-on' : ''}${i < 4 || i > 27 ? ' is-out' : ''}`}
              >
                {i < 4 ? 29 + i : i - 3}
              </span>
            ))}
          </div>
        </div>
        <div className="shot-cal-main">
          {DAY_EVENTS.map(([time, name, where], i) => (
            <div key={time} className="shot-cal-row" style={{ '--i': i }}>
              <em>{time}</em>
              <b>{name}</b>
              <span>{where}</span>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

/* ── 03 · AI 模型对比秀 ───────────────────────────────────────────────────
   五个模型的得分与领先幅度。 */
const MODEL_SCORES = [['GPT-4o', 94, 3], ['Claude 3.5', 91, 3], ['Gemini 1.5', 88, -2], ['文心一言', 76, 4], ['Qwen 2.5', 72, 1]];

function StageScoreRace() {
  return (
    <Stage className="race">
      <Head title="同题得分" meta="16 个模型" />
      <ul className="stg-rows is-rank">
        {MODEL_SCORES.map(([name, score, delta], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <Bar ratio={score / 100} hot={i === 0} />
            <em>{score}</em>
            <span className={delta >= 0 ? 'stg-up' : 'stg-down'}>{delta >= 0 ? `+${delta}` : delta}</span>
          </li>
        ))}
      </ul>
      <Foot items={[['最高', '94'], ['均分', '84']]} />
    </Stage>
  );
}

/* ── 04 · 提示词库 ────────────────────────────────────────────────────────
   搜索 + 四条提示词，带分类标签与收藏数。 */
const PROMPTS = [
  ['周报生成器', '写作', '128'],
  ['代码审查员', '代码', '96'],
  ['中英互译', '翻译', '74'],
  ['会议纪要', '总结', '61'],
];

function StageTypewriter() {
  return (
    <Stage className="type">
      <span className="stg-search">搜索提示词…</span>
      <ul className="stg-rows is-prompt">
        {PROMPTS.map(([name, tag, stars], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <span className="stg-chip">{tag}</span>
            <em>★{stars}</em>
          </li>
        ))}
      </ul>
      <Foot items={[['收录', '62 条'], ['本周新增', '5']]} />
    </Stage>
  );
}

/* ── 05 · 组件图鉴 ────────────────────────────────────────────────────────
   六个真组件 + 名称。 */
const COMPONENTS = [['button', '按钮'], ['switch', '开关'], ['input', '输入框'], ['tag', '标签'], ['slider', '滑块'], ['check', '勾选']];

function StageComponentBench() {
  return (
    <Stage className="bench">
      <Head title="组件图鉴" meta="62 个" />
      <div className="stg-bench-grid">
        {COMPONENTS.map(([kind, cn], i) => (
          <div key={kind} className="stg-bench-t" style={{ '--i': i }}>
            {kind === 'button' ? <span className="stg-btn">{cn}</span> : null}
            {kind === 'switch' ? <span className="stg-switch"><i /></span> : null}
            {kind === 'input' ? <span className="stg-input">{cn}</span> : null}
            {kind === 'tag' ? <span className="stg-tag">{cn}</span> : null}
            {kind === 'slider' ? <span className="stg-slider"><i /></span> : null}
            {kind === 'check' ? <span className="stg-checkbox">✓</span> : null}
            <em>{kind}</em>
          </div>
        ))}
      </div>
    </Stage>
  );
}

/* ── 06 · Skill 热榜 ──────────────────────────────────────────────────────
   五个仓库的星数与当日增量。 */
const REPOS = [
  ['anthropics/skills', '12.4k', '+328'],
  ['modelcontextprotocol', '9.8k', '+215'],
  ['obra/superpowers', '7.1k', '+180'],
  ['vercel/ai', '6.3k', '+142'],
  ['openai/openai-node', '5.2k', '+96'],
];

function StagePodium() {
  return (
    <Stage className="podium">
      <Head title="星数排行" meta="每日刷新" />
      <ol className="stg-rows is-repo">
        {REPOS.map(([repo, stars, delta], i) => (
          <li key={repo} className={i === 0 ? 'is-top' : undefined} style={{ '--i': i }}>
            <i className="stg-rank">{i + 1}</i>
            <b>{repo}</b>
            <em>{stars}</em>
            <span className="stg-up">{delta}</span>
          </li>
        ))}
      </ol>
      <Foot items={[['收录', '184 个'], ['更新', '每天']]} />
    </Stage>
  );
}

/* ── 07 · AI Agent ────────────────────────────────────────────────────────
   四步任务流，每步带工具名与状态。 */
const AGENT_STEPS = [
  ['done', '检索', 'web_search', '2.1s'],
  ['done', '分析', 'code_interpreter', '5.4s'],
  ['run', '交付', 'writing', '进行中'],
  ['todo', '归档', '—', '待开始'],
];

function StageDispatch() {
  return (
    <Stage className="dispatch">
      <Head live title="整理竞品资料" meta="运行中" />
      <ul className="stg-rows is-step">
        {AGENT_STEPS.map(([state, label, tool, note], i) => (
          <li key={label} className={`is-${state}`} style={{ '--i': i }}>
            <i className="stg-mark">{state === 'done' ? '✓' : state === 'run' ? '●' : '○'}</i>
            <b>{label}</b>
            <code>{tool}</code>
            <em>{note}</em>
          </li>
        ))}
      </ul>
      <Foot items={[['已用', '7.5s'], ['工具', '3 个']]} />
    </Stage>
  );
}

/* ── 08 · 思维导图 ────────────────────────────────────────────────────────
   根节点 + 五根分支，每根带子节点数。 */
const TREE_NODES = [['内容', 12], ['产品', 19], ['迭代', 7], ['资料', 9], ['灵感', 5]];

function StageRadialTree() {
  return (
    <Stage className="tree">
      <Head title="思维导图" meta="52 个节点" />
      <div className="stg-tree-map">
        <span className="stg-node is-lead">Voyra</span>
        <ul>
          {TREE_NODES.map(([name, count], i) => (
            <li key={name} style={{ '--i': i }}>
              <span className="stg-node">{name}</span>
              <em>{count}</em>
            </li>
          ))}
        </ul>
      </div>
      <Foot items={[['层级', '3 层'], ['已展开', '全部']]} />
    </Stage>
  );
}

/* ── 09 · 宝宝护理 ────────────────────────────────────────────────────────
   三项统计 + 四条护理记录。 */
const CARE_LOG = [
  ['07:20', '配方奶 120ml'],
  ['09:40', '小睡 1h20m'],
  ['13:10', '换尿布'],
  ['15:30', '辅食 半碗'],
];

function StageDayArc() {
  return (
    <Stage className="arc">
      <Head title="今日护理" meta="10月7日" />
      <div className="stg-kpi3">
        <span><b>02</b>喂养</span>
        <span><b>03</b>睡眠</span>
        <span><b>01</b>护理</span>
      </div>
      <ul className="stg-rows is-log">
        {CARE_LOG.map(([time, text], i) => (
          <li key={time} style={{ '--i': i }}>
            <time>{time}</time>
            <b>{text}</b>
          </li>
        ))}
      </ul>
      <Foot items={[['睡眠', '3h20m'], ['距下次', '1h10m']]} />
    </Stage>
  );
}

/* ── 10 · 随机抽人 ────────────────────────────────────────────────────────
   名单滚动 + 已抽记录。 */
const ROSTER = ['张伟', '李娜', '王芳', '刘洋', '陈静'];
const PICKED = ['王芳', '张伟', '陈静'];

function StageSlotRoll() {
  return (
    <Stage className="slot">
      <Head live title="花名册 42 人" meta="已抽取 3" />
      <div className="stg-roll-win">
        <ul className="stg-roll">
          {ROSTER.map((name, i) => (
            <li key={name} className={i === 2 ? 'is-hit' : undefined}>{name}</li>
          ))}
        </ul>
      </div>
      <div className="stg-picked">
        {PICKED.map((n) => <span key={n} className="stg-chip">{n}</span>)}
      </div>
      <Foot items={[['本轮', '3 / 42'], ['避免重复', '已开启']]} />
    </Stage>
  );
}

/* ── 11 · 饮食打卡 ────────────────────────────────────────────────────────
   三餐状态与时间 + 饮水 + 训练。 */
const MEALS = [
  ['on', '早餐', '07:30'],
  ['on', '午餐', '12:10'],
  ['off', '晚餐', '待打卡'],
];

function StageMealStamps() {
  return (
    <Stage className="meal">
      <Head title="今日打卡" meta="2 / 3 餐" />
      <ul className="stg-rows is-meal">
        {MEALS.map(([state, name, note], i) => (
          <li key={name} className={`is-${state}`} style={{ '--i': i }}>
            <i className="stg-mark">{state === 'on' ? '✓' : '○'}</i>
            <b>{name}</b>
            <em>{note}</em>
          </li>
        ))}
      </ul>
      <div className="stg-meter">
        <span>饮水</span>
        <Bar ratio={0.75} />
        <b>6/8</b>
      </div>
      <Foot items={[['力量训练', '已完成'], ['连续', '12 天']]} />
    </Stage>
  );
}

/* ── 12 · 数学建模 Skill ──────────────────────────────────────────────────
   v5：深色终端（参考站 Oil Git 形态）。
   Skill 是命令行工具，真实界面就是终端里跑一条流水线。 */
function StagePaperBuild() {
  return (
    <Terminal title="CUMCM workflow" badge="stage 3/5">
      <div className="shot-nav">
        <b>阶段</b>
        <span className="is-on">3 建立模型</span>
        <span>4 求解验证</span>
        <span>5 论文写作</span>
      </div>
      <div className="shot-log">
        <Term tone="dim">$ skill run cumcm --stage analyze</Term>
        <Term>✓ 题意分析 · 抽取 12 个约束</Term>
        <Term>✓ 模型假设 · 生成 3 条</Term>
        <Term tone="key">● 建立模型 · 进行中</Term>
        <Term tone="prompt">→ 下一步 --stage solve</Term>
      </div>
    </Terminal>
  );
}

/* ── 13 · 织流 Jacquard ───────────────────────────────────────────────────
   四段流水线 + 产物清单。

   v2：产物清单从 2 行补到 4 行。原因见 docs/CARD-DESIGN-SPEC.md §6.2 ——
   舞台的内容密度下限是 4 个可读元素。原来只有 2 个文件行，
   在 200px 高的舞台里上下留出大片空黑，看起来像「没画完」。
   补的两个文件沿用流水线真实产物命名（清洗后的语料 → 模型输出 → 图表 → 报告），
   与下面页脚的「产物 N 个」计数保持一致。 */
const PIPE = [['输入', 'done'], ['清洗', 'done'], ['LLM', 'run'], ['导出', 'run']];
const WEAVE_FILES = [
  ['out/clean.jsonl', 'ok'],
  ['out/result.md', 'ok'],
  ['out/figure-01.png', 'run'],
  ['out/report.html', 'todo'],
];

function StageWeave() {
  return (
    <Stage className="weave">
      <Head live title="本地流水线" meta="运行中" />
      <div className="stg-pipe">
        {PIPE.map(([name, state], i) => (
          <span key={name} className={`is-${state}`} style={{ '--i': i }}>
            {i > 0 ? <u /> : null}
            <b>{name}</b>
          </span>
        ))}
      </div>
      <ul className="stg-rows is-file">
        {WEAVE_FILES.map(([f, state], i) => (
          <li key={f} className={`is-${state}`} style={{ '--i': i }}>
            <i className="stg-mark">{state === 'ok' ? '✓' : state === 'run' ? '●' : '○'}</i>
            <code>{f}</code>
          </li>
        ))}
      </ul>
      <Foot items={[['节点', '3 / 4'], ['产物', '2 / 4']]} />
    </Stage>
  );
}

/* ── 14 · 学习通自动签到 ──────────────────────────────────────────────────
   v5：macOS 应用窗口 + 课程签到列表（真实 UI）。
   真实签到工具的界面就是「课程名 + 状态 + 时间」，没有进度条。 */
const COURSES_CHECK = [
  ['高等数学', '08:02', 'ok'],
  ['大学英语', '08:05', 'ok'],
  ['线性代数', '10:20', 'ok'],
  ['数据结构', '监听中', 'run'],
  ['大学物理', '未开始', 'todo'],
];

function StageAutoClick() {
  return (
    <Window title="学习通自动签到助手" meta={['运行中', 'v3.11']}>
      <div className="shot-app">
        <div className="shot-app-bar">
          <span className="shot-app-live"><i />后台常驻</span>
          <span className="shot-app-count">今日 3 / 5</span>
        </div>
        <div className="shot-app-list">
          {COURSES_CHECK.map(([name, time, state], i) => (
            <div key={name} className={`shot-app-row is-${state}`} style={{ '--i': i }}>
              <i className="shot-app-mark">{state === 'ok' ? '✓' : state === 'run' ? '●' : '○'}</i>
              <b>{name}</b>
              <em>{time}</em>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

/* ── 15 · 磁盘清理 ────────────────────────────────────────────────────────
   v5：macOS 窗口 + 扫描结果（真实 Finder 清理工具的形态：目录树 + 大小）。 */
const DISK = [
  ['系统', '42 GB'],
  ['应用', '68 GB'],
  ['缓存', '36 GB'],
  ['文档', '18 GB'],
  ['垃圾', '118 GB'],
];

function StageDiskClean() {
  return (
    <Window title="磁盘清理助手" meta={['C 盘', '18s']}>
      <div className="shot-disk">
        <div className="shot-disk-head">
          <span>扫描完成</span>
          <b>118<small>GB 可清理</small></b>
        </div>
        <div className="shot-disk-list">
          {DISK.map(([name, size], i) => (
            <div key={name} className={`shot-disk-row${name === '垃圾' ? ' is-hot' : ''}`} style={{ '--i': i }}>
              <i className="shot-disk-fold" />
              <b>{name}</b>
              <em>{size}</em>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

/* ── 16 · 账迹 BillTrace ──────────────────────────────────────────────────
   v5：macOS 窗口 + 账单流水（真实记账 App 的形态：商户 + 分类 + 金额）。
   合计 74.30 = 24.50 + 15.30 + 18.00 + 16.50，数字自洽。 */
const BILLS = [
  ['午餐', '餐饮', '¥24.50'],
  ['咖啡', '餐饮', '¥15.30'],
  ['地铁', '交通', '¥18.00'],
  ['超市', '日用', '¥16.50'],
];

function StageBillDrop() {
  return (
    <Window title="账迹 BillTrace" meta={['10 月 13 日', '4 笔']}>
      <div className="shot-bill">
        {BILLS.map(([shop, cat, amt], i) => (
          <div key={shop} className="shot-bill-row" style={{ '--i': i }}>
            <b>{shop}</b>
            <span className="shot-bill-cat">{cat}</span>
            <em>{amt}</em>
          </div>
        ))}
        <div className="shot-bill-total">
          <span>今日合计</span>
          <b>¥74.30</b>
        </div>
      </div>
    </Window>
  );
}

/* ── 17 · Token Monitor ───────────────────────────────────────────────────
   v5：macOS 窗口 + 工具用量（真实用量看板的形态：工具名 + 今日 Token 数）。
   大数字 1.37M = 620+410+210+130 = 1370k，与下面四行自洽。 */
const TOKEN_TOOLS = [
  ['Claude Code', '620k'],
  ['Codex', '410k'],
  ['WorkBuddy', '210k'],
  ['DeepSeek', '130k'],
];

function StageSparkline() {
  return (
    <Window title="Token Monitor" meta={['本机', '今日']}>
      <div className="shot-token">
        <div className="shot-token-head">
          <b>1.37<small>M</small></b>
          <span>今日 Token</span>
        </div>
        <div className="shot-token-list">
          {TOKEN_TOOLS.map(([name, val], i) => (
            <div key={name} className="shot-token-row" style={{ '--i': i }}>
              <i className="shot-token-dot" />
              <b>{name}</b>
              <em>{val}</em>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

/* ── 18 · 知新 Zenew ──────────────────────────────────────────────────────
   v5：改成**无外壳的纯内容**（参考站 Text-Well 就是这个形态：
   几行大字 + 分隔线，没有窗口框）。
   这张卡的内容本身就是产品 —— 一个单词卡的正面。 */
function StageFlipCard() {
  return (
    <Inline>
      <div className="shot-word">
        <span className="shot-word-term">abandon</span>
        <span className="shot-word-phonetic">/əˈbændən/</span>
        <span className="shot-word-mean">放弃；抛弃</span>
      </div>
      <span className="Inline-line" />
      <div className="shot-word-meta">
        <span>今日待复习</span>
        <b>42</b>
      </div>
    </Inline>
  );
}

/* ── 19 · AI 轨迹 ─────────────────────────────────────────────────────────
   v5：macOS 窗口 + 时间轴（真实工作日志工具的形态：时间 + 事件）。 */
const TRACE = [
  ['08:30', '会话 4'],
  ['11:00', '产出 3'],
  ['14:00', '产出 8'],
  ['17:30', '会话 12'],
  ['20:00', '日报'],
];

function StageTimeline() {
  return (
    <Window title="AI 轨迹" meta={['10 月 13 日', '12 源']}>
      <div className="shot-trace">
        {TRACE.map(([time, text], i) => (
          <div key={time} className="shot-trace-row" style={{ '--i': i }}>
            <em>{time}</em>
            <i className={`shot-trace-dot${i === TRACE.length - 1 ? ' is-last' : ''}`} />
            <b>{text}</b>
          </div>
        ))}
      </div>
    </Window>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   20 · VoyraAI 官方商城（voyra.men）
   ══════════════════════════════════════════════════════════════════════════
   v5：浏览器窗口截图 —— 真实 UI 浮在白卡上，不是「带边框的面板里塞图表」。
   窗口里是商城首页：搜索框 + 四件商品（品牌 logo + 名称 + 价格）+ 发货状态条。

   商品与价格取自 https://voyra.men/ 真实页面（2026-10-13 抓取）：
     ChatGPT Plus ¥139/月、Gemini Pro 18 个月 ¥7、X Premium ¥22、多邻国年卡 ¥9.9 */
const MALL_ITEMS = [
  ['ChatGPT Plus', '¥139/月', 'openai'],
  ['Gemini Pro', '18 个月 ¥7', 'googlegemini'],
  ['X Premium', '3/6 月 ¥22', 'x'],
  ['多邻国', '年卡 ¥9.9', 'duolingo'],
];

function StageVoyraMall() {
  return (
    <Browser url="voyra.men" title="VoyraAI · 数字商品自动发卡">
      <div className="shot-mall">
        <div className="shot-mall-search">
          <Search size={11} strokeWidth={2} />
          <span>搜索商品…</span>
        </div>
        <div className="shot-mall-grid">
          {MALL_ITEMS.map(([name, price, slug]) => (
            <div key={name} className="shot-goods">
              <BrandLogo slug={slug} size={13} />
              <b>{name}</b>
              <em>{price}</em>
            </div>
          ))}
        </div>
        <div className="shot-mall-status">
          <i /> 付款后自动发货 · 凭订单号查询
        </div>
      </div>
    </Browser>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   21 · VoyraAI 推荐通道（gptibo.com/r/719F2E）
   ══════════════════════════════════════════════════════════════════════════
   同样用浏览器窗口。与商城卡的差异在「窗口里第一屏的内容」：
     商城   搜索框 + 商品网格
     推荐   推荐码横幅（唯一独有信息）+ 类目网格
   两张卡并排时读者能一眼分清。 */
const REF_CATS = [
  ['AI 订阅', 'ChatGPT · Gemini', 'openai'],
  ['语言学习', 'Duolingo 年卡', 'duolingo'],
  ['邮箱账号', '美区 Gmail', 'gmail'],
  ['工具服务', 'Claude 会员', 'anthropic'],
];

function StageVoyraRef() {
  return (
    <Browser url="gptibo.com/r/719F2E" title="Voyra · 推荐通道">
      <div className="shot-mall is-ref">
        <div className="shot-ref-banner">
          <span>推荐码</span>
          <b>719F2E</b>
        </div>
        <div className="shot-mall-grid">
          {REF_CATS.map(([name, sub, slug]) => (
            <div key={name} className="shot-goods">
              <BrandLogo slug={slug} size={13} />
              <b>{name}</b>
              <em>{sub}</em>
            </div>
          ))}
        </div>
        <div className="shot-mall-status">
          <i /> 邮件交付 · 卡密保留 7 天
        </div>
      </div>
    </Browser>
  );
}

/* ── 04 · 血压记录（2026-10-19） ───────────────────────────────────────────
   复刻设计稿（voyra_health.html）门户卡内嵌的 macOS 缩略窗：三色点 + 最新一次
   118/76 mmHg、心率 72 bpm、脉压差，右侧三条近期小记录。
   数值与真实记录页（/health）同源，不是抽象图形。
   v5 约定：外壳（Window）直接当舞台根，内层类名另起 bp-，不复用根类名。 */
const BP_ROWS = [
  ['08:00', '118/76', 72, '晨起'],
  ['21:30', '121/78', 75, '晚间'],
  ['08:15', '115/74', 68, '晨起'],
];

function StageBpLog() {
  return (
    <Window title="血压记录" meta={['10月19日 · 血压监测', '达标 7/7']}>
      <div className="bp-body">
        <div className="bp-latest">
          <span className="bp-cap">今日测量</span>
          <b className="bp-bp">118/76</b>
          <span className="bp-hr">♥ 72 bpm</span>
          <span className="bp-pp">脉压差 42 mmHg</span>
        </div>
        <div className="bp-rows">
          {BP_ROWS.map(([t, bp, hr, tag]) => (
            <div className="bp-row" key={t}>
              <i className="bp-t">{t}</i>
              <b className="bp-v">{bp}</b>
              <em>{hr} bpm · {tag}</em>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

export const STAGES = {
  'api-hub': StageApiHub,
  'week-grid': StageWeekGrid,
  'score-race': StageScoreRace,
  typewriter: StageTypewriter,
  'component-bench': StageComponentBench,
  podium: StagePodium,
  dispatch: StageDispatch,
  'radial-tree': StageRadialTree,
  'day-arc': StageDayArc,
  'slot-roll': StageSlotRoll,
  'meal-stamps': StageMealStamps,
  'paper-build': StagePaperBuild,
  weave: StageWeave,
  'auto-click': StageAutoClick,
  'junk-shrink': StageDiskClean,
  'banner-drop': StageBillDrop,
  sparkline: StageSparkline,
  'flip-card': StageFlipCard,
  timeline: StageTimeline,
  mall: StageVoyraMall,
  referral: StageVoyraRef,
  'bp-log': StageBpLog,
};
