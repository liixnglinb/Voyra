import React, { useState, useEffect, useMemo, useRef } from 'react';
/* Voyra-schedule 独立仓库 · 同步链路验证标记 v1 */
import { createPortal } from 'react-dom';
import {
  GraduationCap, Plus, Trash2, Copy, Check, ChevronLeft, ChevronRight,
  Upload, CalendarDays, User, Clock, CalendarRange, Wand2, RefreshCw, Moon,
  MapPin, ChevronDown, ChevronUp, FileSpreadsheet, Loader2,
} from 'lucide-react';
import { useAuth } from '../components/AuthGate';

/* 手机端把课表下方的整块内容搬进页头「功能」按钮打开的底部抽屉：
   桌面端原样内联渲染（DOM 与引入本组件之前一致）；手机端只有抽屉打开时
   才把同一份 children portal 到 ScheduleHub 提供的外壳里。
   三个视图共用，故导出。 */
export function MobileSection({ mobile, host, id, panel, children }) {
  if (!mobile) return children;
  return (host && panel === id) ? createPortal(children, host) : null;
}

/* ============================================================
   个人课表 · ClassSchedule
   - 大学课表：以「两节连堂」为节次单位，并内置晚自习块
   - 节次块：1-2 / 3-4 / 5-6 / 7-8 / 晚自习1 / 晚自习2
   - 展示：课程名 / 上课时间 / 节次块 / 第几周到第几周 / 授课老师
   - 周自动定位 + 文本识别导入 + 复制导入模板
   ============================================================ */

const LS_KEY = 'ClassScheduleData';
import { userKey, isAuthed } from '../lib/auth';
const LS_READ = () => userKey(LS_KEY);
const ACCENT = '#A48830';
const ACCENT_SOFT = '#FFF9DF';
const ACCENT_LINE = 'rgba(164,136,48,.42)';

const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];
const MAX_WEEK = 20;

/* 连堂节次块（大学课表按此组织，含晚自习）；用户可在「时间设置」中覆盖 time
 * 默认作息：8:20 上课，每小节 45 分钟；1→2 节休 10 分钟，2→3 节休 20 分钟，3→4 节休 5 分钟
 *   第1节 08:20-09:05 → 休10 → 第2节 09:15-10:00 → 休20 → 第3节 10:20-11:05 → 休5 → 第4节 11:10-11:55
 */
const DEFAULT_SLOTS = [
  { key: '1-2',    label: '1-2 节',   time: '08:20-10:00', start: 1,  night: false },
  { key: '3-4',    label: '3-4 节',   time: '10:20-11:55', start: 3,  night: false },
  { key: '5-6',    label: '5-6 节',   time: '13:30-15:15', start: 5,  night: false },
  { key: '7-8',    label: '7-8 节',   time: '15:30-17:15', start: 7,  night: false },
  { key: '晚自习1', label: '晚自习 1', time: '19:00-20:40', start: 9,  night: true },
  { key: '晚自习2', label: '晚自习 2', time: '20:50-22:15', start: 11, night: true },
];
/* 旧版默认作息：仅当用户从未手动改过（覆盖值仍等于旧默认）时才让新默认生效 */
const LEGACY_DEFAULT_TIME = {
  '1-2': '08:00-09:45', '3-4': '10:00-11:45', '5-6': '13:30-15:15',
  '7-8': '15:30-17:15', '晚自习1': '19:00-20:40', '晚自习2': '20:50-22:15',
};
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

【Pro TEL d XP 线路板设计】
课程：Pro TEL d XP 线路板设计
星期：周四
节次：5-6节
周次：1-16周（双周）
老师：王老师
教室：实训中心302

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
· 教室：上课地点（可选），如 博学楼501 / 致远楼A201 / 实训中心302 / 5-601 / B305
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
const reRoom = /(?:上课地点|上课教室|上课地方|教室|地点|room)\s*[:：]?\s*([^\n,，;；]+)/;

const WD = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };

/* 常见教师职称词表（xls 智能识别用） */
const TITLE_HINTS = ['教授', '副教授', '讲师', '助教', '研究员', '副研究员', '高级工程师', '工程师', '实验师', '老师', '教师'];
function cleanCourseName(value) {
  return String(value || '')
    .replace(/^【\s*|\s*】$/g, '')
    .replace(/^(?:课程名|课程名称|课程|名称|科目)\s*[:：]\s*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[-–—·、,，;；\s]+|[-–—·、,，;；\s]+$/g, '')
    .trim();
}

const COURSE_THEMES = [
  { bg: 'linear-gradient(180deg,#FFF9DF,#FFFDF2)', border: 'rgba(164,136,48,.38)', text: '#8A7327', room: '#9A7515' },
  { bg: 'linear-gradient(180deg,#E7F6EF,#F4FBF7)', border: 'rgba(16,153,101,.28)', text: '#127A53', room: '#17936A' },
  { bg: 'linear-gradient(180deg,#E9F2FF,#F5F9FF)', border: 'rgba(38,109,222,.26)', text: '#2563C9', room: '#3B77DF' },
  { bg: 'linear-gradient(180deg,#F3EEFF,#FAF8FF)', border: 'rgba(109,74,220,.24)', text: '#6D4ADC', room: '#8063E5' },
  { bg: 'linear-gradient(180deg,#FFEEE8,#FFF7F3)', border: 'rgba(223,84,50,.25)', text: '#C8471F', room: '#DE5C34' },
  { bg: 'linear-gradient(180deg,#E9F7FA,#F5FCFE)', border: 'rgba(14,137,163,.25)', text: '#0F7A93', room: '#1895AF' },
];

function courseTheme(name) {
  const source = String(name || '');
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) hash = (hash * 31 + source.charCodeAt(i)) % 100000;
  return COURSE_THEMES[hash % COURSE_THEMES.length];
}

/* ── 多时段 ─────────────────────────────────────────────────────────
   一门课可以挂多个时间段（同一门课一周上两次很常见）。旧数据只有
   day/slot/f/t/type 这一组字段，这里统一成数组来读：
     · 读：一律走 coursePeriods(c)，时段对象与旧字段同形，
       inWeek(period, w) 等按 f/t/type 工作的函数可以直接复用
     · 写：saveCourses 时把首段镜像回旧字段，旧导出、旧代码都还认
   ───────────────────────────────────────────────────────────────── */
function coursePeriods(c) {
  if (!c) return [];
  if (Array.isArray(c.periods) && c.periods.length) return c.periods;
  return [{ day: c.day, slot: c.slot, f: c.f, t: c.t, type: c.type, customTime: c.customTime }];
}

/* 颜色：用户在表单里挑的色板序号优先，没挑过就沿用按课名哈希的老配色 */
function themeOf(course) {
  const picked = Number.isInteger(course?.color) ? COURSE_THEMES[course.color] : null;
  return picked || courseTheme(course?.name);
}

/* ── 分享口令 / 备份 ─────────────────────────────────────────────────
   口令：把整张课表压成一段可粘贴的短文本（VOYRA1: + base64url），纯前端、
   不经服务器。勾选「含教室/老师」时把这两项一起带走，否则只带课名与时段。
   备份：整份 courses + settings 的 JSON，用于换设备/换浏览器时搬课表。 */
const SHARE_PREFIX = 'VOYRA1:';
const BACKUP_APP = 'voyra-schedule';
function b64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}
const TYPE_CODE = { every: 0, odd: 1, even: 2 };
const TYPE_FROM = ['every', 'odd', 'even'];
function encodeShare(courses, withDetail) {
  const slim = courses.map((c) => {
    const row = {
      /* 时段用数组压体积：[星期, 节次, 起始周, 结束周, 单双周, 自定义起止] */
      p: coursePeriods(c).map((p) => [p.day, p.slot, p.f, p.t, TYPE_CODE[p.type] || 0,
        p.customTime && p.customTime.start && p.customTime.end ? `${p.customTime.start}-${p.customTime.end}` : '']),
    };
    row.n = c.name;
    if (withDetail) { row.t = c.teacher || ''; row.r = c.room || ''; }
    if (Number.isInteger(c.color)) row.c = c.color;
    if (c.credit) row.k = c.credit;
    if (c.note) row.o = c.note;
    return row;
  });
  return SHARE_PREFIX + b64urlEncode(JSON.stringify(slim));
}
function decodeShare(text) {
  const raw = String(text || '').replace(/\s+/g, '');
  const at = raw.indexOf(SHARE_PREFIX);
  if (at < 0) return null;
  try {
    const list = JSON.parse(b64urlDecode(raw.slice(at + SHARE_PREFIX.length)));
    if (!Array.isArray(list) || !list.length) return null;
    return list.filter((o) => o && o.n).map((o, i) => {
      const c = {
        id: `share${Date.now().toString(36)}${i}`,
        name: String(o.n).trim(),
        teacher: o.t || '', room: o.r || '',
        periods: (o.p || []).filter((p) => Array.isArray(p) && p.length >= 4)
          .map(([day, slot, f, t, ty, ct]) => {
            const one = { day: +day, slot: String(slot), f: +f || 1, t: +t || 16, type: TYPE_FROM[ty] || 'every' };
            if (ct && ct.includes('-')) { const [s, e] = ct.split('-'); one.customTime = { start: s, end: e }; }
            return one;
          }),
      };
      if (Number.isInteger(o.c)) c.color = o.c;
      if (o.k) c.credit = String(o.k);
      if (o.o) c.note = String(o.o);
      return c;
    }).filter((c) => c.name && c.periods.length);
  } catch { return null; }
}
/* 教务系统「另存为网页」的表格 → 二维数组 → 复用 Excel 那套识别 */
function htmlToRows(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tables = Array.from(doc.querySelectorAll('table'));
    let best = [];
    tables.forEach((tb) => {
      const rows = Array.from(tb.querySelectorAll('tr')).map((tr) => Array.from(tr.children)
        .map((td) => (td.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()));
      const wide = rows.filter((r) => r.length >= 3).length;
      if (wide > best.filter((r) => r.length >= 3).length) best = rows;
    });
    return best;
  } catch { return []; }
}

/* 收起状态下左侧时间轴只有 30px 宽，「1-2 节」「晚自习 1」会被挤成两行、参差不齐；
   给它一个短标（1-2 / 晚1）保持单行。展开后与桌面端仍用完整名称。 */
function miniSlotLabel(label) {
  return String(label || '').replace(/\s*节\s*$/, '').replace('晚自习', '晚');
}

/* 手动添加表单：一门课可以有多个时段，每个时段自己带星期/节次/周次/
   单双周与可选的自定义起止时间 */
function newPeriod(day = 1, slot = '1-2') {
  return { day, slot, f: 1, t: 16, type: 'every', customOn: false, customStart: '', customEnd: '' };
}
function EMPTY_FORM() {
  return { name: '', teacher: '', room: '', color: null, credit: '', note: '', periods: [newPeriod()] };
}

/* 保存前统一规整：旧形状补出 periods，多时段的课把首段镜像回 day/slot/f/t/type。
   镜像是给「仍按老字段读」的地方兜底（旧导出、解析结果、零星引用），
   页面上的读路径已经全部走 coursePeriods()。 */
function withPeriods(course) {
  const next = normalizeCourse(course);
  const list = coursePeriods(next).map((p) => ({ ...p }));
  next.periods = list;
  const first = list[0];
  if (first) {
    next.day = first.day; next.slot = first.slot;
    next.f = first.f; next.t = first.t; next.type = first.type;
    if (first.customTime) next.customTime = first.customTime; else delete next.customTime;
  }
  return next;
}

function parseImport(text) {
  const blocks = String(text)
    .split(/\n\s*\n|\r\n\s*\r\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  const out = [];
  for (const raw of blocks) {
    const title = raw.match(reTitle);
    const mKey = raw.match(reKey);
    const name = cleanCourseName((mKey && mKey[2] ? mKey[2] : '') || (title ? title[1] : ''));
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
  return out.map(normalizeCourse);
}

/* ============ Excel(.xls/.xlsx) 课表解析 ============ */
const XLS_WEEK = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };

function xlsCell(v) {
  if (v == null) return '';
  return String(v).replace(/[ \t]+/g, ' ').trim(); // 只压缩空格/制表，保留换行（多行单元格）
}

/* 教室识别：支持「明理楼A201」「5-601」「B305」「实训中心 302」「地点：...」等常见写法 */
function looksLikeRoom(value) {
  const s = cleanCourseName(value);
  if (!s || s.length > 30) return false;
  if (TITLE_HINTS.some((h) => s.includes(h))) return false;
  if (/^(?:上课地点|上课教室|上课地方|教室|地点)\s*[:：]/.test(s)) return true;
  if (/(?:校区|教学楼|实验楼|实训楼|办公楼|楼|馆|室|区|操场|球场|田径场|体育馆|游泳馆|实训|实验|机房|中心|报告厅|舞蹈房|琴房|画室|语音室)/.test(s)) return true;
  if (/^[A-Za-z]{0,3}\s*[-–]\s*\d{2,4}$/.test(s)) return true;
  if (/^[A-Za-z]{0,3}\s*\d{1,3}\s*[-–]\s*\d{2,4}$/.test(s)) return true;
  if (/^[\u4e00-\u9fa5]{1,6}\s*[-–]\s*\d{2,4}$/.test(s)) return true;
  if (/^[A-Za-z]\s*[-–]?\s*\d{3,4}$/.test(s)) return true;
  if (/^\d{1,2}\s*[-–]\s*\d{3,4}$/.test(s)) return true;
  if (/^[A-Za-z]{0,3}\s*\d{3,4}$/.test(s)) return true;
  return false;
}

/* 识别旧版误存进地点的「2-9([周])[01-02节]」类周次串 */
function extractWeekFragment(value) {
  return String(value || '').match(
    /(?:第)?\d{1,2}(?:\s*[-~—–至到]\s*\d{1,2}|(?:\s*[,，、]\s*\d{1,2})+)?\s*(?:\(\[\s*周\s*\]\)|\[\s*周\s*\]|\(\s*周\s*\)|周)(?:\s*[（(]\s*(?:单|双)\s*周?\s*[)）])?(?:\s*[\[（(][^\]）\n]{1,20}[\]）])?/
  );
}

function looksLikeWeekCell(value) {
  const s = cleanCourseName(value);
  if (!s || s.length > 48) return false;
  return Boolean(extractWeekFragment(s));
}

function normalizeCourse(course) {
  if (!course) return course;
  const next = { ...course };
  let room = cleanCourseName(next.room || '');
  const weekMatch = extractWeekFragment(room);
  if (weekMatch) {
    const weeks = parseWeeksCell(weekMatch[0])[0];
    const rest = cleanCourseName(room.replace(weekMatch[0], ' '));
    if (weeks) {
      next.f = weeks.f;
      next.t = weeks.t;
      next.type = weeks.type;
      next.weeksText = `${weeks.f === weeks.t ? `${weeks.f}周` : `${weeks.f}-${weeks.t}周`}${weeks.type !== 'every' ? `（${INC[weeks.type]}）` : ''}`;
    }
    room = looksLikeRoom(rest) ? rest : '';
  }
  next.room = room;
  return next;
}

/* 老师识别：仅依赖职称特征；无职称人名在网格多行解析中按第 2 段兜底 */
function looksLikeTeacher(value) {
  const s = cleanCourseName(value);
  if (!s || s.length > 24) return false;
  return TITLE_HINTS.some((h) => s.includes(h));
}

/* 单元格（或单元格内多行片段）分类：返回 {kind,val} 或 null；weeks 段另带 {f,t,type} */
function classifyXlsCell(s) {
  if (!s) return null;
  const labeledName = s.match(/^(?:课程名|课程名称|课程|名称|科目)\s*[:：]\s*(.+)$/);
  if (labeledName) return { kind: 'name', val: cleanCourseName(labeledName[1]) };
  const labeledTeacher = s.match(/^(?:授课老师|授课教师|老师|教师)\s*[:：]\s*(.+)$/);
  if (labeledTeacher) return { kind: 'teacher', val: cleanCourseName(labeledTeacher[1]) };
  const labeledRoom = s.match(/^(?:上课地点|上课教室|上课地方|教室|地点)\s*[:：]\s*(.+)$/);
  if (labeledRoom) return { kind: 'room', val: cleanCourseName(labeledRoom[1]) };
  const labeledWeeks = s.match(/^(?:周次|周数|上课周|起止周)\s*[:：]\s*(.+)$/);
  if (labeledWeeks) return parseWeeksCell(labeledWeeks[1])[0] || null;
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
  if (/周/.test(s) && /[,，、]/.test(s)) {
    const seqWeeks = parseWeeksCell(s);
    if (seqWeeks.length) return seqWeeks[0];
  }
  if (looksLikeWeekCell(s)) {
    const mixedWeeks = parseWeeksCell(s);
    if (mixedWeeks.length) return mixedWeeks[0];
  }
  /* 无单位的裸区间（如 1-2 / 3-4）→ 节次块；跨度大的（如 1-16）→ 周次区间 */
  const span = s.match(/^(\d{1,2})\s*[-~—–至到]\s*(\d{1,2})$/);
  if (span) {
    const a = +span[1], b = +span[2];
    if (b > a && b - a <= 2) return { kind: 'slot', val: slotForPeriod(a) };
    return { kind: 'weeks', f: a, t: b, type: 'every' };
  }
  if (looksLikeTeacher(s)) return { kind: 'teacher', val: cleanCourseName(s) };
  if (looksLikeRoom(s)) return { kind: 'room', val: cleanCourseName(s) };
  const name = cleanCourseName(s);
  if (name.length >= 2 && name.length <= 48 && /[A-Za-z\u4e00-\u9fa5]/.test(name) && !/^(?:星期|周|第|节|上课)/.test(name)) {
    return { kind: 'name', val: name };
  }
  return null;
}

/* 复合格兜底：整格无法分类时（如「星期一 第1-2节」「星期一1-2节 高等数学」），
   把星期 / 节次 / 周次 / 课程名 / 老师 / 教室 分别抠出来 */
function parseMixedCell(p) {
  const out = [];
  const d = p.match(/星期?([一二三四五六日天])/);
  if (d) out.push({ kind: 'day', val: XLS_WEEK[d[1]] });
  const n = p.match(/晚自习\s*(\d)?/);
  if (n) out.push({ kind: 'slot', val: n[1] ? `晚自习${n[1]}` : '晚自习1' });
  const per = p.match(/(?:第)?\s*(\d{1,2})\s*[-~—–至到]\s*\d{1,2}\s*节/);
  const per1 = !per && p.match(/(?:第)?\s*(\d{1,2})\s*节/);
  if (per) out.push({ kind: 'slot', val: slotForPeriod(+per[1]) });
  if (per1) out.push({ kind: 'slot', val: slotForPeriod(+per1[1]) });
  const wk = p.match(/(?:第)?\s*(\d{1,2})\s*(?:周)?\s*[-~—–至到]\s*(?:第)?\s*(\d{1,2})\s*周?/);
  if (wk) out.push({ kind: 'weeks', f: +wk[1], t: +wk[2], type: 'every' });
  /* 剩余内容：先保留完整英/中混合课程名，再分类老师与教室 */
  const rest = p
    .replace(/星期?[一二三四五六日天]/g, ' ')
    .replace(/晚自习\s*\d?/g, ' ')
    .replace(/(?:第)?\s*\d{1,2}\s*[-~—–至到]\s*\d{1,2}\s*节/g, ' ')
    .replace(/(?:第)?\s*\d{1,2}\s*节/g, ' ')
    .replace(/(?:第)?\s*\d{1,2}\s*(?:周)?\s*[-~—–至到]\s*(?:第)?\s*\d{1,2}\s*周?/g, ' ')
    .replace(/\d{1,2}[:：]\d{2}/g, ' ')
    .replace(/\s+/g, ' ').trim();
  if (rest) {
    let gotName = false;
    for (const w of rest.split(' ')) {
      const val = cleanCourseName(w);
      if (!val || !/[A-Za-z\u4e00-\u9fa5]/.test(val)) continue;
      if (looksLikeTeacher(val)) { out.push({ kind: 'teacher', val }); continue; }
      if (looksLikeRoom(val)) { out.push({ kind: 'room', val }); continue; }
      if (!gotName) { out.push({ kind: 'name', val: w }); gotName = true; }
      else out.push({ kind: 'teacher', val: w });
    }
  }
  return out;
}

/* 把一个单元格按换行拆成多段分别分类（教务表常见「课程名\n老师\n教室」挤一格） */
function classifyXlsSegments(s) {
  const parts = String(s).split(/\n|(?:；|;)/).map((t) => t.trim()).filter(Boolean);
  const out = [];
  for (const p of parts) {
    const one = classifyXlsCell(p);
    if (one) { out.push(one); continue; }
    out.push(...parseMixedCell(p));
  }
  return out;
}

/* 节次单元格：支持多行 / 「星期一 1-2节」复合 / 裸区间 */
function parseSlotCell(v) {
  const out = [];
  for (const line of String(v).split(/\n|(?:；|;)/)) {
    const t = line.trim();
    if (!t) continue;
    const n = t.match(/晚自习\s*(\d)?/);
    if (n) { out.push(n[1] ? `晚自习${n[1]}` : '晚自习1'); continue; }
    const per = t.match(/(?:第)?\s*(\d{1,2})\s*[-~—–至到]\s*\d{1,2}\s*节?/);
    if (per) { out.push(slotForPeriod(+per[1])); continue; }
    const per1 = t.match(/(?:第)?\s*(\d{1,2})\s*节/);
    if (per1) { out.push(slotForPeriod(+per1[1])); continue; }
  }
  return out;
}

/* 周次单元格：先定位「数字…(周)」周次子串（容忍 [01-02节] 等节次尾缀），再按 区间/逗号/单周 解析 */
function parseWeeksCell(v) {
  const s = String(v).trim();
  if (!s) return [];
  /* 先定位「数字…周」周次子串：优先「X周至Y周」，再「数字(区间/逗号)…([周]…)」；
     容忍 [01-02节] 等节次尾缀，避免把节次误当周次 */
  const mw = s.match(/\d{1,2}\s*周?\s*[-~—–至到]\s*(?:第)?\s*\d{1,2}\s*周/) || s.match(/\d{1,2}(?:\s*[-~—–至到]\s*\d{1,2})?(?:\s*[,，、]\s*\d{1,2})*\s*[\[（(]?\s*\[?周\]?/);
  const base = mw ? mw[0] : s;
  const oe = /[（(]\s*(单|双)\s*周?\s*[)）]/.exec(s);
  const type = oe ? (oe[1] === '单' ? 'odd' : 'even') : 'every';
  const w = base.match(/(?:第)?\s*(\d{1,2})\s*(?:周)?\s*[-~—–至到]\s*(?:第)?\s*(\d{1,2})\s*周?/);
  if (w) return [{ kind: 'weeks', f: +w[1], t: +w[2], type }];
  const nums = base.match(/\d{1,2}/g);
  if (nums && nums.length >= 2 && /[,，、]/.test(base)) {
    const ns = nums.map(Number);
    /* 逗号序列多为隔周（3,5,7,9=单周），全奇/全偶且≥3项时标注单/双周 */
    const allOdd = ns.every((n) => n % 2 === 1);
    const allEven = ns.every((n) => n % 2 === 0);
    const seqType = (allOdd || allEven) && ns.length >= 3 ? (allOdd ? 'odd' : 'even') : 'every';
    return [{ kind: 'weeks', f: Math.min(...ns), t: Math.max(...ns), type: seqType }];
  }
  const single = base.match(/^\s*(\d{1,2})/);
  if (single) return [{ kind: 'weeks', f: +single[1], t: +single[1], type: 'every' }];
  return [];
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
    /* 一格可同时命中多个表头词（如「星期/节次」） */
    for (const [key, re] of XLS_HEADERS) {
      if (map[key] == null && re.test(s)) { map[key] = idx; hit++; }
    }
  });
  /* 表头必须含「课程名称」列：数据行里的「节次格+老师格」易误判为表头，但不会有课程名列 */
  return hit >= 2 && map.name != null ? map : null;
}

/* 网格表头检测：≥3个星期列即视为网格表；首列为空/节次/时间/序号/大节皆可
   （教务表常见首列为「第一大节(01,02)」或空） */
function detectXlsGridHeader(row) {
  const dayIdxs = [];
  row.forEach((raw, idx) => {
    const s = xlsCell(raw);
    const d = s.match(/^星期?([一二三四五六日天])$/);
    if (d) dayIdxs.push({ idx, day: XLS_WEEK[d[1]] });
  });
  if (dayIdxs.length < 3) return null;
  const head = xlsCell(row[0]);
  /* 首列若为课程/教师列，则不是网格表（防「课程名称|教师|周一|…」展开表误判） */
  if (head && /课程|教师|科目/.test(head)) return null;
  return { dayIdxs };
}

/* 网格行首节次：「第一大节\n(01,02)」→1-2；晚自习→晚自习1；"3-4节"→3-4 */
function parseRowSlot(v) {
  const s = String(v);
  const m = s.match(/[（(]\s*(\d{1,2})\s*[,，、]\s*\d{1,2}\s*[)）]/);
  if (m) return slotForPeriod(+m[1]);
  const n = s.match(/晚自习\s*(\d)?/);
  if (n) return n[1] ? `晚自习${n[1]}` : '晚自习1';
  const per = s.match(/(?:第)?\s*(\d{1,2})\s*[-~—–至到]\s*\d{1,2}\s*节/);
  if (per) return slotForPeriod(+per[1]);
  return '';
}

/* 网格格子内容：多行拆段 → 课程名 / 老师 / 教室 / 周次
   （无职称人名按第二段兜底为老师；「2-17([周])[01-02节]」混写段提取周次） */
function parseGridCell(s) {
  const parts = String(s).split(/\n|(?:；|;)/).map((t) => t.trim()).filter(Boolean);
  const r = { name: '', teacher: '', room: '', f: 1, t: 16, type: 'every' };
  const extraNames = [];
  for (const p of parts) {
    if (!p) continue;
    if (/^\d{1,2}[:：]\d{2}\s*[-~—–至到]\s*\d{1,2}[:：]\d{2}$/.test(p)) continue; // 纯时间
    const cls = classifyXlsCell(p);
    if (!cls) {
      /* 周次混写段：如「2-17([周])[01-02节]」「8([周])」「3,5,7,9([周])」 */
      const wk = parseWeeksCell(p);
      if (wk.length) { r.f = wk[0].f; r.t = wk[0].t; r.type = wk[0].type; }
      continue;
    }
    if (cls.kind === 'weeks') { r.f = cls.f; r.t = cls.t; r.type = cls.type; }
    else if (cls.kind === 'teacher') r.teacher = r.teacher || cls.val;
    else if (cls.kind === 'room') r.room = r.room || cls.val;
    else if (cls.kind === 'slot' && cls.val.startsWith('晚自习') && !r.name) r.name = cls.val; /* 网格里的晚自习 */
    else if (cls.kind === 'name') {
      if (!r.name) r.name = cls.val;
      else extraNames.push(cls.val);
    }
  }
  if (r.teacher) {
    const noteExtra = extraNames.find((p) => !looksLikeRoom(p) && !looksLikeWeekCell(p));
    if (noteExtra) r.name = `${r.name}（${cleanCourseName(noteExtra).replace(/^[（(]|[)）]$/g, '')}）`;
  } else {
    const teacherCandidate = extraNames.find((p) => !looksLikeRoom(p) && !looksLikeWeekCell(p));
    if (teacherCandidate) r.teacher = teacherCandidate;
  }
  if (!r.room) {
    const roomLine = parts.find((p) => p !== r.name && p !== r.teacher && !looksLikeWeekCell(p) && looksLikeRoom(p));
    if (roomLine) r.room = cleanCourseName(roomLine);
  }
  const wholeOddEven = /[（(]\s*(单|双)\s*周?\s*[)）]/.exec(s);
  if (wholeOddEven) r.type = wholeOddEven[1] === '单' ? 'odd' : 'even';
  return r;
}

function joinedCell(v) {
  return cleanCourseName(String(v || '').split(/\n|(?:；|;)/).filter(Boolean).join(' '));
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
  const wText = f === t ? `${f}周` : `${f}-${t}周`;
  return {
    id: Date.now() + Math.random().toString(36).slice(2, 7),
    name, teacher, room, day, slot, f, t, type,
    weeksText: `${wText}${type !== 'every' ? `（${INC[type]}）` : ''}`,
  };
}

function parseXlsRows(rows) {
  const out = [];
  let colMap = null;
  let gridHeader = null;
  for (const row of rows) {
    /* 先网格表头（行=节次、列=星期），再展开表头，最后启发式 */
    const gh = detectXlsGridHeader(row);
    if (gh) { gridHeader = gh; colMap = null; continue; }
    const headerMap = detectXlsHeader(row);
    if (headerMap) { colMap = headerMap; gridHeader = null; continue; }
    const segs = [];
    if (colMap) {
      let dayVal = null;
      for (const key of ['name', 'teacher', 'day', 'slot', 'weeks', 'room']) {
        const idx = colMap[key];
        if (idx == null) continue;
        const v = xlsCell(row[idx]);
        if (!v) continue;
        if (key === 'day') { const d = v.match(/[一二三四五六日天]/); if (d) dayVal = XLS_WEEK[d[0]]; }
        else if (key === 'slot') {
          const dd = v.match(/[一二三四五六日天]/);
          if (dd && dayVal == null) dayVal = XLS_WEEK[dd[0]];
          for (const sl of parseSlotCell(v)) segs.push({ kind: 'slot', val: sl });
        }
        else if (key === 'weeks') segs.push(...parseWeeksCell(v));
        else if (key === 'teacher') { const t2 = joinedCell(v); if (t2) segs.push({ kind: 'teacher', val: t2 }); }
        else if (key === 'room') { const r2 = joinedCell(v); if (r2) segs.push({ kind: 'room', val: r2 }); }
        else if (key === 'name') { const n2 = joinedCell(v); if (n2) segs.push({ kind: 'name', val: n2 }); }
      }
      if (dayVal != null) segs.push({ kind: 'day', val: dayVal });
    } else if (gridHeader) {
      /* 网格表：行首=节次（第一大节(01,02)/晚自习…），星期列=格子内容 */
      const slot = parseRowSlot(xlsCell(row[0]));
      if (!slot) continue;
      for (const { idx, day } of gridHeader.dayIdxs) {
        const cell = xlsCell(row[idx]);
        if (!cell) continue;
        const parts = parseGridCell(cell);
        if (!parts.name) continue;
        const wText = parts.f === parts.t ? `${parts.f}周` : `${parts.f}-${parts.t}周`;
        out.push({
          id: Date.now() + Math.random().toString(36).slice(2, 7),
          name: parts.name, teacher: parts.teacher, room: parts.room,
          day, slot, f: parts.f, t: parts.t, type: parts.type,
          weeksText: `${wText}${parts.type !== 'every' ? `（${INC[parts.type]}）` : ''}`,
        });
      }
      continue;
    } else {
      /* 无表头：启发式逐格扫描 */
      for (const raw of row) {
        segs.push(...classifyXlsSegments(xlsCell(raw)));
      }
    }
    const c = mergeXlsSegments(segs);
    if (c) out.push(c);
  }
  return out.map(normalizeCourse);
}

function inWeek(c, w) {
  if (w < c.f || w > c.t) return false;
  if (c.type === 'odd') return w % 2 === 1;
  if (c.type === 'even') return w % 2 === 0;
  return true;
}

/* 手机端断点开关：阈值与 CSS 里已存在的 @media (max-width:767px) 对齐。
   它只驱动「仅手机生效」的条件渲染 —— 桌面端 isMobile 恒为 false，
   渲染出的 DOM 与引入该开关之前逐字节相同。 */
const MOBILE_MQ = '(max-width: 767px)';

/* ============================================================
   ★ 手机端「节次 + 起止时间」显示方式的一行切换开关
   ------------------------------------------------------------
   手机上左侧「第几节」那一列（表头 + 每行的节次格）整列不再渲染。
   省下的宽度给谁，由这个开关决定：
     true  → 降级成该行第一格顶部的一条 hairline 标记（「1-2 节」+「08:20-10:00」）
     false → 手机上格子里不出现节次/时间，五列等宽，课程名与教室恢复横排
   当前取 false：实测 true 时第一格被这条标记撑到 60px 宽，
   「复变函数与积分变换」这类长课名挤成竖排单字，可读性反而更差。
   节次与起止时间并没有删掉，仍完整留在下方「第 X 周课程明细」里。
   桌面端不受此开关影响：isMobile 恒 false，两列/格渲染与引入前一致。
   ============================================================ */
const MOBILE_SLOT_IN_CELL = false;
export function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(MOBILE_MQ).matches : false),
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = (e) => setMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange); /* 老 Safari */
    setMobile(mq.matches);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else if (mq.removeListener) mq.removeListener(onChange);
    };
  }, []);
  return mobile;
}

export default function ClassSchedule({ stats = null, active = true, drawerPanel = null, drawerHost = null, onWeekLabel = null }) {
  const { guard, authed } = useAuth();
  const CLOUD_KEY = 'schedule-classes-v1';   // 云端同步键（2026-09-20：登录后跨设备跟随）
  const [courses, setCourses] = useState([]);
  const [settings, setSettings] = useState({ startDate: '', overrideWeek: null, timeSlots: null });
  const [showSettings, setShowSettings] = useState(false);
  const [showTimeSettings, setShowTimeSettings] = useState(false);
  const [timeEdit, setTimeEdit] = useState(null); // { key, side: 's'|'e' } 正在滚动编辑的时段
  const [importText, setImportText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [copied, setCopied] = useState(false);
  /* 导入方式：文件（文本/Excel）/ 分享口令 / 教务网页 / 备份 */
  const [importMode, setImportMode] = useState('file');
  const [shareText, setShareText] = useState('');
  const [shareDetail, setShareDetail] = useState(true);
  const [backupSettings, setBackupSettings] = useState(null);
  const backupFileRef = useRef(null);
  const htmlFileRef = useRef(null);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [detailOpen, setDetailOpen] = useState(false); // 课程明细默认折叠
  /* 手机端左侧时间轴：默认收起成一条刻度，展开状态记住（在「时间设置」里改过的
     节次时间会即时反映到展开后的刻度上） */
  const [railOpen, setRailOpen] = useState(() => {
    try { return window.localStorage.getItem('voyra-sched-rail') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { window.localStorage.setItem('voyra-sched-rail', railOpen ? '1' : '0'); } catch { /* ignore */ }
  }, [railOpen]);
  const [xlsBusy, setXlsBusy] = useState(false);
  const xlsFileRef = useRef(null);
  const toastRef = useRef(null);
  const gridCardRef = useRef(null);
  const [rowH, setRowH] = useState(null);
  const isMobile = useIsMobile();

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
    let limit = scroller ? Math.min(scroller.getBoundingClientRect().bottom, window.innerHeight) : window.innerHeight;
    /* 手机上这张卡是页面唯一的内容，但它后面还跟着 .tool-content 的 30px 下内边距和
       .tool-inner 的 34px 下内边距 —— 不扣掉这两段，卡底会顶到视口边缘之外，
       整页就多出一屏 67px 的可滚距离。桌面端不走这个分支（行为与改动前一致）。 */
    if (window.matchMedia(MOBILE_MQ).matches) {
      const content = card.closest('.tool-content');
      const inner = card.closest('.tool-inner');
      const padOf = (el) => (el ? (parseFloat(getComputedStyle(el).paddingBottom) || 0) : 0);
      limit -= padOf(content) + padOf(inner);
    }
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
    if (!active) return undefined;
    /* 展开/收起时间轴会改变左侧列宽与整卡高度，这里重算一次行高。
       注意：这只解决"行高有余量"的情况；如果某门课的格子因为列变窄而
       需要比行高更高的空间，表格会自己长高、整页随之可滚（实测 +23px）。
       默认收起时是一屏，展开是用户主动要看时间，这个代价可接受 —— 
       要彻底消掉得让时间轴改成浮层而不是占一列。 */
    const raf = requestAnimationFrame(fitGrid);
    const t = setTimeout(fitGrid, 320);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [active, railOpen]);

  /* 增删课程 / 设置面板展开收起都会改变卡片高度，联动重算 */
  useEffect(() => {
    requestAnimationFrame(fitGrid);
  }, [showSettings, showTimeSettings, courses.length, isMobile]);

  const say = (msg) => { setToast(msg); clearTimeout(toastRef.current); toastRef.current = setTimeout(() => setToast(''), 1800); };

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_READ()) || 'null');
      if (raw) {
        const savedCourses = (raw.courses || []).map(normalizeCourse);
        const savedSettings = raw.settings || { startDate: '', overrideWeek: null, timeSlots: null };
        setCourses(savedCourses);
        setSettings(savedSettings);
        localStorage.setItem(LS_READ(), JSON.stringify({ courses: savedCourses, settings: savedSettings }));
      }
    } catch { /* ignore */ }
  }, []);

  /* ===== 云端同步（2026-09-20）：登录后课表上云，跨设备跟随 =====
     云端有 → 以云端为准覆盖本机；云端无 → 把本机课表首推上云（含 ClassScheduleData_local 旧键一次性迁移） */
  useEffect(() => {
    if (!authed) return;
    let alive = true;
    (async () => {
      try {
        const cloud = await window.electronAPI?.loadData?.(CLOUD_KEY);
        if (!alive) return;
        if (cloud && Array.isArray(cloud.courses)) {
          const savedCourses = (cloud.courses || []).map(normalizeCourse);
          const savedSettings = cloud.settings || { startDate: '', overrideWeek: null, timeSlots: null };
          setCourses(savedCourses);
          setSettings(savedSettings);
          try { localStorage.setItem(LS_READ(), JSON.stringify({ courses: savedCourses, settings: savedSettings })); } catch { /* ignore */ }
        } else {
          const local = JSON.parse(localStorage.getItem(LS_READ()) || 'null');
          const legacy = JSON.parse(localStorage.getItem('ClassScheduleData_local') || 'null');
          const first = local || legacy;
          if (first && Array.isArray(first.courses)) await window.electronAPI?.saveData?.(CLOUD_KEY, first);
        }
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [authed]);

  const persist = (nextCourses, nextSettings) => {
    if (!guard()) return;
    const c = (nextCourses ?? courses).map(withPeriods);
    const s = nextSettings ?? settings;
    setCourses(c); setSettings(s);
    try { localStorage.setItem(LS_READ(), JSON.stringify({ courses: c, settings: s })); } catch { /* ignore */ }
    try { Promise.resolve(window.electronAPI?.saveData?.(CLOUD_KEY, { courses: c, settings: s })).catch(() => {}); } catch { /* ignore */ }
  };

  /* 节次时间：默认值 + 用户在「时间设置」中的覆盖（只覆盖 time，label/夜间标志仍用默认） */
  const timeSlots = useMemo(() => {
    const base = Object.fromEntries(DEFAULT_SLOTS.map((s) => [s.key, { ...s }]));
    const ov = settings.timeSlots || {};
    for (const k of Object.keys(ov)) {
      const t = String(ov[k] || '').trim();
      if (!base[k]) continue;
      /* 覆盖值仍是旧版默认 → 视为用户没自定义过，采用新默认 */
      if (t === LEGACY_DEFAULT_TIME[k]) continue;
      if (/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(t)) base[k].time = t;
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

  /* 手机上「第 X 周」显示到页头去（课表卡自己的工具栏整条让位给网格）。
     必须放在 currentWeek 之后 —— 放前面会在渲染期撞上 TDZ。 */
  useEffect(() => {
    if (onWeekLabel) onWeekLabel(isMobile ? `第${currentWeek}周` : '');
  }, [currentWeek, isMobile, onWeekLabel]);

  /* 本周有课的「课」（用于计数与空态判断）与「课 × 时段」（用于格子、明细）：
     一门课多段时，只要有一段落在本周就算这门课本周有课；格子按段铺，段与段互不覆盖。 */
  const weekCourses = useMemo(
    () => courses.filter((c) => coursePeriods(c).some((p) => inWeek(p, currentWeek))),
    [courses, currentWeek],
  );
  const weekendEmpty = useMemo(() => !weekCourses.some((c) => c.day === 6 || c.day === 7), [weekCourses]);
  /* 手机端列数收敛：当周（含单双周换算后）确实没有周六/周日的课，就不渲染这两列，
     否则 390 宽的屏上它们要白占 110px，周一~周五被挤到看不全。
     判据是 weekCourses（已按 currentWeek + 单双周过滤过的当周实际课程），不是全量 courses；
     真有周末课时两列照常出现，此时允许横向滑动，数据不被藏起来。
     桌面端 isMobile 恒 false → dayCols === WEEKDAY，渲染结果与改动前一致。 */
  const dayCols = useMemo(
    () => (isMobile && weekendEmpty ? WEEKDAY.slice(0, 5) : WEEKDAY),
    [isMobile, weekendEmpty],
  );
  const gridScrollable = isMobile && !weekendEmpty; // 手机上仍可能横滑的唯一情形：周末有课
  /* 手机端：左侧节次列整列不渲染（表头 + 每行的节次格），省下的宽度还给周几列；
     节次/时间按 MOBILE_SLOT_IN_CELL 降级进格内。桌面端两个标志恒为 false。 */
  const slotInCell = isMobile && MOBILE_SLOT_IN_CELL;
  /* 今日课程数：按今天星期几 + 当前周次实时统计（编辑课表立即生效） */
  const todayCourseCount = useMemo(() => {
    const dayIdx = (new Date().getDay() + 6) % 7 + 1;
    return courses.reduce((n, c) => n + coursePeriods(c).filter((p) => p.day === dayIdx && inWeek(p, currentWeek)).length, 0);
  }, [courses, currentWeek]);
  /* 本周的「课 × 时段」：格子与明细都按段渲染，一门课几段就是几格 */
  const weekPeriods = useMemo(() => {
    const out = [];
    weekCourses.forEach((c) => {
      coursePeriods(c).forEach((p) => { if (inWeek(p, currentWeek)) out.push({ course: c, period: p }); });
    });
    return out;
  }, [weekCourses, currentWeek]);
  const grid = useMemo(() => {
    const m = {};
    weekPeriods.forEach(({ course, period }) => {
      if (!m[period.day]) m[period.day] = {};
      if (!m[period.day][period.slot]) m[period.day][period.slot] = { course, period };
    });
    return m;
  }, [weekPeriods]);

  const goWeek = (step) => persist(null, { ...settings, overrideWeek: Math.max(1, Math.min(MAX_WEEK, currentWeek + step)) });
  const setWeekInput = (v) => persist(null, { ...settings, overrideWeek: Math.max(1, Math.min(MAX_WEEK, +v || 1)) });

  const reparse = () => setParsed(parseImport(importText));
  const addParsed = () => {
    if (!parsed.length) { say('未识别到有效课程'); return; }
    persist([...courses, ...parsed], null);
    setImportText(''); setParsed([]);
    say(`已导入 ${parsed.length} 门课程`);
  };
  /* 表单里某个时段的局部更新 / 增删 */
  const setPeriod = (idx, patch) => setForm((f) => ({ ...f, periods: f.periods.map((p, i) => (i === idx ? { ...p, ...patch } : p)) }));
  const addOne = () => {
    if (!form.name.trim()) { say('请填写课程名称'); return; }
    const periods = form.periods.map((p) => {
      const one = { day: +p.day, slot: p.slot, f: +p.f, t: +p.t, type: p.type };
      if (p.customOn && p.customStart && p.customEnd) one.customTime = { start: p.customStart, end: p.customEnd };
      return one;
    });
    const c = {
      id: Date.now() + Math.random().toString(36).slice(2, 5),
      name: form.name.trim(), teacher: form.teacher.trim(), room: form.room.trim(),
      periods,
    };
    if (Number.isInteger(form.color)) c.color = form.color;
    if (String(form.credit).trim()) c.credit = String(form.credit).trim();
    if (form.note.trim()) c.note = form.note.trim();
    persist([...courses, c], null);
    /* 保留节次与周次这类每次都要重填的设置，清掉课程自身的字段 */
    setForm((f) => ({ ...EMPTY_FORM(), periods: [newPeriod(f.periods[0].day, f.periods[0].slot)] }));
    say(periods.length > 1 ? `已添加课程（${periods.length} 个时段）` : '已添加课程');
  };
  const remove = (id) => { persist(courses.filter((c) => c.id !== id), null); say('已删除'); };
  const clearAll = () => { persist([], null); say('已清空课表'); };
  const copyTemplate = async () => {
    try { await navigator.clipboard.writeText(IMPORT_TEMPLATE); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };

  /* ── 导入的三种新方式（都在前端完成，不经过服务器） ── */
  const importShare = () => {
    const list = decodeShare(shareText);
    if (!list) { say('这段口令识别不了：请确认从「VOYRA1:」开始整段粘贴'); return; }
    setParsed(list);
    say(`口令里含 ${list.length} 门课程，确认后导入`);
  };
  const makeShareCode = async () => {
    if (!courses.length) { say('课表还是空的，先导入或添加课程'); return; }
    const code = encodeShare(courses, shareDetail);
    setShareText(code);
    try { await navigator.clipboard.writeText(code); say('口令已复制，发给同学粘贴即可'); } catch { say('已生成口令，长按文本框复制'); }
  };
  const exportBackup = () => {
    if (!courses.length) { say('课表还是空的，没什么可导出'); return; }
    const data = JSON.stringify({ app: BACKUP_APP, v: 1, at: new Date().toISOString(), courses, settings });
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `voyra-课表备份-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('备份已导出');
  };
  const onBackupFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      const list = Array.isArray(obj?.courses) ? obj.courses.map(withPeriods) : null;
      if (!list) { say('这不是本站的备份文件'); return; }
      setParsed(list);
      setBackupSettings(obj.settings || null);
      say(`备份里有 ${list.length} 门课程，可合并或覆盖`);
    } catch { say('备份文件读不出来，可能已损坏'); }
  };
  const onHtmlFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const rows = htmlToRows(await file.text());
      if (!rows.length) { say('这个网页里没找到表格：请在教务系统课表页「另存为网页」再上传'); return; }
      const list = parseXlsRows(rows);
      if (!list.length) { say('表格读到了，但没识别出课程：请把网页另存为「仅 HTML」再试一次'); return; }
      setParsed(list);
      say(`从网页里识别到 ${list.length} 门课程，确认后导入`);
    } catch { say('网页解析失败'); }
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
      if (!list.length) { say('未识别到有效课程：请确认表头含「课程名称/教师/星期/节次/周次/教室」列，或为「行=节次、列=星期」的课表'); return; }
      setParsed(list);
      say(`已识别 ${list.length} 门课程，确认后导入`);
    } catch (err) {
      console.error(err);
      say('Excel 解析失败，请确认是 .xls / .xlsx 文件');
    } finally {
      setXlsBusy(false);
    }
  };

  /* 导入卡的两个动作：桌面端留在卡头，手机端折叠后放进展开态第一行。
     同一份 JSX 两处复用，避免出现两套会各自腐烂的按钮。 */
  const xlsActions = (<>
    <button className="cs-btn" onClick={() => xlsFileRef.current && xlsFileRef.current.click()} disabled={xlsBusy} style={xlsBusy ? { opacity: .6, cursor: 'wait' } : undefined}>
      {xlsBusy ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <FileSpreadsheet size={15} />}
      {xlsBusy ? '解析中…' : '导入 Excel(.xls/.xlsx)'}
    </button>
    <button className="cs-btn" onClick={copyTemplate}>
      {copied ? <Check size={15} style={{ color: ACCENT }} /> : <Copy size={15} />}
      {copied ? '已复制' : '复制导入模板'}
    </button>
  </>);
  const xlsFileInput = <input ref={xlsFileRef} type="file" accept=".xls,.xlsx" style={{ display: 'none' }} onChange={onXlsFile} />;

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
        .cs-row .sp { flex:1 1 auto; min-width:0; }
        /* 时段列表：一門課多段时，每段是一个带描边的小块，段与段之间不粘连 */
        .cs-period { border:1px solid rgba(20,24,33,.1); border-radius:10px; padding:10px 12px; margin-top:10px; background:rgba(255,255,255,.6); }
        .cs-period-head { display:flex;align-items:center;gap:8px;margin-bottom:8px; }
        .cs-period-head b { font-size:13px;color:#212529; }
        /* 颜色：6 个站点配色 + 一个「跟随课名」，选中给一圈金色 */
        .cs-colors { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
        .cs-color-auto { border:1px solid rgba(20,24,33,.14);border-radius:99px;background:#fff;padding:6px 12px;font-size:12px;color:#555;min-height:36px; }
        .cs-color-auto.is-on { border-color:${ACCENT_LINE};color:${ACCENT};font-weight:700; }
        .cs-color-dot { width:32px;height:32px;border-radius:50%;border:1px solid rgba(20,24,33,.14);padding:0; }
        .cs-color-dot.is-on { box-shadow:0 0 0 2px #fff,0 0 0 4px ${ACCENT_LINE}; }
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
        .cs-gridwrap { position:relative; }
        /* 右缘渐隐：手机上提示课表还能接着往右滑 */
        .cs-gridwrap::after { content:""; position:absolute; top:0; right:0; bottom:0; width:0; pointer-events:none; }
        .cs-grid { overflow-x:auto; scroll-padding-left:88px; }
        .cs-grid table { min-width:680px;width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed; }
        .cs-grid th,.cs-grid td { border-bottom:1px solid rgba(20,24,33,.075);border-right:1px solid rgba(20,24,33,.075); }
        .cs-grid thead tr:first-child th { border-top:1px solid rgba(20,24,33,.075); }
        .cs-grid tr th:first-child,.cs-grid tr td:first-child { border-left:1px solid rgba(20,24,33,.075); }
        .cs-grid tbody td { height:var(--cs-row-h,112px);vertical-align:top;padding:6px; }
        /* 短标只在手机收起态用；桌面端（以及手机展开态）一律显完整名称 */
        .cs-grid .per .mini { display:none; }
        .cs-grid thead th { position:sticky;top:0;z-index:2;background:#F8F9FB;color:#5A5F69;font-size:12px;font-weight:750;letter-spacing:.06em;padding:11px 4px;box-shadow:inset 0 -1px rgba(20,24,33,.08); }
        .cs-grid thead th.per { background:#FCFCFD; }
        .cs-col-period { width:88px; }
        .cs-col-day.compact { width:72px; }
        .cs-grid .per { background:#FCFCFD;color:#9095A0;font-size:11px;text-align:center;padding:10px 5px;line-height:1.5;font-variant-numeric:tabular-nums;vertical-align:middle; }
        .cs-grid .per b { display:block;font-size:12.5px;color:#212529;letter-spacing:.02em;margin-bottom:2px; }
        .cs-grid td.empty { background:#FCFCFD; }
        .cs-cell { background:var(--course-bg);border:1px solid var(--course-border);border-radius:10px;height:100%;padding:10px 10px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:4px;transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease;box-shadow:0 1px 2px rgba(16,20,30,.04);overflow:hidden; }
        .cs-cell:hover { transform:translateY(-1px);box-shadow:0 6px 16px rgba(16,20,30,.09); }
        .cs-cell .n { font-size:13.5px;font-weight:750;color:var(--course-text);line-height:1.32;letter-spacing:.01em;text-align:center;overflow-wrap:anywhere;white-space:normal; }
        .cs-cell .r { display:inline-flex;align-items:center;justify-content:center;gap:3px;align-self:center;max-width:100%;font-size:10.5px;font-weight:700;color:var(--course-room);background:rgba(255,255,255,.72);border-radius:6px;padding:2px 5px;line-height:1.25;text-align:center;overflow-wrap:anywhere; }
        .cs-cell .r svg { flex:0 0 auto; }
        .cs-cell .t { font-size:10.5px;color:#6A6F79;margin-top:1px;line-height:1.3;letter-spacing:.01em;text-align:center;overflow-wrap:anywhere;white-space:normal; }
        .cs-cell .w { font-size:10px;color:#838890;font-weight:650;letter-spacing:.01em; }
        .cs-cell.night { background:linear-gradient(180deg, rgba(99,102,241,.07), rgba(99,102,241,.03));border-style:dashed;border-color:rgba(99,102,241,.3); }
        .cs-empty { text-align:center;padding:26px 0;color:#adb5bd;font-size:13px; }
        .cs-list-row { display:flex;align-items:center;gap:12px;border-top:1px solid rgba(20,24,33,.07);padding:10px 4px;flex-wrap:wrap; }
        .cs-tag { display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;color:#3D424C;background:#F1F3F5;border-radius:7px;padding:4px 10px;letter-spacing:.01em; }
        .cs-tag.night { color:#5F3DC4;background:#F1EEFF; }
        .cs-review { border:1px dashed ${ACCENT_LINE};border-radius:10px;background:${ACCENT_SOFT};padding:10px 12px;margin-top:10px; }
        .cs-review-item { display:inline-flex;align-items:center;gap:8px;background:#fff;border-radius:8px;padding:6px 10px;margin:4px 4px 0 0;font-size:12px; }
        .cs-toast { position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#212529;color:#fff;padding:9px 16px;border-radius:999px;font-size:12.5px;z-index:99; }
        @media (max-width:767px) {
          /* 外壳的通用卡片规则实测是 .tool-content :is([class*="card"]…):not([class*="grid"])
             共 3 条类选择器 + !important（手机上落到 12px），原来这条 .tool-content .cs-card
             只有 2 条，压不过它；补齐 .tool-content .shub-panel .cs-page 前缀才真正收到 10px，
             省下的横向余量全部给课表网格 */
          .tool-content .shub-panel .cs-page .cs-card { padding:10px !important; }
          .tool-content .shub-panel .cs-page .cs-card .cs-card { padding:8px !important; }
          .cs-page { gap:12px; }
          /* ── 1. 进来就展示课程表：周次切换卡挪到网格卡紧后面 ──
             .cs-page 本就是 display:flex，重排只用 order，不动 DOM。
             注：<style> 也占一个子节点，所以一律用 nth-of-type 按 div 计数。
             新顺序：网格 0 / 周次 1 / 明细 2 / 导入 3 / 添加 4 ——
             周次切换器是驱动网格的控件，紧贴网格才不致控件与内容分离。 */
          .cs-page > .cs-card { order:3; }
          .cs-page > .cs-card:nth-of-type(1) { order:1; }
          .cs-page > .cs-card:nth-of-type(2) { order:0; }
          .cs-page > .cs-card:nth-of-type(3) { order:2; }
          .cs-page > .cs-card:nth-of-type(4) { order:3; }
          .cs-page > .cs-card:nth-of-type(5) { order:4; }
          .cs-page > .cs-toast { order:9; }
          /* 表格贴到卡片边缘：把省下的内边距全部还给课表 */
          .cs-gridwrap { margin:0 -10px; }
          .cs-gridwrap::after { width:30px; background:linear-gradient(270deg,#fff 6%,rgba(255,255,255,0)); }
          /* ── 2. 周一~周五一屏看全，不横滑 ──
             390 档网格可用宽 322（原 .cs-grid 左右各 10px 内边距与 .cs-gridwrap 的
             -10px 外边距互相抵消，白吃掉 20px）。
             手机上左侧「节次」列整列不再渲染（表头 + 每行的节次格，见 JSX 里的
             hidePeriodCol / MOBILE_SLOT_IN_CELL），省下的 46px 全部还给周几列：
             五列不写宽度，交给 table-layout:fixed 等分剩余 →
             实测 360/390/430 档每列 58 / 64 / 72px（改动前是 49 / 55 / 63px）。
             节次与起止时间没有丢，降级进每行第一格顶部的 .cs-slot-tag。 */
          .cs-grid { padding:0; scroll-snap-type:x proximity; scroll-padding-left:0; -webkit-overflow-scrolling:touch; scrollbar-width:thin; }
          .cs-grid table { min-width:0; }
          .cs-col-day, .cs-col-day.compact { width:auto; }
          /* 唯一还允许横滑的情形：当周确有周六/周日课 → 七列一起上，每列兜到 46px 起
             （46 是「08:20-」在 --fs-meta 下不断成三截的最小宽度，与格内时间标记同源） */
          .cs-gridwrap-wide .cs-grid table { min-width:322px; }
          .cs-gridwrap:not(.cs-gridwrap-wide)::after { width:0; } /* 不横滑了就不许再画「可滑动」的渐隐 */
          .cs-grid thead th { font-size:var(--fs-meta); padding:9px 2px; letter-spacing:0; }
          /* 行高随内容：手机上不再由 fitGrid 均摊视口高度，格子写死多高就必然裁掉多高。
             注意别给 td 换 display:flex —— 那会让它不再是 table-cell，整行的格子会
             塌进同一列里竖着堆起来（实测 390 档一行三格叠成 587px 高）。
             改回表格原生行为，用 vertical-align:middle 让矮格子在行内居中，
             避免同一行里三格顶高不齐。min-height 只兜「整行无课」时的最小可辨识度。 */
          /* 单元格高度必须走 --cs-row-h：表格单元格上的 min-height 是不生效的，
             之前写 height:auto + min-height:44px，空格子实测只有 3px 高。 */
          .cs-grid tbody td { padding:2px; height:var(--cs-row-h, 96px); vertical-align:middle; }
          /* 左侧时间轴：默认收成 30px 刻度柱，点表头那一格展开到 66px 显示起止时间。
             展开与否记在 localStorage，下次进来保持。 */
          .cs-col-period { width: 30px; }
          .cs-rail-toggle { display:grid;place-items:center;width:100%;min-height:32px;padding:0;
            border:0;background:transparent;color:#6A6F79;font-size:var(--fs-meta);font-weight:700; }
          .cs-grid .per b { display:block;font-size:var(--fs-meta);line-height:1.15;white-space:nowrap; }
          .cs-grid .per .tm { display:none; }
          /* 收起：只留短标（1-2 / 晚1），单行不换行 */
          .cs-grid .per .mini { display:block; }
          .cs-grid:not(.is-rail-open) .per .full { display:none; }
          .cs-grid.is-rail-open .per .mini { display:none; }
          .cs-grid.is-rail-open .cs-col-period { width: 66px; }
          /* 展开：完整名称 + 起止时间，各占一行且都不换行（时间 10px 才塞得进 66-8=58px） */
          .cs-grid.is-rail-open .per .tm { display:block;font-size:10px;color:#8a8f98;white-space:nowrap;font-variant-numeric:tabular-nums; }

          /* ── 抽屉里的排版 ──
             抽屉只有手机那么宽，控件得按手机来排：卡头按钮两两并排、
             四种导入方式一行四个、周次条三等分、表单两列。
             全部限定在 .shub-drawer-body 之内 —— 桌面没有抽屉，一律不受影响。 */
          .shub-drawer-body .cs-h { flex-wrap:wrap; row-gap:8px; }
          /* 抽屉标题已经写着「导入课表」，卡内那一行图标+标题就不必再占半行，
             让两个动作按钮能并排 */
          .shub-drawer-body .cs-h > .ico { display:none; }
          .shub-drawer-body .cs-h > h3 { flex:1 1 100%; }
          .shub-drawer-body .cs-h > .sp { display:none; }
          .shub-drawer-body .cs-h > .cs-btn { flex:1 1 calc(50% - 5px); justify-content:center; }
          .shub-drawer-body .cs-modes { display:grid;grid-template-columns:repeat(4,minmax(0,1fr)); }
          .shub-drawer-body .cs-modes .cs-btn { justify-content:center;padding:0 4px;font-size:var(--fs-meta); }
          .shub-drawer-body .cs-weekrow { display:grid;grid-template-columns:repeat(6,minmax(0,1fr)); }
          .shub-drawer-body .cs-weekrow > *:nth-child(-n+3) { grid-column:span 2; }
          .shub-drawer-body .cs-weekrow > *:nth-child(n+4) { grid-column:span 3; }
          .shub-drawer-body .cs-weekrow > .cs-btn,
          .shub-drawer-body .cs-weekrow > .cs-input { width:100%;justify-content:center; }
          .shub-drawer-body .cs-forminfo > .cs-field,
          .shub-drawer-body .cs-period > .cs-row > .cs-field { flex:1 1 calc(50% - 4px);min-width:0; }
          .shub-drawer-body .cs-forminfo > .cs-f-full { flex:1 1 100%; }
          .cs-cell { padding:3px 2px;border-radius:8px; gap:2px; }
          /* ── 格内的「第几节 + 起止时间」标记（手机端独有，桌面端不渲染该元素）──
             一行装不下 19 个字符，让它在连字符处自然断成两行：
             「1-2 节 08:20-」/「10:00」，与改动前 46px 节次列里的断法一致。 */
          .cs-slot-tag { display:flex; flex-wrap:wrap; align-items:baseline; gap:0 3px; width:100%; min-width:0; margin-bottom:2px; padding-bottom:1px; border-bottom:1px solid rgba(20,24,33,.12); font-size:var(--fs-meta); line-height:1.25; font-variant-numeric:tabular-nums; color:#6A6F79; overflow-wrap:anywhere; }
          .cs-slot-tag b { color:#212529; font-size:var(--fs-meta); font-weight:750; }
          /* 五列并排后每列 58 / 64 / 72px（360/390/430 实测），课程名格子内正文宽
             360 档实测 50px —— 正文级 15px 会一个字一行，退到标签级；
             教室与格内时间标记仍守住 --fs-meta 这条必要信息下限 */
          .cs-cell .n { font-size:var(--fs-label); line-height:1.28; }
          .cs-cell .r { font-size:var(--fs-meta); padding:1px 2px; gap:0; }
          /* 定位小图标在 50px 宽的格子里要吃掉 12px，教室串会被挤成「明理/楼A/201」三行竖排；
             手机上让位给文字（明细卡与 title 里教室信息一字不少） */
          .cs-cell .r svg { display:none; }
          /* 手机端网格里不再显示授课老师（用户指令）：桌面端这一行照常渲染。
             老师一条并没有丢 —— 课程明细卡与格子的 title 里都还在。 */
          .cs-cell .t { display:none; }
          .cs-cell .w { font-size:var(--fs-meta); }
          .cs-h h3 { font-size:var(--fs-lead); }
          /* 收紧间距让今日概览留在同一行，避免行尾出现孤立的分隔点 */
          .cs-today { gap:7px; font-size:12.5px; }
          .cs-today-date { gap:5px; font-size:13.5px; }
          /* 「TODAY」是当日标识，属必要信息，不得低于辅助字号 */
          .cs-today-date i { font-size:var(--fs-meta); letter-spacing:.05em; }
          .cs-tdot { width:3px; height:3px; }
          .cs-input { font-size:15px; }
          .cs-toast { bottom:calc(20px + env(safe-area-inset-bottom,0px)); font-size:13.5px; }
          /* ── 3. 明细 / 导入 / 添加三块竖向大幅收紧 ──
             可点控件一律不动：.cs-btn / .cs-input 已由外壳与 index.css 兜在 44px 下限，
             相邻可点控件的 gap 保持 ≥ --gap-tap(8px)。压缩只发生在
             「非可点装饰余量」和「窄列把一行撑成五段」这两类真正的浪费上。 */
          .cs-page > .cs-card:nth-of-type(n+3) .cs-h { margin-bottom:8px; }
          .cs-page > .cs-card:nth-of-type(n+3) .cs-h .ico { width:26px; height:26px; border-radius:7px; }
          .cs-page > .cs-card:nth-of-type(n+3) .cs-h h3 { font-size:var(--fs-body); }
          .cs-page > .cs-card:nth-of-type(n+3) .cs-h .cs-chip { padding:3px 9px; font-size:var(--fs-meta); }
          /* 明细行：课程名独占一行，其余标签紧凑成串排在下面。
             外壳给 .cs-tag 也兜了 44px 拇指高，但它是 span 不是按钮，
             44px 只会把一行撑成五段 —— 收到真实文字高度，触控下限由行尾那颗删除按钮保证。 */
          .cs-list-row { padding:9px 2px; gap:8px; }
          .cs-page .cs-list-row > div:first-child { flex:1 1 100% !important; }
          .cs-page .cs-list-row > div:first-child > div { line-height:1.3; }
          .cs-page .cs-list-row > div:first-child > .cs-tag { margin-top:3px !important; }
          .cs-page .cs-list-row .cs-tag { min-height:0; padding:3px 8px; font-size:var(--fs-meta); line-height:1.4; }
          /* 表单标签：窄列里最容易竖排堆砌的一处 */
          .cs-page label.cs-l { margin-bottom:2px; line-height:1.3; }
          .cs-page .cs-field { gap:2px; }
          .cs-page .cs-field > .cs-input { width:100%; min-width:0; }
          /* 一行两列：手动添加卡从 8 行压到 5 行，作息/周次设置同理 */
          .cs-page .cs-row > .cs-field { flex:1 1 calc(50% - 4px); min-width:0; }
          .cs-page .cs-row > .cs-field:has(> .cs-btn) { flex:0 1 auto; }
          /* 原生 date 输入框在 16px 下有固定最小内容宽（含日历图标），半列宽会被撑到溢出 */
          .cs-page .cs-row > .cs-field:has(> input[type="date"]) { flex:1 1 100%; }
          /* 节次下拉的选中文案最长（「5-6 节（13:30-15:15）」）、周次格是两输入框加单位，都给整行 */
          .cs-page > .cs-card:nth-of-type(5) .cs-row > .cs-field:nth-child(5),
          .cs-page > .cs-card:nth-of-type(5) .cs-row > .cs-field:nth-child(6) { flex:1 1 100%; }
          /* 作息滚轮触发钮：min-width 66 + padding 28 会让「08:20 至 10:00」在 50% 列里换行，
             压掉左右内边距后一列两个正好放下（高度仍由外壳兜在 44px 拇指下限） */
          .cs-page .tp-btn { min-width:0; padding:7px 8px; }
          /* 导入：粘贴框 6 行 → 3 行（仍可拖拽改高），说明文字回到辅助字号 */
          .cs-page textarea.cs-input { height:78px; min-height:78px; line-height:1.5 !important; }
          .tool-content .cs-page .cs-card p { font-size:var(--fs-meta) !important; line-height:1.55 !important; }
          /* 滚轮选择器：一格 36px 在手机上按不准，抬到 44px 拇指下限，
             列高/留白同步换算（88 = (220-44)/2），与 TimeWheel 里的 ITEM/PAD 一一对应 */
          .cs-page .tp-col { height:220px; padding:88px 0; min-width:44px; }
          .cs-page .tp-item { height:44px; line-height:44px; width:100%; }
          .cs-page .tp-mask { height:80px; }
          .cs-page .tp-pop { padding:8px 12px 10px; }
          .cs-page .tp-pop-done { min-height:var(--ctl-md); }
        }
        .tp-btn { border:1px solid rgba(20,24,33,.16);background:#fff;color:#212529;border-radius:9px;padding:7px 14px;font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;cursor:pointer;min-width:66px;transition:all .15s ease; }
        .tp-btn:hover { border-color:${ACCENT_LINE};color:${ACCENT}; }
        .tp-btn.active { border-color:${ACCENT};background:${ACCENT_SOFT};color:${ACCENT};box-shadow:0 0 0 3px rgba(164,136,48,.14); }
        .tp-pop { position:absolute;top:calc(100% + 6px);left:0;z-index:30;background:#fff;border:1px solid rgba(20,24,33,.12);border-radius:12px;box-shadow:0 14px 36px rgba(16,20,30,.16);padding:10px 14px 12px; }
        .tp-pop-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:4px; }
        .tp-pop-title { font-size:12px;color:#6c757d;font-weight:600;letter-spacing:.04em; }
        .tp-pop-done { border:none;background:${ACCENT};color:#fff;border-radius:7px;padding:5px 16px;font-size:12.5px;font-weight:700;cursor:pointer;transition:opacity .15s ease; }
        .tp-pop-done:hover { opacity:.9; }
        .tp-wheels { position:relative;display:flex;justify-content:center;align-items:center;gap:2px; }
        .tp-col { position:relative;height:180px;box-sizing:border-box;overflow-y:auto;scroll-snap-type:y proximity;overscroll-behavior:contain;scrollbar-width:none;-ms-overflow-style:none;padding:72px 0; }
        .tp-col::-webkit-scrollbar { display:none; }
        .tp-item { height:36px;line-height:36px;text-align:center;font-size:15px;font-weight:600;color:#495057;scroll-snap-align:center;cursor:pointer;user-select:none;transition:transform .1s linear,opacity .1s linear,color .15s ease;will-change:transform,opacity; }
        .tp-item.sel { color:${ACCENT};font-weight:800; }
        .tp-sep { font-size:18px;font-weight:700;color:#adb5bd;padding:0 2px; }
        .tp-mask { position:absolute;left:0;right:0;height:60px;pointer-events:none;z-index:2; }
        .tp-mask-top { top:0;background:linear-gradient(180deg,#fff 20%,rgba(255,255,255,0)); }
        .tp-mask-bottom { bottom:0;background:linear-gradient(0deg,#fff 20%,rgba(255,255,255,0)); }
        .tp-preview { text-align:center;margin-top:4px;font-size:16px;font-weight:800;color:#212529;font-variant-numeric:tabular-nums;letter-spacing:.12em; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* 顶部：当前周边 + 操作 —— 手机上收进抽屉「周次与时间设置」 */}
      <MobileSection mobile={isMobile} host={drawerHost} id="week" panel={drawerPanel}>
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
          <div className="cs-row cs-weekrow">
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
            <div className="cs-row" style={{ alignItems: 'flex-start' }}>
              {DEFAULT_SLOTS.map((s) => {
                const [st, en] = (timeSlots[s.key].time || '08:20-10:00').split('-');
                const editingThis = timeEdit && timeEdit.key === s.key;
                return (
                  <div key={s.key} className="cs-field" style={{ gap: 4, position: 'relative' }}>
                    <label className="cs-l">{s.label}{s.night ? '（晚自习）' : ''}</label>
                    <div className="cs-row" style={{ gap: 4 }}>
                      <button type="button" className={`tp-btn${editingThis && timeEdit.side === 's' ? ' active' : ''}`}
                        onClick={() => setTimeEdit(editingThis && timeEdit.side === 's' ? null : { key: s.key, side: 's' })}>
                        {st}
                      </button>
                      <span style={{ color: '#adb5bd', fontSize: 12 }}>至</span>
                      <button type="button" className={`tp-btn${editingThis && timeEdit.side === 'e' ? ' active' : ''}`}
                        onClick={() => setTimeEdit(editingThis && timeEdit.side === 'e' ? null : { key: s.key, side: 'e' })}>
                        {en}
                      </button>
                    </div>
                    {editingThis && (
                      <TimeWheel
                        mobile={isMobile}
                        value={timeEdit.side === 's' ? st : en}
                        onDone={(nv) => {
                          const cur = timeSlots[s.key].time.split('-');
                          const nst = timeEdit.side === 's' ? nv : cur[0];
                          const nen = timeEdit.side === 'e' ? nv : cur[1];
                          if (nst >= nen) { say('开始时间需早于结束时间'); return; }
                          setSlotTime(s.key, `${nst}-${nen}`);
                          setTimeEdit(null);
                        }}
                      />
                    )}
                  </div>
                );
              })}
              <div className="cs-field" style={{ alignSelf: 'flex-end' }}>
                <button className="cs-btn" onClick={() => { persist(null, { ...settings, timeSlots: null }); say('已恢复默认作息'); }}>恢复默认</button>
              </div>
            </div>
            <p style={{ margin: '8px 0 0', width: '100%', fontSize: 12, color: '#6c757d' }}>
              点按时间即可弹出滚轮选择（小时 / 每 5 分钟），课表、明细与手动添加会同步更新；恢复默认使用标准大学作息。
            </p>
          </div>
        )}
        {/* 手机上课表卡自己的工具栏没了，清空课表搬到这里，仍是原按钮原逻辑 */}
        {isMobile && (
          <div className="cs-row" style={{ marginTop: 12 }}>
            <button className="cs-btn danger" onClick={clearAll}><Trash2 size={14} />清空课表</button>
          </div>
        )}
      </div>
      </MobileSection>

      {/* 周网格课表 */}
      <div className="cs-card" ref={gridCardRef} style={{ '--cs-row-h': rowH ? `${rowH}px` : undefined }}>
        {/* 手机上这条工具栏整条不占位：「第 X 周」已经上报到页头，
            清空课表挪进抽屉的「周次与时间设置」里 */}
        {!isMobile && (
          <div className="cs-h">
            <div className="ico"><CalendarRange size={18} /></div>
            <h3>第 {currentWeek} 周课表</h3>
            <div className="sp" />
            <button className="cs-btn danger" onClick={clearAll}><Trash2 size={14} />清空课表</button>
          </div>
        )}
        <div className={`cs-gridwrap${gridScrollable ? ' cs-gridwrap-wide' : ''}`}>
          <div className={`cs-grid${isMobile && railOpen ? ' is-rail-open' : ''}`}>
            <table>
              <colgroup>
                <col className="cs-col-period" />
              {dayCols.map((w, i) => (
                <col key={w} className={`cs-col-day${weekendEmpty && i >= 5 ? ' compact' : ''}`} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {(isMobile
                  /* 手机上时间轴默认收起成一条窄刻度，点表头这一格展开看起止时间 */
                  ? <th className="per"><button type="button" className="cs-rail-toggle" aria-expanded={railOpen}
                      aria-label={railOpen ? '收起时间轴' : '展开时间轴'} title={railOpen ? '收起时间轴' : '展开时间轴'}
                      onClick={() => setRailOpen((v) => !v)}>{railOpen ? '节次' : <Clock size={13} />}</button></th>
                  : <th className="per">节次</th>)}
                {dayCols.map((w) => <th key={w}>周{w}</th>)}
              </tr>
            </thead>
            <tbody>
              {DEFAULT_SLOTS.map((s) => {
                const slot = timeSlots[s.key];
                return (
                <tr key={slot.key}>
                  <td className="per"><b><span className="full">{slot.label}</span><span className="mini">{miniSlotLabel(slot.label)}</span></b><span className="tm">{slot.time}</span></td>
                  {dayCols.map((_, di) => {
                    const d = di + 1;
                    /* 手机上这一行的「第几节 + 起止时间」不再占一整列，改为落在该行
                       第一格顶部的一条 hairline 标记里 —— 每行都固定落在同一格，
                       读起来仍是一条左侧时间轴；空行也带着它，行身份不会丢。 */
                    const tagHere = slotInCell && di === 0;
                    const hit = grid[d]?.[slot.key];
                    if (hit) {
                      const c = hit.course;
                      const p = hit.period;
                      const theme = themeOf(c);
                      /* 这一格有自己的起止时间（自定义时间）时，挂在 title 上，
                         明细里也会单独列出来 */
                      const ct = p.customTime && p.customTime.start && p.customTime.end
                        ? ` · ${p.customTime.start}-${p.customTime.end}` : '';
                      return (
                        <td key={d}>
                          <div
                            className={`cs-cell${slot.night ? ' night' : ''}`}
                            style={{
                              '--course-bg': theme.bg,
                              '--course-border': theme.border,
                              '--course-text': theme.text,
                              '--course-room': theme.room,
                            }}
                            title={`${c.name}${ct}`}
                          >
                            {tagHere && <div className="cs-slot-tag"><b>{slot.label}</b><span>{slot.time}</span></div>}
                            <div className="n">{c.name}</div>
                            <div className="r"><MapPin size={10} strokeWidth={2.2} />{c.room || '地点未填'}</div>
                            <div className="t">{c.teacher || '老师未填'}</div>
                            {p.type !== 'every' && <div className="w">{INC[p.type]}</div>}
                          </div>
                        </td>
                      );
                    }
                    return <td key={d} className="empty">{tagHere && <div className="cs-slot-tag"><b>{slot.label}</b><span>{slot.time}</span></div>}{(slot.night && <Moon size={13} style={{ opacity: .4 }} />) || ''}</td>;
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
        {weekCourses.length === 0 && <div className="cs-empty">本周暂无课程，请先导入课表</div>}
      </div>

      {/* 本周课程列表（默认折叠） */}
      <MobileSection mobile={isMobile} host={drawerHost} id="detail" panel={drawerPanel}>
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
          weekPeriods.map(({ course: c, period: p }, idx) => {
            /* 兜底到第一个节次：万一某条数据的 slot 键不认识（手改过存储、
               旧版本遗留），这里 undefined.night 会把整页打崩 —— 实测过。 */
            const base = timeSlots[p.slot] || SLOT_META[p.slot] || SLOT_META['1-2'];
            /* 这一段有自己的起止时间就优先用它（自定义时间） */
            const meta = p.customTime && p.customTime.start && p.customTime.end
              ? { ...base, time: `${p.customTime.start}-${p.customTime.end}` }
              : base;
            const weeksText = `${p.f === p.t ? `${p.f}周` : `${p.f}-${p.t}周`}${p.type !== 'every' ? `（${INC[p.type]}）` : ''}`;
            const segCount = coursePeriods(c).length;
            return (
              <div key={`${c.id}-${p.slot}-${p.day}`} className="cs-list-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 750, color: '#212529', letterSpacing: '.02em' }}>
                    {c.name}
                    {c.credit ? <span className="cs-tag" style={{ marginLeft: 6, fontWeight: 600 }}>{c.credit} 学分</span> : null}
                  </div>
                  <span className="cs-tag" style={{ marginTop: 5, display: 'inline-flex' }}>
                    {weeksText}{segCount > 1 ? ` · 第 ${idx + 1}/${segCount} 段` : ''}
                  </span>
                  {c.note && <span className="cs-tag" style={{ marginTop: 5, display: 'inline-flex' }}>{c.note}</span>}
                </div>
                <span className="cs-tag"><CalendarDays size={12} />周{WEEKDAY[p.day - 1]}</span>
                <span className={`cs-tag${meta.night ? ' night' : ''}`}><Clock size={12} />{meta.label}</span>
                <span className="cs-tag"><Clock size={12} />{meta.time}</span>
                {c.room && <span className="cs-tag"><MapPin size={12} />{c.room}</span>}
                <span className="cs-tag"><User size={12} />{c.teacher || '未填老师'}</span>
                <button className="cs-btn danger" onClick={() => remove(c.id)}><Trash2 size={14} />{segCount > 1 ? '删除整门' : '删除'}</button>
              </div>
            );
          })
        )}
      </div>
      </MobileSection>

      {/* 导入 */}
      <MobileSection mobile={isMobile} host={drawerHost} id="import" panel={drawerPanel}>
      <div className="cs-card">
        <div className="cs-h">
          <div className="ico"><Upload size={18} /></div>
          <h3>导入课表</h3>
          <div className="sp" />
          {xlsActions}
          {xlsFileInput}
        </div>
        {/* 四种方式共用下面同一套「识别 → 预览 → 导入」确认流程 */}
        <div className="cs-row cs-modes" style={{ gap: 6, marginBottom: 10 }}>
          {[['file', '从文件'], ['share', '分享口令'], ['html', '教务网页'], ['backup', '备份']].map(([k, label]) => (
            <button key={k} type="button" className={`cs-btn${importMode === k ? ' primary' : ''}`}
              onClick={() => { setImportMode(k); setParsed([]); }}>{label}</button>
          ))}
        </div>

        {importMode === 'file' && (
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          rows={6}
          placeholder={'粘贴课程文本，例如：\n【高等数学】\n课程：高等数学\n星期：周一\n节次：1-2节\n周次：1-16周\n老师：龙承星副教授\n教室：博学楼501\n\n【晚自习】\n星期：周二\n节次：晚自习1'}
          className="cs-input" style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
        />
        )}

        {importMode === 'share' && (<>
          <div className="cs-row">
            <button type="button" className="cs-btn primary" onClick={makeShareCode}>生成我的课表口令</button>
            <label className="cs-l" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <input type="checkbox" checked={shareDetail} onChange={(e) => setShareDetail(e.target.checked)} />含教室与老师
            </label>
          </div>
          <textarea
            value={shareText} onChange={(e) => setShareText(e.target.value)} rows={3}
            placeholder="同学发来的口令粘在这里；也可以点上面的按钮生成自己的口令再发出去"
            className="cs-input" style={{ width: '100%', marginTop: 10, resize: 'vertical', lineHeight: 1.6, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}
          />
          <div className="cs-row" style={{ marginTop: 10 }}>
            <button type="button" className="cs-btn" onClick={importShare}><Wand2 size={14} />识别口令</button>
          </div>
        </>)}

        {importMode === 'html' && (<>
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#6c757d' }}>
            在教务系统打开课表页 → 浏览器菜单里「另存为网页」→ 把那个 .html 传上来。按「行=节次、列=星期」识别，全程在本机解析，不联网也不上传。
          </p>
          <div className="cs-row">
            <button type="button" className="cs-btn primary" onClick={() => htmlFileRef.current && htmlFileRef.current.click()}>选择网页文件</button>
            <input ref={htmlFileRef} type="file" accept=".html,.htm,.mht,.mhtml" style={{ display: 'none' }} onChange={onHtmlFile} />
          </div>
        </>)}

        {importMode === 'backup' && (<>
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#6c757d' }}>
            导出的是本站备份（课程 + 周次/时间设置）。换手机、换浏览器或清缓存前先导一份，回来直接还原。
          </p>
          <div className="cs-row">
            <button type="button" className="cs-btn" onClick={exportBackup}>导出备份</button>
            <button type="button" className="cs-btn primary" onClick={() => backupFileRef.current && backupFileRef.current.click()}>选择备份文件</button>
            <input ref={backupFileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onBackupFile} />
          </div>
        </>)}
        <div className="cs-row" style={{ marginTop: 10 }}>
          {importMode === 'file' && (<>
            <button className="cs-btn primary" onClick={reparse}><Wand2 size={14} />识别并预览</button>
            <button className="cs-btn" onClick={() => { setImportText(''); setParsed([]); }}>清空</button>
          </>)}
          <button className="cs-btn primary" onClick={addParsed} disabled={!parsed.length} style={parsed.length ? {} : { opacity: .5, cursor: 'not-allowed' }}>
            <Upload size={14} />合并导入 {parsed.length ? `${parsed.length} 门` : ''}
          </button>
          {importMode === 'backup' && backupSettings && (
            <button className="cs-btn danger" onClick={() => {
              persist(parsed, backupSettings);
              setParsed([]); setBackupSettings(null);
              say('已用备份覆盖课表');
            }}>覆盖导入（含设置）</button>
          )}
        </div>
        {parsed.length > 0 && (
          <div className="cs-review">
            <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 4 }}>识别到 {parsed.length} 门课程：</div>
            {parsed.map((c) => coursePeriods(c).map((p) => (
              <span key={`${c.id}-${p.day}-${p.slot}`} className="cs-review-item">
                {c.name} · 周{WEEKDAY[p.day - 1]} · {SLOT_META[p.slot]?.label} · {p.f}{p.t > p.f ? `-${p.t}` : ''}周{p.type !== 'every' ? `(${INC[p.type]})` : ''} · {c.teacher || '老师未识别'} · {c.room || '地点未识别'}
              </span>
            )))}
          </div>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#6c757d' }}>
          支持连堂块：1-2节 / 3-4节 / 5-6节 / 7-8节 / 晚自习1 / 晚自习2。文本与 Excel 导入支持中英文混合课程名、「老师 / 教师」职称、以及「明理楼A201 / 5-601 / B305 / 实训中心302」等常见地点写法；识别结果会先列出地点，未识别时可手动补充。
        </p>
      </div>
      </MobileSection>

      {/* 手动新增 */}
      <MobileSection mobile={isMobile} host={drawerHost} id="add" panel={drawerPanel}>
      <div className="cs-card">
        <div className="cs-h"><div className="ico"><Plus size={18} /></div><h3>手动添加课程</h3></div>
        {/* ── 课程信息 ── */}
        <div className="cs-row cs-forminfo">
          <div className="cs-field cs-f-full"><label className="cs-l">课程名称</label><input className="cs-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="高等数学" /></div>
          <div className="cs-field"><label className="cs-l">老师（可含职称）</label><input className="cs-input" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} placeholder="龙承星副教授" /></div>
          <div className="cs-field"><label className="cs-l">教室</label><input className="cs-input" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="博学楼501（可留空）" /></div>
          <div className="cs-field"><label className="cs-l">学分（可留空）</label><input className="cs-input" inputMode="decimal" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} placeholder="3" /></div>
          <div className="cs-field cs-f-full" style={{ flex: '1 1 260px', minWidth: 0 }}><label className="cs-l">备注（可留空）</label><input className="cs-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="带计算器 / 每周交作业 / 考试周不排课" /></div>
          <div className="cs-field cs-f-full" style={{ flex: '0 0 auto' }}>
            <label className="cs-l">格子颜色</label>
            <div className="cs-colors">
              <button type="button" className={`cs-color-auto${form.color === null ? ' is-on' : ''}`}
                onClick={() => setForm({ ...form, color: null })}>跟随课名</button>
              {COURSE_THEMES.map((t, i) => (
                <button key={i} type="button" aria-label={`配色 ${i + 1}`}
                  className={`cs-color-dot${form.color === i ? ' is-on' : ''}`}
                  style={{ background: t.bg, borderColor: t.border }}
                  onClick={() => setForm({ ...form, color: i })} />
              ))}
            </div>
          </div>
        </div>

        {/* ── 时段：一门课可以挂多段，一周上两次不用建两条 ── */}
        {form.periods.map((p, pi) => (
          <div className="cs-period" key={`p${pi}`}>
            <div className="cs-period-head">
              <b>时段 {pi + 1}</b>
              <button type="button" className="cs-btn" onClick={() => setForm((f) => {
                const list = [...f.periods];
                list.splice(pi + 1, 0, { ...p });
                return { ...f, periods: list };
              })}>复制</button>
              {form.periods.length > 1 && (
                <button type="button" className="cs-btn danger" onClick={() => setForm((f) => ({ ...f, periods: f.periods.filter((_, i) => i !== pi) }))}>删除</button>
              )}
            </div>
            <div className="cs-row">
              <div className="cs-field"><label className="cs-l">星期</label>
                <select className="cs-input" value={p.day} onChange={(e) => setPeriod(pi, { day: +e.target.value })}>
                  {WEEKDAY.map((w, i) => <option key={w} value={i + 1}>周{w}</option>)}
                </select></div>
              <div className="cs-field"><label className="cs-l">节次（连堂块）</label>
                <select className="cs-input" value={p.slot} onChange={(e) => setPeriod(pi, { slot: e.target.value })}>
                  {DEFAULT_SLOTS.map((s) => <option key={s.key} value={s.key}>{timeSlots[s.key].label}（{timeSlots[s.key].time}）{s.night ? '晚自习' : ''}</option>)}
                </select></div>
              <div className="cs-field"><label className="cs-l">周次</label>
                <div className="cs-row">
                  <input type="number" className="cs-input" style={{ width: 64 }} value={p.f} onChange={(e) => setPeriod(pi, { f: Math.max(1, +e.target.value || 1) })} />周~
                  <input type="number" className="cs-input" style={{ width: 64 }} value={p.t} onChange={(e) => setPeriod(pi, { t: Math.max(1, +e.target.value || 1) })} />周
                </div></div>
              <div className="cs-field"><label className="cs-l">单双周</label>
                <select className="cs-input" value={p.type} onChange={(e) => setPeriod(pi, { type: e.target.value })}>
                  <option value="every">每周</option><option value="odd">单周</option><option value="even">双周</option>
                </select></div>
              <div className="cs-field" style={{ flexBasis: '100%' }}>
                <label className="cs-l" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={p.customOn} onChange={(e) => setPeriod(pi, { customOn: e.target.checked })} />
                  这一段用自定义时间（默认跟随上方「时间设置」）
                </label>
                {p.customOn && (
                  <div className="cs-row" style={{ alignItems: 'center' }}>
                    <input type="time" className="cs-input" style={{ width: 132 }} value={p.customStart} onChange={(e) => setPeriod(pi, { customStart: e.target.value })} />
                    <span>~</span>
                    <input type="time" className="cs-input" style={{ width: 132 }} value={p.customEnd} onChange={(e) => setPeriod(pi, { customEnd: e.target.value })} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="cs-row" style={{ marginTop: 10 }}>
          <button type="button" className="cs-btn" onClick={() => setForm((f) => ({ ...f, periods: [...f.periods, newPeriod()] }))}><Plus size={14} />添加时段</button>
          <button className="cs-btn primary" onClick={addOne}><Plus size={14} />添加课程</button>
        </div>
      </div>
      </MobileSection>

      {toast && <div className="cs-toast">{toast}</div>}
    </div>
  );
}

/* ============ iOS 风格滚轮时间选择器（小时 / 每 5 分钟） ============
   mobile 由外层 matchMedia 开关传入：手机上每格撑到 44px 拇指下限
   （列高 220 / 上下留白 88 = (220-44)/2，与 CSS 里的 @media 规则一一对应）；
   桌面端 mobile=false → ITEM/PAD 与改动前完全一致。 */
function TimeWheel({ value, onDone, mobile = false }) {
  const [val, setVal] = useState(value);
  const valRef = useRef(value);
  const hRef = useRef(null);
  const mRef = useRef(null);
  const prevRef = useRef(null);
  const rafRef = useRef(0);
  const commitRef = useRef(0);
  const wheelRef = useRef({ h: -1, m: -1, t: 0 });
  const ITEM = mobile ? 44 : 36;
  const PAD = mobile ? 88 : 72;
  const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  /* 距离用序号直接算，不读 offsetTop —— 原实现每次滚动读 24 次布局属性（强制重排），是卡顿主因 */
  const paint = (col) => {
    if (!col) return;
    const items = col.children;
    const center = col.scrollTop + col.clientHeight / 2;
    for (let i = 0; i < items.length; i++) {
      const el = items[i];
      const d = Math.abs((PAD + i * ITEM + ITEM / 2 - center) / ITEM);
      el.style.transform = `scale(${Math.max(0.78, 1 - d * 0.1)})`;
      el.style.opacity = String(Math.max(0.25, 1 - d * 0.34));
      el.classList.toggle('sel', d < 0.45);
    }
  };

  /* 滚动中直接改文本节点，不触发 React 重渲染；停手 120ms 后再同步一次 state */
  const syncValue = (col, isHour) => {
    const list = isHour ? HOURS : MINS;
    const idx = Math.min(list.length - 1, Math.max(0, Math.round(col.scrollTop / ITEM)));
    const v = list[idx];
    if (v == null) return;
    valRef.current = isHour ? `${v}:${valRef.current.slice(3, 5)}` : `${valRef.current.slice(0, 2)}:${v}`;
    if (prevRef.current) prevRef.current.textContent = valRef.current;
    clearTimeout(commitRef.current);
    commitRef.current = setTimeout(() => setVal(valRef.current), 120);
  };

  const handleScroll = (col, isHour, key) => {
    const target = wheelRef.current[key];
    if (target >= 0 && Math.abs(col.scrollTop - target * ITEM) < 2) wheelRef.current[key] = -1;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      paint(col);
      syncValue(col, isHour);
    });
  };

  const goTo = (col, key, idx, listLen) => {
    const i = Math.min(listLen - 1, Math.max(0, idx));
    wheelRef.current[key] = i;
    col.scrollTo({ top: i * ITEM, behavior: 'smooth' });
  };

  /* 鼠标滚轮：一格精确走一项。原生滚动叠加 mandatory 吸附会吃掉小幅滚动，手感发滞 */
  useEffect(() => {
    const bind = (col, key, listLen) => {
      if (!col) return () => {};
      const onWheel = (e) => {
        e.preventDefault();
        const now = Date.now();
        if (now - wheelRef.current.t < 45) return;
        wheelRef.current.t = now;
        const base = wheelRef.current[key] >= 0 ? wheelRef.current[key] : Math.round(col.scrollTop / ITEM);
        goTo(col, key, base + (e.deltaY > 0 ? 1 : -1), listLen);
      };
      col.addEventListener('wheel', onWheel, { passive: false });
      return () => col.removeEventListener('wheel', onWheel);
    };
    const unH = bind(hRef.current, 'h', HOURS.length);
    const unM = bind(mRef.current, 'm', MINS.length);
    return () => { unH(); unM(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hh = Math.min(Math.max(parseInt(value.slice(0, 2), 10) || 0, 0), 23);
    const mm = Math.min(Math.round((parseInt(value.slice(3, 5), 10) || 0) / 5), 11);
    if (hRef.current) hRef.current.scrollTop = hh * ITEM;
    if (mRef.current) mRef.current.scrollTop = mm * ITEM;
    paint(hRef.current);
    paint(mRef.current);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(commitRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tp-pop">
      <div className="tp-pop-head">
        <span className="tp-pop-title">选择时间</span>
        <button type="button" className="tp-pop-done" onClick={() => onDone(valRef.current)}>完成</button>
      </div>
      <div className="tp-wheels">
        <div className="tp-col" ref={hRef} onScroll={(e) => handleScroll(e.currentTarget, true, 'h')}>
          {HOURS.map((h, i) => <div key={h} className="tp-item" onClick={() => goTo(hRef.current, 'h', i, HOURS.length)}>{h}</div>)}
        </div>
        <div className="tp-sep">:</div>
        <div className="tp-col" ref={mRef} onScroll={(e) => handleScroll(e.currentTarget, false, 'm')}>
          {MINS.map((m, i) => <div key={m} className="tp-item" onClick={() => goTo(mRef.current, 'm', i, MINS.length)}>{m}</div>)}
        </div>
        <div className="tp-mask tp-mask-top" />
        <div className="tp-mask tp-mask-bottom" />
      </div>
      <div className="tp-preview" ref={prevRef}>{val}</div>
    </div>
  );
}
