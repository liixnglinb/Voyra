/* 动态版本号：从 GitHub Releases 拉取最新版本，覆盖页面上写死的版本号与安装包体积。
   失败时保留写死值作兜底。改本页文案无需再改此脚本（按 vX.Y.Z / NNMB 模式匹配）。 */
(function(){
  var API = 'https://api.github.com/repos/liixnglinb/Superstar-checkin/releases/latest';
  function walk(fn){
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = walker.nextNode())) { fn(node); }
  }
  function applyLatest(rel){
    if (!rel || !rel.tag_name) return;
    var ver = String(rel.tag_name).replace(/^v/i, '');
    if (!/^\d+\.\d+\.\d+/.test(ver)) return;
    var asset = (rel.assets || []).filter(function(a){ return /\.exe$/i.test(a.name || ''); })[0];
    var mb = asset && asset.size ? Math.round(asset.size / 1048576) : 0;
    walk(function(node){
      // 更新日志（#changelog）里的版本号是历史版本号，不能被本脚本覆盖（否则 v3.6.0→v3.9.0 全被改写）
      if (node.parentElement && node.parentElement.closest && node.parentElement.closest('#changelog')) return;
      var t = node.nodeValue;
      if (!t) return;
      var n = t.replace(/v\d+\.\d+\.\d+/g, 'v' + ver);
      if (mb) n = n.replace(/\d+(\.\d+)?\s*MB/g, mb + 'MB');
      if (n !== t) node.nodeValue = n;
    });
  }
  fetch(API, {cache: 'no-store'})
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(applyLatest)
    .catch(function(){});
})();
