/* ==========================================================================
   19 个舞台 · 每个舞台 = 该产品真实界面的一角
   --------------------------------------------------------------------------
   上一版这里画的是 19 组抽象图形（圆点、矩形、折线），19 张卡放在一起
   只有颜色和上下位置不同 —— 用户评价"卡片的样子都没变"。问题在于：
   抽象图形不承载任何信息，读者看不出这张卡是什么产品。

   这一版改成：**每个舞台直接展示该产品的真实内容**。
     · API 网关   → 请求日志（POST /v1/chat · 200 · 42ms）
     · 日程中心   → 真实课表（高等数学 / 大学英语 …）
     · 模型对比   → 真实排名与分数（GPT-4o 94 / Claude 91 …）
     · 账迹       → 真实账单条目（午餐 ¥24.50 / 合计 ¥39.80）
     · 磁盘清理   → 分类占用（系统 42G / 应用 68G / 垃圾 118G）
   …… 19 张各有各的字段、单位和文案，读者扫一眼就知道这张卡在做什么。

   为什么从 SVG 换成 HTML：舞台原先用
   `<svg viewBox="0 0 300 220" preserveAspectRatio="none">`，
   这个设置会把图形按容器比例**非等比拉伸**，所以里面根本写不了文字
   （字会被压扁）。改用 HTML 后可以用真实字体排版，也能用 flex/grid 自适应
   舞台在不同版式下的不同高度。

   颜色全部走 --stg-*（由 ProductCard 按基调注入）：
     --stg-ink / --stg-ink-rgb   描边与实心块
     --stg-text / --stg-text-rgb 文字（对舞台底 ≥ 4.5:1，与 ink 分开是因为
                                 金色基调的 #8A6D1F 作文字只有 4.02:1）
     --stg-panel                 面板填充
   ========================================================================== */

function Stage({ className, children }) {
  /* aria-hidden：舞台是「产品长什么样」的图示，卡片的 aria-label / title / 描述
     已经承载了语义。让读屏器去念一串示意用的日志和金额只会变成噪音。 */
  return <div className={`stg stg-${className}`} aria-hidden="true">{children}</div>;
}

/** 舞台统一的小标题条：状态点 + 主标签 + 右侧元信息。 */
function Head({ live, title, meta }) {
  return (
    <div className="stg-head">
      {live ? <i className="stg-dot" /> : null}
      <b>{title}</b>
      {meta ? <em>{meta}</em> : null}
    </div>
  );
}

/** 进度条。ratio 0~1。 */
function Bar({ ratio, hot }) {
  return (
    <span className={`stg-bar${hot ? ' is-hot' : ''}`}>
      <i style={{ '--w': `${Math.round(ratio * 100)}%` }} />
    </span>
  );
}

/* ── 01 · Voyra Relay API ─────────────────────────────────────────────────
   一段真实的请求日志。method / path / 状态码 / 耗时四列，正是网关每天在刷的东西。 */
const API_REQUESTS = [
  ['POST', '/v1/chat/completions', '200', '42ms'],
  ['POST', '/v1/embeddings', '200', '18ms'],
  ['GET', '/v1/models', '200', '6ms'],
];

function StageApiHub() {
  return (
    <Stage className="api">
      <Head live title="网关在线" meta="4 个上游" />
      <ul className="stg-reqs">
        {API_REQUESTS.map(([method, path, code, ms]) => (
          <li key={path}>
            <span className={`stg-method${method === 'GET' ? ' is-get' : ''}`}>{method}</span>
            <code>{path}</code>
            <b>{code}</b>
            <em>{ms}</em>
          </li>
        ))}
      </ul>
      <div className="stg-foot-row">
        <span>P95 延迟</span>
        <Bar ratio={0.38} />
        <b>42ms</b>
      </div>
    </Stage>
  );
}

/* ── 02 · 日程中心 ────────────────────────────────────────────────────────
   真实课表：五个工作日 + 四门有名字的课，而不是 28 个空方块。
   grid-area 是 `行起 / 列起 / 行止 / 列止`。 */
const COURSES = [
  ['高等数学', '2 / 1 / 4 / 2'],
  ['大学英语', '2 / 2 / 4 / 3'],
  ['数据结构', '2 / 4 / 4 / 5'],
  ['物理实验', '4 / 1 / 6 / 2'],
  ['线性代数', '4 / 3 / 6 / 4'],
  ['体育', '4 / 5 / 6 / 6'],
];

function StageWeekGrid() {
  return (
    <Stage className="week">
      <Head title="本周课表" meta="第 6 周" />
      <div className="stg-week-grid">
        {['一', '二', '三', '四', '五'].map((d) => <span key={d} className="stg-week-h">{d}</span>)}
        {COURSES.map(([name, area], i) => (
          <span key={name} className="stg-week-c" style={{ gridArea: area, '--i': i }}>{name}</span>
        ))}
      </div>
    </Stage>
  );
}

/* ── 03 · AI 模型对比秀 ───────────────────────────────────────────────────
   同题得分榜：模型名 + 条形 + 分数。名字和分数都是读者认得的。 */
const MODEL_SCORES = [['GPT-4o', 94], ['Claude 3.5', 91], ['Gemini 1.5', 88], ['文心一言', 76]];

function StageScoreRace() {
  return (
    <Stage className="race">
      <Head title="同题得分" meta="16 个模型" />
      <ul className="stg-ranks">
        {MODEL_SCORES.map(([name, score], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <Bar ratio={score / 100} hot={i === 0} />
            <em>{score}</em>
          </li>
        ))}
      </ul>
    </Stage>
  );
}

/* ── 04 · 提示词库 ────────────────────────────────────────────────────────
   一个搜索框 + 三条真实提示词（标题 / 分类标签 / 收藏数）。 */
const PROMPTS = [
  ['周报生成器', '写作 · 总结', '128'],
  ['代码审查员', '代码 · 质量', '96'],
  ['中英互译', '翻译', '74'],
];

function StageTypewriter() {
  return (
    <Stage className="type">
      <span className="stg-search">搜索提示词…</span>
      <ul className="stg-prompts">
        {PROMPTS.map(([name, tags, stars], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <span>{tags}</span>
            <em>★{stars}</em>
          </li>
        ))}
      </ul>
    </Stage>
  );
}

/* ── 05 · 组件图鉴 ────────────────────────────────────────────────────────
   四个真组件（按钮 / 开关 / 输入框 / 标签）+ 各自的英文名，就是图鉴本身。 */
const COMPONENTS = [
  ['button', '按钮', 'Button'],
  ['switch', '开关', 'Switch'],
  ['input', '输入框', 'Input'],
  ['tag', '标签', 'Tag'],
];

function StageComponentBench() {
  return (
    <Stage className="bench">
      <Head title="组件图鉴" meta="62 个" />
      <div className="stg-bench-grid">
        {COMPONENTS.map(([kind, cn, en], i) => (
          <div key={kind} className="stg-bench-t" style={{ '--i': i }}>
            {kind === 'button' ? <span className="stg-btn">{cn}</span> : null}
            {kind === 'switch' ? <span className="stg-switch"><i /></span> : null}
            {kind === 'input' ? <span className="stg-input">{cn}</span> : null}
            {kind === 'tag' ? <span className="stg-tag">{cn}</span> : null}
            <em>{en}</em>
          </div>
        ))}
      </div>
    </Stage>
  );
}

/* ── 06 · Skill 热榜 ──────────────────────────────────────────────────────
   GitHub 星数排行：真实仓库名 + 星数 + 当日增量。 */
const REPOS = [
  ['anthropics/skills', '12.4k', '↑328'],
  ['modelcontextprotocol', '9.8k', '↑215'],
  ['obra/superpowers', '7.1k', '↑180'],
];

function StagePodium() {
  return (
    <Stage className="podium">
      <Head title="星数排行" meta="每日刷新" />
      <ol className="stg-repos">
        {REPOS.map(([repo, stars, delta], i) => (
          <li key={repo} className={i === 0 ? 'is-top' : undefined}>
            <i>{i + 1}</i>
            <b>{repo}</b>
            <span>{stars}</span>
            <em>{delta}</em>
          </li>
        ))}
      </ol>
    </Stage>
  );
}

/* ── 07 · AI Agent ────────────────────────────────────────────────────────
   一个正在跑的任务：三步 + 每步调用的工具名。 */
const AGENT_STEPS = [
  ['done', '检索', 'web_search'],
  ['done', '分析', 'code_interpreter'],
  ['run', '交付', '生成中…'],
];

function StageDispatch() {
  return (
    <Stage className="dispatch">
      <Head live title="整理竞品资料" meta="运行中" />
      <ul className="stg-steps">
        {AGENT_STEPS.map(([state, label, tool], i) => (
          <li key={label} className={`is-${state}`} style={{ '--i': i }}>
            <i>{state === 'done' ? '✓' : '●'}</i>
            <b>{label}</b>
            <code>{tool}</code>
          </li>
        ))}
      </ul>
    </Stage>
  );
}

/* ── 08 · 思维导图 ────────────────────────────────────────────────────────
   根节点 + 三根分支，分支上带真实节点名和数量。 */
const TREE_NODES = [['内容', 12], ['产品', 19], ['迭代', 7]];

function StageRadialTree() {
  return (
    <Stage className="tree">
      <Head title="导图" meta="18 个节点" />
      <div className="stg-tree-map">
        <span className="stg-tree-root">Voyra</span>
        <span className="stg-tree-stem" />
        <ul className="stg-tree-leaves">
          {TREE_NODES.map(([name, count], i) => (
            <li key={name} style={{ '--i': i }}>{name}<em>{count}</em></li>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

/* ── 09 · 宝宝护理 ────────────────────────────────────────────────────────
   三个统计 + 三条带时间的护理记录。 */
const CARE_LOG = [
  ['07:20', '配方奶 120ml'],
  ['09:40', '小睡 1h20m'],
  ['13:10', '换尿布'],
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
      <ul className="stg-log">
        {CARE_LOG.map(([time, text], i) => (
          <li key={time} style={{ '--i': i }}><time>{time}</time><b>{text}</b></li>
        ))}
      </ul>
    </Stage>
  );
}

/* ── 10 · 随机抽人 ────────────────────────────────────────────────────────
   名单滚动，停在中签的那个名字上。 */
const ROSTER = ['张伟', '李娜', '王芳', '刘洋', '陈静'];

function StageSlotRoll() {
  return (
    <Stage className="slot">
      <Head title="花名册 42 人" meta="已抽取" />
      <div className="stg-roll-win">
        <ul className="stg-roll">
          {ROSTER.map((name, i) => (
            <li key={name} className={i === 2 ? 'is-hit' : undefined}>{name}</li>
          ))}
        </ul>
      </div>
    </Stage>
  );
}

/* ── 11 · 饮食打卡 ────────────────────────────────────────────────────────
   三餐状态 + 饮水进度。 */
const MEALS = [
  ['on', '早餐', '07:30'],
  ['on', '午餐', '12:10'],
  ['off', '晚餐', '待打卡'],
];

function StageMealStamps() {
  return (
    <Stage className="meal">
      <Head title="今日打卡" meta="2 / 3 餐" />
      <ul className="stg-meals">
        {MEALS.map(([state, name, note], i) => (
          <li key={name} className={`is-${state}`} style={{ '--i': i }}>
            <i>{state === 'on' ? '✓' : '○'}</i>
            <b>{name}</b>
            <em>{note}</em>
          </li>
        ))}
      </ul>
      <div className="stg-foot-row">
        <span>饮水</span>
        <Bar ratio={0.75} />
        <b>6/8</b>
      </div>
    </Stage>
  );
}

/* ── 12 · 数学建模 Skill ──────────────────────────────────────────────────
   国赛工作流的真实阶段名与状态。 */
const CUMCM_STEPS = [
  ['done', '题意分析', '已完成'],
  ['done', '模型假设', '已完成'],
  ['run', '建立模型', '进行中'],
  ['todo', '求解验证', '待开始'],
  ['todo', '论文写作', '待开始'],
];

function StagePaperBuild() {
  return (
    <Stage className="paper">
      <Head title="CUMCM 工作流" meta="国赛" />
      <ul className="stg-steps is-dense">
        {CUMCM_STEPS.map(([state, label, note], i) => (
          <li key={label} className={`is-${state}`} style={{ '--i': i }}>
            <i>{state === 'done' ? '✓' : state === 'run' ? '●' : '○'}</i>
            <b>{label}</b>
            <em>{note}</em>
          </li>
        ))}
      </ul>
    </Stage>
  );
}

/* ── 13 · 织流 Jacquard ───────────────────────────────────────────────────
   四段流水线 + 产物落盘路径。 */
const PIPE = [['输入', 0], ['清洗', 0], ['LLM', 1], ['导出', 0]];

function StageWeave() {
  return (
    <Stage className="weave">
      <Head live title="本地流水线" meta="运行中" />
      <div className="stg-pipe">
        {PIPE.map(([name, running], i) => (
          <span key={name} className={running ? 'is-run' : undefined} style={{ '--i': i }}>
            {i > 0 ? <u /> : null}
            <b>{name}</b>
          </span>
        ))}
      </div>
      <p className="stg-note">产物已落盘 · out/report.md</p>
    </Stage>
  );
}

/* ── 14 · 学习通自动签到 ──────────────────────────────────────────────────
   三门课的签到状态与时间。 */
const COURSES_CHECK = [
  ['高等数学', '已签到 08:02', 'ok'],
  ['大学英语', '已签到 08:05', 'ok'],
  ['线性代数', '监听中', 'run'],
];

function StageAutoClick() {
  return (
    <Stage className="click">
      <Head live title="后台监听中" meta="3 门课" />
      <ul className="stg-courses">
        {COURSES_CHECK.map(([name, note, state], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <em className={`is-${state}`}>{note}</em>
          </li>
        ))}
      </ul>
    </Stage>
  );
}

/* ── 15 · 磁盘清理助手 ────────────────────────────────────────────────────
   一个大数字 + 三类占用。数字与条长一致（42/68/118 对 28%/45%/78%）。 */
const DISK = [['系统', '42 GB', 0.28], ['应用', '68 GB', 0.45], ['垃圾', '118 GB', 0.78]];

function StageDiskClean() {
  return (
    <Stage className="disk">
      <Head title="扫描完成" meta="C 盘" />
      <p className="stg-big">118<small>GB 可清理</small></p>
      <ul className="stg-disk-list">
        {DISK.map(([name, size, ratio], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <Bar ratio={ratio} hot={name === '垃圾'} />
            <em>{size}</em>
          </li>
        ))}
      </ul>
    </Stage>
  );
}

/* ── 16 · 账迹 BillTrace ──────────────────────────────────────────────────
   两笔真实消费 + 合计。合计 39.80 = 24.50 + 15.30，数字自洽。 */
const BILLS = [['午餐', '¥24.50'], ['咖啡', '¥15.30']];

function StageBillDrop() {
  return (
    <Stage className="bill">
      <Head live title="自动入库" meta="2 秒" />
      <ul className="stg-bills">
        {BILLS.map(([name, amount], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <em>{amount}</em>
          </li>
        ))}
      </ul>
      <div className="stg-total"><span>合计</span><b>¥39.80</b></div>
    </Stage>
  );
}

/* ── 17 · Token Monitor ───────────────────────────────────────────────────
   两个 KPI + 一条折线。折线用 SVG 但不带文字，所以 preserveAspectRatio="none"
   的非等比拉伸在这里无害。 */
function StageSparkline() {
  return (
    <Stage className="spark">
      <Head title="今日用量" meta="本机" />
      <p className="stg-big">1.24<small>M Token</small></p>
      <div className="stg-kpi2">
        <span>请求 <b>342</b></span>
        <span>缓存命中 <b>68%</b></span>
      </div>
      <svg className="stg-spark-chart" viewBox="0 0 240 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 32 L34 26 L68 29 L102 17 L136 12 L170 18 L204 6 L240 10 L240 40 L0 40 Z" className="stg-spark-area" />
        <path d="M0 32 L34 26 L68 29 L102 17 L136 12 L170 18 L204 6 L240 10" className="stg-spark-line" />
      </svg>
    </Stage>
  );
}

/* ── 18 · 知新 Zenew ──────────────────────────────────────────────────────
   一张真卡片：正面单词 + 音标，背面释义 + 复习间隔。翻面动画保留。 */
function StageFlipCard() {
  return (
    <Stage className="flip">
      <Head title="今日待复习" meta="42 张" />
      <div className="stg-flip-stage">
        <div className="stg-flip-card">
          <div className="stg-flip-face is-front">
            <b>abandon</b>
            <span>/əˈbændən/</span>
          </div>
          <div className="stg-flip-face is-back">
            <b>放弃；抛弃</b>
            <span>FSRS · 4 天后</span>
          </div>
        </div>
      </div>
    </Stage>
  );
}

/* ── 19 · AI 轨迹 ─────────────────────────────────────────────────────────
   一天里的三个时间点与对应产出。 */
const TRACE = [
  ['09:00', '会话 12 · 任务 3'],
  ['14:00', '产出 8 份'],
  ['20:00', '日报已生成'],
];

function StageTimeline() {
  return (
    <Stage className="timeline">
      <Head title="今日轨迹" meta="12 个数据源" />
      <ul className="stg-tl">
        {TRACE.map(([time, text], i) => (
          <li key={time} style={{ '--i': i }}>
            <time>{time}</time>
            <b>{text}</b>
          </li>
        ))}
      </ul>
    </Stage>
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
};
