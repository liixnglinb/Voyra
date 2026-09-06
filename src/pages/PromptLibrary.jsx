import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowUp, Check, Copy, Download, FolderPlus, Import, Lock, LockOpen, Pencil, Plus, Search, Star, Trash2, X, Cloud, CloudOff, RefreshCw,
  PenLine, Briefcase, Code2, GraduationCap, Coffee, HeartPulse, Bot, Shuffle, LayoutGrid, List, MousePointerClick, RotateCcw,
} from 'lucide-react';
import {
  PROMPT_CATEGORIES, PROMPT_CATEGORY_META, PROMPT_PRESETS,
} from '../data/prompt-presets';

/* ============ 存储层：Bmob 云端 + 本地镜像兜底 ============ */
const CLOUD_KEY = 'voyra.prompt-library';
const MIRROR_KEY = 'voyra.prompt-library.mirror';
const MIGRATED_KEY = 'voyra.prompt-library.migrated';
const VIEW_KEY = 'voyra.prompt-library.view';
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

/* 提示词里的【变量】占位（弹窗内可逐个填写后一键复制） */
const VAR_SPLIT_RE = /(【[^【】]{1,24}】)/g;
const VAR_NAME_RE = /^【([^【】]{1,24})】$/;

function extractVars(content) {
  const seen = new Set();
  const out = [];
  for (const segment of content.split(VAR_SPLIT_RE)) {
    const match = segment.match(VAR_NAME_RE);
    if (match && !seen.has(match[1])) { seen.add(match[1]); out.push(match[1]); }
  }
  return out;
}

/* ============ 小组件 ============ */
function IconButton({ label, children, className = '', ...props }) {
  return <button type="button" className={`pl-icon-btn ${className}`} aria-label={label} title={label} {...props}>{children}</button>;
}

function PromptCard({ prompt, color, admin, copiedId, onOpen, onCopy, onToggleFavorite, onEdit, onDelete }) {
  const preview = prompt.content.length > 150 ? `${prompt.content.slice(0, 150)}…` : prompt.content;
  const hasVars = /【[^【】]{1,24}】/.test(prompt.content);
  return <article
    className="pl-card"
    style={{ '--cat': color }}
    onClick={() => onOpen(prompt)}
    role="button"
    tabIndex={0}
    onKeyDown={(event) => { if (event.key === 'Enter' && event.target === event.currentTarget) onOpen(prompt); }}
  >
    <header className="pl-cd-top">
      <div className="pl-cd-title">
        <h2>{prompt.title}{prompt.titleEn && <em style={{ color }}>{prompt.titleEn}</em>}</h2>
        <div className="pl-cd-meta">
          {prompt.sub && <span className="pl-cd-sub">{prompt.sub}</span>}
          {hasVars && <span className="pl-cd-vars"><MousePointerClick size={11} />可填空</span>}
        </div>
      </div>
      {admin && <IconButton
        label={prompt.favorite ? '取消收藏' : '收藏'}
        className={`pl-star${prompt.favorite ? ' is-fav' : ''}`}
        onClick={(event) => { event.stopPropagation(); onToggleFavorite(prompt.id); }}
      >
        <Star size={17} fill={prompt.favorite ? 'currentColor' : 'none'} />
      </IconButton>}
    </header>
    {prompt.summary && <p className="pl-cd-quote"><i>"</i>{prompt.summary}</p>}
    <pre className="pl-cd-preview">{preview}</pre>
    <footer className="pl-cd-foot">
      <span className="pl-cd-tags">{prompt.tags.slice(0, 2).map((tag) => `#${tag}`).join(' ')}</span>
      <div className="pl-cd-actions">
        <button
          type="button"
          className={`pl-copy-btn${copiedId === prompt.id ? ' is-copied' : ''}`}
          onClick={(event) => { event.stopPropagation(); onCopy(prompt); }}
        >
          {copiedId === prompt.id ? <Check size={14} /> : <Copy size={14} />}{copiedId === prompt.id ? '已复制' : '复制'}
        </button>
        {admin && !prompt.builtin && <>
          <IconButton label="编辑提示词" onClick={(event) => { event.stopPropagation(); onEdit(prompt); }}><Pencil size={14} /></IconButton>
          <IconButton label="删除提示词" className="is-danger" onClick={(event) => { event.stopPropagation(); onDelete(prompt); }}><Trash2 size={14} /></IconButton>
        </>}
      </div>
    </footer>
  </article>;
}

/* 详情弹窗：查看全文 + 逐个填写【变量】 + 一键复制填好的提示词 */
function PromptDetailModal({ prompt, color, onClose }) {
  const [vals, setVals] = useState({});
  const [copied, setCopied] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const vars = useMemo(() => extractVars(prompt.content), [prompt.content]);
  const segments = useMemo(() => prompt.content.split(VAR_SPLIT_RE), [prompt.content]);
  const filledCount = vars.filter((name) => (vals[name] || '').trim()).length;
  const composed = useMemo(() => prompt.content.replace(/【([^【】]{1,24})】/g, (raw, name) => {
    const value = (vals[name] || '').trim();
    return value ? value : raw;
  }), [prompt.content, vals]);

  const flash = (setter) => {
    setter(true);
    window.setTimeout(() => setter(false), 1500);
  };
  const copyFilled = async () => {
    try { await copyText(composed); flash(setCopied); } catch { /* ignore */ }
  };
  const copyOriginal = async () => {
    try { await copyText(prompt.content); flash(setCopiedRaw); } catch { /* ignore */ }
  };

  return <div className="pl-scrim" role="presentation" onMouseDown={onClose}>
    <section className="pl-detail" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <div className="pl-detail-head">
          <div className="pl-detail-tags">
            <span className="pl-detail-cat" style={{ color }}>{prompt.cat}</span>
            {prompt.sub && <><i>·</i><span>{prompt.sub}</span></>}
            {prompt.tags.slice(0, 3).map((tag) => <i key={tag}>#{tag}</i>)}
          </div>
          <h2>{prompt.title}{prompt.titleEn && <em>{prompt.titleEn}</em>}</h2>
          {prompt.summary && <p>{prompt.summary}</p>}
        </div>
        <IconButton label="关闭" onClick={onClose}><X size={18} /></IconButton>
      </header>
      {vars.length > 0 && (
        <div className="pl-detail-vars">
          <div className="pl-detail-vars-head">
            <span>填写变量（也可直接在正文里点填）</span>
            <em>{filledCount}/{vars.length}</em>
          </div>
          <div className="pl-detail-bar" role="progressbar" aria-valuemin={0} aria-valuemax={vars.length} aria-valuenow={filledCount}>
            <span style={{ width: `${(filledCount / vars.length) * 100}%` }} />
          </div>
          {vars.map((name) => (
            <label key={name}>
              <span>{name}</span>
              <input
                value={vals[name] || ''}
                placeholder={`填「${name}」`}
                onChange={(event) => setVals((current) => ({ ...current, [name]: event.target.value }))}
              />
            </label>
          ))}
        </div>
      )}
      <pre className="pl-detail-body">{segments.map((segment, index) => {
        const match = segment.match(VAR_NAME_RE);
        if (!match) return <React.Fragment key={index}>{segment}</React.Fragment>;
        const name = match[1];
        const isFilled = !!(vals[name] || '').trim();
        return (
          <span key={index} className={`pl-var${isFilled ? ' is-filled' : ''}`}>
            <input
              value={vals[name] || ''}
              placeholder={name}
              aria-label={`变量：${name}`}
              style={{ width: `calc(${Math.max(4, name.length)} * 1.1em + 36px)` }}
              onChange={(event) => setVals((current) => ({ ...current, [name]: event.target.value }))}
            />
          </span>
        );
      })}</pre>
      <footer>
        <span className="pl-detail-note">{vars.length ? '未填写的变量会保留【】占位' : '可直接复制使用'} · Esc 关闭</span>
        <div>
          {filledCount > 0 && (
            <>
              <button type="button" className="pl-btn pl-btn-quiet" onClick={copyOriginal}>
                {copiedRaw ? <Check size={13} /> : <Copy size={13} />}{copiedRaw ? '已复制' : '复制原文'}
              </button>
              <button type="button" className="pl-btn pl-btn-quiet" onClick={() => setVals({})}><RotateCcw size={13} />重置</button>
            </>
          )}
          <button type="button" className={`pl-btn pl-btn-solid${copied ? ' is-copied' : ''}`} onClick={copyFilled}>
            {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? '已复制' : '复制提示词'}
          </button>
        </div>
      </footer>
    </section>
  </div>;
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
      <label>内容（【】内为变量，使用时可逐个填写）<textarea value={draft.content} onChange={(event) => onChange({ ...draft, content: event.target.value })} placeholder="写下可以直接复制使用的提示词，变量用【】标注" rows={9} /></label>
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
const CAT_ICONS = {
  写作: PenLine, 职场: Briefcase, 编程: Code2, 学习: GraduationCap,
  生活: Coffee, 健康: HeartPulse, 'AI 开发': Bot,
};
const FAV_CAT = '收藏';

export default function PromptLibrary() {
  const fileInputRef = useRef(null);
  const searchRef = useRef(null);
  const saveTimerRef = useRef(null);
  const stateRef = useRef(EMPTY_STATE);
  const dirtyRef = useRef(false);
  const [userState, setUserState] = useState(EMPTY_STATE);
  const [activeCat, setActiveCat] = useState('全部');
  const [activeSub, setActiveSub] = useState('全部');
  const [search, setSearch] = useState('');
  const [view, setView] = useState(() => (parseLocal(VIEW_KEY, null) === 'list' ? 'list' : 'card'));
  const [cloudStatus, setCloudStatus] = useState('syncing');
  const [dialog, setDialog] = useState(null);
  const [detail, setDetail] = useState(null);
  const [draft, setDraft] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState('');
  const [admin, setAdmin] = useState(() => {
    try { return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'; } catch { return false; }
  });
  const [pwDialog, setPwDialog] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [showTop, setShowTop] = useState(false);

  /* 回到顶部按钮：页面滚动超过一屏后出现（兼容 window 与 .tool-wrap 两种滚动容器） */
  useEffect(() => {
    const wrap = document.querySelector('.tool-wrap');
    const onScroll = () => {
      const y = wrap && wrap.scrollTop > 0 ? wrap.scrollTop : (window.scrollY || 0);
      setShowTop(y > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    wrap?.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      wrap?.removeEventListener('scroll', onScroll);
    };
  }, []);

  const toTop = () => {
    const wrap = document.querySelector('.tool-wrap');
    if (wrap && wrap.scrollTop > 0) wrap.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* 首次加载：本地镜像/旧数据迁移同步完成 → 内置词库立即可浏览；
     云端数据后台静默拉取，到达后合并（不阻塞首屏） */
  useEffect(() => {
    let alive = true;
    let initial = parseLocal(MIRROR_KEY, null);
    if (!isMeaningful(initial)) {
      initial = null;
      if (!window.localStorage.getItem(MIGRATED_KEY)) {
        writeLocal(MIGRATED_KEY, true);
        initial = readLegacyState();
      }
    }
    const base = initial ? sanitizeState(initial) : EMPTY_STATE;
    stateRef.current = base;
    setUserState(base);

    (async () => {
      const cloud = await loadCloudState();
      if (!alive) return;
      if (cloud) {
        const merged = {
          ...cloud,
          categories: Array.from(new Set([...cloud.categories, ...stateRef.current.categories])),
        };
        stateRef.current = merged;
        setUserState(merged);
        setCloudStatus('ok');
      } else {
        setCloudStatus('off');
      }
    })();
    return () => { alive = false; };
  }, []);

  /* 状态变更 → 防抖写云端 + 本地镜像（仅用户主动改动才上云） */
  useEffect(() => {
    writeLocal(MIRROR_KEY, userState);
    if (!dirtyRef.current) return undefined;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const ok = await saveCloudState(userState);
      if (ok) { dirtyRef.current = false; setCloudStatus('ok'); }
    }, 600);
    return () => clearTimeout(saveTimerRef.current);
  }, [userState]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  /* 弹窗打开时锁住背景滚动 */
  const anyOverlay = Boolean(dialog || detail || pwDialog);
  useEffect(() => {
    if (!anyOverlay) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [anyOverlay]);

  /* 键盘细节：/ 聚焦搜索，Esc 逐层退出 */
  useEffect(() => {
    const onKey = (event) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (event.key === '/' && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (event.key === 'Escape') {
        if (detail) setDetail(null);
        else if (dialog) setDialog(null);
        else if (pwDialog) { setPwDialog(false); setPwInput(''); }
        else if (search) { setSearch(''); searchRef.current?.blur(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail, dialog, pwDialog, search]);

  const updateUserState = (updater) => {
    const next = typeof updater === 'function' ? updater(stateRef.current) : updater;
    dirtyRef.current = true;
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
  const favSet = useMemo(() => new Set(userState.favorites), [userState.favorites]);
  const favCount = useMemo(() => allPrompts.filter((prompt) => favSet.has(prompt.id)).length, [allPrompts, favSet]);
  const showFav = admin || favCount > 0;

  const searching = search.trim().length > 0;

  const filteredPrompts = useMemo(() => {
    if (searching) {
      const query = search.trim().toLocaleLowerCase();
      return allPrompts.filter((prompt) => [prompt.title, prompt.titleEn, prompt.summary, prompt.content, prompt.cat, prompt.sub, ...prompt.tags]
        .join(' ').toLocaleLowerCase().includes(query));
    }
    if (activeCat === FAV_CAT) return allPrompts.filter((prompt) => favSet.has(prompt.id));
    return allPrompts.filter((prompt) => {
      const matchCat = activeCat === '全部' || prompt.cat === activeCat;
      const matchSub = activeSub === '全部' || (prompt.sub || '') === activeSub;
      return matchCat && matchSub;
    });
  }, [allPrompts, favSet, searching, search, activeCat, activeSub]);

  const catCount = (category) => {
    if (category === '全部') return allPrompts.length;
    if (category === FAV_CAT) return favCount;
    return allPrompts.filter((prompt) => prompt.cat === category).length;
  };

  const subsForCat = (category) => {
    const builtin = PROMPT_CATEGORIES.find((c) => c.key === category);
    if (builtin) return builtin.subs;
    return Array.from(new Set(allPrompts.filter((prompt) => prompt.cat === category).map((prompt) => prompt.sub).filter(Boolean)));
  };

  const sideSubs = useMemo(() => {
    if (activeCat === '全部' || activeCat === FAV_CAT || searching) return [];
    return subsForCat(activeCat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCat, searching, allPrompts]);

  const subOptions = useMemo(() => subsForCat(draft?.cat || activeCat), [draft?.cat, activeCat, allPrompts]);

  const subCount = (sub) => allPrompts.filter((prompt) => prompt.cat === activeCat && (prompt.sub || '') === sub).length;
  const colorFor = (prompt) => PROMPT_CATEGORY_META[prompt.cat]?.color || '#5f7182';
  const enFor = (category) => PROMPT_CATEGORY_META[category]?.En || '';

  /* 收藏置顶 */
  const sortedPrompts = useMemo(() => {
    const set = new Set(userState.favorites);
    return [...filteredPrompts].sort((a, b) => (set.has(b.id) ? 1 : 0) - (set.has(a.id) ? 1 : 0));
  }, [filteredPrompts, userState.favorites]);

  const openNewPrompt = () => {
    setDraft({
      id: '', title: '', titleEn: '', summary: '',
      cat: activeCat === '全部' || activeCat === FAV_CAT || searching ? PROMPT_CATEGORIES[0].key : activeCat,
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

  const switchView = (next) => {
    setView(next);
    writeLocal(VIEW_KEY, next);
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

  const mainTitle = searching
    ? '检索结果'
    : activeCat === FAV_CAT ? '我的收藏' : activeCat === '全部' ? '全部提示词' : `${activeCat}提示词`;
  const sectionTitle = searching ? '全局搜索' : activeSub === '全部' ? '全部子类' : activeSub;
  const sectionCount = sortedPrompts.length;
  /* 切换分类/子类时整段内容丝滑上浮入场；输入搜索词时不重触发 */
  const sectionKey = searching ? 'search' : `${activeCat}|${activeSub}`;
  const cloudMeta = {
    syncing: { text: '同步中', Icon: RefreshCw, cls: ' is-sync', title: '正在检查云端数据…' },
    ok: { text: '云端已同步', Icon: Cloud, cls: '', title: '数据已同步到 Bmob 云端，跨设备可用' },
    off: { text: '本地模式', Icon: CloudOff, cls: ' is-off', title: '云端暂时不可用，改动已保存在本机，恢复后自动同步' },
  }[cloudStatus];

  /* 随机抽一个：从当前筛选结果里随机打开一条详情 */
  const surprise = () => {
    const pool = sortedPrompts.length ? sortedPrompts : allPrompts;
    if (!pool.length) return;
    setDetail(pool[Math.floor(Math.random() * pool.length)]);
  };
  return <div className="pl-page">
    <style>{`
      .pl-page { --ink:#1b1b1b; --muted:#8a8a8a; --line:rgba(27,27,27,.12); --paper:#fff; --gold:#a48830; --soft:#fff9df; --hl:#ffe08a;
        --pl-ease:cubic-bezier(.22,1,.36,1);
        color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; }
      .pl-page * { box-sizing:border-box; }
      .pl-page button, .pl-page input, .pl-page select, .pl-page textarea { font:inherit; }
      .pl-page button { cursor:pointer; }
      .pl-page button:focus-visible, .pl-page a:focus-visible, .pl-page input:focus-visible { outline:1.5px solid var(--ink); outline-offset:2px; }
      .tool-content-prompt .pl-page :is(input,select,textarea):focus { border-color:rgba(27,27,27,.3) !important; background:#fff !important; box-shadow:none !important; outline:none; }

      /* ===== 顶栏（自然滚走）+ 分类 chips（完整吸顶） ===== */
      .pl-topbar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:15px 0 12px; }
      .pl-topbar-left { display:inline-flex; align-items:center; gap:11px; min-width:0; }
      .pl-back { display:inline-grid; width:32px; height:32px; place-items:center; border:1px solid var(--line); border-radius:9px; color:#666; background:#fff; transition:color .3s var(--pl-ease), background .3s var(--pl-ease), border-color .3s var(--pl-ease), transform .3s var(--pl-ease); }
      .pl-back:hover { color:#fff; background:var(--ink); border-color:var(--ink); transform:translateX(-3px); }
      .pl-back:active { transform:translateX(-1px) scale(.94); transition-duration:.1s; }
      .pl-brand { display:inline-flex; align-items:center; gap:7px; color:#555; font:700 15px/1 Inter,ui-sans-serif,system-ui,sans-serif; letter-spacing:-.01em; white-space:nowrap; }
      .pl-brand i { width:9px; height:9px; border:1.5px solid var(--gold); border-radius:50%; transition:transform .4s var(--pl-ease); }
      .pl-brand:hover i { transform:rotate(72deg) scale(1.15); }
      .pl-brand em { color:#999; font:400 12px/1 Inter,ui-sans-serif,system-ui,sans-serif; font-style:normal; }
      .pl-stats { display:inline-flex; align-items:center; gap:6px; padding:5px 11px; border:1px solid var(--line); border-radius:99px; color:#a5a5a5; font:500 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; white-space:nowrap; }
      .pl-stats b { color:#555; font-weight:600; }
      .pl-cloud { display:inline-flex; align-items:center; gap:5px; padding:5px 10px; border:1px solid var(--line); border-radius:99px; color:#888; font:10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; white-space:nowrap; transition:border-color .3s var(--pl-ease), color .3s var(--pl-ease); }
      .pl-cloud:hover { border-color:rgba(27,27,27,.26); color:#555; }
      .pl-cloud svg { color:var(--gold); }
      .pl-cloud.is-sync { color:var(--gold); border-color:rgba(164,136,48,.4); }
      .pl-cloud.is-sync svg { animation:pl-rotate 1.4s linear infinite; }
      @keyframes pl-rotate { to { transform:rotate(360deg); } }
      .pl-cloud.is-off { color:#b64b50; border-color:rgba(182,75,80,.3); }
      .pl-cloud.is-off svg { color:#b64b50; }
      .pl-topbar-right { display:flex; align-items:center; gap:8px; min-width:0; }
      .pl-search { display:flex; width:min(340px,44vw); height:38px; align-items:center; gap:9px; padding:0 14px; border:1px solid var(--line); border-radius:99px; background:#fff; transition:width .38s var(--pl-ease), border-color .25s ease, box-shadow .25s ease; }
      .pl-search:focus-within { width:min(400px,52vw); border-color:rgba(27,27,27,.3); box-shadow:0 0 0 3.5px rgba(255,224,138,.5); }
      .pl-search svg { flex:0 0 auto; color:#999; transition:color .25s ease; }
      .pl-search:focus-within svg { color:var(--gold); }
      .pl-search input { flex:1; min-width:0; border:0 !important; padding:0 !important; background:transparent !important; box-shadow:none !important; color:var(--ink); font-size:13.5px; }
      .pl-search input::placeholder { color:#a8a8a8; }
      .pl-search kbd { flex:0 0 auto; padding:2px 6px; border:1px solid var(--line); border-radius:5px; background:#fafafa; color:#999; font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; }

      /* ===== 按钮 ===== */
      .pl-btn { display:inline-flex; min-height:38px; align-items:center; justify-content:center; gap:7px; border:1px solid var(--line); border-radius:9px; padding:0 14px; background:#fff; color:#555; font-size:13px; white-space:nowrap; transition:border-color .28s var(--pl-ease), background .28s var(--pl-ease), color .28s var(--pl-ease), transform .28s var(--pl-ease), box-shadow .28s var(--pl-ease); }
      .pl-btn:hover:not(:disabled) { border-color:rgba(27,27,27,.32); background:#fff; color:var(--ink); transform:translateY(-1.5px); box-shadow:0 8px 16px -10px rgba(27,27,27,.35); }
      .pl-btn:active:not(:disabled) { transform:translateY(0) scale(.97); transition-duration:.1s; }
      .pl-btn:disabled { cursor:not-allowed; opacity:.45; }
      .pl-btn-solid { border-color:var(--ink); background:var(--ink); color:#fff; }
      .pl-btn-solid:hover:not(:disabled) { border-color:#333; background:#333; color:#fff; box-shadow:0 10px 20px -10px rgba(27,27,27,.55); }
      .pl-btn-solid.is-copied { border-color:#b68513; background:#b68513; color:#fff; }
      .pl-btn-quiet { background:transparent; }
      .pl-btn-danger { border-color:#b64b50; background:#b64b50; color:#fff; }
      .pl-btn-danger:hover:not(:disabled) { border-color:#963940; background:#963940; color:#fff; }
      .pl-icon-btn { display:inline-grid; width:30px; height:30px; flex:0 0 30px; place-items:center; border:1px solid transparent; border-radius:8px; padding:0; color:#888; background:transparent; transition:border-color .28s var(--pl-ease), background .28s var(--pl-ease), color .28s var(--pl-ease), transform .28s var(--pl-ease); }
      .pl-icon-btn:hover { border-color:var(--line); background:#fff; color:var(--ink); transform:translateY(-1.5px); }
      .pl-icon-btn:active { transform:translateY(0) scale(.94); transition-duration:.1s; }
      .pl-icon-btn.is-danger:hover { border-color:rgba(182,75,80,.34); color:#b64b50; }
      .pl-lock { border-color:var(--line); background:#fff; color:#999; }
      .pl-lock:hover { color:var(--ink); background:var(--soft); }
      .pl-lock.is-on { border-color:rgba(164,136,48,.5); background:var(--soft); color:var(--gold); }

      /* ===== 分类 chips（吸顶筛选栏：顶栏滚走后完整停留，不留半截） ===== */
      .pl-chips { position:sticky; top:0; z-index:30; display:flex; gap:7px; align-items:center; padding:11px 24px; margin:0 -24px; overflow-x:auto; scrollbar-width:none; background:rgba(255,255,255,.94); backdrop-filter:blur(14px) saturate(1.4); -webkit-backdrop-filter:blur(14px) saturate(1.4); border-bottom:1px solid var(--line); }
      .pl-chips::-webkit-scrollbar { display:none; }
      .pl-chip { position:relative; z-index:0; display:inline-flex; height:34px; flex:0 0 auto; align-items:center; gap:7px; border:1px solid var(--line); border-radius:99px; padding:0 15px; background:#fff; color:#666; font-size:13px; font-weight:600; transition:color .3s var(--pl-ease), border-color .3s var(--pl-ease), transform .3s var(--pl-ease), box-shadow .3s var(--pl-ease); }
      .pl-chip svg { color:#ababab; transition:color .3s var(--pl-ease); }
      .pl-chip b { color:#b3b3b3; font:600 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; font-variant-numeric:tabular-nums; transition:color .3s var(--pl-ease); }
      .pl-chip::before { content:''; position:absolute; inset:0; z-index:-1; border-radius:inherit; background:#f7f3e6; transform:scaleX(0); transform-origin:0 50%; transition:transform .34s var(--pl-ease); }
      .pl-chip:hover { border-color:rgba(27,27,27,.28); color:var(--ink); transform:translateY(-1.5px); box-shadow:0 8px 16px -10px rgba(27,27,27,.3); }
      .pl-chip:hover svg { color:var(--gold); }
      .pl-chip:hover::before { transform:scaleX(1); }
      .pl-chip:active { transform:translateY(0) scale(.96); transition-duration:.1s; }
      .pl-chip.is-active { border-color:var(--ink); background:var(--ink); color:#fff; }
      .pl-chip.is-active::before { content:none; }
      .pl-chip.is-active svg { color:var(--hl); }
      .pl-chip.is-active b { color:rgba(255,255,255,.62); }
      .pl-chip.is-active:hover { transform:translateY(-1.5px); box-shadow:0 10px 20px -10px rgba(27,27,27,.5); }
      .pl-chip.is-fav svg { color:#d4a930; }
      .pl-chip-add { display:inline-grid; width:34px; height:34px; flex:0 0 34px; place-items:center; border:1px dashed rgba(164,136,48,.6); border-radius:50%; color:var(--gold); background:var(--soft); transition:background .3s var(--pl-ease), color .3s var(--pl-ease), transform .4s var(--pl-ease); }
      .pl-chip-add:hover { background:var(--hl); color:var(--ink); transform:rotate(90deg) scale(1.06); }
      .pl-chip-add:active { transform:rotate(90deg) scale(.96); transition-duration:.1s; }

      /* ===== 主体（单栏满宽平铺；分类筛选全在顶部 chips，子分类在标题下横排） ===== */
      .pl-body { padding-top:24px; }
      .pl-admin-tools { display:inline-flex; align-items:center; gap:2px; margin-right:6px; }

      .pl-main { min-width:0; }
      .pl-main > * { animation:pl-rise .42s var(--pl-ease) both; }
      .pl-main > *:nth-child(2) { animation-delay:.05s; }
      .pl-main > *:nth-child(3) { animation-delay:.09s; }
      .pl-main > *:nth-child(n+4) { animation-delay:.13s; }
      @keyframes pl-rise { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
      .pl-main h1 { margin:0; font-size:44px; font-weight:780; letter-spacing:-.02em; line-height:1.05; }
      .pl-main h1 em { margin-left:12px; color:#c8c8c8; font:600 20px/1 Inter,ui-sans-serif,system-ui,sans-serif; font-style:normal; letter-spacing:0; }
      .pl-main-head { position:relative; display:flex; align-items:baseline; gap:12px; margin:24px 0 14px; padding-bottom:12px; border-bottom:1px solid var(--line); }
      .pl-main-head::after { content:''; position:absolute; left:0; bottom:-1px; width:38px; height:2px; border-radius:2px; background:var(--gold); }
      .pl-main-head b { font-size:16px; font-weight:750; }
      .pl-main-head span { color:#a0a0a0; font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace; font-variant-numeric:tabular-nums; }
      .pl-main-head .pl-favhint { margin-left:auto; color:#b68513; font-size:11.5px; }
      .pl-head-tools { margin-left:auto; display:inline-flex; align-items:center; gap:10px; }
      .pl-main-head .pl-favhint + .pl-head-tools { margin-left:0; }
      .pl-random { min-height:32px; padding:0 12px; font-size:12.5px; border-radius:8px; color:#777; background:rgba(255,249,223,.6); border-color:rgba(164,136,48,.3); }
      .pl-random svg { color:var(--gold); }
      .pl-random:hover { color:var(--ink); background:var(--hl); border-color:rgba(164,136,48,.5); }
      .pl-viewtoggle { display:inline-flex; align-items:center; border:1px solid var(--line); border-radius:8px; background:#fff; padding:2px; }
      .pl-viewtoggle button { display:inline-grid; width:30px; height:26px; place-items:center; border:0; border-radius:6px; background:transparent; color:#a0a0a0; transition:background .22s var(--pl-ease), color .22s var(--pl-ease); }
      .pl-viewtoggle button:hover { color:var(--ink); background:#f5f2e9; }
      .pl-viewtoggle button.is-active { background:var(--ink); color:#fff; }
      .pl-tip { display:flex; align-items:center; gap:6px; margin:-4px 0 16px; color:#b8b8b8; font-size:11.5px; }
      .pl-tip svg { flex:0 0 auto; color:var(--gold); }
      .pl-tip kbd { padding:1px 5px; border:1px solid var(--line); border-radius:4px; background:#fafafa; color:#999; font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace; }

      /* ===== 卡片网格 ===== */
      .pl-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
      .pl-card { position:relative; display:flex; min-width:0; min-height:252px; flex-direction:column; overflow:hidden; border:1px solid var(--line); border-radius:12px; padding:18px 18px 14px; background:#fff; box-shadow:0 1px 2px rgba(16,20,30,.04); cursor:pointer; transition:border-color .22s ease, box-shadow .22s ease, transform .22s cubic-bezier(.16,1,.3,1); }
      .pl-card::before { content:''; position:absolute; left:0; top:18px; bottom:18px; width:3px; border-radius:0 3px 3px 0; background:var(--cat, var(--gold)); opacity:.55; transition:opacity .22s ease, top .22s ease, bottom .22s ease; }
      .pl-card:hover { border-color:rgba(27,27,27,.26); box-shadow:0 20px 38px -26px rgba(0,0,0,.4); transform:translateY(-4px); }
      .pl-card:hover::before { opacity:1; top:12px; bottom:12px; }
      .pl-card:focus-visible { outline:1.5px solid var(--ink); outline-offset:2px; }
      .pl-cd-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
      .pl-cd-title { display:flex; flex-direction:column; gap:7px; min-width:0; }
      .pl-cd-top h2 { margin:0; font-size:19px; font-weight:760; line-height:1.25; letter-spacing:-.01em; }
      .pl-cd-top h2 em { margin-left:8px; font:650 14px/1 Inter,ui-sans-serif,system-ui,sans-serif; font-style:normal; letter-spacing:0; white-space:nowrap; }
      .pl-cd-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .pl-cd-sub { padding:2.5px 8px; border:1px solid rgba(27,27,27,.1); border-radius:6px; background:#fafaf7; color:#888; font-size:10.5px; font-weight:600; }
      .pl-cd-vars { display:inline-flex; align-items:center; gap:3px; padding:2.5px 8px; border:1px solid rgba(164,136,48,.3); border-radius:6px; background:rgba(255,249,223,.7); color:#a48830; font-size:10.5px; font-weight:600; }
      .pl-star { margin:-4px -6px 0 0; }
      .pl-star.is-fav { color:#d4a930; }
      .pl-star.is-fav:hover { color:#b68513; }
      .pl-cd-quote { position:relative; margin:12px 0 0; padding-left:14px; color:#5f5f5f; font-size:12.5px; line-height:1.7; }
      .pl-cd-quote i { position:absolute; left:0; top:0; color:var(--gold); font:700 15px/1 Georgia,serif; }
      .pl-cd-preview { flex:1; overflow:hidden; margin:13px 0 0; padding:11px 12px; border:1px solid rgba(27,27,27,.08); border-radius:8px; background:#fafaf8; color:#6d6d6d; font:11.5px/1.75 ui-monospace,SFMono-Regular,Menlo,monospace; white-space:pre-wrap; word-break:break-all; }
      .pl-cd-foot { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:13px; padding-top:11px; border-top:1px solid rgba(27,27,27,.08); }
      .pl-cd-tags { overflow:hidden; color:#9c9c9c; font-size:10.5px; text-overflow:ellipsis; white-space:nowrap; }
      .pl-cd-actions { display:flex; align-items:center; gap:2px; }
      .pl-copy-btn { display:inline-flex; height:30px; align-items:center; gap:5px; border:0; border-radius:7px; padding:0 9px; color:#5f5f5f; background:transparent; font-size:11px; transition:background .18s ease, color .18s ease; }
      .pl-copy-btn:hover, .pl-copy-btn.is-copied { color:var(--ink); background:var(--hl); }
      .pl-cd-actions .pl-icon-btn { width:28px; height:28px; flex-basis:28px; }

      /* ===== 列表视图 ===== */
      .pl-grid.is-list { grid-template-columns:1fr; gap:10px; }
      .pl-grid.is-list .pl-card { min-height:0; flex-direction:row; align-items:center; gap:14px; padding:13px 16px 13px 19px; }
      .pl-grid.is-list .pl-card::before { top:12px; bottom:12px; }
      .pl-grid.is-list .pl-cd-top { flex:1; align-items:center; }
      .pl-grid.is-list .pl-cd-title { flex-direction:row; align-items:baseline; gap:10px; flex:1; min-width:0; }
      .pl-grid.is-list .pl-cd-top h2 { font-size:15.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .pl-grid.is-list .pl-cd-meta { flex:0 0 auto; }
      .pl-grid.is-list .pl-cd-quote, .pl-grid.is-list .pl-cd-preview { display:none; }
      .pl-grid.is-list .pl-cd-foot { flex:0 0 auto; margin:0; padding:0; border:0; }
      .pl-grid.is-list .pl-cd-tags { display:none; }

      /* ===== 空状态 ===== */
      .pl-empty { display:grid; min-height:250px; place-items:center; border:1px dashed rgba(27,27,27,.24); border-radius:12px; padding:28px; text-align:center; }
      .pl-empty-inner { display:grid; justify-items:center; }
      .pl-empty-icon { display:grid; width:48px; height:48px; place-items:center; border:1px solid rgba(164,136,48,.38); border-radius:10px; color:var(--gold); background:var(--soft); }
      .pl-empty h2 { margin:15px 0 0; font-size:17px; line-height:1; }
      .pl-empty p { margin:9px 0 17px; color:#858585; font-size:13px; }

      /* ===== 详情弹窗（变量填空） ===== */
      .pl-detail { display:flex; flex-direction:column; width:min(100%,640px); max-height:min(780px,calc(100vh - 48px)); overflow:hidden; border:1px solid rgba(27,27,27,.15); border-radius:14px; background:#fff; box-shadow:0 30px 80px -32px rgba(0,0,0,.5); animation:pl-dialog-in .25s var(--pl-ease) both; }
      .pl-detail > header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding:20px 22px 14px; border-bottom:1px solid var(--line); }
      .pl-detail-head { min-width:0; }
      .pl-detail-tags { display:flex; align-items:center; gap:7px; color:#999; font-size:11.5px; flex-wrap:wrap; }
      .pl-detail-tags .pl-detail-cat { font-weight:750; }
      .pl-detail-tags i { font:600 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; color:#b5b5b5; font-style:normal; }
      .pl-detail h2 { margin:7px 0 0; font-size:21px; font-weight:760; letter-spacing:-.01em; line-height:1.2; }
      .pl-detail h2 em { margin-left:9px; color:#c2c2c2; font:650 13px/1 Inter,ui-sans-serif,system-ui,sans-serif; font-style:normal; }
      .pl-detail-head p { margin:6px 0 0; color:#777; font-size:12.5px; line-height:1.6; }
      .pl-detail-vars { padding:13px 22px 3px; display:grid; gap:8px; border-bottom:1px dashed var(--line); }
      .pl-detail-vars-head { display:flex; align-items:center; justify-content:space-between; color:#8d8d8d; font:600 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.06em; }
      .pl-detail-vars-head em { font-style:normal; color:var(--gold); font-variant-numeric:tabular-nums; }
      .pl-detail-bar { height:3px; border-radius:99px; background:rgba(27,27,27,.07); overflow:hidden; }
      .pl-detail-bar span { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg, var(--gold), #d4a930); transition:width .35s var(--pl-ease); }
      .pl-detail-vars label { display:grid; grid-template-columns:96px minmax(0,1fr); align-items:center; gap:10px; color:#666; font-size:12px; }
      .pl-detail-vars label span { overflow:hidden; color:#8a8a8a; font-weight:600; text-align:right; text-overflow:ellipsis; white-space:nowrap; }
      .pl-page .pl-detail-vars input { border:1px solid var(--line) !important; border-radius:7px !important; padding:7px 10px !important; background:#fff !important; color:var(--ink); font-size:12.5px; }
      .pl-page .pl-detail-vars input:focus { border-color:rgba(164,136,48,.6) !important; background:#fffdf3 !important; box-shadow:none !important; outline:none; }
      .pl-detail-body { flex:1; overflow:auto; margin:0; padding:16px 22px 18px; color:#4a4a4a; font:12.5px/2.05 ui-monospace,SFMono-Regular,Menlo,monospace; white-space:pre-wrap; word-break:break-word; background:#fcfcfa; }
      .pl-var input { display:inline-block; vertical-align:baseline; min-width:64px; border:0 !important; border-bottom:1.5px solid rgba(164,136,48,.55) !important; border-radius:0 !important; background:rgba(255,224,138,.24) !important; padding:1px 7px !important; color:var(--ink); font:inherit; text-align:center; transition:background .2s ease, border-color .2s ease; }
      .pl-page .pl-detail-body .pl-var input:focus { background:rgba(255,224,138,.6) !important; border-bottom-color:var(--gold) !important; box-shadow:none !important; outline:none; }
      .pl-var.is-filled input { background:rgba(255,224,138,.5) !important; }
      .pl-detail > footer { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 22px; border-top:1px solid var(--line); }
      .pl-detail-note { color:#a5a5a5; font-size:11.5px; }
      .pl-detail > footer > div { display:flex; align-items:center; gap:8px; }
      .pl-detail > footer .pl-btn { min-height:34px; font-size:12.5px; }

      /* ===== Toast / 弹窗 ===== */
      .pl-top-btn { position:fixed; right:28px; bottom:28px; z-index:55; display:grid; width:42px; height:42px; place-items:center; border:1px solid rgba(27,27,27,.18); border-radius:50%; background:rgba(255,255,255,.96); color:#666; box-shadow:0 10px 26px -14px rgba(0,0,0,.4); animation:pl-toast-in .25s cubic-bezier(.16,1,.3,1) both; transition:border-color .2s ease, color .2s ease, background .2s ease, transform .2s ease; }
      .pl-top-btn:hover { border-color:var(--gold); color:var(--gold); background:var(--soft); transform:translateY(-2px); }
      .pl-toast { position:fixed; right:28px; bottom:84px; z-index:60; display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(27,27,27,.16); border-radius:8px; padding:10px 13px; color:#333; background:rgba(255,255,255,.97); box-shadow:0 12px 28px -15px rgba(0,0,0,.35); font-size:12px; animation:pl-toast-in .25s cubic-bezier(.16,1,.3,1) both; }
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
      /* 子分类横排（原左侧栏内容，所有宽度可见） */
      .pl-subrow { display:flex; gap:7px; margin:16px 0 2px; padding-bottom:13px; border-bottom:1px solid var(--line); overflow-x:auto; scrollbar-width:none; }
      .pl-subrow::-webkit-scrollbar { display:none; }
      .pl-subitem { display:inline-flex; height:32px; flex:0 0 auto; align-items:center; gap:6px; border:1px solid var(--line); border-radius:99px; padding:0 12px; background:#fff; color:#666; font-size:12.5px; transition:border-color .3s var(--pl-ease), background .3s var(--pl-ease), color .3s var(--pl-ease), transform .3s var(--pl-ease); }
      .pl-subitem b { color:#b5b5b5; font:500 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; font-variant-numeric:tabular-nums; }
      .pl-subitem:hover { border-color:rgba(27,27,27,.28); color:var(--ink); transform:translateY(-1.5px); }
      .pl-subitem:active { transform:translateY(0) scale(.96); transition-duration:.1s; }
      .pl-subitem.is-active { border-color:#d7b846; background:var(--hl); color:var(--ink); font-weight:650; }
      .pl-subitem.is-active b { color:rgba(27,27,27,.5); }
      @media (max-width:920px) {
        .pl-stats { display:none; }
        .pl-main-head { margin-top:16px; }
        .pl-main h1 { font-size:34px; }
        .pl-main h1 em { font-size:15px; margin-left:9px; }
        .pl-search kbd { display:none; }
      }
      @media (max-width:680px) {
        .pl-chips { margin:0 -20px; padding:11px 20px; }
        .pl-topbar { flex-wrap:wrap; }
        .pl-topbar-right { width:100%; }
        .pl-search { width:100%; flex:1; }
        .pl-cloud span { display:none; }
        .pl-grid { grid-template-columns:1fr; }
        .pl-grid.is-list .pl-cd-title { flex-direction:column; align-items:flex-start; gap:5px; }
        .pl-grid.is-list .pl-cd-top h2 { white-space:normal; }
        .pl-main-head { flex-wrap:wrap; }
        .pl-detail-vars { grid-template-columns:1fr; }
        .pl-detail-vars label { grid-template-columns:1fr; gap:5px; }
        .pl-detail-vars label span { text-align:left; }
        .pl-detail > footer { flex-wrap:wrap; }
      }
      @media (prefers-reduced-motion:reduce) { .pl-page *, .pl-page *::before, .pl-page *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; } }
    `}</style>

    <header className="pl-topbar">
        <div className="pl-topbar-left">
          <a className="pl-back" href="#/" aria-label="返回主页" title="返回主页"><ArrowLeft size={15} /></a>
          <span className="pl-brand"><i />VOYRA <em>提示词库</em></span>
          <span className="pl-stats">共 <b>{allPrompts.length}</b> 条 · <b>{allCategories.length}</b> 类</span>
          <span className={`pl-cloud${cloudMeta.cls}`} title={cloudMeta.title}>
            <cloudMeta.Icon size={12} /><span>{cloudMeta.text}</span>
          </span>
        </div>
        <div className="pl-topbar-right">
          {admin && <div className="pl-admin-tools">
            <IconButton label="新建分类" title="新建分类" onClick={() => setDialog('category')}><FolderPlus size={14} /></IconButton>
            <IconButton label="导入 JSON" title="导入 JSON" onClick={() => fileInputRef.current?.click()}><Import size={14} /></IconButton>
            <IconButton label="导出我的数据" title="导出我的数据" onClick={exportPrompts}><Download size={14} /></IconButton>
          </div>}
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
            <input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索提示词：试试「周报」「旅行攻略」…" aria-label="搜索提示词" />
            {search
              ? <IconButton label="清空搜索" onClick={() => setSearch('')}><X size={15} /></IconButton>
              : <kbd title="按 / 快速聚焦搜索">/</kbd>}
          </label>
          {admin && <button type="button" className="pl-btn pl-btn-solid" onClick={openNewPrompt}><Plus size={16} />新建提示词</button>}
        </div>
    </header>
    <nav className="pl-chips" aria-label="提示词分类">
        <button type="button" className={`pl-chip${activeCat === '全部' ? ' is-active' : ''}`} onClick={() => { setActiveCat('全部'); setActiveSub('全部'); }}>全部 <b>{catCount('全部')}</b></button>
        {showFav && (
          <button type="button" className={`pl-chip is-fav${activeCat === FAV_CAT ? ' is-active' : ''}`} onClick={() => { setActiveCat(FAV_CAT); setActiveSub('全部'); }}>
            <Star size={13} />收藏 <b>{favCount}</b>
          </button>
        )}
        {allCategories.map((category) => {
          const Icon = CAT_ICONS[category];
          return (
            <button type="button" key={category} className={`pl-chip${activeCat === category ? ' is-active' : ''}`} onClick={() => { setActiveCat(category); setActiveSub('全部'); }}>
              {Icon && <Icon size={13} />}{category} <b>{catCount(category)}</b>
            </button>
          );
        })}
        {admin && <button type="button" className="pl-chip-add" title="新建分类" aria-label="新建分类" onClick={() => setDialog('category')}><Plus size={15} /></button>}
    </nav>

    <div className="pl-body">
      <main className="pl-main" key={sectionKey}>
        <h1>{mainTitle}{!searching && activeCat !== '全部' && activeCat !== FAV_CAT && <em>{enFor(activeCat)}</em>}</h1>
        {sideSubs.length > 0 && <div className="pl-subrow">{renderSubButtons('pl-subitem')}</div>}
        <div className="pl-main-head">
          <b>{sectionTitle}</b>
          <span>{sectionCount} 个条目</span>
          {userState.favorites.length > 0 && activeCat !== FAV_CAT && <span className="pl-favhint">收藏 {favCount} 条已置顶</span>}
          <div className="pl-head-tools">
            <button type="button" className="pl-btn pl-random" onClick={surprise} title="从当前列表随机抽一条看看"><Shuffle size={13} />随机抽一个</button>
            <div className="pl-viewtoggle" role="group" aria-label="视图切换">
              <button type="button" className={view === 'card' ? 'is-active' : ''} aria-label="卡片视图" aria-pressed={view === 'card'} onClick={() => switchView('card')}><LayoutGrid size={14} /></button>
              <button type="button" className={view === 'list' ? 'is-active' : ''} aria-label="列表视图" aria-pressed={view === 'list'} onClick={() => switchView('list')}><List size={14} /></button>
            </div>
          </div>
        </div>
        {sectionCount > 0 && <p className="pl-tip"><MousePointerClick size={12} />点击卡片可查看全文，【变量】填空后一键复制；按 <kbd>/</kbd> 快速搜索，<kbd>Esc</kbd> 退出</p>}

        {sectionCount === 0 ? (
          <section className="pl-empty">
            <div className="pl-empty-inner">
              <div className="pl-empty-icon">{activeCat === FAV_CAT && !searching ? <Star size={20} /> : <Plus size={21} />}</div>
              <h2>{searching ? '没有匹配的提示词' : activeCat === FAV_CAT ? '还没有收藏的提示词' : '这个分类还没有条目'}</h2>
              <p>{searching
                ? '换一个关键词试试'
                : activeCat === FAV_CAT
                  ? (admin ? '点亮卡片右上角的星标，喜欢的提示词都会在这里' : '登录管理员后可点亮星标收藏喜欢的提示词')
                  : admin ? '点击右上角「新建提示词」添加第一条' : '该分类下暂时还没有提示词'}</p>
              {!searching && activeCat !== FAV_CAT && admin && <button type="button" className="pl-btn pl-btn-solid" onClick={openNewPrompt}><Plus size={15} />新建提示词</button>}
            </div>
          </section>
        ) : (
          <div className={`pl-grid${view === 'list' ? ' is-list' : ''}`}>
            {sortedPrompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                prompt={{ ...prompt, favorite: favSet.has(prompt.id) }}
                color={colorFor(prompt)}
                admin={admin}
                copiedId={copiedId}
                onOpen={setDetail}
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
    {showTop && <button type="button" className="pl-top-btn" aria-label="回到顶部" title="回到顶部" onClick={toTop}><ArrowUp size={16} /></button>}
    {toast && <div className="pl-toast" role="status"><i />{toast}</div>}
    {detail && (
      <PromptDetailModal prompt={detail} color={colorFor(detail)} onClose={() => setDetail(null)} />
    )}
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
