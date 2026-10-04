// 首屏 Hero 分层素材预加载
// 原为 index.html 里的内联 <script>。为配合 CSP 移除 script-src 的 'unsafe-inline'
// （内联脚本可被注入直接执行，是 XSS 的主要落点）而外置为本文件。
// 仅在首页（hash 为空 / #/ / #/?...）时预加载，避免在其他路由浪费带宽。
if (!location.hash || location.hash === '#/' || location.hash.startsWith('#/?')) {
  [
    ['/hero/voyra-person-skin-v3.webp', 'auto'],
    ['/hero/voyra-person-body-v2.webp', 'high'],
    ['/hero/voyra-person-hair-v2.webp', 'auto'],
    ['/hero/voyra-person-collar-v2.webp', 'auto'],
  ].forEach(([href, fetchPriority]) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    link.fetchPriority = fetchPriority;
    document.head.appendChild(link);
  });
}
