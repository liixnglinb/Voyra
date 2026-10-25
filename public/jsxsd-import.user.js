// ==UserScript==
// @name         Voyra 教务课表导入
// @namespace    https://lxlrwxs.top/
// @version      3.0.0
// @description  湖南人文科技学院：内网优先、外网回退、登录后逐周识别，返回 Voyra 核对保存。不读取账号密码。
// @match        https://lxlrwxs.top/*
// @match        https://voyra-overseas.edgeone.dev/*
// @match        http://localhost/*
// @match        http://127.0.0.1/*
// @match        http://10.1.1.149/*
// @match        https://10.1.1.149/*
// @match        http://vpn.huhst.edu.cn/*
// @match        https://vpn.huhst.edu.cn/*
// @connect      10.1.1.149
// @connect      vpn.huhst.edu.cn
// @connect      *.huhst.edu.cn
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        GM_openInTab
// @run-at       document-idle
// @updateURL    https://lxlrwxs.top/jsxsd-import.user.js
// @downloadURL  https://lxlrwxs.top/jsxsd-import.user.js
// ==/UserScript==
(() => {
  // src/lib/education-import.js
  function htmlTimetableRows(html, doc = document) {
    var _a;
    const template = doc.createElement("template");
    template.innerHTML = String(html || "");
    const tables = [...template.content.querySelectorAll("table")];
    const table = tables.sort((a, b) => (b.textContent.match(/(?:周|星期)[一二三四五六日天]/g) || []).length - (a.textContent.match(/(?:周|星期)[一二三四五六日天]/g) || []).length)[0];
    if (!table) return [];
    const rows = [];
    for (const [ri, tr] of [...table.rows].entries()) {
      rows[ri] || (rows[ri] = []);
      let ci = 0;
      for (const cell of tr.cells) {
        while (rows[ri][ci] !== void 0) ci++;
        const clone = cell.cloneNode(true);
        clone.querySelectorAll('script,style,img,iframe,[hidden],[style*="display: none"],[style*="display:none"]').forEach((el) => el.remove());
        clone.querySelectorAll("hr").forEach((el) => el.replaceWith(doc.createTextNode("\n\n")));
        clone.querySelectorAll("font[title]").forEach((el) => {
          if (/教师|老师/.test(el.title)) el.prepend(doc.createTextNode("\u6559\u5E08\uFF1A"));
          else if (/教室|地点/.test(el.title)) el.prepend(doc.createTextNode("\u6559\u5BA4\uFF1A"));
        });
        clone.querySelectorAll("br").forEach((el) => el.replaceWith(doc.createTextNode("\n")));
        clone.querySelectorAll("div,p,li").forEach((el) => el.append(doc.createTextNode("\n")));
        const value = clone.textContent.replace(/\u00a0/g, " ").trim();
        for (let dr = 0; dr < Math.min(30, cell.rowSpan || 1); dr++) {
          rows[_a = ri + dr] || (rows[_a] = []);
          for (let dc = 0; dc < Math.min(20, cell.colSpan || 1); dc++) rows[ri + dr][ci + dc] = value;
        }
        ci += cell.colSpan || 1;
      }
    }
    return rows.map((row) => Array.from({ length: row.length }, (_, i) => row[i] || ""));
  }
  var CN = { \u4E00: 1, \u4E8C: 2, \u4E09: 3, \u56DB: 4, \u4E94: 5, \u516D: 6, \u4E03: 7, \u516B: 8, \u4E5D: 9, \u5341: 10, \u65E5: 7, \u5929: 7 };
  var slotByNumber = (n) => n <= 2 ? "1-2" : n <= 4 ? "3-4" : n <= 6 ? "5-6" : n <= 8 ? "7-8" : n <= 10 ? "\u665A\u81EA\u4E601" : "\u665A\u81EA\u4E602";
  function educationSlot(text) {
    const value = String(text || "").replace(/\d{1,2}[:：]\d{2}(?:\s*[-—~至]\s*\d{1,2}[:：]\d{2})?/g, "").trim();
    if (/晚/.test(value)) return /2|二/.test(value) ? "\u665A\u81EA\u4E602" : "\u665A\u81EA\u4E601";
    const chinese = value.match(/第([一二三四五六])大节/);
    if (chinese) return slotByNumber(CN[chinese[1]] * 2);
    const period = value.match(/(?:第)?\s*(\d{1,2})(?:\s*[-—~至,，、]\s*\d{1,2})?\s*(?:节|$|[)）])/);
    return period && Number(period[1]) >= 1 && Number(period[1]) <= 12 ? slotByNumber(Number(period[1])) : null;
  }
  function weekPeriods(text, { week, requireWeeks = false } = {}) {
    if (week) return [{ f: week, t: week, type: "every" }];
    const value = String(text || "").replace(/\[\s*周\s*\]|\(\s*\[?周\]?\s*\)/g, "\u5468");
    const type = /[（(\[]\s*单(?:周)?\s*[)）\]]|单周/.test(value) ? "odd" : /[（(\[]\s*双(?:周)?\s*[)）\]]|双周/.test(value) ? "even" : "every";
    const group = value.match(/(?:第)?\s*(\d{1,2}(?:\s*[-—–~至到,，、]\s*\d{1,2})*)\s*周/);
    if (!group) {
      if (requireWeeks) throw Error("\u90E8\u5206\u8BFE\u7A0B\u6CA1\u6709\u5468\u6B21\uFF0C\u8BF7\u5207\u6362\u5230\u5B66\u671F\u8BFE\u8868\uFF0C\u6216\u9009\u62E9\u5177\u4F53\u5468\u6B21\u540E\u91CD\u8BD5\u3002");
      return [{ f: 1, t: 16, type }];
    }
    const result = [];
    for (const part of group[1].split(/[,，、]/)) {
      const [f, t = f] = part.split(/[-—–~至到]/).map((v) => Number(v.trim()));
      if (f >= 1 && t <= 20 && f <= t) result.push({ f, t, type });
    }
    if (!result.length && requireWeeks) throw Error("\u8BFE\u7A0B\u5468\u6B21\u8D85\u51FA 1\u201320 \u5468\uFF0C\u65E0\u6CD5\u5B8C\u6574\u5BFC\u5165\u3002");
    return result.length ? result : [{ f: 1, t: 16, type }];
  }
  function parseEducationRows(rows, options = {}) {
    let header = -1, days = [];
    for (let i = 0; i < rows.length; i++) {
      const mapped = rows[i].map((cell, col) => {
        const day = String(cell).trim().match(/^(?:星期|周)\s*([一二三四五六日天])(?:\s|$)/);
        return day ? { col, day: CN[day[1]] } : null;
      }).filter(Boolean);
      if (mapped.length >= 3) {
        header = i;
        days = mapped;
        break;
      }
    }
    if (header < 0) return [];
    const courses = [];
    const seen = /* @__PURE__ */ new Set();
    for (let i = header + 1; i < rows.length; i++) {
      const row = rows[i], slot = row.slice(0, days[0].col).map(educationSlot).find(Boolean);
      if (!slot) continue;
      for (const { col, day } of days) {
        const cell = String(row[col] || "").trim();
        if (!cell || /^(?:无|空|休息|午休|—|-)$/.test(cell)) continue;
        const blocks = cell.split(/\n\s*\n+/).filter(Boolean);
        for (const block of blocks) {
          const parts = block.replace(/<br\s*\/?>/gi, "\n").split(/\n|[；;]/).map((v) => v.trim()).filter(Boolean);
          const name = parts.find((v) => !/^\d{1,2}[:：]/.test(v) && !/^\d+\s*[-—~,，至]\s*\d+\s*周/.test(v));
          if (!name || /^(?:星期|周)[一二三四五六日天]/.test(name)) continue;
          let teacher = "", room = "";
          const note = [];
          for (const item of parts.slice(parts.indexOf(name) + 1)) {
            if (/\d\s*(?:周|\(\[?周|\[周)/.test(item) || /\d\s*[-—~至]\s*\d+.*周/.test(item)) continue;
            if (!teacher && /^(?:教师|老师|授课教师)[:：]/.test(item)) {
              teacher = item.replace(/^(?:教师|老师|授课教师)[:：]\s*/, "");
              continue;
            }
            if (!room && (/^(?:教室|地点|上课地点)[:：]/.test(item) || /楼|教室|体育馆|操场|球场|[A-Z]\d{3}|^\d+-\d{3}|^[\u4e00-\u9fa5]{1,6}-\d{3}/.test(item))) {
              room = item.replace(/^(?:教室|地点|上课地点)[:：]\s*/, "");
              continue;
            }
            if (!teacher && (/老师|教授|讲师|助教/.test(item) || /^[\u4e00-\u9fa5·]{2,5}$/.test(item))) {
              teacher = item;
              continue;
            }
            note.push(item);
          }
          const periods = weekPeriods(block, options).map((weeks) => ({ day, slot, ...weeks }));
          const signature = JSON.stringify({ name, teacher, room, periods });
          if (seen.has(signature)) continue;
          seen.add(signature);
          courses.push({ id: `edu-${i}-${col}-${courses.length}`, name, teacher, room, note: note.join(" \xB7 "), periods });
        }
      }
    }
    return courses;
  }

  // src/lib/schedule-share.js
  var SCHEDULE_SLOTS = ["1-2", "3-4", "5-6", "7-8", "\u665A\u81EA\u4E601", "\u665A\u81EA\u4E602"];
  var TYPES = ["every", "odd", "even"];
  var stableSchedule = (value) => JSON.stringify(value, (_key, v) => v && typeof v === "object" && !Array.isArray(v) ? Object.keys(v).sort().reduce((out, key) => {
    out[key] = v[key];
    return out;
  }, {}) : v);
  function scheduleHash(value) {
    let n = 2166136261;
    for (const ch of stableSchedule(value)) n = Math.imul(n ^ ch.charCodeAt(0), 16777619);
    return (n >>> 0).toString(36);
  }
  var b64encode = (value) => {
    const bytes = new TextEncoder().encode(value);
    let text = "";
    for (const byte of bytes) text += String.fromCharCode(byte);
    return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  function sharedCourseShape(course) {
    const periods = Array.isArray(course.periods) && course.periods.length ? course.periods : [course];
    return {
      name: String(course.name || "").trim(),
      teacher: String(course.teacher || ""),
      room: String(course.room || ""),
      credit: String(course.credit || ""),
      note: String(course.note || ""),
      ...Number.isInteger(course.color) ? { color: course.color } : {},
      periods: periods.map((p) => ({
        day: Number(p.day),
        slot: p.slot,
        f: Number(p.f) || 1,
        t: Number(p.t) || 16,
        type: TYPES.includes(p.type) ? p.type : "every",
        ...p.customTime?.start && p.customTime?.end ? { customTime: { start: p.customTime.start, end: p.customTime.end } } : {}
      }))
    };
  }
  function validateSharedCourses(courses) {
    if (!Array.isArray(courses) || !courses.length || courses.length > 300) throw Error("\u5206\u4EAB\u5185\u5BB9\u6CA1\u6709\u6709\u6548\u8BFE\u7A0B\uFF0C\u6216\u8D85\u8FC7 300 \u95E8\u8BFE\u7A0B\u3002");
    return courses.map((course, i) => {
      if (!course || typeof course !== "object") throw Error("\u5206\u4EAB\u5185\u5BB9\u683C\u5F0F\u4E0D\u6B63\u786E\u3002");
      const row = sharedCourseShape(course);
      if (!row.name || row.name.length > 200 || !row.periods.length || row.periods.length > 100) throw Error("\u5206\u4EAB\u4E2D\u6709\u65E0\u6548\u7684\u8BFE\u7A0B\u540D\u79F0\u6216\u4E0A\u8BFE\u65F6\u6BB5\u3002");
      for (const p of row.periods) {
        if (!Number.isInteger(p.day) || p.day < 1 || p.day > 7 || !SCHEDULE_SLOTS.includes(p.slot) || !Number.isInteger(p.f) || !Number.isInteger(p.t) || p.f < 1 || p.t > 20 || p.f > p.t) throw Error("\u5206\u4EAB\u4E2D\u6709\u65E0\u6548\u7684\u661F\u671F\u3001\u8282\u6B21\u6216\u5468\u6B21\u3002");
        if (p.customTime && (!/^\d{2}:\d{2}$/.test(p.customTime.start) || !/^\d{2}:\d{2}$/.test(p.customTime.end) || p.customTime.start >= p.customTime.end)) throw Error("\u5206\u4EAB\u4E2D\u6709\u65E0\u6548\u7684\u81EA\u5B9A\u4E49\u65F6\u95F4\u3002");
      }
      return { ...row, id: `shared-${scheduleHash(row)}-${i}` };
    });
  }
  function encodeScheduleShare(courses, settings, withDetail = true) {
    const rows = validateSharedCourses(courses).map(({ id, ...row }) => withDetail ? row : { ...row, teacher: "", room: "" });
    const data = { version: 3, courses: rows, settings: { startDate: settings?.startDate || "", overrideWeek: settings?.overrideWeek ?? null, timeSlots: settings?.timeSlots || null } };
    return "VOYRA3:" + b64encode(JSON.stringify(data));
  }

  // src/lib/education-automation.js
  var HUHST = { id: "huhst", name: "\u6E56\u5357\u4EBA\u6587\u79D1\u6280\u5B66\u9662", intranet: "http://10.1.1.149/jsxsd/", vpn: "http://vpn.huhst.edu.cn:9900/" };
  var EDU_VERSION = "3.0.0";
  var EDU_TTL = 60 * 60 * 1e3;
  var validJobId = (id) => typeof id === "string" && /^[a-f0-9]{32}$/.test(id);
  var allowedReturnOrigin = (origin) => ["https://lxlrwxs.top", "https://voyra-overseas.edgeone.dev"].includes(origin) || /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin);
  var allowedSchoolURL = (url) => {
    try {
      const u = new URL(url);
      return ["http:", "https:"].includes(u.protocol) && ["10.1.1.149", "vpn.huhst.edu.cn"].includes(u.hostname);
    } catch {
      return false;
    }
  };
  var activeJob = (job) => job && validJobId(job.id) && allowedReturnOrigin(job.returnOrigin) && Date.now() - job.created >= 0 && Date.now() - job.created < EDU_TTL;
  async function chooseEducationNetwork(request, signal) {
    signal?.throwIfAborted();
    try {
      const response = await request(HUHST.intranet, signal);
      signal?.throwIfAborted();
      const school = /湖南人文|教务|强智|jsxsd|jkingo|caslogin/i.test(response.text || "");
      if (response.status >= 200 && response.status < 400 && school && allowedSchoolURL(response.url || HUHST.intranet)) return { network: "campus", url: HUHST.intranet };
    } catch (error) {
      if (signal?.aborted) throw error;
    }
    signal?.throwIfAborted();
    return { network: "vpn", url: HUHST.vpn };
  }
  function mergeEducationWeeks(batches) {
    const map = /* @__PURE__ */ new Map();
    for (const courses of batches) for (const course of courses) {
      const key = JSON.stringify([course.name, course.teacher || "", course.room || "", course.note || ""]);
      if (!map.has(key)) map.set(key, { ...course, periods: [] });
      const target = map.get(key);
      for (const p of course.periods || []) if (!target.periods.some((existing) => JSON.stringify(existing) === JSON.stringify(p))) target.periods.push({ ...p });
    }
    return [...map.values()].map((course, index) => {
      const ordered = course.periods.sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot) || a.f - b.f), periods = [];
      for (const p of ordered) {
        const last = periods.at(-1);
        if (last && last.day === p.day && last.slot === p.slot && last.type === p.type && p.f === last.t + 1) last.t = p.t;
        else periods.push({ ...p });
      }
      return { ...course, id: `edu-auto-${index}`, periods };
    });
  }
  function schoolDocuments(root) {
    const docs = [root];
    for (let depth = 0, offset = 0; depth < 3; depth++) {
      const current = docs.slice(offset);
      offset = docs.length;
      for (const doc of current) for (const frame of doc.querySelectorAll("iframe,frame")) try {
        if (frame.contentDocument && !docs.includes(frame.contentDocument)) docs.push(frame.contentDocument);
      } catch {
      }
    }
    return docs;
  }
  function timetableDocument(doc) {
    for (const table of doc.querySelectorAll("table")) {
      if (table.closest("[data-voyra-helper]")) continue;
      const rows = htmlTimetableRows(table.outerHTML, doc);
      if (rows.some((row) => row.filter((cell) => /^(?:星期|周)\s*[一二三四五六日天](?:\s|$)/.test(cell)).length >= 3) && rows.some((row) => row.slice(0, 3).some((cell) => educationSlot(cell)))) return { doc, table, rows };
    }
    return null;
  }
  function weekNumber(option) {
    const match = option.textContent.trim().match(/^(?:第\s*)?(\d{1,2})\s*(?:周(?:\s|[（(]|$)|$)/);
    return match ? Number(match[1]) : null;
  }
  function educationTimetableLink(docs) {
    for (const doc of docs) for (const node of doc.querySelectorAll("a[href],[data-href],[data-url],[onclick]")) {
      if (node.closest("[data-voyra-helper]") || !/我的课表|个人课表|学期理论课表|课表查询|课程表/.test(node.textContent.trim())) continue;
      const candidates = [node.getAttribute("href"), node.getAttribute("data-href"), node.getAttribute("data-url"), ...[...(node.getAttribute("onclick") || "").matchAll(/['"]([^'"]*(?:xskb|xskbcx|kbxx)[^'"]*)['"]/gi)].map((m) => m[1])];
      for (const value of candidates) try {
        if (!value) continue;
        const url = new URL(value, doc.location.href);
        if (allowedSchoolURL(url.href) && /\/jsxsd\/(?:xskb|kbxx|xskbcx)\//i.test(url.pathname) && !/logout|delete|save|remove/i.test(url.pathname + url.search)) return url.href;
      } catch {
      }
    }
    return null;
  }
  function describeTimetable(doc, url = doc.location?.href) {
    const found = timetableDocument(doc);
    if (!found) return null;
    const selectors = [...doc.querySelectorAll("select")].map((select) => ({ select, weeks: [...select.options].map((option) => ({ week: weekNumber(option), value: option.value })).filter((option) => option.week >= 1 && option.week <= 30) }));
    const control = selectors.find(({ select, weeks: weeks2 }) => weeks2.length >= 2 && (/zc|week|zhou/i.test(select.name) || /周/.test(select.textContent)));
    if (!control) {
      if (selectors.some(({ select }) => /zc|week|zhou/i.test(select.name))) throw Error("\u672A\u80FD\u8BC6\u522B\u5B8C\u6574\u5468\u6B21\u5217\u8868\uFF0C\u8BF7\u5207\u6362\u5230\u5B66\u671F\u8BFE\u8868\u540E\u91CD\u65B0\u68C0\u6D4B\u3002");
      return { ...found, url, weeks: [], semester: semesterLabel(doc) };
    }
    if (control.weeks.some((option) => option.week > 20)) throw Error("\u6559\u52A1\u7CFB\u7EDF\u8D85\u8FC7 20 \u5468\uFF0C\u5F53\u524D\u8BFE\u8868\u6682\u4E0D\u652F\u6301\u5B8C\u6574\u4FDD\u5B58\uFF1B\u8BF7\u5148\u4F7F\u7528 Excel \u5206\u6BB5\u5BFC\u5165\u3002");
    const form = control.select.form;
    if (!form || !control.select.name) throw Error("\u672A\u627E\u5230\u5468\u6B21\u67E5\u8BE2\u8868\u5355\u3002\u8BF7\u9009\u62E9\u300C\u5B66\u671F\u7406\u8BBA\u8BFE\u8868\u300D\u540E\u91CD\u8BD5\uFF0C\u6216\u4F7F\u7528\u624B\u52A8\u5BFC\u5165\u3002");
    const action = new URL(form.getAttribute("action") || url, url);
    if (!allowedSchoolURL(action.href) || action.origin !== new URL(url).origin || !/xskb|xskbcx|kbxx|skb|kb.*cx/i.test(action.pathname)) throw Error("\u672A\u8BC6\u522B\u5230\u5B89\u5168\u7684\u8BFE\u8868\u67E5\u8BE2\u5730\u5740\uFF0C\u8BF7\u6253\u5F00\u300C\u6211\u7684\u8BFE\u8868 / \u5B66\u671F\u7406\u8BBA\u8BFE\u8868\u300D\u3002");
    const params = new URLSearchParams();
    for (const el of form.elements) {
      if (!el.name || el.disabled || /password|file|submit|button|reset/i.test(el.type) || (el.type === "checkbox" || el.type === "radio") && !el.checked) continue;
      if (el.tagName === "SELECT" && el.multiple) {
        for (const option of el.selectedOptions) params.append(el.name, option.value);
      } else params.append(el.name, el.value);
    }
    const weeks = [...new Map(control.weeks.map((option) => [option.week, option])).values()].sort((a, b) => a.week - b.week);
    if (weeks.some((option, index) => option.week !== index + 1)) throw Error("\u5B66\u6821\u5468\u6B21\u5217\u8868\u4E0D\u5B8C\u6574\uFF0C\u5DF2\u505C\u6B62\u8BFB\u53D6\u4EE5\u514D\u6F0F\u8BFE\u3002\u8BF7\u5207\u6362\u5B8C\u6574\u5B66\u671F\u540E\u91CD\u8BD5\u3002");
    return { ...found, url, form: { url: action.href, method: form.method.toUpperCase() === "POST" ? "POST" : "GET", params, weekName: control.select.name }, weeks, semester: semesterLabel(doc) };
  }
  function semesterLabel(doc) {
    const select = [...doc.querySelectorAll("select")].find((el) => /xnxq|semester|term/i.test(el.name));
    return select?.selectedOptions[0]?.textContent.trim().slice(0, 100) || "";
  }
  async function collectEducationTimetable(description, { read, signal, onProgress = () => {
  }, checkpoint = /* @__PURE__ */ new Map() } = {}) {
    signal?.throwIfAborted();
    if (!description.weeks.length) {
      const courses2 = parseEducationRows(description.rows, { requireWeeks: true });
      if (!courses2.length) throw Error("\u5F53\u524D\u8BFE\u8868\u6CA1\u6709\u6709\u6548\u8BFE\u7A0B\uFF0C\u8BF7\u5148\u9009\u62E9\u6B63\u786E\u5B66\u671F\u3002");
      return { courses: mergeEducationWeeks([courses2]), weeks: [], semester: description.semester, mode: "semester" };
    }
    const params = [...description.form.params].filter(([name]) => name !== description.form.weekName && !/csrf|token|viewstate/i.test(name));
    const key = scheduleHash([description.form.url, params, description.semester, description.weeks]);
    if (checkpoint.key !== key) {
      checkpoint.clear();
      checkpoint.key = key;
    }
    const total = description.weeks.length;
    const progress = (week) => ({ done: checkpoint.size, total, week, completed: [...checkpoint.keys()], counts: Object.fromEntries([...checkpoint].map(([w, courses2]) => [w, mergeEducationWeeks([courses2]).length])), courseCount: mergeEducationWeeks([...checkpoint.values()]).length });
    for (const option of description.weeks) {
      signal?.throwIfAborted();
      if (checkpoint.has(option.week)) continue;
      onProgress(progress(option.week));
      const doc = await read(description.form, option, signal);
      signal?.throwIfAborted();
      const found = timetableDocument(doc);
      if (!found && doc.querySelector("input[type=password]")) throw Error("\u5B66\u6821\u767B\u5F55\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u70B9\u300C\u91CD\u65B0\u68C0\u6D4B\u300D\u3002");
      if (!found) throw Error(`\u7B2C ${option.week} \u5468\u672A\u8FD4\u56DE\u5B8C\u6574\u8BFE\u8868\uFF0C\u5DF2\u6682\u505C\u3002\u8BF7\u91CD\u65B0\u68C0\u6D4B\u4EE5\u7EE7\u7EED\uFF1B\u5DF2\u8BFB\u53D6\u7684\u5468\u6B21\u4F1A\u4FDD\u7559\u3002`);
      const echo = [...doc.querySelectorAll("select,input[type=hidden]")].find((el) => el.name === description.form.weekName);
      if (!echo || echo.value !== option.value) throw Error(`\u7B2C ${option.week} \u5468\u7684\u8FD4\u56DE\u9875\u9762\u672A\u786E\u8BA4\u5468\u6B21\uFF0C\u5DF2\u6682\u505C\u4EE5\u514D\u8BEF\u5BFC\u5165\u3002\u53EF\u6539\u7528\u5B66\u671F\u8BFE\u8868\u3002`);
      checkpoint.set(option.week, parseEducationRows(found.rows, { week: option.week }));
      onProgress(progress(option.week));
    }
    const courses = mergeEducationWeeks([...checkpoint.values()]);
    if (!courses.length) throw Error("\u8FD9\u4E9B\u5468\u6B21\u90FD\u6CA1\u6709\u8BFE\u7A0B\uFF0C\u8BF7\u68C0\u67E5\u6240\u9009\u5B66\u671F\u3002");
    return { courses, weeks: description.weeks.map((option) => option.week), semester: description.semester, mode: "weekly" };
  }

  // build-tools/education-helper.entry.js
  function runHelper() {
    const KEY = "voyra.education.job.v2", PAGE = "voyra-edu:request", REPLY = "voyra-edu:reply";
    const get = () => GM_getValue(KEY, null), set = (value) => GM_setValue(KEY, value);
    const isSite = allowedReturnOrigin(location.origin);
    const expired = get();
    if (expired && !activeJob(expired)) set(null);
    const emit = (value) => document.dispatchEvent(new CustomEvent(REPLY, { detail: JSON.stringify(value) }));
    const returnURL = (job) => {
      const url = new URL("/", job.returnOrigin), query = new URLSearchParams(job.returnQuery || "");
      for (const key of ["eo_token", "eo_time"]) if (query.has(key)) url.searchParams.set(key, query.get(key));
      url.hash = "/timetable?tab=courses&eduImport=" + job.id;
      return url.href;
    };
    function request(url, { method = "GET", body, signal, timeout = 1e4 } = {}) {
      return new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(signal.reason);
          return;
        }
        let done = false, abort = () => {
        };
        const end = (fn, value) => {
          if (done) return;
          done = true;
          signal?.removeEventListener("abort", abort);
          fn(value);
        };
        const xhr = GM_xmlhttpRequest({
          method,
          url,
          data: body,
          timeout,
          headers: body ? { "Content-Type": "application/x-www-form-urlencoded" } : {},
          onload: (r) => end(resolve, { status: r.status, text: r.responseText, url: r.finalUrl || url }),
          ontimeout: () => end(reject, Error("\u8FDE\u63A5\u8D85\u65F6")),
          onerror: () => end(reject, Error("\u65E0\u6CD5\u8FDE\u63A5")),
          onabort: () => end(reject, Error("\u5DF2\u505C\u6B62"))
        });
        abort = () => {
          xhr.abort();
          end(reject, signal.reason || Error("\u5DF2\u505C\u6B62"));
        };
        signal?.addEventListener("abort", abort, { once: true });
      });
    }
    function publish(job) {
      if (!activeJob(job) || job.returnOrigin !== location.origin) return;
      emit({ type: "status", id: job.id, status: job.status, network: job.network, progress: job.progress, message: job.message, code: job.code, semester: job.semester, weeks: job.weeks });
    }
    if (isSite) {
      let controller;
      GM_addValueChangeListener(KEY, (_key, _old, value) => publish(value));
      document.addEventListener(PAGE, async (event) => {
        if (typeof event.detail !== "string" || event.detail.length > 1e3) return;
        let command;
        try {
          command = JSON.parse(event.detail);
        } catch {
          return;
        }
        if (command.type === "ping") {
          emit({ type: "ready", version: EDU_VERSION });
          return;
        }
        if (!validJobId(command.id)) return;
        const current = get();
        if (command.type === "status") {
          if (current?.id === command.id) publish(current);
          return;
        }
        if (command.type === "cancel" || command.type === "ack") {
          if (current?.id === command.id && current.returnOrigin === location.origin) {
            controller?.abort();
            set({ ...current, status: command.type === "ack" ? "saved" : "cancelled", code: void 0, checkpoint: void 0 });
            publish(get());
          }
          return;
        }
        if (command.type !== "start") return;
        if (activeJob(current) && !["cancelled", "saved", "error", "ready"].includes(current.status)) {
          emit({ type: "status", id: command.id, status: "error", message: "\u5DF2\u6709\u5BFC\u5165\u4EFB\u52A1\uFF0C\u8BF7\u5148\u505C\u6B62\u540E\u518D\u5F00\u59CB\u3002" });
          return;
        }
        controller?.abort();
        controller = new AbortController();
        const probeController = controller;
        const access = new URLSearchParams(location.search), returnQuery = new URLSearchParams();
        for (const key of ["eo_token", "eo_time"]) if (access.has(key)) returnQuery.set(key, access.get(key));
        const job = { id: command.id, created: Date.now(), returnOrigin: location.origin, returnQuery: returnQuery.toString(), autoSave: command.autoSave === true, status: "probing", message: "\u6B63\u5728\u68C0\u6D4B\u6821\u56ED\u5185\u7F51\u2026" };
        set(job);
        publish(job);
        try {
          const route = await chooseEducationNetwork((url, signal) => request(url, { signal, timeout: 5500 }), probeController.signal);
          if (get()?.id !== job.id || get()?.status !== "probing") return;
          const next = { ...job, ...route, status: "waiting", message: route.network === "campus" ? "\u6821\u56ED\u5185\u7F51\u53EF\u7528\uFF0C\u8BF7\u5728\u5B66\u6821\u9875\u9762\u767B\u5F55\u3002" : "\u5185\u7F51\u672A\u8FDE\u901A\uFF0C\u5DF2\u5207\u6362\u5B66\u6821\u5916\u7F51\u5165\u53E3\u3002\u8BF7\u5148\u767B\u5F55 VPN\uFF0C\u518D\u8FDB\u5165\u6559\u52A1\u7CFB\u7EDF\u3002" };
          set(next);
          publish(next);
          GM_openInTab(route.url, { active: true, insert: true, setParent: true });
        } catch (error) {
          if (!probeController.signal.aborted && get()?.id === job.id) {
            const value = { ...job, status: "error", message: error.message };
            set(value);
            publish(value);
          }
        }
      });
      emit({ type: "ready", version: EDU_VERSION });
    } else if (allowedSchoolURL(location.href)) {
      let render = function(job) {
        if (!job || job.id !== id || !activeJob(job)) {
          stop();
          host.remove();
          return;
        }
        if (["cancelled", "saved"].includes(job.status)) {
          stop();
          title.textContent = job.status === "saved" ? "\u8BFE\u8868\u5DF2\u81EA\u52A8\u4FDD\u5B58" : "\u5DF2\u505C\u6B62\u5BFC\u5165";
          message.textContent = job.status === "saved" ? "\u5DF2\u5408\u5E76\u5230\u53D1\u8D77\u5BFC\u5165\u7684\u8D26\u53F7\uFF0C\u539F\u6709\u8BFE\u7A0B\u4FDD\u7559\u3002\u4F60\u53EF\u4EE5\u5173\u95ED\u5B66\u6821\u9875\u9762\u3002" : "\u4F60\u53EF\u4EE5\u5173\u95ED\u6B64\u9875\u9762\u3002";
          progress.hidden = true;
          back.hidden = true;
          return;
        }
        title.textContent = job.status === "ready" ? "\u8BFE\u8868\u5DF2\u8BC6\u522B\uFF0C\u7B49\u5F85\u6838\u5BF9" : job.status === "scanning" ? "\u6B63\u5728\u8BFB\u53D6\u5404\u5468\u8BFE\u8868" : job.status === "error" ? "\u8BC6\u522B\u5DF2\u6682\u505C" : "\u8BF7\u5728\u5B66\u6821\u9875\u9762\u5B8C\u6210\u767B\u5F55";
        message.textContent = job.message || "";
        progress.hidden = !job.progress;
        if (job.progress) {
          progress.max = job.progress.total;
          progress.value = job.progress.done;
        }
        back.hidden = job.status !== "ready";
        root.querySelector(".retry").disabled = job.status === "scanning";
        let board = root.querySelector(".weeks");
        if (!board) {
          board = document.createElement("div");
          board.className = "weeks";
          board.style.cssText = "display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;margin:7px 0 12px;font-size:10px";
          progress.after(board);
        }
        board.replaceChildren();
        if (job.progress) for (let week = 1; week <= job.progress.total; week++) {
          const item = document.createElement("span"), done = job.progress.completed?.includes(week);
          item.textContent = `${week}\u5468 ${done ? "\u2713" : week === job.progress.week ? job.status === "error" ? "!" : "\u2026" : "\xB7"}`;
          item.style.cssText = `padding:5px 2px;text-align:center;border-radius:6px;background:${done ? "#edf4e5" : week === job.progress.week ? "#fbefd1" : "#f1f3ec"};color:${done ? "#587340" : "#8b865f"}`;
          board.append(item);
        }
      }, update = function(patch) {
        const job = get();
        if (job?.id !== id || ["cancelled", "saved"].includes(job.status) || !activeJob(job)) return;
        set({ ...job, ...patch });
        render(get());
      }, stop = function() {
        paused = true;
        controller?.abort();
        clearInterval(timer);
      };
      try {
        if (window.parent !== window.self && allowedSchoolURL(window.parent.location.href) && window.parent.location.origin === location.origin) return;
      } catch {
      }
      let controller = null, checking = false, paused = false, lastSignature = "", checkpoint = /* @__PURE__ */ new Map(), timer, navTried = false, wasLogin = false;
      const scanId = [...crypto.getRandomValues(new Uint8Array(12))].map((v) => v.toString(16).padStart(2, "0")).join("");
      let initial = get();
      if (!activeJob(initial) || !["waiting", "scanning", "error", "ready"].includes(initial.status)) return;
      const id = initial.id;
      if (initial.checkpoint?.entries) {
        try {
          checkpoint = new Map(initial.checkpoint.entries);
          checkpoint.key = initial.checkpoint.key;
        } catch {
          checkpoint = /* @__PURE__ */ new Map();
        }
      }
      const host = document.createElement("div");
      host.dataset.voyraHelper = "";
      host.style.cssText = "position:fixed;right:12px;bottom:max(12px,env(safe-area-inset-bottom));width:calc(100vw - 24px);max-width:340px;z-index:2147483647";
      const root = host.attachShadow({ mode: "open" });
      root.innerHTML = `<style>:host{font:14px/1.65 system-ui,-apple-system,"Microsoft YaHei",sans-serif;color:#364735}*{box-sizing:border-box}section{background:#fffef8;border:1px solid #dedfc8;border-radius:18px;box-shadow:0 14px 50px #18250f40;overflow:hidden}header{display:flex;gap:8px;align-items:center;background:#f4f1df;padding:10px 14px}header b{flex:1;font-size:13px}button,a{font:inherit;cursor:pointer;min-height:44px;border-radius:10px;padding:8px 12px;text-align:center}header button{border:0;background:transparent;min-width:44px;font-size:18px;padding:4px}.body{padding:14px}h3{font-size:16px;margin:0 0 7px}p{font-size:12px;margin:0 0 10px;color:#78836b;overflow-wrap:anywhere}progress{width:100%;height:7px;accent-color:#9b8132;margin:7px 0 12px}.actions{display:flex;gap:8px}.actions button,.actions a{flex:1;border:1px solid #e0e2d4;background:white;color:#6b775e;font-size:12px}.actions .primary{background:#9b8132;border-color:#9b8132;color:white}footer{font-size:10px;color:#929a83;margin-top:11px}.collapsed .body{display:none}button:focus-visible,a:focus-visible{outline:2px solid #477d63;outline-offset:2px}@media(prefers-reduced-motion:no-preference){section{animation:enter .2s ease-out}@keyframes enter{from{opacity:0;transform:translateY(8px)}}}</style><section><header><b>Voyra \xB7 \u6559\u52A1\u5BFC\u5165\u52A9\u624B</b><button aria-label="\u6536\u8D77\u52A9\u624B" title="\u6536\u8D77\u52A9\u624B">\u2212</button></header><div class="body"><h3></h3><p role="status" aria-live="polite"></p><progress hidden></progress><div class="actions"><button class="retry">\u91CD\u65B0\u68C0\u6D4B</button><button class="primary back" hidden>\u8FD4\u56DE Voyra \u6838\u5BF9</button><button class="stop">\u505C\u6B62</button></div><footer>\u53EA\u8BFB\u53D6\u8BFE\u8868\uFF0C\u4E0D\u8BFB\u53D6\u8D26\u53F7\u5BC6\u7801\u3002\u9009\u597D\u5B66\u671F\u540E\u8BF7\u4FDD\u6301\u6B64\u9875\u6253\u5F00\u3002</footer></div></section>`;
      document.body.append(host);
      const title = root.querySelector("h3"), message = root.querySelector("[role=status]"), progress = root.querySelector("progress"), back = root.querySelector(".back");
      root.querySelector("header button").onclick = (event) => {
        const collapsed = root.querySelector("section").classList.toggle("collapsed");
        event.currentTarget.textContent = collapsed ? "+" : "\u2212";
        event.currentTarget.setAttribute("aria-label", collapsed ? "\u5C55\u5F00\u52A9\u624B" : "\u6536\u8D77\u52A9\u624B");
      };
      root.querySelector(".stop").onclick = () => {
        stop();
        update({ status: "cancelled", code: void 0, checkpoint: void 0 });
      };
      back.onclick = () => {
        const job = get();
        if (activeJob(job) && job.id === id) GM_openInTab(returnURL(job), { active: true, insert: true });
      };
      root.querySelector(".retry").onclick = () => {
        controller?.abort();
        paused = false;
        checking = false;
        lastSignature = "";
        update({ status: "waiting", message: "\u6B63\u5728\u91CD\u65B0\u68C0\u67E5\u9875\u9762\u2026", progress: void 0 });
        check(true);
      };
      GM_addValueChangeListener(KEY, (_key, _old, value) => render(value));
      async function readWeek(form, option, signal) {
        const params = new URLSearchParams(form.params);
        params.set(form.weekName, option.value);
        const url = new URL(form.url);
        let body;
        if (form.method === "GET") for (const [key, value] of params) url.searchParams.set(key, value);
        else body = params.toString();
        const response = await request(url.href, { method: form.method, body, signal, timeout: 15e3 });
        if (response.status !== 200 || !allowedSchoolURL(response.url) || new URL(response.url).origin !== new URL(form.url).origin) throw Error("\u5B66\u6821\u8BFE\u8868\u67E5\u8BE2\u5931\u8D25\u6216\u767B\u5F55\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5\u3002");
        return new DOMParser().parseFromString(response.text, "text/html");
      }
      async function check(force = false) {
        if (paused || checking) return;
        const job = get();
        if (!activeJob(job) || job.id !== id || ["cancelled", "saved", "ready"].includes(job.status)) return;
        if (job.lease && job.lease.owner !== scanId && job.lease.until > Date.now()) return;
        const docs = schoolDocuments(document), login = docs.some((doc) => [...doc.querySelectorAll("input[type=password]")].some((el) => el.getClientRects().length));
        if (login) {
          if (!wasLogin) update({ status: "waiting", message: "\u8BF7\u5B8C\u6210\u5B66\u6821\u767B\u5F55\u4E0E\u9A8C\u8BC1\u7801\u3002\u52A9\u624B\u4F1A\u5728\u767B\u5F55\u540E\u7EE7\u7EED\uFF0C\u7B49\u5F85\u767B\u5F55\u671F\u95F4\u4E0D\u4F1A\u5207\u6362\u5165\u53E3\u3002" });
          wasLogin = true;
          return;
        }
        wasLogin = false;
        let description;
        try {
          for (const doc of docs) {
            description = describeTimetable(doc, doc.location?.href || location.href);
            if (description) break;
          }
        } catch (error) {
          paused = true;
          update({ status: "error", message: error.message });
          return;
        }
        if (!description) {
          if (!navTried) {
            const target = educationTimetableLink(docs);
            if (target) {
              navTried = true;
              update({ status: "waiting", message: "\u5DF2\u767B\u5F55\uFF0C\u6B63\u5728\u8FDB\u5165\u4E2A\u4EBA\u8BFE\u8868\uFF1B\u52A0\u8F7D\u540E\u4F1A\u81EA\u52A8\u8BFB\u53D6\u6240\u6709\u5468\u6B21\u3002" });
              location.assign(target);
              return;
            }
          }
          if (job.status !== "waiting" || !job.message?.includes("\u6211\u7684\u8BFE\u8868")) update({ status: "waiting", message: "\u8BF7\u8FDB\u5165\u300C\u6211\u7684\u8BFE\u8868 / \u5B66\u671F\u7406\u8BBA\u8BFE\u8868\u300D\u5E76\u9009\u62E9\u672C\u5B66\u671F\u3002\u82E5\u8BFE\u8868\u5728\u5D4C\u5165\u9875\u9762\u4E2D\uFF0C\u8BF7\u5728\u65B0\u7A97\u53E3\u6253\u5F00\u8BFE\u8868\uFF1B\u52A9\u624B\u4F1A\u81EA\u52A8\u68C0\u6D4B\u3002" });
          return;
        }
        const signature = JSON.stringify([description.url, description.semester, description.form?.params.toString(), description.rows]);
        if (!force && lastSignature === signature) return;
        lastSignature = signature;
        checking = true;
        const scanController = new AbortController();
        controller = scanController;
        try {
          update({ status: "scanning", lease: { owner: scanId, until: Date.now() + 3e4 }, message: description.semester ? `\u6B63\u5728\u8BC6\u522B ${description.semester}\u2026` : "\u6B63\u5728\u8BFB\u53D6\u6240\u9009\u5B66\u671F\u8BFE\u8868\u2026", code: void 0 });
          await new Promise((resolve) => setTimeout(resolve, 120));
          scanController.signal.throwIfAborted();
          if (get()?.lease?.owner !== scanId) return;
          const result = await collectEducationTimetable(description, {
            read: readWeek,
            signal: scanController.signal,
            checkpoint,
            onProgress: (value) => {
              if (get()?.lease?.owner !== scanId) scanController.abort();
              else update({ status: "scanning", lease: { owner: scanId, until: Date.now() + 3e4 }, checkpoint: { key: checkpoint.key, entries: [...checkpoint] }, progress: value, message: `\u5DF2\u8BFB\u53D6 ${value.done} / ${value.total} \u5468\uFF0C${value.completed.includes(value.week) ? "\u5DF2\u5B8C\u6210" : "\u6B63\u5728\u68C0\u67E5"}\u7B2C ${value.week} \u5468\uFF0C\u8BC6\u522B ${value.courseCount} \u95E8\u8BFE\u7A0B\u3002` });
            }
          });
          scanController.signal.throwIfAborted();
          const code = encodeScheduleShare(result.courses, {}, true);
          if (code.length > 2e5) throw Error("\u8BFE\u8868\u5185\u5BB9\u8FC7\u5927\uFF0C\u8BF7\u4F7F\u7528 Excel \u5BFC\u5165\u3002");
          if (get()?.lease?.owner !== scanId) return;
          update({ status: "ready", lease: void 0, code, semester: result.semester, weeks: result.weeks, message: `${result.semester ? result.semester + "\uFF1A" : ""}\u5DF2\u8BFB\u53D6 ${result.courses.length} \u95E8\u8BFE\u7A0B${result.mode === "weekly" ? "\uFF0C\u5B8C\u6574\u68C0\u67E5 " + result.weeks.length + " \u4E2A\u5468\u6B21" : ""}\u3002${job.autoSave ? "\u5373\u5C06\u8FD4\u56DE Voyra \u81EA\u52A8\u4FDD\u5B58\u3002" : "\u8FD4\u56DE\u6838\u5BF9\u540E\u4FDD\u5B58\u3002"}` });
          if (job.autoSave && !get()?.autoReturned) {
            const current = get();
            set({ ...current, autoReturned: true });
            GM_openInTab(returnURL(current), { active: true, insert: true });
          }
        } catch (error) {
          if (!scanController.signal.aborted) {
            paused = true;
            update({ status: "error", lease: void 0, message: error.message });
          }
        } finally {
          if (controller === scanController) checking = false;
        }
      }
      render(initial);
      timer = setInterval(check, 1800);
      check();
      addEventListener("pagehide", () => {
        controller?.abort();
        clearInterval(timer);
        if (get()?.lease?.owner === scanId) update({ status: "waiting", lease: void 0, message: "\u8BFE\u8868\u9875\u9762\u5DF2\u5207\u6362\uFF0C\u5DF2\u5B8C\u6210\u5468\u6B21\u5DF2\u4FDD\u7559\uFF0C\u7B49\u5F85\u7EE7\u7EED\u68C0\u6D4B\u3002" });
      }, { once: true });
    }
  }
  runHelper();
})();
