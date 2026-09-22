import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Check, ChevronDown,
  GraduationCap, Sun, FlaskConical, Star, PartyPopper, CalendarPlus,
  ClipboardList, Users, Cake, Plane, Stethoscope, Heart,
} from 'lucide-react';
import DateTimePicker from '../components/DateTimePicker';
import { useAuth } from '../components/AuthGate';
import { loadItems, groupByDate, urgency, urgentStyle, badgeText } from './HomeworkBoard';

/* ============================================================
   个人日程表 · Planner
   - 月历视图：自动植入本学期(2026)法定节假日 + 调休补班
   - 自定义日程：开学/放假/考试/活动/自定义，精确到几月几日几点
   - 数据本地存储
   ============================================================ */

const LS_KEY = 'PlannerData';
import { userKey, isAuthed } from '../lib/auth';
const LS_READ = () => userKey(LS_KEY);
const ACCENT = '#A48830';
const ACCENT_SOFT = '#FFF9DF';
const ACCENT_LINE = 'rgba(164,136,48,.42)';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

/* 2026 法定节假日（来源：国务院办公厅 国办发明电〔2025〕7号） */
const HOLIDAYS = [
  { name: '元旦',   from: '2026-01-01', to: '2026-01-03' },
  { name: '春节',   from: '2026-02-15', to: '2026-02-23' },
  { name: '清明',   from: '2026-04-04', to: '2026-04-06' },
  { name: '劳动节', from: '2026-05-01', to: '2026-05-05' },
  { name: '端午节', from: '2026-06-19', to: '2026-06-21' },
  { name: '中秋节', from: '2026-09-25', to: '2026-09-27' },
  { name: '国庆节', from: '2026-10-01', to: '2026-10-07' },
];
const WORKDAYS = ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'];

/* 日程分类（色点 + 图标 + 主题色，用于下拉、标签与月历条） */
const CATS = {
  开学:   { color: '#0CA678', icon: GraduationCap },
  放假:   { color: '#E8930C', icon: Sun },
  考试:   { color: '#E14B4B', icon: FlaskConical },
  活动:   { color: '#5B6EE8', icon: PartyPopper },
  作业:   { color: '#7B6BD6', icon: ClipboardList },
  会议:   { color: '#3F7CAF', icon: Users },
  生日:   { color: '#D45C93', icon: Cake },
  旅行:   { color: '#1F9C93', icon: Plane },
  医疗:   { color: '#B0664A', icon: Stethoscope },
  纪念日: { color: '#9B7FC4', icon: Heart },
  自定义: { color: '#6c757d', icon: Star },
};

const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* 把一段日期展开为数组 */
function range(from, to) {
  const out = [];
  const d = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (d <= end) { out.push(fmt(d)); d.setDate(d.getDate() + 1); }
  return out;
}
/* 某日命中的公假名（可多个） */
function holidayName(date) {
  return HOLIDAYS.filter((h) => range(h.from, h.to).includes(date)).map((h) => h.name);
}

/* 类型下拉：色点 + 图标 + 名称，选中打勾，点击外部或按 Esc 关闭 */
function CatSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const cur = CATS[value] || CATS['自定义'];
  const CurIcon = cur.icon;

  return (
    <div className="pl-catsel" ref={ref}>
      <button type="button" className={`pl-catsel-btn${open ? ' on' : ''}`} onClick={() => setOpen((v) => !v)}>
        <span className="dot" style={{ background: cur.color }} />
        <CurIcon size={13} style={{ color: cur.color }} />
        <span className="txt">{value}</span>
        <ChevronDown size={13} className={`arw${open ? ' up' : ''}`} />
      </button>
      {open && (
        <div className="pl-catpop">
          {Object.keys(CATS).map((k) => {
            const c = CATS[k];
            const Icon = c.icon;
            const on = k === value;
            return (
              <button
                type="button"
                key={k}
                className={`pl-catopt${on ? ' on' : ''}`}
                onClick={() => { onChange(k); setOpen(false); }}
              >
                <span className="dot" style={{ background: c.color }} />
                <Icon size={13} style={{ color: c.color }} />
                <span className="txt">{k}</span>
                {on && <Check size={13} style={{ marginLeft: 'auto', color: ACCENT }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Planner({ active = true }) {
  const { guard, authed } = useAuth();
  const CLOUD_KEY = 'schedule-planner-v1';   // 云端同步键（2026-09-20：登录后跨设备跟随）
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() + 1 });
  const [selected, setSelected] = useState(fmt(today));
  const [events, setEvents] = useState([]);
  const [hw, setHw] = useState([]);
  const [loaded, setLoaded] = useState(false);
  // 添加表单
  const [form, setForm] = useState({
    date: fmt(today), time: '12:00', title: '', cat: '自定义', note: '',
  });
  const [toast, setToast] = useState('');
  const toastRef = useRef(null);
  const say = (m) => { setToast(m); clearTimeout(toastRef.current); toastRef.current = setTimeout(() => setToast(''), 1800); };

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_READ()) || 'null');
      if (raw && Array.isArray(raw)) setEvents(raw);
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  /* ===== 云端同步（2026-09-20）：登录后数据上云，跨设备跟随 =====
     authed/uid 变化时执行一次：云端有 → 以云端为准覆盖本机；云端无 → 把本机数据首推上云
     （含未登录时期写入的 PlannerData_local 旧键，一次性迁移） */
  useEffect(() => {
    if (!loaded) return;
    let alive = true;
    (async () => {
      try {
        if (!authed || !isAuthed()) return;
        const cloud = await window.electronAPI?.loadData?.(CLOUD_KEY);
        if (!alive) return;
        if (Array.isArray(cloud)) {
          setEvents(cloud);
          try { localStorage.setItem(LS_READ(), JSON.stringify(cloud)); } catch { /* ignore */ }
        } else {
          const local = JSON.parse(localStorage.getItem(LS_READ()) || 'null');
          const legacy = JSON.parse(localStorage.getItem('PlannerData_local') || 'null');
          const first = Array.isArray(local) && local.length ? local : (Array.isArray(legacy) && legacy.length ? legacy : null);
          if (first) await window.electronAPI?.saveData?.(CLOUD_KEY, first);
        }
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [authed, loaded]);

  /* 作业数据只读透出：切回本视图时重新读取，避免与作业看板的改动脱节 */
  const reloadHw = () => { try { setHw(loadItems()); } catch { setHw([]); } };
  useEffect(reloadHw, []);
  useEffect(() => { if (active) reloadHw(); }, [active]);

  const persist = (next) => {
    if (!guard()) return;
    setEvents(next);
    try { localStorage.setItem(LS_READ(), JSON.stringify(next)); } catch { /* ignore */ }
    try { Promise.resolve(window.electronAPI?.saveData?.(CLOUD_KEY, next)).catch(() => {}); } catch { /* ignore */ }
  };

  const byDate = useMemo(() => {
    const m = {};
    events.forEach((e) => { (m[e.date] = m[e.date] || []).push(e); });
    Object.values(m).forEach((arr) => arr.sort((a, b) => (a.time < b.time ? -1 : 1)));
    return m;
  }, [events]);

  const hwByDate = useMemo(() => groupByDate(hw), [hw]);

  /* 当月所有可渲染的天（含上月/下月补齐） */
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m - 1, 1);
    const offset = (first.getDay() + 6) % 7; // 周一为本周第一
    const daysInMonth = new Date(view.y, view.m, 0).getDate();
    const out = [];
    const prevMonthDays = new Date(view.y, view.m - 1, 0).getDate();
    for (let i = 0; i < offset; i++) {
      const d = new Date(view.y, view.m - 2, prevMonthDays - offset + 1 + i);
      out.push({ date: fmt(d), day: d.getDate(), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) out.push({ date: `${view.y}-${pad(view.m)}-${pad(d)}`, day: d, inMonth: true });
    let total = out.length;
    let next = 1;
    while (total % 7 !== 0) { out.push({ date: '', day: next++, inMonth: false }); total++; }
    return out;
  }, [view]);

  const move = (delta) => {
    const m0 = (view.m - 1 + delta + 12) % 12;
    const y = view.y + Math.floor((view.m - 1 + delta) / 12);
    setView({ y, m: m0 + 1 });
  };

  const todayStr = fmt(today);
  const selWeekday = WEEK[(new Date(selected + 'T00:00:00').getDay() + 6) % 7];
  const selHolidays = holidayName(selected);
  const selEvents = byDate[selected] || [];
  const selHw = hwByDate[selected] || [];
  const isWorkday = WORKDAYS.includes(selected);

  const addEvent = () => {
    if (!form.title.trim()) { say('请填写具体事项'); return; }
    const e = { id: Date.now() + Math.random().toString(36).slice(2, 6), ...form, title: form.title.trim(), note: form.note.trim() };
    persist([...events, e]);
    say('已添加日程');
    setForm({ date: selected, time: form.time, title: '', cat: form.cat, note: '' });
  };
  const removeEvent = (id) => { persist(events.filter((e) => e.id !== id)); say('已删除'); };
  const clearAll = () => { persist([]); say('已清空自定义日程'); };

  return (
    <div className="pl-page">
      <style>{`
        .pl-page { display:flex; flex-direction:column; gap:18px; }
        .pl-card { background:#fff;border:1px solid rgba(20,24,33,.09);border-radius:14px;box-shadow:0 1px 2px rgba(16,20,30,.04);padding:18px 20px; }
        .pl-top { display:flex;align-items:center;gap:10px; }
        .pl-top h3 { margin:0;font-size:15px;font-weight:700;color:#212529; }
        .pl-ico { width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:${ACCENT_SOFT};color:${ACCENT}; }
        .pl-sp { flex:1; }
        .pl-btn { display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(20,24,33,.12);background:#fff;color:#495057;border-radius:9px;font-size:13px;font-weight:600;padding:8px 13px;cursor:pointer;transition:all .15s ease; }
        .pl-btn:hover { border-color:${ACCENT_LINE};color:${ACCENT}; }
        .pl-btn.primary { background:${ACCENT};border-color:${ACCENT};color:#fff; }
        .pl-btn.primary:hover { opacity:.92; }
        .pl-btn.danger:hover { color:#EF4444;border-color:rgba(239,68,68,.4); }
        .pl-input { border:1px solid rgba(20,24,33,.13);border-radius:9px;padding:8px 11px;font-size:13px;background:#fff;color:#212529;outline:none; }
        .pl-input:focus { border-color:${ACCENT}; }
        .pl-label { font-size:12px;color:#6c757d;font-weight:600;display:block;margin-bottom:5px; }
        .pl-mbar { display:flex;align-items:center;gap:10px; }
        .pl-mbar b { font-size:16px; }
        /* 日历 */
        .pl-grid { display:grid;grid-template-columns:repeat(7,1fr);gap:5px;margin-top:12px; }
        .pl-dow { text-align:center;font-size:11.5px;color:#adb5bd;font-weight:700;padding-bottom:6px; }
        .pl-cell { border:1px solid rgba(20,24,33,.07);border-radius:9px;min-height:78px;padding:6px;cursor:pointer;background:#FCFCFD;position:relative;transition:border-color .15s ease; }
        .pl-cell:hover { border-color:${ACCENT_LINE}; }
        .pl-cell.sel { border:2px solid ${ACCENT}; }
        .pl-cell.off { opacity:.4; }
        .pl-cell .num { font-size:12px;font-weight:700;color:#495057; }
        .pl-cell.holiday { background:#FFF6EE; }
        .pl-cell.holiday .num { color:#E8590C; }
        .pl-cell.workday { background:#FBF7E9; }
        .pl-cell.today .num { color:${ACCENT}; }
        .pl-cell .hol { font-size:10px;color:#E8590C;font-weight:700;margin-top:2px;line-height:1.3; }
        .pl-cell .ev { font-size:10.5px;color:#212529;background:#fff;border-radius:5px;padding:1px 4px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-left:3px solid #0CA678; }
        .pl-cell .ev2 { border-left-color:#6366F1; }
        .pl-cell .ev.hw { background:#FFFDF2; color:#495057; font-weight:600; }
        .pl-cell .more { font-size:10px;color:#adb5bd;margin-top:2px; }
        /* 右栏 */
        .pl-detail { display:flex;flex-direction:column;gap:10px; }
        .pl-ev { display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;background:#F8F9FA;border:1px solid rgba(20,24,33,.07); }
        .pl-ev .title { font-size:13px;font-weight:700;color:#212529; }
        .pl-ev .meta { font-size:11px;color:#6c757d; }
        .pl-cat { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px; }
        .pl-catsel { position:relative; }
        .pl-catsel-btn { display:inline-flex;align-items:center;gap:7px;min-width:124px;border:1px solid rgba(20,24,33,.13);background:#fff;border-radius:9px;padding:8px 11px;font-size:13px;font-weight:600;color:#212529;cursor:pointer;transition:all .15s ease; }
        .pl-catsel-btn:hover { border-color:${ACCENT_LINE}; }
        .pl-catsel-btn.on { border-color:${ACCENT};box-shadow:0 0 0 3px rgba(164,136,48,.13); }
        .pl-catsel-btn .dot, .pl-catopt .dot { width:8px;height:8px;border-radius:999px;flex:none; }
        .pl-catsel-btn .txt, .pl-catopt .txt { flex:1;text-align:left; }
        .pl-catsel-btn .arw { color:#adb5bd;transition:transform .18s ease; }
        .pl-catsel-btn .arw.up { transform:rotate(180deg); }
        .pl-catpop { position:absolute;top:calc(100% + 6px);left:0;z-index:40;width:172px;max-height:268px;overflow-y:auto;background:#fff;border:1px solid rgba(20,24,33,.10);border-radius:12px;box-shadow:0 18px 36px -16px rgba(16,20,30,.30);padding:6px;display:flex;flex-direction:column;gap:2px; }
        .pl-catopt { display:flex;align-items:center;gap:8px;width:100%;border:none;background:transparent;border-radius:8px;padding:7px 9px;font-size:13px;font-weight:600;color:#343a40;cursor:pointer;text-align:left;transition:background .13s ease; }
        .pl-catopt:hover { background:#FCFAF2; }
        .pl-catopt.on { background:${ACCENT_SOFT};color:#1b1b1b; }
        .pl-hw { border-top:1px dashed rgba(20,24,33,.14);padding-top:10px;display:flex;flex-direction:column;gap:10px; }
        .pl-hw-title { font-size:12px;color:#6c757d;font-weight:600; }
        .pl-toast { position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#212529;color:#fff;padding:9px 16px;border-radius:999px;font-size:12.5px;z-index:99; }
        /* ── 手机端断点：≤767px（2026-09-22 从 ≤560 抬上来）────────────
           为什么是 767：站点 index.css 的手机口径就是 max-width:767px，字号/触控
           阶梯全部在 767 生效。本块以前只写 ≤560，于是 561–767（平板竖屏、
           小折叠屏外屏）两头不靠：既拿不到均分列，也拿不到 44px 触控兜底。
           实测 700 档改前：月历七列被撑成 [83.6,179.6,155.6,157.6,32.5,32.5,32.5]、
           .pl-grid 溢出 121px、周五到周日三列压到 32.5px，「类型」下拉与
           DateTimePicker 触发钮只有 40 / 40.7px —— 全是这段空档造成的。 */
        @media (max-width:767px) {
          .pl-card { padding:14px 12px; }
          .pl-top { gap:8px; align-items:flex-start; flex-wrap:wrap; }
          /* 相邻可点控件间距 ≥8（站点拇指间距口径）：上一月 / 月份 / 下一月 / 今天
             四个钮以前挤在 6px，改 8 后实测 .pl-mbar 226px < 可用 298px，不折行 */
          .pl-mbar { gap:8px; flex:0 0 auto; }
          .pl-mbar b { flex:0 0 auto; white-space:nowrap; font-size:14px; }
          .pl-mbar .pl-btn { padding:8px 10px; }
          .pl-top > .pl-label { width:calc(100% - 42px); margin-left:42px !important; }
          /* 星期表头是月历的列头（主信息），抬到标签级；
             七列靠 1fr 自适应，两字列头 28px < 360 档单列宽 ~35px，不会折行 */
          .pl-dow { font-size:var(--fs-label); }
          /* ── 手机端排版修复（2026-09-22）────────────────────────
             以下新增只收紧余量，不动任何字号下限：
             .pl-cell .num / .hol / .ev / .more 与 .pl-label 的字号
             由 index.css 里 .tool-content 前缀那批规则定在阶梯上，
             这里一律不写 font-size，避免同特异性互相压来压去。 */
          /* 月历七列：repeat(7,1fr) 的 1fr 等价于 minmax(auto,1fr)，而 .pl-cell .ev
             是 white-space:nowrap —— 实测 390 档带日程的那列被顶到 108px、空列压到 31px，
             整张月历溢出卡片（周四之后全被裁掉）。改成 minmax(0,1fr) 后七列真均分，
             每列 (298-18)/7≈40px，超出部分由 .ev 自带的 ellipsis 收住。 */
          /* 把月历卡左右那 12px 内边距借 8px 给七列（第二张卡是表单，不动，避免输入框贴屏边）。
             两条踩坑记录：
             ① 不能写 .pl-page > .pl-card:first-child —— .pl-page 的第一个子元素是本组件那个
                style 标签，.pl-card 排第二，:first-child 永不命中；:nth-of-type 按 div 计数才对。
             ② 就算选择器对了也压不住：主站 Layout.jsx 用
                .tool-content :is([class*="card"],…):not([class*="grid"]) { padding:12px !important }
                把卡片内边距钉死（实测改 padding-left:4px 后计算值仍是 12px）。
                所以这里不去打 !important 仗，改成在 .pl-grid 上负外边距外扩——
                它不是"卡片"，不在那条选择器范围内；12−8=4px 仍在卡内，不会顶出边框。
                390 档 .pl-grid 可用宽 298 → 314，七列 40.9 → 43.1，
                「中秋节」这类三字公假也从折两行变一行。 */
          .pl-page > .pl-card:nth-of-type(1) > .pl-grid { margin-left:-8px; margin-right:-8px; }
          .pl-grid { grid-template-columns:repeat(7,minmax(0,1fr)); gap:2px; margin-top:8px; }
          .pl-dow { padding-bottom:3px; line-height:1.25; }
          /* 月历格：min-height 76 → 56。56 是拇指下限（≥44）留出的空档，
             有日程的行不再靠 min-height 撑高，改由 .ev 的行数自适应长高 */
          .pl-cell { min-height:56px; padding:2px; border-radius:8px; }
          /* 选中格原本用 2px 实线描边，每侧多吃掉 1px 内容宽——正好把 3 字/行压成
             2 字/行（实测 3 日那格比邻格少看得见两个汉字）。手机端改成 1px 边框
             + inset 阴影补粗，视觉上仍是 2px 金框，文字宽不再被吃掉。 */
          .pl-page .pl-cell.sel { border-width:1px; box-shadow:inset 0 0 0 1px ${ACCENT}; }
          .pl-cell .num { line-height:1.15; }
          .pl-cell .hol, .pl-cell .more { margin-top:1px; }
          /* ── 日程标题：不降级成色点，也不压到 12px 以下 ─────────────
             以前是 nowrap + ellipsis：40px 列里文字宽 25px，「08:00 高等数学期中复习」
             只画得出「08:」——等于没信息。这里改成「换行吃掉格子上下的留白」：
             时间自己占一行（30.1px 正好塞满 37.1px 文字宽），标题从第二行起铺满整宽，
             12px（= 必要信息下限 --fs-meta，不降档）四行可读「高等数学期中复习」。
             实测 390 档逐条看得见的字：
               nowrap 改前      「08:0」——0 个标题字
               三行             「08:00 高等数学期中」6 个标题字，月历高 452、最高格 138
               四行（本方案）   「08:00 高等数学期中复习」全标题，月历高 497、最高格 153
             360 档四行是 5 个标题字（列只有 38.9px，每行 2 字），仍远高于改前的 0 字。
             特异性：.pl-page 前缀凑到 0-3-0 与 index.css 的 .tool-content 打平，
             而本 style 标签在 body 里、文档顺序靠后，所以由它说了算。 */
          .pl-page .pl-cell .ev {
            font-size:var(--fs-meta); line-height:1.25;
            white-space:normal;
            display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:4;
            overflow:hidden;
            /* 左右各借 2px：把 .pl-cell 的内边距也让给文字（37.1 → 41.1px 条宽），
               自身左右只留 1px——文字宽 37.1px 刚好放得下 3 个 12px 汉字 */
            margin:2px -2px 0; padding:0 1px; border-left-width:2px;
          }
          /* 卡片头图标是装饰，缩到 26；详情列表与表单的行距收紧 */
          .pl-ico { width:26px; height:26px; border-radius:7px; }
          .pl-detail { gap:8px; }
          .pl-label { margin-bottom:2px; line-height:1.3; }
          .pl-ev { padding:7px 9px; gap:8px; }
          .pl-ev .title { line-height:1.3; }
          /* 11px 低于 --fs-meta 这条必要信息下限（时间/备注都是要读的） */
          .pl-page .pl-ev .meta { font-size:var(--fs-meta); line-height:1.35; }
          .pl-page .pl-cat { font-size:var(--fs-meta); padding:2px 8px; }
          .pl-hw { padding-top:8px; gap:8px; }
          .pl-hw-title { line-height:1.3; }
          .pl-page > p { line-height:1.55; }
          /* 触控下限：外壳只给 .pl-btn/.cs-btn 那一串兜了 44px，
             类型下拉、下拉项与 DateTimePicker 触发钮都不在里面，实测 40/41/41；
             561–767 这档以前根本没进过本块，所以 700 档量到 40 / 40.7。
             另：外壳 Layout.jsx 那批兜底写在 @media (max-width:720px) 里，
             721–767 反而只剩 index.css 的 40px :where 兵底（实测 767 档 .pl-btn=40），
             所以本页自己按阶梯补齐，.primary 跟主 CTA 档 */
          .pl-page .pl-btn { min-height:var(--ctl-md); }
          .pl-page .pl-btn.primary { min-height:var(--ctl-lg); }
          .pl-page .pl-catsel-btn { min-height:var(--ctl-md); }
          .pl-page .pl-catopt { min-height:var(--ctl-md); }
          .pl-page button[class*="py-2"] { min-height:var(--ctl-md); }
        }
      `}</style>

      {/* 顶部导航 + 月历 */}
      <div className="pl-card">
        <div className="pl-top">
          <div className="pl-ico"><CalendarDays size={18} /></div>
          <div className="pl-mbar">
            <button className="pl-btn" onClick={() => move(-1)}><ChevronLeft size={15} /></button>
            <b>{view.y} 年 {view.m} 月</b>
            <button className="pl-btn" onClick={() => move(1)}><ChevronRight size={15} /></button>
            <button className="pl-btn" onClick={() => { const n = new Date(); setView({ y: n.getFullYear(), m: n.getMonth() + 1 }); setSelected(fmt(n)); }}>今天</button>
          </div>
          <div className="pl-sp" />
          <span className="pl-label" style={{ margin: 0 }}><span style={{ color: '#E8590C' }}>■ 公假</span>　<span style={{ color: '#AD8B00' }}>■ 补班</span></span>
        </div>

        <div className="pl-grid">
          {WEEK.map((w) => <div key={w} className="pl-dow">周{w}</div>)}
          {cells.map((c, i) => {
            if (!c.date) return <div key={i} className="pl-cell off" />;
            const hols = holidayName(c.date);
            const evs = byDate[c.date] || [];
            const hws = hwByDate[c.date] || [];
            const isHoliday = hols.length > 0;
            const isWork = WORKDAYS.includes(c.date);
            return (
              <div
                key={i}
                onClick={() => setSelected(c.date)}
                className={`pl-cell${c.date === selected ? ' sel' : ''}${!c.inMonth ? ' off' : ''}${isHoliday ? ' holiday' : ''}${isWork ? ' workday' : ''}${c.date === todayStr ? ' today' : ''}`}
              >
                <div className="num">{c.day}</div>
                {isHoliday && <div className="hol">{hols.slice(0, 2).join('·')}{hols.length > 2 ? '等' : ''}</div>}
                {isWork && <div className="hol" style={{ color: '#AD8B00' }}>补班</div>}
                {evs.slice(0, 2).map((e, ei) => (
                  <div key={e.id} className={`ev${ei === 1 ? ' ev2' : ''}`} style={{ borderLeftColor: CATS[e.cat]?.color || '#0CA678' }}>
                    {e.time.slice(0, 5)} {e.title}
                  </div>
                ))}
                {evs.length > 2 && <div className="more">+{evs.length - 2} 条</div>}
                {hws.slice(0, 1).map((h) => (
                  <div key={h.id} className="ev hw" style={{ borderLeftColor: urgentStyle(urgency(h)).line }}>
                    {h.title}
                  </div>
                ))}
                {hws.length > 1 && <div className="more">作业 +{hws.length - 1} 条</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 选中日期详情 + 添加 */}
      <div className="pl-card">
        <div className="pl-top">
          <div className="pl-ico"><CalendarDays size={18} /></div>
          <h3>周{selWeekday} · {selected.slice(0, 4)}年{+selected.slice(5, 7)}月{+selected.slice(8, 10)}日</h3>
          <div className="pl-sp" />
          {(selHolidays.length > 0 || isWorkday) && (
            <span className="pl-cat" style={{ color: selHolidays.length ? '#E8590C' : '#AD8B00', background: selHolidays.length ? '#FFF1E6' : '#FBF7E9' }}>
              {selHolidays.join('·') || '调休补班'}
            </span>
          )}
        </div>
        <div className="pl-detail">
          {selEvents.length === 0 ? (
            <p style={{ fontSize: 13, color: '#adb5bd', margin: 0 }}>这一天还没有自定义日程</p>
          ) : selEvents.map((e) => {
            const cat = CATS[e.cat] || CATS['自定义'];
            const Icon = cat.icon;
            return (
              <div key={e.id} className="pl-ev">
                <span className="pl-cat" style={{ color: cat.color, background: `${cat.color}1A` }}><Icon size={12} />{e.cat}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="title">{e.title}</div>
                  <div className="meta">{e.time} 时点 · {e.note || '无备注'}</div>
                </div>
                <button className="pl-btn danger" onClick={() => removeEvent(e.id)}><Trash2 size={14} /></button>
              </div>
            );
          })}

          {selHw.length > 0 && (
            <div className="pl-hw">
              <div className="pl-hw-title">当天作业 · {selHw.length} 条（在「作业看板」中编辑）</div>
              {selHw.map((h) => {
                const st = urgentStyle(urgency(h));
                return (
                  <div key={h.id} className="pl-ev">
                    <span className="pl-cat" style={{ color: st.color, background: st.bg }}>{badgeText(h)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="title">{h.title}</div>
                      <div className="meta">{h.courseName || '未分类'} · {h.dueTime} 截止{h.note ? ` · ${h.note}` : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ borderTop: '1px dashed rgba(20,24,33,.14)', marginTop: 6, paddingTop: 14 }}>
            <div className="pl-top" style={{ marginBottom: 10 }}>
              <div className="pl-ico" style={{ width: 28, height: 28 }}><CalendarPlus size={15} /></div>
              <h3 style={{ fontSize: 14 }}>添加 {selected.slice(5, 7)}月{selected.slice(8, 10)}日 的日程</h3>
            </div>
            <div className="pl-detail">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <div className="pl-label">几点</div>
                  <DateTimePicker mode="time" value={form.time} onChange={(v) => setForm({ ...form, time: v })} width="8.5rem" />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div className="pl-label">具体事项</div>
                  <input className="pl-input" style={{ width: '100%' }} placeholder="例如：开学报到 / 放假回家 / 期末考试" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <div className="pl-label">类型</div>
                  <CatSelect value={form.cat} onChange={(c) => setForm({ ...form, cat: c })} />
                </div>
              </div>
              <div>
                <div className="pl-label">备注（选填）</div>
                <input className="pl-input" style={{ width: '100%' }} placeholder="补充说明" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <div className="pl-top">
                <button className="pl-btn primary" onClick={addEvent}><Plus size={15} />添加日程</button>
                <button className="pl-btn danger" onClick={clearAll}>清空全部自定义日程</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#6c757d', margin: 0 }}>
        公假与补班依据《国务院办公厅关于2026年部分节假日安排的通知》（国办发明电〔2025〕7号）自动植入；你添加的开学 / 放假等自定义日程保存在本机。
      </p>
      {toast && <div className="pl-toast">{toast}</div>}
    </div>
  );
}
