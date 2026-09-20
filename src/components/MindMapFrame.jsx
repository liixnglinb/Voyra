import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import RouteLoader from './RouteLoader';
import { isAuthed } from '../lib/auth';

/**
 * MindMapFrame — 独立思维导图（全屏嵌入 /mindmap-app/）
 * 进入即自动加载，无需点击进入。
 *
 * 2026-09-20：思维导图数据上云（登录后跨设备跟随）
 *  - iframe 与主站同源、共享 localStorage，子应用把画布存在 `canvas-workflow` 键
 *  - 挂载时：登录用户先从云端拉取画布写入 localStorage，再加载 iframe（保证 iframe 首屏即为云端最新）
 *    云端无数据而本机有 → 把本机画布首推上云（老用户迁移路径）
 *  - 子应用自动保存（写 localStorage）会触发父窗口 storage 事件 → 防抖 2s 推云端
 *  - 多设备同时编辑以「最后保存者胜」，暂不做合并
 */
const CLOUD_KEY = 'mindmap-workflow-v1';
const LS_KEY = 'canvas-workflow';

export default function MindMapFrame() {
  const [status, setStatus] = useState({ ready: false, port: 18880, url: null });
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  /* 未登录时直接就绪；登录时等云端拉取完成（或 8s 超时兜底）再加载 iframe */
  const [cloudReady, setCloudReady] = useState(!isAuthed());
  const iframeRef = useRef(null);
  const mountedRef = useRef(false);
  const pushTimer = useRef(0);

  /* 进入即获取地址 */
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const s = await window.electronAPI?.mindmapStatus?.();
        if (mountedRef.current && s) setStatus(s);
      } catch {}
    })();
    return () => { mountedRef.current = false; };
  }, []);

  /* 云端 ↔ 本机 localStorage 桥接（登录时执行一次） */
  useEffect(() => {
    mountedRef.current = true;
    const failSafe = setTimeout(() => mountedRef.current && setCloudReady(true), 8000);
    (async () => {
      try {
        if (isAuthed()) {
          const cloud = await window.electronAPI?.loadData?.(CLOUD_KEY);
          if (mountedRef.current && cloud && typeof cloud === 'object') {
            try { localStorage.setItem(LS_KEY, JSON.stringify(cloud)); } catch { /* ignore */ }
          } else if (mountedRef.current) {
            const local = localStorage.getItem(LS_KEY);
            if (local) {
              try {
                const parsed = JSON.parse(local);
                if (parsed && typeof parsed === 'object') await window.electronAPI?.saveData?.(CLOUD_KEY, parsed);
              } catch { /* ignore */ }
            }
          }
        }
      } catch { /* ignore */ }
      if (mountedRef.current) setCloudReady(true);
    })();
    return () => { mountedRef.current = false; clearTimeout(failSafe); };
  }, []);

  /* 子应用自动保存（写 localStorage）→ 父窗口 storage 事件 → 防抖 2s 推云端 */
  useEffect(() => {
    const onStorage = (e) => {
      if (!e || e.key !== LS_KEY || !isAuthed()) return;
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        try {
          const v = localStorage.getItem(LS_KEY);
          if (!v) return;
          const parsed = JSON.parse(v);
          if (parsed && typeof parsed === 'object') await window.electronAPI?.saveData?.(CLOUD_KEY, parsed);
        } catch { /* ignore */ }
      }, 2000);
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearTimeout(pushTimer.current);
    };
  }, []);

  /* 未就绪时轮询 */
  useEffect(() => {
    if (status.ready) return;
    const poll = setInterval(async () => {
      try {
        const s = await window.electronAPI?.mindmapStatus?.();
        if (mountedRef.current && s) setStatus(s);
        if (s?.ready) clearInterval(poll);
      } catch {}
    }, 600);
    const timer = setTimeout(() => clearInterval(poll), 30000);
    return () => { clearInterval(poll); clearTimeout(timer); };
  }, [status.ready]);

  const handleFrameLoad = () => {
    if (mountedRef.current) setFrameLoaded(true);
  };

  const frameSrc = cloudReady && status.url ? status.url : 'about:blank';

  if (loadFailed && !status.ready) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
        <div style={{ color: '#111111', fontSize: 14, fontWeight: 500 }}>思维导图服务启动失败</div>
        <button
          onClick={() => { setLoadFailed(false); window.location.reload(); }}
          style={{ marginTop: 16, padding: '8px 16px', borderRadius: 10, border: '1px solid #ECECF0', background: '#FFFFFF', color: '#111111', fontSize: 13, cursor: 'pointer' }}
        >
          <RefreshCw size={14} /> 重试
        </button>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative', background: '#FFFFFF' }}>
      <iframe
        ref={iframeRef}
        src={frameSrc}
        title="思维导图"
        sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
        style={{
          width: '100%', height: '100%', border: 'none', display: 'block',
          opacity: frameLoaded ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
        onLoad={handleFrameLoad}
      />
      {!frameLoaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF' }}>
          <RouteLoader variant="mindmap" />
        </div>
      )}
    </div>
  );
}
