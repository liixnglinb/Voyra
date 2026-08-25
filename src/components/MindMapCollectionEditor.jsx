import React, { useEffect, useMemo, useState } from 'react';
import { CircleDot, FilePlus2, GitBranch, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';

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

function TreeNode({ node, selectedId, onSelect }) {
  const selected = node.id === selectedId;
  return <li className={`mmc-tree-item${selected ? ' is-selected' : ''}`}>
    <button className="mmc-node" type="button" onClick={() => onSelect(node.id)}>
      <CircleDot size={15} strokeWidth={1.7} /><span>{node.text || '未命名节点'}</span>
    </button>
    {node.children?.length > 0 && <ul className="mmc-tree-children">{node.children.map((child) => <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />)}</ul>}
  </li>;
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

  const rename = (text) => {
    if (!activeMap || !selected) return;
    updateActiveRoot(updateNode(activeMap.root, selected.id, (node) => ({ ...node, text })));
  };

  const addChild = () => {
    if (!activeMap || !selected) return;
    const id = `n_${Date.now().toString(36)}`;
    updateActiveRoot(updateNode(activeMap.root, selected.id, (node) => ({
      ...node,
      children: [...(node.children || []), { id, text: '新节点', children: [], x: 0, y: 0, note: '', noteType: 'text' }],
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
      .mmc-stage { position:relative; min-width:0; overflow:auto; }.mmc-stage-head { position:sticky; top:0; z-index:2; justify-content:space-between; padding:15px 17px; border-bottom:1px solid rgba(27,27,27,.11); background:rgba(255,255,255,.94); }.mmc-stage-title { display:flex; align-items:center; gap:8px; }.mmc-status { color:#888; font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace; font-weight:400; }
      .mmc-tree { min-width:580px; margin:0; padding:36px 36px 52px; list-style:none; }.mmc-tree-item { position:relative; margin:14px 0; list-style:none; }.mmc-tree-item::before { content:""; position:absolute; top:22px; left:-25px; width:19px; height:1px; background:rgba(27,27,27,.22); }.mmc-tree > .mmc-tree-item::before { display:none; }.mmc-tree-children { position:relative; margin:8px 0 0 27px; padding:0 0 0 23px; list-style:none; }.mmc-tree-children::before { content:""; position:absolute; top:-13px; bottom:22px; left:0; width:1px; background:rgba(27,27,27,.18); }.mmc-tree-children > .mmc-tree-item:last-child::after { content:""; position:absolute; z-index:1; top:23px; bottom:-16px; left:-24px; width:3px; background:#fff; }
      .mmc-node { display:inline-flex; align-items:center; gap:8px; max-width:320px; border:1px solid rgba(27,27,27,.15); border-radius:7px; padding:11px 13px; background:#fff; color:#333; font:600 13px/1.35 Inter,ui-sans-serif,system-ui,sans-serif; text-align:left; cursor:pointer; transition:border-color .2s ease,background .2s ease,transform .2s ease; }.mmc-node:hover { border-color:#a48830; background:#fff9df; transform:translateX(3px); }.mmc-tree-item.is-selected > .mmc-node { border-color:#d9bd51; background:#ffe08a; color:#1b1b1b; }.mmc-node svg { flex:0 0 auto; color:#a48830; }.mmc-tree > .mmc-tree-item > .mmc-node { padding:15px 17px; font-size:17px; }
      .mmc-inspector { align-self:start; border-top:1px solid rgba(27,27,27,.13); border-bottom:1px solid rgba(27,27,27,.13); padding:16px 0; }.mmc-inspector-head { justify-content:space-between; }.mmc-icon-button { display:grid; width:28px; height:28px; place-items:center; border:1px solid rgba(27,27,27,.15); border-radius:5px; background:#fff; color:#777; cursor:pointer; }.mmc-icon-button:hover { border-color:#cf5252; background:#fff2f2; color:#b53838; }.mmc-label { display:block; margin-top:24px; color:#777; font-size:11px; font-weight:700; }.mmc-input { width:100%; margin-top:7px; border:1px solid rgba(27,27,27,.17); border-radius:6px; padding:9px 10px; color:#1b1b1b; background:#fff; font:13px/1.4 inherit; outline:none; }.mmc-input:focus { border-color:#1b1b1b; box-shadow:0 0 0 3px rgba(255,224,138,.5); }
      .mmc-actions { display:grid; gap:8px; margin-top:16px; }.mmc-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; width:100%; min-height:34px; border:1px solid rgba(27,27,27,.16); border-radius:6px; background:#fff; color:#555; font-size:12px; font-weight:700; cursor:pointer; transition:background .18s ease,border-color .18s ease,color .18s ease; }.mmc-btn:hover { border-color:#a48830; background:#fff9df; color:#1b1b1b; }.mmc-btn.primary { border-color:#1b1b1b; background:#1b1b1b; color:#fff; }.mmc-btn.primary:hover { background:#3a3a3a; }.mmc-btn.danger:hover { border-color:#cf5252; background:#fff2f2; color:#b53838; }.mmc-note { margin:18px 0 0; color:#999; font-size:11px; line-height:1.65; }
      @media (max-width:900px) { .mmc-page { grid-template-columns:166px minmax(0,1fr); }.mmc-inspector { grid-column:1/-1; display:grid; grid-template-columns:minmax(0,1fr) 1fr; gap:12px; align-items:end; padding:0 0 16px; }.mmc-inspector-head { grid-column:1/-1; }.mmc-label { margin:0; }.mmc-actions { grid-template-columns:repeat(3,minmax(0,1fr)); margin:0; }.mmc-actions .primary { grid-column:1/-1; }.mmc-note { grid-column:1/-1; margin:0; } }
      @media (max-width:620px) { .mmc-page { grid-template-columns:1fr; gap:20px; }.mmc-library { min-height:0; }.mmc-map-list { grid-template-columns:repeat(2,minmax(0,1fr)); max-height:158px; }.mmc-new-map { margin-top:12px; }.mmc-stage { min-height:430px; }.mmc-tree { min-width:480px; padding:28px 28px 36px; }.mmc-inspector { grid-column:auto; grid-template-columns:1fr; }.mmc-actions { grid-template-columns:repeat(2,minmax(0,1fr)); }.mmc-actions .primary { grid-column:1/-1; } }
    `}</style>
    <aside className="mmc-library" aria-label="思维导图列表"><div className="mmc-library-head"><GitBranch size={17} />思维导图<span>{String(entries.length).padStart(2, '0')}</span></div><div className="mmc-map-list">{entries.map(([id, map], index) => <button type="button" className={`mmc-map${id === activeMapId ? ' is-active' : ''}`} onClick={() => selectMap(id)} key={id}><span className="mmc-map-index">{String(index + 1).padStart(2, '0')}</span><span><strong>{map.root.text || '未命名导图'}</strong><em>{nodeCount(map.root)} 个节点</em></span></button>)}</div><button type="button" className="mmc-new-map" onClick={createMap}><FilePlus2 size={15} />新建导图</button></aside>
    <section className="mmc-stage"><header className="mmc-stage-head"><div className="mmc-stage-title"><GitBranch size={18} />结构视图</div><span className="mmc-status">{loaded ? status || '可编辑' : '正在加载'}</span></header>{activeMap && <ul className="mmc-tree"><TreeNode node={activeMap.root} selectedId={selected?.id} onSelect={setSelectedId} /></ul>}</section>
    <aside className="mmc-inspector"><div className="mmc-inspector-head"><span><CircleDot size={17} />节点编辑</span>{entries.length > 1 && <button type="button" className="mmc-icon-button" onClick={deleteMap} title="删除当前导图" aria-label="删除当前导图"><Trash2 size={14} /></button>}</div><label className="mmc-label" htmlFor="mindmap-node-name">节点名称</label><input id="mindmap-node-name" className="mmc-input" value={selected?.text || ''} onChange={(event) => rename(event.target.value)} /><div className="mmc-actions"><button type="button" className="mmc-btn" onClick={addChild}><Plus size={15} />新建子节点</button><button type="button" className="mmc-btn danger" onClick={deleteSelected} disabled={!selected || selected.id === activeMap?.root.id}><Trash2 size={15} />删除节点</button><button type="button" className="mmc-btn primary" onClick={save}><Save size={15} />保存全部导图</button><button type="button" className="mmc-btn" onClick={resetMap}><RotateCcw size={15} />恢复当前结构</button></div><p className="mmc-note">已兼容本地旧版导图。选择一张导图或编辑节点后，点击保存全部导图同步到云端。</p></aside>
  </div>;
}
