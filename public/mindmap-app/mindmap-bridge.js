
/*
 * Browser persistence bridge
 *
 * The original standalone canvas expects a local /api service. In Voyra it is
 * hosted in an iframe, so the parent page supplies the existing Bmob-backed
 * data API. Legacy tree mindmaps are imported once into the original canvas
 * workspace format without changing or deleting the legacy source data.
 */
(function () {
  'use strict';

  const WORKSPACE_KEY = 'mindmap-workspace';
  const LEGACY_KEY = 'mindmaps';
  const HISTORY_KEY = 'mindmap-history';
  const nativeFetch = window.fetch.bind(window);

  function response(value, status) {
    return new Response(value === undefined ? '' : JSON.stringify(value), {
      status: status || 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  function getDataApi() {
    try {
      return window.parent && window.parent !== window
        ? window.parent.electronAPI
        : window.electronAPI;
    } catch (_) {
      return null;
    }
  }

  async function load(key) {
    const api = getDataApi();
    if (api && typeof api.loadData === 'function') return api.loadData(key);
    try { return JSON.parse(localStorage.getItem('voyra-' + key) || 'null'); } catch (_) { return null; }
  }

  async function save(key, value) {
    const api = getDataApi();
    if (api && typeof api.saveData === 'function') return api.saveData(key, value);
    localStorage.setItem('voyra-' + key, JSON.stringify(value));
    return { ok: true };
  }

  async function remove(key) {
    const api = getDataApi();
    if (api && typeof api.deleteData === 'function') return api.deleteData(key);
    localStorage.removeItem('voyra-' + key);
    return { ok: true };
  }

  function legacyMaps(legacy) {
    if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return [];
    return Object.values(legacy).filter((item) => item && item.root && typeof item.root === 'object');
  }

  function convertLegacyMap(map) {
    const flat = [];
    (function visit(node, parent) {
      if (!node || typeof node !== 'object') return;
      flat.push({ node: node, parent: parent });
      (Array.isArray(node.children) ? node.children : []).forEach((child) => visit(child, node));
    }(map.root, null));

    const minX = Math.min.apply(null, flat.map((item) => Number(item.node.x) || 0));
    const minY = Math.min.apply(null, flat.map((item) => Number(item.node.y) || 0));
    const ids = new Map();
    flat.forEach((item, index) => ids.set(item.node, index + 1));

    const nodes = flat.map((item) => {
      const old = item.node;
      const children = Array.isArray(old.children) ? old.children : [];
      const kind = item.parent === null ? 'root' : children.length ? 'branch' : 'leaf';
      const text = String(old.text || '未命名主题');
      return {
        id: ids.get(old),
        type: 'text',
        name: text,
        input: text,
        x: (Number(old.x) || 0) - minX + 340,
        y: (Number(old.y) || 0) - minY + 260,
        w: 120,
        ports: true,
        status: 'idle',
        output: null,
        config: {
          kind: kind,
          legacyNodeId: String(old.id || ''),
          note: typeof old.note === 'string' ? old.note : '',
          noteType: typeof old.noteType === 'string' ? old.noteType : '',
        },
      };
    });

    const edges = flat
      .filter((item) => item.parent)
      .map((item) => ({
        id: 'legacy-edge-' + ids.get(item.parent) + '-' + ids.get(item.node),
        from: ids.get(item.parent),
        fromSide: 'right',
        to: ids.get(item.node),
        toSide: 'left',
      }));

    return { nodes: nodes, edges: edges };
  }

  async function workflow() {
    const existing = await load(WORKSPACE_KEY);
    if (existing && typeof existing === 'object' && (existing.canvases || Array.isArray(existing.nodes))) {
      return existing;
    }

    const maps = legacyMaps(await load(LEGACY_KEY));
    const canvases = {};
    maps.forEach((map, index) => { canvases[index + 1] = convertLegacyMap(map); });
    const migrated = {
      nodes: (canvases[1] || { nodes: [] }).nodes,
      edges: (canvases[1] || { edges: [] }).edges,
      activeCanvas: 1,
      canvases: Object.keys(canvases).length ? canvases : { 1: { nodes: [], edges: [] } },
      migratedFrom: LEGACY_KEY,
      migratedAt: new Date().toISOString(),
    };
    await save(WORKSPACE_KEY, migrated);
    return migrated;
  }

  async function requestBody(input, init) {
    if (init && typeof init.body === 'string') return init.body;
    if (input instanceof Request) return input.clone().text();
    return '';
  }

  window.fetch = async function bridgedFetch(input, init) {
    const rawUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(rawUrl, window.location.href);
    if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init);

    const method = String((init && init.method) || (input instanceof Request && input.method) || 'GET').toUpperCase();
    try {
      if (url.pathname === '/api/workflow') {
        if (method === 'GET') return response(await workflow());
        if (method === 'PUT') {
          const text = await requestBody(input, init);
          const next = text ? JSON.parse(text) : {};
          await save(WORKSPACE_KEY, next);
          return response({ ok: true });
        }
      }

      if (url.pathname === '/api/history') {
        if (method === 'GET') return response((await load(HISTORY_KEY)) || []);
        if (method === 'POST') {
          const text = await requestBody(input, init);
          const record = text ? JSON.parse(text) : {};
          const history = (await load(HISTORY_KEY)) || [];
          const saved = { ...record, id: record.id || record.clientId || 'history-' + Date.now() };
          await save(HISTORY_KEY, [saved, ...history].slice(0, 500));
          return response(saved);
        }
        if (method === 'DELETE') {
          await remove(HISTORY_KEY);
          return response({ ok: true });
        }
      }

      if (url.pathname === '/api/settings') {
        if (method === 'GET') return response({ keys: {}, providerSettings: {} });
        if (method === 'PUT') return response({ ok: true });
      }

      if (url.pathname === '/api/provider-request') {
        return response({ message: '此网站未启用 API 密钥功能。' }, 501);
      }

      return response({ message: '未找到服务。' }, 404);
    } catch (error) {
      console.error('Mindmap persistence bridge failed', error);
      return response({ message: error && error.message ? error.message : '数据服务暂不可用。' }, 503);
    }
  };
}());
