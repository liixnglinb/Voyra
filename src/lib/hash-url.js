/* HashRouter 站点的站内链接构造。
   ---------------------------------------------------------------------------
   本项目用 HashRouter（见 src/main.jsx），路由住在 location.hash 里 ——
   所以站内目标必须写成 `#/timetable` 这种形式。

   写成裸路径 `/timetable` 会出问题：浏览器把它当成服务端路径去请求，
   HashRouter 读到的 hash 是空的，于是永远匹配到 `/` 渲染首页，
   表现为「点卡片没反应 / 跳不到对应页面」。

   为什么要拼上 origin + pathname 而不是直接给 `#/timetable`：
   站点可能部署在子路径下（如 GitHub Pages 的 /repo/），
   绝对形式能保证 hash 永远落在正确的 pathname 之后，
   同时绕开「当前已在同一 hash 上时点击不触发导航」的边界情况。
   --------------------------------------------------------------------------- */
export function toHashUrl(path) {
  return `${window.location.origin}${window.location.pathname}#${path}`;
}
