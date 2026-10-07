/* ==========================================================================
   19 个舞台 · 现代仪表盘风格
   --------------------------------------------------------------------------
   两轮反馈合起来看，边界就清楚了：
     · 第一轮太「旧」——密集假 UI、厚描边、点阵纹理、高光扫过。
     · 上一轮太「空」——为了去掉旧手法，把内容也一起删了，只剩一个数字漂在
       留白里，用户评价"过于简单"。

   这一版取中间：**内容密度回到接近真实产品，但用现代的手法做**。
   每个舞台统一三段式 ——

     ┌ head  状态点 + 主标签 ──────────── 右侧元信息
     │ body  主体：数据行 / 图表 / 网格
     └ foot  2~3 个次要指标

   现代感来自执行方式，不是来自"删东西"：
     · 分隔用 1px 发丝线（透明度 0.10），不用粗描边；
     · 面板浮起靠柔和投影分层；
     · 数字用等宽 + 右对齐 + 表格数字，读起来是"看板"不是"文案"；
     · 强调色只给状态点、关键数值、进度条、当前行 —— 其余全中性灰；
     · 字号层级 10 / 11.5 / 13，靠对比而不是靠加粗堆砌。

   动效仍然克制：入场错峰淡入、环境光缓慢漂移、状态点呼吸、进度条展开。

   颜色取自基调变量（ProductCard 按该卡 tone 注入）：
     --stg-ink / --stg-text / --stg-text-rgb / --stg-panel
   ========================================================================== */

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
    <Stage className="api">
      <Head live title="网关在线" meta="4 个上游" />
      <ul className="stg-rows is-req">
        {REQUESTS.map(([m, p, code, ms], i) => (
          <li key={p} style={{ '--i': i }}>
            <span className={`stg-m${m === 'GET' ? ' is-get' : ''}`}>{m}</span>
            <code>{p}</code>
            <b className={code === '200' ? 'is-ok' : 'is-warn'}>{code}</b>
            <em>{ms}</em>
          </li>
        ))}
      </ul>
      <Foot items={[['P95', '42ms'], ['吞吐', '1.2k/s'], ['错误率', '0.02%']]} />
    </Stage>
  );
}

/* ── 02 · 日程中心 ────────────────────────────────────────────────────────
   真实课表：五列 × 五节，格子写课名（两行高的格子才放得下）。 */
const COURSES = [
  ['高等数学', '2 / 1 / 4 / 2'],
  ['大学英语', '2 / 2 / 4 / 3'],
  ['数据结构', '2 / 4 / 4 / 5'],
  ['物理实验', '4 / 1 / 6 / 2'],
  ['线性代数', '4 / 3 / 6 / 4'],
  ['体育', '2 / 5 / 4 / 6'],
  ['选修', '4 / 5 / 6 / 6'],
];

function StageWeekGrid() {
  return (
    <Stage className="week">
      <Head title="本周课表" meta="第 6 周" />
      <div className="stg-grid">
        {['一', '二', '三', '四', '五'].map((d) => <span key={d} className="stg-grid-h">{d}</span>)}
        {COURSES.map(([name, area], i) => (
          <span key={name} className="stg-grid-c" style={{ gridArea: area, '--i': i }}>{name}</span>
        ))}
      </div>
      <Foot items={[['共', '7 节'], ['下一节', '高等数学']]} />
    </Stage>
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
   国赛工作流五个阶段 + 进度条。 */
const CUMCM_STEPS = [
  ['done', '题意分析'],
  ['done', '模型假设'],
  ['run', '建立模型'],
  ['todo', '求解验证'],
  ['todo', '论文写作'],
];

function StagePaperBuild() {
  return (
    <Stage className="paper">
      <Head title="CUMCM 工作流" meta="国赛" />
      <ul className="stg-rows is-step is-dense">
        {CUMCM_STEPS.map(([state, label], i) => (
          <li key={label} className={`is-${state}`} style={{ '--i': i }}>
            <i className="stg-mark">{state === 'done' ? '✓' : state === 'run' ? '●' : '○'}</i>
            <b>{label}</b>
            <em>{state === 'done' ? '已完成' : state === 'run' ? '进行中' : '待开始'}</em>
          </li>
        ))}
      </ul>
      <Bar ratio={0.44} />
      <Foot items={[['进度', '2 / 5'], ['预计', '6 天']]} />
    </Stage>
  );
}

/* ── 13 · 织流 Jacquard ───────────────────────────────────────────────────
   四段流水线 + 产物清单。 */
const PIPE = [['输入', 'done'], ['清洗', 'done'], ['LLM', 'run'], ['导出', 'todo']];
const WEAVE_FILES = ['out/clean.jsonl', 'out/result.md'];

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
        {WEAVE_FILES.map((f, i) => (
          <li key={f} style={{ '--i': i }}><i className="stg-mark">✓</i><code>{f}</code></li>
        ))}
      </ul>
      <Foot items={[['节点', '4 / 4'], ['产物', '2 个']]} />
    </Stage>
  );
}

/* ── 14 · 学习通自动签到 ──────────────────────────────────────────────────
   五门课的签到状态与时间。 */
const COURSES_CHECK = [
  ['高等数学', '08:02', 'ok'],
  ['大学英语', '08:05', 'ok'],
  ['线性代数', '10:20', 'ok'],
  ['数据结构', '监听中', 'run'],
  ['大学物理', '未开始', 'todo'],
];

function StageAutoClick() {
  return (
    <Stage className="click">
      <Head live title="后台监听中" meta="5 门课" />
      <ul className="stg-rows is-course">
        {COURSES_CHECK.map(([name, note, state], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <em className={`is-${state}`}>{state === 'run' ? <i className="stg-dot" /> : null}{note}</em>
          </li>
        ))}
      </ul>
      <Foot items={[['已签到', '3 门'], ['防风控', '已开启']]} />
    </Stage>
  );
}

/* ── 15 · 磁盘清理助手 ────────────────────────────────────────────────────
   大数字 + 四项占用明细（条长与数值成比例）。 */
const DISK = [['系统', '42 GB', 0.28], ['应用', '68 GB', 0.45], ['缓存', '36 GB', 0.24], ['垃圾', '118 GB', 0.78]];

function StageDiskClean() {
  return (
    <Stage className="disk">
      <Head title="扫描完成" meta="C 盘" />
      <p className="stg-big">118<small>GB 可清理</small></p>
      <ul className="stg-rows is-disk">
        {DISK.map(([name, size, ratio], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <Bar ratio={ratio} hot={name === '垃圾'} />
            <em>{size}</em>
          </li>
        ))}
      </ul>
      <Foot items={[['扫描', '1.2 万文件'], ['耗时', '18s']]} />
    </Stage>
  );
}

/* ── 16 · 账迹 BillTrace ──────────────────────────────────────────────────
   四笔消费 + 合计。合计 74.30 = 24.50 + 15.30 + 18.00 + 16.50，数字自洽。 */
const BILLS = [['午餐', '餐饮', '¥24.50'], ['咖啡', '餐饮', '¥15.30'], ['地铁', '交通', '¥18.00'], ['超市', '日用', '¥16.50']];

function StageBillDrop() {
  return (
    <Stage className="bill">
      <Head live title="自动入库" meta="2 秒" />
      <ul className="stg-rows is-bill">
        {BILLS.map(([name, cat, amount], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <span className="stg-chip">{cat}</span>
            <em>{amount}</em>
          </li>
        ))}
      </ul>
      <div className="stg-total"><span>今日合计</span><b>¥74.30</b></div>
    </Stage>
  );
}

/* ── 17 · Token Monitor ───────────────────────────────────────────────────
   大数字 + 折线 + 按工具拆分。 */
const TOKEN_TOOLS = [['Claude Code', '620k', 0.50], ['Codex', '410k', 0.33], ['WorkBuddy', '210k', 0.17]];

function StageSparkline() {
  return (
    <Stage className="spark">
      <Head title="今日用量" meta="本机" />
      <p className="stg-big">1.24<small>M Token</small></p>
      <svg className="stg-spark-chart" viewBox="0 0 220 44" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 36 L31 29 L62 32 L93 18 L124 13 L155 20 L186 8 L220 12 L220 44 L0 44 Z" className="stg-spark-area" />
        <path d="M0 36 L31 29 L62 32 L93 18 L124 13 L155 20 L186 8 L220 12" className="stg-spark-line" />
      </svg>
      <ul className="stg-rows is-tool">
        {TOKEN_TOOLS.map(([name, val, ratio], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <Bar ratio={ratio} />
            <em>{val}</em>
          </li>
        ))}
      </ul>
    </Stage>
  );
}

/* ── 18 · 知新 Zenew ──────────────────────────────────────────────────────
   单词卡翻面 + 复习进度。 */
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
            <span>4 天后复习</span>
          </div>
        </div>
      </div>
      <Bar ratio={0.62} />
      <Foot items={[['已复习', '26 张'], ['正确率', '88%']]} />
    </Stage>
  );
}

/* ── 19 · AI 轨迹 ─────────────────────────────────────────────────────────
   五个时间点 + 当日产出柱状。 */
const TRACE = [['08:30', '会话 4'], ['11:00', '产出 3'], ['14:00', '产出 8'], ['17:30', '会话 12'], ['20:00', '日报']];
const TRACE_BARS = [30, 52, 78, 44, 62, 88, 70, 96, 58, 40];

function StageTimeline() {
  return (
    <Stage className="timeline">
      <Head title="今日轨迹" meta="12 个数据源" />
      <ul className="stg-rows is-trace">
        {TRACE.map(([time, text], i) => (
          <li key={time} style={{ '--i': i }}>
            <time>{time}</time>
            <b>{text}</b>
          </li>
        ))}
      </ul>
      <div className="stg-cols">
        {TRACE_BARS.map((h, i) => <i key={i} style={{ '--h': `${h}%`, '--i': i }} />)}
      </div>
      <Foot items={[['会话', '16'], ['产出', '11 份']]} />
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
