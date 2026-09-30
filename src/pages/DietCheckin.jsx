import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Scale, Droplets, Footprints, Dumbbell, ShieldCheck, CheckCircle2, MinusCircle,
  XCircle, ClipboardCheck, TrendingUp, CalendarDays, Info, Flame, Target, Wheat,
} from 'lucide-react';
import { useAuth } from '../components/AuthGate';

/* ================================================================
   饮食打卡 · Diet Check-in
   体重 + 三餐 + 饮水/步数/训练/破戒 + 血压 的每日打卡与趋势
   数据经共享层 electronAPI（登录后走 Bmob 云端隔离，未登录走本地）
   ================================================================ */

const LS_KEY = 'diet-checkin';

const GOLD = '#A48830';
const GOLD_SOFT = '#F7F2E4';
const INK = '#1F2937';
const TEXT2 = '#6B7280';
const LINE = '#E5E7EB';
const CARD = '#FFFFFF';
const PAGE = '#F7F8FA';
const OK = '#16A34A';
const WARN = '#D97706';
const BAD = '#DC2626';

const MEALS = [
  { key: 'breakfast', label: '早餐', icon: Wheat },
  { key: 'lunch', label: '午餐', icon: 'lunch' },
  { key: 'dinner', label: '晚餐', icon: 'moon' },
];
const MEAL_STATES = [
  { key: 'ok', label: '按方案', color: OK, Icon: CheckCircle2 },
  { key: 'off', label: '小偏差', color: WARN, Icon: MinusCircle },
  { key: 'bad', label: '破戒', color: BAD, Icon: XCircle },
];

const PROFILE = {
  startWeight: 94,
  goal1: 87,
  goal2: 80,
  startDate: '2026-09-27',
  kcal: 2000,
  protein: 120,
  proteinMin: 115,
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const emptyDay = () => ({
  weight: '',
  bpSys: '', bpDia: '',
  breakfast: '', lunch: '', dinner: '',
  water: false, steps: false, training: false, junk: false,
  note: '',
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
  const { guard } = useAuth();
  const [tab, setTab] = useState('today');
  const [days, setDays] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [toast, setToast] = useState(null);
  const toastRef = useRef(null);
  const dataRef = useRef({ version: 1, profile: PROFILE, days: {} });

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 1600);
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
        }
      })
      .catch((e) => console.warn('load diet-checkin failed:', e))
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback((nextDays) => {
    if (!guard()) return;
    const next = { ...dataRef.current, days: nextDays };
    dataRef.current = next;
    setDays(nextDays);
    window.electronAPI?.saveData(LS_KEY, next);
  }, [guard]);

  const patchDay = (patch) => {
    const cur = days[date] || emptyDay();
    persist({ ...days, [date]: { ...cur, ...patch } });
  };

  const cur = days[date] || emptyDay();
  const sortedDates = useMemo(
    () => Object.keys(days).filter((d) => days[d] && (days[d].weight || dayScore(days[d]) > 0)).sort(),
    [days],
  );
  const weights = useMemo(
    () => sortedDates.filter((d) => days[d].weight).map((d) => ({ date: d, v: parseFloat(days[d].weight) })),
    [days, sortedDates],
  );
  const latestW = weights.length ? weights[weights.length - 1].v : null;
  const ma7 = useMemo(() => {
    if (weights.length < 3) return null;
    const tail = weights.slice(-7);
    return Math.round((tail.reduce((a, b) => a + b.v, 0) / tail.length) * 10) / 10;
  }, [weights]);

  const streak = useMemo(() => {
    let n = 0;
    const d = new Date();
    // 今天未打卡不打断连续记录：从今天开始往回数，跳过没有记录的今天
    if (!dayComplete(days[todayStr()])) d.setDate(d.getDate() - 1);
    for (;;) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dayComplete(days[k])) { n += 1; d.setDate(d.getDate() - 1); } else break;
    }
    return n;
  }, [days]);

  const rate7 = useMemo(() => {
    const out = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const rec = days[k];
      if (rec) out.push(dayScore(rec));
      d.setDate(d.getDate() - 1);
    }
    return out.length ? Math.round(out.reduce((a, b) => a + b, 0) / out.length) : 0;
  }, [days]);

  const mealStateBtn = (mealKey, mealLabel) => (
    <div className="dck-meal">
      <div className="dck-meal-label">{mealLabel}</div>
      <div className="dck-seg">
        {MEAL_STATES.map(({ key, label, color, Icon }) => (
          <button
            key={key}
            type="button"
            className={`dck-seg-btn${cur[mealKey] === key ? ' dck-on' : ''}`}
            style={cur[mealKey] === key ? { color, borderColor: color, background: `${color}14` } : {}}
            onClick={() => patchDay({ [mealKey]: cur[mealKey] === key ? '' : key })}
          >
            <Icon size={14} strokeWidth={2.2} /> {label}
          </button>
        ))}
      </div>
    </div>
  );

  const toggleBtn = (field, label, Icon) => (
    <button
      type="button"
      className={`dck-toggle${cur[field] ? ' dck-tgl-on' : ''}`}
      onClick={() => patchDay({ [field]: !cur[field] })}
    >
      <Icon size={16} strokeWidth={2} />
      <span>{label}</span>
      <span className="dck-toggle-mark">{cur[field] ? '已达标' : '未达标'}</span>
    </button>
  );

  return (
    <div className="dck-page">
      <style>{DCK_CSS}</style>

      {/* 顶部 tabs */}
      <div className="dck-tabs">
        {[
          { key: 'today', label: '今日打卡', Icon: ClipboardCheck },
          { key: 'trend', label: '趋势', Icon: TrendingUp },
          { key: 'plan', label: '方案速查', Icon: Info },
        ].map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            className={`dck-tab${tab === key ? ' dck-tab-on' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={15} strokeWidth={2} /> {label}
          </button>
        ))}
      </div>

      {!loaded ? (
        <div className="dck-loading">加载中…</div>
      ) : tab === 'today' ? (
        <>
          {/* 概览条 */}
          <div className="dck-stats">
            <div className="dck-stat">
              <div className="dck-stat-v">{latestW ? `${latestW}` : '—'}</div>
              <div className="dck-stat-l"><Scale size={12} /> 最新体重 kg</div>
            </div>
            <div className="dck-stat">
              <div className="dck-stat-v">{latestW ? Math.max(0, Math.round((PROFILE.startWeight - latestW) * 10) / 10) : '—'}</div>
              <div className="dck-stat-l"><Flame size={12} /> 已减 kg（起始 94）</div>
            </div>
            <div className="dck-stat">
              <div className="dck-stat-v">{streak}</div>
              <div className="dck-stat-l"><Flame size={12} /> 连续全勤 天</div>
            </div>
            <div className="dck-stat">
              <div className="dck-stat-v">{rate7}%</div>
              <div className="dck-stat-l"><Target size={12} /> 近 7 日完成率</div>
            </div>
          </div>

          {/* 日期 */}
          <div className="dck-card dck-date-row">
            <CalendarDays size={16} style={{ color: GOLD }} />
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value || todayStr())}
            />
            {date === todayStr() && <span className="dck-today-badge">今天</span>}
          </div>

          {/* 体重与血压 */}
          <div className="dck-card">
            <div className="dck-card-title"><Scale size={15} /> 晨起体重（kg）</div>
            <div className="dck-inline">
              <input
                type="number" step="0.1" inputMode="decimal" placeholder="如 93.2"
                value={cur.weight}
                onChange={(e) => patchDay({ weight: e.target.value })}
              />
              {ma7 && <span className="dck-hint">7 日均线 {ma7} kg</span>}
              {latestW && cur.weight && parseFloat(cur.weight) < latestW && date === todayStr() && (
                <span className="dck-hint dck-hint-good">较上一次 ↓{(latestW - parseFloat(cur.weight)).toFixed(1)} kg</span>
              )}
            </div>
            <div className="dck-card-title" style={{ marginTop: 12 }}><ShieldCheck size={15} /> 血压（选填，每周 2-3 次）</div>
            <div className="dck-inline">
              <input
                type="number" inputMode="numeric" placeholder="收缩压" style={{ maxWidth: 110 }}
                value={cur.bpSys} onChange={(e) => patchDay({ bpSys: e.target.value })}
              />
              <span className="dck-bp-slash">/</span>
              <input
                type="number" inputMode="numeric" placeholder="舒张压" style={{ maxWidth: 110 }}
                value={cur.bpDia} onChange={(e) => patchDay({ bpDia: e.target.value })}
              />
              <span className="dck-hint">mmHg · 复诊带给医生</span>
            </div>
          </div>

          {/* 三餐 */}
          <div className="dck-card">
            <div className="dck-card-title"><Wheat size={15} /> 三餐执行</div>
            {MEALS.map((m) => mealStateBtn(m.key, m.label))}
          </div>

          {/* 习惯 */}
          <div className="dck-card">
            <div className="dck-card-title"><Droplets size={15} /> 今日习惯</div>
            <div className="dck-toggles">
              {toggleBtn('water', '喝水 ≥2000ml', Droplets)}
              {toggleBtn('steps', '步数 ≥8000', Footprints)}
              {toggleBtn('training', '力量训练', Dumbbell)}
              <button
                type="button"
                className={`dck-toggle${!cur.junk ? ' dck-tgl-on' : ''}`}
                onClick={() => patchDay({ junk: !cur.junk })}
              >
                <ShieldCheck size={16} strokeWidth={2} />
                <span>无破戒（饮料/零食）</span>
                <span className="dck-toggle-mark">{cur.junk ? '今天破戒了' : '无破戒'}</span>
              </button>
            </div>
          </div>

          {/* 备注 */}
          <div className="dck-card">
            <div className="dck-card-title"><Info size={15} /> 备注</div>
            <textarea
              className="dck-note"
              rows={2}
              placeholder="今天有什么特殊情况？（应酬/聚餐/状态/身体反应…）"
              value={cur.note}
              onChange={(e) => patchDay({ note: e.target.value })}
            />
          </div>

          <div className="dck-foot">每次点击自动保存（登录后云端同步，多端可用）</div>
        </>
      ) : tab === 'trend' ? (
        <>
          <div className="dck-card">
            <div className="dck-card-title"><TrendingUp size={15} /> 体重趋势（近 30 次记录）</div>
            {weights.length >= 2 ? (
              <TrendChart weights={weights} goal1={PROFILE.goal1} />
            ) : (
              <div className="dck-empty">再记录 1 次体重即可看到趋势曲线</div>
            )}
            {ma7 && (
              <div className="dck-chart-legend">
                <span><i style={{ background: '#9CA3AF' }} /> 单日体重</span>
                <span><i style={{ background: GOLD }} /> 7 日均线（看它，别看单日）</span>
                <span><i style={{ background: BAD, height: 2 }} /> 目标 87kg</span>
              </div>
            )}
          </div>

          <div className="dck-card">
            <div className="dck-card-title"><CalendarDays size={15} /> 近 14 天打卡热力</div>
            <div className="dck-grid14">
              {(() => {
                const cells = [];
                const d = new Date();
                d.setDate(d.getDate() - 13);
                for (let i = 0; i < 14; i++) {
                  const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const sc = days[k] ? dayScore(days[k]) : -1;
                  const bg = sc < 0 ? '#F3F4F6' : sc >= 80 ? OK : sc >= 50 ? WARN : sc > 0 ? BAD : '#F3F4F6';
                  cells.push(
                    <div key={k} className="dck-cell" title={`${k}：${sc < 0 ? '未打卡' : sc + ' 分'}`}>
                      <div className="dck-cell-box" style={{ background: bg }} />
                      <div className="dck-cell-d">{d.getDate()}</div>
                    </div>,
                  );
                  d.setDate(d.getDate() + 1);
                }
                return cells;
              })()}
            </div>
            <div className="dck-chart-legend">
              <span><i style={{ background: '#F3F4F6' }} /> 未打卡</span>
              <span><i style={{ background: BAD }} /> &lt;50 分</span>
              <span><i style={{ background: WARN }} /> 50-79 分</span>
              <span><i style={{ background: OK }} /> ≥80 分</span>
            </div>
          </div>

          <div className="dck-card">
            <div className="dck-card-title"><ClipboardCheck size={15} /> 打卡记录</div>
            {sortedDates.length === 0 ? (
              <div className="dck-empty">还没有记录</div>
            ) : (
              <div className="dck-rows">
                {[...sortedDates].reverse().slice(0, 15).map((k) => {
                  const d = days[k];
                  return (
                    <div key={k} className="dck-row">
                      <span className="dck-row-date">{k.slice(5)}</span>
                      <span className="dck-row-w">{d.weight ? `${d.weight} kg` : '—'}</span>
                      {d.bpSys ? <span className="dck-row-bp">{d.bpSys}/{d.bpDia}</span> : <span className="dck-row-bp">—</span>}
                      <span className="dck-row-score" style={{ color: dayScore(d) >= 80 ? OK : dayScore(d) >= 50 ? WARN : BAD }}>
                        {dayScore(d)} 分
                      </span>
                      {d.note ? <span className="dck-row-note">{d.note}</span> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="dck-card">
            <div className="dck-card-title"><Target size={15} /> 当前执行档：快速档（限时 8 周）</div>
            <div className="dck-plan-grid">
              <div className="dck-plan-item"><b>2000</b><span>kcal/天（下限 1900）</span></div>
              <div className="dck-plan-item"><b>≥120g</b><span>蛋白质/天</span></div>
              <div className="dck-plan-item"><b>0.75-1.0</b><span>kg/周 目标速率</span></div>
              <div className="dck-plan-item"><b>94→87→80</b><span>kg 阶段目标</span></div>
            </div>
          </div>
          <div className="dck-card">
            <div className="dck-card-title"><Droplets size={15} /> 每日清单</div>
            <ul className="dck-list">
              <li>水 2000-2500ml（尿淡黄即达标）</li>
              <li>盐 &lt;5g：不喝汤、不蘸料、腌制品不吃</li>
              <li>步数 8000-10000 + 每坐 1h 起身</li>
              <li>力量 4 练/周（8-15 次/组，不憋气）</li>
              <li>睡 7-9h，14:00 后不碰咖啡因</li>
              <li>蛋白 ≥120g：蛋 3-4 + 鸡胸 100g + 食堂荤菜</li>
            </ul>
          </div>
          <div className="dck-card dck-card-warn">
            <div className="dck-card-title"><ShieldCheck size={15} /> 红线（出现即回撤）</div>
            <ul className="dck-list">
              <li>头晕 / 心悸 / 乏力 → 当天回 2300 kcal 并复测血压</li>
              <li>连续 2 周掉重 &gt;1.5kg/周 → 加回 200 kcal</li>
              <li>快速档满 8 周 → 回标准档或插 2 周维持</li>
              <li>任何 &lt;1500 kcal 安排、减肥药 → 硬红线</li>
            </ul>
          </div>
          <div className="dck-foot">依据：《星历减重计划 v1.1》与体重管理知识库（2026-09）</div>
        </>
      )}

      {toast && <div className="dck-toast">✓ {toast}</div>}
    </div>
  );
}

/* ---------------- 体重折线（纯 SVG，无依赖） ---------------- */
function TrendChart({ weights, goal1 }) {
  const W = 640, H = 220, PAD_L = 40, PAD_R = 14, PAD_T = 14, PAD_B = 26;
  const data = weights.slice(-30);
  const vals = data.map((d) => d.v);
  const min = Math.min(...vals, goal1) - 0.6;
  const max = Math.max(...vals, goal1) + 0.6;
  const x = (i) => PAD_L + (i * (W - PAD_L - PAD_R)) / Math.max(1, data.length - 1);
  const y = (v) => PAD_T + ((max - v) * (H - PAD_T - PAD_B)) / (max - min);
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
            <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="#F3F4F6" strokeWidth="1" />
            <text x={PAD_L - 6} y={y(v)} textAnchor="end" dominantBaseline="central" fontSize="10" fill={TEXT2}>{v.toFixed(1)}</text>
          </g>
        );
      })}
      {goal1 >= min && goal1 <= max && (
        <line x1={PAD_L} x2={W - PAD_R} y1={y(goal1)} y2={y(goal1)} stroke={BAD} strokeWidth="1.2" strokeDasharray="5 4" />
      )}
      <path d={line(ma)} fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={d.date} cx={x(i)} cy={y(d.v)} r="2.6" fill="#9CA3AF" />
      ))}
      {data.map((d, i) => (
        (i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0) ? (
          <text key={`t${d.date}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={TEXT2}>{d.date.slice(5)}</text>
        ) : null
      ))}
    </svg>
  );
}

/* ---------------- 样式（dck 前缀，避免污染全局） ---------------- */
const DCK_CSS = `
.dck-page { max-width: 720px; margin: 0 auto; padding: 4px 4px 48px; color: ${INK}; }
.dck-tabs { display: flex; gap: 8px; margin: 10px 0 14px; }
.dck-tab { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px;
  border: 1px solid ${LINE}; background: #fff; color: ${TEXT2}; font-size: 13px; cursor: pointer; }
.dck-tab-on { border-color: ${GOLD}; color: ${GOLD}; background: ${GOLD_SOFT}; font-weight: 600; }
.dck-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
.dck-stat { background: ${CARD}; border: 1px solid ${LINE}; border-radius: 10px; padding: 10px 8px; text-align: center; }
.dck-stat-v { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
.dck-stat-l { display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; font-size: 11px; color: ${TEXT2}; }
.dck-card { background: ${CARD}; border: 1px solid ${LINE}; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; }
.dck-card-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: ${INK}; margin-bottom: 10px; }
.dck-card-title svg { color: ${GOLD}; }
.dck-date-row { display: flex; align-items: center; gap: 10px; }
.dck-date-row input { border: 1px solid ${LINE}; border-radius: 8px; padding: 6px 10px; font-size: 14px; color: ${INK}; }
.dck-today-badge { font-size: 11px; color: ${GOLD}; background: ${GOLD_SOFT}; border: 1px solid ${GOLD}33; padding: 2px 8px; border-radius: 999px; }
.dck-inline { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dck-inline input { border: 1px solid ${LINE}; border-radius: 8px; padding: 8px 10px; font-size: 15px; width: 130px; color: ${INK}; }
.dck-hint { font-size: 12px; color: ${TEXT2}; }
.dck-hint-good { color: ${OK}; font-weight: 600; }
.dck-bp-slash { color: ${TEXT2}; font-weight: 600; }
.dck-meal { margin-bottom: 12px; }
.dck-meal:last-child { margin-bottom: 0; }
.dck-meal-label { font-size: 12px; color: ${TEXT2}; margin-bottom: 6px; }
.dck-seg { display: flex; gap: 8px; flex-wrap: wrap; }
.dck-seg-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 999px;
  border: 1px solid ${LINE}; background: #fff; color: ${TEXT2}; font-size: 13px; cursor: pointer; }
.dck-toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.dck-toggle { display: flex; align-items: center; gap: 7px; padding: 10px 12px; border-radius: 10px;
  border: 1px solid ${LINE}; background: #fff; color: ${TEXT2}; font-size: 13px; cursor: pointer; text-align: left; }
.dck-tgl-on { border-color: ${OK}55; background: ${OK}0f; color: ${INK}; }
.dck-toggle-mark { margin-left: auto; font-size: 11px; }
.dck-note { width: 100%; border: 1px solid ${LINE}; border-radius: 8px; padding: 8px 10px; font-size: 13px;
  color: ${INK}; resize: vertical; font-family: inherit; }
.dck-foot { text-align: center; font-size: 11px; color: ${TEXT2}; margin-top: 6px; }
.dck-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); background: ${INK};
  color: #fff; font-size: 13px; padding: 9px 18px; border-radius: 999px; box-shadow: 0 6px 24px rgba(0,0,0,.18); z-index: 60; }
.dck-svg { width: 100%; height: auto; display: block; }
.dck-chart-legend { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 8px; font-size: 11px; color: ${TEXT2}; }
.dck-chart-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; vertical-align: -1px; }
.dck-empty { font-size: 13px; color: ${TEXT2}; padding: 16px 0; text-align: center; }
.dck-grid14 { display: grid; grid-template-columns: repeat(14, 1fr); gap: 4px; }
.dck-cell { text-align: center; }
.dck-cell-box { width: 100%; padding-top: 100%; border-radius: 6px; min-height: 18px; }
.dck-cell-d { font-size: 10px; color: ${TEXT2}; margin-top: 3px; }
.dck-rows { display: flex; flex-direction: column; gap: 6px; }
.dck-row { display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 7px 4px; border-bottom: 1px solid #F3F4F6; flex-wrap: wrap; }
.dck-row-date { color: ${TEXT2}; font-variant-numeric: tabular-nums; }
.dck-row-w { font-weight: 600; }
.dck-row-bp { color: ${TEXT2}; font-size: 12px; }
.dck-row-score { margin-left: auto; font-weight: 700; }
.dck-row-note { width: 100%; font-size: 12px; color: ${TEXT2}; padding-left: 2px; }
.dck-plan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.dck-plan-item { border: 1px solid ${LINE}; border-radius: 10px; padding: 10px 12px; }
.dck-plan-item b { display: block; font-size: 18px; color: ${GOLD}; }
.dck-plan-item span { font-size: 12px; color: ${TEXT2}; }
.dck-list { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.9; color: ${INK}; }
.dck-card-warn { border-color: ${BAD}44; background: ${BAD}06; }
@media (max-width: 560px) {
  .dck-stats { grid-template-columns: repeat(2, 1fr); }
  .dck-toggles { grid-template-columns: 1fr; }
  .dck-grid14 { grid-template-columns: repeat(7, 1fr); }
}
`;
