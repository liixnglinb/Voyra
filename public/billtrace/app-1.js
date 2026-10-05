/* ---------- 下载线路：默认国内镜像，后台自动测速 ---------- */
(function(){
  var GH='https://github.com/liixnglinb/BillTrace/releases/latest/download/BillTrace.apk';
  var MIRROR='https://gh-proxy.com/'+GH;
  var URLS={github:GH,mirror:MIRROR};
  var NAME={github:'GitHub 直连',mirror:'国内镜像'};
  var KEY='bt_dl_src',KEYAT='bt_dl_at';
  var nodes=document.querySelectorAll('[data-dl]');
  var cur='mirror';

  function apply(which,note){
    cur=which;
    var main=URLS[which],alt=URLS[which==='mirror'?'github':'mirror'];
    for(var i=0;i<nodes.length;i++){
      var el=nodes[i];
      el.setAttribute('href',el.getAttribute('data-dl')==='primary'?main:alt);
    }
    var tag=document.getElementById('srcTag');
    if(tag)tag.textContent=NAME[which];
    var al=document.getElementById('altLabel');
    if(al)al.textContent=NAME[which==='mirror'?'github':'mirror'];
    var sn=document.getElementById('srcNote');
    if(!sn)return;
    sn.innerHTML='<span class="dot"></span>当前线路：<b>'+NAME[which]+'</b>'+
      (note?'<span>'+note+'</span>':'')+
      '<button type="button" class="swap" id="swapLine">换线路</button>';
    var sw=document.getElementById('swapLine');
    if(sw)sw.onclick=function(){
      var next=cur==='mirror'?'github':'mirror';
      try{localStorage.setItem(KEY,next);localStorage.setItem(KEYAT,String(Date.now()));}catch(e){}
      apply(next,'手动切换');
    };
  }

  /* 用 Range 探测首字节耗时；no-cors 下拿不到内容，只比快慢 */
  function probe(url,ms){
    return new Promise(function(res){
      var t0=Date.now(),done=false,ctl=null,timer=null;
      function fin(v){if(done)return;done=true;if(timer)clearTimeout(timer);res(v);}
      timer=setTimeout(function(){try{if(ctl)ctl.abort();}catch(e){}fin(null);},ms);
      try{
        ctl=window.AbortController?new AbortController():null;
        fetch(url,{mode:'no-cors',cache:'no-store',headers:{'Range':'bytes=0-0'},signal:ctl?ctl.signal:undefined})
          .then(function(){fin(Date.now()-t0);})
          .catch(function(){fin(null);});
      }catch(e){fin(null);}
    });
  }

  var saved=null,at=0;
  try{saved=localStorage.getItem(KEY);at=+(localStorage.getItem(KEYAT)||0);}catch(e){}

  /* 24 小时内沿用上次结果，不再测速 */
  if(saved&&URLS[saved]&&Date.now()-at<86400000){apply(saved,'');return;}

  apply('mirror','');   /* 先按国内镜像渲染，不阻塞首屏 */

  if(!window.fetch)return;
  Promise.all([probe(GH,2500),probe(MIRROR,2500)]).then(function(r){
    var gh=r[0],mi=r[1],pick='mirror';
    if(gh!==null&&(mi===null||gh<mi*0.8))pick='github';
    try{localStorage.setItem(KEY,pick);localStorage.setItem(KEYAT,String(Date.now()));}catch(e){}
    if(pick!==cur)apply(pick,'已自动选最快的');
  });
})();

/* ---------- 微信 / QQ 内置浏览器：APK 装不上，先给出路 ---------- */
(function(){
  var tip=document.getElementById('wxTip');
  if(!tip)return;
  var ua=navigator.userAgent||'';
  /* MicroMessenger=微信，QQ/ TIM=QQ 系内置浏览器。QQ 同样拦截 APK 安装。 */
  if(/MicroMessenger|\bQQ\//i.test(ua)) tip.hidden=false;
})();

/* ---------- 下载没反应时的备用线路 ---------- */
(function(){
  var GH='https://github.com/liixnglinb/BillTrace/releases/latest/download/BillTrace.apk';
  var MIRROR='https://gh-proxy.com/'+GH;
  var NAME={github:'GitHub 直连',mirror:'国内镜像'};
  var main=document.getElementById('dlMain'),hint=document.getElementById('dlHint');
  if(!main||!hint)return;
  main.addEventListener('click',function(){
    setTimeout(function(){
      var tag=document.getElementById('srcTag');
      var cur=(tag&&tag.textContent.indexOf('GitHub')>=0)?'github':'mirror';
      var other=cur==='mirror'?'github':'mirror';
      hint.innerHTML='没开始下载？换另一条线路试试：<a href="'+(other==='mirror'?MIRROR:GH)+'">'+NAME[other]+'</a>';
    },3500);
  });
})();

/* ---------- 动态版本号 ---------- */
(function(){
  var x=new XMLHttpRequest();
  x.open('GET','https://api.github.com/repos/liixnglinb/BillTrace/releases/latest',true);
  x.onload=function(){
    if(x.status!==200)return;
    try{
      var d=JSON.parse(x.responseText);
      var tag=String(d.tag_name||'');
      if(/^v?\d+(\.\d+)+$/.test(tag)){
        var v=tag.charAt(0)==='v'?tag:'v'+tag;
        ['ver','ver2','log-ver'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=v;});
      }
      var verEl=document.getElementById('ver2');
      var ver=verEl?verEl.textContent:'';
      /* 发布走固定 tag latest + --clobber，Release 的 published_at 永远停在第一次
         创建那天，只有资产会变；所以「最近构建」必须取资产的 updated_at。 */
      var a=(d.assets||[]).filter(function(a){return a.name==='BillTrace.apk';})[0];
      var builtAt=(a&&a.updated_at)||d.published_at;
      var dt=document.getElementById('logDate');
      if(dt&&builtAt){
        var t=new Date(builtAt);
        dt.textContent='最近构建 '+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
      }
      var p=document.querySelector('.dl-panel p');
      if(a){var mb=a.size<1048576?Math.round(a.size/1024)+' KB':(a.size/1048576).toFixed(1)+' MB';if(p)p.innerHTML='Android 8.0+ · <span class="ver-inline">'+ver+'</span> · 安装包约 '+mb;['chipSize','mbarSize'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=mb;});}
    }catch(e){}
  };
  x.send();
})();

/* ---------- 手机：实时自动记账模拟 ---------- */
(function(){
  var pool=[
    {app:'alipay',  ch:'支',c:'#1677FF',appn:'支付宝',name:'美团外卖', sub:'餐饮-外卖 · 14:32', amt:'−35.80',  neg:true},
    {app:'wechat',  ch:'微',c:'#07C160',appn:'微信',  name:'地铁出行', sub:'交通 · 09:15',      amt:'−4.00',   neg:true},
    {app:'luckin',  ch:'幸',c:'#1F3B9E',appn:'云闪付',name:'瑞幸咖啡', sub:'餐饮-咖啡 · 08:40', amt:'−15.90',  neg:true},
    {app:'cmb',     ch:'招',c:'#E60012',appn:'招商银行',name:'工资到账',sub:'金融-工资 · 10:00', amt:'+8,500.00',neg:false},
    {app:'meituan', ch:'美',c:'#FFC300',appn:'美团',  name:'肯德基',   sub:'餐饮-外卖 · 18:30', amt:'−45.50',  neg:true},
    {app:'jd',      ch:'京',c:'#E1251B',appn:'京东',  name:'京东超市', sub:'购物-日用 · 20:11', amt:'−129.00', neg:true}
  ];
  var idx=0,cnt=3,total=3420.50;
  var list=document.getElementById('phList');
  var notif=document.getElementById('phNotif');
  function row(t,isNew){
    var el=document.createElement('div');
    el.className='scr-txn'+(isNew?' new':'');
    el.innerHTML='<span class="scr-dot"><img src="/billtrace/icons/'+t.app+'.png" alt=""></span>'+
      '<div><div class="scr-name">'+t.name+'</div><div class="scr-sub">'+t.sub+'</div></div>'+
      '<span class="scr-amt'+(t.neg?'':' pos')+'">'+t.amt+'</span>';
    return el;
  }
  var seed=pool[0];list.appendChild(row(seed));list.appendChild(row(pool[1]));list.appendChild(row(pool[2]));idx=3;
  document.getElementById('phCnt').textContent='3 笔';
  function cycle(){
    var t=pool[idx%pool.length];idx++;
    document.getElementById('nfIcon').src='/billtrace/icons/'+t.app+'.png';
    document.getElementById('nfTitle').textContent=t.appn+' · 支付成功';
    document.getElementById('nfAmt').textContent=t.amt.replace('−','¥').replace('+','¥');
    var src=document.querySelector('.floaters img[data-app="'+t.app+'"]');
    if(src){src.classList.add('hit');setTimeout(function(){src.classList.remove('hit');},1500);}
    notif.classList.add('show');
    setTimeout(function(){notif.classList.remove('show');},1750);
    setTimeout(function(){
      list.insertBefore(row(t,true),list.firstChild);
      while(list.children.length>4)list.removeChild(list.lastChild);
      cnt++;document.getElementById('phCnt').textContent=cnt+' 笔';
      if(t.neg)total+=parseFloat(t.amt.replace(/[−,]/g,''));
      document.getElementById('phTotal').textContent='¥'+total.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
    },1850);
  }
  setTimeout(cycle,1600);
  var cycTimer=null;
  new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){if(!cycTimer)cycTimer=setInterval(cycle,4200);}
      else{clearInterval(cycTimer);cycTimer=null;}
    });
  },{threshold:0}).observe(document.querySelector('.phone'));
  /* 月支出数字滚动 + 预算条 */
  var el=document.getElementById('phTotal'),t0=null,target=3420.50;
  function step(ts){if(!t0)t0=ts;var k=Math.min((ts-t0)/1400,1);k=1-Math.pow(1-k,3);
    el.textContent='¥'+(target*k).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
    if(k<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);
  setTimeout(function(){document.getElementById('phBar').style.width='68%';},300);
  /* 近 7 天柱状图逐根生长 */
  var bars=document.querySelectorAll('#phBars i');
  bars.forEach(function(b,i){setTimeout(function(){b.classList.add('grow');},420+i*110);});
  /* 时钟 */
  function tick(){var n=new Date();document.getElementById('phClock').textContent=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');}
  tick();setInterval(tick,20000);
})();

/* ---------- 渠道跑马灯 ---------- */
(function(){
  var names=['支付宝','微信','美团外卖','京东','淘宝','拼多多','瑞幸咖啡','肯德基','滴滴出行','高德地图','网易云音乐','腾讯视频','星巴克','招商银行'];
  var files={支付宝:'alipay',微信:'wechat',美团外卖:'meituan',京东:'jd',淘宝:'taobao',拼多多:'pdd',瑞幸咖啡:'luckin',肯德基:'kfc',滴滴出行:'didi',高德地图:'amap',网易云音乐:'music163',腾讯视频:'tvideo',星巴克:'starbucks',招商银行:'cmb'};
  var html=names.map(function(n){return '<span class="mq-item"><img src="/billtrace/icons/'+files[n]+'.png" alt="" loading="lazy" decoding="async">'+n+'</span>';}).join('');
  var t1=document.getElementById('mqTrack'),t2=document.getElementById('mqTrack2');
  if(t1)t1.innerHTML=html+html;
  if(t2)t2.innerHTML=html+html;
})();

/* ---------- 滚动交互：显现 / 导航状态 / 进度条 / 跑马灯节能 / 章节高亮 ---------- */
(function(){
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target);}});
  },{threshold:.08,rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('.rv').forEach(function(el){io.observe(el);});
  var nav=document.getElementById('nav'),prog=document.getElementById('nprog'),ticking=false;
  function onScroll(){
    if(ticking)return;ticking=true;
    requestAnimationFrame(function(){
      var y=window.pageYOffset;
      nav.classList.toggle('scrolled',y>12);
      var h=document.documentElement.scrollHeight-window.innerHeight;
      prog.style.transform='scaleX('+(h>0?Math.min(y/h,1):0)+')';
      ticking=false;
    });
  }
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  var mbar=document.getElementById('mbar'),dlHide=false;
  if(mbar){
    function mbUpd(){mbar.classList.toggle('show',window.pageYOffset>430&&!dlHide);}
    new IntersectionObserver(function(es){es.forEach(function(e){dlHide=e.isIntersecting;mbUpd();});},{threshold:.15}).observe(document.getElementById('download'));
    addEventListener('scroll',mbUpd,{passive:true});
  }
  var mio=new IntersectionObserver(function(es){
    es.forEach(function(e){e.target.classList.toggle('paused',!e.isIntersecting);});
  },{threshold:0});
  document.querySelectorAll('.marquee').forEach(function(el){mio.observe(el);});
  var spy=[].slice.call(document.querySelectorAll('nav .links a'));
  var sio=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(!e.isIntersecting)return;
      var id='#'+e.target.id;
      spy.forEach(function(a){a.classList.toggle('cur',a.getAttribute('href')===id);});
    });
  },{rootMargin:'-42% 0px -52% 0px'});
  ['features','how','log'].forEach(function(id){var el=document.getElementById(id);if(el)sio.observe(el);});
})();
