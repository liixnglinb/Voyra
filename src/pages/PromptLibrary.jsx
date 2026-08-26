import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Check, Copy, Download, FolderPlus, Import, Lock, LockOpen, Pencil, Plus, Search, Star, Trash2, X, Cloud, CloudOff,
} from 'lucide-react';
import {
  PROMPT_CATEGORIES, PROMPT_CATEGORY_META, PROMPT_PRESETS,
} from '../data/prompt-presets';

/* ============ 存储层：Bmob 云端 + 本地镜像兜底 ============ */
const CLOUD_KEY = 'voyra.prompt-library';
const MIRROR_KEY = 'voyra.prompt-library.mirror';
const MIGRATED_KEY = 'voyra.prompt-library.migrated';
const LEGACY_KEYS = {
  prompts: 'voyra.prompt-library.prompts',
  categories: 'voyra.prompt-library.categories',
};

/* ============ 管理员解锁（访客只读） ============
   密码不明文入库：只存 djb2 哈希。改密码请告诉我新密码重新生成，
   或自己在 Node 里算：var s='新密码',h=5381;for(var i=0;i<s.length;i++){h=((h*33)+s.charCodeAt(i))|0}console.log(h) */
const ADMIN_PASSWORD_HASH = -1461714399;
const ADMIN_SESSION_KEY = 'voyra.prompt-library.admin';

function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) + str.charCodeAt(i)) | 0;
  return h;
}

const EMPTY_STATE = { custom: [], favorites: [], categories: [] };

function parseLocal(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function isMeaningful(state) {
  return !!(state && (state.custom?.length || state.favorites?.length || state.categories?.length));
}

async function loadCloudState() {
  try {
    const data = await window.electronAPI?.loadData?.(CLOUD_KEY);
    return isMeaningful(data) ? sanitizeState(data) : null;
  } catch {
    return null;
  }
}

async function saveCloudState(state) {
  try {
    await window.electronAPI?.saveData?.(CLOUD_KEY, state);
    return true;
  } catch {
    return false;
  }
}

function sanitizeState(state) {
  const source = state && typeof state === 'object' ? state : {};
  const custom = (Array.isArray(source.custom) ? source.custom : []).map(normalizePrompt).filter(Boolean);
  const favorites = (Array.isArray(source.favorites) ? source.favorites : []).map(String);
  const builtinKeys = PROMPT_CATEGORIES.map((c) => c.key);
  const categories = (Array.isArray(source.categories) ? source.categories : [])
    .map((c) => String(c).trim()).filter(Boolean).filter((c) => !builtinKeys.includes(c));
  return { custom, favorites, categories };
}

/* 旧版 localStorage 数据（全部视为用户自建）一次性迁移上云 */
function readLegacyState() {
  const legacy = parseLocal(LEGACY_KEYS.prompts, null);
  if (!Array.isArray(legacy) || !legacy.length) return null;
  const custom = legacy.map(normalizePrompt).filter(Boolean).map((item) => ({
    id: item.id, title: item.title, titleEn: '', summary: '',
    cat: item.category || PROMPT_CATEGORIES[0].key, sub: '',
    tags: item.tags, content: item.content,
    createdAt: item.createdAt, updatedAt: item.updatedAt,
  }));
  const favorites = custom.filter((item) => item.favorite).map((item) => item.id);
  const legacyCats = parseLocal(LEGACY_KEYS.categories, []);
  const builtinKeys = PROMPT_CATEGORIES.map((c) => c.key);
  const categories = (Array.isArray(legacyCats) ? legacyCats : []).map(String).filter((c) => !builtinKeys.includes(c));
  return sanitizeState({ custom, favorites, categories });
}

/* ============ 数据模型 ============ */
function normalizePrompt(item, index = 0) {
  if (!item || typeof item !== 'object' || !String(item.title || '').trim() || !String(item.content || '').trim()) return null;
  const now = Date.now();
  const tags = Array.isArray(item.tags)
    ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : String(item.tags || '').split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);

  return {
    id: String(item.id || `${now}-${index}-${Math.random().toString(36).slice(2, 7)}`),
    title: String(item.title).trim(),
    titleEn: String(item.titleEn || '').trim(),
    summary: String(item.summary || '').trim(),
    cat: String(item.cat || item.category || PROMPT_CATEGORIES[0].key).trim() || PROMPT_CATEGORIES[0].key,
    sub: String(item.sub || '').trim(),
    tags,
    content: String(item.content).trim(),
    createdAt: Number(item.createdAt) || now,
    updatedAt: Number(item.updatedAt) || Number(item.createdAt) || now,
  };
}

function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy') ? resolve() : reject(new Error('copy failed')); }
    catch (error) { reject(error); }
    finally { textarea.remove(); }
  });
}

/* ============ 小组件 ============ */
function IconButton({ label, children, className = '', ...props }) {
  return <button type="button" className={`pl-icon-btn ${className}`} aria-label={label} title={label} {...props}>{children}</button>;
}

function PromptCard({ prompt, color, admin, copiedId, onCopy, onToggleFavorite, onEdit, onDelete }) {
  const preview = prompt.content.length > 150 ? `${prompt.content.slice(0, 150)}…` : prompt.content;
  return <article className="pl-card">
    <header className="pl-card-top">
      <h2>{prompt.title}{prompt.titleEn && <em style={{ color }}>{prompt.titleEn}</em>}</h2>
      {admin && <IconButton
        label={prompt.favorite ? '取消收藏' : '收藏'}
        className={`pl-star${prompt.favorite ? ' is-fav' : ''}`}
        onClick={() => onToggleFavorite(prompt.id)}
      >
        <Star size={17} fill={prompt.favorite ? 'currentColor' : 'none'} />
      </IconButton>}
    </header>
    {prompt.summary && <p className="pl-card-quote"><i>"</i>{prompt.summary}</p>}
    <pre className="pl-card-preview">{preview}</pre>
    <footer className="pl-card-foot">
      <span className="pl-card-tags">{prompt.tags.slice(0, 2).map((tag) => `#${tag}`).join(' ')}</span>
      <div className="pl-card-actions">
        <button type="button" className={`pl-copy-btn${copiedId === prompt.id ? ' is-copied' : ''}`} onClick={() => onCopy(prompt)}>
          {copiedId === prompt.id ? <Check size={14} /> : <Copy size={14} />}{copiedId === prompt.id ? '已复制' : '复制'}
        </button>
        {admin && !prompt.builtin && <>
          <IconButton label="编辑提示词" onClick={() => onEdit(prompt)}><Pencil size={14} /></IconButton>
          <IconButton label="删除提示词" className="is-danger" onClick={() => onDelete(prompt)}><Trash2 size={14} /></IconButton>
        </>}
      </div>
    </footer>
  </article>;
}

function PromptDialog({ allCategories, subOptions, draft, onChange, onSave, onClose }) {
  const isEditing = Boolean(draft.id);
  return <div className="pl-scrim" role="presentation" onMouseDown={onClose}>
    <form className="pl-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={onSave}>
      <header><div><span>提示词</span><h2>{isEditing ? '编辑条目' : '新建条目'}</h2></div><IconButton label="关闭" onClick={onClose}><X size={18} /></IconButton></header>
      <div className="pl-dialog-grid">
        <label>名称<input autoFocus value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="例如：代码审查员" /></label>
        <label>英文名（选填）<input value={draft.titleEn} onChange={(event) => onChange({ ...draft, titleEn: event.target.value })} placeholder="Code Reviewer" /></label>
      </div>
      <label>一句话简介（选填）<input value={draft.summary} onChange={(event) => onChange({ ...draft, summary: event.target.value })} placeholder="卡片上展示的一句话说明" /></label>
      <div className="pl-dialog-grid">
        <label>分类<select value={draft.cat} onChange={(event) => onChange({ ...draft, cat: event.target.value, sub: '' })}>
          {allCategories.map((category) => <option value={category} key={category}>{category}</option>)}
        </select></label>
        <label>子分类（选填）<input value={draft.sub} onChange={(event) => onChange({ ...draft, sub: event.target.value })} list="pl-sub-options" placeholder="例如：调试与审查" />
          <datalist id="pl-sub-options">{subOptions.map((sub) => <option value={sub} key={sub} />)}</datalist>
        </label>
      </div>
      <label>内容<textarea value={draft.content} onChange={(event) => onChange({ ...draft, content: event.target.value })} placeholder="写下可以直接复制使用的提示词，变量用【】标注" rows={9} /></label>
      <label>标签<input value={draft.tags} onChange={(event) => onChange({ ...draft, tags: event.target.value })} placeholder="例如：代码，审查" /></label>
      <footer><button type="button" className="pl-btn pl-btn-quiet" onClick={onClose}>取消</button><button className="pl-btn pl-btn-solid" disabled={!draft.title.trim() || !draft.content.trim()}>{isEditing ? '保存修改' : '创建提示词'}</button></footer>
    </form>
  </div>;
}

function CategoryDialog({ onClose, onSave }) {
  const [value, setValue] = useState('');
  return <div className="pl-scrim" role="presentation" onMouseDown={onClose}>
    <form className="pl-dialog pl-dialog-slim" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onSave(value); }}>
      <header><div><span>分类</span><h2>新建分类</h2></div><IconButton label="关闭" onClick={onClose}><X size={18} /></IconButton></header>
      <label>名称<input autoFocus value={value} onChange={(event) => setValue(event.target.value)} placeholder="例如：教育" /></label>
      <footer><button type="button" className="pl-btn pl-btn-quiet" onClick={onClose}>取消</button><button className="pl-btn pl-btn-solid" disabled={!value.trim()}>添加分类</button></footer>
    </form>
  </div>;
}

function DeleteDialog({ prompt, onClose, onConfirm }) {
  return <div className="pl-scrim" role="presentation" onMouseDown={onClose}>
    <section className="pl-dialog pl-dialog-slim" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>删除</span><h2>删除这条提示词？</h2></div><IconButton label="关闭" onClick={onClose}><X size={18} /></IconButton></header>
      <p>“{prompt.title}”将从云端移除，此操作不可恢复。</p>
      <footer><button type="button" className="pl-btn pl-btn-quiet" onClick={onClose}>取消</button><button type="button" className="pl-btn pl-btn-danger" onClick={() => onConfirm(prompt.id)}>删除</button></footer>
    </section>
  </div>;
}

/* ============ 主页面 ============ */
export default function PromptLibrary() {
  const fileInputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const stateRef = useRef(EMPTY_STATE);
  const [userState, setUserState] = useState(EMPTY_STATE);
  const [activeCat, setActiveCat] = useState('全部');
  const [activeSub, setActiveSub] = useState('全部');
  const [search, setSearch] = useState('');
  const [ready, setReady] = useState(false);
  const [cloudOk, setCloudOk] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [draft, setDraft] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState('');
  const [admin, setAdmin] = useState(() => {
    try { return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'; } catch { return false; }
  });
  const [pwDialog, setPwDialog] = useState(false);
  const [pwInput, setPwInput] = useState('');

  /* 首次加载：云端 → 本地镜像 → 旧数据一次性迁移 */
  useEffect(() => {
    let active = true;
    (async () => {
      let state = await loadCloudState();
      let migrated = false;
      if (!state) state = sanitizeState(parseLocal(MIRROR_KEY, null)) && isMeaningful(parseLocal(MIRROR_KEY, null)) ? sanitizeState(parseLocal(MIRROR_KEY, null)) : null;
      if (!state && !window.localStorage.getItem(MIGRATED_KEY)) {
        writeLocal(MIGRATED_KEY, true);
        state = readLegacyState();
        migrated = !!state;
      }
      if (!active) return;
      const next = state || EMPTY_STATE;
      stateRef.current = next;
      setUserState(next);
      setCloudOk(!!state);
      setReady(true);
      if (migrated) saveCloudState(next).then((ok) => { if (active) setCloudOk(ok); });
    })();
    return () => { active = false; };
  }, []);

  /* 状态变更 → 防抖写云端 + 本地镜像 */
  useEffect(() => {
    if (!ready) return undefined;
    writeLocal(MIRROR_KEY, userState);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const ok = await saveCloudState(userState);
      if (ok) setCloudOk(true);
    }, 600);
    return () => clearTimeout(saveTimerRef.current);
  }, [userState, ready]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updateUserState = (updater) => {
    const next = typeof updater === 'function' ? updater(stateRef.current) : updater;
    stateRef.current = next;
    setUserState(next);
  };

  const unlockAdmin = () => {
    if (djb2(pwInput) === ADMIN_PASSWORD_HASH) {
      try { sessionStorage.setItem(ADMIN_SESSION_KEY, '1'); } catch { /* ignore */ }
      setAdmin(true);
      setPwDialog(false);
      setPwInput('');
      setToast('已解锁管理功能');
    } else {
      setPwInput('');
      setToast('密码错误');
    }
  };

  const lockAdmin = () => {
    try { sessionStorage.removeItem(ADMIN_SESSION_KEY); } catch { /* ignore */ }
    setAdmin(false);
    setToast('已退出管理模式');
  };

  const allPrompts = useMemo(() => [...PROMPT_PRESETS, ...userState.custom], [userState.custom]);
  const allCategories = useMemo(() => [
    ...PROMPT_CATEGORIES.map((c) => c.key), ...userState.categories,
  ], [userState.categories]);
  const builtinCatSet = useMemo(() => new Set(PROMPT_CATEGORIES.map((c) => c.key)), []);

  const searching = search.trim().length > 0;

  const filteredPrompts = useMemo(() => {
    if (searching) {
      const query = search.trim().toLocaleLowerCase();
      return allPrompts.filter((prompt) => [prompt.title, prompt.titleEn, prompt.summary, prompt.content, prompt.cat, prompt.sub, ...prompt.tags]
        .join(' ').toLocaleLowerCase().includes(query));
    }
    return allPrompts.filter((prompt) => {
      const matchCat = activeCat === '全部' || prompt.cat === activeCat;
      const matchSub = activeSub === '全部' || (prompt.sub || '') === activeSub;
      return matchCat && matchSub;
    });
  }, [allPrompts, searching, search, activeCat, activeSub]);

  const catCount = (category) => (category === '全部'
    ? allPrompts.length
    : allPrompts.filter((prompt) => prompt.cat === category).length);

  const subsForCat = (category) => {
    const builtin = PROMPT_CATEGORIES.find((c) => c.key === category);
    if (builtin) return builtin.subs;
    return Array.from(new Set(allPrompts.filter((prompt) => prompt.cat === category).map((prompt) => prompt.sub).filter(Boolean)));
  };

  const sideSubs = useMemo(() => {
    if (activeCat === '全部' || searching) return [];
    return subsForCat(activeCat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat, searching, allPrompts]);

  const subOptions = useMemo(() => subsForCat(draft?.cat || activeCat), [draft?.cat, activeCat, allPrompts]);

  const subCount = (sub) => allPrompts.filter((prompt) => prompt.cat === activeCat && (prompt.sub || '') === sub).length;
  const colorFor = (prompt) => PROMPT_CATEGORY_META[prompt.cat]?.color || '#5f7182';
  const enFor = (category) => PROMPT_CATEGORY_META[category]?.En || '';

  /* 收藏置顶 */
  const sortedPrompts = useMemo(() => {
    const favSet = new Set(userState.favorites);
    return [...filteredPrompts].sort((a, b) => (favSet.has(b.id) ? 1 : 0) - (favSet.has(a.id) ? 1 : 0));
  }, [filteredPrompts, userState.favorites]);

  const openNewPrompt = () => {
    setDraft({
      id: '', title: '', titleEn: '', summary: '',
      cat: activeCat === '全部' || searching ? PROMPT_CATEGORIES[0].key : activeCat,
      sub: activeSub === '全部' || searching ? '' : activeSub,
      content: '', tags: '',
    });
    setDialog('editor');
  };

  const openEditPrompt = (prompt) => {
    setDraft({ ...prompt, tags: prompt.tags.join('，') });
    setDialog('editor');
  };

  const savePrompt = (event) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.content.trim()) return;
    const timestamp = Date.now();
    const next = normalizePrompt({ ...draft, tags: draft.tags, updatedAt: timestamp, createdAt: draft.createdAt || timestamp });
    if (!next) return;
    updateUserState((current) => ({
      ...current,
      custom: draft.id
        ? current.custom.map((prompt) => (prompt.id === draft.id ? { ...next, id: prompt.id, createdAt: prompt.createdAt } : prompt))
        : [next, ...current.custom],
      categories: current.categories.includes(next.cat) || builtinCatSet.has(next.cat)
        ? current.categories
        : [...current.categories, next.cat],
    }));
    if (!builtinCatSet.has(next.cat)) setActiveCat(next.cat);
    setActiveSub('全部');
    setDialog(null);
    setToast(draft.id ? '提示词已更新并同步云端' : '提示词已创建并同步云端');
  };

  const copyPrompt = async (prompt) => {
    try {
      await copyText(prompt.content);
      setCopiedId(prompt.id);
      window.setTimeout(() => setCopiedId((current) => (current === prompt.id ? null : current)), 1500);
    } catch {
      setToast('复制失败，请重试');
    }
  };

  const toggleFavorite = (id) => updateUserState((current) => ({
    ...current,
    favorites: current.favorites.includes(id)
      ? current.favorites.filter((item) => item !== id)
      : [...current.favorites, id],
  }));

  const addCategory = (value) => {
    const category = value.trim();
    setDialog(null);
    if (!category) return;
    if (allCategories.includes(category)) { setToast('该分类已存在'); return; }
    updateUserState((current) => ({ ...current, categories: [...current.categories, category] }));
    setActiveCat(category);
    setActiveSub('全部');
    setToast('分类已添加');
  };

  const deletePrompt = (id) => {
    updateUserState((current) => ({
      ...current,
      custom: current.custom.filter((prompt) => prompt.id !== id),
      favorites: current.favorites.filter((item) => item !== id),
    }));
    setDialog(null);
    setToast('提示词已删除');
  };

  const importPrompts = async (event) => {
    const [file] = event.target.files || [];
    event.target.value = '';
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const raw = Array.isArray(payload) ? payload : payload?.prompts;
      if (!Array.isArray(raw)) throw new Error('invalid');
      const incoming = raw.map(normalizePrompt).filter(Boolean)
        .map((prompt, index) => ({ ...prompt, id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}` }));
      if (!incoming.length) throw new Error('empty');
      updateUserState((current) => {
        const builtinKeys = PROMPT_CATEGORIES.map((c) => c.key);
        const incomingCats = incoming.map((prompt) => prompt.cat).filter((cat) => !builtinKeys.has(cat));
        return {
          ...current,
          custom: [...incoming, ...current.custom],
          categories: Array.from(new Set([...current.categories, ...incomingCats])),
        };
      });
      setToast(`已导入 ${incoming.length} 条提示词`);
    } catch {
      setToast('导入失败，请选择有效的 JSON 文件');
    }
  };

  const exportPrompts = () => {
    const payload = { prompts: userState.custom, favorites: userState.favorites, categories: userState.categories, exportedAt: new Date().toISOString() };
    const blob = new Blob(['\ufeff' + JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `voyra-prompts-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const renderSubButtons = (className) => (
    <>
      <button type="button" className={`${className}${activeSub === '全部' ? ' is-active' : ''}`} onClick={() => setActiveSub('全部')}>全部 <b>{catCount(activeCat)}</b></button>
      {sideSubs.map((sub) => (
        <button type="button" key={sub} className={`${className}${activeSub === sub ? ' is-active' : ''}`} onClick={() => setActiveSub(sub)}>
          {sub} <b>{subCount(sub)}</b>
        </button>
      ))}
    </>
  );

  const mainTitle = searching ? '检索结果' : activeCat === '全部' ? '全部提示词' : `${activeCat}提示词`;
  const sectionTitle = searching ? '全局搜索' : activeSub === '全部' ? '全部子类' : activeSub;
  const sectionCount = sortedPrompts.length;

  return <div className="pl-page">
    <style>{`
      .pl-page { --ink:#1b1b1b; --muted:#8a8a8a; --line:rgba(27,27,27,.12); --paper:#fff; --gold:#a48830; --soft:#fff9df; --hl:#ffe08a;
        color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; }
      .pl-page * { box-sizing:border-box; }
      .pl-page button, .pl-page input, .pl-page select, .pl-page textarea { font:inherit; }
      .pl-page button { cursor:pointer; }
      .pl-page button:focus-visible, .pl-page a:focus-visible, .pl-page input:focus-visible { outline:1.5px solid var(--ink); outline-offset:2px; }
      .tool-content-prompt .pl-page :is(input,select,textarea):focus { border-color:rgba(27,27,27,.3) !important; background:#fff !important; box-shadow:none !important; outline:none; }

      /* ===== 吸顶头部（顶栏 + 分类 chips） ===== */
      .pl-head { position:sticky; top:-28px; z-index:30; margin:0 -4px; padding:0 4px; background:rgba(255,255,255,.94); backdrop-filter:blur(10px); border-bottom:1px solid var(--line); }
      .pl-topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:16px 0 13px; }
      .pl-topbar-left { display:inline-flex; align-items:center; gap:11px; min-width:0; }
      .pl-back { display:inline-grid; width:30px; height:30px; place-items:center; border:1px solid var(--line); border-radius:7px; color:#666; background:#fff; transition:color .18s ease, background .18s ease, transform .18s ease; }
      .pl-back:hover { color:var(--ink); background:var(--soft); transform:translateX(-2px); }
      .pl-brand { display:inline-flex; align-items:center; gap:7px; color:#555; font:700 15px/1 Inter,ui-sans-serif,system-ui,sans-serif; letter-spacing:-.01em; white-space:nowrap; }
      .pl-brand i { width:9px; height:9px; border:1.5px solid var(--gold); border-radius:50%; }
      .pl-brand em { color:#999; font:400 12px/1 Inter,ui-sans-serif,system-ui,sans-serif; font-style:normal; }
      .pl-cloud { display:inline-flex; align-items:center; gap:5px; padding:5px 10px; border:1px solid var(--line); border-radius:99px; color:#888; font:10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; white-space:nowrap; }
      .pl-cloud svg { color:var(--gold); }
      .pl-cloud.is-off { color:#b64b50; border-color:rgba(182,75,80,.3); }
      .pl-cloud.is-off svg { color:#b64b50; }
      .pl-topbar-right { display:flex; align-items:center; gap:8px; min-width:0; }
      .pl-search { display:flex; width:min(340px,44vw); height:40px; align-items:center; gap:9px; padding:0 13px; border:1px solid var(--line); border-radius:99px; background:#fff; transition:border-color .15s ease, box-shadow .15s ease; }
      .pl-search:focus-within { border-color:rgba(27,27,27,.32); box-shadow:0 0 0 3px rgba(255,224,138,.45); }
      .pl-search svg { flex:0 0 auto; color:#999; }
      .pl-search input { flex:1; min-width:0; border:0 !important; padding:0 !important; background:transparent !important; box-shadow:none !important; color:var(--ink); font-size:13.5px; }
      .pl-search input::placeholder { color:#a8a8a8; }
      .pl-search kbd { flex:0 0 auto; padding:2px 6px; border:1px solid var(--line); border-radius:5px; background:#fafafa; color:#999; font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; }

      /* ===== 按钮 ===== */
      .pl-btn { display:inline-flex; min-height:38px; align-items:center; justify-content:center; gap:7px; border:1px solid var(--line); border-radius:8px; padding:0 14px; background:#fff; color:#555; font-size:13px; white-space:nowrap; transition:border-color .18s ease, background .18s ease, color .18s ease, transform .18s ease; }
      .pl-btn:hover:not(:disabled) { border-color:rgba(27,27,27,.32); background:#fff; color:var(--ink); transform:translateY(-1px); }
      .pl-btn:disabled { cursor:not-allowed; opacity:.45; }
      .pl-btn-solid { border-color:var(--ink); background:var(--ink); color:#fff; }
      .pl-btn-solid:hover:not(:disabled) { border-color:#333; background:#333; color:#fff; }
      .pl-btn-quiet { background:transparent; }
      .pl-btn-danger { border-color:#b64b50; background:#b64b50; color:#fff; }
      .pl-btn-danger:hover:not(:disabled) { border-color:#963940; background:#963940; color:#fff; }
      .pl-icon-btn { display:inline-grid; width:30px; height:30px; flex:0 0 30px; place-items:center; border:1px solid transparent; border-radius:7px; padding:0; color:#888; background:transparent; transition:border-color .18s ease, background .18s ease, color .18s ease, transform .18s ease; }
      .pl-icon-btn:hover { border-color:var(--line); background:#fff; color:var(--ink); transform:translateY(-1px); }
      .pl-icon-btn.is-danger:hover { border-color:rgba(182,75,80,.34); color:#b64b50; }
      .pl-lock { border-color:var(--line); background:#fff; color:#999; }
      .pl-lock:hover { color:var(--ink); background:var(--soft); }
      .pl-lock.is-on { border-color:rgba(164,136,48,.5); background:var(--soft); color:var(--gold); }

      /* ===== 分类 chips ===== */
      .pl-chips { display:flex; gap:8px; align-items:center; padding:1px 0 14px; overflow-x:auto; scrollbar-width:none; }
      .pl-chips::-webkit-scrollbar { display:none; }
      .pl-chip { display:inline-flex; height:36px; flex:0 0 auto; align-items:center; gap:8px; border:1px solid var(--line); border-radius:99px; padding:0 15px; background:#fff; color:#666; font-size:13.5px; font-weight:600; transition:border-color .16s ease, background .16s ease, color .16s ease; }
      .pl-chip b { color:#aaa; font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .pl-chip:hover { border-color:rgba(27,27,27,.3); color:var(--ink); }
      .pl-chip.is-active { border-color:var(--ink); background:var(--ink); color:#fff; }
      .pl-chip.is-active b { color:rgba(255,255,255,.62); }
      .pl-chip-add { display:inline-grid; width:36px; height:36px; flex:0 0 36px; place-items:center; border:1px dashed rgba(164,136,48,.6); border-radius:50%; color:var(--gold); background:var(--soft); transition:background .16s ease, color .16s ease; }
      .pl-chip-add:hover { background:var(--hl); color:var(--ink); }

      /* ===== 主体两栏 ===== */
      .pl-body { display:grid; grid-template-columns:196px minmax(0,1fr); gap:34px; align-items:start; padding-top:22px; }
      .pl-side { position:sticky; top:150px; display:flex; flex-direction:column; gap:2px; }
      .pl-side-label { padding:0 12px 10px; color:#a0a0a0; font:600 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.08em; }
      .pl-side-item { display:flex; width:100%; align-items:center; justify-content:space-between; gap:8px; border:0; border-radius:8px; padding:9px 12px; background:transparent; color:#777; font-size:13.5px; text-align:left; transition:background .16s ease, color .16s ease; }
      .pl-side-item b { color:#b5b5b5; font:500 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .pl-side-item:hover { background:#faf8f2; color:var(--ink); }
      .pl-side-item.is-active { background:var(--hl); color:var(--ink); font-weight:650; }
      .pl-side-item.is-active b { color:rgba(27,27,27,.55); }
      .pl-side-foot { display:grid; gap:7px; margin-top:16px; padding-top:16px; border-top:1px solid var(--line); }
      .pl-side-foot .pl-btn { min-height:34px; font-size:12.5px; justify-content:flex-start; padding:0 12px; }

      .pl-main { min-width:0; }
      .pl-main h1 { margin:0; font-size:44px; font-weight:780; letter-spacing:-.02em; line-height:1.05; }
      .pl-main h1 em { margin-left:12px; color:#c8c8c8; font:600 20px/1 Inter,ui-sans-serif,system-ui,sans-serif; font-style:normal; letter-spacing:0; }
      .pl-main-head { display:flex; align-items:baseline; gap:12px; margin:26px 0 18px; padding-bottom:12px; border-bottom:1px solid var(--line); }
      .pl-main-head b { font-size:16px; font-weight:750; }
      .pl-main-head span { color:#a0a0a0; font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .pl-main-head .pl-favhint { margin-left:auto; color:#b68513; font-size:11.5px; }

      /* ===== 卡片网格 ===== */
      .pl-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
      .pl-card { position:relative; display:flex; min-width:0; height:264px; flex-direction:column; overflow:hidden; border:1px solid var(--line); border-radius:12px; padding:18px 18px 14px; background:#fff; box-shadow:0 1px 2px rgba(16,20,30,.04); transition:border-color .22s ease, box-shadow .22s ease, transform .22s cubic-bezier(.16,1,.3,1); }
      .pl-card:hover { border-color:rgba(27,27,27,.26); box-shadow:0 20px 38px -26px rgba(0,0,0,.4); transform:translateY(-4px); }
      .pl-card-top { display:flex; min-height:48px; align-items:flex-start; justify-content:space-between; gap:10px; }
      .pl-card-top h2 { margin:0; font-size:19px; font-weight:760; line-height:1.25; letter-spacing:-.01em; }
      .pl-card-top h2 em { margin-left:8px; font:650 14px/1 Inter,ui-sans-serif,system-ui,sans-serif; font-style:normal; letter-spacing:0; white-space:nowrap; }
      .pl-star { margin:-4px -6px 0 0; }
      .pl-star.is-fav { color:#d4a930; }
      .pl-star.is-fav:hover { color:#b68513; }
      .pl-card-quote { display:-webkit-box; overflow:hidden; position:relative; margin:12px 0 0; padding-left:14px; color:#5f5f5f; font-size:12.5px; line-height:1.7; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
      .pl-card-quote i { position:absolute; left:0; top:0; color:var(--gold); font:700 15px/1 Georgia,serif; }
      .pl-card-preview { flex:1; min-height:0; overflow:hidden; margin:13px 0 0; padding:11px 12px; border:1px solid rgba(27,27,27,.08); border-radius:8px; background:#fafaf8; color:#6d6d6d; font:11.5px/1.75 ui-monospace,SFMono-Regular,Menlo,monospace; white-space:pre-wrap; word-break:break-all; }
      .pl-card-foot { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:13px; padding-top:11px; border-top:1px solid rgba(27,27,27,.08); }
      .pl-card-tags { overflow:hidden; color:#9c9c9c; font-size:10.5px; text-overflow:ellipsis; white-space:nowrap; }
      .pl-card-actions { display:flex; align-items:center; gap:2px; }
      .pl-copy-btn { display:inline-flex; height:30px; align-items:center; gap:5px; border:0; border-radius:7px; padding:0 9px; color:#5f5f5f; background:transparent; font-size:11px; transition:background .18s ease, color .18s ease; }
      .pl-copy-btn:hover, .pl-copy-btn.is-copied { color:var(--ink); background:var(--hl); }
      .pl-card-actions .pl-icon-btn { width:28px; height:28px; flex-basis:28px; }

      /* ===== 空状态 / 加载 ===== */
      .pl-empty { display:grid; min-height:250px; place-items:center; border:1px dashed rgba(27,27,27,.24); border-radius:12px; padding:28px; text-align:center; }
      .pl-empty-inner { display:grid; justify-items:center; }
      .pl-empty-icon { display:grid; width:48px; height:48px; place-items:center; border:1px solid rgba(164,136,48,.38); border-radius:10px; color:var(--gold); background:var(--soft); }
      .pl-empty h2 { margin:15px 0 0; font-size:17px; line-height:1; }
      .pl-empty p { margin:9px 0 17px; color:#858585; font-size:13px; }

      /* ===== Toast / 弹窗 ===== */
      .pl-toast { position:fixed; right:28px; bottom:28px; z-index:60; display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(27,27,27,.16); border-radius:8px; padding:10px 13px; color:#333; background:rgba(255,255,255,.97); box-shadow:0 12px 28px -15px rgba(0,0,0,.35); font-size:12px; animation:pl-toast-in .25s cubic-bezier(.16,1,.3,1) both; }
      .pl-toast i { width:7px; height:7px; border-radius:50%; background:var(--gold); }
      @keyframes pl-toast-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      .pl-scrim { position:fixed; z-index:120; inset:0; display:grid; place-items:center; padding:24px; background:rgba(22,22,22,.28); backdrop-filter:blur(4px); animation:pl-fade-in .18s ease both; }
      @keyframes pl-fade-in { from { opacity:0; } to { opacity:1; } }
      .pl-dialog { width:min(100%,590px); max-height:min(780px,calc(100vh - 48px)); overflow:auto; border:1px solid rgba(27,27,27,.15); border-radius:12px; padding:24px; background:#fff; box-shadow:0 25px 70px -30px rgba(0,0,0,.45); animation:pl-dialog-in .25s cubic-bezier(.16,1,.3,1) both; }
      @keyframes pl-dialog-in { from { opacity:0; transform:translateY(12px) scale(.985); } to { opacity:1; transform:translateY(0) scale(1); } }
      .pl-dialog-slim { width:min(100%,420px); }
      .pl-dialog header { display:flex; align-items:flex-start; justify-content:space-between; gap:20px; margin-bottom:20px; }
      .pl-dialog header span { display:block; color:#8d8d8d; font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .pl-dialog h2 { margin:8px 0 0; font-size:22px; line-height:1; }
      .pl-dialog > p { margin:0; color:#707070; font-size:14px; line-height:1.7; }
      .pl-dialog label { display:grid; gap:8px; margin-top:14px; color:#5e5e5e; font-size:12px; font-weight:700; }
      .pl-dialog-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 12px; }
      .pl-dialog label input, .pl-dialog label select, .pl-dialog label textarea { width:100%; border:1px solid var(--line) !important; border-radius:8px !important; padding:10px 11px !important; background:#fff !important; color:var(--ink); box-shadow:none !important; font-weight:400; }
      .pl-dialog label textarea { resize:vertical; font:12px/1.7 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .pl-dialog footer { display:flex; justify-content:flex-end; gap:8px; margin-top:22px; }

      /* ===== 响应式 ===== */
      @media (max-width:1080px) { .pl-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width:920px) {
        .pl-body { grid-template-columns:1fr; gap:0; }
        .pl-side { display:none; }
        .pl-subrow { display:flex; gap:7px; margin:18px 0 0; padding-bottom:14px; border-bottom:1px solid var(--line); overflow-x:auto; scrollbar-width:none; }
        .pl-subrow::-webkit-scrollbar { display:none; }
        .pl-subitem { display:inline-flex; height:32px; flex:0 0 auto; align-items:center; gap:6px; border:1px solid var(--line); border-radius:99px; padding:0 12px; background:#fff; color:#666; font-size:12.5px; transition:border-color .16s ease, background .16s ease, color .16s ease; }
        .pl-subitem b { color:#b5b5b5; font:500 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
        .pl-subitem.is-active { border-color:#d7b846; background:var(--hl); color:var(--ink); font-weight:650; }
        .pl-subitem.is-active b { color:rgba(27,27,27,.5); }
        .pl-main-head { margin-top:16px; }
        .pl-main h1 { font-size:34px; }
        .pl-main h1 em { font-size:15px; margin-left:9px; }
        .pl-search kbd { display:none; }
      }
      @media (min-width:921px) { .pl-subrow { display:none; } }
      @media (max-width:680px) {
        .pl-topbar { flex-wrap:wrap; }
        .pl-topbar-right { width:100%; }
        .pl-search { width:100%; flex:1; }
        .pl-cloud span { display:none; }
        .pl-grid { grid-template-columns:1fr; }
        .pl-main-head { flex-wrap:wrap; }
      }
      @media (prefers-reduced-motion:reduce) { .pl-page *, .pl-page *::before, .pl-page *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; } }
    `}</style>

    <div className="pl-head">
      <header className="pl-topbar">
        <div className="pl-topbar-left">
          <a className="pl-back" href="#/" aria-label="返回主页" title="返回主页"><ArrowLeft size={15} /></a>
          <span className="pl-brand"><i />VOYRA <em>提示词库</em></span>
          <span className={`pl-cloud${cloudOk ? '' : ' is-off'}`} title={cloudOk ? '数据已同步到 Bmob 云端，跨设备可用' : '云端暂时不可用，改动已保存在本机，恢复后自动同步'}>
            {cloudOk ? <Cloud size={12} /> : <CloudOff size={12} />}<span>{cloudOk ? '云端已同步' : '本地模式'}</span>
          </span>
        </div>
        <div className="pl-topbar-right">
          <IconButton
            label={admin ? '退出管理模式' : '管理员解锁'}
            title={admin ? '退出管理模式' : '管理员解锁'}
            className={`pl-lock${admin ? ' is-on' : ''}`}
            onClick={() => (admin ? lockAdmin() : setPwDialog(true))}
          >
            {admin ? <LockOpen size={14} /> : <Lock size={14} />}
          </IconButton>
          <label className="pl-search">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索提示词：试试「代码审查」「旅行攻略」…" aria-label="搜索提示词" />
            {search
              ? <IconButton label="清空搜索" onClick={() => setSearch('')}><X size={15} /></IconButton>
              : null}
          </label>
          {admin && <button type="button" className="pl-btn pl-btn-solid" onClick={openNewPrompt}><Plus size={16} />新建提示词</button>}
        </div>
      </header>
      <nav className="pl-chips" aria-label="提示词分类">
        <button type="button" className={`pl-chip${activeCat === '全部' ? ' is-active' : ''}`} onClick={() => { setActiveCat('全部'); setActiveSub('全部'); }}>全部 <b>{catCount('全部')}</b></button>
        {allCategories.map((category) => (
          <button type="button" key={category} className={`pl-chip${activeCat === category ? ' is-active' : ''}`} onClick={() => { setActiveCat(category); setActiveSub('全部'); }}>
            {category} <b>{catCount(category)}</b>
          </button>
        ))}
        {admin && <button type="button" className="pl-chip-add" title="新建分类" aria-label="新建分类" onClick={() => setDialog('category')}><Plus size={15} /></button>}
      </nav>
    </div>

    <div className="pl-body">
      <aside className="pl-side" aria-label="分类导航">
        <div className="pl-side-label">{activeCat === '全部' || searching ? 'DIVISIONS' : 'SUBCATEGORY'}</div>
        {activeCat === '全部' || searching
          ? allCategories.map((category) => (
              <button type="button" key={category} className={`pl-side-item${activeCat === category ? ' is-active' : ''}`} onClick={() => { setActiveCat(category); setActiveSub('全部'); setSearch(''); }}>
                {category} <b>{catCount(category)}</b>
              </button>
            ))
          : renderSubButtons('pl-side-item')}
        {admin && <div className="pl-side-foot">
          <button type="button" className="pl-btn" onClick={openNewPrompt}><Plus size={14} />新建提示词</button>
          <button type="button" className="pl-btn" onClick={() => fileInputRef.current?.click()}><Import size={14} />导入 JSON</button>
          <button type="button" className="pl-btn" onClick={exportPrompts}><Download size={14} />导出我的数据</button>
          <button type="button" className="pl-btn" onClick={() => setDialog('category')}><FolderPlus size={14} />新建分类</button>
        </div>}
      </aside>

      <main className="pl-main">
        <h1>{mainTitle}{!searching && activeCat !== '全部' && <em>{enFor(activeCat)}</em>}</h1>
        {sideSubs.length > 0 && <div className="pl-subrow">{renderSubButtons('pl-subitem')}</div>}
        <div className="pl-main-head">
          <b>{sectionTitle}</b>
          <span>{sectionCount} 个条目</span>
          {userState.favorites.length > 0 && <span className="pl-favhint">收藏 {userState.favorites.length} 条已置顶</span>}
        </div>

        {!ready ? (
          <section className="pl-empty"><div className="pl-empty-inner"><div className="pl-empty-icon"><Cloud size={20} /></div><h2>正在从云端同步…</h2></div></section>
        ) : sectionCount === 0 ? (
          <section className="pl-empty">
            <div className="pl-empty-inner">
              <div className="pl-empty-icon"><Plus size={21} /></div>
              <h2>{searching ? '没有匹配的提示词' : '这个分类还没有条目'}</h2>
              <p>{searching ? '换一个关键词试试' : admin ? '点击右上角「新建提示词」添加第一条' : '该分类下暂时还没有提示词'}</p>
              {!searching && admin && <button type="button" className="pl-btn pl-btn-solid" onClick={openNewPrompt}><Plus size={15} />新建提示词</button>}
            </div>
          </section>
        ) : (
          <div className="pl-grid">
            {sortedPrompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={{ ...prompt, favorite: userState.favorites.includes(prompt.id) }}
                color={colorFor(prompt)}
                admin={admin}
                copiedId={copiedId}
                onCopy={copyPrompt}
                onToggleFavorite={toggleFavorite}
                onEdit={openEditPrompt}
                onDelete={(item) => { setDraft(item); setDialog('delete'); }}
              />
            ))}
          </div>
        )}
      </main>
    </div>

    <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={importPrompts} />
    {toast && <div className="pl-toast" role="status"><i />{toast}</div>}
    {dialog === 'editor' && draft && (
      <PromptDialog
        allCategories={allCategories}
        subOptions={subOptions}
        draft={draft}
        onChange={setDraft}
        onSave={savePrompt}
        onClose={() => setDialog(null)}
      />
    )}
    {dialog === 'category' && <CategoryDialog onClose={() => setDialog(null)} onSave={addCategory} />}
    {dialog === 'delete' && draft && <DeleteDialog prompt={draft} onClose={() => setDialog(null)} onConfirm={deletePrompt} />}
    {pwDialog && (
      <div className="pl-scrim" role="presentation" onMouseDown={() => setPwDialog(false)}>
        <form className="pl-dialog pl-dialog-slim" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); unlockAdmin(); }}>
          <header><div><span>ADMIN</span><h2>管理员解锁</h2></div><IconButton label="关闭" onClick={() => { setPwDialog(false); setPwInput(''); }}><X size={18} /></IconButton></header>
          <label>管理密码<input autoFocus type="password" value={pwInput} onChange={(event) => setPwInput(event.target.value)} placeholder="输入管理密码" /></label>
          <footer>
            <button type="button" className="pl-btn pl-btn-quiet" onClick={() => { setPwDialog(false); setPwInput(''); }}>取消</button>
            <button className="pl-btn pl-btn-solid" disabled={!pwInput}>解锁</button>
          </footer>
        </form>
      </div>
    )}
  </div>;
}
