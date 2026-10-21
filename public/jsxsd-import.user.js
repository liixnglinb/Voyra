// ==UserScript==
// @name         Voyra 教务课表导入
// @namespace    https://lxlrwxs.top/
// @version      1.0.0
// @description  在湖南人文科技学院教务系统（强智 jsxsd）里自动读取「我的课表」，一键带回 Voyra 课表页导入。
// @author       Voyra
// @match        http://10.1.1.149/jsxsd/*
// @match        http://vpn.huhst.edu.cn:9900/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/* ============================================================
   工作方式
   - 站内「教务导入」打开教务系统时，这里第一时间告诉父窗口「已连上」，
     站内据此取消 12 秒的内网→外网自动切换；
   - 页面里一旦出现「周一到周日」的课表表格，自动解析成 VOYRA2 口令，
     跳回 https://lxlrwxs.top/#/timetable?share=…，站内自动预览、合并导入；
   - 没找到表格时：右下角给一个「导入到 Voyra」按钮，并尝试自动点开
     「课表查询」菜单（登录后的首页通常不是课表页）。
   ============================================================ */
(function () {
  'use strict';

  var VOYRA = 'https://lxlrwxs.top';
  var SLOTS = ['1-2', '3-4', '5-6', '7-8', '晚自习1', '晚自习2'];
  var DAY = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7 };
  var CN = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };

  var txt = function (el) { return (el.innerText || el.textContent || '').replace(/\u00a0/g, ' ').trim(); };
  var slotByNo = function (a) {
    if (a <= 2) return '1-2'; if (a <= 4) return '3-4'; if (a <= 6) return '5-6'; if (a <= 8) return '7-8';
    return a <= 10 ? '晚自习1' : '晚自习2';
  };
  var slotOf = function (t) {
    t = String(t || '').replace(/\s+/g, '');
    var s = t.replace(/\d{1,2}[:：]\d{2}(?:[-~—]\d{1,2}[:：]\d{2})?/g, '');
    if (/晚/.test(s)) return /2/.test(s) ? '晚自习2' : '晚自习1';
    var cn = /第([一二三四五六七八九十]+)大?节/.exec(s);
    if (cn) {
      var n = CN[cn[1]] || 0;
      if (n >= 5) return n === 6 ? '晚自习2' : '晚自习1';
      return slotByNo(n * 2);
    }
    var m = s.match(/(\d{1,2})/);
    return m ? slotByNo(+m[1]) : null;
  };

  /* ── 1. 告诉站内：内网已连上（取消外网切换） ── */
  function notifyOpener(state) {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ source: 'voyra-jsxsd', state: state }, '*');
      }
    } catch (e) { /* ignore */ }
  }
  notifyOpener('ready');

  /* ── 2. 找课表表格并解析 ── */
  function findTimetable() {
    var best = null;
    var tables = [].slice.call(document.querySelectorAll('table'));
    tables.forEach(function (tb) {
      var heads = [].slice.call(tb.querySelectorAll('th,td')).filter(function (c) {
        return /^(周|星期)[一二三四五六日天]$/.test(txt(c).replace(/\s+/g, ''));
      });
      if (heads.length >= 3 && (!best || heads.length > best.heads.length)) best = { tb: tb, heads: heads };
    });
    return best;
  }

  function parse(best) {
    var headRow = best.heads[0].parentNode;
    var colDay = {};
    [].slice.call(headRow.children).forEach(function (c, i) {
      var m = /^(周|星期)([一二三四五六日天])$/.exec(txt(c).replace(/\s+/g, ''));
      if (m) colDay[i] = DAY[m[2]];
    });
    var rows = [].slice.call(best.tb.querySelectorAll('tr'));
    var start = rows.indexOf(headRow) + 1;
    var out = [];
    for (var ri = start; ri < rows.length; ri++) {
      var cells = [].slice.call(rows[ri].children);
      if (!cells.length) continue;
      var slot = slotOf(txt(cells[0]));
      if (!slot) continue;
      for (var c = 1; c < cells.length; c++) {
        var day = colDay[c];
        if (!day) continue;
        var raw = txt(cells[c]).split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!raw.length) continue;
        var name = raw[0];
        if (slotOf(name) || /^(周|星期)[一二三四五六日天]$/.test(name)) continue;
        var teacher = '', room = '', note = [];
        for (var k = 1; k < raw.length; k++) {
          var t = raw[k];
          if (!room && /(楼|室|教室|馆|场|中心|苑|区|\d{3,4}|[A-Z]\d{2,4})/.test(t) && t.length <= 20) room = t;
          else if (!teacher && /(老师|教授|讲师|teacher)/.test(t) && t.length <= 20) teacher = t;
          else if (!teacher && /^[\u4e00-\u9fa5·]{2,4}$/.test(t)) teacher = t;
          else note.push(t);
        }
        var joined = raw.join('');
        var type = /\(单\)|（单）/.test(joined) ? 1 : /\(双\)|（双）/.test(joined) ? 2 : 0;
        out.push({ name: name, teacher: teacher, room: room, note: note.join(' · ').slice(0, 40), day: day, slot: slot, type: type });
      }
    }
    return out;
  }

  function esc(v) { return String(v || '').replace(/[|~;,]/g, function (ch) { return '%' + ch.charCodeAt(0).toString(16); }); }
  function b64url(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function buildLink(list) {
    var body = list.map(function (c) {
      return [esc(c.name), '', '', esc(c.note), esc(c.teacher), esc(c.room),
        [c.day, SLOTS.indexOf(c.slot), 1, 16, c.type, ''].join(',')].join('~');
    }).join('|');
    return VOYRA + '/#/timetable?share=' + encodeURIComponent('VOYRA2:' + b64url(body));
  }

  /* ── 3. 右下角提示条 ── */
  function banner(text, actionText, onAction, autoMs) {
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:2147483647;background:#1b1b1b;color:#fff;' +
      'font:13px/1.5 system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding:12px 14px;' +
      'border-radius:12px;box-shadow:0 10px 30px -10px rgba(0,0,0,.5);max-width:320px;display:flex;gap:10px;align-items:center';
    var span = document.createElement('span');
    span.textContent = text;
    box.appendChild(span);
    if (actionText) {
      var btn = document.createElement('button');
      btn.textContent = actionText;
      btn.style.cssText = 'flex:none;border:0;background:#A48830;color:#fff;font-weight:700;padding:6px 10px;border-radius:8px;cursor:pointer;font-size:12px';
      btn.onclick = function () { box.remove(); onAction(); };
      box.appendChild(btn);
    }
    document.body.appendChild(box);
    if (autoMs) setTimeout(function () { if (box.parentNode) box.remove(); }, autoMs);
    return box;
  }

  /* ── 4. 主流程 ── */
  var KEY = 'voyra-jsxsd-auto';
  var did = false;

  function run(auto) {
    if (did) return;
    var best = findTimetable();
    if (!best) return false;
    var list = parse(best);
    if (!list.length) return false;
    did = true;
    var link = buildLink(list);
    notifyOpener('parsed');
    var box = banner('已识别 ' + list.length + ' 门课程，正在返回 Voyra…', '立即返回', function () { location.href = link; });
    setTimeout(function () { location.href = link; }, auto ? 1200 : 2000);
    return true;
  }

  // 页面加载即有课表 → 自动带走
  if (run(true)) return;

  // 没有课表：给个手动按钮；登录后的首页尝试自动点开「课表」
  banner('未检测到课表表格，点这里导入', '导入到 Voyra', function () { if (!run(false)) banner('这个页面没有课表表格，请先打开「我的课表」', '', null, 4000); }, 12000);

  if (!sessionStorage.getItem(KEY)) {
    var link = [].slice.call(document.querySelectorAll('a')).filter(function (a) {
      var t = txt(a);
      return /课表|课表查询|我的课表/.test(t) && t.length < 20;
    })[0];
    if (link) {
      sessionStorage.setItem(KEY, '1');
      setTimeout(function () { link.click(); }, 800);
    }
  }

  // SPA 式局部刷新时再试一次
  var mo = new MutationObserver(function () {
    if (did) { mo.disconnect(); return; }
    run(true);
  });
  try { mo.observe(document.body, { childList: true, subtree: true }); } catch (e) { /* ignore */ }
})();
