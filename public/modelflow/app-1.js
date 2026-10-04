document.documentElement.classList.add('js');
var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 版本清单：和软件内更新器读的是同一份，页面与程序不会各说一套。
   拉不到就保留写死的兜底值，但会在控制台留一条痕迹，方便排查。 */
(function(){
  var MANIFEST = 'https://modelflow-1447874637.cos.ap-guangzhou.myqcloud.com/latest.json';
  var FULL_SHA = '';
  function set(id, v){ var el = document.getElementById(id); if (el) el.textContent = v; }
  fetch(MANIFEST, {cache:'no-store'}).then(function(r){
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(function(d){
    if (d.version) { set('navVer', d.version); set('heroVer', d.version); set('btnVer', d.version); set('ftVer', d.version); }
    /* 一位小数：兜底值写的是 36.2 MB，取整成 36 MB 会让 fetch 成败两种情况下
       显示成两个不同的数。 */
    if (d.size) { var mb = (d.size/1048576).toFixed(1) + ' MB'; set('heroSize', mb); set('btnSize', mb); }
    if (d.url) { var b = document.getElementById('dlBtn'); if (b) b.setAttribute('href', d.url); }
    var gh = document.getElementById('dlGithub');
    var mirror = (d.mirrors || [])[0];
    if (gh && mirror) {
      gh.setAttribute('href', mirror); gh.hidden = false;
      var note = document.getElementById('dlSrcNote'); if (note) note.hidden = false;
    }
    if (d.sha256) {
      FULL_SHA = d.sha256;
      var el = document.getElementById('btnSha');
      el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>' +
                     'SHA-256 ' + d.sha256.slice(0, 16) + '…';
    }
  }).catch(function(e){ console.warn('[loom] 版本清单读取失败，沿用页面兜底值：', e.message); });

  var copied = document.getElementById('copied'), ct;
  document.getElementById('btnSha').addEventListener('click', function(){
    if (!FULL_SHA) return;
    var done = function(){ copied.classList.add('show'); clearTimeout(ct); ct = setTimeout(function(){ copied.classList.remove('show'); }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(FULL_SHA).then(done, done); else done();
  });
})();

/* 两段滚动工艺各管各的：段进场是 IO 加类 + CSS 1.5s 淡 opacity（tabbit 的
   *-container 就是这个，压根不平移）；hero 产品图才是要逐帧写 transform 的视差。 */
(function(){
  var preview = document.getElementById('heroStage');
  var hero = document.querySelector('.hero');
  var nav = document.getElementById('nav');
  var links = [].slice.call(document.querySelectorAll('#navLinks a'));
  var prog = document.getElementById('navProgress');
  var sections = links.map(function(a){ return document.querySelector(a.getAttribute('href')); });

  /* 进度只认 scrollY：滚到 330px 就完全摊平，所以它在预览图进视口之前就动完了 ——
   tabbit 就是这个手感（先到 flatten、再到眼前），不需要 getBoundingClientRect。
   只写 rotateX，别的分量一个都不加。 */
  /* 与 transform 共用同一个 y，但颜色走 easeInOutCubic：tabbit 原式
     A = y<.5 ? 4y³ : 1-(-2y+2)³/2，端点换成 #f1f1f1 → #ffffff */
  function heroEnd(y){
    var A = y < .5 ? 4*y*y*y : 1 - Math.pow(-2*y+2, 3)/2;
    var v = Math.round(241+14*A);
    return 'rgb(' + v + ',' + v + ',' + v + ')';
  }
  function applyParallax(){
    if (!preview) return;
    var y = Math.min(Math.max(scrollY / 330, 0), 1);
    preview.style.transform = 'rotateX(' + (30 * (1 - y)).toFixed(2) + 'deg)';
    /* 底色跟着摊平进度从灰收白，和 transform 同一个进度驱动，见 .hero 的 --hero-end */
    if (hero) hero.style.setProperty('--hero-end', heroEnd(y));
  }
  function applyProgress(){
    if (!prog) return;
    var max = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(scrollY / max, 1) : 0) + ')';
  }
  function applySpy(){
    var y = scrollY + 120, cur = -1;
    for (var i = 0; i < sections.length; i++){
      if (sections[i] && sections[i].offsetTop <= y) cur = i;
    }
    for (var j = 0; j < links.length; j++) links[j].classList.toggle('on', j === cur);
  }
  var ticking = false;
  function update(){ applyParallax(); applyProgress(); applySpy(); }
  function onFrame(){ update(); ticking = false; }
  function onScroll(){
    nav.classList.toggle('scrolled', scrollY > 8);
    if (!ticking){ ticking = true; requestAnimationFrame(onFrame); }
  }
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll, {passive:true});

  /* 首帧必须同步跑，不能只挂 rAF：后台标签页里 rAF 根本不来，而 .js [data-rise]
     是被 opacity:0 藏着的 —— 只等 rAF 的话，后台打开或刷新在页面中段时会是一片空白，
     非得手动滚一下才亮。字体/图片到位后位置会变，所以 load 后再重量一次。 */
  if (REDUCED){
    applyProgress();
    applySpy();
  } else {
    nav.classList.toggle('scrolled', scrollY > 8);
    update();
    addEventListener('load', update);
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) update(); });
  }
}());

/* 段进场：进视口加 .shown 就交棒给 CSS 的 1.5s 淡入，之后不再管（倒滚不重播）。
   data-delay 只在同一组里往后推一点，做出错落而不是一排同时亮。 */
(function(){
  var els = [].slice.call(document.querySelectorAll('[data-rise]'));
  if (!els.length) return;
  if (REDUCED || !('IntersectionObserver' in window)){
    els.forEach(function(el){ el.classList.add('shown'); }); return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (!en.isIntersecting) return;
      var el = en.target, d = (parseInt(el.dataset.delay || '0', 10) || 0) * 120;
      if (d) setTimeout(function(){ el.classList.add('shown'); }, d);
      else el.classList.add('shown');
      io.unobserve(el);
    });
  }, { threshold: .18, rootMargin: '0px 0px -12% 0px' });
  els.forEach(function(el){ io.observe(el); });
})();

/* 跟光标的柔光 + 主按钮进场扫一次光。两条都要让开触屏和减动效：
   触屏没有 hover，柔光永远停在 0；减动效档下不扫。 */
(function(){
  if (REDUCED || !matchMedia('(hover:hover)').matches) return;
  var SEL = '.card,.stage,.lc', pend = null, ev = null;
  addEventListener('pointermove', function(e){
    ev = e;
    if (pend) return;
    pend = requestAnimationFrame(function(){
      pend = null;
      var t = ev.target && ev.target.closest ? ev.target.closest(SEL) : null;
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', ((ev.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      t.style.setProperty('--my', ((ev.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  }, {passive:true});

  var btn = document.querySelector('.hero-cta .pill');
  if (!btn || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function(en){
    if (!en[0].isIntersecting) return;
    btn.classList.add('shine');
    setTimeout(function(){ btn.classList.remove('shine'); }, 1300);
    io.disconnect();
  }, {threshold: .6});
  io.observe(btn);
})();

/* 数字条：进视口跑一次，跑完就 unobserve，往回滚不再重跑 */
(function(){
  var els = [].slice.call(document.querySelectorAll('[data-count]'));
  if (!els.length || !('IntersectionObserver' in window)) return;
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if (!en.isIntersecting) return;
      var el = en.target, target = parseFloat(el.dataset.count);
      var dec = parseInt(el.dataset.dec || '0', 10), prefix = el.dataset.prefix || '';
      if (REDUCED){ el.textContent = prefix + target.toFixed(dec); obs.unobserve(el); return; }
      var dur = 1200, t0 = performance.now();
      (function tick(t){
        var p = Math.min(1, (t - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + (target * e).toFixed(dec);
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
      obs.unobserve(el);
    });
  }, {threshold: .5});
  els.forEach(function(el){ obs.observe(el); });
})();

/* 产品图里的"正在跑"是演出来的：过一会儿翻一步、补一行转录，再从头来。
   只改文本和类名，不动布局，所以不会引起重排抖动。
   进程卡跟着软件的默认档走：还在跑就摊开，跑完收成胶囊把正文让回来。 */
(function(){
  var log = document.getElementById('mockLog'), count = document.getElementById('mockCount');
  var rows = [].slice.call(document.querySelectorAll('.m-proc .pr'));
  var proc = document.getElementById('mProc');
  var pState = document.getElementById('mpState'), pLabel = document.getElementById('mpLabel');
  var i = 0, timer = null;
  function setPill(on){ if (proc) proc.classList.toggle('collapsed', !!on); }
  function syncPill(name){
    if (!pLabel || !pState) return;
    pLabel.textContent = name;
    pState.className = 'mp-state run';
    pState.textContent = '●';
  }
  /* 胶囊那颗箭头和卡头的收起键是真能按的，不动效模式下也保留 */
  var exp = proc ? proc.querySelector('.mp-act') : null;
  var col = document.getElementById('mpToggle');
  if (exp) exp.addEventListener('click', function(){ setPill(false); });
  if (col) col.addEventListener('click', function(){ setPill(true); });
  if (REDUCED) return;
  var LINES = [
    ['12:24:11','TOOL','Write sensitivity.py'],
    ['12:26:38','DONE','逐项执行 · EXECUTION.md 已落盘'],
    ['12:31:02','INFO','自检复核开始，逐条比对验收标准']
  ];
  /* 演示动画滚出视口就该停表：让一个看不见的窗口一直 setInterval 是纯浪费 */
  function start(){ if (!timer) timer = setInterval(tick, 1800); }
  function stop(){ clearInterval(timer); timer = null; }
  function tick(){
    if (i >= LINES.length){ setPill(true); setTimeout(reset, 2600); return; }
    var d = document.createElement('div');
    d.className = 'ln new';
    var map = {TOOL:'t-tool', DONE:'t-ok', INFO:'t-info', RUN:'t-run'};
    d.innerHTML = '<b>' + LINES[i][0] + '</b><span class="tag ' + map[LINES[i][1]] + '">' + LINES[i][1] + '</span>' + LINES[i][2];
    var cur = log.querySelector('.ln .cursor');
    if (cur) cur.parentNode.removeChild(cur);
    log.insertBefore(d, log.querySelector('.ws'));
    if (i === 1){
      rows[3].className = 'pr ok'; rows[3].querySelector('i').textContent = '✓';
      rows[4].className = 'pr on run'; rows[4].querySelector('i').textContent = '●';
      count.textContent = '4/7';
      syncPill('自检复核');
    }
    i++;
  }
  function reset(){
    [].slice.call(log.querySelectorAll('.ln')).slice(6).forEach(function(n){ n.parentNode.removeChild(n); });
    rows[3].className = 'pr on run'; rows[3].querySelector('i').textContent = '●';
    rows[4].className = 'pr pend'; rows[4].querySelector('i').textContent = '';
    count.textContent = '3/7';
    syncPill('逐项执行');
    setPill(false);
    i = 0;
  }
  syncPill('逐项执行');
  /* 观察自己那一屏（跑起来是什么样），不是页面上第一个 .mock —— hero 已经换成输入台了 */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function(en){
      en[0].isIntersecting ? start() : stop();
    }, {threshold: .15}).observe(document.querySelector('#run .mock'));
  } else { start(); }
})();

/* hero 的输入台：把任务说明一个字一个字打出来，光标一直闪。
   和转录那段一样：滚出视口就停表，prefers-reduced-motion 下只填成品的第一个字。 */
(function(){
  var box = document.getElementById('mTyped');
  if (!box) return;
  var TEXT = '帮我把这份赛题拆成可执行的子问题，列出要用到的方法和数据，跑完出图并写结论。';
  var i = 0, timer = null;
  function start(){ if (!timer) timer = setInterval(tick, 62); }
  function stop(){ clearInterval(timer); timer = null; }
  function tick(){
    if (i >= TEXT.length){ stop(); setTimeout(reset, 3400); return; }
    box.textContent = TEXT.slice(0, ++i);
  }
  function reset(){ i = 0; box.textContent = ''; start(); }
  if (REDUCED){ box.textContent = TEXT; return; }
  box.textContent = TEXT.slice(0, 8);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function(en){
      en[0].isIntersecting ? start() : stop();
    }, {threshold: .2}).observe(document.querySelector('.m-card'));
  } else { start(); }
})();

/* details 的展开高度靠 grid-template-rows 过渡；同组内手风琴式收起，只留一个开着 */
(function(){
  var all = [].slice.call(document.querySelectorAll('#faq details'));
  all.forEach(function(d){
    d.addEventListener('toggle', function(){
      if (!d.open) return;
      all.forEach(function(o){ if (o !== d) o.open = false; });
    });
  });
})();
