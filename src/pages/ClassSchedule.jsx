import React, { useState, useEffect, useMemo, useRef } from 'react';
/* Voyra-schedule 独立仓库 · 同步链路验证标记 v1 */
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

export default function ClassSchedule({ stats = null, active = true }) {
  const { guard } = useAuth();
  const [courses, setCourses] = useState([]);
  const [settings, setSettings] = useState({ startDate: '', overrideWeek: null, timeSlots: null });
  const [showSettings, setShowSettings] = useState(false);
  const [showTimeSettings, setShowTimeSettings] = useState(false);
  const [timeEdit, setTimeEdit] = useState(null); // { key, side: 's'|'e' } 正在滚动编辑的时段
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
      if (raw) {
        const savedCourses = (raw.courses || []).map(normalizeCourse);
        const savedSettings = raw.settings || { startDate: '', overrideWeek: null, timeSlots: null };
        setCourses(savedCourses);
        setSettings(savedSettings);
        localStorage.setItem(LS_READ(), JSON.stringify({ courses: savedCourses, settings: savedSettings }));
      }
    } catch { /* ignore */ }
  }, []);

  const persist = (nextCourses, nextSettings) => {
    if (!guard()) return;
    const c = (nextCourses ?? courses).map(normalizeCourse);
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
  const weekendEmpty = useMemo(() => !weekCourses.some((c) => c.day === 6 || c.day === 7), [weekCourses]);
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
        .cs-grid { overflow-x:auto; scroll-padding-left:88px; }
        .cs-grid table { min-width:680px;width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed; }
        .cs-grid th,.cs-grid td { border-bottom:1px solid rgba(20,24,33,.075);border-right:1px solid rgba(20,24,33,.075); }
        .cs-grid thead tr:first-child th { border-top:1px solid rgba(20,24,33,.075); }
        .cs-grid tr th:first-child,.cs-grid tr td:first-child { border-left:1px solid rgba(20,24,33,.075); }
        .cs-grid tbody td { height:var(--cs-row-h,112px);vertical-align:top;padding:6px; }
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
        @media (max-width:640px) {
          .cs-card { padding:14px; }
          .cs-grid table { min-width:640px; }
          .cs-grid tbody td { padding:4px;height:var(--cs-row-h,104px); }
          .cs-cell { padding:8px;border-radius:8px; }
          .cs-cell .n { font-size:12.5px; }
          .cs-cell .r,.cs-cell .t { font-size:10px; }
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
        .tp-col { position:relative;height:180px;box-sizing:border-box;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;-ms-overflow-style:none;padding:72px 0; }
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
            <div className="cs-row" style={{ alignItems: 'flex-start' }}>
              {DEFAULT_SLOTS.map((s) => {
                const [st, en] = (timeSlots[s.key].time || '08:00-09:45').split('-');
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
            <colgroup>
              <col className="cs-col-period" />
              {WEEKDAY.map((w, i) => (
                <col key={w} className={`cs-col-day${weekendEmpty && i >= 5 ? ' compact' : ''}`} />
              ))}
            </colgroup>
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
                      const theme = courseTheme(c.name);
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
                            title={c.name}
                          >
                            <div className="n">{c.name}</div>
                            <div className="r"><MapPin size={10} strokeWidth={2.2} />{c.room || '地点未填'}</div>
                            <div className="t">{c.teacher || '老师未填'}</div>
                            {c.type !== 'every' && <div className="w">{INC[c.type]}</div>}
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
                {c.name} · 周{WEEKDAY[c.day - 1]} · {SLOT_META[c.slot]?.label} · {c.f}{c.t > c.f ? `-${c.t}` : ''}周{c.type !== 'every' ? `(${INC[c.type]})` : ''} · {c.teacher || '老师未识别'} · {c.room || '地点未识别'}
              </span>
            ))}
          </div>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#6c757d' }}>
          支持连堂块：1-2节 / 3-4节 / 5-6节 / 7-8节 / 晚自习1 / 晚自习2。文本与 Excel 导入支持中英文混合课程名、「老师 / 教师」职称、以及「明理楼A201 / 5-601 / B305 / 实训中心302」等常见地点写法；识别结果会先列出地点，未识别时可手动补充。
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

/* ============ iOS 风格滚轮时间选择器（小时 / 每 5 分钟） ============ */
function TimeWheel({ value, onDone }) {
  const [val, setVal] = useState(value);
  const valRef = useRef(value);
  const hRef = useRef(null);
  const mRef = useRef(null);
  const ITEM = 36;
  const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const MINS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  const update = (v) => { valRef.current = v; setVal(v); };

  /* 根据滚动位置给每项做缩放 / 淡出，模拟滚轮柱面效果 */
  const paint = (col) => {
    if (!col) return;
    const items = col.querySelectorAll('.tp-item');
    const center = col.scrollTop + col.clientHeight / 2;
    items.forEach((el) => {
      const d = (el.offsetTop + ITEM / 2 - center) / ITEM;
      const a = Math.abs(d);
      el.style.transform = `scale(${Math.max(0.78, 1 - a * 0.1)})`;
      el.style.opacity = String(Math.max(0.25, 1 - a * 0.34));
      el.classList.toggle('sel', a < 0.45);
    });
  };

  const handleScroll = (col, isHour) => {
    paint(col);
    const idx = Math.round(col.scrollTop / ITEM);
    const v = isHour ? HOURS[idx] : MINS[idx];
    if (v == null) return;
    update(isHour ? `${v}:${valRef.current.slice(3, 5)}` : `${valRef.current.slice(0, 2)}:${v}`);
  };

  const jumpTo = (col, isHour, idx) => {
    col.scrollTo({ top: idx * ITEM, behavior: 'auto' });
    handleScroll(col, isHour);
  };

  useEffect(() => {
    const hh = Math.min(Math.max(parseInt(value.slice(0, 2), 10) || 0, 0), 23);
    const mm = Math.min(Math.round((parseInt(value.slice(3, 5), 10) || 0) / 5), 11);
    if (hRef.current) hRef.current.scrollTop = hh * ITEM;
    if (mRef.current) mRef.current.scrollTop = mm * ITEM;
    paint(hRef.current);
    paint(mRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tp-pop">
      <div className="tp-pop-head">
        <span className="tp-pop-title">选择时间</span>
        <button type="button" className="tp-pop-done" onClick={() => onDone(val)}>完成</button>
      </div>
      <div className="tp-wheels">
        <div className="tp-col" ref={hRef} onScroll={(e) => handleScroll(e.currentTarget, true)}>
          {HOURS.map((h, i) => <div key={h} className="tp-item" onClick={() => jumpTo(hRef.current, true, i)}>{h}</div>)}
        </div>
        <div className="tp-sep">:</div>
        <div className="tp-col" ref={mRef} onScroll={(e) => handleScroll(e.currentTarget, false)}>
          {MINS.map((m, i) => <div key={m} className="tp-item" onClick={() => jumpTo(mRef.current, false, i)}>{m}</div>)}
        </div>
        <div className="tp-mask tp-mask-top" />
        <div className="tp-mask tp-mask-bottom" />
      </div>
      <div className="tp-preview">{val}</div>
    </div>
  );
}
