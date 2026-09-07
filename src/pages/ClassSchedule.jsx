import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GraduationCap, Plus, Trash2, Copy, Check, ChevronLeft, ChevronRight,
  Upload, CalendarDays, User, Clock, CalendarRange, Wand2, RefreshCw, Moon,
  MapPin, ChevronDown, ChevronUp, FileSpreadsheet, Loader2,
} from 'lucide-react';
import { useAuth } from '../components/AuthGate';

/* ============================================================
   个人课表 · ClassSchedule
   - 大学课表：以「两节连堂」为节次单位，并内置晚自习块
   - 节次块：1-2 / 3-4 / 5-6 / 7-8 / 晚自习1 / 晚自习2
   - 展示：课程名 / 上课时间 / 节次块 / 第几周到第几周 / 授课老师
   - 周自动定位 + 文本识别导入 + 复制导入模板
   ============================================================ */

const LS_KEY = 'ClassScheduleData';
import { userKey } from '../lib/auth';
const LS_READ = () => userKey(LS_KEY);
const ACCENT = '#A48830';
const ACCENT_SOFT = '#FFF9DF';
const ACCENT_LINE = 'rgba(164,136,48,.42)';

const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];
const MAX_WEEK = 20;

/* 连堂节次块（大学课表按此组织，含晚自习）；用户可在「时间设置」中覆盖 time */
const DEFAULT_SLOTS = [
  { key: '1-2',    label: '1-2 节',   time: '08:00-09:45', start: 1,  night: false },
  { key: '3-4',    label: '3-4 节',   time: '10:00-11:45', start: 3,  night: false },
  { key: '5-6',    label: '5-6 节',   time: '13:30-15:15', start: 5,  night: false },
  { key: '7-8',    label: '7-8 节',   time: '15:30-17:15', start: 7,  night: false },
  { key: '晚自习1', label: '晚自习 1', time: '19:00-20:40', start: 9,  night: true },
  { key: '晚自习2', label: '晚自习 2', time: '20:50-22:15', start: 11, night: true },
];
const SLOTS = DEFAULT_SLOTS;
const SLOT_BY_START = Object.fromEntries(DEFAULT_SLOTS.map((s) => [s.start, s.key]));
const SLOT_META = Object.fromEntries(DEFAULT_SLOTS.map((s) => [s.key, s]));

const INC = { every: '每周', odd: '单周', even: '双周' };

/* 把节次起始号映射到连堂块（含晚自习识别） */
function slotForPeriod(start) {
  return SLOT_BY_START[start] || '1-2';
}

/* 导入模板（复制按钮内容），与解析器一致 */
const IMPORT_TEMPLATE = `请按下面的文本格式填写课表，每门课用「课程」开头的一段，课程之间用空行隔开，粘贴到导入框即可自动识别：

【高等数学】
课程：高等数学
星期：周一
节次：1-2节
周次：1-16周
老师：龙承星副教授
教室：博学楼501

【大学英语】
课程：大学英语
星期：周三
节次：3-4节
周次：1-16周（单周）
老师：李老师

【晚自习·自习】
课程：晚自习
星期：周二
节次：晚自习1
周次：第3周至第16周
老师：（自习/辅导）

填写说明：
· 星期：周一 或 星期一到星期日
· 节次：可直接写连堂块名 —— 1-2节 / 3-4节 / 5-6节 / 7-8节 / 晚自习1 / 晚自习2
· 周次：1-16周（第几周到第几周），可加（单周）/（双周）限定单双周
· 老师：授课教师姓名与职称，如「龙承星副教授」（也可分开写「龙承星 副教授」）
· 教室：上课地点（可选），如 博学楼501 / 致远楼A201
· 课程：课程名称（也可用【】标题作为课程名）`;

/* ---------- 解析器 ---------- */
const reKey = /(课程|名称)[:：]\s*([^\n【】]+)/;
const reTitle = /【\s*([^【】\n]+)\s*】/;
const reWeekday = /(?:星期|周)([一二三四五六日天])/;
const reNight = /晚自习\s*(\d)?/;
const rePeriod = /(?:第)?\s*(\d{1,2})\s*[-~至到—–]\s*(\d{1,2})\s*节|(?:第)?\s*(\d{1,2})\s*节/;
const reWeek = /(?:第)?\s*(\d{1,2})\s*(?:周)?\s*[-~至到—–]\s*(?:第)?\s*(\d{1,2})\s*周|第\s*(\d{1,2})\s*周/;
const reOddEven = /[（(](单|双)周?[)）]|(单|双)周/;
/* 老师：抓取姓名+职称完整串；同一行若后面紧跟「教室/地点」，在此处截断 */
const reTeacher = /(?:授课老师|老师|教师)[:：]\s*([^\n,，;；]+?)(?=\s*(?:教室|地点|上课地点|上课教室|上课地方)[:：]|$)/;
/* 教室：支持「教室：博学楼501」「上课地点：致远楼A201」等写法 */
const reRoom = /(?:教室|上课教室|上课地点|上课地方|地点|room)[:：]?\s*([^\n,，;；]+)/;

const WD = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };

/* 常见教师职称词表（xls 智能识别用） */
const TITLE_HINTS = ['教授', '副教授', '讲师', '助教', '研究员', '副研究员', '高级工程师', '工程师', '实验师', '老师', '教师'];
/* 常见教室特征词表（xls 智能识别用） */
const ROOM_HINTS = ['楼', '教室', '实验室', '机房', '实验中心', '报告厅', '实训', '馆', '室'];

function parseImport(text) {
  const blocks = String(text)
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const out = [];
  for (const raw of blocks) {
    const title = raw.match(reTitle);
    const mKey = raw.match(reKey);
    const name = (mKey && mKey[2] ? mKey[2].trim() : '') || (title ? title[1].trim() : '');
    const d = raw.match(reWeekday);
    const day = d ? WD[d[1]] : null;

    // 晚自习 → 晚自习1/2；否则映射到连堂块
    let slot = null;
    const night = raw.match(reNight);
    if (night) {
      slot = night[1] ? `晚自习${night[1]}` : '晚自习1';
      if (!SLOT_META[slot]) slot = '晚自习1';
    } else {
      const per = raw.match(rePeriod);
      const start = per ? (per[1] ? +per[1] : +per[3]) : 1;
      slot = slotForPeriod(start);
    }

    const week = raw.match(reWeek);
    const f = week ? (week[1] ? +week[1] : +week[3]) : 1;
    const t = week ? (week[1] ? +week[2] : +week[3]) : 16;
    const oe = raw.match(reOddEven);
    const type = oe ? (oe[1] || oe[2]) === '单' ? 'odd' : 'even' : 'every';
    const tch = raw.match(reTeacher);
    const teacher = tch ? tch[1].trim() : '';
    const rm = raw.match(reRoom);
    const room = rm ? rm[1].trim() : '';

    if (name && day) {
      out.push({
        id: Date.now() + Math.random().toString(36).slice(2, 7),
        name, teacher, room, day, slot, f, t, type,
        weeksText: `${f}-${t}周${type !== 'every' ? `（${INC[type]}）` : ''}`,
      });
    }
  }
  return out;
}

/* ============ Excel(.xls/.xlsx) 课表解析 ============ */
const XLS_WEEK = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };

function xlsCell(v) {
  if (v == null) return '';
  return String(v).replace(/[ \t]+/g, ' ').trim(); // 只压缩空格/制表，保留换行（多行单元格）
}

/* 单元格（或单元格内多行片段）分类：返回 {kind,val} 或 null；weeks 段另带 {f,t,type} */
function classifyXlsCell(s) {
  if (!s) return null;
  const day = s.match(/^周?([一二三四五六日天])$/);
  if (day) return { kind: 'day', val: XLS_WEEK[day[1]] };
  const night = s.match(/^晚自习\s*(\d)?$/);
  if (night) return { kind: 'slot', val: night[1] ? `晚自习${night[1]}` : '晚自习1' };
  const per = s.match(/^(?:第)?\s*(\d{1,2})\s*[-~—–至]\s*(\d{1,2})\s*节$/);
  if (per) return { kind: 'slot', val: slotForPeriod(+per[1]) };
  const per1 = s.match(/^(?:第)?\s*(\d{1,2})\s*节$/);
  if (per1) return { kind: 'slot', val: slotForPeriod(+per1[1]) };
  const wk = s.match(/^(?:第)?\s*(\d{1,2})\s*(?:周)?\s*[-~—–至到]\s*(?:第)?\s*(\d{1,2})\s*周(?:[（(](单|双)周?[)）])?$/);
  if (wk) return { kind: 'weeks', f: +wk[1], t: +wk[2], type: wk[3] ? (wk[3] === '单' ? 'odd' : 'even') : 'every' };
  const wk1 = s.match(/^(?:第)?\s*(\d{1,2})\s*周(?:[（(](单|双)周?[)）])?$/);
  if (wk1) return { kind: 'weeks', f: +wk1[1], t: +wk1[1], type: wk1[2] ? (wk1[2] === '单' ? 'odd' : 'even') : 'every' };
  /* 无单位的裸区间（如 1-2 / 3-4），默认按节次块处理 */
  const span = s.match(/^(\d{1,2})\s*[-~—–至]\s*(\d{1,2})$/);
  if (span) return { kind: 'slot', val: slotForPeriod(+span[1]) };
  if (TITLE_HINTS.some((h) => s.includes(h))) return { kind: 'teacher', val: s };
  if (ROOM_HINTS.some((h) => s.includes(h))) return { kind: 'room', val: s };
  if (/^[\u4e00-\u9fa5A-Za-z0-9·、（）()]{2,24}$/.test(s) && /[\u4e00-\u9fa5]/.test(s) && !/^(?:星期|周|第|节|上课)/.test(s)) {
    return { kind: 'name', val: s };
  }
  return null;
}

/* 把一个单元格按换行拆成多段分别分类（教务表常见「课程名\n老师\n教室」挤一格） */
function classifyXlsSegments(s) {
  const parts = String(s).split(/\n|(?:；|;)/).map((t) => t.trim()).filter(Boolean);
  if (parts.length > 1) return parts.map(classifyXlsCell).filter(Boolean);
  const one = classifyXlsCell(s);
  return one ? [one] : [];
}

/* 表头检测：某行包含≥2个表头词 → 返回列映射 {name,teacher,day,slot,weeks,room} */
const XLS_HEADERS = [
  ['name', /(课程名?|科目|课名)/],
  ['teacher', /(老师|教师|授课)/],
  ['day', /(星期|周几)/],
  ['slot', /(节次|第.*节|时间)/],
  ['weeks', /(周次|周数|上课周|起止周)/],
  ['room', /(教室|上课地点|地点|场地)/],
];

function detectXlsHeader(row) {
  const map = {};
  let hit = 0;
  row.forEach((raw, idx) => {
    const s = xlsCell(raw);
    for (const [key, re] of XLS_HEADERS) {
      if (map[key] == null && re.test(s)) { map[key] = idx; hit++; break; }
    }
  });
  return hit >= 2 ? map : null;
}

function mergeXlsSegments(segs) {
  let name = '', teacher = '', room = '', day = null, slot = '', f = 1, t = 16, type = 'every';
  for (const seg of segs) {
    if (seg.kind === 'name' && !name) name = seg.val;
    else if (seg.kind === 'teacher' && !teacher) teacher = seg.val;
    else if (seg.kind === 'room' && !room) room = seg.val;
    else if (seg.kind === 'day' && day == null) day = seg.val;
    else if (seg.kind === 'slot' && !slot) slot = seg.val;
    else if (seg.kind === 'weeks') { f = seg.f; t = seg.t; type = seg.type; }
  }
  if (!name || day == null || !slot) return null;
  return {
    id: Date.now() + Math.random().toString(36).slice(2, 7),
    name, teacher, room, day, slot, f, t, type,
    weeksText: `${f}-${t}周${type !== 'every' ? `（${INC[type]}）` : ''}`,
  };
}

function parseXlsRows(rows) {
  const out = [];
  let colMap = null;
  for (const row of rows) {
    const headerMap = detectXlsHeader(row);
    if (headerMap) { colMap = headerMap; continue; }
    const segs = [];
    if (colMap) {
      // 有表头：按列取值（单元格多行也先分段分类再合并）
      for (const key of ['name', 'teacher', 'day', 'slot', 'weeks', 'room']) {
        const idx = colMap[key];
        if (idx == null) continue;
        const v = xlsCell(row[idx]);
        if (!v) continue;
        if (key === 'day') { const d = v.match(/[一二三四五六日天]/); if (d) segs.push({ kind: 'day', val: XLS_WEEK[d[0]] }); }
        else if (key === 'slot') { segs.push(...classifyXlsSegments(v).filter((s) => s.kind === 'slot')); }
        else if (key === 'weeks') {
          const w = v.match(/(?:第)?\s*(\d{1,2})\s*(?:周)?\s*[-~—–至到]\s*(?:第)?\s*(\d{1,2})\s*周?/);
          if (w) segs.push({ kind: 'weeks', f: +w[1], t: +w[2], type: /[（(]\s*(单|双)\s*周?\s*[)）]/.test(v) ? (/[（(]\s*(单|双)\s*周?\s*[)）]/.exec(v)[1] === '单' ? 'odd' : 'even') : 'every' });
        }
        else if (key === 'teacher') { segs.push(...classifyXlsSegments(v).filter((s) => s.kind === 'teacher')); }
        else if (key === 'room') { segs.push(...classifyXlsSegments(v).filter((s) => s.kind === 'room')); }
        else if (key === 'name') { segs.push(...classifyXlsSegments(v).filter((s) => s.kind === 'name')); }
      }
    } else {
      // 无表头：启发式逐格扫描
      for (const raw of row) {
        segs.push(...classifyXlsSegments(xlsCell(raw)));
      }
    }
    const c = mergeXlsSegments(segs);
    if (c) out.push(c);
  }
  return out;
}

function inWeek(c, w) {
  if (w < c.f || w > c.t) return false;
  if (c.type === 'odd') return w % 2 === 1;
  if (c.type === 'even') return w % 2 === 0;
  return true;
}

export default function ClassSchedule({ stats = null, active = true }) {
  const { guard } = useAuth();
  const [courses, setCourses] = useState([]);
  const [settings, setSettings] = useState({ startDate: '', overrideWeek: null, timeSlots: null });
  const [showSettings, setShowSettings] = useState(false);
  const [showTimeSettings, setShowTimeSettings] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ name: '', teacher: '', room: '', day: 1, slot: '1-2', f: 1, t: 16, type: 'every' });
  const [detailOpen, setDetailOpen] = useState(false); // 课程明细默认折叠
  const [xlsBusy, setXlsBusy] = useState(false);
  const xlsFileRef = useRef(null);
  const toastRef = useRef(null);
  const gridCardRef = useRef(null);
  const [rowH, setRowH] = useState(null);

  /* 课表行高自适应：把视口内剩余高度均摊到 6 个节次行，
     使「第 X 周课表」卡片底边正好贴住可视区底端（明细卡被推出首屏） */
  const fitGrid = () => {
    const card = gridCardRef.current;
    if (!card || !card.offsetWidth || !card.offsetHeight) return; // 视图隐藏时不测量
    const tbody = card.querySelector('tbody');
    if (!tbody) return;

    // 找真正滚动的容器（.tool-wrap 或 window），换算出卡片在文档中的位置与可见底界
    let scroller = null;
    for (let n = card.parentElement; n && n !== document.body; n = n.parentElement) {
      const oy = getComputedStyle(n).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight + 1) { scroller = n; break; }
    }
    const rect = card.getBoundingClientRect();
    const scrollTop = scroller ? scroller.scrollTop : (window.scrollY || 0);
    const limit = scroller ? Math.min(scroller.getBoundingClientRect().bottom, window.innerHeight) : window.innerHeight;
    const docTop = rect.top + scrollTop;
    const deficit = limit - docTop - card.offsetHeight;
    if (Math.abs(deficit) < 2) return;
    const cur = tbody.offsetHeight / SLOTS.length;
    const next = Math.max(72, Math.min(380, cur + deficit / SLOTS.length));
    setRowH(Math.round(next));
  };

  useEffect(() => {
    const raf = requestAnimationFrame(fitGrid);
    const t = setTimeout(fitGrid, 400); // 字体/懒加载稳定后兜底校准
    window.addEventListener('resize', fitGrid);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener('resize', fitGrid); };
  }, []);

  useEffect(() => {
    if (active) requestAnimationFrame(fitGrid);
  }, [active]);

  /* 增删课程 / 设置面板展开收起都会改变卡片高度，联动重算 */
  useEffect(() => {
    requestAnimationFrame(fitGrid);
  }, [showSettings, showTimeSettings, courses.length]);

  const say = (msg) => { setToast(msg); clearTimeout(toastRef.current); toastRef.current = setTimeout(() => setToast(''), 1800); };

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_READ()) || 'null');
      if (raw) { setCourses(raw.courses || []); setSettings(raw.settings || { startDate: '', overrideWeek: null, timeSlots: null }); }
    } catch { /* ignore */ }
  }, []);

  const persist = (nextCourses, nextSettings) => {
    if (!guard()) return;
    const c = nextCourses ?? courses;
    const s = nextSettings ?? settings;
    setCourses(c); setSettings(s);
    try { localStorage.setItem(LS_READ(), JSON.stringify({ courses: c, settings: s })); } catch { /* ignore */ }
  };

  /* 节次时间：默认值 + 用户在「时间设置」中的覆盖（只覆盖 time，label/夜间标志仍用默认） */
  const timeSlots = useMemo(() => {
    const base = Object.fromEntries(DEFAULT_SLOTS.map((s) => [s.key, { ...s }]));
    const ov = settings.timeSlots || {};
    for (const k of Object.keys(ov)) {
      const t = String(ov[k] || '').trim();
      if (base[k] && /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(t)) base[k].time = t;
    }
    return base;
  }, [settings.timeSlots]);
  const setSlotTime = (key, time) => {
    if (!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(time)) return;
    const ov = { ...(settings.timeSlots || {}) };
    ov[key] = time;
    persist(null, { ...settings, timeSlots: ov });
  };

  const autoWeek = useMemo(() => {
    if (!settings.startDate) return 1;
    const start = new Date(settings.startDate + 'T00:00:00');
    if (Number.isNaN(start.getTime())) return 1;
    return Math.max(1, Math.min(MAX_WEEK, Math.floor((new Date() - start) / 864e5 / 7) + 1));
  }, [settings.startDate]);
  const currentWeek = settings.overrideWeek != null ? settings.overrideWeek : autoWeek;

  const weekCourses = useMemo(() => courses.filter((c) => inWeek(c, currentWeek)), [courses, currentWeek]);
  /* 今日课程数：按今天星期几 + 当前周次实时统计（编辑课表立即生效） */
  const todayCourseCount = useMemo(() => {
    const dayIdx = (new Date().getDay() + 6) % 7 + 1;
    return courses.filter((c) => c.day === dayIdx && inWeek(c, currentWeek)).length;
  }, [courses, currentWeek]);
  const grid = useMemo(() => {
    const m = {};
    weekCourses.forEach((c) => {
      if (!m[c.day]) m[c.day] = {};
      if (!m[c.day][c.slot]) m[c.day][c.slot] = c;
    });
    return m;
  }, [weekCourses]);

  const goWeek = (step) => persist(null, { ...settings, overrideWeek: Math.max(1, Math.min(MAX_WEEK, currentWeek + step)) });
  const setWeekInput = (v) => persist(null, { ...settings, overrideWeek: Math.max(1, Math.min(MAX_WEEK, +v || 1)) });

  const reparse = () => setParsed(parseImport(importText));
  const addParsed = () => {
    if (!parsed.length) { say('未识别到有效课程'); return; }
    persist([...courses, ...parsed], null);
    setImportText(''); setParsed([]);
    say(`已导入 ${parsed.length} 门课程`);
  };
  const addOne = () => {
    if (!form.name.trim()) { say('请填写课程名称'); return; }
    const c = {
      id: Date.now() + Math.random().toString(36).slice(2, 5),
      name: form.name.trim(), teacher: form.teacher.trim(), room: form.room.trim(),
      day: +form.day, slot: form.slot, f: +form.f, t: +form.t,
      type: form.type,
      weeksText: `${form.f}-${form.t}周${form.type !== 'every' ? `（${INC[form.type]}）` : ''}`,
    };
    persist([...courses, c], null);
    setForm({ ...form, name: '', teacher: '', room: '' });
    say('已添加课程');
  };
  const remove = (id) => { persist(courses.filter((c) => c.id !== id), null); say('已删除'); };
  const clearAll = () => { persist([], null); say('已清空课表'); };
  const copyTemplate = async () => {
    try { await navigator.clipboard.writeText(IMPORT_TEMPLATE); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };

  /* Excel(.xls/.xlsx) 文件解析：SheetJS 按需加载，解析全部 sheet 的行式/表头式课表 */
  const onXlsFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setXlsBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const XLSX = await import('xlsx');
      const wb = XLSX.read(buf, { type: 'array' });
      const list = [];
      for (const sn of wb.SheetNames) {
        const ws = wb.Sheets[sn];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        list.push(...parseXlsRows(rows));
      }
      if (!list.length) { say('未从 Excel 中识别到有效课程，请检查格式'); return; }
      setParsed(list);
      say(`已识别 ${list.length} 门课程，确认后导入`);
    } catch (err) {
      console.error(err);
      say('Excel 解析失败，请确认是 .xls / .xlsx 文件');
    } finally {
      setXlsBusy(false);
    }
  };

  return (
    <div className="cs-page">
      <style>{`
        .cs-page { display:flex; flex-direction:column; gap:18px; }
        .cs-card { background:#fff;border:1px solid rgba(20,24,33,.09);border-radius:14px;box-shadow:0 1px 2px rgba(16,20,30,.04);padding:18px 20px; }
        .cs-h { display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;row-gap:8px; }
        .cs-h h3 { margin:0;font-size:15px;font-weight:700;color:#212529; }
        .cs-h .ico { width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:${ACCENT_SOFT};color:${ACCENT}; }
        .cs-h .sp { flex:1; }
        .cs-row { display:flex;gap:8px;flex-wrap:wrap;align-items:center; }
        .cs-btn { display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(20,24,33,.12);background:#fff;color:#495057;border-radius:9px;font-size:13px;font-weight:600;padding:8px 13px;cursor:pointer;transition:all .15s ease; }
        .cs-btn:hover { border-color:${ACCENT_LINE};color:${ACCENT}; }
        .cs-btn.primary { background:${ACCENT};border-color:${ACCENT};color:#fff; }
        .cs-btn.primary:hover { opacity:.92; }
        .cs-btn.danger:hover { border-color:rgba(239,68,68,.4);color:#EF4444; }
        .cs-chip { display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-size:12.5px;font-weight:600;background:${ACCENT_SOFT};color:${ACCENT}; }
        .cs-today { display:inline-flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;color:#555; }
        .cs-today b { color:#1b1b1b;font-weight:750;font-variant-numeric:tabular-nums; }
        .cs-today-date { display:inline-flex;align-items:baseline;gap:6px;color:#1b1b1b;font-size:13.5px;font-weight:750;white-space:nowrap; }
        .cs-today-date i { color:${ACCENT};font:700 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-style:normal;letter-spacing:.08em; }
        .cs-tdot { width:4px;height:4px;border-radius:50%;background:rgba(164,136,48,.55);flex:0 0 auto; }
        .cs-input { border:1px solid rgba(20,24,33,.13);border-radius:9px;padding:8px 11px;font-size:13px;background:#fff;color:#212529;outline:none; }
        .cs-input:focus { border-color:${ACCENT}; }
        label.cs-l { font-size:12px;color:#6c757d;font-weight:600;display:block;margin-bottom:5px; }
        .cs-field { display:flex;flex-direction:column; }
        .cs-grid { overflow-x:auto; }
        .cs-grid table { width:100%;border-collapse:collapse;table-layout:fixed; }
        .cs-grid th,.cs-grid td { border:1px solid rgba(20,24,33,.075); }
        .cs-grid tbody td { height:var(--cs-row-h,auto); }
        .cs-grid thead th { background:#F6F7F9;color:#5A5F69;font-size:12px;font-weight:700;letter-spacing:.06em;padding:11px 4px; }
        .cs-grid thead th.per { background:#FAFAFB; }
        .cs-grid .per { background:#FBFBFC;color:#9095A0;font-size:11px;width:88px;text-align:center;padding:10px 5px;line-height:1.5;font-variant-numeric:tabular-nums; }
        .cs-grid .per b { display:block;font-size:12.5px;color:#212529;letter-spacing:.02em;margin-bottom:2px; }
        .cs-grid td.empty { background:#FCFCFD; }
        .cs-cell { background:linear-gradient(180deg, ${ACCENT_SOFT}, #FFFDF2);border:1px solid ${ACCENT_LINE};border-radius:10px;height:100%;padding:12px 11px;display:flex;flex-direction:column;justify-content:center;gap:5px;transition:border-color .15s ease,box-shadow .15s ease;box-shadow:0 1px 2px rgba(164,136,48,.05); }
        .cs-cell:hover { border-color:rgba(164,136,48,.62);box-shadow:0 2px 8px rgba(164,136,48,.14); }
        .cs-cell .n { font-size:13.5px;font-weight:750;color:#8A7327;line-height:1.35;letter-spacing:.02em;word-break:break-word; }
        .cs-cell .r { display:flex;align-items:center;gap:3px;font-size:11px;font-weight:600;color:#9A7515;margin-top:1px;line-height:1.3;word-break:break-word; }
        .cs-cell .t { font-size:11px;color:#7B7F89;margin-top:3px;line-height:1.35;letter-spacing:.01em;word-break:break-word; }
        .cs-cell.night { background:linear-gradient(180deg, rgba(99,102,241,.07), rgba(99,102,241,.03));border-style:dashed;border-color:rgba(99,102,241,.3); }
        .cs-empty { text-align:center;padding:26px 0;color:#adb5bd;font-size:13px; }
        .cs-list-row { display:flex;align-items:center;gap:12px;border-top:1px solid rgba(20,24,33,.07);padding:10px 4px;flex-wrap:wrap; }
        .cs-tag { display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;color:#3D424C;background:#F1F3F5;border-radius:7px;padding:4px 10px;letter-spacing:.01em; }
        .cs-tag.night { color:#5F3DC4;background:#F1EEFF; }
        .cs-review { border:1px dashed ${ACCENT_LINE};border-radius:10px;background:${ACCENT_SOFT};padding:10px 12px;margin-top:10px; }
        .cs-review-item { display:inline-flex;align-items:center;gap:8px;background:#fff;border-radius:8px;padding:6px 10px;margin:4px 4px 0 0;font-size:12px; }
        .cs-toast { position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#212529;color:#fff;padding:9px 16px;border-radius:999px;font-size:12.5px;z-index:99; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* 顶部：当前周边 + 操作 */}
      <div className="cs-card">
        <div className="cs-h">
          <div className="ico"><CalendarDays size={18} /></div>
          <h3>第 {currentWeek} 周</h3>
          <span className="cs-chip">{settings.overrideWeek != null ? '手动指定' : settings.startDate ? '自动更新' : '待设置'}</span>
          {stats && (
            <span className="cs-today">
              <span className="cs-today-date"><i>TODAY</i>{stats.month}月{stats.date}日 周{stats.weekDay}</span>
              <span className="cs-tdot" />
              <span>今日 <b>{todayCourseCount}</b> 节课</span>
              <span className="cs-tdot" />
              <span><b>{stats.eventCount}</b> 项日程</span>
            </span>
          )}
          <div className="sp" />
          <div className="cs-row">
            <button className="cs-btn" onClick={() => goWeek(-1)}><ChevronLeft size={15} />上一周</button>
            <input type="number" min={1} max={MAX_WEEK} value={currentWeek} onChange={(e) => setWeekInput(e.target.value)} className="cs-input no-spin" style={{ width: 68 }} />
            <button className="cs-btn" onClick={() => goWeek(1)}>下一周<ChevronRight size={15} /></button>
            <button className="cs-btn" onClick={() => setShowSettings((v) => !v)}><RefreshCw size={14} />周次设置</button>
            <button className="cs-btn" onClick={() => setShowTimeSettings((v) => !v)}><Clock size={14} />时间设置</button>
          </div>
        </div>
        {showSettings && (
          <div className="cs-card" style={{ boxShadow: 'none', borderColor: 'rgba(20,24,33,.12)' }}>
            <div className="cs-row">
              <div className="cs-field">
                <label className="cs-l">学期开学（周一）日期</label>
                <input type="date" value={settings.startDate} onChange={(e) => persist(null, { ...settings, startDate: e.target.value })} className="cs-input" />
              </div>
              <div className="cs-field">
                <label className="cs-l">手动指定当前周（留空=自动推算）</label>
                <input type="number" min={1} max={MAX_WEEK} value={settings.overrideWeek ?? ''}
                  onChange={(e) => persist(null, { ...settings, overrideWeek: e.target.value === '' ? null : Math.max(1, Math.min(MAX_WEEK, +e.target.value)) })}
                  placeholder="自动" className="cs-input" style={{ width: 120 }} />
              </div>
              <div className="cs-field" style={{ alignSelf: 'flex-end' }}><button className="cs-btn" onClick={() => say(`当前自动为第 ${autoWeek} 周`)}>校验</button></div>
              <p style={{ margin: '2px 0 0', width: '100%', fontSize: 12, color: '#6c757d' }}>
                首次使用请在“手动指定当前周”输入现在是第几周；“自动更新”模式下将按开学日期随日期自动推进。
              </p>
            </div>
          </div>
        )}
        {showTimeSettings && (
          <div className="cs-card" style={{ boxShadow: 'none', borderColor: 'rgba(20,24,33,.12)' }}>
            <div className="cs-row" style={{ alignItems: 'flex-end' }}>
              {DEFAULT_SLOTS.map((s) => {
                const [st, en] = (timeSlots[s.key].time || '08:00-09:45').split('-');
                return (
                  <div key={s.key} className="cs-field" style={{ gap: 4 }}>
                    <label className="cs-l">{s.label}{s.night ? '（晚自习）' : ''}</label>
                    <div className="cs-row" style={{ gap: 4 }}>
                      <input type="time" className="cs-input" style={{ width: 96 }} value={st}
                        onChange={(e) => setSlotTime(s.key, `${e.target.value}-${en}`)} />
                      <span style={{ color: '#adb5bd', fontSize: 12 }}>至</span>
                      <input type="time" className="cs-input" style={{ width: 96 }} value={en}
                        onChange={(e) => setSlotTime(s.key, `${st}-${e.target.value}`)} />
                    </div>
                  </div>
                );
              })}
              <div className="cs-field" style={{ alignSelf: 'flex-end' }}>
                <button className="cs-btn" onClick={() => { persist(null, { ...settings, timeSlots: null }); say('已恢复默认作息'); }}>恢复默认</button>
              </div>
            </div>
            <p style={{ margin: '8px 0 0', width: '100%', fontSize: 12, color: '#6c757d' }}>
              自定义每节课起止时间（含晚自习），课表、明细与手动添加会同步更新；恢复默认使用标准大学作息。
            </p>
          </div>
        )}
      </div>

      {/* 周网格课表 */}
      <div className="cs-card" ref={gridCardRef} style={{ '--cs-row-h': rowH ? `${rowH}px` : undefined }}>
        <div className="cs-h">
          <div className="ico"><CalendarRange size={18} /></div>
          <h3>第 {currentWeek} 周课表</h3>
          <div className="sp" />
          <button className="cs-btn danger" onClick={clearAll}><Trash2 size={14} />清空课表</button>
        </div>
        <div className="cs-grid">
          <table>
            <thead>
              <tr>
                <th className="per">节次</th>
                {WEEKDAY.map((w) => <th key={w}>周{w}</th>)}
              </tr>
            </thead>
            <tbody>
              {DEFAULT_SLOTS.map((s) => {
                const slot = timeSlots[s.key];
                return (
                <tr key={slot.key}>
                  <td className="per"><b>{slot.label}</b>{slot.time}</td>
                  {WEEKDAY.map((_, di) => {
                    const d = di + 1;
                    const c = grid[d]?.[slot.key];
                    if (c) {
                      return (
                        <td key={d}>
                          <div className={`cs-cell${slot.night ? ' night' : ''}`}>
                            <div className="n">{c.name}</div>
                            {c.room && <div className="r"><MapPin size={11} strokeWidth={2} />{c.room}</div>}
                            <div className="t">{c.teacher || '未填老师'}</div>
                          </div>
                        </td>
                      );
                    }
                    return <td key={d} className="empty">{(slot.night && <Moon size={13} style={{ opacity: .4 }} />) || ''}</td>;
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {weekCourses.length === 0 && <div className="cs-empty">本周暂无课程，请先导入课表</div>}
      </div>

      {/* 本周课程列表（默认折叠） */}
      <div className="cs-card">
        <div className="cs-h" style={{ marginBottom: detailOpen ? 14 : 0 }}>
          <div className="ico"><GraduationCap size={18} /></div>
          <h3>第 {currentWeek} 周课程明细</h3>
          <span className="cs-chip">{weekCourses.length} 门</span>
          <div className="sp" />
          <button className="cs-btn" onClick={() => setDetailOpen((v) => !v)} aria-expanded={detailOpen}>
            {detailOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {detailOpen ? '收起明细' : '展开明细'}
          </button>
        </div>
        {weekCourses.length === 0 ? (
          <div className="cs-empty">本周没有开课</div>
        ) : !detailOpen ? (
          <div className="cs-empty" style={{ padding: '14px 0', fontSize: 12.5, color: '#9aa0a8' }}>
            共 {weekCourses.length} 门课已折叠，点击「展开明细」查看每周安排
          </div>
        ) : (
          weekCourses.map((c) => {
            const meta = timeSlots[c.slot] || SLOT_META[c.slot];
            return (
              <div key={c.id} className="cs-list-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 750, color: '#212529', letterSpacing: '.02em' }}>{c.name}</div>
                  <span className="cs-tag" style={{ marginTop: 5, display: 'inline-flex' }}>{c.weeksText}</span>
                </div>
                <span className="cs-tag"><CalendarDays size={12} />周{WEEKDAY[c.day - 1]}</span>
                <span className={`cs-tag${meta.night ? ' night' : ''}`}><Clock size={12} />{meta.label}</span>
                <span className="cs-tag"><Clock size={12} />{meta.time}</span>
                {c.room && <span className="cs-tag"><MapPin size={12} />{c.room}</span>}
                <span className="cs-tag"><User size={12} />{c.teacher || '未填老师'}</span>
                <button className="cs-btn danger" onClick={() => remove(c.id)}><Trash2 size={14} />删除</button>
              </div>
            );
          })
        )}
      </div>

      {/* 导入 */}
      <div className="cs-card">
        <div className="cs-h">
          <div className="ico"><Upload size={18} /></div>
          <h3>文本 / Excel 自动识别导入</h3>
          <div className="sp" />
          <button className="cs-btn" onClick={() => xlsFileRef.current && xlsFileRef.current.click()} disabled={xlsBusy} style={xlsBusy ? { opacity: .6, cursor: 'wait' } : undefined}>
            {xlsBusy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <FileSpreadsheet size={15} />}
            {xlsBusy ? '解析中…' : '导入 Excel(.xls/.xlsx)'}
          </button>
          <input ref={xlsFileRef} type="file" accept=".xls,.xlsx" style={{ display: 'none' }} onChange={onXlsFile} />
          <button className="cs-btn" onClick={copyTemplate}>
            {copied ? <Check size={15} style={{ color: ACCENT }} /> : <Copy size={15} />}
            {copied ? '已复制' : '复制导入模板'}
          </button>
        </div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={6}
          placeholder={'粘贴课程文本，例如：\n【高等数学】\n课程：高等数学\n星期：周一\n节次：1-2节\n周次：1-16周\n老师：龙承星副教授\n教室：博学楼501\n\n【晚自习】\n星期：周二\n节次：晚自习1'}
          className="cs-input" style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
        />
        <div className="cs-row" style={{ marginTop: 10 }}>
          <button className="cs-btn primary" onClick={reparse}><Wand2 size={14} />识别并预览</button>
          <button className="cs-btn" onClick={() => { setImportText(''); setParsed([]); }}>清空</button>
          <button className="cs-btn" onClick={addParsed} disabled={!parsed.length} style={parsed.length ? {} : { opacity: .5, cursor: 'not-allowed' }}>
            <Upload size={14} />导入 {parsed.length ? `${parsed.length} 门` : ''}
          </button>
        </div>
        {parsed.length > 0 && (
          <div className="cs-review">
            <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>识别到 {parsed.length} 门课程：</div>
            {parsed.map((c) => (
              <span key={c.id} className="cs-review-item">
                {c.name} · 周{WEEKDAY[c.day - 1]} · {SLOT_META[c.slot]?.label} · {c.f}-{c.t}周{c.type !== 'every' ? `(${INC[c.type]})` : ''} · {c.teacher || '—'}{c.room ? ` · ${c.room}` : ''}
              </span>
            ))}
          </div>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#6c757d' }}>
          支持连堂块：1-2节 / 3-4节 / 5-6节 / 7-8节 / 晚自习1 / 晚自习2；晚自习也可单独开设（有时有课）。文本导入支持「老师：龙承星副教授」「教室：博学楼501」自动识别；Excel 导入支持教务导出的 .xls / .xlsx 课表（自动识别课程 / 星期 / 节次 / 周次 / 老师 / 教室）。
        </p>
      </div>

      {/* 手动新增 */}
      <div className="cs-card">
        <div className="cs-h"><div className="ico"><Plus size={18} /></div><h3>手动添加课程</h3></div>
        <div className="cs-row">
          <div className="cs-field"><label className="cs-l">课程名称</label><input className="cs-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="高等数学" /></div>
          <div className="cs-field"><label className="cs-l">老师（可含职称）</label><input className="cs-input" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} placeholder="龙承星副教授" /></div>
          <div className="cs-field"><label className="cs-l">教室</label><input className="cs-input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="博学楼501（可留空）" /></div>
          <div className="cs-field"><label className="cs-l">星期</label>
            <select className="cs-input" value={form.day} onChange={(e) => setForm({ ...form, day: +e.target.value })}>
              {WEEKDAY.map((w, i) => <option key={w} value={i + 1}>周{w}</option>)}
            </select></div>
          <div className="cs-field"><label className="cs-l">节次（连堂块）</label>
            <select className="cs-input" value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value })}>
              {DEFAULT_SLOTS.map((s) => <option key={s.key} value={s.key}>{timeSlots[s.key].label}（{timeSlots[s.key].time}）{s.night ? '晚自习' : ''}</option>)}
            </select></div>
          <div className="cs-field"><label className="cs-l">周次</label>
            <div className="cs-row">
              <input type="number" className="cs-input" style={{ width: 64 }} value={form.f} onChange={(e) => setForm({ ...form, f: Math.max(1, +e.target.value || 1) })} />周~
              <input type="number" className="cs-input" style={{ width: 64 }} value={form.t} onChange={(e) => setForm({ ...form, t: Math.max(1, +e.target.value || 1) })} />周
            </div></div>
          <div className="cs-field"><label className="cs-l">单双周</label>
            <select className="cs-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="every">每周</option><option value="odd">单周</option><option value="even">双周</option>
            </select></div>
          <div className="cs-field" style={{ alignSelf: 'flex-end' }}><button className="cs-btn primary" onClick={addOne}><Plus size={14} />添加</button></div>
        </div>
      </div>

      {toast && <div className="cs-toast">{toast}</div>}
    </div>
  );
}
