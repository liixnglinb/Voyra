import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Scale, Droplets, Footprints, Dumbbell, ShieldCheck, CheckCircle2, MinusCircle,
  XCircle, ClipboardCheck, TrendingUp, CalendarDays, Info, Flame, Target, Wheat,
  Sunrise, CloudSun, Moon, Check, UserRound, Trophy, MessageSquareHeart, LogIn,
} from 'lucide-react';
import { useAuth } from '../components/AuthGate';

/* ================================================================
   饮食打卡 · Diet Check-in v4 —— 「鼠尾草矿物翡翠」视觉体系
   设计基调：浅色环境光 + 白卡微拟物；杜绝大面积深色块与高饱和红绿灯。
   多用户登录隔离（AuthGate + Bmob per-uid）· 每日打卡
   坚持：连续全勤 / 累计打卡 / 最高纪录 / 里程碑徽章（香槟金）
   反馈：今日寄语 + 打卡评语 + 本周数据反馈引擎（节奏/注意/趋势三联）
   逻辑层（存储结构 / 连续计算 / 反馈规则）与 v3 完全一致，仅升级表现层。
   ================================================================ */

const LS_KEY = 'diet-checkin';

/* ---------- 主题：鼠尾草矿物翡翠（Sage & Mineral Emerald） ---------- */
const C = {
  page: '#F5F8F6', card: '#FFFFFF', ink: '#132219', text2: '#546B5F', text4: '#8FA498',
  line: 'rgba(16,78,48,.10)', green: '#0D8253', greenDeep: '#08613C', greenSoft: '#E8F6EE',
  gold: '#B8860B', goldSoft: '#FEF9EC', warn: '#C27803', warnSoft: '#FFFBEB',
  bad: '#D94841', badSoft: '#FEF2F2', dot: '#7FAF9B',
};

const MEALS = [
  { key: 'breakfast', label: '早餐', Icon: Sunrise },
  { key: 'lunch', label: '午餐', Icon: CloudSun },
  { key: 'dinner', label: '晚餐', Icon: Moon },
];
/* 文案去审判化：「破戒」→「放纵餐」（数据键 junk 保持不变，兼容旧记录） */
const MEAL_STATES = [
  { key: 'ok', label: '按方案', Icon: CheckCircle2 },
  { key: 'off', label: '小偏差', Icon: MinusCircle },
  { key: 'bad', label: '放纵餐', Icon: XCircle },
];

const PROFILE = {
  startWeight: 94, goal1: 87, goal2: 80,
  startDate: '2026-09-27', kcal: 2000, maxStreak: 0,
};

/* ---------- 鼓励语池（文案与「放纵餐」口径一致） ---------- */
const ENC = {
  full: [
    '今天 5/5 全勾——身体已经记下这一分。',
    '全勤日 +1。反弹最怕的，就是这种日子。',
    '稳稳的一天。不需要奇迹，需要重复。',
    '执行到位。趋势线会替你说话。',
  ],
  partial: [
    '做了 3/5 也比 0/5 强，明天补齐就好。',
    '今天的坚持不会白费，趋势会记住。',
    '节奏没乱，你就还在牌桌上。',
    '完成度一般？没关系——回正从下一顿开始。',
  ],
  junk: [
    '放纵餐一顿不至于报废一周，下一顿回正就行。',
    '你把它记下来了，这本身就是控制。别自责。',
    '聚餐不是失败，是方案的一部分。继续。',
  ],
  first: [
    '第一次打卡——从今天起，数据替你做主。',
  ],
  milestones: {
    3: '三天，习惯开始生根了。',
    7: '连续一周全勤——你已经跑赢了大多数开始过的人。',
    14: '两周。身体开始适应新的节奏，胃口在变安静。',
    21: '三周，习惯成型期。现在的克制越来越省力了。',
    30: '一个月。这已经不是坚持，是生活方式。',
    60: '两个月。你跟一个月前的自己已经不是同一个人。',
    100: '一百天。这件事你做到了大多数人做不到的程度。',
  },
};

const pickFrom = (arr, seed) => arr[Math.abs(seed) % arr.length];
const seedOf = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };

const MILESTONES = [3, 7, 14, 21, 30, 60, 100];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const emptyDay = () => ({
  weight: '', bpSys: '', bpDia: '',
  breakfast: '', lunch: '', dinner: '',
  water: false, steps: false, training: false, junk: false, note: '',
});
const dayScore = (d) => {
  if (!d) return 0;
  const meals = ['breakfast', 'lunch', 'dinner'].filter((k) => d[k] === 'ok').length;
  let s = (meals / 3) * 50;
  if (d.water) s += 15;
  if (d.steps) s += 15;
  if (!d.junk) s += 20;
  return Math.round(s);
};
const dayComplete = (d) => !!d && ['breakfast', 'lunch', 'dinner'].every((k) => d[k] === 'ok')
  && d.water && d.steps && !d.junk;

/* 数字滚动：从上一值轻柔过渡到新值（尊重 prefers-reduced-motion） */
function useCountUp(target, dur = 450) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    if (reduce || from === target || from == null || target == null) {
      fromRef.current = target;
      setVal(target);
      return undefined;
    }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round((from + (target - from) * eased) * 10) / 10);
      if (p < 1) raf = requestAnimationFrame(tick);
      else { fromRef.current = target; setVal(target); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return val;
}

export default function DietCheckin() {
  const { guard, authed, username, openLogin } = useAuth();
  const [tab, setTab] = useState('today');
  /* 历史页当前展开的日期（null = 全部收起）。放这里而非 HistoryPane 内部，
     是为了让「载入此日」能直接 setTab('today') + setDate(k) 跳回打卡页。 */
  const [openHist, setOpenHist] = useState(null);
  /* 方案页编辑草稿。刻意与 profile 分离：直接改 profile 会让用户每敲一个数字
     就触发一次 persistAll（落盘 + 可能的云同步），输入 "187" 中途的 "1" 也会被存。 */
  const [kcalDraft, setKcalDraft] = useState('');
  const [goalDraft, setGoalDraft] = useState('');
  const [days, setDays] = useState({});
  const [profile, setProfile] = useState({ ...PROFILE });
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const dataRef = useRef({ version: 1, profile: { ...PROFILE }, days: {} });

  /* 软键盘避让：体重 / 血压 / 备注三类输入在 375px 下都位于页面下半部，
     键盘弹起后会被遮住、看不到自己刚敲的值。聚焦时把该控件滚到可视区中部。
     用捕获阶段的 focusin 统一处理，避免给每个 input 挂 onFocus。 */
  useEffect(() => {
    const onFocusIn = (e) => {
      const el = e.target;
      if (!el || !/^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      /* 延后一帧：等浏览器完成键盘动画与视口收缩再算位置，否则滚不到位 */
      requestAnimationFrame(() => {
        try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (err) { /* 老浏览器忽略 */ }
      });
    };
    document.addEventListener('focusin', onFocusIn, true);
    return () => document.removeEventListener('focusin', onFocusIn, true);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 1700);
  }, []);

  useEffect(() => {
    window.electronAPI?.loadData(LS_KEY)
      .then((M) => {
        if (M && typeof M === 'object') {
          const next = {
            version: 1,
            profile: { ...PROFILE, ...(M.profile || {}) },
            days: (M.days && typeof M.days === 'object') ? M.days : {},
          };
          dataRef.current = next;
          setDays(next.days);
          setProfile(next.profile);
        }
      })
      .catch((e) => console.warn('load diet-checkin failed:', e))
      .finally(() => setLoaded(true));
  }, []);

  const persistAll = useCallback((nextDays, nextProfile) => {
    if (!guard()) return;
    const next = { ...dataRef.current, days: nextDays, profile: nextProfile };
    dataRef.current = next;
    setDays(nextDays);
    setProfile(nextProfile);
    window.electronAPI?.saveData(LS_KEY, next);
  }, [guard]);

  const patchDay = (patch) => {
    const d = days[date] || emptyDay();
    persistAll({ ...days, [date]: { ...d, ...patch } }, profile);
  };

  /* v6：阶段目标与热量上限此前是写死的 PROFILE 常量，页面只读。
     用户实际会变（换档、减脂平台期调整、医生改了目标），却无处可改。
     这里开放 goal1 / kcal 两项就地编辑，走与 patchDay 相同的 persistAll 落盘链路
     （本地 localStorage / electronAPI，登录后随 Bmob 同步）。 */
  const patchProfile = (patch) => {
    persistAll(days, { ...profile, ...patch });
    showToast('方案已更新');
  };

  /* 方案保存：空值与越界都在这里挡掉，不让脏数据落盘。
     下限 1900 是方案里写明的安全线；阶段目标必须高于起始体重，
     否则趋势图的目标线会落到 y 轴可视区外、看起来像消失。 */
  const savePlan = () => {
    const kcal = parseInt(kcalDraft, 10);
    const goal = parseFloat(goalDraft);
    if (!Number.isFinite(kcal) || kcal < 1900) { showToast('热量不能低于 1900 kcal'); return; }
    if (!Number.isFinite(goal) || goal <= profile.startWeight) { showToast('阶段目标需高于起始体重'); return; }
    patchProfile({ kcal, goal1: Math.round(goal * 10) / 10 });
    setKcalDraft(''); setGoalDraft('');
  };

  const cur = days[date] || emptyDay();

  const sortedDates = useMemo(
    () => Object.keys(days).filter((d) => days[d] && (days[d].weight || dayScore(days[d]) > 0)).sort(),
    [days],
  );
  const totalDays = sortedDates.length;
  const weights = useMemo(
    () => sortedDates.filter((d) => days[d].weight).map((d) => ({ date: d, v: parseFloat(days[d].weight) })),
    [days, sortedDates],
  );
  const latestW = weights.length ? weights[weights.length - 1].v : null;
  const lastW = weights.length >= 2 ? weights[weights.length - 2].v : null;
  const ma7 = useMemo(() => {
    if (weights.length < 3) return null;
    const tail = weights.slice(-7);
    return Math.round((tail.reduce((a, b) => a + b.v, 0) / tail.length) * 10) / 10;
  }, [weights]);

  const streak = useMemo(() => {
    let n = 0;
    const d = new Date();
    if (!dayComplete(days[todayStr()])) d.setDate(d.getDate() - 1);
    for (;;) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dayComplete(days[k])) { n += 1; d.setDate(d.getDate() - 1); } else break;
    }
    return n;
  }, [days]);

  /* 最高纪录持久化 */
  useEffect(() => {
    if (streak > (profile.maxStreak || 0)) {
      persistAll(days, { ...profile, maxStreak: streak });
    }
  }, [streak]); // eslint-disable-line react-hooks/exhaustive-deps

  const rate7 = useMemo(() => {
    const out = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (days[k]) out.push(dayScore(days[k]));
      d.setDate(d.getDate() - 1);
    }
    return out.length ? Math.round(out.reduce((a, b) => a + b, 0) / out.length) : 0;
  }, [days]);

  /* 本周反馈引擎（规则版）——输出三联结构：节奏 pace / 注意 watch / 趋势 trend */
  const weeklyFeedback = useMemo(() => {
    const pace = [];
    const watch = [];
    const trend = [];
    const week = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      week.push(days[k] || null);
      d.setDate(d.getDate() - 1);
    }
    const recDays = week.filter(Boolean).length;
    const waterMiss = week.filter((x) => x && !x.water).length;
    const stepsMiss = week.filter((x) => x && !x.steps).length;
    const trainingCount = week.filter((x) => x && x.training).length;
    const junkDays = week.filter((x) => x && x.junk).length;
    const wRecs = week.filter((x) => x && x.weight).map((x) => parseFloat(x.weight));

    if (recDays === 0) {
      pace.push('这周还没有打卡记录——不追求完美，先连续记 3 天。');
      return [...pace, ...watch, ...trend].map((text) => ({ k: 'pace', text }));
    }
    if (rate7 >= 90) pace.push(`执行极稳：完成率 ${rate7}%，这正是维持期需要的系统。`);
    else if (rate7 >= 70) pace.push(`节奏在线：完成率 ${rate7}%，保持这个手感。`);
    else pace.push(`完成率 ${rate7}%——先恢复「每天称重 + 三餐」两个锚点，节奏会自己回来。`);

    if (waterMiss >= 3) watch.push(`喝水未达标 ${waterMiss} 天——把水杯放桌上，饭后一杯最省力。`);
    if (stepsMiss >= 3) watch.push(`步数不足 ${stepsMiss} 天——晚餐后散步 15 分钟是最容易补的缺口。`);
    if (trainingCount < 2) watch.push(`力量训练 ${trainingCount} 次（目标 4 次）——保肌肉靠它，给训练一个固定时间。`);
    if (junkDays >= 2) watch.push(`放纵餐 ${junkDays} 天——别自责，把触发场景写进备注，下次提前绕开。`);

    if (wRecs.length >= 2) {
      const delta = Math.round((wRecs[wRecs.length - 1] - wRecs[0]) * 10) / 10;
      if (delta <= -0.5) trend.push(`周均线下行 ${Math.abs(delta)}kg——速率健康，继续。`);
      else if (delta >= 1) trend.push(`周均线上行 ${delta}kg——先查记录误差与钠（汤/蘸料），再谈脂肪。`);
      else if (recDays >= 5) trend.push('体重基本持平——看 7 日均线；若连续 2-4 周不动，再按平台期流程处理。');
    }
    return [
      ...pace.map((text) => ({ k: 'pace', text })),
      ...watch.map((text) => ({ k: 'watch', text })),
      ...trend.map((text) => ({ k: 'trend', text })),
    ].slice(0, 5);
  }, [days, rate7]);

  /* 今日寄语 */
  const motto = useMemo(() => {
    const t = days[todayStr()];
    const seed = seedOf(todayStr());
    if (!t || dayScore(t) === 0) {
      const h = new Date().getHours();
      if (h < 11) return '晨起称重了吗？今天的第一步是站上体重秤。';
      if (h < 15) return '午餐按「一荤两素一拳饭」走，下午就不容易崩。';
      return '还没打卡？把今天记下来，哪怕只记体重。';
    }
    if (dayComplete(t)) {
      if (streak > 0 && MILESTONES.includes(streak)) return ENC.milestones[streak];
      return pickFrom(ENC.full, seed);
    }
    if (t.junk) return pickFrom(ENC.junk, seed);
    return pickFrom(ENC.partial, seed);
  }, [days, streak]);

  const savedToast = useMemo(() => {
    const t = days[todayStr()];
    if (t && dayComplete(t)) return pickFrom(ENC.full, seedOf('save' + todayStr()));
    if (t && t.junk) return '已保存。放纵餐一顿不致命，下一顿回正。';
    return '已保存';
  }, [days]);

  const doneCount = ['breakfast', 'lunch', 'dinner'].filter((k) => cur[k] === 'ok').length
    + (cur.water ? 1 : 0) + (cur.steps ? 1 : 0);
  const allDone = doneCount >= 5;
  /* 今日得分（0-100）：直接复用 dayScore(cur) 而非另立一套算法。
     v5 之前这里曾写成「三餐各 20 分」的独立口径，会与历史列表、热力图显示的
     dayScore 打架（比如三餐全 ok 但放纵餐时两处分数不同）。统一到 dayScore 后，
     环形仪表 / 进度条 / 热力图 / 打卡记录四处读数恒等。 */
  const todayScore = dayScore(cur);

  const heroW = useCountUp(latestW);
  /* 距目标还差多少：正值 = 还差这么多（当前体重大于目标），≤0 = 已达成 */
  const goalGap = latestW != null ? Math.round((latestW - PROFILE.goal1) * 10) / 10 : null;

  return (
    <div className="dck-app">
      <style>{DCK_CSS}</style>

      {/* 顶栏：浅色环境光，不再是深绿大色块 */}
      <header className="dck-head">
        <div className="dck-head-top">
          <div>
            <div className="dck-brand">饮食打卡</div>
            <div className="dck-head-sub">快速档 {PROFILE.kcal} kcal · {PROFILE.startDate.slice(0, 4)} 年至今</div>
          </div>
          <div className="dck-head-right">
            {authed && <span className="dck-sync"><i />{username} · 云同步</span>}
            <div className={`dck-streak${streak > 0 ? ' on' : ''}`}>
              <Flame size={14} strokeWidth={2.4} />
              <span>{streak} 天</span>
            </div>
          </div>
        </div>
        {/* v6 首屏压缩：v5 是「大号体重(52px) + 两枚状态胶囊 + 独立寄语卡」纵向堆叠，
            实测在 375×667 上占掉约 380px——晨起要打卡时，三餐与习惯整块被推到首屏之外。
            改为一行式紧凑 Hero：体重与均线并排、寄语收进同一张卡的一行。
            信息一条没删（体重 / 距目标 / 均线 / 寄语全在），只是从三行压到一~两行。 */}
        <div className="dck-hero">
          <div className="dck-hero-top">
            <div className="dck-hero-w">
              {/* 还没有任何体重记录时不要显示「— kg」：破折号配单位读起来像"0 公斤"。
                  改成一句明确的引导，指向下方晨间启动卡。 */}
              {heroW != null ? (
                <>
                  <span className="dck-hero-num">{heroW}</span>
                  <span className="dck-hero-unit">kg</span>
                </>
              ) : (
                <span className="dck-hero-none">记录首次体重</span>
              )}
            </div>            <div className="dck-hero-pills">
              <span className="dck-pill-stat">
                {goalGap != null
                  ? (goalGap > 0 ? <>距目标 <b>{goalGap.toFixed(1)}</b> kg</> : <>已达标</>)
                  : '记录解锁目标'}
              </span>
              <span className="dck-pill-stat alt">
                {ma7 != null ? <>均线 <b>{ma7}</b> kg</> : '均线待数据'}
              </span>
            </div>
          </div>
          <div className="dck-motto">
            <span className="dck-motto-ico"><MessageSquareHeart size={13} /></span>
            <span>{motto}</span>
          </div>
        </div>
      </header>

      <main className="dck-main">
        {!loaded ? (
          /* 骨架屏：杜绝首屏闪烁 */
          <div className="dck-skel-wrap" aria-busy="true">
            <div className="dck-skel" style={{ height: 22, width: '46%' }} />
            <div className="dck-skel" style={{ height: 58 }} />
            <div className="dck-skel" style={{ height: 148 }} />
            <div className="dck-skel" style={{ height: 190 }} />
            <div className="dck-skel" style={{ height: 84 }} />
          </div>
        ) : (
        <div className="dck-pane" key={tab}>
        {tab === 'today' ? (
          <>
            {/* 里程碑横幅 */}
            {streak > 0 && MILESTONES.includes(streak) && (
              <div className="dck-milestone">
                <Trophy size={16} />
                <span>{ENC.milestones[streak]}</span>
                <b>连续 {streak} 天达成</b>
              </div>
            )}

            {/* 模块一：晨间启动（日期 + 体重 + 血压，一张卡闭环） */}
            <section className="dck-card dck-morning">
              <div className="dck-morning-top">
                <h3 className="dck-sec"><Scale size={15} /> 晨间启动</h3>
                <div className="dck-date-box">
                  <CalendarDays size={14} style={{ color: 'var(--dck-brand)', flexShrink: 0 }} />
                  <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value || todayStr())} />
                  {date !== todayStr() && (
                    <button type="button" className="dck-chip" onClick={() => setDate(todayStr())}>回到今天</button>
                  )}
                </div>
              </div>
              <div className="dck-weight-row">
                <div className="dck-weight-field">
                  <input
                    className="dck-weight-input"
                    type="number" step="0.1" inputMode="decimal" pattern="[0-9]*" placeholder={latestW ? String(latestW) : '93.2'}
                    value={cur.weight} onChange={(e) => patchDay({ weight: e.target.value })}
                  />
                  <span className="dck-weight-unit">kg</span>
                </div>
                {lastW != null && (
                  <button type="button" className="dck-chip" onClick={() => patchDay({ weight: String(lastW) })}>
                    同上次 {lastW}
                  </button>
                )}
              </div>
              {cur.weight && latestW && date === todayStr() && parseFloat(cur.weight) !== latestW && (
                <div className={`dck-delta ${parseFloat(cur.weight) < latestW ? 'good' : 'warn'}`}>
                  {parseFloat(cur.weight) < latestW ? '↓' : '↑'} {Math.abs(latestW - parseFloat(cur.weight)).toFixed(1)} kg vs 上次
                </div>
              )}
              <div className="dck-bp-row">
                <ShieldCheck size={14} style={{ color: 'var(--dck-t2)', flexShrink: 0 }} />
                <input type="number" inputMode="numeric" pattern="[0-9]*" placeholder="收缩压" value={cur.bpSys} onChange={(e) => patchDay({ bpSys: e.target.value })} />
                <span className="dck-bp-slash">/</span>
                <input type="number" inputMode="numeric" pattern="[0-9]*" placeholder="舒张压" value={cur.bpDia} onChange={(e) => patchDay({ bpDia: e.target.value })} />
                <span className="dck-bp-unit">mmHg · 选填</span>
              </div>
            </section>

            {/* 模块二：今日执行看板（三餐 + 习惯 + 进度，一张卡闭环） */}
            <section className="dck-card">
              <div className="dck-daily-head">
                <h3 className="dck-sec"><Wheat size={15} /> 今日执行</h3>
                {/* 环形得分仪：把 v4 右上角那个纯文字的 {doneCount}/5 换成 Apple Health 式量表。
                    得分与进度条同源（都是 dayScore(cur)），完成一个即见一段弧线增长，
                    补上 v4 缺的「闭合一个」的完成触感。 */}
                <div
                  className={`dck-gauge${allDone ? ' is-full' : ''}`}
                  role="progressbar"
                  aria-valuenow={todayScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`今日得分 ${todayScore} 分，已完成 ${doneCount} 项（共 5 项）`}
                >
                  <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
                    <circle cx="23" cy="23" r="19" fill="none" stroke="#E6EDE8" strokeWidth="4.5" />
                    <circle
                      cx="23" cy="23" r="19" fill="none"
                      stroke="var(--dck-brand)" strokeWidth="4.5" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 19}
                      strokeDashoffset={2 * Math.PI * 19 * (1 - todayScore / 100)}
                      transform="rotate(-90 23 23)"
                      style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.16,1,.3,1)' }}
                    />
                  </svg>
                  <span className="dck-gauge-num">{todayScore}</span>
                </div>
              </div>
              {MEALS.map(({ key, label, Icon }) => (
                <div key={key} className="dck-meal">
                  <div className="dck-meal-head"><Icon size={15} strokeWidth={2} style={{ color: 'var(--dck-t2)' }} /><span>{label}</span></div>
                  <div className="dck-seg">
                    {MEAL_STATES.map(({ key: sk, label: sl, Icon: SIcon }) => (
                      <button
                        key={sk} type="button"
                        className={`dck-pill-btn dck-pill-${sk}${cur[key] === sk ? ' is-active' : ''}`}
                        onClick={() => patchDay({ [key]: cur[key] === sk ? '' : sk })}
                      >
                        <SIcon size={14} strokeWidth={cur[key] === sk ? 2.5 : 2} />
                        <span>{sl}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="dck-habits">
                <button type="button" className={`dck-habit${cur.water ? ' on' : ''}`} onClick={() => patchDay({ water: !cur.water })}>
                  <span className="dck-habit-ico"><Droplets size={17} /></span>
                  <span className="dck-habit-txt"><b>喝水 2000ml+</b><span>{cur.water ? '已达标' : '点击达标'}</span></span>
                  <i className="dck-habit-check"><Check size={13} strokeWidth={3.2} /></i>
                </button>
                <button type="button" className={`dck-habit${cur.steps ? ' on' : ''}`} onClick={() => patchDay({ steps: !cur.steps })}>
                  <span className="dck-habit-ico"><Footprints size={17} /></span>
                  <span className="dck-habit-txt"><b>步数 8000+</b><span>{cur.steps ? '已达标' : '点击达标'}</span></span>
                  <i className="dck-habit-check"><Check size={13} strokeWidth={3.2} /></i>
                </button>
                <button type="button" className={`dck-habit${cur.training ? ' on' : ''}`} onClick={() => patchDay({ training: !cur.training })}>
                  <span className="dck-habit-ico"><Dumbbell size={17} /></span>
                  <span className="dck-habit-txt"><b>力量训练</b><span>{cur.training ? '已练' : '休息/未练'}</span></span>
                  <i className="dck-habit-check"><Check size={13} strokeWidth={3.2} /></i>
                </button>
                <button type="button" className={`dck-habit clean${!cur.junk ? ' on' : ''}`} onClick={() => patchDay({ junk: !cur.junk })}>
                  <span className="dck-habit-ico"><ShieldCheck size={17} /></span>
                  <span className="dck-habit-txt"><b>无放纵餐</b><span>{cur.junk ? '今天有放纵餐' : '零饮料零食'}</span></span>
                  <i className="dck-habit-check"><Check size={13} strokeWidth={3.2} /></i>
                </button>
              </div>

              <div className={`dck-donebar${allDone ? ' is-full' : ''}`}>
                <div className="dck-donebar-track">
                  <i style={{ width: `${(doneCount / 5) * 100}%` }} />
                  {allDone && (
                    <span className="dck-sparks" aria-hidden="true">
                      <i /><i /><i /><i /><i /><i />
                    </span>
                  )}
                </div>
                <span>今日 {doneCount}/5</span>
              </div>
              {/* v5 这里常驻一条「教练评语」，与顶栏「今日寄语」同屏堆叠——两条都是
                  绿底+圆角+对白图标，手机上一屏里出现两个几乎一样的气泡，注意力被分散、
                  且把三餐/习惯继续往下推。改为只在真达成 5/5 时出现：平时不占位，
                  达成时又正好是最需要鼓励的时刻。 */}
              {allDone && (
                <div className="dck-praise">
                  <span className="dck-motto-ico"><MessageSquareHeart size={13} /></span>
                  <span>{pickFrom(ENC.full, seedOf('done' + date))}</span>
                </div>
              )}
            </section>

            <section className="dck-card">
              <h3 className="dck-sec"><Info size={15} /> 备注</h3>
              <textarea
                className="dck-note" rows={2}
                placeholder="应酬 / 聚餐 / 状态 / 身体反应…"
                value={cur.note} onChange={(e) => patchDay({ note: e.target.value })}
              />
            </section>

            {/* 未登录：下沉为柔和引导卡，不再占据核心视线 */}
            {!authed && (
              <div className="dck-guide">
                <LogIn size={15} />
                <span><b>本地已为您安全暂存</b> · 登录后多设备同步、数据不怕丢</span>
                <button type="button" onClick={() => openLogin()}>登录</button>
              </div>
            )}

            <div className="dck-foot">{authed ? '点击即保存 · 云端多端同步' : '点击即保存（本地）· 登录后自动上传'}</div>
          </>
        ) : tab === 'trend' ? (
          <>
            <div className="dck-stat4">
              <div><b>{latestW ?? '—'}</b><span>最新体重 kg</span></div>
              <div><b>{latestW ? Math.max(0, Math.round((PROFILE.startWeight - latestW) * 10) / 10) : '—'}</b><span>已减 kg</span></div>
              <div><b>{streak}</b><span>连续全勤 天</span></div>
              <div><b>{totalDays}</b><span>累计打卡 天</span></div>
            </div>

            <section className="dck-card">
              <h3 className="dck-sec"><TrendingUp size={15} /> 体重趋势（近 30 次）</h3>
              {weights.length >= 2 ? (
                <>
                  <TrendChart weights={weights} goal1={PROFILE.goal1} />
                  <div className="dck-legend">
                    <span><i className="lg-dot" /> 单日</span>
                    <span><i className="lg-line" /> 7 日均线（看它）</span>
                    <span><i className="lg-goal" /> 目标 87kg</span>
                  </div>
                </>
              ) : <div className="dck-empty">再记录 1 次体重即可生成曲线</div>}
            </section>

            <section className="dck-card">
              <h3 className="dck-sec"><CalendarDays size={15} /> 近 14 天热力</h3>
              <div className="dck-heat">
                {(() => {
                  const cells = [];
                  const d = new Date();
                  d.setDate(d.getDate() - 13);
                  for (let i = 0; i < 14; i++) {
                    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    const sc = days[k] ? dayScore(days[k]) : -1;
                    const cls = sc < 0 ? 'none' : sc >= 80 ? 'hi' : sc >= 50 ? 'mid' : sc > 0 ? 'low' : 'none';
                    const wd = '周' + '日一二三四五六'[d.getDay()];
                    const isToday = k === todayStr();
                    cells.push(
                      <div key={k} className="dck-heat-cell">
                        <div className={`dck-heat-box lv-${cls}${isToday ? ' today' : ''}`} />
                        <span>{wd} {d.getDate()}</span>
                      </div>,
                    );
                    d.setDate(d.getDate() + 1);
                  }
                  return cells;
                })()}
              </div>
            </section>
          </>
        ) : tab === 'badges' ? (
          /* 「成就」独立成页：v4 把徽章墙、教练三联反馈、20 条打卡流水全塞在趋势页，
             一个 Tab 承载 6 类异质信息、密度失控。这里把「回看过去」的三块归到一处，
             与趋势页的「看指标」职责分开。 */
          <>
            {/* 里程碑徽章墙：香槟金微渐变 */}
            <section className="dck-card">
              <h3 className="dck-sec"><Trophy size={15} /> 坚持里程碑</h3>
              <div className="dck-badges">
                {MILESTONES.map((m) => {
                  const got = streak >= m || (profile.maxStreak || 0) >= m;
                  return (
                    <div key={m} className={`dck-badge${got ? ' got' : ''}`}>
                      <b>{m}</b><span>{got ? '已达成' : '天'}</span>
                    </div>
                  );
                })}
              </div>
              <div className="dck-badges-note">最高连续纪录 {profile.maxStreak || 0} 天 · 已累计打卡 {totalDays} 天</div>
            </section>

            {/* 本周反馈：节奏 / 注意 / 趋势 三联结构 */}
            <section className="dck-card">
              <h3 className="dck-sec"><MessageSquareHeart size={15} /> 本周反馈</h3>
              <div className="dck-fb">
                {weeklyFeedback.map(({ k, text }, i) => (
                  <div key={i} className={`dck-fb-item is-${k}`}>
                    <span className="dck-fb-tag">{k === 'pace' ? '节奏' : k === 'watch' ? '注意' : '趋势'}</span>
                    <span className="dck-fb-text">{text}</span>
                  </div>
                ))}
              </div>
            </section>

          </>
        ) : tab === 'history' ? (
          /* v6：历史记录从「成就」页独立出来。
             查历史（哪天空了、哪天放纵了）和看成就（徽章、教练反馈）是两种心智，
             v5 把两者塞进同一页，达成页里混着流水账，翻找成本高。 */
          <section className="dck-card">
            <h3 className="dck-sec"><ClipboardCheck size={15} /> 打卡记录
              <span style={{ marginLeft: 'auto', fontWeight: 500, color: 'var(--dck-t3)', fontSize: 12 }}>
                共 {sortedDates.length} 天
              </span>
            </h3>
            {sortedDates.length === 0 ? <div className="dck-empty">还没有记录</div> : (
              <div className="dck-rows">
                {[...sortedDates].reverse().slice(0, 30).map((k) => {
                  const d = days[k];
                  const sc = dayScore(d);
                  const open = openHist === k;
                  return (
                    <div
                      key={k}
                      className={`dck-row${open ? ' open' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      onClick={() => setOpenHist(open ? null : k)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenHist(open ? null : k); } }}
                    >
                      <div className="dck-row-main">
                        <span className="dck-row-date">{k.slice(5)}</span>
                        <span className="dck-row-w">{d.weight ? `${d.weight} kg` : '—'}</span>
                        {d.bpSys ? <span className="dck-row-bp">{d.bpSys}/{d.bpDia}</span> : <span className="dck-row-bp">—</span>}
                        <span className={`dck-row-score s-${sc >= 80 ? 'hi' : sc >= 50 ? 'mid' : 'low'}`}>{sc} 分</span>
                        <span className={`dck-row-caret${open ? ' up' : ''}`} aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </span>
                      </div>
                      {/* 展开：把当天被折叠的血压/饮水/步数/训练/放纵与备注一次性摊开，
                          省得为了看一句备注还要跳回「今日」页逐项点。 */}
                      {open && (
                        <div className="dck-row-detail" onClick={(e) => e.stopPropagation()}>
                          <div className="dck-row-grid">
                            <span>饮水 <b className={d.water ? 'ok' : 'no'}>{d.water ? '达标' : '未达标'}</b></span>
                            <span>步数 <b className={d.steps ? 'ok' : 'no'}>{d.steps ? '8000+' : '不足'}</b></span>
                            <span>训练 <b className={d.training ? 'ok' : 'no'}>{d.training ? '已练' : '未练'}</b></span>
                            <span>放纵 <b className={d.junk ? 'no' : 'ok'}>{d.junk ? '有' : '无'}</b></span>
                          </div>
                          {d.note ? <p className="dck-row-detail-note">{d.note}</p> : null}
                          <button
                            type="button"
                            className="dck-row-load"
                            onClick={() => { setDate(k); setTab('today'); setOpenHist(null); }}
                          >
                            载入此日继续编辑
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="dck-card">
              <h3 className="dck-sec"><Target size={15} /> 当前执行档：快速档（限时 8 周）</h3>
              <div className="dck-plan">
                <div><b>{profile.kcal}</b><span>kcal/天（下限 1900）</span></div>
                <div><b>≥120g</b><span>蛋白质/天</span></div>
                <div><b>0.75-1.0</b><span>kg/周 速率</span></div>
                <div><b>{profile.startWeight}→{profile.goal1}→{profile.goal2}</b><span>kg 阶段目标</span></div>
              </div>
              {/* v6：热量上限与第一阶段目标开放就地编辑（此前为写死常量）。
                  体重起始值与第二阶段目标保持只读——它们是历史事实，改了会让
                  「已减 kg」和阶段进度失去参照。 */}
              <div className="dck-plan-edit">
                <div className="dck-plan-field">
                  <label htmlFor="dckEditKcal">热量上限 kcal/天</label>
                  <input
                    id="dckEditKcal" type="number" inputMode="numeric" inputPattern="[0-9]*"
                    placeholder={String(profile.kcal)} value={kcalDraft}
                    onChange={(e) => setKcalDraft(e.target.value)}
                  />
                </div>
                <div className="dck-plan-field">
                  <label htmlFor="dckEditGoal">阶段目标 kg</label>
                  <input
                    id="dckEditGoal" type="number" step="0.5" inputMode="decimal" inputPattern="[0-9]*"
                    placeholder={String(profile.goal1)} value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                  />
                </div>
                <button type="button" className="dck-plan-save" onClick={savePlan}>保存方案</button>
              </div>
              <p className="dck-plan-hint">热量不低于 1900 kcal；目标体重需高于当前体重，否则趋势图目标线会消失。</p>
            </section>
            <section className="dck-card">
              <h3 className="dck-sec"><Check size={15} /> 每日清单</h3>
              <ul className="dck-ul">
                <li>水 2000-2500ml（尿淡黄即达标）</li>
                <li>盐 &lt;5g：不喝汤、不蘸料、腌制品不吃</li>
                <li>步数 8000-10000 + 每坐 1h 起身</li>
                <li>力量 4 练/周（8-15 次/组，不憋气）</li>
                <li>睡 7-9h，14:00 后不碰咖啡因</li>
                <li>蛋白 ≥120g：蛋 3-4 + 鸡胸 100g + 食堂荤菜</li>
              </ul>
            </section>
            <section className="dck-card warn">
              <h3 className="dck-sec"><ShieldCheck size={15} /> 红线（出现即回撤）</h3>
              <ul className="dck-ul">
                <li>头晕 / 心悸 / 乏力 → 当天回 2300 kcal 并复测血压</li>
                <li>连续 2 周掉重 &gt;1.5kg/周 → 加回 200 kcal</li>
                <li>快速档满 8 周 → 回标准档或插 2 周维持</li>
                <li>&lt;1500 kcal 安排、任何减肥药 → 硬红线</li>
              </ul>
            </section>
            <div className="dck-foot">依据：《星历减重计划 v1.1》· 体重管理知识库 2026-09</div>
          </>
        )}
        </div>
        )}
      </main>

      <nav className="dck-tabbar" role="tablist" aria-label="主导航">
        {[
          { key: 'today', label: '今日', Icon: ClipboardCheck },
          { key: 'trend', label: '趋势', Icon: TrendingUp },
          { key: 'history', label: '历程', Icon: CalendarDays },
          { key: 'badges', label: '成就', Icon: Trophy },
          { key: 'plan', label: '方案', Icon: Info },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`dck-tabbtn${tab === key ? ' on' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={19} strokeWidth={tab === key ? 2.4 : 2} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {toast && <div className="dck-toast"><Check size={14} strokeWidth={3} /> {savedToast}</div>}
    </div>
  );
}

/* ---------------- 体重趋势（纯 SVG：Catmull-Rom 三阶贝塞尔平滑 + 渐变面积 + 末点脉冲） ---------------- */
function TrendChart({ weights, goal1 }) {
  const W = 620, H = 230, PL = 42, PR = 14, PT = 14, PB = 28;
  const data = weights.slice(-30);
  const vals = data.map((d) => d.v);
  const min = Math.min(...vals, goal1) - 0.6;
  const max = Math.max(...vals, goal1) + 0.6;
  const x = (i) => PL + (i * (W - PL - PR)) / Math.max(1, data.length - 1);
  const y = (v) => PT + ((max - v) * (H - PT - PB)) / (max - min);
  const ma = data.map((_, i) => {
    const s = data.slice(Math.max(0, i - 6), i + 1);
    return Math.round((s.reduce((a, b) => a + b.v, 0) / s.length) * 100) / 100;
  });
  /* Catmull-Rom → 三阶贝塞尔：折角变柔和曲线 */
  const smooth = (pts) => {
    if (!pts.length) return '';
    if (pts.length === 1) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  };
  const maPts = ma.map((v, i) => [x(i), y(v)]);
  const areaD = maPts.length > 1
    ? `${smooth(maPts)} L${maPts[maPts.length - 1][0].toFixed(1)},${H - PB} L${maPts[0][0].toFixed(1)},${H - PB} Z`
    : '';
  const last = data[data.length - 1];
  const lastX = x(data.length - 1);
  const lastY = y(last.v);

  /* v6 触控探针：375px 下 30 个点平均间距不足 10px，肉眼无法定位某一天。
     手指在图上滑动时吸附到最近的数据点，上方探针条实时显示
     「当天日期 / 实际体重 / 7 日均线 / 距目标」，松手回落到最新一次。
     用 Pointer Events 统一处理触摸与鼠标（桌面调试不必另写一套 mouse 监听）。 */
  const [probe, setProbe] = useState(null);
  const svgRef = useRef(null);
  const pick = (clientX) => {
    const el = svgRef.current;
    if (!el || data.length === 0) return;
    const r = el.getBoundingClientRect();
    /* 客户端坐标 → viewBox 坐标：SVG 宽度是 620 但实际渲染宽约 330，必须按比例换算 */
    const vbX = ((clientX - r.left) / r.width) * W;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < data.length; i++) {
      const dd = Math.abs(x(i) - vbX);
      if (dd < bestD) { bestD = dd; best = i; }
    }
    setProbe(best);
  };
  const pi = probe != null ? probe : data.length - 1;
  const pd = data[pi];
  const pMa = ma[pi];

  return (
    <div className="dck-probe">
      {/* 探针条：滑动时显示被探查点，静止时显示最新一次 */}
      <div className="dck-probe-bar">
        <div className="dck-probe-l">
          <span className="dck-probe-date">{pd ? pd.date : '—'}</span>
          <span className="dck-probe-w">
            <b>{pd ? pd.v.toFixed(1) : '—'}</b>
            <i>kg</i>
          </span>
        </div>
        <div className="dck-probe-r">
          <span>7 日均线 <b>{pMa != null ? pMa.toFixed(1) : '—'}</b></span>
          <span>距目标 <b>{pd ? Math.max(0, Math.round((pd.v - goal1) * 10) / 10).toFixed(1) : '—'}</b> kg</span>
        </div>
      </div>
      <div
        className="dck-probe-zone"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture?.(e.pointerId); pick(e.clientX); }}
        onPointerMove={(e) => { if (e.buttons > 0 || e.pressure > 0 || e.pointerType === 'touch') pick(e.clientX); }}
        onPointerUp={() => setProbe(null)}
        onPointerLeave={() => setProbe(null)}
      >
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="dck-svg" role="img" aria-label="体重趋势，可滑动查看任意一天">
      <defs>
        <linearGradient id="dckAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0D8253" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0D8253" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((t) => {
        const v = min + t * (max - min);
        return (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="#E8EFEA" strokeWidth="1" />
            <text x={PL - 6} y={y(v)} textAnchor="end" dominantBaseline="central" fontSize="10" fill={C.text4}>{v.toFixed(1)}</text>
          </g>
        );
      })}
      {goal1 >= min && goal1 <= max && (
        <line x1={PL} x2={W - PR} y1={y(goal1)} y2={y(goal1)} stroke={C.bad} strokeWidth="1.2" strokeDasharray="5 4" opacity=".7" />
      )}
      {areaD && <path d={areaD} fill="url(#dckAreaGrad)" stroke="none" />}
      <path d={smooth(maPts)} fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" />
      {/* 探查准星：竖虚线 + 放大的探查点 */}
      {probe != null && (
        <>
          <line x1={x(probe)} x2={x(probe)} y1={PT} y2={H - PB} stroke={C.green} strokeWidth="1" strokeDasharray="3 3" opacity=".6" />
          <circle cx={x(probe)} cy={y(pd.v)} r="5.5" fill={C.green} stroke="#fff" strokeWidth="1.8" />
        </>
      )}
      {data.map((d, i) => (
        <circle key={d.date} cx={x(i)} cy={y(d.v)} r={i === pi && probe != null ? 0 : 2.8} fill={C.dot} />
      ))}
      {/* 末点：实心点 + 呼吸脉冲光环（探查中隐藏，避免与探查点重叠） */}
      {probe == null && (
        <>
          <circle className="dck-ping" cx={lastX} cy={lastY} r="6" fill={C.green} />
          <circle cx={lastX} cy={lastY} r="4" fill={C.green} stroke="#fff" strokeWidth="1.6" />
        </>
      )}
      {data.map((d, i) => (
        (i === data.length - 1 || i % Math.ceil(data.length / 6) === 0)
          ? <text key={`t${d.date}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={C.text4}>{d.date.slice(5)}</text>
          : null
      ))}
      </svg>
      </div>
      <div className="dck-probe-hint">{probe != null ? '松手回到最新' : '按住图表左右滑动，可查任意一天'}</div>
    </div>
  );
}

/* ---------------- 样式：鼠尾草矿物翡翠 2.0 ----------------
   2.0 相对 v4 的变化（全部为新增或加强，不改任何已达标项的取值方向）：
   ① 补齐 --dck-t3（v4 只有 t2/t4，中间档缺失导致标签只能二选一）
   ② 补齐触控阶梯 --dck-tap-min:44 / --dck-tap-lg:52，把散落各处的魔法数字收归变量
   ③ 描边与卡片阴影分出 line / line-strong 两级，供 375px 密集排版取用
   ④ 新增 --dck-gold-bg 渐变与 --dck-emerald-glow，供徽章与得分环使用 */
const DCK_CSS = `
.dck-app {
  --dck-page: #F4F7F5; --dck-card: #FFFFFF; --dck-sub: #F9FBFA;
  --dck-line: rgba(16,78,48,.08);
  --dck-line-strong: rgba(16,78,48,.16);
  --dck-ink: #122017; --dck-t2: #4D6357; --dck-t3: #758D80; --dck-t4: #9FB2A7;
  --dck-brand: #0D8253; --dck-deep: #08613C; --dck-soft: #E8F6EE;
  --dck-brand-glow: rgba(13,130,83,.15);
  --dck-gold: #966F09; --dck-gold-soft: #FEF9EC;
  --dck-gold-bg: linear-gradient(135deg, #FFF8E7 0%, #F8E7BE 100%);
  --dck-gold-border: rgba(184,134,11,.35);
  --dck-warn: #C27803; --dck-warn-soft: #FFFBEB; --dck-warn-line: rgba(194,120,3,.22);
  /* 触控与圆角阶梯：44 为 iOS HIG / WCAG 2.2 AA 下限，52 用于主操作 */
  --dck-tap: 44px; --dck-tap-lg: 52px;
  --dck-r-sm: 10px; --dck-r-md: 14px; --dck-r-lg: 18px;
  --dck-bad: #D94841; --dck-bad-soft: #FEF2F2; --dck-bad-line: rgba(217,72,65,.22);
  --dck-shadow: 0 1px 3px rgba(18,38,27,.03), 0 8px 24px -4px rgba(18,38,27,.06);
  --dck-inner: inset 0 1px 0 rgba(255,255,255,.9);
  --dck-ring: 0 0 0 3px rgba(13,130,83,.15);
  /* 高度：主站 Layout 把 /diet-checkin 列为全屏路由，外层 .vr-fullscreen-scroll
     是 height:100% + overflow:auto 负责滚动。这里若写 min-height:100dvh，
     .dck-app 的盒高会被锁在视口内，而实际内容更高 —— 超出部分既撑不开外层滚动条，
     也不会被裁掉（外层本来就能滚），实测桌面端表现为「内容到视口底部后直接消失、
     底栏浮在内容上面」。改为 min-height:100%（配合外层 100% 视口高度），
     内容高于视口时盒子自然长高，外层滚动容器即可正常滚到底。 */
  min-height: 100%;
  color: var(--dck-ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  /* 顶部微绿雾气：融入浅色基调，替代原来的深绿大色块断层 */
  background:
    radial-gradient(120% 460px at 50% -90px, rgba(13,130,83,.16), rgba(13,130,83,0) 70%),
    radial-gradient(80% 300px at 88% -40px, rgba(184,134,11,.07), rgba(184,134,11,0) 70%),
    var(--dck-page);
}

/* ── 顶栏（浅色） ── */
.dck-head { padding: max(18px, env(safe-area-inset-top)) 18px 6px; }
/* AuthGate 的登录浮钮固定在站点右上角，顶栏行右侧预留空间避免压住连胜胶囊。
   v4 用的是写死的 76px：它按「无登录态」的最短情况设计，一旦登录后
   .dck-sync 插入（用户名越长越长），左侧标题与右侧胶囊会在 375px 下互相挤压折行。
   改为「左侧 min-width:0 + 省略号、右侧 flex-shrink:0」：右胶囊组永不压缩，
   左侧标题/副标题先省略，把空间让给真正需要完整的连胜与同步状态。 */
.dck-head-top { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding-right: 76px; }
.dck-head-top > div:first-child { min-width: 0; flex: 1; }
.dck-head-sub { font-size: 12px; color: var(--dck-t2); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dck-head-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
/* 同步胶囊承载用户名，窄屏优先压缩它自己而不是把整行撑破 */
.dck-sync { min-width: 0; max-width: 34vw; }
.dck-sync { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dck-brand { font-size: 17px; font-weight: 800; letter-spacing: .01em; color: var(--dck-ink); }
.dck-head-sub { font-size: 12px; color: var(--dck-t2); margin-top: 2px; }
.dck-head-right { display: flex; align-items: center; gap: 8px; }
.dck-sync { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600;
  color: var(--dck-deep); background: rgba(255,255,255,.8); border: 1px solid var(--dck-line);
  padding: 5px 10px; border-radius: 999px; }
.dck-sync i { width: 6px; height: 6px; border-radius: 50%; background: var(--dck-brand);
  box-shadow: 0 0 0 3px rgba(13,130,83,.14); }
.dck-streak { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700;
  padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,.82);
  border: 1px solid var(--dck-line); color: var(--dck-t2); }
.dck-streak.on { background: var(--dck-gold-soft); border-color: rgba(184,134,11,.3); color: var(--dck-gold); }
/* v6 紧凑 Hero：体重与均线并排一行、寄语收进下方细条。
   v5 是三段纵向堆叠（大字 52px 一行 + 胶囊一行 + 独立寄语卡一行），
   375×667 实测顶栏独占约 380px，把三餐打卡整块推出首屏。
   字号 52 → 34，胶囊文案收短（「距目标还差」→「距目标」、「7 日均线」→「均线」），
   寄语卡 padding 10/12 → 7/10，四项信息全保留但高度砍掉约一半。 */
.dck-hero { margin-top: 10px; }
.dck-hero-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.dck-hero-w { display: flex; align-items: baseline; gap: 5px; flex-shrink: 0; }
.dck-hero-num { font-size: 34px; font-weight: 800; letter-spacing: -.03em; line-height: 1;
  color: var(--dck-ink); font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }
.dck-hero-unit { font-size: 13px; color: var(--dck-t4); font-weight: 600; }
/* 无体重记录时的占位：与数字同高但用辅助色，一眼看出是待填而非数值 */
.dck-hero-none { font-size: 15px; font-weight: 700; color: var(--dck-t3); letter-spacing: .01em; }
.dck-hero-pills { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.dck-pill-stat { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--dck-t2);
  background: rgba(255,255,255,.85); border: 1px solid var(--dck-line); border-radius: 999px; padding: 5px 10px; }
.dck-pill-stat b { font-weight: 800; color: var(--dck-deep); font-variant-numeric: tabular-nums; }
.dck-pill-stat.alt b { color: var(--dck-brand); }
.dck-motto { display: flex; align-items: flex-start; gap: 7px; margin-top: 8px; font-size: 12px;
  line-height: 1.5; color: var(--dck-t2); background: rgba(255,255,255,.7);
  border: 1px solid var(--dck-line); border-radius: 10px; padding: 7px 10px; }
.dck-motto-ico { display: grid; place-items: center; flex-shrink: 0; width: 20px; height: 20px;
  border-radius: 7px; background: var(--dck-soft); color: var(--dck-brand); }
.dck-motto svg { margin-top: 0; }

/* ── 主内容 ── */
.dck-main { max-width: 560px; margin: 0 auto; padding: 14px 14px calc(96px + env(safe-area-inset-bottom)); }
.dck-pane { animation: dckPaneIn .22s cubic-bezier(.16,1,.3,1) both; }
@keyframes dckPaneIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.dck-card { background: var(--dck-card); border: 1px solid var(--dck-line); border-radius: 16px;
  padding: 16px; margin-bottom: 12px;
  box-shadow: var(--dck-shadow), var(--dck-inner); }
.dck-sec { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 700; margin: 0; color: var(--dck-ink); }
.dck-sec svg { color: var(--dck-brand); }
.dck-chip { border: 1px solid rgba(13,130,83,.35); background: #fff; color: var(--dck-deep);
  font-size: 12.5px; font-weight: 600; padding: 8px 13px; border-radius: 999px; cursor: pointer;
  transition: background .2s cubic-bezier(.16,1,.3,1); white-space: nowrap; }
.dck-chip:hover { background: var(--dck-soft); }

/* 晨间启动卡 */
.dck-morning-top { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  flex-wrap: wrap; margin-bottom: 14px; }
.dck-date-box { display: flex; align-items: center; gap: 7px; }
/* 注意：主站 index.css 有全局表单重置 input[type=...]（特异度 0-1-1），
   单类名选择器（0-1-0）会被它压掉字号/边框/圆角/内距。
   所以本页所有输入框规则都加 .dck-app 前缀抬到 0-2-0 以上。 */
/* v6 iOS 缩放修正：iOS Safari 在聚焦时若 input 字号 < 16px 会自动放大整个视口，
   打完字版心偏移、还要手动缩回去。日期框 13.5px、血压框 15px 都在阈值以下，
   统一提到 16px；同时把日期框高度从 ~35px 抬到 44px 触控下限。 */
.dck-app .dck-date-box input { border: 1px solid var(--dck-line); border-radius: 10px; padding: 0 10px;
  height: var(--dck-tap); font-size: 16px; color: var(--dck-ink); background: #fff; max-width: 158px; }
.dck-app .dck-date-box input:focus { outline: none; border-color: var(--dck-brand); box-shadow: var(--dck-ring); }
.dck-weight-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dck-weight-field { display: flex; align-items: center; gap: 7px; }
.dck-app .dck-weight-input { width: 138px; height: 56px; border: 1.5px solid var(--dck-line); border-radius: 14px;
  font-size: 26px; font-weight: 700; text-align: center; color: var(--dck-ink); background: #fff;
  font-variant-numeric: tabular-nums; font-feature-settings: 'tnum';
  box-shadow: var(--dck-inner); }
.dck-app .dck-weight-input:focus { outline: none; border-color: var(--dck-brand); box-shadow: var(--dck-ring); }
.dck-weight-unit { font-size: 14px; font-weight: 600; color: var(--dck-t4); }
.dck-delta { margin-top: 10px; font-size: 12.5px; font-weight: 600; padding: 5px 10px;
  border-radius: 8px; display: inline-block; }
.dck-delta.good { color: var(--dck-deep); background: var(--dck-soft); }
.dck-delta.warn { color: var(--dck-warn); background: var(--dck-warn-soft); }
.dck-bp-row { display: flex; align-items: center; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
/* 375px 下 96+96+斜杠+盾牌+单位逼近 320px，会把「mmHg · 选填」挤到第三行割裂版面。
   措施：① 输入框窄屏改 flex:1 自适应（不再写死 96px），窄屏自然并排、宽屏仍各占一格；
        ② 高度 42 → 44 达触控下限；③ 单位文本允许换行并独占剩余空间，不再硬撑。 */
.dck-app .dck-bp-row input { flex: 1 1 88px; min-width: 76px; max-width: 110px; height: var(--dck-tap);
  border: 1px solid var(--dck-line); border-radius: 10px;
  padding: 0 10px; font-size: 16px; color: var(--dck-ink); background: #fff; /* 16px 防 iOS 聚焦缩放 */
  font-variant-numeric: tabular-nums; }
.dck-app .dck-bp-row input:focus { outline: none; border-color: var(--dck-brand); box-shadow: var(--dck-ring); }
.dck-bp-slash { color: var(--dck-t4); font-weight: 600; }
.dck-bp-unit { font-size: 11.5px; color: var(--dck-t4); flex: 1 1 100%; line-height: 1.4; }

/* 今日执行看板 */
.dck-daily-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
/* 今日得分环（Apple Health 式）：46px 不抢版面，但弧线随每次打卡增长。
   数字用 tabular-nums，宽度固定，弧线动画不会把「今日执行」标题推来推去。 */
.dck-gauge { position: relative; width: 46px; height: 46px; flex-shrink: 0;
  display: grid; place-items: center; }
.dck-gauge svg { position: absolute; inset: 0; }
.dck-gauge-num { position: relative; font-size: 15px; font-weight: 800; color: var(--dck-deep);
  font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
.dck-gauge.is-full .dck-gauge-num { color: var(--dck-brand); }
.dck-gauge.is-full { animation: dckPop .4s cubic-bezier(.34,1.56,.64,1); }
.dck-donechip { font-size: 12px; font-weight: 800; color: var(--dck-deep); background: var(--dck-soft);
  border: 1px solid rgba(13,130,83,.25); border-radius: 999px; padding: 4px 11px;
  font-variant-numeric: tabular-nums; transition: all .25s cubic-bezier(.16,1,.3,1); }
.dck-donechip.full { background: var(--dck-brand); border-color: var(--dck-brand); color: #fff;
  box-shadow: 0 0 0 4px rgba(13,130,83,.14); }
.dck-meal { margin-bottom: 14px; }
.dck-meal:last-of-type { margin-bottom: 16px; }
.dck-meal-head { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
  color: var(--dck-t2); margin-bottom: 7px; }
/* 三餐：柔和分段药丸（中性轨道 + 白底激活 + 语义色文字，杜绝红绿灯实色） */
.dck-seg { display: flex; gap: 4px; background: #F0F4F1; border-radius: 12px; padding: 4px; }
/* min-height 38 → 44（--dck-tap）：v4 的 38px 低于 iOS HIG 44pt 与 WCAG 2.2 AA 标桩，
   晨起单手操作时相邻两餐的「按方案/小偏差/放纵餐」极易误触。
   touch-action:manipulation 去掉 300ms 双击缩放等待。 */
.dck-pill-btn { flex: 1; min-height: var(--dck-tap); border: none; border-radius: 10px; background: transparent;
  color: var(--dck-t2); font-size: 13px; font-weight: 500; display: inline-flex;
  align-items: center; justify-content: center; gap: 5px; cursor: pointer;
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  transition: transform .16s cubic-bezier(.16,1,.3,1), color .2s, background .2s, box-shadow .2s; }
.dck-pill-btn:hover { color: var(--dck-ink); }
.dck-pill-btn:active { transform: scale(.97); }
.dck-pill-btn.is-active { background: #fff; font-weight: 700;
  box-shadow: 0 2px 6px rgba(18,38,27,.08); }
.dck-pill-ok.is-active { color: var(--dck-brand); outline: 1px solid rgba(13,130,83,.28); }
.dck-pill-off.is-active { color: var(--dck-warn); outline: 1px solid var(--dck-warn-line); }
.dck-pill-bad.is-active { color: var(--dck-bad); outline: 1px solid var(--dck-bad-line); }

/* 习惯四件套：触感卡 + 弹性对勾
   375px 排版修正：列宽仅约 150px，v4 的「34px 图标 + gap9 + 双行文字 + 22px 勾选框」
   在中文字体下会把「无放纵餐 / 零饮料零食」这类长副标挤成三行、并被右侧对勾压住。
   措施：① 图标缩到 30px；② 副标单行省略（nowrap + ellipsis），标题保持可换行；
        ③ 对勾移到卡内右上角绝对定位，不再参与横向挤压；④ 纵向留足 padding。 */
.dck-habits { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.dck-habit { position: relative; display: flex; align-items: center; gap: 8px; min-height: 66px;
  border: 1px solid var(--dck-line); background: #fff; border-radius: var(--dck-r-md); padding: 10px 10px 10px 11px;
  color: var(--dck-t2); cursor: pointer; text-align: left;
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  box-shadow: var(--dck-inner); transition: transform .1s, border-color .2s, background .2s; }
.dck-habit:active { transform: scale(.97); }
.dck-habit.on { border-color: rgba(13,130,83,.4); background: var(--dck-soft); }
.dck-habit-ico { display: grid; place-items: center; flex-shrink: 0; width: 30px; height: 30px;
  border-radius: 9px; background: #F2F6F3; color: var(--dck-t2);
  transition: background .2s, color .2s; }
.dck-habit.on .dck-habit-ico { background: #fff; color: var(--dck-brand); }
.dck-habit-txt { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1;
  padding-right: 20px; /* 给右上角对勾留位，文字不再被压住 */ }
.dck-habit-txt b { font-size: 13px; color: var(--dck-ink); line-height: 1.3;
  overflow-wrap: anywhere; }
/* 副标是补充说明，375px 下宁可截断也不允许它把卡撑成三行 */
.dck-habit-txt > span { font-size: 10.5px; color: var(--dck-t4); line-height: 1.35;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dck-habit-check { position: absolute; top: 9px; right: 9px;
  display: grid; place-items: center; width: 20px; height: 20px;
  border-radius: 50%; border: 1.5px solid var(--dck-line-strong); color: transparent; background: #fff; }
.dck-habit.on .dck-habit-check { background: var(--dck-brand); border-color: var(--dck-brand); color: #fff;
  animation: dckPop .32s cubic-bezier(.34,1.56,.64,1); }
@keyframes dckPop { 0% { transform: scale(.5); } 60% { transform: scale(1.18); } 100% { transform: scale(1); } }

/* 进度条 + 5/5 庆祝微闪光 */
.dck-donebar { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
.dck-donebar-track { position: relative; flex: 1; height: 8px; border-radius: 999px;
  background: #E7EEE9; overflow: visible; }
.dck-donebar-track i { display: block; height: 100%; border-radius: 999px;
  background: linear-gradient(90deg, #2FA576, var(--dck-brand)); transition: width .3s cubic-bezier(.16,1,.3,1); }
.dck-donebar.is-full .dck-donebar-track i {
  background: linear-gradient(90deg, var(--dck-brand), #35C08A);
  box-shadow: 0 0 10px rgba(13,130,83,.4); }
.dck-donebar span { font-size: 12px; font-weight: 800; color: var(--dck-deep);
  font-variant-numeric: tabular-nums; }
.dck-sparks { position: absolute; right: 0; top: 50%; width: 0; height: 0; pointer-events: none; }
.dck-sparks i { position: absolute; left: 0; top: 0; width: 5px; height: 5px; border-radius: 50%;
  background: var(--dck-gold); animation: dckSpark .7s cubic-bezier(.16,1,.3,1) both; }
.dck-sparks i:nth-child(1) { --dx: -14px; --dy: -16px; }
.dck-sparks i:nth-child(2) { --dx: 4px; --dy: -20px; background: #E0C35F; }
.dck-sparks i:nth-child(3) { --dx: 16px; --dy: -10px; }
.dck-sparks i:nth-child(4) { --dx: -18px; --dy: 4px; background: #E0C35F; }
.dck-sparks i:nth-child(5) { --dx: 12px; --dy: 10px; }
.dck-sparks i:nth-child(6) { --dx: 0px; --dy: 16px; background: #E0C35F; }
@keyframes dckSpark { 0% { transform: translate(0,0) scale(1); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(.2); opacity: 0; } }

/* 评语气泡（教练 Whispers） */
.dck-praise { display: flex; align-items: flex-start; gap: 8px; margin-top: 12px; font-size: 12.5px;
  line-height: 1.55; color: var(--dck-ink); background: rgba(255,255,255,.9);
  border: 1px solid var(--dck-line); border-radius: 12px; padding: 10px 12px; }
.dck-praise svg { flex-shrink: 0; }

.dck-app .dck-note { width: 100%; border: 1px solid var(--dck-line); border-radius: 12px; padding: 10px 12px;
  font-size: 16px; color: var(--dck-ink); resize: none; font-family: inherit; background: #fff; }
.dck-app .dck-note:focus { outline: none; border-color: var(--dck-brand); box-shadow: var(--dck-ring); }
.dck-foot { text-align: center; font-size: 11px; color: var(--dck-t4); padding: 6px 0 10px; }

/* 未登录引导卡（下沉到打卡流末尾） */
.dck-guide { display: flex; align-items: center; gap: 9px; background: rgba(255,255,255,.9);
  border: 1px dashed rgba(13,130,83,.35); border-radius: 14px; padding: 12px 14px; margin-bottom: 12px;
  font-size: 12.5px; color: var(--dck-t2); }
.dck-guide svg { flex-shrink: 0; color: var(--dck-brand); }
.dck-guide b { color: var(--dck-ink); font-weight: 700; }
.dck-guide button { margin-left: auto; flex-shrink: 0; border: none; background: var(--dck-brand);
  color: #fff; font-size: 12.5px; font-weight: 700; padding: 8px 16px; border-radius: 999px;
  cursor: pointer; transition: transform .1s, box-shadow .2s; }
.dck-guide button:hover { box-shadow: 0 4px 14px -4px rgba(13,130,83,.5); }
.dck-guide button:active { transform: scale(.96); }

/* 骨架屏 */
.dck-skel-wrap { display: grid; gap: 12px; }
.dck-skel { border-radius: 12px;
  background: linear-gradient(90deg, #EAEFEA 25%, #F4F8F4 50%, #EAEFEA 75%);
  background-size: 200% 100%; animation: dckShimmer 1.5s infinite; }
@keyframes dckShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.dck-empty { font-size: 13.5px; color: var(--dck-t2); text-align: center; padding: 24px 0; }

/* 趋势页 */
.dck-stat4 { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 12px; }
.dck-stat4 > div { background: var(--dck-card); border: 1px solid var(--dck-line); border-radius: 14px;
  padding: 13px 14px; box-shadow: var(--dck-shadow), var(--dck-inner); }
.dck-stat4 b { display: block; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--dck-ink); font-variant-numeric: tabular-nums; }
.dck-stat4 span { font-size: 11.5px; color: var(--dck-t2); }

.dck-milestone { display: flex; align-items: center; gap: 9px; background: var(--dck-gold-soft);
  border: 1px solid rgba(184,134,11,.35); color: var(--dck-gold); border-radius: 14px;
  padding: 12px 14px; margin-bottom: 12px; font-size: 13px; font-weight: 600;
  box-shadow: 0 4px 16px -6px rgba(184,134,11,.35); }
.dck-milestone svg { flex-shrink: 0; }
.dck-milestone b { margin-left: auto; white-space: nowrap; }

/* 徽章墙：未解锁虚线灰 → 已解锁香槟金微渐变 */
.dck-badges { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.dck-badge { border: 1.5px dashed var(--dck-line); border-radius: 12px; text-align: center;
  padding: 10px 4px; color: var(--dck-t4); opacity: .62; }
.dck-badge b { display: block; font-size: 17px; font-weight: 800; }
.dck-badge span { font-size: 10.5px; }
.dck-badge.got { border: 1px solid rgba(184,134,11,.45); opacity: 1; color: #8A6A10;
  background: linear-gradient(135deg, #FDF4DC, #F6E2B3);
  box-shadow: 0 0 0 3px rgba(184,134,11,.08), 0 4px 12px -4px rgba(184,134,11,.35),
    inset 0 1px 0 rgba(255,255,255,.8); }
.dck-badge.got b { color: #8A6A10; }
.dck-badges-note { margin-top: 10px; font-size: 12px; color: var(--dck-t2); text-align: center; }

/* 本周反馈三联 */
.dck-fb { display: grid; gap: 9px; }
.dck-fb-item { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; line-height: 1.6;
  color: var(--dck-ink); background: #FAFCFA; border: 1px solid var(--dck-line);
  border-radius: 10px; padding: 9px 11px; }
.dck-fb-tag { flex-shrink: 0; font-size: 10px; font-weight: 800; letter-spacing: .08em;
  padding: 2px 7px; border-radius: 999px; margin-top: 1px; }
.dck-fb-item.is-pace .dck-fb-tag { color: var(--dck-brand); background: var(--dck-soft); }
.dck-fb-item.is-watch .dck-fb-tag { color: var(--dck-warn); background: var(--dck-warn-soft); }
.dck-fb-item.is-trend .dck-fb-tag { color: var(--dck-deep); background: #EAF2EE; }

.dck-legend { display: flex; gap: 13px; flex-wrap: wrap; margin-top: 8px; font-size: 11px; color: var(--dck-t2); }
.dck-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; vertical-align: -1px; }
.dck-legend .lg-dot { background: var(--dck-brand); opacity: .45; border-radius: 50%; }
.dck-legend .lg-line { height: 3px; border-radius: 2px; background: var(--dck-brand); vertical-align: 0; }
.dck-legend .lg-goal { height: 2px; background: repeating-linear-gradient(90deg, var(--dck-bad) 0 4px, transparent 4px 7px); }

/* 热力：无记录→极浅；分值越高越翡翠；低分不再是刺眼警示红 */
.dck-heat { display: grid; grid-template-columns: repeat(7, 1fr); gap: 7px; }
.dck-heat-cell { text-align: center; }
.dck-heat-box { width: 100%; padding-top: 100%; border-radius: 9px; min-height: 20px;
  border: 1px solid transparent; transition: transform .15s; }
.dck-heat-box:hover { transform: scale(1.06); }
.dck-heat-box.lv-none { background: #EDF1EE; }
.dck-heat-box.lv-low { background: #CFE3D8; }
.dck-heat-box.lv-mid { background: #7FB8A0; }
.dck-heat-box.lv-hi { background: var(--dck-brand); box-shadow: 0 2px 8px -2px rgba(13,130,83,.45); }
.dck-heat-box.today { border-color: var(--dck-ink); }
.dck-heat-cell span { font-size: 9.5px; color: var(--dck-t4); font-variant-numeric: tabular-nums; }

.dck-rows { display: flex; flex-direction: column; }
/* v6 历史行改为可展开卡片：整行是一个 button 语义（role=button + tabIndex + aria-expanded），
   触控靶区给到 44px；行内不再 flex-wrap 散开，摘要固定一行，详情另起一块展开。 */
.dck-row { font-size: 13.5px; padding: 0; border-bottom: 1px solid var(--dck-line); }
.dck-row:last-child { border-bottom: none; }
.dck-row-main { display: flex; align-items: center; gap: 10px; min-height: var(--dck-tap);
  padding: 0 2px; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.dck-row:active .dck-row-main { background: rgba(13,130,83,.05); }
.dck-row-caret { display: grid; place-items: center; flex-shrink: 0; margin-left: auto;
  color: var(--dck-t4); transition: transform .2s cubic-bezier(.16,1,.3,1); }
.dck-row-caret.up { transform: rotate(180deg); }
.dck-row-detail { padding: 4px 2px 12px; border-top: 1px dashed var(--dck-line); margin-top: 2px; }
.dck-row-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 8px; }
.dck-row-grid span { font-size: 11.5px; color: var(--dck-t3); }
.dck-row-grid b { display: block; font-size: 13px; margin-top: 1px; font-weight: 700; }
.dck-row-grid b.ok { color: var(--dck-brand); }
.dck-row-grid b.no { color: var(--dck-t4); }
.dck-row-detail-note { margin: 10px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--dck-t2);
  padding: 8px 10px; background: var(--dck-sub); border-radius: 10px; }
.dck-row-load { width: 100%; min-height: var(--dck-tap); margin-top: 10px; border-radius: 10px;
  border: 1px solid var(--dck-line); background: var(--dck-soft); color: var(--dck-deep);
  font-size: 13px; font-weight: 700; cursor: pointer; touch-action: manipulation; }
.dck-row-load:active { transform: scale(.98); }
.dck-row:last-child { border-bottom: none; }
.dck-row-date { color: var(--dck-t2); font-variant-numeric: tabular-nums; min-width: 44px; }
.dck-row-w { font-weight: 700; }
.dck-row-bp { color: var(--dck-t2); font-size: 12px; }
.dck-row-score { margin-left: auto; font-weight: 800; }
.dck-row-score.s-hi { color: var(--dck-brand); }
.dck-row-score.s-mid { color: var(--dck-warn); }
.dck-row-score.s-low { color: var(--dck-t4); }
.dck-row-note { width: 100%; font-size: 12px; color: var(--dck-t2); }

.dck-plan { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.dck-plan > div { border: 1px solid var(--dck-line); border-radius: 14px; padding: 12px 14px; }
/* v6 方案就地编辑：两字段 + 保存键一行排布，窄屏 wrap 成两行 */
.dck-plan-edit { display: flex; align-items: flex-end; gap: 8px; flex-wrap: wrap;
  margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--dck-line); }
.dck-plan-field { display: flex; flex-direction: column; gap: 4px; flex: 1 1 118px; min-width: 0; }
.dck-plan-field label { font-size: 11px; font-weight: 600; color: var(--dck-t3); }
.dck-plan-field input { height: var(--dck-tap); border: 1px solid var(--dck-line); border-radius: 10px;
  padding: 0 10px; font-size: 16px; color: var(--dck-ink); background: #fff; width: 100%;
  font-variant-numeric: tabular-nums; } /* 16px 防 iOS 聚焦缩放 */
.dck-plan-field input:focus { outline: none; border-color: var(--dck-brand); box-shadow: var(--dck-ring); }
.dck-plan-save { height: var(--dck-tap); padding: 0 18px; border: 1px solid var(--dck-brand);
  background: var(--dck-soft); color: var(--dck-deep); border-radius: 10px; font-size: 13.5px;
  font-weight: 700; cursor: pointer; flex-shrink: 0;
  touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.dck-plan-save:active { transform: scale(.97); }
.dck-plan-hint { margin: 9px 0 0; font-size: 11.5px; line-height: 1.6; color: var(--dck-t4); }
.dck-plan b { display: block; font-size: 19px; font-weight: 800; color: var(--dck-deep); }
.dck-plan span { font-size: 11.5px; color: var(--dck-t2); }
.dck-ul { margin: 0; padding-left: 18px; font-size: 13.5px; line-height: 2; color: var(--dck-ink); }
.dck-card.warn { border: 1px solid var(--dck-bad-line); background: var(--dck-bad-soft); }
.dck-card.warn .dck-sec svg { color: var(--dck-bad); }

.dck-svg { width: 100%; height: auto; display: block; }
/* 触控探针：吸顶指标条 + 滑动区 + 提示。
   touch-action:none 是关键——不写的话移动端浏览器会把手势判成页面滚动，
   手指按在图上拖动时页面会跟着一起滑，探针只会被拖出视口。 */
.dck-probe { margin: 0 -2px; }
.dck-probe-bar { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
  margin-bottom: 6px; padding-bottom: 7px; border-bottom: 1px solid var(--dck-line); }
.dck-probe-l { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.dck-probe-date { font-size: 11.5px; color: var(--dck-t3); font-variant-numeric: tabular-nums; white-space: nowrap; }
.dck-probe-w { display: flex; align-items: baseline; gap: 3px; }
.dck-probe-w b { font-size: 19px; font-weight: 800; color: var(--dck-ink);
  font-variant-numeric: tabular-nums; letter-spacing: -.02em; }
.dck-probe-w i { font-style: normal; font-size: 11px; color: var(--dck-t3); font-weight: 600; }
.dck-probe-r { display: flex; flex-direction: column; align-items: flex-end; gap: 1px;
  font-size: 11px; color: var(--dck-t3); white-space: nowrap; }
.dck-probe-r b { color: var(--dck-deep); font-weight: 700; font-variant-numeric: tabular-nums; }
.dck-probe-zone { touch-action: none; -webkit-user-select: none; user-select: none; cursor: ew-resize; }
.dck-probe-hint { margin-top: 5px; text-align: center; font-size: 10.5px; color: var(--dck-t4); }
.dck-ping { transform-box: fill-box; transform-origin: center;
  animation: dckPing 2.2s cubic-bezier(0, 0, .2, 1) infinite; }
@keyframes dckPing { 0% { transform: scale(.4); opacity: .5; } 80%, 100% { transform: scale(2.6); opacity: 0; } }

/* 底部导航（浅色玻璃胶囊，移动端通栏 / 桌面悬浮） */
.dck-tabbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
  display: flex; justify-content: center; background: rgba(255,255,255,.92);
  backdrop-filter: blur(12px); border-top: 1px solid var(--dck-line);
  padding-bottom: env(safe-area-inset-bottom); }
/* v6 底栏由 4 项增至 5 项（新增「历程」）：宽屏悬浮胶囊 380 → 440，
   否则 5 个 max-width:160 的按钮在 380 内会被挤到 76px 宽、标签换行。
   375px 下每项约 75px，10.5px 标签仍放得下「今日/趋势/历程/成就/方案」两字。 */
.dck-tabbtn { flex: 1; max-width: 160px; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 9px 0 7px; background: none; border: none; color: var(--dck-t4);
  font-size: 10.5px; font-weight: 600; cursor: pointer; min-height: var(--dck-tap);
  white-space: nowrap;
  touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  transition: color .16s ease, transform .18s cubic-bezier(.34,1.56,.64,1); }
.dck-tabbtn:active { transform: scale(.92); }
.dck-tabbtn.on { color: var(--dck-deep); }
/* Toast 移到顶部：v4 固定在 bottom:78px（底栏上方），而备注/血压输入时软键盘弹起
   会把底部整块盖住，「已保存」提示正好落在键盘面板下面——用户改完体重看不到确认。
   顶部在键盘弹起时始终可见，且不与底部主操作区争位置。
   宽屏（≥640px）底栏是悬浮胶囊、两侧留白，Toast 仍居中即可。 */
.dck-toast { position: fixed; top: calc(14px + env(safe-area-inset-top)); left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 6px; background: var(--dck-ink); color: #fff; font-size: 12.5px;
  padding: 9px 16px; border-radius: 999px; box-shadow: 0 6px 24px rgba(0,0,0,.18); z-index: 60; max-width: 88vw;
  animation: dckToastIn .28s cubic-bezier(.16,1,.3,1) both; }
@keyframes dckToastIn { from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); } }

@media (min-width: 640px) {
  /* v7 桌面端布局修复。
     问题：.dck-main 有 max-width:560px + margin:auto，但 .dck-head（顶栏）与
     .dck-toast 都没有宽度约束 —— 顶栏因此被拉成 1080px 全宽，标题甩到最左、
     同步与连胜胶囊甩到最右，中间横跨一整个屏幕的空白；而下方卡片却挤在中间
     560px 里。两者不在同一条栅格上，视觉上直接散架。
     修法：把顶栏也收进与 .dck-main 相同的 560px 居中栏，三者左边缘对齐。
     （v6 为 375px 压缩首屏时把顶栏改成了紧凑 Hero，窄屏没问题；
      宽屏失去容器约束才暴露出来 —— 属 v6 的回归。） */
  .dck-head { max-width: 560px; margin: 0 auto; width: 100%; }
  /* 桌面端首屏不再需要为拇指让位，Hero 回到宽松排布：
     体重独占一行左对齐，两枚状态胶囊移到下方一行（窄屏时它们与体重同行，
     在 560px 以上会显得挤在标题右侧、像贴在字边）。 */
  .dck-hero { margin-top: 16px; }
  .dck-hero-top { flex-direction: column; align-items: flex-start; gap: 10px; }
  .dck-hero-num { font-size: 44px; }
  .dck-hero-pills { gap: 8px; justify-content: flex-start; }
  .dck-hero-none { font-size: 18px; }
  .dck-motto { font-size: 12.5px; padding: 9px 12px; margin-top: 12px; }

  .dck-tabbar { left: 50%; right: auto; transform: translateX(-50%); width: 440px;
    bottom: 20px; border: 1px solid var(--dck-line); border-radius: 999px; padding: 4px;
    box-shadow: 0 8px 30px rgba(20,32,26,.14); padding-bottom: 4px; }
  .dck-tabbtn { border-radius: 999px; }
  .dck-tabbtn.on { background: var(--dck-soft); }
  /* 悬浮胶囊离底 20px + 自身约 56px = 76px，再留呼吸余量。
     原 140px 是给移动端满宽底栏留的，桌面悬浮后这个值让最后一张卡下方空出过大空白。 */
  .dck-main { padding-top: 20px; padding-bottom: 112px; }
  /* 触控热区在桌面端收窄：三餐分段与底栏按钮不再需要 44px 拇指高度 */
  .dck-pill-btn { min-height: 38px; }
  .dck-tabbtn { min-height: 46px; }
}

/* 超宽屏（≥1100px）：560px 的窄栏在大屏上会显得局促，
   放宽到 640px 提升可读性，但不再继续放大——再宽单手操作距离过长。 */
@media (min-width: 1100px) {
  .dck-head, .dck-main { max-width: 640px; }
}

/* 动效降级：prefers-reduced-motion 下全部动效静止 */
@media (prefers-reduced-motion: reduce) {
  .dck-app *, .dck-app *::before, .dck-app *::after {
    animation-duration: .01ms !important; animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
`;
