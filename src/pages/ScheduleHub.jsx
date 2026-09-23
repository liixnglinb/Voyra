import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CalendarRange, ChevronDown, ClipboardCheck } from 'lucide-react';
import ClassSchedule from './ClassSchedule';
import Planner from './Planner';
import HomeworkBoard, { loadItems, countDays } from './HomeworkBoard';
import { userKey } from '../lib/auth';

/* 日程中心 · 一体化时间工作台
   模式切换（课程表/日历日程/作业看板）经 portal 渲染进页头「数据服务可用」左侧；
   手机上三个平铺大按钮收成一个下拉（label 用短名「日历」），桌面端仍是平铺；
   今日概览（日期/今日课程/今日日程）下沉到课程表首卡「第 X 周」框内 */

const TABS = [
  ['courses', '课程表', '每周课表 · 周次自动推算', CalendarRange, '课程表'],
  ['planner', '日历日程', '月历节假日 · 每日事项', CalendarDays, '日历'],
  ['homework', '作业看板', '课程作业 · 截止时间提醒', ClipboardCheck, '作业看板'],
];

/* 断点阈值与主仓库 Layout / index.css 的手机口径（767）对齐 */
const MOBILE_MQ = '(max-width: 767px)';

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(MOBILE_MQ).matches : false),
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(MOBILE_MQ);
    const on = (e) => setMobile(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}

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
  let homeworkDue = 0;
  try {
    const c = countDays(loadItems(), now);
    homeworkDue = c.overdue + c.today;
  } catch { /* 作业数据异常不影响概览其余项 */ }
  return { month: now.getMonth() + 1, date: now.getDate(), weekDay: WEEK_CN[now.getDay()], eventCount, homeworkDue };
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
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const pickRef = useRef(null);

  const refreshStats = () => setStats(computeStats());

  const changeTab = (next) => {
    setTab(next);
    setMenuOpen(false);
    refreshStats();
    const url = new URL(window.location.href);
    url.hash = `/timetable?tab=${next}`;
    window.history.replaceState(window.history.state, '', url);
  };

  /* 下拉打开时：点外部或按 Esc 收起。菜单渲染在页头 portal 里，
     所以判「外部」要用 contains 而不是焦点归属。 */
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (pickRef.current && !pickRef.current.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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

  const curTab = TABS.find(([id]) => id === tab) || TABS[0];
  const CurIcon = curTab[3];

  return <div className="shub-page">
    <style>{`
      .shub-page { display:flex; flex-direction:column; gap:18px; }

      /* ===== 模式切换（实际渲染于页头「数据服务可用」左侧） ===== */
      .shub-modes { display:grid; grid-template-columns:repeat(3,minmax(0,auto)); gap:10px; }
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
        .shub-modes { grid-template-columns:repeat(3,minmax(0,1fr)); width:100%; }
        .shub-mode { padding:9px 8px; gap:6px; justify-content:center; }
        .shub-mode svg { display:none; }
        .shub-mode-copy { justify-items:center; }
        .shub-mode-copy b { font-size:12px; }
        .shub-mode-copy i { display:none; }
      }
      @media (max-width:767px) {
        /* 左右零留白：面板退化成透明容器，卡片自己贴屏幕边 */
        .shub-panel { padding:0; border:0; border-radius:0; background:transparent; box-shadow:none; }
        .shub-page { gap:12px; }

        /* 三个平铺大按钮 → 一个下拉。按钮即当前视图，菜单里选别的。 */
        .shub-pick { position:relative; flex:0 1 auto; min-width:0; }
        .shub-pick-btn { display:flex; align-items:center; gap:7px; min-height:44px; padding:0 12px;
          border:1px solid #d7b846; border-radius:10px; background:#ffe08a; color:#1b1b1b;
          font:750 var(--fs-label)/1 inherit; }
        .shub-pick-btn .chev { color:#7a651c; transition:transform .18s ease; }
        .shub-pick-btn[aria-expanded="true"] .chev { transform:rotate(180deg); }
        .shub-pick-menu { position:absolute; top:calc(100% + 6px); left:0; z-index:60; min-width:154px;
          display:grid; gap:2px; padding:6px; border:1px solid rgba(27,27,27,.14); border-radius:12px;
          background:#fff; box-shadow:0 16px 34px -18px rgba(20,20,20,.5); }
        .shub-pick-opt { display:flex; align-items:center; gap:9px; min-height:44px; padding:0 10px;
          border:0; border-radius:8px; background:transparent; color:#3a3a3a;
          font-size:var(--fs-label); text-align:left; }
        .shub-pick-opt.is-active { background:#fff4c8; color:#1b1b1b; font-weight:750; }
      }
      @media (prefers-reduced-motion:reduce) {
        .shub-page *, .shub-page *::before, .shub-page *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
      }
    `}</style>

    {slotEl && createPortal(
      isMobile ? (
        <div className="shub-pick" ref={pickRef}>
          <button type="button" className="shub-pick-btn" aria-haspopup="true" aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}>
            <CurIcon size={17} strokeWidth={1.9} />
            <span>{curTab[4]}</span>
            <ChevronDown className="chev" size={15} />
          </button>
          {menuOpen && (
            <div className="shub-pick-menu" role="menu" aria-label="切换视图">
              {TABS.map(([id, , , Icon, short]) => (
                <button key={id} type="button" role="menuitem" aria-current={tab === id ? 'page' : undefined}
                  className={`shub-pick-opt${tab === id ? ' is-active' : ''}`} onClick={() => changeTab(id)}>
                  <Icon size={16} strokeWidth={1.9} />{short}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
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
      ),
      slotEl
    )}

    <div className="shub-panel">
      <div hidden={tab !== 'courses'}><ClassSchedule stats={stats} active={tab === 'courses'} /></div>
      <div hidden={tab !== 'planner'}><Planner active={tab === 'planner'} /></div>
      <div hidden={tab !== 'homework'}><HomeworkBoard active={tab === 'homework'} /></div>
    </div>
  </div>;
}
