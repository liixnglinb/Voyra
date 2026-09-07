import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import electronAPI from './browser-api'

// 云端版本：用 HTTP 实现的 electronAPI 注入全局，页面代码无需改动
window.electronAPI = electronAPI

// 分包加载失败自愈：部署换版后旧 hash 分包 404、或网络抖动导致动态 import 失败时，
// 页面会一直停在加载动画。监听 Vite 的 preloadError，自动整页重载一次拉取新资源；
// 用 sessionStorage 防止资源真损坏时陷入无限刷新循环。
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('voyra-preload-retry')) {
    sessionStorage.setItem('voyra-preload-retry', '1');
    window.location.reload();
  } else {
    sessionStorage.removeItem('voyra-preload-retry');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
