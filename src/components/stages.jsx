/* ==========================================================================
   19 个舞台 · 极简现代
   --------------------------------------------------------------------------
   上一版把舞台做成了「密集的假 UI 截图」：8.5~10px 的小字成行、到处 1px 描边、
   虚线圆、嵌套面板。那是 2015 年前后的语言：密、碎、旧。

   这一版的设计原则（现代 / 简约 / 高级）：
     ① **留白优先**：每个舞台只留一个焦点（大数字或关键词）+ 一行小注，
        其余交给干净的几何形状。元素数量比上一版少一半，字号翻倍。
     ② **阴影分层而不是描边**：面板靠柔和投影浮起，描边只用在极少数地方。
     ③ **克制用色**：只用基调色（--stg-ink）画形状，其余全是中性灰。
     ④ **动效有分寸**：入场错峰淡入、悬停时焦点微微放大、状态点缓慢呼吸。
        去掉了「高光扫过」与「3D 倾斜」这两个明显的旧时代手法。

   内容指向没有丢：每张卡仍然用自己那个产品才有的数字与文案
   （42ms / 118 GB / ¥39.80 / 12.4k / 建立模型 / 会话 12 …），
   只是从「铺满一屏的小字」收敛成「一眼能读到的一个焦点」。

   为什么用 HTML 而不是 SVG：舞台原先用
   `<svg viewBox="0 0 300 220" preserveAspectRatio="none">`，非等比拉伸意味着
   里面写不了文字。只有不含文字的弧线与折线仍用 SVG。

   颜色取自基调变量（ProductCard 按该卡 tone 注入）：
     --stg-ink / --stg-text / --stg-panel
   ========================================================================== */

function Stage({ className, children }) {
  /* aria-hidden：舞台是「这个产品大概长什么样」的示意，语义由卡片 aria-label
     承担。让读屏器去念示意数值只会变成噪音。 */
  return <div className={`stg stg-${className}`} aria-hidden="true">{children}</div>;
}

/* 焦点：一个大数字 / 关键词 + 一行小注。多数舞台的主体。 */
function Figure({ value, unit, cap }) {
  return (
    <div className="stg-focus">
      <p className="stg-figure">{value}{unit ? <small>{unit}</small> : null}</p>
      {cap ? <span className="stg-cap">{cap}</span> : null}
    </div>
  );
}

/* ── 01 · Voyra Relay API ─────────────────────────────────────────────────
   焦点是延迟，下面一条细线连着两个节点表示「请求在跑」。 */
function StageApiHub() {
  return (
    <Stage className="api">
      <Figure value="42" unit="ms" cap="P95 延迟 · 4 个上游" />
      <div className="stg-flow">
        <span className="stg-node is-lead">POST /v1/chat</span>
        <i className="stg-wire" />
        <span className="stg-node">200</span>
      </div>
    </Stage>
  );
}

/* ── 02 · 日程中心 ────────────────────────────────────────────────────────
   五列干净色块。块内不放字 —— 上一版把课名塞进十几像素宽的小格，
   又挤又碎，远看是一片噪点。 */
const WEEK_FILLED = [0, 2, 3, 5, 8, 9, 14, 17];
const WEEK_NOW = 9;

function StageWeekGrid() {
  return (
    <Stage className="week">
      <div className="stg-grid">
        {['一', '二', '三', '四', '五'].map((d) => <span key={d} className="stg-week-h">{d}</span>)}
        {Array.from({ length: 20 }).map((_, i) => (
          <span
            key={i}
            className={`stg-week-c${WEEK_FILLED.includes(i) ? ' is-on' : ''}${i === WEEK_NOW ? ' is-now' : ''}`}
            style={{ '--i': i }}
          />
        ))}
      </div>
      <span className="stg-cap">本周 · 8 节课</span>
    </Stage>
  );
}

/* ── 03 · AI 模型对比秀 ───────────────────────────────────────────────────
   前三名。行距放宽，分数放大到能一眼读出。 */
const MODEL_SCORES = [['GPT-4o', 94], ['Claude 3.5', 91], ['Gemini 1.5', 88]];

function StageScoreRace() {
  return (
    <Stage className="race">
      <ul className="stg-rows">
        {MODEL_SCORES.map(([name, score], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <span className="stg-bar"><i style={{ '--w': `${score}%` }} /></span>
            <em>{score}</em>
          </li>
        ))}
      </ul>
      <span className="stg-cap">同题得分 · 16 个模型</span>
    </Stage>
  );
}

/* ── 04 · 提示词库 ────────────────────────────────────────────────────────
   一条搜索 + 两张卡片，卡片只留标题。 */
function StageTypewriter() {
  return (
    <Stage className="type">
      <span className="stg-search">搜索提示词…</span>
      <ul className="stg-cards">
        <li style={{ '--i': 0 }}>周报生成器</li>
        <li style={{ '--i': 1 }}>代码审查员</li>
      </ul>
    </Stage>
  );
}

/* ── 05 · 组件图鉴 ────────────────────────────────────────────────────────
   三个干净的组件字形，放大到能看清形状（按钮 / 开关 / 标签）。 */
function StageComponentBench() {
  return (
    <Stage className="bench">
      <div className="stg-glyphs">
        <span className="stg-glyph is-btn" style={{ '--i': 0 }} />
        <span className="stg-glyph is-switch" style={{ '--i': 1 }}><i /></span>
        <span className="stg-glyph is-tag" style={{ '--i': 2 }} />
      </div>
      <span className="stg-cap">62 个组件</span>
    </Stage>
  );
}

/* ── 06 · Skill 热榜 ────────────────────────────────────────────────────── */
const REPOS = [['anthropics/skills', '12.4k'], ['modelcontextprotocol', '9.8k'], ['obra/superpowers', '7.1k']];

function StagePodium() {
  return (
    <Stage className="podium">
      <ol className="stg-rows">
        {REPOS.map(([repo, stars], i) => (
          <li key={repo} style={{ '--i': i }}>
            <i className="stg-rank">{i + 1}</i>
            <b>{repo}</b>
            <em>{stars}</em>
          </li>
        ))}
      </ol>
      <span className="stg-cap">星数排行 · 每日刷新</span>
    </Stage>
  );
}

/* ── 07 · AI Agent ────────────────────────────────────────────────────────
   三步流水线，当前步骤挂呼吸点。 */
function StageDispatch() {
  return (
    <Stage className="dispatch">
      <div className="stg-chain">
        <span className="stg-node" style={{ '--i': 0 }}>检索</span>
        <span className="stg-node" style={{ '--i': 1 }}>分析</span>
        <span className="stg-node is-live" style={{ '--i': 2 }}><i className="stg-dot" />交付</span>
      </div>
      <span className="stg-cap">整理竞品资料 · 运行中</span>
    </Stage>
  );
}

/* ── 08 · 思维导图 ──────────────────────────────────────────────────────── */
function StageRadialTree() {
  return (
    <Stage className="tree">
      <div className="stg-branch">
        <span className="stg-node is-lead">Voyra</span>
        <ul>
          {['内容', '产品', '迭代'].map((name, i) => (
            <li key={name} style={{ '--i': i }}><span className="stg-node">{name}</span></li>
          ))}
        </ul>
      </div>
      <span className="stg-cap">18 个节点</span>
    </Stage>
  );
}

/* ── 09 · 宝宝护理 ──────────────────────────────────────────────────────── */
function StageDayArc() {
  return (
    <Stage className="arc">
      <Figure value="3" unit=" 次" cap="今日记录 · 睡眠 3h20m" />
      <svg className="stg-arc-chart" viewBox="0 0 220 84" preserveAspectRatio="none" aria-hidden="true">
        <path d="M12 80 A98 80 0 0 1 208 80" className="stg-arc-track" />
        <path d="M12 80 A98 80 0 0 1 208 80" className="stg-arc-fill" />
      </svg>
    </Stage>
  );
}

/* ── 10 · 随机抽人 ────────────────────────────────────────────────────────
   只留一个名字，大到能「看见抽中」。 */
const ROSTER = ['张伟', '李娜', '王芳', '刘洋', '陈静'];

function StageSlotRoll() {
  return (
    <Stage className="slot">
      <div className="stg-roll-win">
        <ul className="stg-roll">
          {ROSTER.map((name, i) => (
            <li key={name} className={i === 2 ? 'is-hit' : undefined}>{name}</li>
          ))}
        </ul>
      </div>
      <span className="stg-cap">花名册 42 人</span>
    </Stage>
  );
}

/* ── 11 · 饮食打卡 ──────────────────────────────────────────────────────── */
function StageMealStamps() {
  return (
    <Stage className="meal">
      <div className="stg-checks">
        <span className="stg-check is-on" style={{ '--i': 0 }} />
        <span className="stg-check is-on" style={{ '--i': 1 }} />
        <span className="stg-check" style={{ '--i': 2 }} />
      </div>
      <span className="stg-bar is-wide"><i style={{ '--w': '75%' }} /></span>
      <span className="stg-cap">2 / 3 餐 · 饮水 6/8</span>
    </Stage>
  );
}

/* ── 12 · 数学建模 Skill ──────────────────────────────────────────────────
   五个圆点表示阶段：已完成实心、当前放大并呼吸、未开始空心。 */
function StagePaperBuild() {
  return (
    <Stage className="paper">
      <div className="stg-steps">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`stg-step${i === 2 ? ' is-live' : i < 2 ? ' is-done' : ''}`}
            style={{ '--i': i }}
          />
        ))}
      </div>
      <span className="stg-cap">CUMCM 工作流 · 建立模型</span>
    </Stage>
  );
}

/* ── 13 · 织流 Jacquard ─────────────────────────────────────────────────── */
function StageWeave() {
  return (
    <Stage className="weave">
      <div className="stg-chain">
        <span className="stg-node" style={{ '--i': 0 }}>输入</span>
        <span className="stg-node" style={{ '--i': 1 }}>清洗</span>
        <span className="stg-node is-live" style={{ '--i': 2 }}><i className="stg-dot" />LLM</span>
        <span className="stg-node" style={{ '--i': 3 }}>导出</span>
      </div>
      <span className="stg-cap">产物实时落盘</span>
    </Stage>
  );
}

/* ── 14 · 学习通自动签到 ────────────────────────────────────────────────── */
const COURSES_CHECK = [['高等数学', '已签到', 1], ['大学英语', '已签到', 1], ['线性代数', '监听中', 0]];

function StageAutoClick() {
  return (
    <Stage className="click">
      <ul className="stg-rows">
        {COURSES_CHECK.map(([name, note, ok], i) => (
          <li key={name} style={{ '--i': i }}>
            <b>{name}</b>
            <em className={ok ? 'is-ok' : 'is-live'}>
              {!ok ? <i className="stg-dot" /> : null}{note}
            </em>
          </li>
        ))}
      </ul>
      <span className="stg-cap">后台常驻 · 3 门课</span>
    </Stage>
  );
}

/* ── 15 · 磁盘清理助手 ──────────────────────────────────────────────────── */
const DISK = [['系统', 42], ['应用', 68], ['垃圾', 118]];

function StageDiskClean() {
  return (
    <Stage className="disk">
      <Figure value="118" unit=" GB" cap="可释放空间" />
      <ul className="stg-bars">
        {DISK.map(([name, size], i) => (
          <li key={name} style={{ '--i': i }}>
            <span className="stg-bar"><i style={{ '--w': `${Math.round((size / 118) * 82)}%` }} /></span>
          </li>
        ))}
      </ul>
    </Stage>
  );
}

/* ── 16 · 账迹 BillTrace ──────────────────────────────────────────────────
   两笔 + 合计。合计 39.80 = 24.50 + 15.30，数字自洽。 */
function StageBillDrop() {
  return (
    <Stage className="bill">
      <ul className="stg-rows">
        <li style={{ '--i': 0 }}><b>午餐</b><em>¥24.50</em></li>
        <li style={{ '--i': 1 }}><b>咖啡</b><em>¥15.30</em></li>
      </ul>
      <div className="stg-total"><span>合计</span><b>¥39.80</b></div>
    </Stage>
  );
}

/* ── 17 · Token Monitor ─────────────────────────────────────────────────── */
function StageSparkline() {
  return (
    <Stage className="spark">
      <Figure value="1.24" unit="M" cap="今日 Token · 缓存命中 68%" />
      <svg className="stg-spark-chart" viewBox="0 0 220 52" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 42 L31 34 L62 38 L93 22 L124 16 L155 24 L186 10 L220 14 L220 52 L0 52 Z" className="stg-spark-area" />
        <path d="M0 42 L31 34 L62 38 L93 22 L124 16 L155 24 L186 10 L220 14" className="stg-spark-line" />
      </svg>
    </Stage>
  );
}

/* ── 18 · 知新 Zenew ────────────────────────────────────────────────────── */
function StageFlipCard() {
  return (
    <Stage className="flip">
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
      <span className="stg-cap">今日待复习 42 张</span>
    </Stage>
  );
}

/* ── 19 · AI 轨迹 ─────────────────────────────────────────────────────────
   三个时间点，点之间用细线连成一条轨迹。 */
const TRACE = [['09:00', '会话 12'], ['14:00', '产出 8'], ['20:00', '日报']];

function StageTimeline() {
  return (
    <Stage className="timeline">
      <ul className="stg-track">
        {TRACE.map(([time, text], i) => (
          <li key={time} style={{ '--i': i }}>
            <i className="stg-dot" />
            <time>{time}</time>
            <b>{text}</b>
          </li>
        ))}
      </ul>
      <span className="stg-cap">12 个数据源 · 本机解析</span>
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
