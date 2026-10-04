/* 吸底下载条：滚过首屏（阈值 620px，约等于 hero 主 CTA 出屏的位置）出现；
   到达 #download 的下载卡片（.dl-block，真正的大按钮）可见时自动隐藏。
   版本/体积不自己请求：镜像 #cta-install 的 href 与 .dl-meta 的文案，二者由本页已有
   的动态版本脚本负责更新，失败时保留写死值作兜底。 */
(function(){
  var bar=document.getElementById('mbar'),go=document.getElementById('mbar-go'),meta=document.getElementById('mbar-meta');
  if(!bar)return;
  function mirror(){
    var src=document.getElementById('cta-install');
    if(src&&go){var h=src.getAttribute('href');if(h)go.setAttribute('href',h);}
    var dm=document.querySelector('.dl-meta');
    if(dm&&meta){
      var t=dm.textContent||'';
      var v=(t.match(/版本\s*([\d.]+)/)||[])[1],mb=(t.match(/约\s*([\d.]+\s*MB)/)||[])[1];
      if(v&&mb)meta.textContent='版本 '+v+' · '+mb;
    }
  }
  var hidden=false;
  function upd(){bar.classList.toggle('show',(window.pageYOffset||0)>620&&!hidden);}
  var dl=document.querySelector('#download .dl-block');
  if(dl&&'IntersectionObserver' in window){
    new IntersectionObserver(function(es){es.forEach(function(e){hidden=e.isIntersecting;upd();});},{threshold:.15}).observe(dl);
    new MutationObserver(function(){mirror();}).observe(dl,{subtree:true,characterData:true,childList:true});
  }
  mirror();upd();
  addEventListener('scroll',upd,{passive:true});
})();
