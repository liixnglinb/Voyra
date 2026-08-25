import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleDot, FilePlus2, GitBranch, LocateFixed, Minus, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'mindmaps';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeRoot(text = '新思维导图') {
  return { id: 'root', text, children: [], x: 0, y: 0, note: '', noteType: 'text' };
}

function makeMap() {
  const id = `mm_${Date.now().toString(36)}`;
  return { id, root: makeRoot() };
}

function normalizeNode(node) {
  return {
    ...node,
    text: typeof node?.text === 'string' ? node.text : (node?.label || '未命名节点'),
    children: Array.isArray(node?.children) ? node.children.map(normalizeNode) : [],
  };
}

function normalizeMaps(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([, map]) => map?.root)
    .map(([id, map]) => [id, { ...map, id: map.id || id, root: normalizeNode(map.root) }]));
}

function findNode(node, id) {
  if (node.id === id) return node;
  for (const child of node.children || []) {
    const result = findNode(child, id);
    if (result) return result;
  }
  return null;
}

function updateNode(node, id, updater) {
  if (node.id === id) return updater(node);
  return { ...node, children: (node.children || []).map((child) => updateNode(child, id, updater)) };
}

function removeNode(node, id) {
  return {
    ...node,
    children: (node.children || []).filter((child) => child.id !== id).map((child) => removeNode(child, id)),
  };
}

function nodeCount(node) {
  return 1 + (node.children || []).reduce((total, child) => total + nodeCount(child), 0);
}

function flattenNodes(node, nodes = [], links = []) {
  if (!node) return { nodes, links };
  nodes.push(node);
  (node.children || []).forEach((child) => {
    links.push({ from: node, to: child });
    flattenNodes(child, nodes, links);
  });
  return { nodes, links };
}

function MindMapCanvas({ mapId, root, selectedId, status, onSelect, onMove }) {
  const canvasRef = useRef(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [gesture, setGesture] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const draggedRef = useRef(false);
  const { nodes, links } = useMemo(() => flattenNodes(root), [root]);

  const centerCanvas = useCallback(() => {
    if (!viewport.width || !viewport.height || nodes.length === 0) return;
    const nodeWidth = 154;
    const nodeHeight = 44;
    const left = Math.min(...nodes.map((node) => Number(node.x) || 0));
    const top = Math.min(...nodes.map((node) => Number(node.y) || 0));
    const right = Math.max(...nodes.map((node) => (Number(node.x) || 0) + nodeWidth));
    const bottom = Math.max(...nodes.map((node) => (Number(node.y) || 0) + nodeHeight));
    const contentWidth = Math.max(nodeWidth, right - left);
    const contentHeight = Math.max(nodeHeight, bottom - top);
    const nextZoom = Math.min(1.15, Math.max(0.55, Math.min((viewport.width - 120) / contentWidth, (viewport.height - 120) / contentHeight)));
    setZoom(nextZoom);
    setPan({
      x: viewport.width / 2 - (left + contentWidth / 2) * nextZoom,
      y: viewport.height / 2 - (top + contentHeight / 2) * nextZoom,
    });
  }, [nodes, viewport.height, viewport.width]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    centerCanvas();
  // Only switch maps or resize the canvas. Moving and renaming nodes must keep the user's view stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapId, viewport.width, viewport.height]);

  const beginPan = (event) => {
    if (event.button !== 0) return;
    setGesture({ type: 'pan', startX: event.clientX, startY: event.clientY, baseX: pan.x, baseY: pan.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const beginNodeDrag = (event, node) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    draggedRef.current = false;
    onSelect(node.id);
    setGesture({
      type: 'node',
      id: node.id,
      startX: event.clientX,
      startY: event.clientY,
      baseX: Number(node.x) || 0,
      baseY: Number(node.y) || 0,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!gesture) return;
    if (gesture.type === 'pan') {
      setPan({ x: gesture.baseX + event.clientX - gesture.startX, y: gesture.baseY + event.clientY - gesture.startY });
      return;
    }
    const next = {
      x: Math.round((event.clientX - gesture.startX) / zoom),
      y: Math.round((event.clientY - gesture.startY) / zoom),
    };
    if (Math.abs(next.x) > 2 || Math.abs(next.y) > 2) draggedRef.current = true;
    setDragOffset(next);
  };

  const handlePointerUp = () => {
    if (gesture?.type === 'node' && draggedRef.current) {
      onMove(gesture.id, gesture.baseX + dragOffset.x, gesture.baseY + dragOffset.y);
    }
    setGesture(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleNodeClick = (node) => {
    if (!draggedRef.current) onSelect(node.id);
    draggedRef.current = false;
  };

  const handleWheel = (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom((current) => Math.max(0.45, Math.min(1.6, current + (event.deltaY < 0 ? 0.08 : -0.08))));
  };

  return <section className="mmc-stage">
    <header className="mmc-stage-head">
      <div className="mmc-stage-title"><GitBranch size={18} />画布视图</div>
      <div className="mmc-canvas-controls" aria-label="画布视图控制">
        <span className="mmc-status" aria-live="polite">{status}</span>
        <button type="button" title="缩小" aria-label="缩小" onClick={() => setZoom((current) => Math.max(0.45, current - 0.1))}><Minus size={14} /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" title="放大" aria-label="放大" onClick={() => setZoom((current) => Math.min(1.6, current + 0.1))}><Plus size={14} /></button>
        <button type="button" title="居中显示" aria-label="居中显示" onClick={centerCanvas}><LocateFixed size={14} /></button>
      </div>
    </header>
    <div
      ref={canvasRef}
      className={`mmc-canvas${gesture?.type === 'pan' ? ' is-panning' : ''}`}
      onPointerDown={beginPan}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div className="mmc-grid" style={{ backgroundPosition: `${pan.x}px ${pan.y}px`, backgroundSize: `${28 * zoom}px ${28 * zoom}px` }} />
      <div className="mmc-plane" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        <svg className="mmc-links" aria-hidden="true">
          {links.map(({ from, to }) => {
            const fromX = (Number(from.x) || 0) + 154;
            const fromY = (Number(from.y) || 0) + 22;
            const toX = Number(to.x) || 0;
            const toY = (Number(to.y) || 0) + 22;
            const bend = Math.max(42, Math.abs(toX - fromX) * 0.45);
            return <path key={`${from.id}-${to.id}`} d={`M ${fromX} ${fromY} C ${fromX + bend} ${fromY}, ${toX - bend} ${toY}, ${toX} ${toY}`} />;
          })}
        </svg>
        {nodes.map((node) => {
          const offset = gesture?.type === 'node' && gesture.id === node.id ? dragOffset : { x: 0, y: 0 };
          const isSelected = selectedId === node.id;
          return <button
            type="button"
            key={node.id}
            className={`mmc-canvas-node${isSelected ? ' is-selected' : ''}`}
            style={{ left: (Number(node.x) || 0) + offset.x, top: (Number(node.y) || 0) + offset.y }}
            onPointerDown={(event) => beginNodeDrag(event, node)}
            onClick={() => handleNodeClick(node)}
            title={node.text || '未命名节点'}
          >
            <CircleDot size={14} /><span>{node.text || '未命名节点'}</span>
          </button>;
        })}
      </div>
    </div>
  </section>;
}

export default function MindMapCollectionEditor() {
  const [maps, setMaps] = useState({});
  const [activeMapId, setActiveMapId] = useState(null);
  const [selectedId, setSelectedId] = useState('root');
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      window.electronAPI?.loadData?.(STORAGE_KEY),
      window.electronAPI?.loadData?.('voyra-mindmap'),
    ]).then(([saved, singleMap]) => {
      if (!active) return;
      const imported = normalizeMaps(saved);
      if (Object.keys(imported).length > 0) {
        setMaps(imported);
        setActiveMapId(Object.keys(imported)[0]);
        return;
      }
      if (singleMap?.id && Array.isArray(singleMap.children)) {
        const id = 'voyra-default';
        setMaps({ [id]: { id, root: normalizeNode(singleMap) } });
        setActiveMapId(id);
        return;
      }
      const first = makeMap();
      setMaps({ [first.id]: first });
      setActiveMapId(first.id);
    }).catch(() => {
      if (!active) return;
      const first = makeMap();
      setMaps({ [first.id]: first });
      setActiveMapId(first.id);
    }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  const entries = useMemo(() => Object.entries(maps), [maps]);
  const activeMap = activeMapId ? maps[activeMapId] : null;
  const selected = useMemo(() => activeMap ? findNode(activeMap.root, selectedId) || activeMap.root : null, [activeMap, selectedId]);

  const selectMap = (id) => {
    setActiveMapId(id);
    setSelectedId('root');
    setStatus('');
  };

  const updateActiveRoot = (root) => {
    if (!activeMapId) return;
    setMaps((current) => ({ ...current, [activeMapId]: { ...current[activeMapId], root } }));
  };

  const moveNode = (id, x, y) => {
    if (!activeMap) return;
    updateActiveRoot(updateNode(activeMap.root, id, (node) => ({ ...node, x, y })));
  };

  const rename = (text) => {
    if (!activeMap || !selected) return;
    updateActiveRoot(updateNode(activeMap.root, selected.id, (node) => ({ ...node, text })));
  };

  const addChild = () => {
    if (!activeMap || !selected) return;
    const id = `n_${Date.now().toString(36)}`;
    updateActiveRoot(updateNode(activeMap.root, selected.id, (node) => ({
      ...node,
      children: [...(node.children || []), {
        id,
        text: '新节点',
        children: [],
        x: (Number(node.x) || 0) + 240,
        y: (Number(node.y) || 0) + (node.children?.length || 0) * 74,
        note: '',
        noteType: 'text',
      }],
    })));
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (!activeMap || !selected || selected.id === activeMap.root.id) return;
    updateActiveRoot(removeNode(activeMap.root, selected.id));
    setSelectedId(activeMap.root.id);
  };

  const createMap = () => {
    const next = makeMap();
    setMaps((current) => ({ ...current, [next.id]: next }));
    setActiveMapId(next.id);
    setSelectedId('root');
    setStatus('新建导图，编辑后点击保存');
  };

  const resetMap = () => {
    if (!activeMapId || !activeMap) return;
    updateActiveRoot(makeRoot(activeMap.root.text || '新思维导图'));
    setSelectedId('root');
    setStatus('已恢复当前导图的默认结构');
  };

  const deleteMap = async () => {
    if (!activeMapId || entries.length < 2) return;
    if (!window.confirm('删除当前思维导图？此操作会在保存后同步到云端。')) return;
    const next = { ...maps };
    delete next[activeMapId];
    const nextId = Object.keys(next)[0];
    setMaps(next);
    setActiveMapId(nextId);
    setSelectedId('root');
    setStatus('已删除，正在同步');
    try {
      await window.electronAPI?.saveData?.(STORAGE_KEY, next);
      setStatus('已保存');
    } catch {
      setStatus('保存失败');
    }
  };

  const save = async () => {
    setStatus('正在保存');
    try {
      await window.electronAPI?.saveData?.(STORAGE_KEY, maps);
      setStatus('已保存');
    } catch {
      setStatus('保存失败');
    }
  };

  return <div className="mmc-page">
    <style>{`
      .mmc-page { display:grid; grid-template-columns:190px minmax(0,1fr) 244px; gap:18px; min-height:580px; }
      .mmc-library,.mmc-stage { border:1px solid rgba(27,27,27,.13); border-radius:8px; background:rgba(255,255,255,.9); }
      .mmc-library { display:flex; min-height:580px; flex-direction:column; padding:14px; }
      .mmc-library-head,.mmc-stage-head,.mmc-inspector-head { display:flex; align-items:center; gap:8px; color:#1b1b1b; font-size:13px; font-weight:760; }.mmc-library-head svg,.mmc-stage-title svg,.mmc-inspector-head svg { color:#a48830; }
      .mmc-library-head span { margin-left:auto; color:#999; font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; font-weight:400; }
      .mmc-map-list { display:grid; gap:6px; margin-top:16px; overflow:auto; }.mmc-map { display:grid; grid-template-columns:23px minmax(0,1fr); gap:7px; width:100%; border:1px solid transparent; border-radius:6px; padding:9px 7px; background:transparent; color:#666; text-align:left; cursor:pointer; transition:border-color .18s ease,background .18s ease,color .18s ease; }.mmc-map:hover { border-color:rgba(27,27,27,.14); background:#fff9df; color:#1b1b1b; }.mmc-map.is-active { border-color:#d9bd51; background:#ffe08a; color:#1b1b1b; }.mmc-map-index { color:#999; font:10px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; }.mmc-map strong { display:block; overflow:hidden; font-size:12px; line-height:1.35; text-overflow:ellipsis; white-space:nowrap; }.mmc-map em { display:block; margin-top:3px; color:#999; font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; font-style:normal; }
      .mmc-new-map { display:inline-flex; align-items:center; justify-content:center; gap:6px; width:100%; margin-top:auto; border:1px solid rgba(27,27,27,.16); border-radius:6px; min-height:35px; background:#fff; color:#555; font-size:12px; font-weight:700; cursor:pointer; transition:border-color .18s ease,background .18s ease,color .18s ease; }.mmc-new-map:hover { border-color:#a48830; background:#fff9df; color:#1b1b1b; }
      .mmc-stage { position:relative; min-width:0; display:flex; min-height:580px; flex-direction:column; overflow:hidden; }.mmc-stage-head { position:relative; z-index:2; justify-content:space-between; padding:13px 17px; border-bottom:1px solid rgba(27,27,27,.11); background:rgba(255,255,255,.94); }.mmc-stage-title { display:flex; align-items:center; gap:8px; }.mmc-canvas-controls { display:flex; align-items:center; gap:5px; color:#888; font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }.mmc-canvas-controls button { display:grid; width:25px; height:25px; place-items:center; border:1px solid rgba(27,27,27,.14); border-radius:5px; background:#fff; color:#666; cursor:pointer; }.mmc-canvas-controls button:hover { border-color:#a48830; color:#1b1b1b; background:#fff9df; }.mmc-canvas-controls > span:not(.mmc-status) { width:36px; text-align:center; }.mmc-status { margin-right:5px; color:#888; white-space:nowrap; }
      .mmc-canvas { position:relative; flex:1; min-height:520px; overflow:hidden; cursor:grab; touch-action:none; background:#fff; }.mmc-canvas.is-panning { cursor:grabbing; }.mmc-grid { position:absolute; inset:0; opacity:.75; pointer-events:none; background-image:linear-gradient(rgba(27,27,27,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(27,27,27,.06) 1px,transparent 1px); }.mmc-plane { position:absolute; left:0; top:0; width:0; height:0; transform-origin:0 0; }.mmc-links { position:absolute; overflow:visible; width:1px; height:1px; }.mmc-links path { fill:none; stroke:rgba(27,27,27,.25); stroke-width:1.7px; stroke-linecap:round; }.mmc-canvas-node { position:absolute; display:inline-flex; align-items:center; gap:8px; width:154px; min-height:44px; padding:9px 12px; overflow:hidden; border:1px solid rgba(27,27,27,.16); border-radius:7px; background:#fff; color:#333; box-shadow:0 1px 2px rgba(27,27,27,.05); font:600 12.5px/1.3 Inter,ui-sans-serif,system-ui,sans-serif; text-align:left; cursor:grab; user-select:none; transition:border-color .18s ease,background .18s ease,box-shadow .18s ease; }.mmc-canvas-node:hover { border-color:#a48830; background:#fff9df; box-shadow:0 5px 16px -10px rgba(27,27,27,.25); }.mmc-canvas-node.is-selected { border-color:#d9bd51; background:#ffe08a; color:#1b1b1b; box-shadow:0 5px 18px -12px rgba(164,132,48,.8); }.mmc-canvas-node svg { flex:0 0 auto; color:#a48830; }.mmc-canvas-node span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .mmc-inspector { align-self:start; border-top:1px solid rgba(27,27,27,.13); border-bottom:1px solid rgba(27,27,27,.13); padding:16px 0; }.mmc-inspector-head { justify-content:space-between; }.mmc-icon-button { display:grid; width:28px; height:28px; place-items:center; border:1px solid rgba(27,27,27,.15); border-radius:5px; background:#fff; color:#777; cursor:pointer; }.mmc-icon-button:hover { border-color:#cf5252; background:#fff2f2; color:#b53838; }.mmc-label { display:block; margin-top:24px; color:#777; font-size:11px; font-weight:700; }.mmc-input { width:100%; margin-top:7px; border:1px solid rgba(27,27,27,.17); border-radius:6px; padding:9px 10px; color:#1b1b1b; background:#fff; font:13px/1.4 inherit; outline:none; }.mmc-input:focus { border-color:#1b1b1b; box-shadow:0 0 0 3px rgba(255,224,138,.5); }
      .mmc-actions { display:grid; gap:8px; margin-top:16px; }.mmc-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; width:100%; min-height:34px; border:1px solid rgba(27,27,27,.16); border-radius:6px; background:#fff; color:#555; font-size:12px; font-weight:700; cursor:pointer; transition:background .18s ease,border-color .18s ease,color .18s ease; }.mmc-btn:hover { border-color:#a48830; background:#fff9df; color:#1b1b1b; }.mmc-btn.primary { border-color:#1b1b1b; background:#1b1b1b; color:#fff; }.mmc-btn.primary:hover { background:#3a3a3a; }.mmc-btn.danger:hover { border-color:#cf5252; background:#fff2f2; color:#b53838; }.mmc-note { margin:18px 0 0; color:#999; font-size:11px; line-height:1.65; }
      @media (max-width:900px) { .mmc-page { grid-template-columns:166px minmax(0,1fr); }.mmc-stage { min-height:540px; }.mmc-inspector { grid-column:1/-1; display:grid; grid-template-columns:minmax(0,1fr) 1fr; gap:12px; align-items:end; padding:0 0 16px; }.mmc-inspector-head { grid-column:1/-1; }.mmc-label { margin:0; }.mmc-actions { grid-template-columns:repeat(3,minmax(0,1fr)); margin:0; }.mmc-actions .primary { grid-column:1/-1; }.mmc-note { grid-column:1/-1; margin:0; } }
      @media (max-width:620px) { .mmc-page { grid-template-columns:1fr; gap:20px; }.mmc-library { min-height:0; }.mmc-map-list { grid-template-columns:repeat(2,minmax(0,1fr)); }.mmc-new-map { margin-top:12px; }.mmc-stage { min-height:430px; }.mmc-canvas { min-height:430px; }.mmc-inspector { grid-column:auto; grid-template-columns:1fr; }.mmc-actions { grid-template-columns:repeat(2,minmax(0,1fr)); }.mmc-actions .primary { grid-column:1/-1; } }
    `}</style>
    <aside className="mmc-library" aria-label="思维导图列表"><div className="mmc-library-head"><GitBranch size={17} />思维导图<span>{String(entries.length).padStart(2, '0')}</span></div><div className="mmc-map-list">{entries.map(([id, map], index) => <button type="button" className={`mmc-map${id === activeMapId ? ' is-active' : ''}`} onClick={() => selectMap(id)} key={id}><span className="mmc-map-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{map.root.text || '未命名导图'}</strong><em>{nodeCount(map.root)} 个节点</em></span></button>)}</div><button type="button" className="mmc-new-map" onClick={createMap}><FilePlus2 size={15} />新建导图</button></aside>
    {activeMap && <MindMapCanvas mapId={activeMapId} root={activeMap.root} selectedId={selected?.id} status={loaded ? status || '可编辑' : '正在加载'} onSelect={setSelectedId} onMove={moveNode} />}
    <aside className="mmc-inspector"><div className="mmc-inspector-head"><span><CircleDot size={17} />节点编辑</span>{entries.length > 1 && <button type="button" className="mmc-icon-button" onClick={deleteMap} title="删除当前导图" aria-label="删除当前导图"><Trash2 size={14} /></button>}</div><label className="mmc-label" htmlFor="mindmap-node-name">节点名称</label><input id="mindmap-node-name" className="mmc-input" value={selected?.text || ''} onChange={(event) => rename(event.target.value)} /><div className="mmc-actions"><button type="button" className="mmc-btn" onClick={addChild}><Plus size={15} />新建子节点</button><button type="button" className="mmc-btn danger" onClick={deleteSelected} disabled={!selected || selected.id === activeMap?.root.id}><Trash2 size={15} />删除节点</button><button type="button" className="mmc-btn primary" onClick={save}><Save size={15} />保存全部导图</button><button type="button" className="mmc-btn" onClick={resetMap}><RotateCcw size={15} />恢复当前结构</button></div><p className="mmc-note">已兼容本地旧版导图。选择一张导图或编辑节点后，点击保存全部导图同步到云端。</p></aside>
  </div>;
}
