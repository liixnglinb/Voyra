import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, CalendarDays, CalendarRange, ChevronDown, ClipboardCheck, Clock,
  FolderOpen, ListChecks, Plus, Settings2, Upload, X,
} from 'lucide-react';
import ClassSchedule, { useIsMobile } from './ClassSchedule';
import Planner from './Planner';
import HomeworkBoard, { loadItems, countDays } from './HomeworkBoard';
import { userKey } from '../lib/auth';

/* 日程中心 · 一体化时间工作台
   桌面端：模式切换（课程表/日历日程/作业看板）经 portal 渲染进页头，内容平铺在面板里。
   手机端：页头只留视图下拉 + 功能按钮 + 账户头像，视图下方的卡片全部收进底部抽屉，
   进去就是一屏、不用上下滑。抽屉外壳由这里统一渲染，各视图把对应面板 portal 进来。 */

const TABS = [
  ['courses', '课程表', '每周课表 · 周次自动推算', CalendarRange, '课程表'],
  ['planner', '日历日程', '月历节假日 · 每日事项', CalendarDays, '日历'],
  ['homework', '作业看板', '课程作业 · 截止时间提醒', ClipboardCheck, '作业看板'],
];

/* 每个视图收进抽屉的面板。id 必须与各视图里 createPortal 的判断一致。 */
const PANELS = {
  courses: [
    ['week', '周次与时间设置', CalendarRange],
    ['detail', '本周课程明细', ListChecks],
    ['import', '导入课表', Upload],
    ['add', '手动添加课程', Plus],
  ],
  planner: [
    ['day', '当天安排与新增日程', CalendarDays],
  ],
  homework: [
    ['watch', '需要留意', AlertTriangle],
    ['later', '更远的作业', Clock],
    ['course', '按课程分组', FolderOpen],
  ],
};

/* 断点阈值与主仓库 Layout / index.css 的手机口径（767）一致，
   三个视图共用同一个 hook 与抽屉包装，都从 ClassSchedule 引。 */

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
  /* 功能按钮 + 底部抽屉 */
  const [fnOpen, setFnOpen] = useState(false);
  const [panel, setPanel] = useState(null);
  const [drawerHost, setDrawerHost] = useState(null);
  const [weekLabel, setWeekLabel] = useState('');
  const fnRef = useRef(null);

  const refreshStats = () => setStats(computeStats());

  const changeTab = (next) => {
    setTab(next);
    setMenuOpen(false);
    setFnOpen(false);
    setPanel(null);
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

  /* 功能菜单：点外部收起；Esc 优先收菜单，菜单没开才收抽屉 */
  useEffect(() => {
    if (!fnOpen) return undefined;
    const onDown = (e) => { if (fnRef.current && !fnRef.current.contains(e.target)) setFnOpen(false); };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [fnOpen]);

  useEffect(() => {
    if (!fnOpen && !panel) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (fnOpen) setFnOpen(false); else setPanel(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fnOpen, panel]);


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
  const panelTitle = ((PANELS[tab] || []).find(([id]) => id === panel) || [])[1] || '';

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

        /* 功能按钮：挨在视图下拉右边，账户头像左边（头像 fixed 在 right:10、宽 44，
           所以留 56px 让位） */
        .shub-head { display:flex; align-items:center; gap:8px; min-width:0; }
        .shub-fn { position:relative; flex:0 0 auto; margin-right:56px; }
        .shub-fn-btn { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px;
          border:1px solid rgba(27,27,27,.14); border-radius:10px; background:rgba(255,255,255,.92);
          color:#3a3a3a; font:700 var(--fs-label)/1 inherit; }
        .shub-fn-btn.is-open { border-color:#d7b846; background:#fff4c8; color:#1b1b1b; }
        /* 功能按钮靠右，菜单右对齐展开，否则会从屏幕右边溢出去 */
        .shub-fn-menu { left:auto; right:0; }
        .shub-week { flex:0 0 auto; display:inline-flex; align-items:center; min-height:44px; padding:0 2px;
          color:#6A6F79; font:700 var(--fs-meta)/1 ui-monospace, SFMono-Regular, Menlo, monospace; }

        /* 底部抽屉：外壳（遮罩、面板、标题、关闭）在这里，正文由各视图 portal 进 body */
        .shub-scrim { position:fixed; inset:0; z-index:1200; background:rgba(16,18,24,.44);
          animation:shub-fade .2s ease both; }
        .shub-drawer { position:fixed; left:0; right:0; bottom:0; z-index:1201; max-height:82vh;
          display:flex; flex-direction:column; border-radius:16px 16px 0 0; background:#fff;
          box-shadow:0 -18px 44px -22px rgba(16,18,24,.5); padding-bottom:env(safe-area-inset-bottom, 0px);
          animation:shub-rise .24s cubic-bezier(.16,1,.3,1) both; }
        .shub-grab { flex:0 0 auto; width:38px; height:4px; margin:8px auto 0; border-radius:99px; background:rgba(27,27,27,.16); }
        .shub-drawer-head { flex:0 0 auto; display:flex; align-items:center; gap:10px;
          padding:10px 14px 12px; border-bottom:1px solid rgba(27,27,27,.08); }
        .shub-drawer-head h2 { margin:0; font-size:var(--fs-lead); font-weight:750; color:#1b1b1b; }
        .shub-drawer-head .sp { flex:1; }
        .shub-drawer-close { display:grid; place-items:center; width:44px; height:44px; margin:-6px -8px -6px 0;
          border:0; border-radius:10px; background:transparent; color:#6A6F79; }
        .shub-drawer-body { flex:1 1 auto; min-height:0; overflow:auto; -webkit-overflow-scrolling:touch; padding:14px; }
        /* 抽屉本身已经是白底带内边距的容器，再套一层描边卡片会显脏 —— 卡片退化成纯内容 */
        .shub-drawer-body :is(.cs-card, .pl-card, .hw-card) {
          border:0 !important; box-shadow:none !important; padding:0 !important; border-radius:0 !important;
        }
        @keyframes shub-fade { from { opacity:0 } to { opacity:1 } }
        @keyframes shub-rise { from { transform:translateY(16px); opacity:.6 } to { transform:none; opacity:1 } }
      }
      @media (prefers-reduced-motion:reduce) {
        .shub-page *, .shub-page *::before, .shub-page *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
      }
    `}</style>

    {slotEl && createPortal(
      isMobile ? (
        <div className="shub-head">
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
          {weekLabel && <span className="shub-week">{weekLabel}</span>}
          <div className="shub-fn" ref={fnRef}>
            <button type="button" className={`shub-fn-btn${fnOpen ? ' is-open' : ''}`}
              aria-haspopup="true" aria-expanded={fnOpen} onClick={() => setFnOpen((v) => !v)}>
              <Settings2 size={16} strokeWidth={1.9} />功能
            </button>
            {fnOpen && (
              <div className="shub-pick-menu shub-fn-menu" role="menu" aria-label="本页功能">
                {(PANELS[tab] || []).map(([id, label, Icon]) => (
                  <button key={id} type="button" role="menuitem" className="shub-pick-opt"
                    onClick={() => { setPanel(id); setFnOpen(false); }}>
                    <Icon size={16} strokeWidth={1.9} />{label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
      <div hidden={tab !== 'courses'}>
        <ClassSchedule stats={stats} active={tab === 'courses'}
          drawerPanel={panel} drawerHost={drawerHost} onWeekLabel={setWeekLabel} />
      </div>
      <div hidden={tab !== 'planner'}>
        <Planner active={tab === 'planner'} drawerPanel={panel} drawerHost={drawerHost} />
      </div>
      <div hidden={tab !== 'homework'}>
        <HomeworkBoard active={tab === 'homework'} drawerPanel={panel} drawerHost={drawerHost} />
      </div>
    </div>

    {isMobile && panel && (
      <>
        <div className="shub-scrim" onClick={() => setPanel(null)} />
        <div className="shub-drawer" role="dialog" aria-modal="true" aria-label={panelTitle || '功能'}>
          <div className="shub-grab" />
          <div className="shub-drawer-head">
            <h2>{panelTitle}</h2>
            <div className="sp" />
            <button type="button" className="shub-drawer-close" aria-label="关闭" onClick={() => setPanel(null)}>
              <X size={18} />
            </button>
          </div>
          <div className="shub-drawer-body" ref={setDrawerHost} />
        </div>
      </>
    )}
  </div>;
}
