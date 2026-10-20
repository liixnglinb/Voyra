/* ============================================================
   血压记录 · HealthLog
   ------------------------------------------------------------
   大压（收缩压）· 小压（舒张压）· 心率（脉搏）· 测量时间 的日常记录：
   2×2 等长宽指标卡 + 步进出录入 + 实时分级评估 + 三线趋势图 +
   历史筛选 / 编辑 / 删除 + CSV / JSON / 门户卡片代码导出。

   原型来自桌面 voyra_health.html（用户提供的设计与交互稿），
   这里按站内工程约定重写为 React 页面：
     · 存储：userKey 本地键 + electronAPI 云端同步（与 ClassSchedule 同模式）
     · 写操作：useAuth().guard() 登录守卫，与日程 / 作业保持一致
     · 视觉：站内白卡 + 金强调 + 四色指标语义（红=大压 蓝=小压 绿=心率 琥珀=时间）
   ============================================================ */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  HeartPulse, ArrowUp, ArrowDown, Heart, Clock, Plus, Minus, Check,
  Trash2, Pencil, X, Download, Braces, Copy, RotateCcw, LineChart, ClipboardList, CalendarClock,
} from 'lucide-react';
import { useAuth } from '../components/AuthGate';
import { userKey } from '../lib/auth';

const LS_KEY = 'HealthBpData';
const CLOUD_KEY = 'health-bp-v1';
const LS_READ = () => userKey(LS_KEY);

const ACCENT = '#A48830';
const ACCENT_DARK = '#8A6D1F';
const ACCENT_SOFT = '#FFF9DF';
const ACCENT_LINE = 'rgba(164,136,48,.42)';

const PERIODS = ['晨起', '午后', '晚间', '运动后'];

/* 首次进入的示例数据（与用户提供的设计稿一致，数据弹窗里可一键重置回它） */
const DEFAULT_RECORDS = [
  { id: 'rec_1', sys: 118, dia: 76, hr: 72, time: '2026-10-19T08:00', period: '晨起', note: '晨起空腹静息测量' },
  { id: 'rec_2', sys: 121, dia: 78, hr: 75, time: '2026-10-18T21:30', period: '晚间', note: '睡前平静状态' },
  { id: 'rec_3', sys: 115, dia: 74, hr: 68, time: '2026-10-18T08:15', period: '晨起', note: '状态良好' },
  { id: 'rec_4', sys: 126, dia: 82, hr: 79, time: '2026-10-17T14:20', period: '午后', note: '午后咖啡后测量' },
  { id: 'rec_5', sys: 119, dia: 77, hr: 71, time: '2026-10-17T07:50', period: '晨起', note: '日常规律记录' },
  { id: 'rec_6', sys: 122, dia: 79, hr: 74, time: '2026-10-16T22:00', period: '晚间', note: '晚间散步后静息' },
  { id: 'rec_7', sys: 117, dia: 75, hr: 70, time: '2026-10-16T08:05', period: '晨起', note: '睡眠充足' },
];

/* 血压分级（常用临床口径）：偏低 <90/60 · 理想 <120/80 · 正常高值 <140/90 ·
   1级 <160/100 · 2级 其余。normal=true 计入达标率。 */
const EVALS = {
  low:   { label: '血压偏低', short: '偏低',     text: '#0369A1', bg: '#F0F9FF', line: '#BAE6FD', dot: '#0EA5E9', normal: false },
  ideal: { label: '理想血压', short: '理想',     text: '#047857', bg: '#ECFDF5', line: '#A7F3D0', dot: '#10B981', normal: true },
  high0: { label: '正常高值', short: '正常高值', text: '#B45309', bg: '#FFFBEB', line: '#FDE68A', dot: '#F59E0B', normal: true },
  high1: { label: '1级偏高',  short: '1级偏高',  text: '#C2410C', bg: '#FFF7ED', line: '#FED7AA', dot: '#F97316', normal: false },
  high2: { label: '2级偏高',  short: '偏高预警', text: '#BE123C', bg: '#FFF1F2', line: '#FECDD3', dot: '#F43F5E', normal: false },
};

function evaluateBP(sys, dia) {
  const s = Number(sys) || 0;
  const d = Number(dia) || 0;
  const pp = s - d;
  if (s < 90 || d < 60) return { ...EVALS.low, pp };
  if (s < 120 && d < 80) return { ...EVALS.ideal, pp };
  if (s < 140 && d < 90) return { ...EVALS.high0, pp };
  if (s < 160 && d < 100) return { ...EVALS.high1, pp };
  return { ...EVALS.high2, pp };
}

/* 四张 1:1 指标卡的配色（红=大压 / 蓝=小压 / 绿=心率 / 琥珀=时间） */
const MCOL = {
  sys:  { bg: '#FFF1F2', line: '#FECDD3', tagBg: 'rgba(225,29,72,.12)', tagTx: '#BE123C' },
  dia:  { bg: '#EFF6FF', line: '#BFDBFE', tagBg: 'rgba(59,130,246,.14)', tagTx: '#1D4ED8' },
  hr:   { bg: '#ECFDF5', line: '#A7F3D0', tagBg: 'rgba(16,185,129,.14)', tagTx: '#047857' },
  time: { bg: '#FFFBEB', line: '#FDE68A', tagBg: 'rgba(217,119,6,.14)', tagTx: '#B45309' },
};

const pad2 = (n) => String(n).padStart(2, '0');

/* Date → datetime-local 输入值（本地时区，不要用 toISOString 的 UTC 偏移） */
function toLocalInput(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/* '2026-10-19T08:00' → { date:'10月19日', md:'10/19', time:'08:00', full:'2026-10-19 08:00' } */
function fmtTime(iso) {
  const [dPart, tPart = ''] = String(iso || '').split('T');
  const seg = (dPart || '2026-10-19').split('-');
  const m = Number(seg[1]);
  const day = Number(seg[2]);
  const hm = (tPart || '08:00').slice(0, 5);
  return {
    date: `${m || 10}月${day || 19}日`,
    md: `${m || 10}/${day || 19}`,
    time: hm,
    full: `${dPart || '2026-10-19'} ${hm}`,
  };
}

function loadLocal() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_READ()) || 'null');
    if (raw && Array.isArray(raw.records)) return raw.records;
    if (Array.isArray(raw)) return raw; // 旧版直接存数组
  } catch { /* ignore */ }
  return null;
}

function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function buildCsv(records) {
  const header = '测量时间,时段,大压(收缩压mmHg),小压(舒张压mmHg),心率(bpm),脉压差(mmHg),评估状态,备注\n';
  const rows = records.map((r) => {
    const ev = evaluateBP(r.sys, r.dia);
    return `"${String(r.time || '').replace('T', ' ')}","${r.period || ''}",${r.sys},${r.dia},${r.hr},${Number(r.sys) - Number(r.dia)},"${ev.label}","${String(r.note || '').replace(/"/g, '""')}"`;
  }).join('\n');
  return '\uFEFF' + header + rows;
}

/* 复制给外部站点用的 448×184 门户卡片 HTML（实时值） */
function buildSnippet(latest, idx, count) {
  const r = latest || DEFAULT_RECORDS[0];
  const ev = evaluateBP(r.sys, r.dia);
  const t = fmtTime(r.time);
  return `<!-- 血压记录门户卡片 (448x184 px) · 数据实时值 ${r.sys}/${r.dia} · ${r.hr}bpm -->
<a href="https://lxlrwxs.top/#/health" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:space-between;width:448px;height:184px;max-width:100%;aspect-ratio:448/184;padding:0 24px;background:#fcfcf9;border:1px solid #d5d7d7;border-radius:14px;text-decoration:none;color:#181817;position:relative;overflow:hidden;box-sizing:border-box;font-family:system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;">
  <span style="width:176px;height:103px;flex:none;border-radius:8px;border:1px solid #d6d4ce;background:#f7f6f2;display:flex;flex-direction:column;overflow:hidden;">
    <span style="height:18px;flex:none;background:#efede7;border-bottom:1px solid #e0ded8;display:flex;align-items:center;justify-content:space-between;padding:0 7px;font-size:6.5px;color:#6e6e6a;">
      <span style="display:flex;gap:3px;"><i style="width:5px;height:5px;border-radius:50%;background:#ef6a5e;display:block;"></i><i style="width:5px;height:5px;border-radius:50%;background:#f5bd4f;display:block;"></i><i style="width:5px;height:5px;border-radius:50%;background:#61c454;display:block;"></i></span>
      <span>${t.date} · 血压监测</span>
      <span style="color:#047857;font-weight:700;">${ev.short}</span>
    </span>
    <span style="flex:1;display:flex;gap:6px;padding:6px;min-height:0;">
      <span style="flex:1;display:flex;flex-direction:column;justify-content:space-between;border-right:1px solid #e7e5e0;padding-right:6px;">
        <span style="font-size:7px;font-weight:700;color:#44403c;">今日测量</span>
        <span style="background:#fff;border:1px solid #e7e5e0;border-radius:4px;padding:2px 5px;font-size:10.5px;font-weight:800;color:#181817;">${r.sys}/${r.dia}</span>
        <span style="background:#fff1f2;border:1px solid #fecdd3;border-radius:4px;padding:1px 5px;font-size:7.5px;font-weight:700;color:#be123c;">♥ ${r.hr} bpm</span>
      </span>
      <span style="flex:1.2;display:flex;flex-direction:column;gap:3px;justify-content:center;">
        <span style="background:#fff;border-radius:3px;padding:2px 4px;font-size:6px;color:#57534e;display:flex;justify-content:space-between;"><b style="color:#1d4ed8;">${t.time}</b><b>${r.sys}/${r.dia}</b></span>
        <span style="background:#fff;border-radius:3px;padding:2px 4px;font-size:6px;color:#57534e;display:flex;justify-content:space-between;"><b style="color:#047857;">${r.period || '日常'}</b><b>脉压 ${Number(r.sys) - Number(r.dia)}</b></span>
        <span style="background:#fff;border-radius:3px;padding:2px 4px;font-size:6px;color:#a8a29e;display:flex;justify-content:space-between;"><b>mmHg</b><b>共 ${count || 0} 次</b></span>
      </span>
    </span>
  </span>
  <span style="width:204px;display:flex;flex-direction:column;align-items:flex-start;">
    <span style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="width:24px;height:24px;border-radius:6px;background:#181817;color:#fff;display:inline-flex;align-items:center;justify-content:center;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      </span>
      <strong style="font-size:17px;font-weight:800;">血压记录</strong>
    </span>
    <span style="font-size:10.5px;line-height:1.45;color:#6e6e6a;margin:0 0 12px 0;">大压 ${r.sys}、小压 ${r.dia} 与心率 ${r.hr} 每日监测合一，测量时间与趋势一站管理。</span>
    <span style="padding:4px 12px;border-radius:999px;background:#181817;color:#fff;font-size:9.5px;font-weight:600;">打开记录 ↗</span>
  </span>
  <span style="position:absolute;right:22px;bottom:12px;font-size:28px;font-weight:800;color:transparent;-webkit-text-stroke:1.2px #dfdeda;">${idx}</span>
</a>`;
}

export default function HealthLog({ active = true }) {
  const { guard, authed } = useAuth();
  const [records, setRecords] = useState(() => loadLocal() || DEFAULT_RECORDS.map((r) => ({ ...r })));
  const [form, setForm] = useState(() => ({ sys: '118', dia: '76', hr: '72', time: toLocalInput(), period: '晨起', note: '' }));
  const [editingId, setEditingId] = useState(null);
  const [chartRange, setChartRange] = useState(7);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [dataOpen, setDataOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastRef = useRef(null);
  const sysRef = useRef(null);
  const diaRef = useRef(null);
  const hrRef = useRef(null);

  const say = (msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 2200);
  };

  const persist = (next) => {
    setRecords(next);
    try { localStorage.setItem(LS_READ(), JSON.stringify({ records: next })); } catch { /* ignore */ }
    try { Promise.resolve(window.electronAPI?.saveData?.(CLOUD_KEY, { records: next })).catch(() => {}); } catch { /* ignore */ }
  };

  /* 云端同步（与 ClassSchedule 同模式）：登录后血压记录上云，跨设备跟随。
     云端有 → 以云端为准覆盖本机；云端无 → 把本机记录首推上云。 */
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    (async () => {
      try {
        const cloud = await window.electronAPI?.loadData?.(CLOUD_KEY);
        if (!alive) return;
        if (cloud && Array.isArray(cloud.records)) {
          setRecords(cloud.records);
          try { localStorage.setItem(LS_READ(), JSON.stringify({ records: cloud.records })); } catch { /* ignore */ }
        } else {
          const local = loadLocal();
          if (local) { try { await window.electronAPI?.saveData?.(CLOUD_KEY, { records: local }); } catch { /* ignore */ } }
        }
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [authed]);

  /* 新的在前 */
  const sorted = useMemo(
    () => [...records].sort((a, b) => String(b.time || '').localeCompare(String(a.time || ''))),
    [records],
  );
  const latest = sorted[0] || null;
  const prev = sorted[1] || null;
  const ev = latest ? evaluateBP(latest.sys, latest.dia) : null;

  /* 趋势图：几何与设计稿一致（800 比例 viewBox 自动缩放） */
  const chart = useMemo(() => {
    const slice = sorted.slice(0, chartRange).reverse();
    const W = 360, H = 150, padL = 28, padR = 14, padT = 16, padB = 24;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const minY = 50, maxY = 165;
    const yPos = (v) => {
      const c = Math.max(minY, Math.min(maxY, Number(v) || minY));
      return padT + plotH - ((c - minY) / (maxY - minY)) * plotH;
    };
    const xPos = (i) => (slice.length === 1 ? padL + plotW / 2 : padL + (i / (slice.length - 1)) * plotW);
    const stats = slice.length
      ? {
          sys: Math.round(slice.reduce((a, r) => a + Number(r.sys), 0) / slice.length),
          dia: Math.round(slice.reduce((a, r) => a + Number(r.dia), 0) / slice.length),
          hr: Math.round(slice.reduce((a, r) => a + Number(r.hr), 0) / slice.length),
          rate: Math.round((slice.filter((r) => evaluateBP(r.sys, r.dia).normal).length / slice.length) * 100),
        }
      : null;
    return { slice, W, H, padL, padR, padT, padB, plotW, plotH, yPos, xPos, stats };
  }, [sorted, chartRange]);

  const filtered = useMemo(() => sorted.filter((r) => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'high') return !evaluateBP(r.sys, r.dia).normal;
    return (r.period || '') === historyFilter;
  }), [sorted, historyFilter]);

  const step = (key, delta, min, max) => {
    setForm((f) => {
      const cur = Number(f[key]);
      const next = Math.max(min, Math.min(max, (Number.isFinite(cur) ? cur : 0) + delta));
      return { ...f, [key]: String(next) };
    });
  };

  const setNow = () => {
    setForm((f) => ({ ...f, time: toLocalInput() }));
    say('已填入当前时间');
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setForm({ sys: String(r.sys), dia: String(r.dia), hr: String(r.hr), time: r.time || toLocalInput(), period: r.period || '晨起', note: r.note || '' });
    say('已填入该条记录，改完点保存');
    if (typeof document !== 'undefined') {
      const el = document.getElementById('hp-form');
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const removeRec = (id) => {
    if (!guard()) return;
    persist(records.filter((r) => r.id !== id));
    say('已删除该条记录');
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!guard()) return;
    const sys = Math.max(50, Math.min(250, Number(form.sys) || 118));
    const dia = Math.max(30, Math.min(160, Number(form.dia) || 76));
    const hr = Math.max(30, Math.min(220, Number(form.hr) || 72));
    const time = form.time || toLocalInput();
    const note = form.note.trim();
    let next;
    if (editingId) {
      next = records.map((r) => (r.id === editingId ? { ...r, sys, dia, hr, time, period: form.period, note } : r));
      say('测量记录已更新');
    } else {
      next = [{
        id: 'rec_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        sys, dia, hr, time, period: form.period, note,
      }, ...records];
      say(`已记录：大压 ${sys} / 小压 ${dia} · 心率 ${hr}`);
    }
    persist(next);
    setEditingId(null);
    setForm((f) => ({ ...f, note: '' }));
  };

  const resetDemo = () => {
    if (!guard()) return;
    persist(DEFAULT_RECORDS.map((r) => ({ ...r })));
    say('已恢复示例数据');
  };

  const copySnippet = async () => {
    const code = buildSnippet(latest, '04', sorted.length);
    try {
      await navigator.clipboard.writeText(code);
      say('已复制门户卡片 HTML 集成代码');
    } catch {
      say('复制失败，请手动全选复制');
    }
  };

  /* ── 派生展示值 ── */
  const dSys = latest && prev ? Number(latest.sys) - Number(prev.sys) : 0;
  const dDia = latest && prev ? Number(latest.dia) - Number(prev.dia) : 0;
  const dHr = latest && prev ? Number(latest.hr) - Number(prev.hr) : 0;
  const fSys = Number(form.sys) || 0;
  const fDia = Number(form.dia) || 0;
  const fHr = Number(form.hr) || 0;
  const evForm = evaluateBP(fSys, fDia);
  const diffText = (v, unit) => (v === 0 ? `与上次持平 (${unit})` : `较上次 ${v > 0 ? '+' : ''}${v} ${unit}`);
  const tLatest = latest ? fmtTime(latest.time) : null;

  return (
    <div className="hp-page">
      {/* ── 页头 ── */}
      <div className="hp-top">
        <div className="hp-top-ico"><HeartPulse size={19} /></div>
        <div className="hp-top-ttl">
          <b>每日血压 · 心率记录</b>
          <i>大压 · 小压 · 心率 · 时间</i>
        </div>
        <button type="button" className="hp-btn hp-btn-dark" onClick={() => setDataOpen(true)}>
          <Download size={14} />数据
        </button>
      </div>

      <div className="hp-grid">
        <div className="hp-col">
          {/* ── 2×2 等长宽 (1:1) 指标卡 ── */}
          <section className="hp-card">
            <div className="hp-card-h">
              <h3>最新测量 · 四维卡片 (1:1)</h3>
              {ev && (
                <span className="hp-pill" style={{ background: ev.bg, color: ev.text, border: `1px solid ${ev.line}` }}>
                  ✓ {ev.label}
                </span>
              )}
            </div>
            {latest ? (
              <div className="hp-metrics">
                {/* 01 大压 */}
                <button type="button" className="hp-metric" style={{ background: MCOL.sys.bg, borderColor: MCOL.sys.line }}
                  onClick={() => { const el = sysRef.current; if (el) { el.focus(); el.select(); } }}>
                  <span className="hp-metric-top">
                    <span>
                      <span className="hp-metric-tag" style={{ background: MCOL.sys.tagBg, color: MCOL.sys.tagTx }}>01 · 大压</span>
                      <span className="hp-metric-name">收缩压 (SYS)</span>
                    </span>
                    <span className="hp-metric-ico" style={{ color: '#BE123C' }}><ArrowUp size={13} /></span>
                  </span>
                  <span className="hp-metric-mid">
                    <span className="hp-metric-valrow">
                      <b className="hp-metric-val">{latest.sys}</b>
                      <i className="hp-metric-unit">mmHg</i>
                    </span>
                    <i className="hp-metric-delta">{diffText(dSys, 'mmHg')}</i>
                  </span>
                  <span className="hp-metric-foot">
                    <span>点击快速修改</span>
                    <b>{latest.sys < 120 ? '理想' : latest.sys < 140 ? '正常高值' : '偏高'}</b>
                  </span>
                </button>

                {/* 02 小压 */}
                <button type="button" className="hp-metric" style={{ background: MCOL.dia.bg, borderColor: MCOL.dia.line }}
                  onClick={() => { const el = diaRef.current; if (el) { el.focus(); el.select(); } }}>
                  <span className="hp-metric-top">
                    <span>
                      <span className="hp-metric-tag" style={{ background: MCOL.dia.tagBg, color: MCOL.dia.tagTx }}>02 · 小压</span>
                      <span className="hp-metric-name">舒张压 (DIA)</span>
                    </span>
                    <span className="hp-metric-ico" style={{ color: '#1D4ED8' }}><ArrowDown size={13} /></span>
                  </span>
                  <span className="hp-metric-mid">
                    <span className="hp-metric-valrow">
                      <b className="hp-metric-val">{latest.dia}</b>
                      <i className="hp-metric-unit">mmHg</i>
                    </span>
                    <i className="hp-metric-delta">{diffText(dDia, 'mmHg')}</i>
                  </span>
                  <span className="hp-metric-foot">
                    <span>点击快速修改</span>
                    <b>{latest.dia < 80 ? '理想' : latest.dia < 90 ? '正常高值' : '偏高'}</b>
                  </span>
                </button>

                {/* 03 心率 */}
                <button type="button" className="hp-metric" style={{ background: MCOL.hr.bg, borderColor: MCOL.hr.line }}
                  onClick={() => { const el = hrRef.current; if (el) { el.focus(); el.select(); } }}>
                  <span className="hp-metric-top">
                    <span>
                      <span className="hp-metric-tag" style={{ background: MCOL.hr.tagBg, color: MCOL.hr.tagTx }}>03 · 心率</span>
                      <span className="hp-metric-name">静息脉搏 (BPM)</span>
                    </span>
                    <span className="hp-metric-ico" style={{ color: '#047857' }}><Heart size={13} /></span>
                  </span>
                  <span className="hp-metric-mid">
                    <span className="hp-metric-valrow">
                      <b className="hp-metric-val">{latest.hr}</b>
                      <i className="hp-metric-unit">次/分</i>
                    </span>
                    <i className="hp-metric-delta">{dHr === 0 ? '静息心率平稳' : `较上次 ${dHr > 0 ? '+' : ''}${dHr} bpm`}</i>
                  </span>
                  <span className="hp-metric-foot">
                    <span>点击快速修改</span>
                    <b>{latest.hr >= 60 && latest.hr <= 100 ? '平稳' : '关注'}</b>
                  </span>
                </button>

                {/* 04 时间 */}
                <button type="button" className="hp-metric" style={{ background: MCOL.time.bg, borderColor: MCOL.time.line }}
                  onClick={() => { setForm((f) => ({ ...f, time: toLocalInput() })); say('已同步为当前测量时间'); }}>
                  <span className="hp-metric-top">
                    <span>
                      <span className="hp-metric-tag" style={{ background: MCOL.time.tagBg, color: MCOL.time.tagTx }}>04 · 时间</span>
                      <span className="hp-metric-name">最近测量时刻</span>
                    </span>
                    <span className="hp-metric-ico" style={{ color: '#B45309' }}><Clock size={13} /></span>
                  </span>
                  <span className="hp-metric-mid">
                    <b className="hp-metric-time">{tLatest.time}</b>
                    <i className="hp-metric-delta">{tLatest.date} · {latest.period || '日常'}</i>
                    <i className="hp-metric-pp">脉压差 {latest.sys - latest.dia} mmHg</i>
                  </span>
                  <span className="hp-metric-foot">
                    <span>点击同步当前</span>
                    <b>共 {records.length} 次</b>
                  </span>
                </button>
              </div>
            ) : (
              <div className="hp-empty">还没有记录，在下面填写第一次测量吧</div>
            )}
          </section>

          {/* ── 录入表单 ── */}
          <section className="hp-card">
            <div className="hp-card-h">
              <h3>{editingId ? '正在编辑历史记录' : '新增测量记录'}</h3>
              {editingId && (
                <button type="button" className="hp-mini" onClick={() => { setEditingId(null); setForm((f) => ({ ...f, note: '' })); }}>
                  <X size={12} />取消编辑
                </button>
              )}
            </div>
            <form className="hp-form" onSubmit={onSubmit} noValidate>
              <div className="hp-fgrid">
                <div className="hp-field">
                  <div className="hp-f-l"><span>1. 大压 (收缩压)</span><span>mmHg</span></div>
                  <div className="hp-step">
                    <button type="button" className="hp-step-btn" aria-label="大压减 2" onClick={() => step('sys', -2, 60, 240)}><Minus size={14} /></button>
                    <input ref={sysRef} className="hp-num" type="number" min="60" max="240" inputMode="numeric" value={form.sys}
                      aria-label="大压数值" onFocus={(e) => e.target.select()} onChange={(e) => setForm((f) => ({ ...f, sys: e.target.value }))} />
                    <button type="button" className="hp-step-btn" aria-label="大压加 2" onClick={() => step('sys', 2, 60, 240)}><Plus size={14} /></button>
                  </div>
                </div>
                <div className="hp-field">
                  <div className="hp-f-l"><span>2. 小压 (舒张压)</span><span>mmHg</span></div>
                  <div className="hp-step">
                    <button type="button" className="hp-step-btn" aria-label="小压减 2" onClick={() => step('dia', -2, 40, 160)}><Minus size={14} /></button>
                    <input ref={diaRef} className="hp-num" type="number" min="40" max="160" inputMode="numeric" value={form.dia}
                      aria-label="小压数值" onFocus={(e) => e.target.select()} onChange={(e) => setForm((f) => ({ ...f, dia: e.target.value }))} />
                    <button type="button" className="hp-step-btn" aria-label="小压加 2" onClick={() => step('dia', 2, 40, 160)}><Plus size={14} /></button>
                  </div>
                </div>
              </div>

              <div className="hp-fgrid hp-fgrid-57">
                <div className="hp-field">
                  <div className="hp-f-l"><span>3. 心率</span><span>次/分</span></div>
                  <div className="hp-step">
                    <button type="button" className="hp-step-btn" aria-label="心率减 1" onClick={() => step('hr', -1, 35, 220)}><Minus size={14} /></button>
                    <input ref={hrRef} className="hp-num" type="number" min="35" max="220" inputMode="numeric" value={form.hr}
                      aria-label="心率数值" onFocus={(e) => e.target.select()} onChange={(e) => setForm((f) => ({ ...f, hr: e.target.value }))} />
                    <button type="button" className="hp-step-btn" aria-label="心率加 1" onClick={() => step('hr', 1, 35, 220)}><Plus size={14} /></button>
                  </div>
                </div>
                <div className="hp-field">
                  <div className="hp-f-l">
                    <span>4. 测量时间</span>
                    <button type="button" className="hp-linkbtn" onClick={setNow}>设为当前</button>
                  </div>
                  <input className="hp-input" type="datetime-local" value={form.time} aria-label="测量时间"
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
                </div>
              </div>

              <div className="hp-f-row">
                <div className="hp-chips">
                  {PERIODS.map((p) => (
                    <button type="button" key={p} className={`hp-chip${form.period === p ? ' is-on' : ''}`}
                      aria-pressed={form.period === p} onClick={() => setForm((f) => ({ ...f, period: p }))}>
                      {p === '晨起' ? '🌅 晨起' : p === '午后' ? '☀️ 午后' : p === '晚间' ? '🌙 晚间' : '🏃 运动后'}
                    </button>
                  ))}
                </div>
                <input className="hp-input hp-note" type="text" value={form.note} maxLength={60}
                  placeholder="备注（如：服药后、静息测量）" aria-label="测量备注"
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
              </div>

              <div className="hp-eval" style={{ background: evForm.bg, borderColor: evForm.line }}>
                <span className="hp-eval-l">
                  <i className="hp-eval-dot" style={{ background: evForm.dot }} />
                  <b style={{ color: evForm.text }}>当前评估：{evForm.label}（大压 {fSys} / 小压 {fDia} · 心率 {fHr}）</b>
                </span>
                <span className="hp-eval-r" style={{ color: evForm.text }}>脉压差 {evForm.pp} mmHg</span>
              </div>

              <button type="submit" className="hp-submit">
                <Check size={15} />{editingId ? '保存修改' : '保存本次测量记录'}
              </button>
            </form>
          </section>
        </div>

        <div className="hp-col">
          {/* ── 趋势图 ── */}
          <section className="hp-card">
            <div className="hp-card-h">
              <div>
                <h3><LineChart size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />血压与心率变化趋势</h3>
                <i className="hp-card-sub">红色：大压 · 蓝色：小压 · 绿虚线：心率</i>
              </div>
              <div className="hp-segmini">
                {[[7, '近7次'], [14, '近14次'], [999, '全部']].map(([v, label]) => (
                  <button type="button" key={v} className={chartRange === v ? 'is-on' : ''}
                    onClick={() => setChartRange(v)}>{label}</button>
                ))}
              </div>
            </div>

            <div className="hp-stats">
              <div className="hp-stat"><i>平均大压</i><b>{chart.stats ? chart.stats.sys : '-'}</b></div>
              <div className="hp-stat"><i>平均小压</i><b>{chart.stats ? chart.stats.dia : '-'}</b></div>
              <div className="hp-stat"><i>平均心率</i><b>{chart.stats ? chart.stats.hr : '-'}</b></div>
              <div className="hp-stat"><i>达标率</i><b className="hp-stat-ok">{chart.stats ? `${chart.stats.rate}%` : '-'}</b></div>
            </div>

            <div className="hp-chartbox">
              {chart.slice.length > 0 ? (
                <svg viewBox={`0 0 ${chart.W} ${chart.H}`} role="img" aria-label="血压与心率趋势图">
                  <rect x={chart.padL} y={chart.yPos(120)} width={chart.plotW} height={chart.yPos(80) - chart.yPos(120)} fill="rgba(16,185,129,.08)" rx="4" />
                  {[60, 80, 100, 120, 140].map((gv) => (
                    <g key={gv}>
                      <line x1={chart.padL} y1={chart.yPos(gv)} x2={chart.W - chart.padR} y2={chart.yPos(gv)} stroke="#E7E5E0" strokeDasharray="2 2" strokeWidth="1" />
                      <text x={chart.padL - 5} y={chart.yPos(gv) + 3} textAnchor="end" fontSize="8" fill="#A8A29E">{gv}</text>
                    </g>
                  ))}
                  <polyline fill="none" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3"
                    points={chart.slice.map((r, i) => `${chart.xPos(i)},${chart.yPos(r.hr)}`).join(' ')} />
                  <polyline fill="none" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    points={chart.slice.map((r, i) => `${chart.xPos(i)},${chart.yPos(r.dia)}`).join(' ')} />
                  <polyline fill="none" stroke="#E11D48" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                    points={chart.slice.map((r, i) => `${chart.xPos(i)},${chart.yPos(r.sys)}`).join(' ')} />
                  {chart.slice.map((r, i) => {
                    const cx = chart.xPos(i);
                    const tp = fmtTime(r.time);
                    return (
                      <g key={r.id || i}>
                        <circle cx={cx} cy={chart.yPos(r.hr)} r="2.2" fill="#10B981" />
                        <circle cx={cx} cy={chart.yPos(r.dia)} r="3" fill="#fff" stroke="#3B82F6" strokeWidth="2" />
                        <circle cx={cx} cy={chart.yPos(r.sys)} r="3.2" fill="#fff" stroke="#E11D48" strokeWidth="2" />
                        <text x={cx} y={chart.yPos(r.sys) - 6} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#BE123C">{r.sys}</text>
                        <text x={cx} y={chart.yPos(r.dia) + 10} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#1D4ED8">{r.dia}</text>
                        <text x={cx} y={chart.H - 6} textAnchor="middle" fontSize="7.5" fill="#78716C">{tp.md}</text>
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="hp-empty hp-empty-sm">暂无趋势数据</div>
              )}
            </div>
          </section>

          {/* ── 历史明细 ── */}
          <section className="hp-card">
            <div className="hp-card-h">
              <h3><ClipboardList size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />历史测量明细</h3>
              <div className="hp-filters">
                {[['all', '全部'], ['晨起', '🌅 晨起'], ['晚间', '🌙 晚间'], ['high', '⚠️ 偏高']].map(([v, label]) => (
                  <button type="button" key={v} className={`hp-mini${historyFilter === v ? ' is-on' : ''}`}
                    onClick={() => setHistoryFilter(v)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="hp-hist">
              {filtered.length === 0 && <div className="hp-empty hp-empty-sm">暂无符合筛选条件的血压记录</div>}
              {filtered.map((r) => {
                const rev = evaluateBP(r.sys, r.dia);
                const tp = fmtTime(r.time);
                return (
                  <div className="hp-hrow" key={r.id}>
                    <div className="hp-hrow-main">
                      <div className="hp-hrow-bp">
                        大压 {r.sys} / 小压 {r.dia}
                        <span className="hp-hrow-pill" style={{ background: rev.bg, color: rev.text, border: `1px solid ${rev.line}` }}>{rev.short}</span>
                      </div>
                      <div className="hp-hrow-meta">
                        <span className="hp-hr">♥ 心率 {r.hr} 次/分</span>
                        <span>⏱ {tp.date} {tp.time}（{r.period || '日常'}）</span>
                        {r.note && <span className="hp-hrow-note">{r.note}</span>}
                      </div>
                    </div>
                    <div className="hp-hrow-act">
                      <button type="button" className="hp-mini" onClick={() => startEdit(r)}><Pencil size={11} />编辑</button>
                      <button type="button" className="hp-mini hp-mini-danger" onClick={() => removeRec(r.id)}><Trash2 size={11} />删除</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* ── 数据弹窗 ── */}
      {dataOpen && (
        <div className="hp-scrim" onClick={(e) => { if (e.target === e.currentTarget) setDataOpen(false); }}>
          <div className="hp-modal" role="dialog" aria-modal="true" aria-label="数据导出与网站集成代码">
            <div className="hp-modal-h">
              <h3>数据导出与网站集成代码</h3>
              <button type="button" className="hp-mini" aria-label="关闭" onClick={() => setDataOpen(false)}><X size={12} /></button>
            </div>
            <p className="hp-modal-p">
              导出全部血压与心率历史记录（CSV 表格或 JSON 备份），或复制门户卡片 HTML 代码嵌入其他站点。记录已随账号云端同步，换设备登录同一账号即可恢复。
            </p>
            <div className="hp-modal-grid">
              <button type="button" className="hp-btn hp-btn-gold"
                onClick={() => {
                  if (!guard()) return;
                  download(`血压心率记录_${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(sorted), 'text/csv;charset=utf-8;');
                  say('已导出 CSV 表格文件');
                }}>
                <Download size={13} />导出 CSV 表格
              </button>
              <button type="button" className="hp-btn"
                onClick={() => {
                  if (!guard()) return;
                  download(`bp_records_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(sorted, null, 2), 'application/json');
                  say('已导出 JSON 备份文件');
                }}>
                <Braces size={13} />导出 JSON 备份
              </button>
            </div>
            <div className="hp-snip-box">
              <div className="hp-snip-h">
                <span>门户卡片集成代码 (448×184，实时值)</span>
                <button type="button" className="hp-linkbtn" onClick={copySnippet}><Copy size={11} />一键复制</button>
              </div>
              <textarea className="hp-snip" readOnly rows={5} value={buildSnippet(latest, '04', sorted.length)} aria-label="门户卡片 HTML 集成代码" />
            </div>
            <div className="hp-modal-foot">
              <span className="hp-modal-note">需要恢复初始演示数据？</span>
              <button type="button" className="hp-linkbtn hp-linkbtn-danger" onClick={resetDemo}><RotateCcw size={11} />重置为示例数据</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="hp-toast" role="status">
          <i className="hp-toast-dot" />
          {toast}
        </div>
      )}

      <style>{`
        .hp-page { max-width: 1120px; margin: 0 auto; padding: 14px 14px 28px; }
        .hp-top { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .hp-top-ico { flex: none; width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; background: ${ACCENT_SOFT}; color: ${ACCENT}; }
        .hp-top-ttl { flex: 1 1 auto; min-width: 0; }
        .hp-top-ttl b { display: block; font-size: 15px; font-weight: 750; color: #212529; letter-spacing: -.01em; }
        .hp-top-ttl i { display: block; font-style: normal; font-size: 11px; color: #8a8f98; margin-top: 1px; }
        .hp-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
        .hp-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
        @media (min-width: 900px) {
          .hp-grid { grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr); }
        }
        .hp-card { background: #fff; border: 1px solid rgba(20,24,33,.1); border-radius: 16px; padding: 14px; box-shadow: 0 1px 3px rgba(16,20,30,.04); }
        .hp-card-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
        .hp-card-h h3 { margin: 0; font-size: 13px; font-weight: 750; color: #212529; letter-spacing: -.01em; }
        .hp-card-sub { display: block; font-style: normal; font-size: 10.5px; color: #9aa0a8; margin-top: 2px; }
        .hp-pill { padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 750; }
        .hp-empty { text-align: center; padding: 26px 0; color: #adb5bd; font-size: 12.5px; }
        .hp-empty-sm { padding: 20px 0; font-size: 11.5px; }

        /* 2×2 1:1 指标卡 */
        .hp-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .hp-metric { aspect-ratio: 1 / 1; border: 1px solid; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; gap: 6px; text-align: left; cursor: pointer; min-width: 0; transition: transform .16s ease, box-shadow .16s ease; font-family: inherit; }
        .hp-metric:hover { box-shadow: 0 6px 18px -8px rgba(16,20,30,.16); }
        .hp-metric:active { transform: scale(.985); }
        .hp-metric-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
        .hp-metric-tag { display: inline-block; padding: 2px 7px; border-radius: 7px; font-size: 10px; font-weight: 750; }
        .hp-metric-name { display: block; font-size: 11px; font-weight: 700; color: #44403c; margin-top: 4px; }
        .hp-metric-ico { flex: none; width: 26px; height: 26px; border-radius: 9px; background: rgba(255,255,255,.85); display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .hp-metric-mid { display: flex; flex-direction: column; gap: 2px; }
        .hp-metric-valrow { display: flex; align-items: baseline; gap: 4px; }
        .hp-metric-val { font-size: 30px; font-weight: 800; color: #1c1917; letter-spacing: -.02em; line-height: 1; }
        .hp-metric-unit { font-style: normal; font-size: 11px; font-weight: 650; color: #78716c; }
        .hp-metric-delta { font-style: normal; font-size: 10.5px; font-weight: 650; color: #78716c; }
        .hp-metric-time { font-size: 22px; font-weight: 800; color: #1c1917; letter-spacing: -.01em; line-height: 1.1; }
        .hp-metric-pp { font-style: normal; font-size: 10.5px; font-weight: 700; color: #B45309; }
        .hp-metric-foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding-top: 7px; border-top: 1px solid rgba(20,24,33,.08); font-size: 10px; color: #a8a29e; }
        .hp-metric-foot b { font-size: 10.5px; font-weight: 750; color: #57534e; }

        /* 表单 */
        .hp-form { display: flex; flex-direction: column; gap: 10px; }
        .hp-fgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .hp-fgrid-57 { grid-template-columns: 5fr 7fr; }
        .hp-field { background: #FAF9F5; border: 1px solid rgba(20,24,33,.1); border-radius: 12px; padding: 9px 10px; min-width: 0; }
        .hp-f-l { display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 11px; font-weight: 700; color: #495057; margin-bottom: 6px; }
        .hp-step { display: flex; align-items: center; gap: 6px; }
        .hp-step-btn { flex: none; width: 36px; height: 36px; border-radius: 9px; background: #fff; border: 1px solid rgba(20,24,33,.14); color: #495057; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform .12s ease; }
        .hp-step-btn:active { transform: scale(.92); }
        .hp-num { flex: 1 1 auto; min-width: 0; width: 100%; text-align: center; font-size: 20px; font-weight: 800; color: #212529; border: 0; background: transparent; outline: none; font-family: inherit; }
        .hp-num::-webkit-inner-spin-button, .hp-num::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        /* 步进按钮宽度：壳层 Layout 有 .tool-content button { min-width:44px !important }，
          两个按钮合计 88px，把 157px 字段里的数字框挤到只剩 57px —— 手机上根本没法输入。
          用 (0,2,1) > (0,1,1) 的特异性把宽度压回 36px（高度仍 44，拇指下限不丢）。 */
        .tool-content button.hp-step-btn { min-width: 36px !important; width: 36px; }
        .hp-input { width: 100%; box-sizing: border-box; background: #fff; border: 1px solid rgba(20,24,33,.14); border-radius: 9px; padding: 8px 10px; font-size: 12px; font-weight: 650; color: #212529; outline: none; font-family: inherit; }
        .hp-input:focus { border-color: ${ACCENT}; }
        .hp-f-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
        .hp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .hp-chip { padding: 7px 11px; border-radius: 9px; font-size: 11.5px; font-weight: 650; border: 1px solid rgba(20,24,33,.12); background: #fff; color: #6c757d; cursor: pointer; font-family: inherit; }
        .hp-chip.is-on { background: #1b1b1b; border-color: #1b1b1b; color: #fff; }
        .hp-note { flex: 1 1 150px; min-width: 130px; }
        .hp-eval { border: 1px solid; border-radius: 12px; padding: 9px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .hp-eval-l { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; min-width: 0; }
        .hp-eval-l b { font-weight: 750; }
        .hp-eval-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
        .hp-eval-r { font-size: 11.5px; font-weight: 700; white-space: nowrap; }
        .hp-submit { width: 100%; padding: 12px; border: 0; border-radius: 12px; background: ${ACCENT}; color: #fff; font-size: 13px; font-weight: 750; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px; font-family: inherit; letter-spacing: .02em; transition: background .16s ease, transform .12s ease; }
        .hp-submit:hover { background: ${ACCENT_DARK}; }
        .hp-submit:active { transform: translateY(1px); }

        /* 图表 */
        .hp-segmini { display: flex; gap: 2px; background: #F1EFE9; border-radius: 9px; padding: 2px; }
        .hp-segmini button { border: 0; background: transparent; padding: 6px 10px; border-radius: 7px; font-size: 11px; font-weight: 700; color: #6c757d; cursor: pointer; font-family: inherit; }
        .hp-segmini button.is-on { background: #fff; color: #212529; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
        .hp-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
        .hp-stat { background: #FAF9F5; border: 1px solid rgba(20,24,33,.08); border-radius: 12px; padding: 8px 4px; text-align: center; }
        .hp-stat i { display: block; font-style: normal; font-size: 10.5px; color: #8a8f98; }
        .hp-stat b { display: block; font-size: 15px; font-weight: 800; color: #212529; margin-top: 2px; }
        .hp-stat-ok { color: #047857; }
        .hp-chartbox { position: relative; background: #FAF9F5; border: 1px solid rgba(20,24,33,.08); border-radius: 12px; padding: 8px; }
        .hp-chartbox svg { width: 100%; height: auto; display: block; }

        /* 历史 */
        .hp-filters { display: flex; flex-wrap: wrap; gap: 5px; }
        .hp-hist { display: flex; flex-direction: column; gap: 8px; max-height: 430px; overflow-y: auto; padding-right: 2px; }
        .hp-hrow { background: #FAF9F5; border: 1px solid rgba(20,24,33,.1); border-radius: 12px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .hp-hrow-main { min-width: 0; }
        .hp-hrow-bp { font-size: 13.5px; font-weight: 800; color: #212529; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        .hp-hrow-pill { padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 750; }
        .hp-hrow-meta { margin-top: 4px; display: flex; flex-wrap: wrap; align-items: center; gap: 7px; font-size: 11px; color: #6c757d; }
        .hp-hr { font-weight: 700; color: #BE123C; }
        .hp-hrow-note { color: #57534e; }
        .hp-hrow-act { display: flex; gap: 6px; flex: 0 0 auto; }

        /* 通用小件 */
        .hp-btn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(20,24,33,.14); background: #fff; color: #495057; border-radius: 10px; padding: 9px 13px; font-size: 12.5px; font-weight: 650; cursor: pointer; font-family: inherit; }
        .hp-btn:hover { border-color: ${ACCENT_LINE}; color: ${ACCENT}; }
        .hp-btn-dark { background: #1b1b1b; border-color: #1b1b1b; color: #fff; }
        .hp-btn-dark:hover { background: #3a3a3a; border-color: #3a3a3a; color: #fff; }
        .hp-btn-gold { background: ${ACCENT}; border-color: ${ACCENT}; color: #fff; }
        .hp-btn-gold:hover { background: ${ACCENT_DARK}; border-color: ${ACCENT_DARK}; color: #fff; }
        .hp-mini { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 8px; background: #fff; border: 1px solid rgba(20,24,33,.14); font-size: 11px; font-weight: 650; color: #495057; cursor: pointer; font-family: inherit; }
        .hp-mini:hover { border-color: ${ACCENT_LINE}; color: ${ACCENT}; }
        .hp-mini.is-on { background: #1b1b1b; border-color: #1b1b1b; color: #fff; }
        .hp-mini-danger { color: #E11D48; }
        .hp-mini-danger:hover { border-color: rgba(225,29,72,.4); color: #BE123C; }
        .hp-linkbtn { border: 0; background: transparent; padding: 0; font-size: 10.5px; font-weight: 700; color: ${ACCENT_DARK}; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; font-family: inherit; }
        .hp-linkbtn:hover { text-decoration: underline; }
        .hp-linkbtn-danger { color: #E11D48; }

        /* 数据弹窗 */
        .hp-scrim { position: fixed; inset: 0; z-index: 1400; background: rgba(16,18,24,.46); display: flex; align-items: center; justify-content: center; padding: 16px; animation: hp-fade .18s ease both; }
        .hp-modal { width: min(100%, 420px); max-height: 88vh; overflow-y: auto; background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 24px 60px -26px rgba(16,18,24,.55); animation: hp-in .2s cubic-bezier(.16,1,.3,1) both; }
        .hp-modal-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        .hp-modal-h h3 { margin: 0; font-size: 14px; font-weight: 750; color: #212529; }
        .hp-modal-p { margin: 0 0 12px; font-size: 11.5px; line-height: 1.6; color: #6c757d; }
        .hp-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .hp-modal-grid .hp-btn { justify-content: center; }
        .hp-snip-box { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(20,24,33,.08); }
        .hp-snip-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; font-size: 11.5px; font-weight: 750; color: #44403c; }
        .hp-snip { width: 100%; box-sizing: border-box; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; line-height: 1.5; background: #FAF9F5; border: 1px solid rgba(20,24,33,.14); border-radius: 10px; padding: 8px; color: #57534e; resize: vertical; }
        .hp-modal-foot { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(20,24,33,.08); display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .hp-modal-note { font-size: 11px; color: #9aa0a8; }
        .hp-toast { position: fixed; left: 50%; bottom: calc(24px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); z-index: 1450; background: #212529; color: #fff; font-size: 12.5px; font-weight: 600; padding: 9px 16px; border-radius: 999px; box-shadow: 0 8px 24px -8px rgba(16,18,24,.4); display: flex; align-items: center; gap: 8px; animation: hp-fade .18s ease both; }
        .hp-toast-dot { width: 7px; height: 7px; border-radius: 50%; background: #34D399; flex: none; }
        @keyframes hp-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes hp-in { from { opacity: .5; transform: translateY(10px) scale(.98) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .hp-scrim, .hp-modal, .hp-toast { animation: none } }
        @media (max-width: 480px) {
          .hp-metric { padding: 10px; border-radius: 14px; }
          .hp-metric-val { font-size: 27px; }
          .hp-fgrid-57 { grid-template-columns: 1fr; }
        }
        /* 手机上数字字段独占一行：2 列布局里数字框只有 ~57-66px，打字不可用；
           单行后数字框 230px+，配合聚焦全选，「点一下 → 直接输」才是可用的录入流 */
        @media (max-width: 767px) {
          .hp-fgrid { grid-template-columns: 1fr; }
          .hp-fgrid-57 { grid-template-columns: 1fr; }
          .hp-num { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}
