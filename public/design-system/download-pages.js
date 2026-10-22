/* Shared release and download UI. Static links remain usable when metadata is offline. */
(() => {
  'use strict';
  const node = document.getElementById('download-config');
  if (!node) return;
  let config;
  try { config = JSON.parse(node.textContent); } catch { return; }
  const selectAll = selector => [...document.querySelectorAll(selector)];
  const sources = { mirror: { name: '国内镜像', prefix: 'https://gh-proxy.com/' }, backup: { name: '备用镜像', prefix: 'https://ghfast.top/' }, direct: { name: '官方直连', prefix: '' } };
  if (config.backupPrefix) sources.backup.prefix = config.backupPrefix;
  const state = { selected: config.autoSource ? 'auto' : 'mirror', automatic: 'mirror', assets: new Map(config.assets.map(asset => [asset.kind, { ...asset }])), probing: false, release: null, checksum: '' };
  const storageKey = `voyra.download.source.${config.id}`;
  try { const saved = localStorage.getItem(storageKey); if (saved === 'auto' && config.autoSource || sources[saved]) state.selected = saved; } catch {}
  const formatSize = bytes => bytes > 0 ? bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace(/\.0$/, '')} MB` : `${Math.round(bytes / 1024)} KB` : '大小以发布页为准';
  const chosen = () => state.selected === 'auto' ? state.automatic : state.selected;
  const downloadURL = (kind, fixed) => sources[fixed || chosen()].prefix + state.assets.get(kind).url;
  let toastTimer;
  function toast(message) {
    const element = document.querySelector('.dp-toast');
    if (!element) return;
    clearTimeout(toastTimer); element.textContent = message; element.hidden = false;
    toastTimer = setTimeout(() => { element.hidden = true; }, 3500);
  }
  function apply() {
    selectAll('[data-download-kind]').forEach(a => { if (state.assets.has(a.dataset.downloadKind)) a.href = downloadURL(a.dataset.downloadKind, a.dataset.fixedSource); });
    selectAll('[data-source]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.source === state.selected)); });
    const status = document.querySelector('[data-source-status]');
    if (status) status.textContent = state.selected === 'auto' ? state.probing ? '正在检测可用线路…' : `自动选择 · ${sources[chosen()].name}` : sources[chosen()].name;
    selectAll('[data-size]').forEach(el => { const asset = state.assets.get(el.dataset.size); if (asset) el.textContent = formatSize(asset.size); });
  }

  async function requestJSON(url) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 7000);
    try { const response = await fetch(url, { cache: 'no-store', signal: controller.signal }); if (!response.ok) throw Error('release unavailable'); return await response.json(); }
    finally { clearTimeout(timer); }
  }
  const officialAsset = url => typeof url === 'string' && url.startsWith(`https://github.com/${config.repo}/releases/`);
  function normalizeRelease(raw) {
    if (!raw || raw.error) return null;
    let version = String(raw.version || raw.tag_name || '').replace(/^v/i, '');
    if (!/^\d+(?:\.\d+){1,3}(?:[-+][\w.-]+)?$/.test(version)) version = `${raw.name || ''} ${raw.body || ''}`.match(/\bv(\d+(?:\.\d+){1,3})\b/)?.[1];
    if (!version) return null;
    let assets = Array.isArray(raw.assets) ? raw.assets.map(a => ({ name: a.name, url: a.url || a.browser_download_url, size: Number(a.size) || 0 })) : [];
    // GitHub assets have an API "url" as well as the actual browser download URL.
    if (raw.tag_name && Array.isArray(raw.assets)) assets = raw.assets.map(a => ({ name: a.name, url: a.browser_download_url, size: Number(a.size) || 0 }));
    if (config.id === 'billtrace' && raw.direct) assets = [{ name: 'BillTrace.apk', url: raw.direct, size: Number(raw.size) || 0 }];
    return { version, assets, published: raw.published || raw.published_at || null, sha256: raw.sha256 || '' };
  }
  async function loadRelease() {
    const endpoints = [...config.endpoints];
    const githubAPI = endpoints.find(url => url.startsWith('https://api.github.com/'));
    if (githubAPI) endpoints.push('https://gh-proxy.com/' + githubAPI);
    for (const endpoint of endpoints) {
      try {
        const release = normalizeRelease(await requestJSON(endpoint));
        if (!release) continue;
        const primary = config.assets[0];
        if (!release.assets.some(asset => new RegExp(primary.pattern, 'i').test(asset.name || '') && officialAsset(asset.url))) continue;
        state.release = release;
        for (const definition of config.assets) {
          const asset = release.assets.find(a => new RegExp(definition.pattern, 'i').test(a.name || '') && officialAsset(a.url));
          if (asset) state.assets.set(definition.kind, { ...definition, file: asset.name, url: asset.url, size: asset.size });
          else if (release.version !== config.version) state.assets.set(definition.kind, { ...state.assets.get(definition.kind), size: 0 });
        }
        selectAll('[data-version]').forEach(el => { el.textContent = `v${release.version}`; });
        const label = document.querySelector('[data-release-state]');
        if (label) {
          const date = release.published && new Date(release.published);
          label.textContent = date && !Number.isNaN(date.getTime()) ? `发布于 ${new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)}` : '已读取发布信息';
        }
        if (/^[a-f\d]{64}$/i.test(release.sha256)) {
          state.checksum = release.sha256;
          const box = document.querySelector('.dp-checksum');
          if (box) { box.hidden = false; box.querySelector('[data-sha]').textContent = release.sha256; }
        }
        apply(); return;
      } catch { /* Keep the static download links, then try the next metadata channel. */ }
    }
    const label = document.querySelector('[data-release-state]');
    if (label) label.textContent = '版本未刷新，下载入口仍可使用';
  }

  const probeControllers = new Set();
  async function probeSource(id) {
    const asset = state.assets.get(config.assets[0].kind);
    const limit = config.probeBytes || 2097152;
    const controller = new AbortController(); probeControllers.add(controller);
    const timer = setTimeout(() => controller.abort(), 7000), start = performance.now();
    try {
      const response = await fetch(sources[id].prefix + asset.url, { headers: { Range: `bytes=0-${limit - 1}` }, cache: 'no-store', signal: controller.signal });
      if (!response.ok || /text\/html/i.test(response.headers.get('content-type') || '') || !response.body) return null;
      const reader = response.body.getReader(); let count = 0;
      try { while (count < limit) { const chunk = await reader.read(); if (chunk.done) break; count += chunk.value.byteLength; } }
      finally { await reader.cancel().catch(() => {}); }
      if (!count) return null;
      return { id, speed: Math.min(limit, count) / Math.max(1, performance.now() - start) };
    } catch { return null; }
    finally { clearTimeout(timer); probeControllers.delete(controller); }
  }
  async function probeSources(force = false) {
    if (state.probing || !config.autoSource || document.hidden) return;
    if (!force) try {
      const cached = JSON.parse(sessionStorage.getItem(`${storageKey}.auto`) || 'null');
      if (cached && Date.now() - cached.time < 600000 && sources[cached.id]) { state.automatic = cached.id; apply(); return; }
    } catch {}
    state.probing = true; apply();
    const results = (await Promise.all(Object.keys(sources).map(probeSource))).filter(Boolean).sort((a, b) => b.speed - a.speed);
    state.automatic = results[0]?.id || 'mirror'; state.probing = false;
    if (results.length) try { sessionStorage.setItem(`${storageKey}.auto`, JSON.stringify({ id: state.automatic, time: Date.now() })); } catch {}
    apply();
  }

  selectAll('[data-source]').forEach(button => button.addEventListener('click', () => {
    state.selected = button.dataset.source;
    try { localStorage.setItem(storageKey, state.selected); } catch {}
    apply(); if (state.selected === 'auto') probeSources();
  }));
  const reprobe = document.querySelector('[data-reprobe]');
  if (reprobe) reprobe.addEventListener('click', () => { state.selected = 'auto'; try { localStorage.setItem(storageKey, 'auto'); } catch {} apply(); probeSources(true); });

  async function copy(text) {
    if (navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(text); return true; } catch {} }
    const previous = document.activeElement, input = document.createElement('textarea');
    input.value = text; input.setAttribute('readonly', ''); input.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(input); input.select(); let ok = false;
    try { ok = document.execCommand('copy'); } catch {} finally { input.remove(); previous?.focus(); }
    return ok;
  }
  selectAll('[data-copy-kind]').forEach(button => button.addEventListener('click', async () => { const ok = await copy(downloadURL(button.dataset.copyKind)); toast(ok ? '下载链接已复制' : '复制未成功，请长按下载按钮复制链接'); }));
  const copySha = document.querySelector('[data-copy-sha]');
  if (copySha) copySha.addEventListener('click', async () => { if (state.checksum) toast(await copy(state.checksum) ? '校验值已复制' : '复制未成功，请手动选择校验值'); });

  const tabs = selectAll('[data-shot]'), shot = document.getElementById('product-shot');
  function selectShot(button, focus = false) {
    if (!shot) return;
    shot.src = button.dataset.shot; shot.alt = `Token Monitor 软件界面：${button.dataset.shotLabel}`;
    selectAll('[data-shot-enlarge]').forEach(a => { a.href = button.dataset.shot; });
    tabs.forEach(tab => { const selected = tab === button; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; });
    document.getElementById('product-shot-panel')?.setAttribute('aria-labelledby', button.id);
    if (focus) button.focus();
  }
  tabs.forEach((button, index) => {
    button.addEventListener('click', () => selectShot(button));
    button.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (target !== undefined) { event.preventDefault(); selectShot(tabs[target], true); }
    });
  });
  const browserTip = document.querySelector('[data-browser-tip]');
  if (browserTip && /MicroMessenger|\bQQ\//i.test(navigator.userAgent)) browserTip.hidden = false;
  const visibility = () => { document.body.toggleAttribute('data-page-hidden', document.hidden); if (document.hidden) probeControllers.forEach(controller => controller.abort()); };
  document.addEventListener('visibilitychange', visibility); visibility();
  apply(); loadRelease().then(() => { if (state.selected === 'auto') probeSources(); });
})();
