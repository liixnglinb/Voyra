import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import Bmob, { BMOB_READY } from '../lib/bmob';

/* ============================================================
   AI 模型对比秀 · PelicanGallery
   16 个 AI 模型生成的「鹈鹕骑自行车」SVG 动画同题对比
   排序：默认 = 按本地原始 HTML 的生成时间从新到旧（已对照 mtime 核对）
         点赞 = 按点赞数从高到低，票数相同时保持默认次序
   点赞：每张卡片一颗心，一个浏览器对同一模型只能点一次（再点即取消，无法叠加）
         计数优先走 Bmob 全局表 pelican_like；Bmob 不可用时退化为本地计数
   卡片：统一 3:2，模型名条 + iframe；fitFrame() 处理内嵌页：
     - html/body 撑满 100%、去默认边距与滚动条
     - 隐藏所有不含 svg 的兄弟节点（页头标题/副标题/页脚/控件等）
     - svg 沿祖先链撑到 100%×100%，强制去 border-radius / box-shadow / 背景
     - preserveAspectRatio="xMidYMid slice" —— 消除黑边，按卡片比例填满
   个例缩放：GLM-5.3 场景里鹈鹕偏左上，iframe transform: scale(1.4) 居中放大
   ============================================================ */

/** 卡片画面容器的填色：上半取该模型的天空色、下半取地面/路面色，
    用于填补 .pg-frame 底部圆角与子像素边缘露出的缝隙，让边角与画面同色 */
const fill = (sky, ground) =>
  `linear-gradient(180deg,${sky} 0%,${sky} 50%,${ground} 50%,${ground} 100%)`;

const ITEMS = [
  { file: 'glm-5.3-flash.html',     model: 'GLM-5.3 Flash',     ratio: '880/460',  zoom: 1.4,
    bg: fill('#8fd3f4', '#000') },
  { file: 'deepseek-v4-pro.html',   model: 'DeepSeek-V4 Pro',   ratio: '900/520',
    bg: fill('#a8d8f0', '#5aa63d') },
  { file: 'deepseek-v4-flash.html', model: 'DeepSeek-V4 Flash', ratio: '900/520',
    bg: fill('#8ed0f6', '#ecd9ab') },
  { file: 'gpt56-sol-ulter.html',   model: 'GPT 5.6 sol',        ratio: '1600/900' },
  { file: 'qwen38-max.html',        model: 'Qwen3.8-Max',       ratio: '800/480',
    bg: fill('#7dd3fc', '#64748b') },
  { file: 'qwen3.7-plus.html',      model: 'Qwen3.7-Plus',      ratio: '600/400' },
  { file: 'kimi-k3.html',           model: 'Kimi-K3',           ratio: '800/480',
    bg: fill('#7ec8f2', '#9ccb8d') },
  { file: 'kimi-k2.6.html',         model: 'Kimi-K2.6',         ratio: '900/500' },
  { file: 'glm-5.1.html',           model: 'GLM-5.1',           ratio: '900/600' },
  { file: 'kimi-2.7-code.html',     model: 'Kimi-2.7-Code',     ratio: '1200/800' },
  { file: 'minmax-m3.html',         model: 'MiniMax-M3',        ratio: '800/500' },
  { file: 'glm-5.3.html',           model: 'GLM-5.3',           ratio: '1000/600',
    bg: fill('#6db6e8', '#000') },
  { file: 'glm-5.2.html',           model: 'GLM-5.2',           ratio: '920/520' },
  { file: 'hy3-workbuddy.html',     model: 'Hy3',               ratio: '800/460',
    bg: fill('#aee7ff', '#7cc34f') },
  { file: 'doubao-2.1-turbo.html',  model: '豆包 2.1 Turbo',    ratio: '900/500',
    bg: fill('#5DADE2', '#52BE80') },
  { file: 'hy4-preview.html',       model: 'Hy4 Preview',       ratio: '960/540',
    bg: fill('#7FD4FF', '#4A5462') },
];

const TOTAL = ITEMS.length;

export const PELICAN_MODEL_COUNT = ITEMS.length;

/* ---------- 点赞存储 ---------- */
const LIKE_TABLE = 'pelican_like';
const LS_LIKED = 'voyra:pelican:liked';    // 本浏览器已点赞的 file 列表
const LS_COUNTS = 'voyra:pelican:counts';  // Bmob 不可用时的本地兜底计数

function readLS(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
  catch { return fallback; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 隐私模式忽略 */ }
}

/** 从 Bmob 拉取全局点赞数；失败返回 null 由调用方退化 */
async function fetchCounts() {
  if (!BMOB_READY) return null;
  try {
    const q = Bmob.Query(LIKE_TABLE);
    q.limit(1000);
    const rows = await q.find();
    const map = {};
    (rows || []).forEach((r) => { if (r && r.file) map[r.file] = Number(r.count) || 0; });
    return map;
  } catch { return null; }
}

/** 把一次 +1 / -1 写回 Bmob（原子性不保证，个人站点量级足够） */
async function syncCount(file, delta) {
  if (!BMOB_READY) return;
  try {
    const q = Bmob.Query(LIKE_TABLE);
    q.equalTo('file', '==', file);
    const rows = await q.find();
    if (rows && rows.length) {
      const row = rows[0];
      row.set('count', Math.max(0, (Number(row.count) || 0) + delta));
      await row.save();
    } else if (delta > 0) {
      const nq = Bmob.Query(LIKE_TABLE);
      nq.set('file', file);
      nq.set('count', delta);
      await nq.save();
    }
  } catch { /* 写失败不影响本地已呈现的状态 */ }
}

/* ---------- iframe 适配 ---------- *//* 把 iframe 内部的页头/页脚/控件隐藏，让 SVG 撑满并贴合卡片比例；
   只动样式不动 DOM，不破坏 SMIL/CSS/rAF 动画。 */
function fitFrame(ifr) {
  try {
    const d = ifr.contentDocument;
    if (!d) return;
    const svg = d.querySelector('svg');
    if (!svg) return;
    // 1. html/body 一律撑满、去边距、隐藏滚动条、透明背景
    const reset = d.createElement('style');
    reset.textContent =
      'html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;' +
      'min-height:0!important;overflow:hidden!important;background:transparent!important}';
    d.head && d.head.appendChild(reset);
    // 2. 隐藏所有「不包含 svg」的兄弟节点（页头 h1/p、meta、页脚、控件等）
    Array.from(d.body.querySelectorAll('*')).forEach((el) => {
      if (el === svg) return;
      if (el.contains(svg)) return;          // svg 祖先链：保留
      if (svg.contains(el)) return;          // svg 内部（defs/use/...）：保留
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'HEAD' || tag === 'META') return;
      el.style.setProperty('display', 'none', 'important');
    });
    // 3. svg 沿祖先链一路撑到 100%×100%，并去掉圆角/阴影/自身背景（消除浅色卡片框）
    let n = svg;
    while (n && n.nodeName !== 'HTML') {
      const cs = n.style;
      cs.setProperty('margin', '0', 'important');
      cs.setProperty('padding', '0', 'important');
      cs.setProperty('width', '100%', 'important');
      cs.setProperty('height', '100%', 'important');
      cs.setProperty('max-width', 'none', 'important');
      cs.setProperty('max-height', 'none', 'important');
      cs.setProperty('display', 'block', 'important');
      cs.setProperty('border-radius', '0', 'important');
      cs.setProperty('box-shadow', 'none', 'important');
      cs.setProperty('background', 'transparent', 'important');
      n = n.parentElement;
    }
    // 4. slice：消除黑边，让画面按卡片 3:2 比例铺满
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  } catch (e) { /* 同源访问，异常静默不影响页面 */ }
}

export default function PelicanGallery() {
  const [ready, setReady] = useState(() => new Set());   // 已加载完成的 iframe（用于淡入）

  const onIframeLoad = useCallback((e) => {
    fitFrame(e.currentTarget);
    const f = e.currentTarget.getAttribute('data-file');
    if (f) setReady((prev) => (prev.has(f) ? prev : new Set(prev).add(f)));
  }, []);

  const [sort, setSort] = useState(() => {
    const v = readLS('voyra:pelican:sort', 'default');   // 记住上次的排序选择
    return v === 'likes' ? 'likes' : 'default';
  });
  const changeSort = useCallback((s) => {
    setSort(s);
    writeLS('voyra:pelican:sort', s);
  }, []);
  const [liked, setLiked] = useState(() => {
    const v = readLS(LS_LIKED, []);
    return Array.isArray(v) ? v : [];
  });
  const [counts, setCounts] = useState(() => readLS(LS_COUNTS, {}));

  /* 挂载时拉取全局点赞数；Bmob 不可用则沿用本地计数 */
  useEffect(() => {
    let alive = true;
    fetchCounts().then((map) => {
      if (!alive || map == null) return;
      setCounts((prev) => {
        const merged = { ...prev, ...map };
        // 本浏览器已点赞过的，至少保证显示 ≥ 1（Bmob 未及时同步时也呈现正确）
        liked.forEach((f) => { merged[f] = Math.max(Number(merged[f] || 0), 1); });
        return merged;
      });
    });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* 点赞 / 取消：一个浏览器对同一模型恒为 0 或 1，无法叠加 */
  const toggleLike = useCallback((file) => {
    setLiked((prevLiked) => {
      const has = prevLiked.includes(file);
      const nextLiked = has ? prevLiked.filter((f) => f !== file) : [...prevLiked, file];
      writeLS(LS_LIKED, nextLiked);
      setCounts((prevCounts) => {
        const next = { ...prevCounts, [file]: Math.max(0, (prevCounts[file] || 0) + (has ? -1 : 1)) };
        if (!BMOB_READY) writeLS(LS_COUNTS, next);
        return next;
      });
      syncCount(file, has ? -1 : 1);
      return nextLiked;
    });
  }, []);

  /* 排序：默认保持生成时间序；点赞序按票数降序，同票保持默认次序 */
  const ordered = useMemo(() => {
    if (sort === 'default') return ITEMS.map((it, i) => ({ ...it, _i: i }));
    return ITEMS
      .map((it, i) => ({ ...it, _i: i, _c: counts[it.file] || 0 }))
      .sort((a, b) => (b._c - a._c) || (a._i - b._i));
  }, [sort, counts]);

  /* 当前排序下可见的累计点赞数 */
  const totalLikes = useMemo(
    () => ordered.reduce((sum, it) => sum + (counts[it.file] || 0), 0),
    [ordered, counts],
  );

  return <div className="pg-page">
    <style>{`
      .pg-page{--ink:#1b1b1b;--gold:#a48830;min-height:100%;color:var(--ink);background-color:#fff;background-image:linear-gradient(rgba(0,0,0,.031) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.031) 1px,transparent 1px);background-size:32px 32px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;padding:34px 0 90px}
      .pg-page *,.pg-page *::before,.pg-page *::after{box-sizing:border-box}
      .pg-shell{width:min(100% - 48px,1080px);margin:0 auto}
      /* —— 顶部 —— */
      .pg-kicker{display:inline-flex;align-items:center;gap:10px;color:#a48830;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.22em}
      .pg-kicker::before{content:"";width:26px;height:1px;background:#a48830}
      .pg-head-row{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-top:16px;padding-bottom:24px;border-bottom:1px solid rgba(27,27,27,.11)}
      .pg-head h1{margin:0;font-size:54px;font-weight:780;letter-spacing:-.025em;line-height:1}
      .pg-head h1 em{font-style:normal;color:transparent;-webkit-text-stroke:1px rgba(27,27,27,.45)}
      .pg-head p{max-width:560px;margin:16px 0 0;color:#626262;font-size:14px;line-height:1.95}
      .pg-head p b{color:var(--ink);font-weight:700}
      .pg-stats{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;flex:0 0 auto;max-width:320px}
      .pg-stat{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 14px;border:1px solid rgba(27,27,27,.11);border-radius:99px;color:#626262;background:rgba(255,255,255,.75);font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap}
      .pg-stat b{color:var(--ink);font-weight:700}
      .pg-stat.is-gold{border-color:#e7c750;background:#fff4c8;color:#6b5b13}
      .pg-stat.is-gold b{color:#5c4d10}
      .pg-stat svg{flex:0 0 auto}
      /* —— 排序工具条（右上角） —— */
      .pg-tools{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:22px}
      .pg-tools .pg-tools-label{color:#8a8a8a;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.14em}
      .pg-total{display:inline-flex;align-items:center;gap:6px;margin-right:auto;color:#8a8a8a;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap}
      .pg-total svg{color:#d8a92e}
      .pg-total b{color:#8a6d12;font-weight:700;font-variant-numeric:tabular-nums}
      .pg-sort{display:inline-flex;gap:4px;padding:4px;border:1px solid rgba(27,27,27,.11);border-radius:99px;background:rgba(255,255,255,.75)}
      .pg-sort button{display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 14px;border:0;border-radius:99px;background:transparent;color:#626262;font:12px/1 inherit;font-weight:500;cursor:pointer;transition:background .2s ease,color .2s ease}
      .pg-sort button:hover{color:var(--ink)}
      .pg-sort button.is-on{background:var(--ink);color:#fff}
      .pg-sort button.is-on svg{color:#ffd75e}
      /* —— 网格：所有卡片统一 3:2 大小 —— */
      .pg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:18px}
      .pg-card{position:relative;display:flex;flex-direction:column;border:1px solid rgba(27,27,27,.12);border-radius:12px;background:#fff;overflow:hidden;transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s ease,border-color .3s ease}
      .pg-card:hover{transform:translateY(-4px);border-color:rgba(164,136,48,.6);box-shadow:0 20px 38px rgba(34,30,15,.12)}
      .pg-bar{display:flex;align-items:center;gap:10px;padding:14px 16px 13px}
      .pg-seq{color:#c0b07a;font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}
      .pg-name{font-size:16px;font-weight:760;line-height:1;letter-spacing:-.01em;transition:color .2s ease}
      .pg-card:hover .pg-name{color:#a48830}
      /* 点赞按钮 */
      .pg-like{margin-left:auto;display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px;border:1px solid rgba(27,27,27,.12);border-radius:99px;background:#fff;color:#8a8a8a;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;cursor:pointer;transition:border-color .2s ease,color .2s ease,background .2s ease,transform .12s ease}
      .pg-like:hover{border-color:rgba(164,136,48,.55);color:var(--ink)}
      .pg-like:active{transform:scale(.94)}
      .pg-like.is-on{border-color:#e7c750;background:#fff8dd;color:#8a6d12}
      .pg-like.is-on svg{fill:#e8b923;color:#e8b923}
      .pg-like b{font-weight:700;font-variant-numeric:tabular-nums}
      /* 画面：固定 3:2，iframe 撑满；item.zoom 用 transform 居中放大个别偏的源 */
      .pg-frame{position:relative;background:#f2f3f5;overflow:hidden;border-radius:0 0 12px 12px}
      .pg-frame::before{content:"";display:block;aspect-ratio:3/2}
      .pg-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent;transform-origin:center center;opacity:0;transition:opacity .5s ease}
      .pg-frame iframe.is-ready{opacity:1}
      @media(max-width:900px){.pg-head-row{flex-direction:column;align-items:flex-start;gap:18px}.pg-stats{justify-content:flex-start;max-width:none}.pg-head h1{font-size:42px}.pg-grid{grid-template-columns:1fr}.pg-tools{justify-content:flex-start}}
    `}</style>

    <div className="pg-shell">
      <header className="pg-head">
        <span className="pg-kicker">VOYRA · AI MODEL SHOWCASE</span>
        <div className="pg-head-row">
          <div>
            <h1>AI 模型<em>对比秀</em></h1>
            <p>同一个题目「鹈鹕骑自行车 · SVG 2D 动画」，交给 <b>{TOTAL} 个 AI 模型</b>分别生成，按生成时间从新到旧排列。<br />每一份都是原文件通过 iframe 原样运行，<b>全部动效同时播放</b>，画面按原始比例完整呈现。</p>
          </div>
          <div className="pg-stats">
            <span className="pg-stat"><b>{TOTAL}</b> 个模型</span>
            <span className="pg-stat"><b>8</b> 家厂商</span>
            <span className="pg-stat is-gold"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>全部实时播放</span>
          </div>
        </div>
      </header>

      <div className="pg-tools">
        <span className="pg-total"><Heart size={12} /> 累计 <b>{totalLikes}</b></span>
        <span className="pg-tools-label">SORT</span>
        <div className="pg-sort" role="group" aria-label="排序方式">
          <button type="button" className={sort === 'default' ? 'is-on' : ''} onClick={() => changeSort('default')} aria-pressed={sort === 'default'}>
            默认排序
          </button>
          <button type="button" className={sort === 'likes' ? 'is-on' : ''} onClick={() => changeSort('likes')} aria-pressed={sort === 'likes'}>
            <Heart size={12} /> 点赞排序
          </button>
        </div>
      </div>

      <section className="pg-grid">
        {ordered.map((item) => {
          const isLiked = liked.includes(item.file);
          const n = counts[item.file] || 0;
          return (
            <article className="pg-card" key={item.file}>
              <div className="pg-bar">
                <span className="pg-seq">{String(item._i + 1).padStart(2, '0')}</span>
                <span className="pg-name">{item.model}</span>
                <button
                  type="button"
                  className={`pg-like${isLiked ? ' is-on' : ''}`}
                  onClick={() => toggleLike(item.file)}
                  aria-pressed={isLiked}
                  title={isLiked ? '取消点赞' : '点赞（每个模型只能点一次）'}
                >
                  <Heart size={13} />
                  <b>{n}</b>
                </button>
              </div>
              <div className="pg-frame" style={item.bg ? { background: item.bg } : undefined}>
                <iframe
                  src={`/pelican-gallery/${item.file}`}
                  data-file={item.file}
                  onLoad={onIframeLoad}
                  loading="lazy"
                  className={ready.has(item.file) ? 'is-ready' : ''}
                  title={`${item.model} 生成的动画`}
                  scrolling="no"
                  style={item.zoom ? { transform: `scale(${item.zoom})` } : undefined}
                />
              </div>
            </article>
          );
        })}
      </section>

      <footer className="pg-foot" style={{ marginTop: '48px', paddingTop: '18px', borderTop: '1px solid rgba(27,27,27,.11)', color: '#999', fontSize: '12px', lineHeight: 1.9 }}>
        <p>模型署名均取自各 HTML 文件内部的标题 / meta / 注释 / 画面落款；排序依据为各文件的生成时间。© 2026 Voyra®</p>
      </footer>
    </div>
  </div>;
}