import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Check, Copy, FolderPlus, Heart, Import, Pencil, Plus, Search, Star, Trash2, X,
} from 'lucide-react';

const STORAGE_KEYS = {
  prompts: 'voyra.prompt-library.prompts',
  categories: 'voyra.prompt-library.categories',
};

const DEFAULT_CATEGORIES = ['写作', '开发', '学习', '工作', '灵感'];
const CATEGORY_COLORS = ['sun', 'sky', 'mint', 'rose', 'violet', 'slate'];

function parseStoredValue(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function persistStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The library still works for the current session when storage is unavailable.
  }
}

function normalizePrompt(item, index = 0) {
  if (!item || typeof item !== 'object' || !String(item.title || '').trim() || !String(item.content || '').trim()) return null;
  const now = Date.now();
  const tags = Array.isArray(item.tags)
    ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : String(item.tags || '').split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);

  return {
    id: String(item.id || `${now}-${index}-${Math.random().toString(36).slice(2, 7)}`),
    title: String(item.title).trim(),
    content: String(item.content).trim(),
    category: String(item.category || DEFAULT_CATEGORIES[0]).trim() || DEFAULT_CATEGORIES[0],
    tags,
    favorite: Boolean(item.favorite),
    createdAt: Number(item.createdAt) || now,
    updatedAt: Number(item.updatedAt) || Number(item.createdAt) || now,
  };
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function IconButton({ label, children, className = '', ...props }) {
  return <button type="button" className={`prompt-icon-button ${className}`} aria-label={label} title={label} {...props}>{children}</button>;
}

function PromptEntry({ prompt, color, copiedId, onCopy, onToggleFavorite, onEdit, onDelete }) {
  const preview = prompt.content.length > 170 ? `${prompt.content.slice(0, 170)}...` : prompt.content;
  return <article className="prompt-entry" style={{ '--entry-color': `var(--prompt-${color})` }}>
    <div className="prompt-entry-top">
      <span className="prompt-category"><i />{prompt.category}</span>
      <IconButton label={prompt.favorite ? '取消收藏' : '收藏'} className={prompt.favorite ? 'is-favorite' : ''} onClick={() => onToggleFavorite(prompt.id)}>
        <Star size={16} fill={prompt.favorite ? 'currentColor' : 'none'} />
      </IconButton>
    </div>
    <h2>{prompt.title}</h2>
    <p className="prompt-entry-copy">{preview}</p>
    <div className="prompt-entry-tags">{prompt.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div>
    <footer>
      <span>{formatDate(prompt.updatedAt)}</span>
      <div className="prompt-entry-actions">
        <button type="button" className={`prompt-copy-button${copiedId === prompt.id ? ' is-copied' : ''}`} onClick={() => onCopy(prompt)}>
          {copiedId === prompt.id ? <Check size={15} /> : <Copy size={15} />}{copiedId === prompt.id ? '已复制' : '复制'}
        </button>
        <IconButton label="编辑提示词" onClick={() => onEdit(prompt)}><Pencil size={15} /></IconButton>
        <IconButton label="删除提示词" className="is-danger" onClick={() => onDelete(prompt)}><Trash2 size={15} /></IconButton>
      </div>
    </footer>
  </article>;
}

function PromptDialog({ categories, draft, onChange, onSave, onClose }) {
  const isEditing = Boolean(draft.id);
  return <div className="prompt-scrim" role="presentation" onMouseDown={onClose}>
    <form className="prompt-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={onSave}>
      <header><div><span>提示词</span><h2>{isEditing ? '编辑条目' : '新建条目'}</h2></div><IconButton label="关闭" onClick={onClose}><X size={18} /></IconButton></header>
      <label>名称<input autoFocus value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder="例如：文章结构梳理" /></label>
      <label>分类<select value={draft.category} onChange={(event) => onChange({ ...draft, category: event.target.value })}>{categories.map((category) => <option value={category} key={category}>{category}</option>)}</select></label>
      <label>内容<textarea value={draft.content} onChange={(event) => onChange({ ...draft, content: event.target.value })} placeholder="写下可以直接复制使用的提示词" rows={9} /></label>
      <label>标签<input value={draft.tags} onChange={(event) => onChange({ ...draft, tags: event.target.value })} placeholder="例如：论文，框架，常用" /></label>
      <footer><button type="button" className="prompt-button prompt-button-quiet" onClick={onClose}>取消</button><button className="prompt-button prompt-button-solid" disabled={!draft.title.trim() || !draft.content.trim()}>{isEditing ? '保存修改' : '创建提示词'}</button></footer>
    </form>
  </div>;
}

function CategoryDialog({ onClose, onSave }) {
  const [value, setValue] = useState('');
  return <div className="prompt-scrim" role="presentation" onMouseDown={onClose}>
    <form className="prompt-dialog prompt-category-dialog" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onSave(value); }}>
      <header><div><span>分类</span><h2>新建分类</h2></div><IconButton label="关闭" onClick={onClose}><X size={18} /></IconButton></header>
      <label>名称<input autoFocus value={value} onChange={(event) => setValue(event.target.value)} placeholder="例如：产品" /></label>
      <footer><button type="button" className="prompt-button prompt-button-quiet" onClick={onClose}>取消</button><button className="prompt-button prompt-button-solid" disabled={!value.trim()}>添加分类</button></footer>
    </form>
  </div>;
}

function DeleteDialog({ prompt, onClose, onConfirm }) {
  return <div className="prompt-scrim" role="presentation" onMouseDown={onClose}>
    <section className="prompt-dialog prompt-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-prompt-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><span>删除</span><h2 id="delete-prompt-title">删除这条提示词？</h2></div><IconButton label="关闭" onClick={onClose}><X size={18} /></IconButton></header>
      <p>“{prompt.title}”将从当前浏览器中移除。</p>
      <footer><button type="button" className="prompt-button prompt-button-quiet" onClick={onClose}>取消</button><button type="button" className="prompt-button prompt-button-danger" onClick={() => onConfirm(prompt.id)}>删除</button></footer>
    </section>
  </div>;
}

export default function PromptLibrary() {
  const fileInputRef = useRef(null);
  const [prompts, setPrompts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [draft, setDraft] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const savedPrompts = parseStoredValue(STORAGE_KEYS.prompts, null);
      const savedCategories = parseStoredValue(STORAGE_KEYS.categories, null);

      if (!active) return;
      const normalized = (Array.isArray(savedPrompts) ? savedPrompts : []).map(normalizePrompt).filter(Boolean);
      const importedCategories = Array.isArray(savedCategories) ? savedCategories.map((item) => String(item).trim()).filter(Boolean) : [];
      const promptCategories = normalized.map((prompt) => prompt.category);
      setPrompts(normalized);
      setCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...importedCategories, ...promptCategories])));
      setReady(true);
    };
    restore();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    persistStoredValue(STORAGE_KEYS.prompts, prompts);
    persistStoredValue(STORAGE_KEYS.categories, categories);
  }, [categories, prompts, ready]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const filteredPrompts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return prompts.filter((prompt) => {
      const matchesCategory = activeCategory === '全部' || prompt.category === activeCategory;
      const content = [prompt.title, prompt.content, prompt.category, ...prompt.tags].join(' ').toLocaleLowerCase();
      return matchesCategory && (!query || content.includes(query));
    });
  }, [activeCategory, prompts, search]);

  const favoritePrompts = filteredPrompts.filter((prompt) => prompt.favorite).slice(0, 3);
  const favoriteIds = new Set(favoritePrompts.map((prompt) => prompt.id));
  const libraryPrompts = filteredPrompts.filter((prompt) => !favoriteIds.has(prompt.id));
  const colorFor = (category) => CATEGORY_COLORS[Math.abs([...category].reduce((total, character) => total + character.charCodeAt(0), 0)) % CATEGORY_COLORS.length];

  const openNewPrompt = () => {
    setDraft({ id: '', title: '', category: activeCategory === '全部' ? categories[0] : activeCategory, content: '', tags: '' });
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
    setPrompts((current) => draft.id ? current.map((prompt) => prompt.id === draft.id ? { ...next, id: prompt.id, favorite: prompt.favorite } : prompt) : [next, ...current]);
    setCategories((current) => current.includes(next.category) ? current : [...current, next.category]);
    setDialog(null);
    setToast(draft.id ? '提示词已更新' : '提示词已创建');
  };

  const copyPrompt = async (prompt) => {
    try {
      await copyText(prompt.content);
      setCopiedId(prompt.id);
      window.setTimeout(() => setCopiedId((current) => current === prompt.id ? null : current), 1500);
    } catch {
      setToast('复制失败，请重试');
    }
  };

  const toggleFavorite = (id) => setPrompts((current) => current.map((prompt) => prompt.id === id ? { ...prompt, favorite: !prompt.favorite, updatedAt: Date.now() } : prompt));

  const addCategory = (value) => {
    const category = value.trim();
    if (!category) return;
    if (categories.includes(category)) setToast('该分类已存在');
    else {
      setCategories((current) => [...current, category]);
      setToast('分类已添加');
    }
    setDialog(null);
  };

  const importPrompts = async (event) => {
    const [file] = event.target.files || [];
    event.target.value = '';
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const rawPrompts = Array.isArray(payload) ? payload : payload?.prompts;
      if (!Array.isArray(rawPrompts)) throw new Error('invalid');
      const incoming = rawPrompts.map(normalizePrompt).filter(Boolean).map((prompt, index) => ({ ...prompt, id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}` }));
      if (!incoming.length) throw new Error('empty');
      const incomingCategories = Array.isArray(payload?.categories) ? payload.categories.map((category) => String(category).trim()).filter(Boolean) : [];
      setPrompts((current) => [...incoming, ...current]);
      setCategories((current) => Array.from(new Set([...current, ...incomingCategories, ...incoming.map((prompt) => prompt.category)])));
      setToast(`已导入 ${incoming.length} 条提示词`);
    } catch {
      setToast('导入失败，请选择有效的 JSON 文件');
    }
  };

  const countFor = (category) => category === '全部' ? prompts.length : prompts.filter((prompt) => prompt.category === category).length;
  const sectionTitle = search ? '检索结果' : activeCategory === '全部' ? '全部提示词' : activeCategory;

  return <div className="prompt-library">
    <style>{`
      .prompt-library { --prompt-ink: #1b1b1b; --prompt-muted: #787878; --prompt-line: rgba(27,27,27,.13); --prompt-paper: rgba(255,255,255,.88); --prompt-yellow: #ffe08a; --prompt-sun: #c79518; --prompt-sky: #3686c8; --prompt-mint: #398a70; --prompt-rose: #c46d76; --prompt-violet: #7f6fc0; --prompt-slate: #5f7182; color: var(--prompt-ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }
      .prompt-library * { box-sizing: border-box; }
      .prompt-library button, .prompt-library input, .prompt-library select, .prompt-library textarea { font: inherit; }
      .prompt-library button { cursor: pointer; }
      .prompt-library button:focus-visible, .prompt-library input:focus-visible, .prompt-library select:focus-visible, .prompt-library textarea:focus-visible { outline: 2px solid var(--prompt-ink); outline-offset: 3px; }
      .prompt-topline { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 24px; border-bottom: 1px solid var(--prompt-line); }
      .prompt-topline-left { display: inline-flex; align-items: center; gap: 11px; min-width: 0; }
      .prompt-back { display: inline-grid; width: 28px; height: 28px; place-items: center; border: 1px solid var(--prompt-line); border-radius: 6px; color: #666; background: rgba(255,255,255,.66); transition: color .18s ease, background .18s ease, transform .18s ease; }
      .prompt-back:hover { color: var(--prompt-ink); background: #fff9df; transform: translateX(-2px); }
      .prompt-brand { display: inline-flex; align-items: center; gap: 8px; color: #666; font: 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .prompt-brand i { width: 8px; height: 8px; border: 1px solid #a48830; border-radius: 50%; }
      .prompt-library-count { display: inline-flex; gap: 8px; color: #8a8a8a; font: 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .prompt-library-count b { color: var(--prompt-ink); font-weight: 700; }
      .prompt-head { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 24px; align-items: end; padding: 48px 0 32px; }
      .prompt-head h1 { max-width: 620px; margin: 0; font-size: 54px; font-weight: 780; line-height: 1.06; }
      .prompt-head h1 mark { padding: 0 4px; color: inherit; background: linear-gradient(transparent 63%, var(--prompt-yellow) 0); }
      .prompt-head p { margin: 14px 0 0; color: var(--prompt-muted); font-size: 14px; }
      .prompt-head-actions { display: flex; align-items: center; gap: 8px; }
      .prompt-button { display: inline-flex; min-height: 38px; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--prompt-line); border-radius: 6px; padding: 0 13px; background: rgba(255,255,255,.74); color: #555; font-size: 13px; transition: border-color .18s ease, background .18s ease, color .18s ease, transform .18s ease; }
      .prompt-button:hover:not(:disabled) { border-color: rgba(27,27,27,.3); background: #fff; color: var(--prompt-ink); transform: translateY(-1px); }
      .prompt-button:disabled { cursor: not-allowed; opacity: .45; }
      .prompt-button-solid { border-color: var(--prompt-ink); background: var(--prompt-ink); color: #fff; }
      .prompt-button-solid:hover:not(:disabled) { border-color: #333; background: #333; color: #fff; }
      .prompt-button-quiet { background: transparent; }
      .prompt-button-danger { border-color: #b64b50; background: #b64b50; color: #fff; }
      .prompt-button-danger:hover { border-color: #963940; background: #963940; color: #fff; }
      .prompt-search-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 12px; align-items: center; }
      .prompt-search { display: flex; height: 54px; align-items: center; gap: 11px; padding: 0 15px; border: 1px solid var(--prompt-line); border-radius: 8px; background: var(--prompt-paper); box-shadow: 0 11px 25px -30px rgba(0,0,0,.6); transition: border-color .2s ease, box-shadow .2s ease; }
      .prompt-search:focus-within { border-color: #a48830; box-shadow: 0 0 0 4px rgba(255,224,138,.48); }
      .prompt-search svg { flex: 0 0 auto; color: #888; }
      .prompt-search input { width: 100%; min-width: 0; border: 0 !important; padding: 0 !important; background: transparent !important; box-shadow: none !important; color: var(--prompt-ink); font-size: 15px; }
      .prompt-search input::placeholder { color: #a0a0a0; }
      .prompt-icon-button { display: inline-grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border: 1px solid transparent; border-radius: 6px; padding: 0; color: #777; background: transparent; transition: border-color .18s ease, background .18s ease, color .18s ease, transform .18s ease; }
      .prompt-icon-button:hover { border-color: var(--prompt-line); background: #fff; color: var(--prompt-ink); transform: translateY(-1px); }
      .prompt-icon-button.is-favorite { color: #b68513; }
      .prompt-icon-button.is-danger:hover { border-color: rgba(182,75,80,.34); color: #b64b50; }
      .prompt-filter-row { display: flex; align-items: center; gap: 8px; padding: 24px 0 43px; overflow-x: auto; scrollbar-width: none; }
      .prompt-filter-row::-webkit-scrollbar { display: none; }
      .prompt-filter { display: inline-flex; height: 34px; flex: 0 0 auto; align-items: center; gap: 7px; border: 1px solid var(--prompt-line); border-radius: 99px; padding: 0 12px; color: #6e6e6e; background: rgba(255,255,255,.7); font-size: 12px; transition: border-color .18s ease, background .18s ease, color .18s ease; }
      .prompt-filter:hover { border-color: rgba(27,27,27,.27); background: #fff; color: var(--prompt-ink); }
      .prompt-filter.is-active { border-color: #d7b846; color: var(--prompt-ink); background: var(--prompt-yellow); font-weight: 700; }
      .prompt-filter b { color: inherit; font: 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .prompt-filter-add { display: inline-grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border: 1px dashed rgba(164,136,48,.68); border-radius: 50%; color: #9a7515; background: rgba(255,249,223,.62); }
      .prompt-filter-add:hover { background: var(--prompt-yellow); color: var(--prompt-ink); }
      .prompt-section + .prompt-section { margin-top: 56px; }
      .prompt-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; margin-bottom: 16px; }
      .prompt-section-head h2 { margin: 0; font-size: 19px; font-weight: 760; line-height: 1; }
      .prompt-section-head span { color: #929292; font: 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .prompt-entry-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
      .prompt-entry { position: relative; display: flex; min-width: 0; min-height: 254px; flex-direction: column; overflow: hidden; border: 1px solid var(--prompt-line); border-radius: 8px; padding: 18px; background: var(--prompt-paper); box-shadow: 0 10px 25px -30px rgba(0,0,0,.7); transition: border-color .25s ease, box-shadow .25s ease, transform .25s cubic-bezier(.16,1,.3,1); }
      .prompt-entry::before { position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: var(--entry-color); content: ""; }
      .prompt-entry:hover { border-color: rgba(27,27,27,.28); box-shadow: 0 19px 35px -28px rgba(0,0,0,.45); transform: translateY(-4px); }
      .prompt-entry-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .prompt-category { display: inline-flex; align-items: center; gap: 6px; min-width: 0; overflow: hidden; color: var(--entry-color); font: 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; text-overflow: ellipsis; white-space: nowrap; }
      .prompt-category i { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 50%; background: currentColor; }
      .prompt-entry h2 { overflow: hidden; margin: 18px 0 0; color: var(--prompt-ink); font-size: 19px; font-weight: 750; line-height: 1.23; text-overflow: ellipsis; white-space: nowrap; }
      .prompt-entry-copy { display: -webkit-box; overflow: hidden; min-height: 58px; margin: 12px 0 0; color: #686868; font: 12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
      .prompt-entry-tags { display: flex; min-height: 18px; flex-wrap: wrap; gap: 5px; margin-top: 11px; overflow: hidden; }
      .prompt-entry-tags span { color: #777; font-size: 10px; line-height: 18px; }
      .prompt-entry footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: auto; padding-top: 14px; border-top: 1px solid rgba(27,27,27,.09); }
      .prompt-entry footer > span { color: #a0a0a0; font: 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; }
      .prompt-entry-actions { display: flex; align-items: center; gap: 3px; }
      .prompt-copy-button { display: inline-flex; height: 34px; align-items: center; gap: 5px; border: 0; border-radius: 6px; padding: 0 8px; color: #5f5f5f; background: transparent; font-size: 11px; transition: background .18s ease, color .18s ease; }
      .prompt-copy-button:hover, .prompt-copy-button.is-copied { color: var(--prompt-ink); background: var(--prompt-yellow); }
      .prompt-empty { display: grid; min-height: 236px; place-items: center; border: 1px dashed rgba(27,27,27,.26); border-radius: 8px; padding: 26px; text-align: center; }
      .prompt-empty-inner { display: grid; justify-items: center; }
      .prompt-empty-icon { display: grid; width: 48px; height: 48px; place-items: center; border: 1px solid rgba(164,136,48,.38); border-radius: 8px; color: #9a7515; background: #fff9df; }
      .prompt-empty h2 { margin: 16px 0 0; font-size: 17px; line-height: 1; }
      .prompt-empty p { margin: 8px 0 19px; color: #858585; font-size: 13px; }
      .prompt-toast { position: fixed; right: 28px; bottom: 28px; z-index: 30; display: inline-flex; align-items: center; gap: 7px; border: 1px solid rgba(27,27,27,.16); border-radius: 7px; padding: 10px 12px; color: #333; background: rgba(255,255,255,.96); box-shadow: 0 12px 28px -15px rgba(0,0,0,.35); font-size: 12px; animation: prompt-toast-in .25s cubic-bezier(.16,1,.3,1) both; }
      .prompt-toast i { width: 7px; height: 7px; border-radius: 50%; background: #a48830; }
      @keyframes prompt-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      .prompt-scrim { position: fixed; z-index: 120; inset: 0; display: grid; place-items: center; padding: 24px; background: rgba(22,22,22,.26); backdrop-filter: blur(4px); animation: prompt-scrim-in .18s ease both; }
      .prompt-dialog { width: min(100%, 570px); max-height: min(760px, calc(100vh - 48px)); overflow: auto; border: 1px solid rgba(27,27,27,.15); border-radius: 8px; padding: 24px; background: #fff; box-shadow: 0 25px 70px -30px rgba(0,0,0,.45); animation: prompt-dialog-in .25s cubic-bezier(.16,1,.3,1) both; }
      .prompt-dialog header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 23px; }
      .prompt-dialog header span { display: block; color: #8d8d8d; font: 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .prompt-dialog h2 { margin: 8px 0 0; font-size: 22px; line-height: 1; }
      .prompt-dialog label { display: grid; gap: 8px; margin-top: 15px; color: #5e5e5e; font-size: 12px; font-weight: 700; }
      .prompt-dialog label input, .prompt-dialog label select, .prompt-dialog label textarea { width: 100%; border: 1px solid var(--prompt-line) !important; border-radius: 6px !important; padding: 10px 11px !important; background: #fff !important; color: var(--prompt-ink); box-shadow: none !important; font-weight: 400; }
      .prompt-dialog label textarea { resize: vertical; font: 12px/1.65 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .prompt-dialog label :is(input,select,textarea):focus { border-color: #a48830 !important; box-shadow: 0 0 0 3px rgba(255,224,138,.48) !important; }
      .prompt-dialog footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
      .prompt-category-dialog { width: min(100%, 410px); }
      .prompt-delete-dialog { width: min(100%, 410px); }
      .prompt-delete-dialog > p { margin: 0; color: #707070; font-size: 14px; line-height: 1.7; }
      @keyframes prompt-scrim-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes prompt-dialog-in { from { opacity: 0; transform: translateY(12px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @media (max-width: 820px) { .prompt-entry-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.prompt-head h1 { font-size: 46px; } }
      @media (max-width: 620px) { .prompt-topline { padding-bottom: 20px; }.prompt-library-count { display: none; }.prompt-head { grid-template-columns: 1fr; gap: 22px; padding: 36px 0 25px; }.prompt-head h1 { font-size: 39px; }.prompt-head p { font-size: 13px; }.prompt-head-actions { width: 100%; }.prompt-head-actions .prompt-button { flex: 1; }.prompt-search-row { grid-template-columns: 1fr; }.prompt-search-row > .prompt-button { width: 100%; }.prompt-filter-row { padding: 18px 0 34px; }.prompt-entry-grid { grid-template-columns: 1fr; }.prompt-entry { min-height: 230px; }.prompt-section + .prompt-section { margin-top: 43px; }.prompt-dialog { padding: 20px; }.prompt-scrim { padding: 16px; }.prompt-toast { right: 20px; bottom: 20px; } }
      @media (prefers-reduced-motion: reduce) { .prompt-library *, .prompt-library *::before, .prompt-library *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
    `}</style>

    <header className="prompt-topline"><div className="prompt-topline-left"><a className="prompt-back" href="#/" aria-label="返回主页" title="返回主页"><ArrowLeft size={15} /></a><span className="prompt-brand"><i />VOYRA / PROMPT LIBRARY</span></div><span className="prompt-library-count"><b>{prompts.length}</b> 条提示词 <b>{categories.length}</b> 个分类</span></header>
    <section className="prompt-head"><div><h1>提示词<mark>库</mark></h1><p>你的常用表达与工作模板</p></div><div className="prompt-head-actions"><button type="button" className="prompt-button" onClick={() => fileInputRef.current?.click()}><Import size={16} />导入 JSON</button><button type="button" className="prompt-button prompt-button-solid" onClick={openNewPrompt}><Plus size={17} />新建提示词</button><input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={importPrompts} /></div></section>
    <section className="prompt-search-row"><label className="prompt-search"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标题、内容或标签" aria-label="搜索提示词" />{search && <IconButton label="清空搜索" onClick={() => setSearch('')}><X size={16} /></IconButton>}</label><button type="button" className="prompt-button" onClick={() => setDialog('category')}><FolderPlus size={16} />新建分类</button></section>
    <nav className="prompt-filter-row" aria-label="提示词分类"><button type="button" className={`prompt-filter${activeCategory === '全部' ? ' is-active' : ''}`} onClick={() => setActiveCategory('全部')}>全部 <b>{countFor('全部')}</b></button>{categories.map((category) => <button type="button" key={category} className={`prompt-filter${activeCategory === category ? ' is-active' : ''}`} onClick={() => setActiveCategory(category)}>{category} <b>{countFor(category)}</b></button>)}<button type="button" className="prompt-filter-add" title="新建分类" aria-label="新建分类" onClick={() => setDialog('category')}><Plus size={16} /></button></nav>

    {!ready ? <section className="prompt-empty"><div className="prompt-empty-inner"><div className="prompt-empty-icon"><Heart size={21} /></div><h2>正在整理</h2></div></section> : filteredPrompts.length === 0 ? <section className="prompt-empty"><div className="prompt-empty-inner"><div className="prompt-empty-icon"><Plus size={22} /></div><h2>{search ? '没有匹配的提示词' : '从第一条开始'}</h2><p>{search ? '换一个关键词试试' : '新建或导入你的提示词'}</p>{!search && <button type="button" className="prompt-button prompt-button-solid" onClick={openNewPrompt}><Plus size={16} />新建提示词</button>}</div></section> : <>
      {favoritePrompts.length > 0 && <section className="prompt-section"><header className="prompt-section-head"><h2>常用</h2><span>FAVORITES / {favoritePrompts.length}</span></header><div className="prompt-entry-grid">{favoritePrompts.map((prompt) => <PromptEntry key={prompt.id} prompt={prompt} color={colorFor(prompt.category)} copiedId={copiedId} onCopy={copyPrompt} onToggleFavorite={toggleFavorite} onEdit={openEditPrompt} onDelete={(item) => { setDraft(item); setDialog('delete'); }} />)}</div></section>}
      {libraryPrompts.length > 0 && <section className="prompt-section"><header className="prompt-section-head"><h2>{sectionTitle}</h2><span>{libraryPrompts.length} ITEMS</span></header><div className="prompt-entry-grid">{libraryPrompts.map((prompt) => <PromptEntry key={prompt.id} prompt={prompt} color={colorFor(prompt.category)} copiedId={copiedId} onCopy={copyPrompt} onToggleFavorite={toggleFavorite} onEdit={openEditPrompt} onDelete={(item) => { setDraft(item); setDialog('delete'); }} />)}</div></section>}
    </>}

    {toast && <div className="prompt-toast" role="status"><i />{toast}</div>}
    {dialog === 'editor' && draft && <PromptDialog categories={categories} draft={draft} onChange={setDraft} onSave={savePrompt} onClose={() => setDialog(null)} />}
    {dialog === 'category' && <CategoryDialog onClose={() => setDialog(null)} onSave={addCategory} />}
    {dialog === 'delete' && draft && <DeleteDialog prompt={draft} onClose={() => setDialog(null)} onConfirm={(id) => { setPrompts((current) => current.filter((prompt) => prompt.id !== id)); setDialog(null); setToast('提示词已删除'); }} />}
  </div>;
}
