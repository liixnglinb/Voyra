import React, { useEffect, useState } from 'react';
import { CalendarDays, CalendarRange } from 'lucide-react';
import ClassSchedule from './ClassSchedule';
import Planner from './Planner';

/* 日程中心 · 一体化时间工作台
   顶部：今日概览（日期/周次/今日课程/今日日程）+ 模式切换
   主体：统一面板内承载 课程表 / 日历日程 两个视图（常驻保留状态，数据仍分键存本机） */

const TABS = [
  ['courses', '课程表', '每周课表 · 周次自动推算', CalendarRange],
  ['planner', '日历日程', '月历节假日 · 每日事项', CalendarDays],
];

const pad = (n) => String(n).padStart(2, '0');
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

function readJson(key) {
  try { return JSON.parse(window.localStorage.getItem(key) || 'null'); } catch { return null; }
}

function computeStats() {
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const dayIdx = (now.getDay() + 6) % 7 + 1;

  let week = null;
  let courseCount = 0;
  const cs = readJson('ClassScheduleData');
  if (cs) {
    const s = cs.settings || {};
    let auto = 1;
    if (s.startDate) {
      const start = new Date(s.startDate + 'T00:00:00');
      if (!Number.isNaN(start.getTime())) auto = Math.max(1, Math.min(20, Math.floor((now - start) / 864e5 / 7) + 1));
    }
    week = s.overrideWeek != null ? s.overrideWeek : (s.startDate ? auto : null);
    const inWeek = (c, w) => {
      if (w == null || w < c.f || w > c.t) return false;
      if (c.type === 'odd') return w % 2 === 1;
      if (c.type === 'even') return w % 2 === 0;
      return true;
    };
    courseCount = (cs.courses || []).filter((c) => c.day === dayIdx && inWeek(c, week)).length;
  }

  let eventCount = 0;
  const pl = readJson('PlannerData');
  if (Array.isArray(pl)) eventCount = pl.filter((e) => e.date === today).length;

  return { month: now.getMonth() + 1, date: now.getDate(), weekDay: WEEK_CN[now.getDay()], week, courseCount, eventCount };
}

function getTabFromHash() {
  const query = window.location.hash.split('?')[1] || '';
  const tab = new URLSearchParams(query).get('tab');
  return TABS.some(([id]) => id === tab) ? tab : 'courses';
}

export default function ScheduleHub() {
  const [tab, setTab] = useState(getTabFromHash);
  const [stats, setStats] = useState(computeStats);

  const refreshStats = () => setStats(computeStats());

  const changeTab = (next) => {
    setTab(next);
    refreshStats();
    const url = new URL(window.location.href);
    url.hash = `/timetable?tab=${next}`;
    window.history.replaceState(window.history.state, '', url);
  };

  useEffect(() => {
    const sync = () => { setTab(getTabFromHash()); refreshStats(); };
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    const timer = setInterval(refreshStats, 60000);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
      clearInterval(timer);
    };
  }, []);

  return <div className="shub-page">
    <style>{`
      .shub-page { display:flex; flex-direction:column; gap:18px; }

      /* ===== 顶部：今日概览 + 模式切换 ===== */
      .shub-top { display:flex; align-items:center; justify-content:space-between; gap:18px; flex-wrap:wrap;
        padding-bottom:16px; border-bottom:1px solid rgba(27,27,27,.12); }
      .shub-overview { display:inline-flex; align-items:center; gap:12px; flex-wrap:wrap;
        color:#555; font-size:13px; }
      .shub-overview b { color:#1b1b1b; font-weight:750; font-variant-numeric:tabular-nums; }
      .shub-date { display:inline-flex; align-items:baseline; gap:6px; color:#1b1b1b; font-size:14px; font-weight:750; }
      .shub-date i { color:#a48830; font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; font-style:normal; letter-spacing:.08em; }
      .shub-dot { width:4px; height:4px; border-radius:50%; background:rgba(164,136,48,.55); }
      .shub-live { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border:1px solid rgba(164,136,48,.4); border-radius:99px; background:#fff9df; color:#9a7515; font:650 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .shub-live i { width:6px; height:6px; border-radius:50%; background:#d4a930; animation:shub-pulse 2.2s ease-in-out infinite; }
      @keyframes shub-pulse { 0%,100% { opacity:1; } 50% { opacity:.35; } }

      .shub-modes { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
      .shub-mode { display:flex; align-items:center; gap:11px; border:1px solid rgba(27,27,27,.14); border-radius:11px;
        padding:11px 15px; background:rgba(255,255,255,.85); color:#555; cursor:pointer; text-align:left;
        transition:border-color .18s ease, background .18s ease, color .18s ease, transform .18s ease, box-shadow .18s ease; }
      .shub-mode:hover { border-color:rgba(27,27,27,.32); transform:translateY(-1px); box-shadow:0 8px 18px -14px rgba(20,20,20,.5); }
      .shub-mode svg { flex:0 0 auto; color:#888; transition:color .18s ease; }
      .shub-mode-copy { display:grid; gap:2px; min-width:0; }
      .shub-mode-copy b { font-size:13.5px; font-weight:750; color:#1b1b1b; }
      .shub-mode-copy i { overflow:hidden; color:#999; font-size:11px; font-style:normal; text-overflow:ellipsis; white-space:nowrap; }
      .shub-mode.is-active { border-color:#1b1b1b !important; background:#1b1b1b !important; color:#fff !important; box-shadow:0 10px 22px -16px rgba(20,20,20,.7) !important; }
      .shub-mode.is-active svg { color:#ffe08a !important; }
      .shub-mode.is-active .shub-mode-copy b { color:#fff !important; }
      .shub-mode.is-active .shub-mode-copy i { color:rgba(255,255,255,.62) !important; }

      /* ===== 统一内容面板 ===== */
      .shub-panel { border:1px solid rgba(27,27,27,.1); border-radius:16px; background:rgba(255,255,255,.72);
        padding:20px; box-shadow:0 14px 30px -34px rgba(20,20,20,.55); }

      @media (max-width:860px) {
        .shub-top { flex-direction:column; align-items:stretch; }
        .shub-overview { justify-content:flex-start; }
        .shub-modes { grid-template-columns:1fr; }
        .shub-panel { padding:14px; border-radius:13px; }
      }
      @media (max-width:560px) {
        .shub-modes { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .shub-mode { flex-direction:column; align-items:flex-start; gap:7px; padding:11px 12px; }
        .shub-mode-copy i { white-space:normal; }
      }
      @media (prefers-reduced-motion:reduce) {
        .shub-page *, .shub-page *::before, .shub-page *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
      }
    `}</style>

    <div className="shub-top">
      <div className="shub-overview">
        <span className="shub-date"><i>TODAY</i>{stats.month}月{stats.date}日 周{stats.weekDay}</span>
        <span className="shub-dot" />
        <span>第 <b>{stats.week ?? '—'}</b> 周</span>
        <span className="shub-dot" />
        <span>今日 <b>{stats.courseCount}</b> 节课</span>
        <span className="shub-dot" />
        <span><b>{stats.eventCount}</b> 项日程</span>
        <span className="shub-live"><i />LIVE</span>
      </div>
      <div className="shub-modes" role="tablist" aria-label="日程中心视图">
        {TABS.map(([id, label, desc, Icon]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            className={`shub-mode${tab === id ? ' is-active' : ''}`}
            onClick={() => changeTab(id)}
          >
            <Icon size={19} strokeWidth={1.8} />
            <span className="shub-mode-copy"><b>{label}</b><i>{desc}</i></span>
          </button>
        ))}
      </div>
    </div>

    <div className="shub-panel">
      <div hidden={tab !== 'courses'}><ClassSchedule /></div>
      <div hidden={tab !== 'planner'}><Planner /></div>
    </div>
  </div>;
}
