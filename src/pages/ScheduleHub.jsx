import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CalendarRange } from 'lucide-react';
import ClassSchedule from './ClassSchedule';
import Planner from './Planner';
import { userKey } from '../lib/auth';

/* 日程中心 · 一体化时间工作台
   模式切换（课程表/日历日程）经 portal 渲染进页头「数据服务可用」左侧；
   今日概览（日期/今日课程/今日日程）下沉到课程表首卡「第 X 周」框内 */

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
  let eventCount = 0;
  const pl = readJson(userKey('PlannerData'));
  if (Array.isArray(pl)) eventCount = pl.filter((e) => e.date === today).length;
  return { month: now.getMonth() + 1, date: now.getDate(), weekDay: WEEK_CN[now.getDay()], eventCount };
}

function getTabFromHash() {
  const query = window.location.hash.split('?')[1] || '';
  const tab = new URLSearchParams(query).get('tab');
  return TABS.some(([id]) => id === tab) ? tab : 'courses';
}

export default function ScheduleHub() {
  const [tab, setTab] = useState(getTabFromHash);
  const [stats, setStats] = useState(computeStats);
  const [slotEl, setSlotEl] = useState(null);

  const refreshStats = () => setStats(computeStats());

  const changeTab = (next) => {
    setTab(next);
    refreshStats();
    const url = new URL(window.location.href);
    url.hash = `/timetable?tab=${next}`;
    window.history.replaceState(window.history.state, '', url);
  };

  useEffect(() => {
    setSlotEl(document.getElementById('tool-head-slot'));
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

      /* ===== 模式切换（实际渲染于页头「数据服务可用」左侧） ===== */
      .shub-modes { display:grid; grid-template-columns:repeat(2,minmax(0,auto)); gap:10px; }
      .shub-mode { display:flex; align-items:center; gap:11px; border:1px solid rgba(27,27,27,.14); border-radius:11px;
        padding:11px 15px; background:rgba(255,255,255,.85); color:#555; cursor:pointer; text-align:left;
        transition:border-color .18s ease, background .18s ease, color .18s ease, transform .18s ease, box-shadow .18s ease; }
      .shub-mode:hover { border-color:rgba(27,27,27,.32); transform:translateY(-1px); box-shadow:0 8px 18px -14px rgba(20,20,20,.5); }
      .shub-mode svg { flex:0 0 auto; color:#888; transition:color .18s ease; }
      .shub-mode-copy { display:grid; gap:2px; min-width:0; }
      .shub-mode-copy b { font-size:13.5px; font-weight:750; color:#1b1b1b; }
      .shub-mode-copy i { overflow:hidden; color:#999; font-size:11px; font-style:normal; text-overflow:ellipsis; white-space:nowrap; }
      .shub-mode.is-active { border-color:#d7b846 !important; background:#ffe08a !important; color:#1b1b1b !important; box-shadow:0 8px 18px -14px rgba(164,136,48,.75) !important; }
      .shub-mode.is-active svg { color:#9a7515 !important; }
      .shub-mode.is-active .shub-mode-copy b { color:#1b1b1b !important; }
      .shub-mode.is-active .shub-mode-copy i { color:#7a651c !important; }

      /* ===== 统一内容面板 ===== */
      .shub-panel { border:1px solid rgba(27,27,27,.1); border-radius:16px; background:rgba(255,255,255,.72);
        padding:20px; box-shadow:0 14px 30px -34px rgba(20,20,20,.55); }

      @media (max-width:860px) {
        .shub-panel { padding:14px; border-radius:13px; }
      }
      @media (max-width:560px) {
        .shub-modes { grid-template-columns:repeat(2,minmax(0,1fr)); width:100%; }
        .shub-mode { padding:9px 11px; gap:8px; }
        .shub-mode-copy i { display:none; }
      }
      @media (prefers-reduced-motion:reduce) {
        .shub-page *, .shub-page *::before, .shub-page *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
      }
    `}</style>

    {slotEl && createPortal(
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
      </div>,
      slotEl
    )}

    <div className="shub-panel">
      <div hidden={tab !== 'courses'}><ClassSchedule stats={stats} /></div>
      <div hidden={tab !== 'planner'}><Planner /></div>
    </div>
  </div>;
}
