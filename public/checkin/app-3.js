/* 手机端两件事：① 吸底下载条 ② 公告条可关闭。
   不碰下载链路：href 与主按钮同为 releases/latest/download/…（版本无关的稳定直链），
   条里的「v3.9.0 · 107MB」写成与页面正文同样的模式，由本页已有的动态脚本一次解析后
   顺带改写（它对 document.body 全量文本做替换），这里不新起任何请求。 */
(function(){
  var bar = document.getElementById('mbar');
  var dlHide = false;
  function upd(){
    if(!bar) return;
    bar.classList.toggle('show', (window.pageYOffset || window.scrollY || 0) > 560 && !dlHide);
  }
  if(bar){
    var dl = document.querySelector('#download .dl-buttons');
    if(dl && 'IntersectionObserver' in window){
      new IntersectionObserver(function(es){
        es.forEach(function(e){ dlHide = e.isIntersecting; upd(); });
      }, {threshold:.15}).observe(dl);
    }
    addEventListener('scroll', upd, {passive:true});
    upd();
  }
  /* 公告条关闭：× 只在手机断点显示（基态 hidden），关闭态记 localStorage，之后不再出现 */
  var KEY = 'voyra-checkin-ann-off', btn = document.getElementById('ann-x');
  function closeAnnounce(){
    document.body.classList.add('annoff');
    if(btn) btn.setAttribute('hidden','');
  }
  var saved = null;
  try{ saved = localStorage.getItem(KEY); }catch(e){}
  if(saved === '1') closeAnnounce();
  if(btn) btn.addEventListener('click', function(){
    closeAnnounce();
    try{ localStorage.setItem(KEY, '1'); }catch(e){}
  });
})();

/* 本版更新：与软件内「更新小框」悬停看到的是同一份内容（GitHub Release 正文）。
   拉不到（网络/CORS/无正文）就整块隐藏，不留空壳。刻意不加 .reveal：
   元素初始 display:none，入场观察器不会给它加 .visible，会变成永远不可见。 */
(function(){
  var API = 'https://api.github.com/repos/liixnglinb/Superstar-checkin/releases/latest';
  fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
    .then(function(r){ return r.json(); })
    .then(function(d){
      var body = String((d && d.body) || '').trim();
      var box = document.getElementById('changelog');
      if (!body || !box) return;
      var ver = document.getElementById('changelog-ver');
      if (ver) ver.textContent = 'v' + String((d && d.tag_name) || '').replace(/^v/i, '');
      var pre = document.getElementById('changelog-body');
      // 轻量清理 markdown：去掉粗体星号，行首列表符号换成正圆点；链接原样保留（可点）
      if (pre) pre.textContent = body.slice(0, 1200).replace(/\*\*/g, '').replace(/^\s*[-*]\s+/gm, '· ');
      box.hidden = false;
    })
    .catch(function(){});
})();
