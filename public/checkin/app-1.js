(function(){
  const announce = document.querySelector('.announce');
  const nav = document.querySelector('.nav');
  let ticking = false;
  
  function onScroll(){
    const scrollY = window.scrollY || window.pageYOffset;
    
    /* 公告横幅渐隐 + 上移。
       渐隐终点必须与导航的收缩阈值（scrollY > 60 → .scrolled → nav 顶到 top:16px）
       对齐：公告条是 fixed top:0、高 40px，导航 scrolled 后占据 16–66px，两者重叠。
       公告 z-index(101) 高于导航(100)，若渐隐没走完，深色半透明带会压在胶囊导航上沿。
       原先 0–80px 渐隐，而导航 60px 就已上移 → 60–80px 这段窗口正好压上。收到 0–60px，
       让公告在导航开始移动的同一帧就已完全退场。 */
    if(announce){
      const opacity = Math.max(0, 1 - scrollY / 60);
      announce.style.opacity = opacity;
      announce.style.transform = 'translateY(' + (-scrollY * 0.5) + 'px)';
      announce.style.pointerEvents = opacity > 0 ? 'auto' : 'none';
    }
    
    // 导航栏收缩：超过 60px 添加 scrolled class
    if(nav){
      if(scrollY > 60){
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }
    
    ticking = false;
  }
  
  window.addEventListener('scroll', function(){
    if(!ticking){
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, {passive: true});
  
  // 滚动渐入动画
  const revealElements = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && revealElements.length > 0){
    const observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    revealElements.forEach(function(el){
      observer.observe(el);
    });
  } else {
    // 降级：直接显示
    revealElements.forEach(function(el){
      el.classList.add('visible');
    });
  }
  
  // 初始化
  onScroll();
})();
