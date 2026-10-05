/* 19 个独立舞台 —— 每张卡一出独有的迷你演示
   方法论：oiloil 的 stage-demo（场景化叙事、单周期家族、视口门控暂停）
   x taste-skill（无外发光、只动 transform/opacity/stroke、数据有机、
   构图差异化代替颜色差异化）。共享类前缀 sg-。 */

/* 01 API 网关 —— 请求进枢纽，响应沿三条线路依次发出 */
function StageApiHub() {
  return (
    <div className="sg sg-api">
      <span className="sg-api-hub" aria-hidden="true"><i /></span>
      <svg className="sg-api-net" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="30" x2="100" y2="8" className="sg-api-wire" style={{ '--i': 0 }} />
        <line x1="0" y1="30" x2="100" y2="30" className="sg-api-wire" style={{ '--i': 1 }} />
        <line x1="0" y1="30" x2="100" y2="52" className="sg-api-wire" style={{ '--i': 2 }} />
      </svg>
      <ul className="sg-api-ends">
        {['GPT-5.6', 'Claude 4.5', '本地 LLM'].map(function (n, i) {
          return <li key={n} style={{ '--i': i }}>{n}</li>;
        })}
      </ul>
    </div>
  );
}

/* 02 日程中心 —— 周课表网格，"现在"指针扫过时课程块依次点亮 */
function StageWeekGrid() {
  const filled = [0, 2, 3, 5, 6, 8, 11, 13];
  return (
    <div className="sg sg-week">
      <div className="sg-week-grid">
        {Array.from({ length: 15 }).map(function (_, i) {
          return <span key={i} className={filled.indexOf(i) >= 0 ? 'is-on' : ''} style={{ '--i': i }} />;
        })}
      </div>
      <span className="sg-week-now" aria-hidden="true" />
    </div>
  );
}

/* 03 模型对比秀 —— 同题得分条形赛跑 */
function StageScoreRace() {
  const rows = [['DeepSeek-V4 Pro', 92], ['GPT-5.6', 78], ['GLM-5.3 Flash', 61], ['Qwen 3 Max', 44]];
  return (
    <div className="sg sg-race">
      {rows.map(function (r, i) {
        return (
          <div className="sg-race-row" key={r[0]} style={{ '--i': i, '--w': r[1] + '%' }}>
            <span className="sg-race-name">{r[0]}</span>
            <span className="sg-race-bar"><i /></span>
            <span className="sg-race-val">{r[1]}</span>
          </div>
        );
      })}
    </div>
  );
}

/* 04 提示词库 —— 提示词被逐字敲出，标签随后盖章弹出 */
function StageTypewriter() {
  return (
    <div className="sg sg-type">
      <div className="sg-type-box">
        <span className="sg-type-text">把这份周报压缩成三句话</span>
        <span className="sg-type-caret" aria-hidden="true" />
      </div>
      <div className="sg-type-tags">
        <i style={{ '--i': 0 }}>摘要</i>
        <i style={{ '--i': 1 }}>中文</i>
        <i style={{ '--i': 2 }}>直出</i>
      </div>
    </div>
  );
}

/* 05 组件图鉴 —— 迷你组件工作台：开关/复选/滑杆/按钮各自循环演示 */
function StageComponentBench() {
  return (
    <div className="sg sg-bench">
      <span className="sg-bench-toggle"><i /></span>
      <span className="sg-bench-check"><i>✓</i></span>
      <span className="sg-bench-slider"><i /></span>
      <span className="sg-bench-btn">按钮</span>
    </div>
  );
}

/* 06 Skill 热榜 —— 领奖台：三根柱子升起，冠军星标轻轻跳动 */
function StagePodium() {
  return (
    <div className="sg sg-podium">
      {[['2', 54], ['1', 88], ['3', 38]].map(function (p) {
        return (
          <div className="sg-podium-col" key={p[0]} style={{ '--h': p[1] + '%' }}>
            <i className="sg-podium-bar" />
            <b className="sg-podium-rank">{p[0]}</b>
          </div>
        );
      })}
      <span className="sg-podium-star" aria-hidden="true">★</span>
    </div>
  );
}

/* 07 AI Agent —— 主控把任务芯片派发给三个执行者，逐个验收 */
function StageDispatch() {
  return (
    <div className="sg sg-dispatch">
      <span className="sg-dispatch-hub">主控</span>
      <div className="sg-dispatch-lanes">
        {['检索', '改写', '校验'].map(function (n, i) {
          return (
            <div className="sg-dispatch-lane" key={n} style={{ '--i': i }}>
              <i className="sg-dispatch-chip" data-eph />
              <span className="sg-dispatch-node">{n}</span>
              <b className="sg-dispatch-ok" data-eph>✓</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* 08 思维导图 —— 中心主题向三支发散，枝条生长、叶点冒出 */
function StageRadialTree() {
  return (
    <div className="sg sg-tree">
      <svg viewBox="0 0 120 70" aria-hidden="true">
        <path d="M60 35 C40 35 30 18 14 14" className="sg-tree-branch" style={{ '--i': 0 }} />
        <path d="M60 35 C42 35 34 52 16 58" className="sg-tree-branch" style={{ '--i': 1 }} />
        <path d="M60 35 C80 35 92 35 106 35" className="sg-tree-branch" style={{ '--i': 2 }} />
      </svg>
      <span className="sg-tree-core">主题</span>
      <i className="sg-tree-leaf" style={{ '--i': 0, left: '9%', top: '12%' }} />
      <i className="sg-tree-leaf" style={{ '--i': 1, left: '10%', top: '80%' }} />
      <i className="sg-tree-leaf" style={{ '--i': 2, left: '88%', top: '46%' }} />
    </div>
  );
}

/* 09 宝宝护理 —— 今日睡眠弧线充能 + 喂养记录逐条浮现 */
function StageDayArc() {
  return (
    <div className="sg sg-arc">
      <svg viewBox="0 0 80 46" aria-hidden="true">
        <path d="M8 42 A34 34 0 0 1 72 42" className="sg-arc-track" />
        <path d="M8 42 A34 34 0 0 1 72 42" className="sg-arc-fill" />
      </svg>
      <ul className="sg-arc-list">
        <li style={{ '--i': 0 }}><b>喂养</b><span>5 次 · 620ml</span></li>
        <li style={{ '--i': 1 }}><b>体温</b><span>36.5℃</span></li>
      </ul>
    </div>
  );
}

/* 10 随机抽人 —— 名条滚动两轮后停在一位同学上 */
function StageSlotRoll() {
  const names = ['陈嘉禾', '林一诺', '王沐阳', '苏晚晴'];
  const strip = names.concat(names).concat([names[1]]);
  return (
    <div className="sg sg-slot">
      <div className="sg-slot-window">
        <div className="sg-slot-strip">
          {strip.map(function (n, i) {
            return <span key={i} className={i === strip.length - 1 ? 'is-hit' : ''}>{n}</span>;
          })}
        </div>
      </div>
      <span className="sg-slot-cursor" aria-hidden="true" />
    </div>
  );
}

/* 11 饮食打卡 —— 三餐图章依次盖下，饮水条随后充能 */
function StageMealStamps() {
  return (
    <div className="sg sg-meal">
      <div className="sg-meal-row">
        {['早餐', '午餐', '晚餐'].map(function (n, i) {
          return (
            <span className="sg-meal-tile" key={n} style={{ '--i': i }}>
              {n}
              <b className="sg-meal-stamp" data-eph>✓</b>
            </span>
          );
        })}
      </div>
      <span className="sg-meal-water"><i /></span>
    </div>
  );
}

/* 12 数学建模 —— 论文骨架从题意到成稿逐节搭起来 */
function StagePaperBuild() {
  const secs = [['题意', 46], ['建模', 72], ['求解', 58], ['论文', 84]];
  return (
    <div className="sg sg-paper">
      {secs.map(function (s, i) {
        return (
          <div className="sg-paper-sec" key={s[0]} style={{ '--i': i, '--w': s[1] + '%' }}>
            <b>{s[0]}</b>
            <i />
          </div>
        );
      })}
    </div>
  );
}

/* 13 织流 —— 一根纱线沿流水线迂回穿行，节点线轴依次点亮 */
function StageWeave() {
  return (
    <div className="sg sg-weave">
      <svg viewBox="0 0 120 64" aria-hidden="true">
        <path d="M8 14 H46 Q56 14 56 24 V40 Q56 50 66 50 H104" className="sg-weave-thread" />
      </svg>
      <i className="sg-weave-spool" style={{ left: '2%', top: '10%' }} />
      <i className="sg-weave-spool" style={{ left: '34%', top: '10%' }} />
      <i className="sg-weave-spool" style={{ left: '34%', top: '72%' }} />
      <i className="sg-weave-spool" style={{ left: '86%', top: '72%' }} />
    </div>
  );
}

/* 14 学习通签到 —— 光标自动移到签到钮上，按下，回执盖章 */
function StageAutoClick() {
  return (
    <div className="sg sg-click">
      <span className="sg-click-btn">签到</span>
      <b className="sg-click-ok" data-eph>已签到</b>
      <i className="sg-click-cursor" data-eph aria-hidden="true" />
    </div>
  );
}

/* 15 磁盘清理 —— 存储条里"垃圾"段被清走，释放量浮现 */
function StageJunkShrink() {
  return (
    <div className="sg sg-disk">
      <div className="sg-disk-bar">
        <i className="sg-disk-seg sys" />
        <i className="sg-disk-seg app" />
        <i className="sg-disk-seg junk" data-eph />
      </div>
      <div className="sg-disk-meta">
        <span>系统</span><span>应用</span><b className="sg-disk-free" data-eph>已释放 4.6 GB</b>
      </div>
    </div>
  );
}

/* 16 账迹 —— 支付通知横幅落下，落账成行，金额对齐 */
function StageBannerDrop() {
  return (
    <div className="sg sg-bill">
      <div className="sg-bill-banner" data-eph style={{ '--i': 0 }}>
        <b>美团外卖</b><span>−¥35.80</span>
      </div>
      <div className="sg-bill-banner" data-eph style={{ '--i': 1 }}>
        <b>地铁出行</b><span>−¥4.00</span>
      </div>
      <div className="sg-bill-sum">
        <span>本批自动入账</span><b>−¥39.80</b>
      </div>
    </div>
  );
}

/* 17 Token Monitor —— 用量折线自我绘制，端点游标沿线走完 */
function StageSparkline() {
  return (
    <div className="sg sg-spark">
      <svg viewBox="0 0 120 54" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="0,44 20,38 40,40 60,26 80,20 100,24 120,8" className="sg-spark-line" />
      </svg>
      <i className="sg-spark-dot" data-eph aria-hidden="true" />
      <span className="sg-spark-val">128.4k</span>
    </div>
  );
}

/* 18 知新 —— 单词卡翻转出释义，四个选项中正确项亮起 */
function StageFlipCard() {
  return (
    <div className="sg sg-flip">
      <div className="sg-flip-card">
        <span className="sg-flip-front">resilient</span>
        <span className="sg-flip-back">adj. 有韧性的</span>
      </div>
      <div className="sg-flip-opts">
        {['A', 'B', 'C', 'D'].map(function (o, i) {
          return <i key={o} style={{ '--i': i }} className={i === 1 ? 'is-right' : ''}>{o}</i>;
        })}
      </div>
    </div>
  );
}

/* 19 AI 轨迹 —— 一天的会话沿时间轴逐个落点 */
function StageTimeline() {
  return (
    <div className="sg sg-tl">
      <span className="sg-tl-line"><i /></span>
      {[0, 1, 2, 3, 4].map(function (i) {
        return <i key={i} className="sg-tl-dot" style={{ '--i': i, left: 6 + i * 22 + '%' }} data-eph />;
      })}
      <span className="sg-tl-count"><b>37</b> 场会话 · 今日</span>
    </div>
  );
}

export const STAGES = {
  'api-hub': StageApiHub,
  'week-grid': StageWeekGrid,
  'score-race': StageScoreRace,
  'typewriter': StageTypewriter,
  'component-bench': StageComponentBench,
  'podium': StagePodium,
  'dispatch': StageDispatch,
  'radial-tree': StageRadialTree,
  'day-arc': StageDayArc,
  'slot-roll': StageSlotRoll,
  'meal-stamps': StageMealStamps,
  'paper-build': StagePaperBuild,
  'weave': StageWeave,
  'auto-click': StageAutoClick,
  'junk-shrink': StageJunkShrink,
  'banner-drop': StageBannerDrop,
  'sparkline': StageSparkline,
  'flip-card': StageFlipCard,
  'timeline': StageTimeline,
};