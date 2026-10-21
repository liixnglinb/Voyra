/* ==========================================================================
   舞台组件（STAGES）· 数据驱动 + 左侧焦点小卡片 + 右侧真实明细小卡片
   --------------------------------------------------------------------------
   遵循 v5 视觉规范：
     1. 舞台原则：「一个焦点（大数字/关键词）+ 一行小注 + 干净几何」。
     2. 数据驱动：优先从 showcase-cards.js 的 card.stage 字段取值渲染，
        同时保留默认兜底数据，确保单测与独立挂载零报错。
     3. 舞台内小卡片统一挂载 .stg-mini-card 与 `--i` 错峰变量（0..N），
        左侧焦点小卡片额外挂载 .stg-focus-card 与内层 .stg-ambient-float，
        配合 stage-scenes.css 实现入场错峰、悬停微抬升与环境呼吸。
     4. 全部用 HTML 承载文字（不用 SVG 写字），所有 SVG 装饰图标显式带
        aria-hidden="true"。
   ========================================================================== */

import React from 'react';
import { Search } from 'lucide-react';
import { Browser, Window, Terminal, Inline, Term } from './product-shots';
import { CARD_BY_ID } from '../data/showcase-cards';

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
  return <div className={`stg stg--${className}`} aria-hidden="true">{children}</div>;
}

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

function Bar({ ratio, hot }) {
  return (
    <span className={`stg-bar${hot ? ' is-hot' : ''}`}>
      <i style={{ '--w': `${Math.round(ratio * 100)}%` }} />
    </span>
  );
}

function resolveStageData(id, stageProp) {
  return stageProp || CARD_BY_ID[id]?.stage || {};
}

/* ── 01 · Voyra Relay API ─────────────────────────────────────────────────
   左侧焦点小卡片（42ms 平均响应 + 路由标签）+ 右侧请求日志小卡片 */
const DEFAULT_REQUESTS = [
  ['POST', '/v1/chat', '200', '42ms'],
  ['POST', '/v1/embed', '200', '18ms'],
  ['GET', '/v1/models', '200', '6ms'],
  ['AUTO', 'claude→4o', 'OK', '切换'],
];

function StageApiHub({ stage }) {
  const s = resolveStageData('api', stage);
  const requests = s.requests || DEFAULT_REQUESTS;
  const routes = s.routes || ['/v1/chat', '/v1/embed', 'claude-opus', 'gpt-4o'];

  return (
    <Terminal title={s.title || 'voyra-relay · gateway'} badge={s.badge || '4 通道在线'}>
      <div className="stg-mini-split is-terminal">
        <div className="shot-nav stg-focus-card stg-mini-card" style={{ '--i': 0 }}>
          <div className="stg-ambient-float">
            <span className="stg-focus-kicker">{s.kicker || '延迟监控'}</span>
            <div className="stg-focus-metric">
              <b>{s.focus || '42'}</b>
              <small>{s.unit || 'ms'}</small>
            </div>
            <span className="stg-focus-note">{s.note || '平均响应 · 自动容灾'}</span>
            <div className="stg-focus-tags">
              {routes.slice(0, 2).map((r, idx) => (
                <span key={r} className={idx === 0 ? 'is-on' : undefined}>{r}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="shot-log stg-mini-list">
          {requests.map(([method, endpoint, code, latency], i) => (
            <Term key={`${method}-${endpoint}`} tone={i === 1 ? 'dim' : i === 3 ? 'prompt' : ''}>
              <div className="stg-mini-card stg-term-card" style={{ '--i': i + 1 }}>
                <span className="is-key">{method}</span>
                <b className="stg-term-path">{endpoint}</b>
                <em className="stg-term-meta">{code} · {latency}</em>
              </div>
            </Term>
          ))}
        </div>
      </div>
    </Terminal>
  );
}

/* ── 02 · 日程中心 ────────────────────────────────────────────────────────
   左侧焦点小卡片（03 节今日课程 + 周视图条）+ 右侧课程时间轴小卡片 */
const DEFAULT_WEEK_DAYS = ['一', '二', '三', '四', '五'];
const DEFAULT_DAY_EVENTS = [
  ['08:20', '高等数学', '2-3 节'],
  ['10:20', '大学英语', '3-4 节'],
  ['14:00', '物理实验', '实验楼'],
];

function StageWeekGrid({ stage }) {
  const s = resolveStageData('timetable', stage);
  const days = s.days || DEFAULT_WEEK_DAYS;
  const activeDay = s.activeDay ?? 0;
  const events = s.events || DEFAULT_DAY_EVENTS;

  return (
    <Window title={s.title || '10 月 13 日 · 星期一'} meta={s.meta || ['第 8 周', '今日 3 节']}>
      <div className="shot-cal stg-mini-split">
        <div className="shot-cal-side stg-focus-card stg-mini-card" style={{ '--i': 0 }}>
          <div className="stg-ambient-float">
            <span className="stg-focus-kicker">{s.kicker || '第 8 教学周'}</span>
            <div className="stg-focus-metric">
              <b>{s.focus || '03'}</b>
              <small>{s.unit || '节今日课程'}</small>
            </div>
            <span className="stg-focus-note">{s.note || '课程表 · 日历 · 作业'}</span>
            <div className="shot-cal-mini stg-week-strip">
              {days.map((d, idx) => (
                <span
                  key={d}
                  className={`shot-cal-day${idx === activeDay ? ' is-on' : ''}`}
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="shot-cal-main stg-mini-list">
          {events.map(([time, name, where], i) => (
            <div key={time} className="shot-cal-row stg-mini-card" style={{ '--i': i + 1 }}>
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

/* ── 03 · AI 模型对比秀 ─────────────────────────────────────────────────── */
const DEFAULT_MODEL_SCORES = [
  ['GPT-4o', 94, 3],
  ['Claude 3.5', 91, 3],
  ['Gemini 1.5', 88, -2],
  ['文心一言', 76, 4],
  ['Qwen 2.5', 72, 1],
];

function StageScoreRace({ stage }) {
  const s = resolveStageData('pelican', stage);
  const scores = s.scores || DEFAULT_MODEL_SCORES;
  const foot = s.foot || [['最高', '94'], ['均分', '84']];
  return (
    <Stage className="race">
      <Head title={s.title || '同题得分'} meta={s.meta || '16 个模型'} />
      <ul className="stg-rows is-rank">
        {scores.map(([name, score, delta], i) => (
          <li key={name} className="stg-mini-card" style={{ '--i': i }}>
            <b>{name}</b>
            <Bar ratio={score / 100} hot={i === 0} />
            <em>{score}</em>
            <span className={delta >= 0 ? 'stg-up' : 'stg-down'}>{delta >= 0 ? `+${delta}` : delta}</span>
          </li>
        ))}
      </ul>
      <Foot items={foot} />
    </Stage>
  );
}

/* ── 04 · 提示词库 ──────────────────────────────────────────────────────── */
const DEFAULT_PROMPTS = [
  ['周报生成器', '写作', '128'],
  ['代码审查员', '代码', '96'],
  ['中英互译', '翻译', '74'],
  ['会议纪要', '总结', '61'],
];

function StageTypewriter({ stage }) {
  const s = resolveStageData('prompts', stage);
  const prompts = s.prompts || DEFAULT_PROMPTS;
  const foot = s.foot || [['收录', '62 条'], ['本周新增', '5']];
  return (
    <Stage className="type">
      <span className="stg-search">{s.search || '搜索提示词…'}</span>
      <ul className="stg-rows is-prompt">
        {prompts.map(([name, tag, stars], i) => (
          <li key={name} className="stg-mini-card" style={{ '--i': i }}>
            <b>{name}</b>
            <span className="stg-chip">{tag}</span>
            <em>★{stars}</em>
          </li>
        ))}
      </ul>
      <Foot items={foot} />
    </Stage>
  );
}

/* ── 05 · 组件图鉴 ──────────────────────────────────────────────────────── */
const DEFAULT_COMPONENTS = [
  ['button', '按钮'],
  ['switch', '开关'],
  ['input', '输入框'],
  ['tag', '标签'],
  ['slider', '滑块'],
  ['check', '勾选'],
];

function StageComponentBench({ stage }) {
  const s = resolveStageData('uikit', stage);
  const components = s.components || DEFAULT_COMPONENTS;
  return (
    <Stage className="bench">
      <Head title={s.title || '组件图鉴'} meta={s.meta || '62 个'} />
      <div className="stg-bench-grid">
        {components.map(([kind, cn], i) => (
          <div key={kind} className="stg-bench-t stg-mini-card" style={{ '--i': i }}>
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

/* ── 06 · Skill 热榜 ────────────────────────────────────────────────────── */
const DEFAULT_REPOS = [
  ['anthropics/skills', '12.4k', '+328'],
  ['modelcontextprotocol', '9.8k', '+215'],
  ['obra/superpowers', '7.1k', '+180'],
  ['vercel/ai', '6.3k', '+142'],
  ['openai/openai-node', '5.2k', '+96'],
];

function StagePodium({ stage }) {
  const s = resolveStageData('skills', stage);
  const repos = s.repos || DEFAULT_REPOS;
  const foot = s.foot || [['收录', '184 个'], ['更新', '每天']];
  return (
    <Stage className="podium">
      <Head title={s.title || '星数排行'} meta={s.meta || '每日刷新'} />
      <ol className="stg-rows is-repo">
        {repos.map(([repo, stars, delta], i) => (
          <li key={repo} className={`stg-mini-card${i === 0 ? ' is-top' : ''}`} style={{ '--i': i }}>
            <i className="stg-rank">{i + 1}</i>
            <b>{repo}</b>
            <em>{stars}</em>
            <span className="stg-up">{delta}</span>
          </li>
        ))}
      </ol>
      <Foot items={foot} />
    </Stage>
  );
}

/* ── 07 · AI Agent ──────────────────────────────────────────────────────── */
const DEFAULT_AGENT_STEPS = [
  ['done', '检索', 'web_search', '2.1s'],
  ['done', '分析', 'code_interpreter', '5.4s'],
  ['run', '交付', 'writing', '进行中'],
  ['todo', '归档', '—', '待开始'],
];

function StageDispatch({ stage }) {
  const s = resolveStageData('agents', stage);
  const steps = s.steps || DEFAULT_AGENT_STEPS;
  const foot = s.foot || [['已用', '7.5s'], ['工具', '3 个']];
  return (
    <Stage className="dispatch">
      <Head live title={s.title || '整理竞品资料'} meta={s.meta || '运行中'} />
      <ul className="stg-rows is-step">
        {steps.map(([state, label, tool, note], i) => (
          <li key={label} className={`stg-mini-card is-${state}`} style={{ '--i': i }}>
            <i className="stg-mark">{state === 'done' ? '✓' : state === 'run' ? '●' : '○'}</i>
            <b>{label}</b>
            <code>{tool}</code>
            <em>{note}</em>
          </li>
        ))}
      </ul>
      <Foot items={foot} />
    </Stage>
  );
}

/* ── 08 · 思维导图 ──────────────────────────────────────────────────────── */
const DEFAULT_TREE_NODES = [['内容', 12], ['产品', 19], ['迭代', 7], ['资料', 9], ['灵感', 5]];

function StageRadialTree({ stage }) {
  const s = resolveStageData('mindmap', stage);
  const nodes = s.nodes || DEFAULT_TREE_NODES;
  const foot = s.foot || [['层级', '3 层'], ['已展开', '全部']];
  return (
    <Stage className="tree">
      <Head title={s.title || '思维导图'} meta={s.meta || '52 个节点'} />
      <div className="stg-tree-map">
        <span className="stg-node is-lead stg-mini-card" style={{ '--i': 0 }}>{s.root || 'Voyra'}</span>
        <ul>
          {nodes.map(([name, count], i) => (
            <li key={name} style={{ '--i': i + 1 }}>
              <span className="stg-node stg-mini-card">{name}</span>
              <em>{count}</em>
            </li>
          ))}
        </ul>
      </div>
      <Foot items={foot} />
    </Stage>
  );
}

/* ── 09 · 宝宝护理 ──────────────────────────────────────────────────────── */
const DEFAULT_CARE_LOG = [
  ['07:20', '配方奶 120ml'],
  ['09:40', '小睡 1h20m'],
  ['13:10', '换尿布'],
  ['15:30', '辅食 半碗'],
];

function StageDayArc({ stage }) {
  const s = resolveStageData('care', stage);
  const kpis = s.kpis || [['02', '喂养'], ['03', '睡眠'], ['01', '护理']];
  const logs = s.logs || DEFAULT_CARE_LOG;
  const foot = s.foot || [['睡眠', '3h20m'], ['距下次', '1h10m']];
  return (
    <Stage className="arc">
      <Head title={s.title || '今日护理'} meta={s.meta || '10月7日'} />
      <div className="stg-kpi3">
        {kpis.map(([val, label], i) => (
          <span key={label} className="stg-mini-card" style={{ '--i': i }}><b>{val}</b>{label}</span>
        ))}
      </div>
      <ul className="stg-rows is-log">
        {logs.map(([time, text], i) => (
          <li key={time} className="stg-mini-card" style={{ '--i': i + 3 }}>
            <time>{time}</time>
            <b>{text}</b>
          </li>
        ))}
      </ul>
      <Foot items={foot} />
    </Stage>
  );
}

/* ── 10 · 随机抽人 ──────────────────────────────────────────────────────── */
const DEFAULT_ROSTER = ['张伟', '李娜', '王芳', '刘洋', '陈静'];
const DEFAULT_PICKED = ['王芳', '张伟', '陈静'];

function StageSlotRoll({ stage }) {
  const s = resolveStageData('draw', stage);
  const roster = s.roster || DEFAULT_ROSTER;
  const picked = s.picked || DEFAULT_PICKED;
  const foot = s.foot || [['本轮', '3 / 42'], ['避免重复', '已开启']];
  return (
    <Stage className="slot">
      <Head live title={s.title || '花名册 42 人'} meta={s.meta || '已抽取 3'} />
      <div className="stg-roll-win">
        <ul className="stg-roll">
          {roster.map((name, i) => (
            <li key={name} className={i === 2 ? 'is-hit' : undefined}>{name}</li>
          ))}
        </ul>
      </div>
      <div className="stg-picked">
        {picked.map((n, i) => (
          <span key={n} className="stg-chip stg-mini-card" style={{ '--i': i }}>{n}</span>
        ))}
      </div>
      <Foot items={foot} />
    </Stage>
  );
}

/* ── 11 · 饮食打卡 ──────────────────────────────────────────────────────── */
const DEFAULT_MEALS = [
  ['on', '早餐', '07:30'],
  ['on', '午餐', '12:10'],
  ['off', '晚餐', '待打卡'],
];

function StageMealStamps({ stage }) {
  const s = resolveStageData('diet', stage);
  const meals = s.meals || DEFAULT_MEALS;
  const foot = s.foot || [['力量训练', '已完成'], ['连续', '12 天']];
  return (
    <Stage className="meal">
      <Head title={s.title || '今日打卡'} meta={s.meta || '2 / 3 餐'} />
      <ul className="stg-rows is-meal">
        {meals.map(([state, name, note], i) => (
          <li key={name} className={`stg-mini-card is-${state}`} style={{ '--i': i }}>
            <i className="stg-mark">{state === 'on' ? '✓' : '○'}</i>
            <b>{name}</b>
            <em>{note}</em>
          </li>
        ))}
      </ul>
      <div className="stg-meter">
        <span>饮水</span>
        <Bar ratio={s.waterRatio ?? 0.75} />
        <b>{s.waterText || '6/8'}</b>
      </div>
      <Foot items={foot} />
    </Stage>
  );
}

/* ── 12 · 数学建模 Skill ──────────────────────────────────────────────────
   左侧焦点小卡片（阶段 3/5 建立模型 + 流程标签）+ 右侧阶段输出小卡片 */
const DEFAULT_PAPER_LOGS = [
  ['dim', '$ cumcm --stage model'],
  ['ok', '✓ 题意分析 · 12 项约束'],
  ['ok', '✓ 模型假设 · 3 条假设'],
  ['key', '● 建立模型 · 规划求解中'],
];

function StagePaperBuild({ stage }) {
  const s = resolveStageData('mathmodel', stage);
  const stages = s.stages || ['3 建立模型', '4 求解验证', '5 论文写作'];
  const logs = s.logs || DEFAULT_PAPER_LOGS;

  return (
    <Terminal title={s.title || 'CUMCM workflow'} badge={s.badge || 'stage 3/5'}>
      <div className="stg-mini-split is-terminal">
        <div className="shot-nav stg-focus-card stg-mini-card" style={{ '--i': 0 }}>
          <div className="stg-ambient-float">
            <span className="stg-focus-kicker">{s.kicker || '国赛十阶段闭环'}</span>
            <div className="stg-focus-metric">
              <b>{s.focus || '3 / 5'}</b>
              <small>{s.unit || '建立模型'}</small>
            </div>
            <span className="stg-focus-note">{s.note || '题意 → 建模 → 论文'}</span>
            <div className="stg-focus-tags">
              {stages.slice(0, 2).map((item, idx) => (
                <span key={item} className={idx === 0 ? 'is-on' : undefined}>{item}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="shot-log stg-mini-list">
          {logs.map(([tone, text], i) => (
            <Term key={text} tone={tone === 'ok' ? '' : tone}>
              <div className="stg-mini-card stg-term-card" style={{ '--i': i + 1 }}>
                <b className="stg-term-line">{text}</b>
              </div>
            </Term>
          ))}
        </div>
      </div>
    </Terminal>
  );
}

/* ── 13 · 织流 Jacquard ─────────────────────────────────────────────────── */
const DEFAULT_PIPE = [['输入', 'done'], ['清洗', 'done'], ['LLM', 'run'], ['导出', 'run']];
const DEFAULT_WEAVE_FILES = [
  ['out/clean.jsonl', 'ok'],
  ['out/result.md', 'ok'],
  ['out/figure-01.png', 'run'],
  ['out/report.html', 'todo'],
];

function StageWeave({ stage }) {
  const s = resolveStageData('modelflow', stage);
  const pipe = s.pipe || DEFAULT_PIPE;
  const files = s.files || DEFAULT_WEAVE_FILES;
  const foot = s.foot || [['节点', '3 / 4'], ['产物', '2 / 4']];
  return (
    <Stage className="weave">
      <Head live title={s.title || '本地流水线'} meta={s.meta || '运行中'} />
      <div className="stg-pipe">
        {pipe.map(([name, state], i) => (
          <span key={name} className={`is-${state}`} style={{ '--i': i }}>
            {i > 0 ? <u /> : null}
            <b className="stg-mini-card">{name}</b>
          </span>
        ))}
      </div>
      <ul className="stg-rows is-file">
        {files.map(([f, state], i) => (
          <li key={f} className={`stg-mini-card is-${state}`} style={{ '--i': i }}>
            <i className="stg-mark">{state === 'ok' ? '✓' : state === 'run' ? '●' : '○'}</i>
            <code>{f}</code>
          </li>
        ))}
      </ul>
      <Foot items={foot} />
    </Stage>
  );
}

/* ── 14 · 学习通自动签到 ──────────────────────────────────────────────────
   左侧焦点小卡片（今日 3/5 + 后台常驻监听）+ 右侧课程签到列表小卡片 */
const DEFAULT_COURSES_CHECK = [
  ['高等数学', '08:02 · 普通', 'ok'],
  ['大学英语', '08:05 · 位置', 'ok'],
  ['线性代数', '10:20 · 扫码', 'ok'],
  ['数据结构', '后台监听中', 'run'],
];

function StageAutoClick({ stage }) {
  const s = resolveStageData('checkin', stage);
  const courses = s.courses || DEFAULT_COURSES_CHECK;

  return (
    <Window title={s.title || '学习通自动签到助手'} meta={s.meta || ['运行中', 'v3.13']}>
      <div className="shot-app stg-mini-split">
        <div className="shot-app-bar stg-focus-card stg-mini-card" style={{ '--i': 0 }}>
          <div className="stg-ambient-float">
            <span className="shot-app-live"><i />{s.kicker || '后台常驻监听'}</span>
            <div className="stg-focus-metric">
              <b>{s.focus || '3 / 5'}</b>
              <small className="shot-app-count">{s.unit || '今日已签'}</small>
            </div>
            <span className="stg-focus-note">{s.note || '普通 · 位置 · 二维码'}</span>
          </div>
        </div>
        <div className="shot-app-list stg-mini-list">
          {courses.map(([name, time, state], i) => (
            <div key={name} className={`shot-app-row stg-mini-card is-${state}`} style={{ '--i': i + 1 }}>
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
   左侧焦点小卡片（118 GB 可清理 + 回收站保护说明）+ 右侧分类扫描小卡片 */
const DEFAULT_DISK = [
  ['软件缓存', '42 GB', 'hot'],
  ['大文件项', '38 GB', ''],
  ['构建临时', '24 GB', ''],
  ['重复文件', '14 GB', ''],
];

function StageDiskClean({ stage }) {
  const s = resolveStageData('toolbox', stage);
  const items = s.items || DEFAULT_DISK;

  return (
    <Window title={s.title || '磁盘清理助手'} meta={s.meta || ['C 盘', 'v0.7.0']}>
      <div className="shot-disk stg-mini-split">
        <div className="shot-disk-head stg-focus-card stg-mini-card" style={{ '--i': 0 }}>
          <div className="stg-ambient-float">
            <span className="stg-focus-kicker">{s.kicker || '扫描完成'}</span>
            <div className="stg-focus-metric">
              <b>{s.focus || '118'}<small>{s.unit || 'GB 可清理'}</small></b>
            </div>
            <span className="stg-focus-note">{s.note || '回收站 · 75 条百科'}</span>
          </div>
        </div>
        <div className="shot-disk-list stg-mini-list">
          {items.map(([name, size, flag], i) => (
            <div
              key={name}
              className={`shot-disk-row stg-mini-card${flag === 'hot' || name === '垃圾' ? ' is-hot' : ''}`}
              style={{ '--i': i + 1 }}
            >
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
   左侧焦点小卡片（¥39.80 今日合计 + 双引擎说明）+ 右侧账单明细小卡片 */
const DEFAULT_BILLS = [
  ['午餐', '餐饮', '¥24.50'],
  ['咖啡', '餐饮', '¥15.30'],
  ['支付通知', '监听', '2s 入库'],
  ['本机账本', '隐私', '零上传'],
];

function StageBillDrop({ stage }) {
  const s = resolveStageData('billtrace', stage);
  const bills = s.bills || DEFAULT_BILLS;

  return (
    <Window title={s.title || '账迹 BillTrace'} meta={s.meta || ['10 月 13 日', '2s 入库']}>
      <div className="shot-bill stg-mini-split">
        <div className="shot-bill-total stg-focus-card stg-mini-card" style={{ '--i': 0 }}>
          <div className="stg-ambient-float">
            <span className="stg-focus-kicker">{s.kicker || '今日自动入库'}</span>
            <div className="stg-focus-metric">
              <b>{s.focus || '¥39.80'}</b>
              <small>{s.unit || '2 笔'}</small>
            </div>
            <span className="stg-focus-note">{s.note || '双引擎 · 只存本机'}</span>
          </div>
        </div>
        <div className="stg-mini-list">
          {bills.map(([shop, cat, amt], i) => (
            <div key={shop} className="shot-bill-row stg-mini-card" style={{ '--i': i + 1 }}>
              <b>{shop}</b>
              <span className="shot-bill-cat">{cat}</span>
              <em>{amt}</em>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

/* ── 17 · Token Monitor ───────────────────────────────────────────────────
   左侧焦点小卡片（1.37M 今日 Token + 缓存命中）+ 右侧 4 工具用量小卡片 */
const DEFAULT_TOKEN_TOOLS = [
  ['Claude Code', '620k'],
  ['Codex', '410k'],
  ['WorkBuddy', '210k'],
  ['DeepSeek', '130k'],
];

function StageSparkline({ stage }) {
  const s = resolveStageData('token', stage);
  const tools = s.tools || DEFAULT_TOKEN_TOOLS;

  return (
    <Window title={s.title || 'Token Monitor'} meta={s.meta || ['本机', '今日']}>
      <div className="shot-token stg-mini-split">
        <div className="shot-token-head stg-focus-card stg-mini-card" style={{ '--i': 0 }}>
          <div className="stg-ambient-float">
            <span className="stg-focus-kicker">{s.kicker || '今日 Token'}</span>
            <div className="stg-focus-metric">
              <b>{s.focus || '1.37'}<small>{s.unit || 'M'}</small></b>
            </div>
            <span className="stg-focus-note">{s.note || '缓存 68% · 本地计价'}</span>
          </div>
        </div>
        <div className="shot-token-list stg-mini-list">
          {tools.map(([name, val], i) => (
            <div key={name} className="shot-token-row stg-mini-card" style={{ '--i': i + 1 }}>
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

/* ── 18 · 知新 Zenew ────────────────────────────────────────────────────── */
function StageFlipCard({ stage }) {
  const s = resolveStageData('zenew', stage);
  return (
    <Inline>
      <div className="shot-word stg-mini-card" style={{ '--i': 0 }}>
        <span className="shot-word-term">{s.term || 'abandon'}</span>
        <span className="shot-word-phonetic">{s.phonetic || '/əˈbændən/'}</span>
        <span className="shot-word-mean">{s.mean || '放弃；抛弃'}</span>
      </div>
      <span className="Inline-line" />
      <div className="shot-word-meta stg-mini-card" style={{ '--i': 1 }}>
        <span>{s.metaLabel || '今日待复习'}</span>
        <b>{s.metaValue || '42'}</b>
      </div>
    </Inline>
  );
}

/* ── 19 · AI 轨迹 ─────────────────────────────────────────────────────────
   左侧焦点小卡片（会话 12 + 12 个数据源）+ 右侧时间轴记录小卡片 */
const DEFAULT_TRACE = [
  ['08:30', '会话 4 · Claude'],
  ['11:00', '产出 3 · 代码提交'],
  ['14:00', '产出 8 · Codex'],
  ['17:30', '会话 12 · 日报'],
];

function StageTimeline({ stage }) {
  const s = resolveStageData('chronicle', stage);
  const trace = s.trace || DEFAULT_TRACE;

  return (
    <Window title={s.title || 'AI 轨迹'} meta={s.meta || ['10 月 13 日', '12 源']}>
      <div className="shot-trace stg-mini-split">
        <div className="stg-focus-card stg-mini-card" style={{ '--i': 0 }}>
          <div className="stg-ambient-float">
            <span className="stg-focus-kicker">{s.kicker || '本机工作观测'}</span>
            <div className="stg-focus-metric">
              <b>{s.focus || '会话 12'}</b>
              <small>{s.unit || '今日汇总'}</small>
            </div>
            <span className="stg-focus-note">{s.note || '12 个数据源 · 每日日报'}</span>
          </div>
        </div>
        <div className="stg-mini-list">
          {trace.map(([time, text], i) => (
            <div key={time} className="shot-trace-row stg-mini-card" style={{ '--i': i + 1 }}>
              <em>{time}</em>
              <i className={`shot-trace-dot${i === trace.length - 1 ? ' is-last' : ''}`} />
              <b>{text}</b>
            </div>
          ))}
        </div>
      </div>
    </Window>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   20 · VoyraAI 官方商城（voyra.men）
   左侧焦点小卡片（18 件在售 + 自动发卡说明）+ 右侧 2×2 商品小卡片
   ══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_MALL_ITEMS = [
  ['ChatGPT', '¥139', 'openai'],
  ['Gemini', '18月 ¥7', 'googlegemini'],
  ['X 会员', '¥22 起', 'x'],
  ['多邻国', '¥9.9/年', 'duolingo'],
];

function StageVoyraMall({ stage }) {
  const s = resolveStageData('voyraai-mall', stage);
  const items = s.items || DEFAULT_MALL_ITEMS;

  return (
    <Browser url={s.url || 'voyra.men'} title={s.title || 'VoyraAI · 数字商品自动发卡'}>
      <div className="shot-mall stg-mini-split">
        <div className="stg-focus-card stg-mini-card" style={{ '--i': 0 }}>
          <div className="stg-ambient-float">
            <div className="shot-mall-search">
              <Search size={11} strokeWidth={2} aria-hidden="true" />
              <span>{s.searchPlaceholder || '搜索订阅…'}</span>
            </div>
            <div className="stg-focus-metric">
              <b>{s.focus || '18'}</b>
              <small>{s.unit || '件在售'}</small>
            </div>
            <div className="shot-mall-status">
              <i /> {s.status || '自动发货 · 凭单号查'}
            </div>
          </div>
        </div>
        <div className="shot-mall-grid">
          {items.map(([name, price, slug], i) => (
            <div key={name} className="shot-goods stg-mini-card" style={{ '--i': i + 1 }}>
              <BrandLogo slug={slug} size={13} />
              <b>{name}</b>
              <em>{price}</em>
            </div>
          ))}
        </div>
      </div>
    </Browser>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   21 · VoyraAI 推荐通道（gptibo.com/r/719F2E）
   ══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_REF_CATS = [
  ['AI 订阅', 'ChatGPT · Gemini', 'openai'],
  ['语言学习', 'Duolingo 年卡', 'duolingo'],
  ['邮箱账号', '美区 Gmail', 'gmail'],
  ['工具服务', 'Claude 会员', 'anthropic'],
];

function StageVoyraRef({ stage }) {
  const s = resolveStageData('voyraai-ref', stage);
  const cats = s.categories || DEFAULT_REF_CATS;

  return (
    <Browser url={s.url || 'gptibo.com/r/719F2E'} title={s.title || 'Voyra · 推荐通道'}>
      <div className="shot-mall is-ref">
        <div className="shot-ref-banner stg-mini-card" style={{ '--i': 0 }}>
          <span>{s.codeLabel || '推荐码'}</span>
          <b>{s.code || '719F2E'}</b>
        </div>
        <div className="shot-mall-grid">
          {cats.map(([name, sub, slug], i) => (
            <div key={name} className="shot-goods stg-mini-card" style={{ '--i': i + 1 }}>
              <BrandLogo slug={slug} size={13} />
              <b>{name}</b>
              <em>{sub}</em>
            </div>
          ))}
        </div>
        <div className="shot-mall-status">
          <i /> {s.status || '邮件交付 · 卡密保留 7 天'}
        </div>
      </div>
    </Browser>
  );
}

/* ── 04 · 血压记录（2026-10-19） ───────────────────────────────────────────
   左侧焦点小卡片（118/76 mmHg + 心率 72 bpm + 脉压差 42）+ 右侧近期记录小卡片 */
const DEFAULT_BP_ROWS = [
  ['08:00', '118/76', 72, '晨起'],
  ['21:30', '121/78', 75, '晚间'],
  ['08:15', '115/74', 68, '晨起'],
];

function StageBpLog({ stage }) {
  const s = resolveStageData('health', stage);
  const rows = s.rows || DEFAULT_BP_ROWS;

  return (
    <Window title={s.title || '血压记录'} meta={s.meta || ['10月19日 · 血压监测', '达标 7/7']}>
      <div className="bp-body stg-mini-split">
        <div className="bp-latest stg-focus-card stg-mini-card" style={{ '--i': 0 }}>
          <div className="stg-ambient-float">
            <span className="bp-cap">{s.kicker || '今日测量 · 理想'}</span>
            <b className="bp-bp">{s.focus || '118/76'} <small>{s.unit || 'mmHg'}</small></b>
            <span className="bp-hr">{s.hr || '♥ 72 bpm'}</span>
            <span className="bp-pp">{s.pp || '脉压差 42 mmHg'}</span>
          </div>
        </div>
        <div className="bp-rows stg-mini-list">
          {rows.map(([t, bp, hr, tag], i) => (
            <div className="bp-row stg-mini-card" key={t} style={{ '--i': i + 1 }}>
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