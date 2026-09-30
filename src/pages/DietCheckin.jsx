import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Scale, Droplets, Footprints, Dumbbell, ShieldCheck, CheckCircle2, MinusCircle,
  XCircle, ClipboardCheck, TrendingUp, CalendarDays, Info, Flame, Target, Wheat,
  Sunrise, CloudSun, Moon, Check, UserRound, Trophy, MessageSquareHeart, LogIn,
} from 'lucide-react';
import { useAuth } from '../components/AuthGate';

/* ================================================================
   饮食打卡 · Diet Check-in v3
   多用户登录隔离（AuthGate + Bmob per-uid）· 每日打卡
   坚持：连续全勤 / 累计打卡 / 最高纪录 / 里程碑徽章
   反馈：今日寄语 + 打卡评语 + 本周数据反馈引擎（规则版）
   ================================================================ */

const LS_KEY = 'diet-checkin';

/* ---------- 主题（独立健康绿系） ---------- */
const C = {
  page: '#EFF3EE', card: '#FFFFFF', ink: '#16221C', text2: '#71837A', text4: '#A9B5AD',
  line: '#E1E8E2', green: '#0E8A5F', greenDeep: '#0B6B4A', greenSoft: '#E2F2EA',
  gold: '#A48830', goldSoft: '#F7F2E4', warn: '#B45309', warnSoft: '#FCF1E2',
  bad: '#D64545', badSoft: '#FBEAEA',
};

const MEALS = [
  { key: 'breakfast', label: '早餐', Icon: Sunrise },
  { key: 'lunch', label: '午餐', Icon: CloudSun },
  { key: 'dinner', label: '晚餐', Icon: Moon },
];
const MEAL_STATES = [
  { key: 'ok', label: '按方案', color: C.green, Icon: CheckCircle2 },
  { key: 'off', label: '小偏差', color: C.warn, Icon: MinusCircle },
  { key: 'bad', label: '破戒', color: C.bad, Icon: XCircle },
];

const PROFILE = {
  startWeight: 94, goal1: 87, goal2: 80,
  startDate: '2026-09-27', kcal: 2000, maxStreak: 0,
};

/* ---------- 鼓励语池 ---------- */
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
    '破戒一顿不至于报废一周，下一顿回正就行。',
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

export default function DietCheckin() {
  const { guard, authed, username, openLogin } = useAuth();
  const [tab, setTab] = useState('today');
  const [days, setDays] = useState({});
  const [profile, setProfile] = useState({ ...PROFILE });
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const dataRef = useRef({ version: 1, profile: { ...PROFILE }, days: {} });

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

  /* 本周反馈引擎（规则版） */
  const weeklyFeedback = useMemo(() => {
    const out = [];
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
      out.push('这周还没有打卡记录——不追求完美，先连续记 3 天。');
      return out;
    }
    if (rate7 >= 90) out.push(`本周完成率 ${rate7}%——执行非常稳，这正是维持期需要的系统。`);
    else if (rate7 >= 70) out.push(`本周完成率 ${rate7}%，整体在线，保持这个手感。`);
    else out.push(`本周完成率 ${rate7}%，节奏掉了不要紧——先恢复「每天称重 + 三餐」两个锚点。`);

    if (waterMiss >= 3) out.push(`有 ${waterMiss} 天喝水没到 2000ml——把水杯放桌上，饭后一杯最省力。`);
    if (stepsMiss >= 3) out.push(`有 ${stepsMiss} 天步数不足——晚餐后散步 15 分钟是最容易补的缺口。`);
    if (trainingCount < 2) out.push(`本周力量训练 ${trainingCount} 次（目标 4 次）——保肌肉靠它，给训练一个固定时间。`);
    if (junkDays >= 2) out.push(`破戒 ${junkDays} 天——别自责，把触发场景写进备注，下次提前绕开。`);

    if (wRecs.length >= 2) {
      const delta = Math.round((wRecs[wRecs.length - 1] - wRecs[0]) * 10) / 10;
      if (delta <= -0.5) out.push(`本周体重 ↓${Math.abs(delta)}kg——速率健康，继续。`);
      else if (delta >= 1) out.push(`本周体重 ↑${delta}kg——先查记录误差与钠（汤/蘸料），再谈脂肪。`);
      else if (recDays >= 5) out.push('体重基本持平——看 7 日均线；若连续 2-4 周不动，再按平台期流程处理。');
    }
    return out.slice(0, 5);
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
    if (t && t.junk) return '已保存。破戒一顿不致命，下一顿回正。';
    return '已保存';
  }, [days]);

  const doneCount = ['breakfast', 'lunch', 'dinner'].filter((k) => cur[k] === 'ok').length
    + (cur.water ? 1 : 0) + (cur.steps ? 1 : 0);

  return (
    <div className="dck-app">
      <style>{DCK_CSS}</style>

      <header className="dck-head">
        <div className="dck-head-top">
          <div>
            <div className="dck-brand">饮食打卡</div>
            <div className="dck-head-sub">{date === todayStr() ? '今天' : date} · 快速档 {PROFILE.kcal} kcal</div>
          </div>
          <div className={`dck-streak${streak > 0 ? ' on' : ''}`}>
            <Flame size={14} strokeWidth={2.4} />
            <span>{streak} 天</span>
          </div>
        </div>
        <div className="dck-hero">
          <div className="dck-hero-w">
            <span className="dck-hero-num">{latestW ?? '—'}</span>
            <span className="dck-hero-unit">kg</span>
          </div>
          <div className="dck-hero-meta">
            {latestW && <span>较起始 <b>−{(PROFILE.startWeight - latestW).toFixed(1)}</b> kg</span>}
            {ma7 && <span>7 日均线 <b>{ma7}</b></span>}
            <span>累计打卡 <b>{totalDays}</b> 天</span>
            <span>最高连续 <b>{profile.maxStreak || 0}</b> 天</span>
          </div>
        </div>
        <div className="dck-motto"><MessageSquareHeart size={13} /> {motto}</div>

        {/* 账号状态：多用户数据隔离入口 */}
        {authed ? (
          <div className="dck-acct on"><UserRound size={13} /> 账号 {username} · 数据云端同步中，多端可用</div>
        ) : (
          <button type="button" className="dck-acct login" onClick={() => openLogin()}>
            <LogIn size={13} /> 未登录——数据只在本机。点击登录，多设备同步 + 不怕丢
          </button>
        )}
      </header>

      <main className="dck-main">
        {!loaded ? (
          <div className="dck-empty">加载中…</div>
        ) : tab === 'today' ? (
          <>
            {/* 里程碑横幅 */}
            {streak > 0 && MILESTONES.includes(streak) && (
              <div className="dck-milestone">
                <Trophy size={16} />
                <span>{ENC.milestones[streak]}</span>
                <b>🏆 连续 {streak} 天达成</b>
              </div>
            )}

            <div className="dck-card dck-date-row">
              <CalendarDays size={16} style={{ color: C.green, flexShrink: 0 }} />
              <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value || todayStr())} />
              {date !== todayStr() && (
                <button type="button" className="dck-chip" onClick={() => setDate(todayStr())}>回到今天</button>
              )}
            </div>

            <section className="dck-card">
              <h3 className="dck-sec"><Scale size={15} /> 晨起体重</h3>
              <div className="dck-weight-row">
                <input
                  className="dck-weight-input"
                  type="number" step="0.1" inputMode="decimal" placeholder={latestW ? String(latestW) : '93.2'}
                  value={cur.weight} onChange={(e) => patchDay({ weight: e.target.value })}
                />
                <span className="dck-weight-unit">kg</span>
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
                <ShieldCheck size={14} style={{ color: C.text2, flexShrink: 0 }} />
                <input type="number" inputMode="numeric" placeholder="收缩压" value={cur.bpSys} onChange={(e) => patchDay({ bpSys: e.target.value })} />
                <span className="dck-bp-slash">/</span>
                <input type="number" inputMode="numeric" placeholder="舒张压" value={cur.bpDia} onChange={(e) => patchDay({ bpDia: e.target.value })} />
                <span className="dck-bp-unit">mmHg · 选填</span>
              </div>
            </section>

            <section className="dck-card">
              <h3 className="dck-sec"><Wheat size={15} /> 三餐执行</h3>
              {MEALS.map(({ key, label, Icon }) => (
                <div key={key} className="dck-meal">
                  <div className="dck-meal-head"><Icon size={15} strokeWidth={2} style={{ color: C.text2 }} /><span>{label}</span></div>
                  <div className="dck-seg">
                    {MEAL_STATES.map(({ key: sk, label: sl, color, Icon: SIcon }) => (
                      <button
                        key={sk} type="button"
                        className={`dck-seg-btn${cur[key] === sk ? ' on' : ''}`}
                        style={cur[key] === sk ? { background: color, borderColor: color } : {}}
                        onClick={() => patchDay({ [key]: cur[key] === sk ? '' : sk })}
                      >
                        <SIcon size={15} strokeWidth={2.2} /> {sl}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section className="dck-card">
              <h3 className="dck-sec"><Droplets size={15} /> 习惯四件套</h3>
              <div className="dck-habits">
                <button type="button" className={`dck-habit${cur.water ? ' on' : ''}`} onClick={() => patchDay({ water: !cur.water })}>
                  <Droplets size={18} /><b>喝水 2000ml+</b><span>{cur.water ? '已达标' : '点击达标'}</span>
                </button>
                <button type="button" className={`dck-habit${cur.steps ? ' on' : ''}`} onClick={() => patchDay({ steps: !cur.steps })}>
                  <Footprints size={18} /><b>步数 8000+</b><span>{cur.steps ? '已达标' : '点击达标'}</span>
                </button>
                <button type="button" className={`dck-habit${cur.training ? ' on' : ''}`} onClick={() => patchDay({ training: !cur.training })}>
                  <Dumbbell size={18} /><b>力量训练</b><span>{cur.training ? '已练' : '休息/未练'}</span>
                </button>
                <button type="button" className={`dck-habit clean${!cur.junk ? ' on' : ''}`} onClick={() => patchDay({ junk: !cur.junk })}>
                  <ShieldCheck size={18} /><b>无破戒</b><span>{cur.junk ? '今天破戒了' : '零饮料零食'}</span>
                </button>
              </div>
              <div className="dck-donebar">
                <div className="dck-donebar-track"><i style={{ width: `${(doneCount / 5) * 100}%` }} /></div>
                <span>今日 {doneCount}/5</span>
              </div>
              <div className="dck-praise">
                <MessageSquareHeart size={13} /> {doneCount >= 5 ? pickFrom(ENC.full, seedOf('done' + date)) : doneCount >= 3 ? pickFrom(ENC.partial, seedOf('done' + date)) : '点满五格，今天就赢了。'}
              </div>
            </section>

            <section className="dck-card">
              <h3 className="dck-sec"><Info size={15} /> 备注</h3>
              <textarea
                className="dck-note" rows={2}
                placeholder="应酬 / 聚餐 / 状态 / 身体反应…"
                value={cur.note} onChange={(e) => patchDay({ note: e.target.value })}
              />
            </section>

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

            {/* 里程碑徽章墙 */}
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

            <section className="dck-card">
              <h3 className="dck-sec"><MessageSquareHeart size={15} /> 本周反馈</h3>
              <div className="dck-fb">
                {weeklyFeedback.map((m, i) => <p key={i}>{m}</p>)}
              </div>
            </section>

            <section className="dck-card">
              <h3 className="dck-sec"><TrendingUp size={15} /> 体重趋势（近 30 次）</h3>
              {weights.length >= 2 ? (
                <>
                  <TrendChart weights={weights} goal1={PROFILE.goal1} />
                  <div className="dck-legend">
                    <span><i style={{ background: '#B8C4BC' }} /> 单日</span>
                    <span><i style={{ background: C.green }} /> 7 日均线（看它）</span>
                    <span><i style={{ background: C.bad, height: 2 }} /> 目标 87kg</span>
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
                    const bg = sc < 0 ? '#E7ECE8' : sc >= 80 ? C.green : sc >= 50 ? C.warn : sc > 0 ? C.bad : '#E7ECE8';
                    cells.push(
                      <div key={k} className="dck-heat-cell">
                        <div className="dck-heat-box" style={{ background: bg }} />
                        <span>{d.getDate()}</span>
                      </div>,
                    );
                    d.setDate(d.getDate() + 1);
                  }
                  return cells;
                })()}
              </div>
            </section>

            <section className="dck-card">
              <h3 className="dck-sec"><ClipboardCheck size={15} /> 记录</h3>
              {sortedDates.length === 0 ? <div className="dck-empty">还没有记录</div> : (
                <div className="dck-rows">
                  {[...sortedDates].reverse().slice(0, 20).map((k) => {
                    const d = days[k];
                    const sc = dayScore(d);
                    return (
                      <div key={k} className="dck-row">
                        <span className="dck-row-date">{k.slice(5)}</span>
                        <span className="dck-row-w">{d.weight ? `${d.weight} kg` : '—'}</span>
                        {d.bpSys ? <span className="dck-row-bp">{d.bpSys}/{d.bpDia}</span> : <span className="dck-row-bp">—</span>}
                        <span className="dck-row-score" style={{ color: sc >= 80 ? C.green : sc >= 50 ? C.warn : C.bad }}>{sc} 分</span>
                        {d.note ? <span className="dck-row-note">{d.note}</span> : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="dck-card">
              <h3 className="dck-sec"><Target size={15} /> 当前执行档：快速档（限时 8 周）</h3>
              <div className="dck-plan">
                <div><b>2000</b><span>kcal/天（下限 1900）</span></div>
                <div><b>≥120g</b><span>蛋白质/天</span></div>
                <div><b>0.75-1.0</b><span>kg/周 速率</span></div>
                <div><b>94→87→80</b><span>kg 阶段目标</span></div>
              </div>
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
      </main>

      <nav className="dck-tabbar">
        {[
          { key: 'today', label: '今日', Icon: ClipboardCheck },
          { key: 'trend', label: '趋势', Icon: TrendingUp },
          { key: 'plan', label: '方案', Icon: Info },
        ].map(({ key, label, Icon }) => (
          <button key={key} type="button" className={`dck-tabbtn${tab === key ? ' on' : ''}`} onClick={() => setTab(key)}>
            <Icon size={19} strokeWidth={tab === key ? 2.4 : 2} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {toast && <div className="dck-toast"><Check size={14} strokeWidth={3} /> {savedToast}</div>}
    </div>
  );
}

/* ---------------- 体重折线（纯 SVG） ---------------- */
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
  const line = (arr) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dck-svg" role="img" aria-label="体重趋势">
      {[0, 0.5, 1].map((t) => {
        const v = min + t * (max - min);
        return (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="#EAF0EB" strokeWidth="1" />
            <text x={PL - 6} y={y(v)} textAnchor="end" dominantBaseline="central" fontSize="10" fill={C.text2}>{v.toFixed(1)}</text>
          </g>
        );
      })}
      {goal1 >= min && goal1 <= max && (
        <line x1={PL} x2={W - PR} y1={y(goal1)} y2={y(goal1)} stroke={C.bad} strokeWidth="1.2" strokeDasharray="5 4" />
      )}
      <path d={line(ma)} fill="none" stroke={C.green} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => <circle key={d.date} cx={x(i)} cy={y(d.v)} r="2.8" fill="#B8C4BC" />)}
      {data.map((d, i) => (
        (i === data.length - 1 || i % Math.ceil(data.length / 6) === 0)
          ? <text key={`t${d.date}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={C.text2}>{d.date.slice(5)}</text>
          : null
      ))}
    </svg>
  );
}

/* ---------------- 样式 ---------------- */
const DCK_CSS = `
.dck-app { min-height: 100vh; background: ${C.page}; color: ${C.ink};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased; }
.dck-head { background: ${C.greenDeep}; color: #fff; padding: max(18px, env(safe-area-inset-top)) 18px 16px; }
.dck-head-top { display: flex; align-items: center; justify-content: space-between; }
.dck-brand { font-size: 17px; font-weight: 700; letter-spacing: .02em; }
.dck-head-sub { font-size: 12px; opacity: .72; margin-top: 2px; }
.dck-streak { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700;
  padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,.14); color: #CFE9DC; }
.dck-streak.on { background: ${C.goldSoft}; color: ${C.gold}; }
.dck-hero { margin-top: 12px; }
.dck-hero-w { display: flex; align-items: baseline; gap: 6px; }
.dck-hero-num { font-size: 44px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; font-variant-numeric: tabular-nums; }
.dck-hero-unit { font-size: 15px; opacity: .7; }
.dck-hero-meta { display: flex; gap: 10px 12px; flex-wrap: wrap; margin-top: 8px; font-size: 12px; opacity: .78; }
.dck-hero-meta b { font-weight: 700; }
.dck-motto { display: flex; align-items: flex-start; gap: 6px; margin-top: 12px; font-size: 12.5px;
  line-height: 1.6; color: #DFF0E7; background: rgba(255,255,255,.09); border-radius: 10px; padding: 9px 11px; }
.dck-motto svg { flex-shrink: 0; margin-top: 1px; }
.dck-acct { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 12px;
  padding: 8px 11px; border-radius: 10px; width: 100%; }
.dck-acct.on { background: rgba(255,255,255,.1); color: #CFE9DC; }
.dck-acct.login { background: ${C.goldSoft}; color: ${C.gold}; border: none; font-weight: 600; cursor: pointer; }
.dck-main { max-width: 560px; margin: 0 auto; padding: 14px 14px calc(96px + env(safe-area-inset-bottom)); }
.dck-card { background: ${C.card}; border-radius: 16px; padding: 16px; margin-bottom: 12px;
  box-shadow: 0 1px 2px rgba(20,32,26,.04); }
.dck-sec { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 700; margin: 0 0 12px; }
.dck-sec svg { color: ${C.green}; }
.dck-date-row { display: flex; align-items: center; gap: 10px; }
.dck-date-row input { flex: 0 0 auto; border: 1px solid ${C.line}; border-radius: 10px; padding: 9px 12px; font-size: 15px; color: ${C.ink}; background: #fff; }
.dck-chip { border: 1px solid ${C.green}44; background: ${C.greenSoft}; color: ${C.greenDeep};
  font-size: 12.5px; font-weight: 600; padding: 7px 12px; border-radius: 999px; cursor: pointer; }
.dck-weight-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dck-weight-input { width: 132px; height: 52px; border: 1.5px solid ${C.line}; border-radius: 12px;
  font-size: 24px; font-weight: 700; text-align: center; color: ${C.ink}; background: #fff; }
.dck-weight-input:focus { outline: none; border-color: ${C.green}; }
.dck-weight-unit { font-size: 14px; color: ${C.text2}; }
.dck-delta { margin-top: 8px; font-size: 12.5px; font-weight: 600; padding: 5px 10px; border-radius: 8px; display: inline-block; }
.dck-delta.good { color: ${C.greenDeep}; background: ${C.greenSoft}; }
.dck-delta.warn { color: ${C.warn}; background: ${C.warnSoft}; }
.dck-bp-row { display: flex; align-items: center; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.dck-bp-row input { width: 96px; height: 40px; border: 1px solid ${C.line}; border-radius: 10px; padding: 0 10px;
  font-size: 15px; color: ${C.ink}; background: #fff; }
.dck-bp-slash { color: ${C.text4}; font-weight: 600; }
.dck-bp-unit { font-size: 11.5px; color: ${C.text4}; }
.dck-meal { margin-bottom: 14px; }
.dck-meal:last-of-type { margin-bottom: 0; }
.dck-meal-head { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: ${C.text2}; margin-bottom: 7px; }
.dck-seg { display: flex; gap: 8px; }
.dck-seg-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  height: 44px; border-radius: 12px; border: 1.5px solid ${C.line}; background: #fff;
  color: ${C.text2}; font-size: 14px; font-weight: 600; cursor: pointer; transition: transform .06s; }
.dck-seg-btn:active { transform: scale(.97); }
.dck-seg-btn.on { color: #fff !important; }
.dck-habits { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.dck-habit { display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
  border: 1.5px solid ${C.line}; background: #fff; border-radius: 14px; padding: 13px 14px;
  color: ${C.text2}; cursor: pointer; text-align: left; transition: transform .06s; }
.dck-habit:active { transform: scale(.98); }
.dck-habit.on { border-color: ${C.green}66; background: ${C.greenSoft}; color: ${C.greenDeep}; }
.dck-habit b { font-size: 14px; color: ${C.ink}; }
.dck-habit.on b { color: ${C.greenDeep}; }
.dck-habit span { font-size: 11.5px; }
.dck-donebar { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.dck-donebar-track { flex: 1; height: 8px; border-radius: 999px; background: ${C.line}; overflow: hidden; }
.dck-donebar-track i { display: block; height: 100%; background: ${C.green}; border-radius: 999px; transition: width .3s; }
.dck-donebar span { font-size: 12px; font-weight: 700; color: ${C.greenDeep}; }
.dck-praise { display: flex; align-items: flex-start; gap: 6px; margin-top: 10px; font-size: 12.5px;
  line-height: 1.55; color: ${C.greenDeep}; background: ${C.greenSoft}; border-radius: 10px; padding: 9px 11px; }
.dck-praise svg { flex-shrink: 0; margin-top: 2px; }
.dck-note { width: 100%; border: 1px solid ${C.line}; border-radius: 12px; padding: 10px 12px;
  font-size: 14px; color: ${C.ink}; resize: none; font-family: inherit; background: #fff; }
.dck-foot { text-align: center; font-size: 11px; color: ${C.text4}; padding: 6px 0 10px; }
.dck-stat4 { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 12px; }
.dck-stat4 > div { background: ${C.card}; border-radius: 14px; padding: 13px 14px; }
.dck-stat4 b { display: block; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.dck-stat4 span { font-size: 11.5px; color: ${C.text2}; }
.dck-milestone { display: flex; align-items: center; gap: 9px; background: ${C.goldSoft};
  border: 1.5px solid ${C.gold}55; color: ${C.gold}; border-radius: 14px; padding: 12px 14px; margin-bottom: 12px;
  font-size: 13px; font-weight: 600; }
.dck-milestone svg { flex-shrink: 0; }
.dck-milestone b { margin-left: auto; white-space: nowrap; }
.dck-badges { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.dck-badge { border: 1.5px solid ${C.line}; border-radius: 12px; text-align: center; padding: 10px 4px; color: ${C.text4}; }
.dck-badge b { display: block; font-size: 17px; font-weight: 800; }
.dck-badge span { font-size: 10.5px; }
.dck-badge.got { border-color: ${C.gold}66; background: ${C.goldSoft}; color: ${C.gold}; }
.dck-badges-note { margin-top: 10px; font-size: 12px; color: ${C.text2}; text-align: center; }
.dck-fb p { margin: 0 0 9px; font-size: 13.5px; line-height: 1.65; color: ${C.ink};
  padding-left: 12px; border-left: 3px solid ${C.greenSoft}; }
.dck-fb p:last-child { margin-bottom: 0; }
.dck-legend { display: flex; gap: 13px; flex-wrap: wrap; margin-top: 8px; font-size: 11px; color: ${C.text2}; }
.dck-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; vertical-align: -1px; }
.dck-heat { display: grid; grid-template-columns: repeat(7, 1fr); gap: 7px; }
.dck-heat-cell { text-align: center; }
.dck-heat-box { width: 100%; padding-top: 100%; border-radius: 9px; min-height: 20px; }
.dck-heat-cell span { font-size: 10px; color: ${C.text4}; }
.dck-rows { display: flex; flex-direction: column; }
.dck-row { display: flex; align-items: center; gap: 10px; font-size: 13.5px; padding: 9px 2px;
  border-bottom: 1px solid ${C.line}; flex-wrap: wrap; }
.dck-row:last-child { border-bottom: none; }
.dck-row-date { color: ${C.text2}; font-variant-numeric: tabular-nums; min-width: 44px; }
.dck-row-w { font-weight: 700; }
.dck-row-bp { color: ${C.text2}; font-size: 12px; }
.dck-row-score { margin-left: auto; font-weight: 800; }
.dck-row-note { width: 100%; font-size: 12px; color: ${C.text2}; }
.dck-plan { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.dck-plan > div { border: 1px solid ${C.line}; border-radius: 14px; padding: 12px 14px; }
.dck-plan b { display: block; font-size: 19px; font-weight: 800; color: ${C.greenDeep}; }
.dck-plan span { font-size: 11.5px; color: ${C.text2}; }
.dck-ul { margin: 0; padding-left: 18px; font-size: 13.5px; line-height: 2; color: ${C.ink}; }
.dck-card.warn { border: 1.5px solid ${C.bad}44; background: ${C.badSoft}; }
.dck-card.warn .dck-sec svg { color: ${C.bad}; }
.dck-empty { font-size: 13.5px; color: ${C.text2}; text-align: center; padding: 24px 0; }
.dck-tabbar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
  display: flex; justify-content: center; background: rgba(255,255,255,.96);
  backdrop-filter: blur(10px); border-top: 1px solid ${C.line};
  padding-bottom: env(safe-area-inset-bottom); }
.dck-tabbtn { flex: 1; max-width: 160px; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 9px 0 7px; background: none; border: none; color: ${C.text4}; font-size: 10.5px; font-weight: 600; cursor: pointer; }
.dck-tabbtn.on { color: ${C.greenDeep}; }
.dck-toast { position: fixed; bottom: calc(78px + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 6px; background: ${C.ink}; color: #fff; font-size: 12.5px;
  padding: 9px 16px; border-radius: 999px; box-shadow: 0 6px 24px rgba(0,0,0,.18); z-index: 60; max-width: 88vw; }
@media (min-width: 640px) {
  .dck-tabbar { left: 50%; right: auto; transform: translateX(-50%); width: 380px;
    bottom: 20px; border: 1px solid ${C.line}; border-radius: 999px; padding: 4px;
    box-shadow: 0 8px 30px rgba(20,32,26,.14); padding-bottom: 4px; }
  .dck-tabbtn { border-radius: 999px; }
  .dck-tabbtn.on { background: ${C.greenSoft}; }
  .dck-main { padding-top: 20px; padding-bottom: 140px; }
}
`;
