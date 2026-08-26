import React, { useEffect, useState } from 'react';
import { CalendarDays, CalendarRange } from 'lucide-react';
import ClassSchedule from './ClassSchedule';
import Planner from './Planner';

/* 日程中心：课程表 + 日历日程 合并页（Tab 切换，双视图常驻保留各自状态） */

const TABS = [
  ['courses', '课程表', CalendarRange],
  ['planner', '日历日程', CalendarDays],
];

function getTabFromHash() {
  const query = window.location.hash.split('?')[1] || '';
  const tab = new URLSearchParams(query).get('tab');
  return TABS.some(([id]) => id === tab) ? tab : 'courses';
}

export default function ScheduleHub() {
  const [tab, setTab] = useState(getTabFromHash);

  const changeTab = (next) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.hash = `/timetable?tab=${next}`;
    window.history.replaceState(window.history.state, '', url);
  };

  useEffect(() => {
    const sync = () => setTab(getTabFromHash());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  return <div className="shub-page">
    <style>{`
      .shub-page { display:flex; flex-direction:column; gap:16px; }
      .shub-tabs { display:inline-flex; width:fit-content; max-width:100%; gap:2px; padding:3px; border:1px solid rgba(27,27,27,.13); border-radius:9px; background:#f8f9fa; overflow-x:auto; scrollbar-width:none; }
      .shub-tabs::-webkit-scrollbar { display:none; }
      .shub-tab { display:inline-flex; flex:0 0 auto; align-items:center; gap:6px; border:0; border-radius:7px; padding:8px 18px; background:transparent; color:#6c757d; font-size:13px; font-weight:650; cursor:pointer; transition:background .16s ease, color .16s ease, box-shadow .16s ease; }
      .shub-tab:hover { color:#212529; }
      .shub-tab.is-active { background:#1b1b1b; color:#fff; box-shadow:0 1px 3px rgba(16,20,30,.12); }
      .shub-hint { margin:0; color:#adb5bd; font-size:12px; }
      @media (max-width:560px) { .shub-tab { flex:1; justify-content:center; padding:8px 10px; } }
    `}</style>

    <div className="shub-tabs" role="tablist" aria-label="日程中心视图">
      {TABS.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          className={`shub-tab${tab === id ? ' is-active' : ''}`}
          onClick={() => changeTab(id)}
        >
          <Icon size={15} strokeWidth={1.8} />{label}
        </button>
      ))}
      <span className="shub-hint" style={{ alignSelf: 'center', marginLeft: 'auto', paddingRight: 6, whiteSpace: 'nowrap' }}>课程表与日程数据分别保存在本机</span>
    </div>

    <div hidden={tab !== 'courses'}><ClassSchedule /></div>
    <div hidden={tab !== 'planner'}><Planner /></div>
  </div>;
}
