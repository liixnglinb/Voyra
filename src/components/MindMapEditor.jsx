import React, { useEffect, useMemo, useState } from 'react';
import { CircleDot, GitBranch, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'voyra-mindmap';
const DEFAULT_MAP = {
  id: 'root', label: 'Voyra 思维导图', children: [
    { id: 'ideas', label: '正在整理的想法', children: [] },
    { id: 'projects', label: '本周项目', children: [] },
    { id: 'resources', label: '资源与连接', children: [] },
  ],
};

function clone(value) { return JSON.parse(JSON.stringify(value)); }
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
  return { ...node, children: (node.children || []).filter((child) => child.id !== id).map((child) => removeNode(child, id)) };
}

function TreeNode({ node, selectedId, onSelect }) {
  const selected = node.id === selectedId;
  return <li className={`mm-tree-item${selected ? ' is-selected' : ''}`}>
    <button className="mm-node" type="button" onClick={() => onSelect(node.id)}><CircleDot size={15} strokeWidth={1.7} /><span>{node.label || '未命名节点'}</span></button>
    {node.children?.length > 0 && <ul className="mm-tree-children">{node.children.map((child) => <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />)}</ul>}
  </li>;
}

export default function MindMapEditor() {
  const [map, setMap] = useState(DEFAULT_MAP);
  const [selectedId, setSelectedId] = useState(DEFAULT_MAP.id);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    window.electronAPI?.loadData?.(STORAGE_KEY).then((saved) => {
      if (active && saved?.id && Array.isArray(saved.children)) setMap(saved);
    }).catch(() => {}).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  const selected = useMemo(() => findNode(map, selectedId) || map, [map, selectedId]);
  const save = async (next = map) => {
    setMap(next); setStatus('正在保存');
    try { await window.electronAPI?.saveData?.(STORAGE_KEY, next); setStatus('已保存'); } catch { setStatus('保存失败'); }
  };
  const rename = (label) => setMap(updateNode(map, selected.id, (node) => ({ ...node, label })));
  const addChild = () => {
    const id = `node-${Date.now()}`;
    setMap(updateNode(map, selected.id, (node) => ({ ...node, children: [...(node.children || []), { id, label: '新节点', children: [] }] })));
    setSelectedId(id);
  };
  const deleteSelected = () => {
    if (selected.id === map.id) return;
    setMap(removeNode(map, selected.id)); setSelectedId(map.id);
  };
  const reset = () => { const next = clone(DEFAULT_MAP); setMap(next); setSelectedId(next.id); setStatus('已恢复默认结构'); };

  return <div className="mm-page">
    <style>{`
      .mm-page { display:grid; grid-template-columns:minmax(0,1fr) 260px; gap:18px; min-height:560px; }
      .mm-stage { position:relative; min-height:560px; overflow:auto; border:1px solid rgba(27,27,27,.13); border-radius:8px; background:rgba(255,255,255,.9); }
      .mm-stage-head { position:sticky; top:0; z-index:2; display:flex; align-items:center; justify-content:space-between; gap:14px; padding:15px 17px; border-bottom:1px solid rgba(27,27,27,.11); background:rgba(255,255,255,.94); }
      .mm-stage-title { display:flex; align-items:center; gap:8px; font-size:14px; font-weight:760; color:#1b1b1b; }.mm-stage-title svg { color:#a48830; }.mm-status { color:#888; font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .mm-tree { min-width:620px; margin:0; padding:36px 36px 52px; list-style:none; }.mm-tree-item { position:relative; margin:14px 0; list-style:none; }.mm-tree-item::before { content:""; position:absolute; top:22px; left:-25px; width:19px; height:1px; background:rgba(27,27,27,.22); }.mm-tree > .mm-tree-item::before { display:none; }
      .mm-tree-children { position:relative; margin:8px 0 0 27px; padding:0 0 0 23px; list-style:none; }.mm-tree-children::before { content:""; position:absolute; top:-13px; bottom:22px; left:0; width:1px; background:rgba(27,27,27,.18); }.mm-tree-children > .mm-tree-item:last-child::after { content:""; position:absolute; z-index:1; top:23px; bottom:-16px; left:-24px; width:3px; background:#fff; }
      .mm-node { display:inline-flex; align-items:center; gap:8px; max-width:320px; border:1px solid rgba(27,27,27,.15); border-radius:7px; padding:11px 13px; background:#fff; color:#333; font:600 13px/1.35 Inter,ui-sans-serif,system-ui,sans-serif; text-align:left; cursor:pointer; transition:border-color .2s ease,background .2s ease,transform .2s ease; }.mm-node:hover { border-color:#a48830; background:#fff9df; transform:translateX(3px); }.mm-tree-item.is-selected > .mm-node { border-color:#d9bd51; background:#ffe08a; color:#1b1b1b; }.mm-node svg { flex:0 0 auto; color:#a48830; }.mm-tree > .mm-tree-item > .mm-node { padding:15px 17px; font-size:17px; }
      .mm-inspector { align-self:start; border-top:1px solid rgba(27,27,27,.13); border-bottom:1px solid rgba(27,27,27,.13); padding:16px 0; }.mm-inspector-head { display:flex; align-items:center; gap:8px; color:#1b1b1b; font-size:13px; font-weight:760; }.mm-inspector-head svg { color:#a48830; }.mm-label { display:block; margin-top:24px; color:#777; font-size:11px; font-weight:700; }.mm-input { width:100%; margin-top:7px; border:1px solid rgba(27,27,27,.17); border-radius:6px; padding:9px 10px; color:#1b1b1b; background:#fff; font:13px/1.4 inherit; outline:none; }.mm-input:focus { border-color:#1b1b1b; box-shadow:0 0 0 3px rgba(255,224,138,.5); }
      .mm-actions { display:grid; gap:8px; margin-top:16px; }.mm-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; width:100%; min-height:34px; border:1px solid rgba(27,27,27,.16); border-radius:6px; background:#fff; color:#555; font-size:12px; font-weight:700; cursor:pointer; transition:background .18s ease,border-color .18s ease,color .18s ease; }.mm-btn:hover { border-color:#a48830; background:#fff9df; color:#1b1b1b; }.mm-btn.primary { border-color:#1b1b1b; background:#1b1b1b; color:#fff; }.mm-btn.primary:hover { background:#3a3a3a; }.mm-btn.danger:hover { border-color:#cf5252; background:#fff2f2; color:#b53838; }.mm-note { margin:18px 0 0; color:#999; font-size:11px; line-height:1.65; }
      @media (max-width:720px) { .mm-page { grid-template-columns:1fr; gap:22px; }.mm-stage { min-height:430px; }.mm-tree { min-width:480px; padding:28px 28px 36px; }.mm-inspector { order:-1; display:grid; grid-template-columns:1fr auto; gap:12px; align-items:end; padding:0 0 16px; }.mm-inspector-head { grid-column:1/-1; }.mm-label { margin:0; }.mm-actions { grid-template-columns:repeat(2,minmax(0,1fr)); margin:0; }.mm-actions .primary { grid-column:1/-1; }.mm-note { grid-column:1/-1; margin:0; } }
    `}</style>
    <section className="mm-stage"><header className="mm-stage-head"><div className="mm-stage-title"><GitBranch size={18} />画布视图</div><span className="mm-status">{loaded ? status || '可编辑' : '正在加载'}</span></header><ul className="mm-tree"><TreeNode node={map} selectedId={selected.id} onSelect={setSelectedId} /></ul></section>
    <aside className="mm-inspector"><div className="mm-inspector-head"><CircleDot size={17} />节点编辑</div><label className="mm-label" htmlFor="mindmap-node-name">节点名称</label><input id="mindmap-node-name" className="mm-input" value={selected.label} onChange={(event) => rename(event.target.value)} /><div className="mm-actions"><button type="button" className="mm-btn" onClick={addChild}><Plus size={15} />新建子节点</button><button type="button" className="mm-btn danger" onClick={deleteSelected} disabled={selected.id === map.id}><Trash2 size={15} />删除节点</button><button type="button" className="mm-btn primary" onClick={() => save()}><Save size={15} />保存导图</button><button type="button" className="mm-btn" onClick={reset}><RotateCcw size={15} />恢复默认</button></div><p className="mm-note">点击画布中的任意节点进行编辑。变更只会在点击保存后写入数据库。</p></aside>
  </div>;
}
