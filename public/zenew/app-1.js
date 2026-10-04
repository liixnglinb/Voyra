(function(){
  var BASE='https://github.com/liixnglinb/Zenew/releases/latest/download/';
  fetch('https://api.github.com/repos/liixnglinb/Zenew/releases/latest').then(function(r){return r.ok?r.json():null}).then(function(rel){
    if(!rel||!rel.tag_name)return;
    var v=rel.tag_name;
    document.getElementById('ver').textContent=v;
    document.getElementById('ver2').textContent=v;
    (rel.assets||[]).forEach(function(a){
      if(a.name==='Zenew-Setup.exe')fmt('size1',a.size);
    });
  }).catch(function(){});
  function fmt(id,size){
    var el=document.getElementById(id);if(!el||!size)return;
    el.textContent=(size/1048576).toFixed(1)+' MB';
  }
})();
