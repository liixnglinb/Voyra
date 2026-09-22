import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardList, ClipboardCheck, AlertTriangle, Clock, Check, Plus, Trash2,
  BookOpen, ChevronDown, ChevronUp, CalendarClock, Columns3,
} from 'lucide-react';
import DateTimePicker from '../components/DateTimePicker';
import { useAuth } from '../components/AuthGate';
import { userKey, isAuthed } from '../lib/auth';

/* ============================================================
   作业看板 · HomeworkBoard
   - 记录「哪门课留了什么作业、什么时候交」，以提醒为主要用途
   - 数据本机 localStorage（userKey 分键），与课程表 / 日历日程同层
   - 截止日期可用「第 X 周」换算（复用课程表的 settings.startDate）
   - 纯函数一并导出，供日历日程（Planner）只读透出复用
   - 样式自带 hw-* token，不依赖 Planner 的 pl-* 是否挂载
   ============================================================ */

const LS_KEY = 'HomeworkData';
const LS_COURSES = 'ClassScheduleData';
const LS_READ = () => userKey(LS_KEY);
const MAX_WEEK = 20;

const ACCENT = '#A48830';
const ACCENT_SOFT = '#FFF9DF';
const ACCENT_LINE = 'rgba(164,136,48,.42)';
const OVERDUE = '#EF4444';
const DONE_C = '#0CA678';
const INK = '#212529';
const MUTE = '#6c757d';

const TYPES = {
  作业: ACCENT,
  实验: '#6366F1',
  论文: '#0EA5A4',
  报告: '#F59E0B',
  其他: '#6c757d',
};

const COURSE_PALETTE = ['#A48830', '#109965', '#266DDE', '#6D4ADC', '#DF5432', '#0E89A3'];

const URGENT = {
  overdue: { color: OVERDUE, bg: '#FEECEC', line: OVERDUE },
  today: { color: '#B45309', bg: '#FFF4DE', line: ACCENT },
  soon: { color: '#8A7327', bg: ACCENT_SOFT, line: ACCENT },
  later: { color: MUTE, bg: '#F8F9FA', line: 'rgba(20,24,33,.16)' },
  done: { color: DONE_C, bg: '#E7F6EF', line: 'rgba(12,166,120,.5)' },
  none: { color: MUTE, bg: '#F8F9FA', line: 'rgba(20,24,33,.16)' },
};

const pad = (n) => String(n).padStart(2, '0');
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const WD_CN = ['日', '一', '二', '三', '四', '五', '六'];

/* ---------------- 纯函数（可脱离组件单独验证） ---------------- */

export function normalizeItem(it) {
  const n = { ...(it || {}) };
  n.title = String(n.title || '').trim();
  n.courseName = String(n.courseName || '').trim();
  n.courseId = n.courseId || null;
  n.type = TYPES[n.type] ? n.type : '作业';
  n.dueDate = /^\d{4}-\d{2}-\d{2}$/.test(n.dueDate || '') ? n.dueDate : '';
  n.dueTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(n.dueTime || '') ? n.dueTime : '23:59';
  n.note = String(n.note || '').trim();
  n.status = n.status === 'done' ? 'done' : 'todo';
  n.score = n.score === undefined || n.score === null ? '' : String(n.score).trim();
  return n;
}

function readJson(raw) {
  try { return JSON.parse(raw || 'null'); } catch { return null; }
}

/* raw 传入字符串时脱离 localStorage 单独可测 */
export function loadItems(raw) {
  const src = raw === undefined ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(LS_READ())) : raw;
  const arr = readJson(src);
  if (!Array.isArray(arr)) return [];
  return arr.filter((x) => x && x.id).map((x) => normalizeItem(x));
}

export function loadCourses(raw) {
  const src = raw === undefined ? (typeof localStorage === 'undefined' ? null : localStorage.getItem(userKey(LS_COURSES))) : raw;
  const obj = readJson(src);
  if (!obj || typeof obj !== 'object') return { courses: [], startDate: '' };
  const courses = Array.isArray(obj.courses) ? obj.courses.filter((c) => c && c.id) : [];
  return { courses, startDate: (obj.settings && obj.settings.startDate) || '' };
}

/* 截止时刻毫秒；无有效日期返回 Infinity（排序沉底） */
export function dueMs(it) {
  if (!it || !it.dueDate) return Infinity;
  const t = new Date(`${it.dueDate}T${/^([01]\d|2[0-3]):[0-5]\d$/.test(it.dueTime || '') ? it.dueTime : '23:59'}:00`);
  const ms = t.getTime();
  return Number.isNaN(ms) ? Infinity : ms;
}

/* 距今天多少个自然日（负数为已过期）；无有效日期返回 null */
export function daysLeft(it, now = new Date()) {
  if (!it || !it.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(it.dueDate)) return null;
  const a = new Date(`${it.dueDate}T00:00:00`);
  if (Number.isNaN(a.getTime())) return null;
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a.getTime() - b.getTime()) / 864e5);
}

export function urgency(it, now = new Date()) {
  if (it.status === 'done') return 'done';
  const d = daysLeft(it, now);
  if (d === null) return 'none';
  if (d < 0) return 'overdue';
  if (d === 0) return now.getTime() > dueMs(it) ? 'overdue' : 'today';
  if (d <= 7) return 'soon';
  return 'later';
}

export function countDays(items, now = new Date()) {
  const c = { overdue: 0, today: 0, soon: 0, later: 0, none: 0, done: 0 };
  for (const it of items) c[urgency(it, now)] += 1;
  return c;
}

export function attentionItems(items, now = new Date()) {
  const keep = { overdue: 1, today: 1, soon: 1 };
  return items.filter((it) => keep[urgency(it, now)]).sort((a, b) => dueMs(a) - dueMs(b));
}

export function sortByDue(items) {
  return [...items].sort((a, b) => dueMs(a) - dueMs(b));
}

/* 日历日程透出用：{ 'YYYY-MM-DD': [items 按时间升序] } */
export function groupByDate(items) {
  const m = {};
  for (const it of items) {
    if (!it.dueDate) continue;
    (m[it.dueDate] = m[it.dueDate] || []).push(it);
  }
  for (const k of Object.keys(m)) m[k].sort((a, b) => dueMs(a) - dueMs(b));
  return m;
}

/* 周次换算，口径与课程表 autoWeek 一致；越出学期范围返回 null */
export function weekOfDate(startDate, dueDate) {
  if (!startDate || !dueDate) return null;
  const s = new Date(`${startDate}T00:00:00`);
  const d = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(d.getTime())) return null;
  const w = Math.floor((d.getTime() - s.getTime()) / 864e5 / 7) + 1;
  if (w < 1 || w > MAX_WEEK) return null;
  return { week: w, weekday: WD_CN[d.getDay()] };
}

export function dueLabel(it, startDate) {
  if (!it.dueDate) return { main: '未设截止', sub: '' };
  const d = new Date(`${it.dueDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { main: '日期无效', sub: '' };
  const w = weekOfDate(startDate, it.dueDate);
  return {
    main: `${d.getMonth() + 1}月${d.getDate()}日 ${(it.dueTime || '23:59').slice(0, 5)}`,
    sub: w ? `第${w.week}周 · 周${w.weekday}` : `周${WD_CN[d.getDay()]}`,
  };
}

export function courseColor(name) {
  const s = String(name || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return COURSE_PALETTE[h % COURSE_PALETTE.length];
}

export function urgentStyle(u) {
  return URGENT[u] || URGENT.none;
}

export function badgeText(it, now = new Date()) {
  const u = urgency(it, now);
  const d = daysLeft(it, now);
  if (u === 'done') return '已交';
  if (u === 'overdue') return d === -1 ? '昨天到期' : (d === null ? '已逾期' : `逾期 ${-d} 天`);
  if (u === 'today') return '今天到期';
  if (u === 'none') return '未设截止';
  return `还有 ${d} 天`;
}

/* ---------------- 组件 ---------------- */

export default function HomeworkBoard({ active = true }) {
  const { guard, authed } = useAuth();
  const CLOUD_KEY = 'schedule-homework-v1';   // 云端同步键（2026-09-20：登录后跨设备跟随）
  const [items, setItems] = useState([]);
  const [courses, setCourses] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [expanded, setExpanded] = useState({});
  const [quickOpen, setQuickOpen] = useState(false);
  const [clearArmed, setClearArmed] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({
    course: '', title: '', dueDate: dateStr(new Date()), dueTime: '23:59', type: '作业', note: '',
  });
  const clearRef = useRef(null);
  const toastRef = useRef(null);
  const titleRef = useRef(null);

  const say = (m) => { setToast(m); clearTimeout(toastRef.current); toastRef.current = setTimeout(() => setToast(''), 1800); };

  const reload = () => {
    setItems(loadItems());
    const c = loadCourses();
    setCourses(c.courses);
    setStartDate(c.startDate);
  };

  useEffect(reload, []);
  useEffect(() => { if (active) reload(); }, [active]);

  /* ===== 云端同步（2026-09-20）：登录后作业数据上云，跨设备跟随 ===== */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!authed || !active || !isAuthed()) return;
        const cloud = await window.electronAPI?.loadData?.(CLOUD_KEY);
        if (!alive) return;
        if (Array.isArray(cloud)) {
          setItems(cloud);
          try { localStorage.setItem(LS_READ(), JSON.stringify(cloud)); } catch { /* ignore */ }
        } else {
          const local = JSON.parse(localStorage.getItem(LS_READ()) || 'null');
          const legacy = JSON.parse(localStorage.getItem('HomeworkData_local') || 'null');
          const first = Array.isArray(local) && local.length ? local : (Array.isArray(legacy) && legacy.length ? legacy : null);
          if (first) await window.electronAPI?.saveData?.(CLOUD_KEY, first);
        }
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [authed, active]);
  useEffect(() => {
    if (quickOpen) requestAnimationFrame(() => { if (titleRef.current) titleRef.current.focus(); });
  }, [quickOpen]);

  const persist = (next) => {
    if (!guard()) return false;
    setItems(next);
    try {
      localStorage.setItem(LS_READ(), JSON.stringify(next));
      try { Promise.resolve(window.electronAPI?.saveData?.(CLOUD_KEY, next)).catch(() => {}); } catch { /* ignore */ }
      return true;
    } catch {
      say('保存失败：本机存储空间不足');
      return false;
    }
  };

  const now = new Date();
  const counts = useMemo(() => countDays(items, now), [items]);
  const attention = useMemo(() => attentionItems(items, now), [items]);
  const undone = useMemo(() => sortByDue(items.filter((i) => i.status !== 'done')), [items]);
  /* 与「需要留意」不重叠：只留 7 天以外与未设截止的 */
  const farOut = useMemo(
    () => undone.filter((i) => ['later', 'none'].includes(urgency(i, now))),
    [undone, now],
  );

  const courseNames = useMemo(() => {
    const seen = {};
    const out = [];
    const push = (n) => { if (n && !seen[n]) { seen[n] = 1; out.push(n); } };
    courses.forEach((c) => push(String(c.name || '').trim()));
    items.forEach((it) => push(it.courseName));
    return out;
  }, [courses, items]);

  const groups = useMemo(() => {
    const byId = {};
    courses.forEach((c) => { byId[c.id] = c; });
    const out = [];
    const idx = {};
    items.forEach((it) => {
      const c = it.courseId ? byId[it.courseId] : null;
      const name = (c && String(c.name || '').trim()) || it.courseName || '未分类';
      if (idx[name] === undefined) {
        idx[name] = out.length;
        out.push({ name, teacher: (c && c.teacher) || '', items: [], undone: 0 });
      }
      const g = out[idx[name]];
      g.items.push(it);
      if (it.status !== 'done') g.undone += 1;
    });
    out.forEach((g) => { g.items = sortByDue(g.items); });
    return out.sort((a, b) => (b.undone - a.undone) || dueMs(a.items[0]) - dueMs(b.items[0]));
  }, [items, courses]);

  const weekHint = weekOfDate(startDate, form.dueDate);

  const askClear = () => {
    if (clearArmed) {
      clearTimeout(clearRef.current);
      setClearArmed(false);
      if (persist([])) say('已清空全部作业');
      return;
    }
    setClearArmed(true);
    clearTimeout(clearRef.current);
    clearRef.current = setTimeout(() => setClearArmed(false), 4000);
  };

  const addHomework = () => {
    const title = form.title.trim();
    if (!title) { say('请填写作业内容'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dueDate)) { say('请选择截止日期'); return; }
    const name = form.course.trim();
    const hit = courses.find((c) => String(c.name || '').trim() === name) || null;
    const item = normalizeItem({
      id: Date.now() + Math.random().toString(36).slice(2, 6),
      courseId: hit ? hit.id : null,
      courseName: name,
      title,
      type: form.type,
      dueDate: form.dueDate,
      dueTime: form.dueTime,
      note: form.note.trim(),
      status: 'todo',
      createdAt: Date.now(),
    });
    if (persist([...items, item])) {
      say('已添加作业');
      setForm({ ...form, title: '', note: '' });
    }
  };

  const toggleDone = (id) => {
    persist(items.map((it) => (
      it.id === id
        ? { ...it, status: it.status === 'done' ? 'todo' : 'done', score: it.status === 'done' ? it.score : '' }
        : it
    )));
  };

  const setScore = (id, v) => { persist(items.map((it) => (it.id === id ? { ...it, score: v } : it))); };

  const removeItem = (id) => {
    if (persist(items.filter((it) => it.id !== id))) say('已删除');
  };

  const renderRow = (it, showCourse) => {
    const u = urgency(it, now);
    const st = urgentStyle(u);
    const lbl = dueLabel(it, startDate);
    return (
      <div key={it.id} className={`hw-row${u === 'done' ? ' done' : ''}`} style={{ borderLeftColor: st.line }}>
        <button
          type="button"
          className="hw-check"
          title={it.status === 'done' ? '标为未交' : '标为已交'}
          onClick={() => toggleDone(it.id)}
        >
          {it.status === 'done' && <Check size={14} strokeWidth={3} />}
        </button>
        <div className="hw-row-body">
          <div className="hw-row-title">
            {showCourse && (
              <span className="hw-row-course" style={{ background: courseColor(it.courseName) }}>
                {it.courseName || '未分类'}
              </span>
            )}
            <span className="hw-row-name">{it.title}</span>
            <span className="hw-type" style={{ color: TYPES[it.type], background: `${TYPES[it.type]}1A` }}>{it.type}</span>
          </div>
          <div className="hw-row-meta">
            <span>{lbl.main}{lbl.sub ? ` · ${lbl.sub}` : ''}</span>
            {!!it.note && <span className="hw-note">· {it.note}</span>}
            {it.status === 'done' && (
              <label className="hw-score">
                分数
                <input
                  className="hw-input hw-score-in"
                  value={it.score}
                  placeholder="选填"
                  onChange={(e) => setScore(it.id, e.target.value.replace(/[^\d./]/g, ''))}
                />
              </label>
            )}
          </div>
        </div>
        <span className="hw-badge" style={{ color: st.color, background: st.bg }}>{badgeText(it, now)}</span>
        <button type="button" className="hw-btn hw-del" onClick={() => removeItem(it.id)}><Trash2 size={14} /></button>
      </div>
    );
  };

  return <div className="hw-page">
    <style>{`
      .hw-page { display:flex; flex-direction:column; gap:18px; }
      .hw-card { background:#fff; border:1px solid rgba(20,24,33,.09); border-radius:14px;
        box-shadow:0 1px 2px rgba(16,20,30,.04); padding:18px 20px; }
      .hw-top { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
      .hw-ico { width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;
        background:${ACCENT_SOFT};color:${ACCENT};flex:0 0 auto; }
      .hw-top h3 { margin:0;font-size:15px;font-weight:700;color:${INK}; }
      .hw-sp { flex:1 1 auto; }
      .hw-num { font-size:12px;color:${MUTE};font-weight:600; }
      .hw-btn { display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(20,24,33,.12);background:#fff;
        color:#495057;border-radius:9px;font-size:13px;font-weight:600;padding:8px 13px;cursor:pointer;
        transition:border-color .15s ease, color .15s ease, background .15s ease; }
      .hw-btn:hover { border-color:${ACCENT_LINE};color:${ACCENT}; }
      .hw-btn.primary { background:${ACCENT};border-color:${ACCENT};color:#fff; }
      .hw-btn.primary:hover { opacity:.92;color:#fff; }
      .hw-btn.danger:hover { color:${OVERDUE};border-color:rgba(239,68,68,.4); }
      .hw-btn.armed { color:${OVERDUE};border-color:rgba(239,68,68,.55);background:#FEECEC; }
      .hw-input { border:1px solid rgba(20,24,33,.13);border-radius:9px;padding:8px 11px;font-size:13px;
        background:#fff;color:${INK};outline:none;min-width:0; }
      .hw-input:focus { border-color:${ACCENT}; }
      .hw-label { font-size:12px;color:${MUTE};font-weight:600;display:block;margin-bottom:5px; }

      /* 视图切换已移除，三张卡并列 */
      .hw-list { display:flex;flex-direction:column;gap:9px; }

      /* 提醒带 */
      .hw-alerts { display:flex;align-items:stretch;gap:10px;flex-wrap:wrap; }
      .hw-chip { flex:1 1 132px;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;
        border:1px solid rgba(20,24,33,.1);background:#FCFCFD; }
      .hw-chip svg { flex:0 0 auto; }
      .hw-chip-n { display:grid;gap:1px;min-width:0; }
      .hw-chip-n b { font-size:20px;line-height:1.05;font-weight:750;letter-spacing:-.02em; }
      .hw-chip-n i { font-style:normal;font-size:11.5px;color:${MUTE};white-space:nowrap; }
      .hw-chip.is-overdue b { color:${OVERDUE}; }
      .hw-chip.is-today b { color:${ACCENT}; }
      .hw-chip.is-week b { color:#B45309; }
      .hw-chip.is-all b { color:#1b1b1b; }
      .hw-clear { align-self:center;flex:0 0 auto; }

      /* 录入 */
      .hw-addline { display:flex;align-items:center;gap:10px;flex-wrap:wrap; }
      .hw-quick { display:flex;flex-direction:column;gap:12px; }
      .hw-frow { display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end; }
      .hw-fmain { flex:1 1 240px; }
      .hw-fnote { flex:1 1 200px; }
      .hw-week { font-size:11.5px;color:${ACCENT};font-weight:650;margin-bottom:7px; }
      .hw-week.off { color:#adb5bd; }
      .hw-hint { font-size:11.5px;color:#adb5bd;margin:0; }

      /* 作业行 */
      .hw-head { margin-bottom:4px; }
      .hw-row { display:flex;align-items:flex-start;gap:11px;padding:11px 12px;border-radius:11px;
        border:1px solid rgba(20,24,33,.08);border-left:4px solid rgba(20,24,33,.14);background:#FCFCFD;
        transition:border-color .15s ease; }
      .hw-row:hover { border-color:${ACCENT_LINE}; }
      .hw-row.done { background:#FAFAFB; }
      .hw-row.done .hw-row-name { color:#adb5bd;text-decoration:line-through; }
      .hw-check { flex:0 0 auto;width:22px;height:22px;margin-top:1px;border-radius:7px;
        border:1.6px solid rgba(20,24,33,.24);background:#fff;display:flex;align-items:center;
        justify-content:center;color:#fff;cursor:pointer;padding:0;transition:border-color .15s ease, background .15s ease; }
      .hw-check:hover { border-color:${DONE_C};background:${DONE_C}; }
      .hw-row.done .hw-check { border-color:${DONE_C};background:${DONE_C}; }
      .hw-row-body { flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:4px; }
      .hw-row-title { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
      .hw-row-name { font-size:13.5px;font-weight:700;color:${INK};overflow-wrap:anywhere; }
      .hw-row-course { font-size:10.5px;font-weight:700;color:#fff;border-radius:5px;padding:2px 7px;white-space:nowrap; }
      .hw-type { font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:999px; }
      .hw-row-meta { display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11.5px;color:${MUTE}; }
      .hw-note { color:#868e96;overflow-wrap:anywhere; }
      .hw-score { display:inline-flex;align-items:center;gap:5px;color:#868e96;cursor:default; }
      .hw-score-in { padding:3px 7px;font-size:12px;width:76px; }
      .hw-badge { flex:0 0 auto;align-self:center;font-size:11px;font-weight:700;padding:4px 9px;
        border-radius:999px;white-space:nowrap; }
      .hw-del { flex:0 0 auto;align-self:center;padding:6px 9px; }

      /* 课程分组 */
      .hw-groups { display:flex;flex-direction:column;gap:14px; }
      .hw-g { border:1px solid rgba(20,24,33,.08);border-radius:12px;padding:12px 14px;background:#FCFCFD; }
      .hw-g-head { display:flex;align-items:center;gap:9px;flex-wrap:wrap; }
      .hw-g-teacher { font-size:11.5px;color:#868e96; }
      .hw-g-body { display:flex;flex-direction:column;gap:8px;margin-top:10px; }

      .hw-empty { display:flex;flex-direction:column;align-items:center;gap:7px;padding:26px 14px;margin:0;
        color:#868e96;font-size:13px;text-align:center; }
      .hw-empty svg { color:#d3d6db; }
      .hw-foot { font-size:12px;color:${MUTE};margin:0; }
      .hw-toast { position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#212529;color:#fff;
        padding:9px 16px;border-radius:999px;font-size:12.5px;z-index:99; }

      @media (max-width:860px) {
        .hw-card { padding:14px 13px; }
        .hw-chip { flex:1 1 calc(50% - 5px); }
      }
      @media (max-width:560px) {
        .hw-alerts { gap:7px; }
        .hw-chip { flex:1 1 calc(50% - 7px);padding:10px 11px;gap:8px; }
        .hw-chip-n b { font-size:17px; }
        /* 计数下方那行状态字（已逾期/今日待交…）是提醒功能的核心信号，
           原本被压到 10.5px，这里回到辅助信息下限 --fs-meta */
        .hw-chip-n i { font-size:var(--fs-meta); }
        .hw-clear { flex:1 1 100%;justify-content:center; }
        .hw-row { gap:9px;padding:10px 9px; }
        .hw-del { padding:6px 8px; }
        /* 页头说明属辅助信息，同样不低于 --fs-meta */
        .hw-hint { font-size:var(--fs-meta); }
      }
      @media (prefers-reduced-motion:reduce) {
        .hw-page *, .hw-page *::before, .hw-page *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
      }
    `}</style>

    {/* 提醒带：纯计数展示，点击进入对应视图由下方视图切换承担 */}
    <div className="hw-card hw-alerts">
      <div className="hw-chip is-overdue">
        <AlertTriangle size={17} color={OVERDUE} />
        <span className="hw-chip-n"><b>{counts.overdue}</b><i>已逾期</i></span>
      </div>
      <div className="hw-chip is-today">
        <Clock size={17} color={ACCENT} />
        <span className="hw-chip-n"><b>{counts.today}</b><i>今日待交</i></span>
      </div>
      <div className="hw-chip is-week">
        <CalendarClock size={17} color="#B45309" />
        <span className="hw-chip-n"><b>{counts.soon}</b><i>未来 7 天</i></span>
      </div>
      <div className="hw-chip is-all">
        <ClipboardList size={17} color="#495057" />
        <span className="hw-chip-n"><b>{undone.length}</b><i>全部未交</i></span>
      </div>
      {items.length > 0 && (
        <button type="button" className={`hw-btn danger hw-clear${clearArmed ? ' armed' : ''}`} onClick={askClear}>
          {clearArmed ? '再点一次确认清空' : '清空全部'}
        </button>
      )}
    </div>

    {/* 录入：默认收起成一行按钮，避免看板头部过重 */}
    {quickOpen ? (
      <div className="hw-card hw-quick">
        <div className="hw-top">
          <div className="hw-ico"><Plus size={16} /></div>
          <h3>布置作业</h3>
          <div className="hw-sp" />
          <button type="button" className="hw-btn" onClick={() => setQuickOpen(false)}>收起</button>
        </div>
        <div className="hw-frow">
          <div className="hw-fmain">
            <label className="hw-label" htmlFor="hw-f-title">作业内容</label>
            <input
              id="hw-f-title" ref={titleRef} className="hw-input" style={{ width: '100%' }}
              placeholder="例如：第三章课后题 1-8" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') addHomework(); }}
            />
          </div>
          <div>
            <label className="hw-label" htmlFor="hw-f-course">课程</label>
            <input
              id="hw-f-course" className="hw-input" style={{ width: '9.5rem' }} list="hw-course-list"
              placeholder="选或直接输" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}
            />
            <datalist id="hw-course-list">
              {courseNames.map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>
          <div>
            <label className="hw-label" htmlFor="hw-f-date">截止日期</label>
            <input
              id="hw-f-date" className="hw-input" style={{ width: '9.5rem' }} type="date"
              value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div>
            <span className="hw-label">截止时刻</span>
            <DateTimePicker mode="time" value={form.dueTime} onChange={(v) => setForm({ ...form, dueTime: v })} width="8.5rem" />
          </div>
          <div>
            <label className="hw-label" htmlFor="hw-f-type">类型</label>
            <select id="hw-f-type" className="hw-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.keys(TYPES).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="hw-frow">
          <div className="hw-fnote">
            <label className="hw-label" htmlFor="hw-f-note">备注（选填）</label>
            <input
              id="hw-f-note" className="hw-input" style={{ width: '100%' }} placeholder="提交方式、章节范围等"
              value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') addHomework(); }}
            />
          </div>
          <div>
            <div className={`hw-week${startDate ? '' : ' off'}`}>
              {weekHint
                ? `对应教学周：第 ${weekHint.week} 周 · 周${weekHint.weekday}`
                : (startDate ? '该日期不在本学期周次范围内' : '课程表尚未设置开学日期，无法换算周次')}
            </div>
            <button type="button" className="hw-btn primary" onClick={addHomework}><Plus size={15} />添加作业</button>
          </div>
        </div>
        {courses.length === 0 && (
          <p className="hw-hint">课程表里还没有课程，也可以直接输入课程名记录，两者不冲突。</p>
        )}
      </div>
    ) : (
      <div className="hw-addline">
        <button type="button" className="hw-btn primary" onClick={() => setQuickOpen(true)}><Plus size={15} />布置作业</button>
        {items.length === 0 && <span className="hw-hint">记录每门课留了什么作业、什么时候交。</span>}
      </div>
    )}

    {/* 三张独立卡片：需要留意 / 全部未交 / 按课程 */}
    <div className="hw-card">
      <div className="hw-top hw-head">
        <div className="hw-ico"><AlertTriangle size={16} color={counts.overdue ? OVERDUE : ACCENT} /></div>
        <h3>需要留意</h3>
        <div className="hw-sp" />
        <span className="hw-num">{attention.length} 条</span>
      </div>
      <div className="hw-list">
        {attention.length === 0 ? (
          <p className="hw-empty">
            <ClipboardCheck size={26} />
            {items.length === 0 ? '还没有作业记录，点上方「布置作业」开始记录。' : '这几天没有到期的作业。'}
          </p>
        ) : attention.map((it) => renderRow(it, true))}
      </div>
    </div>

    <div className="hw-card">
      <div className="hw-top hw-head">
        <div className="hw-ico"><ClipboardList size={16} /></div>
        <h3>更远的作业</h3>
        <div className="hw-sp" />
        <span className="hw-num">{farOut.length} 条</span>
      </div>
      <div className="hw-list">
        {farOut.length === 0 ? (
          <p className="hw-empty">
            <ClipboardCheck size={26} />
            {items.length === 0 ? '还没有作业记录。' : '7 天以外没有要交的作业了。'}
          </p>
        ) : farOut.map((it) => renderRow(it, true))}
      </div>
    </div>

    <div className="hw-card hw-groups">
      <div className="hw-top hw-head">
        <div className="hw-ico"><BookOpen size={16} /></div>
        <h3>按课程</h3>
        <div className="hw-sp" />
        <span className="hw-num">{groups.length} 门</span>
      </div>
      {groups.length === 0 ? (
        <p className="hw-empty">
          <Columns3 size={26} />
          还没有作业记录。
        </p>
      ) : groups.map((g) => {
        const open = !!expanded[g.name];
        const pend = g.items.filter((i) => i.status !== 'done');
        const done = g.items.filter((i) => i.status === 'done');
        const line = pend.length ? urgentStyle(urgency(pend[0], now)).line : 'rgba(12,166,120,.5)';
        return (
          <div key={g.name} className="hw-g">
            <div className="hw-g-head">
              <span className="hw-row-course" style={{ background: courseColor(g.name) }}>{g.name}</span>
              {!!g.teacher && <span className="hw-g-teacher">{g.teacher}</span>}
              <div className="hw-sp" />
              <span className="hw-num">未交 {pend.length} · 已交 {done.length}</span>
              {done.length > 0 && (
                <button
                  type="button"
                  className="hw-btn"
                  onClick={() => setExpanded({ ...expanded, [g.name]: !open })}
                >
                  {open ? '收起已交' : '看已交'}
                  {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
            <div className="hw-g-body" style={{ borderLeft: `3px solid ${line}`, paddingLeft: 12 }}>
              {pend.length === 0 && <p className="hw-hint">这门课的作业已全部交完。</p>}
              {pend.map((it) => renderRow(it, false))}
              {open && done.map((it) => renderRow(it, false))}
            </div>
          </div>
        );
      })}
    </div>

    <p className="hw-foot">
      作业记录保存在本机浏览器（按登录账号分键），与课程表、日历日程同一层，不上传云端；更换设备或清除浏览器数据会丢失。
    </p>
    {!!toast && <div className="hw-toast">{toast}</div>}
  </div>;
}
