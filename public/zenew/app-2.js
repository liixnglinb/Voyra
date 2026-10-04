/* 手机端吸底下载条：滚过首屏（阈值 520px ≈ hero 的下载按钮+要点出屏）出现，
   进入 #download（本页真正的下载区，含同一个直链按钮）时自动隐藏。
   不新起请求：版本号镜像 #ver、体积镜像 #size1 —— 两处都由上面那段已有的动态版本脚本负责写入，
   失败时保留条里写死的 v0.21.0 / 约 4.8 MB 作兜底。 */
(function(){
  var bar=document.getElementById('mbar');
  if(!bar)return;
  var bv=document.getElementById('mbar-ver'),bs=document.getElementById('mbar-size');
  function mirror(){
    var v=document.getElementById('ver'),s=document.getElementById('size1');
    if(bv&&v&&/^v[\d.]+/.test(v.textContent))bv.textContent=v.textContent;
    if(bs&&s&&s.textContent&&s.textContent!=='—')bs.textContent='约 '+s.textContent.replace(/\s/g,'');
  }
  var hidden=false;
  function upd(){bar.classList.toggle('show',(window.pageYOffset||0)>520&&!hidden);}
  var dl=document.getElementById('download');
  if('IntersectionObserver' in window){
    if(dl)new IntersectionObserver(function(es){es.forEach(function(e){hidden=e.isIntersecting;upd();});},{threshold:.15}).observe(dl);
    ['ver','size1'].forEach(function(id){
      var el=document.getElementById(id);
      if(el)new MutationObserver(mirror).observe(el,{childList:true,characterData:true,subtree:true});
    });
  }
  mirror();upd();
  addEventListener('scroll',upd,{passive:true});
})();
