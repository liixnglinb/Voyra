(function(){
'use strict';
var REPO = 'https://github.com/liixnglinb/token-monitor/releases';
var PROBE_FILE = 'TokenMonitor.exe';         /* 固定名资产，任意版本都存在 */
var PROBE_BYTES = 2097152;                   /* 2 MB —— 足够跨越"突发速度"，测到持续速率 */
var PROBE_TIMEOUT = 15000;                   /* 慢网（<150KB/s）也要放得下 2MB 的完整测量 */
var CACHE_KEY = 'tm.src.v3', CACHE_TTL = 10 * 60 * 1000;
var ORDER = ['gh-proxy', 'ghfast', 'direct'];
var SRC = {
  'gh-proxy': { name: '国内镜像', pre: 'https://gh-proxy.com/' },
  'ghfast':   { name: '备用镜像', pre: 'https://ghfast.top/' },
  'direct':   { name: '官方直连', pre: '' }
};
var state = { asset: null, auto: null, manual: null, result: null, probe: null, assetDone: null };
var SPEEDS = {};
var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

function $(id){ return document.getElementById(id); }
function setTxt(id, s){ var e = $(id); if (e && s) e.textContent = s; }
function fmtSpeed(kbs){ return kbs >= 1024 ? (kbs / 1024).toFixed(1) + ' MB/s' : Math.round(kbs) + ' KB/s'; }
function fmtBytes(b){
  if (!b) return '';
  return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB';
}

/* 当前下载地址：手动 > 自动测速 > 国内镜像兜底 */
function urlFor(){
  var key = state.manual || state.auto || 'gh-proxy';
  return state.asset ? SRC[key].pre + state.asset.url : SRC[key].pre + REPO + '/latest';
}
function apply(){
  var u = urlFor();
  document.querySelectorAll('[data-dl]').forEach(function(a){ a.href = u; });
  document.querySelectorAll('#srcSeg button').forEach(function(b){
    b.classList.toggle('on', b.getAttribute('data-s') === (state.manual || 'auto'));
  });
  statusLine();
  renderSpeeds();
}
function statusLine(){
  var e = $('srcStatus'); if (!e) return;
  if (state.manual){
    e.innerHTML = '<span class="dot ok"></span>手动选择下载源：<b>' + SRC[state.manual].name + '</b>';
  } else if (state.result && state.result.ok){
    e.innerHTML = '<span class="dot ok"></span>已自动选择最快源 <b>' + SRC[state.result.id].name + '</b> · 实测 ' + fmtSpeed(state.result.speed);
  } else if (state.probe){
    e.innerHTML = '<span class="dot wait"></span>正在测速选择最快下载源…';
  } else {
    e.innerHTML = '<span class="dot"></span>下载源：<b>' + SRC[state.auto || 'gh-proxy'].name + '</b>';
  }
}

/* 逐源速率条：以本次最快为 100% */
function renderSpeeds(){
  var box = $('spdList'); if (!box) return;
  var max = 0;
  ORDER.forEach(function(id){ var s = SPEEDS[id]; if (s && s.ok && s.speed > max) max = s.speed; });
  var pick = state.manual || state.auto;
  var html = '';
  ORDER.forEach(function(id){
    var s = SPEEDS[id], w = 0, txt = '测速中…', cls = '';
    if (s && s.ok){ w = Math.max(6, 100 * s.speed / max); txt = fmtSpeed(s.speed); }
    else if (s){ txt = '不可达'; cls = ' dead'; }
    if (state.result && state.result.id === id) cls += ' fast';
    if (pick === id) cls += ' picked';
    var best = cls.indexOf('fast') >= 0 ? '<i class="best">最快</i>' : '';
    html += '<div class="spd-row' + cls + '" data-id="' + id + '">'
      + '<span class="sn">' + SRC[id].name + best + '</span>'
      + '<span class="st"><i style="width:' + w.toFixed(1) + '%"></i></span>'
      + '<span class="sv">' + txt + '</span>'
      + '</div>';
  });
  box.innerHTML = html;
}

/* ── 单源测速：no-cors + Range 取 2MB，资源计时拿整段耗时 ── */
function probe(src){
  return new Promise(function(resolve){
    var url = src.pre + REPO + '/latest/download/' + PROBE_FILE;
    var ctl = new AbortController(), settled = false, poll = null;
    function finish(r){
      if (settled) return; settled = true;
      clearTimeout(timer); if (poll) clearInterval(poll);
      SPEEDS[src.id] = r; renderSpeeds();
      try { ctl.abort(); } catch (e) {}
      resolve(r);
    }
    var timer = setTimeout(function(){ finish({ id: src.id, ok: false }); }, PROBE_TIMEOUT);
    fetch(url, { mode: 'no-cors', headers: { Range: 'bytes=0-' + (PROBE_BYTES - 1) }, cache: 'no-store', signal: ctl.signal })
      .then(function(){
        poll = setInterval(function(){
          var list = performance.getEntriesByName(url);
          var e = list[list.length - 1];
          if (e && e.duration > 0)
            finish({ id: src.id, ok: true, ms: e.duration, speed: PROBE_BYTES / 1024 / (e.duration / 1000) });
        }, 180);
      })
      .catch(function(){ finish({ id: src.id, ok: false }); });
  });
}
function probeAll(force){
  if (state.probe) return state.probe;
  if (!force){
    try {
      var c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.t < CACHE_TTL){
        state.auto = c.id; state.result = { id: c.id, speed: c.speed, ok: true };
        if (!SPEEDS[c.id]) SPEEDS[c.id] = { id: c.id, ok: true, speed: c.speed };
        apply(); return Promise.resolve();
      }
    } catch (e) {}
  } else {
    try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {}
    SPEEDS = {};
  }
  state.result = null;
  state.probe = Promise.all(ORDER.map(function(id){
    return probe({ id: id, name: SRC[id].name, pre: SRC[id].pre });
  })).then(function(rs){
    var best = null;
    rs.forEach(function(r){ if (r.ok && (!best || r.speed > best.speed)) best = r; });
    if (best){
      state.auto = best.id; state.result = best;
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), id: best.id, speed: best.speed })); } catch (e) {}
    } else {
      state.auto = 'gh-proxy';
    }
    state.probe = null; apply();
  });
  apply();
  return state.probe;
}

/* ── 资产信息（版本 / 文件名 / 体积 / SHA-256），走本站 Function 代理 ── */
function loadAsset(){
  state.assetDone = fetch('/tm-api/latest', { cache: 'no-store' })
    .then(function(r){ return r.json(); })
    .then(function(d){
      if (!d || !d.version) return;
      var ver = String(d.version).replace(/^v/, '');
      var list = d.assets || [], setup = null;
      for (var i = 0; i < list.length; i++){
        var n = (list[i].name || '').toLowerCase();
        if (n.indexOf('setup') >= 0 && n.indexOf('.sha256') < 0){ setup = list[i]; break; }
      }
      if (!setup || !setup.url) return;
      state.asset = setup;
      var mb = setup.size > 0 ? '约 ' + Math.round(setup.size / 1048576) + ' MB' : '约 29 MB';
      setTxt('verPill', 'v' + ver);
      setTxt('verBtn', 'v' + ver);
      setTxt('fileName', setup.name);
      setTxt('chipSize', mb);
      setTxt('dlVer', 'v' + ver);
      setTxt('dlMeta', mb + ' · v' + ver);
      setTxt('footVer', 'v' + ver + ' · 81 条注册路径');
      setTxt('shaVal', d.sha256 ? d.sha256 : '随安装包同名发布（' + setup.name + '.sha256）');
      if (d.sha256){ var b = $('copySha'); if (b) b.hidden = false; }
      document.title = 'Token Monitor v' + ver + ' —— 本机 AI 用量看板 · Voyra';
      apply();
    })
    .catch(function(){});
  return state.assetDone;
}

/* ── 统一点击入口：地址未就绪时先提示并等待（封顶 2 秒） ── */
function ready(){
  return Promise.all([state.assetDone || Promise.resolve(), state.probe || Promise.resolve()]);
}
var HINT_DEFAULT = '测速取各源 2 MB 持续速率，结果缓存 10 分钟 · 安装包与更新包均为双闸校验（体积 + SHA-256）';
document.addEventListener('click', function(ev){
  var row = ev.target.closest ? ev.target.closest('.spd-row') : null;
  if (row){
    var id = row.getAttribute('data-id');
    if (id && SPEEDS[id] && !SPEEDS[id].ok) return;
    state.manual = id; apply(); return;
  }
  var a = ev.target.closest ? ev.target.closest('[data-dl]') : null;
  if (!a) return;
  if (ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
  ev.preventDefault();
  var label = $('dlHint');
  var go = function(){ location.href = urlFor(); };
  var wait = (state.asset && !state.probe) ? null : Promise.race([ready(), new Promise(function(res){ setTimeout(res, 2000); })]);
  if (!wait){ go(); return; }
  a.classList.add('busy');
  if (label) label.textContent = '正在选择最快下载源并准备下载…';
  wait.then(function(){
    a.classList.remove('busy');
    if (label) label.textContent = HINT_DEFAULT;
    go();
  });
});
document.querySelectorAll('#srcSeg button').forEach(function(b){
  b.addEventListener('click', function(){
    var s = b.getAttribute('data-s');
    state.manual = (s === 'auto') ? null : s;
    apply();
  });
});
$('reprobe').addEventListener('click', function(){
  state.manual = null;          /* 重新测速 = 交还给自动选择，否则按钮看着没反应 */
  probeAll(true);
});
function copyText(text, btn, done){
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done, function(){});
  } else {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  }
}
$('copyLink').addEventListener('click', function(){
  var btn = this;
  copyText(location.origin + urlFor(), btn, function(){
    btn.textContent = '已复制'; setTimeout(function(){ btn.textContent = '复制链接'; }, 1600);
  });
});
if ($('copySha')) $('copySha').addEventListener('click', function(){
  var btn = this, v = $('shaVal').textContent.trim();
  if (!/^[0-9a-f]{64}$/i.test(v)) return;
  copyText(v, btn, function(){
    btn.textContent = '已复制'; setTimeout(function(){ btn.textContent = '复制 SHA-256'; }, 1600);
  });
});

/* ── 滚动进度 + 分段入场 + 数字滚动 ── */
var nav = document.querySelector('.nav');
function onScroll(){
  var h = document.documentElement.scrollHeight - window.innerHeight;
  if (nav) nav.style.setProperty('--sp', (h > 0 ? Math.min(100, 100 * window.scrollY / h) : 0) + '%');
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

function fmtNum(v, dec, pre, suf){
  var s = dec ? v.toFixed(dec) : String(Math.round(v));
  var p = s.split('.');
  p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (pre || '') + p.join('.') + (suf || '');
}
function countUp(el){
  var to = parseFloat(el.getAttribute('data-to'));
  if (isNaN(to)) return;
  var dec = parseInt(el.getAttribute('data-dec') || '0', 10);
  var pre = el.getAttribute('data-pre') || '', suf = el.getAttribute('data-suf') || '';
  var t0 = performance.now(), dur = 900;
  (function step(now){
    var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmtNum(to * e, dec, pre, suf);
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}
var rvNodes = Array.prototype.slice.call(document.querySelectorAll('.rv'));
rvNodes.forEach(function(el, i){ el.style.transitionDelay = Math.min(320, i * 60) + 'ms'; });
if ('IntersectionObserver' in window && !reduce){
  var io = new IntersectionObserver(function(es){
    es.forEach(function(en){
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      en.target.querySelectorAll('[data-to]').forEach(countUp);
      io.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .1 });
  rvNodes.forEach(function(el){ io.observe(el); });
} else {
  rvNodes.forEach(function(el){ el.classList.add('in'); });
}

probeAll();
loadAsset();
apply();
})();
