import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bot, CalendarClock,
  CalendarDays, Check, ChevronDown, Code2, Frame, Github,
  Globe, LayoutGrid, Lightbulb, Link, MousePointer2, NotebookPen,
  Sparkles, Star, Waves,
} from 'lucide-react';

const FEATURED = [
  { to: '/smart-notes', no: '01', name: '智能笔记', desc: '随手记录灵感，把零散内容整理成可继续推进的笔记。', cta: '打开笔记', Icon: NotebookPen, art: 'notes' },
  { to: '/prompts', no: '02', name: '提示词库', desc: '把常用指令、模板和使用场景放在一个随时可检索的位置。', cta: '管理提示词', Icon: Lightbulb, art: 'prompt' },
  { to: '/agents', no: '03', name: 'AI Agent', desc: '汇集 Agent 与 Skill 的实用入口，快速进入合适的工作流。', cta: '查看资源', Icon: Bot, art: 'motion' },
  { to: '/planner', no: '04', name: '个人日程', desc: '把课程、假期和自定义事项排到可执行的时间线上。', cta: '打开日程', Icon: CalendarClock, art: 'calendar' },
  { to: '/web-links', no: '05', name: '网页链接', desc: '收藏常用服务，分类整理后从一个界面直接访问。', cta: '整理链接', Icon: Link, art: 'links' },
];

const MATHMODEL_SKILL = {
  href: 'https://github.com/liixnglinb/mathmodel-skill',
  name: '数学建模 Skill',
  tagline: '国赛（CUMCM）数学建模十阶段工作流',
};

const ARTICLES = [
  { date: '2026.08.24', title: '把个人工具站做成能每天使用的工作台', desc: '从一个工具入口开始，把记录、安排和资料整理成连续的个人工作流。' },
  { date: '2026.08.18', title: '给日常任务留下一条可复用的路径', desc: '当模板、链接和笔记相互连接，重复操作会变得越来越少。' },
  { date: '2026.08.12', title: '从灵感到执行：一个轻量的整理方法', desc: '不追求复杂系统，只让眼前的内容在需要时能够被快速找到。' },
  { date: '2026.08.06', title: '如何为 AI 工具建立自己的资源库', desc: '把平台、提示词和使用经验收进同一个可维护的个人目录。' },
];

const EXPERIENCES = [
  { state: '现在', name: 'Voyra 个人站', desc: '云端一站式创作与效率平台，聚合常用工具与 AI 资源。', Icon: NotebookPen },
  { state: '基建', name: 'Cloudflare Pages', desc: 'GitHub 推送后自动构建，自定义域名稳定访问。', Icon: Globe },
  { state: '数据', name: 'Bmob 云后端', desc: '工具数据可云端保存，免去自建服务端的维护成本。', Icon: LayoutGrid },
];

const CONTACTS = [
  { no: '01', label: 'GitHub', value: '@liixnglinb', href: 'https://github.com/liixnglinb', Icon: Github },
  { no: '02', label: 'Email', value: 'hello@lxlrwxs.top', href: 'mailto:hello@lxlrwxs.top', Icon: Sparkles },
  { no: '03', label: '网站', value: 'lxlrwxs.top', href: 'https://lxlrwxs.top', Icon: Globe },
];

const TABS = [['products', '产品'], ['skills', 'Skills'], ['articles', '文章'], ['me', '关于我'], ['contact', '交流']];
const MOTION_SCENES = [['hover', '悬停', MousePointer2], ['spring', '弹性', Waves], ['blur', '毛玻璃', Frame]];

function getTabFromHash() {
  const query = window.location.hash.split('?')[1] || '';
  const tab = new URLSearchParams(query).get('tab');
  return TABS.some(([id]) => id === tab) ? tab : 'products';
}

function useReveal(rootRef, activeTab) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const scroller = root.parentElement;
    const nodes = root.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('vr-is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { root: scroller || null, rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [activeTab, rootRef]);
}

function useScrollRoll(rootRef, activeTab) {
  useEffect(() => {
    const root = rootRef.current;
    const scroller = root?.parentElement;
    if (!root || !scroller || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame = 0;
    let needsUpdate = true;
    const activeNodes = new Set();
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const smoothStep = (value) => value * value * (3 - (2 * value));
    const update = () => {
      frame = 0;
      if (!needsUpdate) return;
      const viewport = scroller.getBoundingClientRect();
      activeNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const local = clamp((viewport.height - (rect.top - viewport.top)) / Math.max(1, viewport.height + rect.height), 0, 1);
        const entering = smoothStep(clamp((0.3 - local) / 0.3, 0, 1));
        const leaving = smoothStep(clamp((local - 0.7) / 0.3, 0, 1));
        node.style.setProperty('--roll-origin-y', entering > 0 ? '4%' : leaving > 0 ? '96%' : '50%');
        node.style.setProperty('--roll-angle', `${(-14 * entering) + (28 * leaving)}deg`);
        node.style.setProperty('--roll-angle-mobile', `${(-9 * entering) + (18 * leaving)}deg`);
        node.style.setProperty('--roll-y', `${(6 * entering) - (10 * leaving)}px`);
        node.style.setProperty('--roll-opacity', `${1 - (0.1 * entering) - (0.14 * leaving)}`);
      });
      needsUpdate = false;
    };
    const requestUpdate = () => {
      needsUpdate = true;
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('vr-scroll-active', entry.isIntersecting);
        if (entry.isIntersecting) activeNodes.add(entry.target);
        else activeNodes.delete(entry.target);
      });
      requestUpdate();
    }, { root: scroller, rootMargin: '100% 0px 100% 0px' });
    const nodes = root.querySelectorAll('[data-roll]');
    nodes.forEach((node) => observer.observe(node));
    scroller.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    requestUpdate();
    return () => {
      scroller.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      observer.disconnect();
      activeNodes.clear();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [activeTab, rootRef]);
}

function updateSpotlight(event) {
  const card = event.currentTarget;
  const bounds = card.getBoundingClientRect();
  card.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
  card.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
}

function FeatureArt({ type, motionMode, onMotionMode, springVersion, onReplay, blurOn, onBlur }) {
  if (type === 'notes') return (
    <div className="vr-art vr-note-art" aria-hidden="true">
      <div className="vr-note-toolbar"><span /><span /><span /></div>
      <div className="vr-note-title">今天的想法</div><div className="vr-note-line wide" /><div className="vr-note-line" /><div className="vr-note-line short" />
      <div className="vr-note-chip"><Check size={13} /> 已整理</div>
    </div>
  );

  if (type === 'prompt') return (
    <div className="vr-art vr-prompt-art" aria-hidden="true">
      <div className="vr-code-top"><Code2 size={15} /><span>Prompt.md</span><i /></div>
      <p>请基于以下内容</p><p><mark>提炼结构</mark> 并给出行动项</p><p>保留原有语气与重点</p>
      <div className="vr-code-status"><span>3 条规则</span><b>ready</b></div>
    </div>
  );

  if (type === 'calendar') return (
    <div className="vr-art vr-calendar-art" aria-hidden="true">
      <div className="vr-calendar-head"><CalendarDays size={15} /><strong>八月</strong><span>2026</span></div>
      <div className="vr-days">{['一', '二', '三', '四', '五', '六', '日'].map((day) => <i key={day}>{day}</i>)}</div>
      <div className="vr-date-grid">{Array.from({ length: 28 }, (_, index) => <span className={index === 14 || index === 17 || index === 22 ? 'is-marked' : ''} key={index}>{index + 1}</span>)}</div>
      <div className="vr-calendar-event">15:00 项目复盘</div>
    </div>
  );

  if (type === 'links') return (
    <div className="vr-art vr-link-art" aria-hidden="true">
      <div className="vr-browser-bar"><span /><span /><span /><b>voyra.link</b></div>
      {['工作台', '学习资料', 'AI 资源'].map((item, index) => <div className="vr-link-row" key={item}><i>{index + 1}</i><span>{item}</span><ArrowUpRight size={14} /></div>)}
    </div>
  );

  const SceneIcon = MOTION_SCENES.find(([id]) => id === motionMode)?.[2] || MousePointer2;
  const currentIndex = MOTION_SCENES.findIndex(([id]) => id === motionMode);
  const selectPrevious = () => onMotionMode(MOTION_SCENES[(currentIndex + 2) % MOTION_SCENES.length][0]);
  const selectNext = () => onMotionMode(MOTION_SCENES[(currentIndex + 1) % MOTION_SCENES.length][0]);
  return (
    <div className={`vr-art vr-motion-art scene-${motionMode}`} aria-label="交互展示">
      <div className="vr-motion-title"><SceneIcon size={16} /><span>Interaction Lab</span></div>
      <div className="vr-motion-stage" key={`${motionMode}-${springVersion}`}>
        {motionMode === 'hover' && <button className="vr-hover-sample">悬停我 <span>↗</span></button>}
        {motionMode === 'spring' && <button className="vr-spring-sample" onClick={onReplay}>重新播放</button>}
        {motionMode === 'blur' && <div className={`vr-glass-sample${blurOn ? ' is-blurred' : ''}`}><div className="vr-glass-copy"><b>工作台</b><span>backdrop filter</span></div><button onClick={onBlur}>{blurOn ? 'blur: on' : 'blur: off'}</button></div>}
      </div>
      <div className="vr-motion-controls">
        <button className="vr-control-arrow" onClick={selectPrevious} aria-label="上一个演示"><ArrowLeft size={15} /></button>
        {MOTION_SCENES.map(([id, label]) => <button key={id} className={`vr-control-dot${motionMode === id ? ' is-active' : ''}`} onClick={() => onMotionMode(id)} aria-label={`切换到${label}`} />)}
        <button className="vr-control-arrow" onClick={selectNext} aria-label="下一个演示"><ArrowRight size={15} /></button>
      </div>
    </div>
  );
}

function ProductPanel({ go }) {
  const [motionMode, setMotionMode] = useState('hover');
  const [springVersion, setSpringVersion] = useState(0);
  const [blurOn, setBlurOn] = useState(true);
  return <div className="vr-product-list">{FEATURED.map((feature, index) => {
    const Icon = feature.Icon;
    const openFeature = (event) => {
      if (event.target.closest('button')) return;
      go(feature.to);
    };
    return (
      <div className="vr-roll-wrap vr-panel-stagger" data-roll key={feature.to}><article className={`vr-feature vr-card${index % 2 ? ' is-reverse' : ''}`} data-reveal style={{ '--reveal-delay': `${Math.min(index * 0.08, 0.28)}s` }} onPointerMove={updateSpotlight} onClick={openFeature} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); go(feature.to); } }} role="link" tabIndex={0}>
        <span className="vr-spotlight" aria-hidden="true" />
        <div className="vr-feature-copy"><span className="vr-feature-index">{feature.no}</span><div className="vr-feature-title"><Icon size={24} strokeWidth={1.7} /><h2>{feature.name}</h2></div><p>{feature.desc}</p><button className="vr-arrow-link" onClick={() => go(feature.to)}>{feature.cta}<ArrowUpRight size={17} /></button></div>
        <FeatureArt type={feature.art} motionMode={motionMode} onMotionMode={setMotionMode} springVersion={springVersion} onReplay={() => setSpringVersion((version) => version + 1)} blurOn={blurOn} onBlur={() => setBlurOn((value) => !value)} />
      </article></div>
    );
  })}</div>;
}

function SkillsPanel() {
  return <section className="vr-skill-group vr-solo-skill vr-panel-stagger" data-roll>
    <div className="vr-group-label"><span>我的 Skills</span><b>01</b></div>
    <a className="vr-mathmodel-card vr-card" data-reveal href={MATHMODEL_SKILL.href} target="_blank" rel="noreferrer" onPointerMove={updateSpotlight}>
      <span className="vr-spotlight" aria-hidden="true" />
      <span className="vr-mathmodel-top"><strong>{MATHMODEL_SKILL.name}</strong><span className="vr-mathmodel-meta"><Star size={16} fill="currentColor" /> GitHub</span><span className="vr-mathmodel-open"><ArrowUpRight size={17} /></span></span>
      <span className="vr-mathmodel-tagline">{MATHMODEL_SKILL.tagline}</span>
      <span className="vr-text-figure" aria-hidden="true"><i className="vr-figure-head">题</i><i className="vr-figure-arm vr-figure-arm-left">数</i><i className="vr-figure-body">建<br />模</i><i className="vr-figure-arm vr-figure-arm-right">据</i><i className="vr-figure-leg vr-figure-leg-left">求</i><i className="vr-figure-leg vr-figure-leg-right">解</i></span>
    </a>
  </section>;
}

function ArticlesPanel({ go }) {
  return <div className="vr-article-grid">{ARTICLES.map((article, index) => <div className="vr-roll-wrap vr-panel-stagger" data-roll key={article.title}><button className="vr-article-card vr-card" data-reveal style={{ '--reveal-delay': `${Math.min(index * 0.08, 0.24)}s` }} onPointerMove={updateSpotlight} onClick={() => go('/blog')}>
    <span className="vr-spotlight" aria-hidden="true" /><span className="vr-article-index">{String(index + 1).padStart(2, '0')}</span><span className="vr-article-date">{article.date}</span><strong>{article.title}</strong><span className="vr-article-desc">{article.desc}</span><span className="vr-article-open">阅读 <ArrowUpRight size={16} /></span>
  </button></div>)}<button className="vr-all-link" onClick={() => go('/blog')}>全部文章 <ArrowUpRight size={17} /></button></div>;
}

function AboutPanel() {
  return <div className="vr-about-panel">
    <section className="vr-about-intro" data-roll><span>SHUAI SHUAI / VOYRA</span><p>个人开发者，持续把灵感、工具和 AI 能力整理成真正能反复使用的产品。</p><div className="vr-tags" aria-label="个人标签">{['VOYRA', 'FRONTEND', 'AI', 'CREATOR', 'CLOUDFLARE', 'BMOB'].map((tag) => <span key={tag}>{tag}</span>)}</div></section>
    <section className="vr-experience" data-reveal><div className="vr-experience-label"><span>经历 / EXPERIENCE</span><b>持续构建</b></div><div className="vr-experience-list">{EXPERIENCES.map((item, index) => {
      const Icon = item.Icon;
      return <article className="vr-experience-card vr-card" data-reveal style={{ '--reveal-delay': `${Math.min(index * 0.08, 0.2)}s` }} onPointerMove={updateSpotlight} key={item.name}><span className="vr-spotlight" aria-hidden="true" /><span className="vr-experience-index">{String(index + 1).padStart(2, '0')}</span><div><span>{item.state}</span><h2>{item.name}</h2><p>{item.desc}</p></div><Icon className="vr-experience-icon" size={35} strokeWidth={1.35} /></article>;
    })}</div></section>
  </div>;
}

function TabReel({ activeTab }) {
  const number = String(TABS.findIndex(([id]) => id === activeTab) + 1).padStart(2, '0');
  return <span className="vr-tab-reel" aria-hidden="true">{number.split('').map((digit, index) => <span className="vr-tab-reel-digit" key={`${activeTab}-${index}`} style={{ '--reel-delay': `${index * 0.1}s` }}>{digit}</span>)}</span>;
}

function ContactPanel() {
  return <section className="vr-contact-panel" data-roll><div className="vr-contact-head" data-reveal><span>联系 / ELSEWHERE</span><b>保持交流</b></div><div className="vr-contact-list">{CONTACTS.map((contact, index) => {
    const Icon = contact.Icon;
    return <a href={contact.href} className="vr-contact-row" data-reveal style={{ '--reveal-delay': `${index * 0.08}s` }} target="_blank" rel="noreferrer" key={contact.label}><span>{contact.no}</span><Icon size={19} strokeWidth={1.6} /><strong>{contact.label}</strong><em>{contact.value}</em><ArrowUpRight size={18} /></a>;
  })}</div></section>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [progress, setProgress] = useState(0);
  const rootRef = useRef(null);
  const panelRefs = useRef({});
  useReveal(rootRef, activeTab);
  useScrollRoll(rootRef, activeTab);

  useEffect(() => {
    const root = rootRef.current;
    const scroller = root?.parentElement;
    if (!root || !scroller) return undefined;
    const updateProgress = () => {
      const available = scroller.scrollHeight - scroller.clientHeight;
      setProgress(available > 0 ? Math.round((scroller.scrollTop / available) * 100) : 0);
    };
    scroller.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
    return () => scroller.removeEventListener('scroll', updateProgress);
  }, []);

  const go = useCallback((to) => navigate(to), [navigate]);
  const changeTab = useCallback((next, updateHash = true) => {
    setActiveTab(next);
    if (updateHash) {
      const url = new URL(window.location.href);
      url.hash = `/?tab=${next}`;
      window.history.replaceState(window.history.state, '', url);
    }
  }, []);
  const panels = useMemo(() => ({
    products: <ProductPanel go={go} />,
    skills: <SkillsPanel />,
    articles: <ArticlesPanel go={go} />,
    me: <AboutPanel />,
    contact: <ContactPanel />,
  }), [go]);

  useEffect(() => {
    const syncTabFromHash = () => {
      changeTab(getTabFromHash(), false);
    };
    window.addEventListener('hashchange', syncTabFromHash);
    window.addEventListener('popstate', syncTabFromHash);
    return () => {
      window.removeEventListener('hashchange', syncTabFromHash);
      window.removeEventListener('popstate', syncTabFromHash);
    };
  }, [changeTab]);

  useEffect(() => {
    const panel = panelRefs.current[activeTab];
    if (!panel) return undefined;
    panel.classList.remove('vr-panel-enter');
    void panel.offsetWidth;
    panel.classList.add('vr-panel-enter');
    return undefined;
  }, [activeTab]);

  return <div className="vr-home" ref={rootRef}>
    <style>{`
      .vr-home{--ink:#1b1b1b;--muted:#8d8d8d;--line:rgba(27,27,27,.11);--paper:#fff;min-height:100%;color:var(--ink);background-color:var(--paper);background-image:linear-gradient(rgba(0,0,0,.031) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.031) 1px,transparent 1px);background-size:32px 32px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;overflow:hidden}.vr-home *,.vr-home *::before,.vr-home *::after{box-sizing:border-box}.vr-home button,.vr-home a{font:inherit}.vr-home button{cursor:pointer}.vr-home button:focus-visible,.vr-home a:focus-visible{outline:2px solid #1b1b1b;outline-offset:4px}.vr-stage{width:min(100% - 48px,756px);margin:0 auto}.vr-rail{position:fixed;left:28px;top:42%;z-index:30;display:grid;grid-template-columns:2px 30px;align-items:end;gap:9px;color:#9c9c9c;font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-rail-line{position:relative;height:120px;background:var(--line)}.vr-rail-line::before{content:"";position:absolute;top:0;left:0;width:2px;height:34px;background:var(--ink);transform:translateY(var(--rail-y));transition:transform .16s linear}.vr-progress-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.vr-top{width:min(100% - 48px,756px);margin:0 auto;padding:40px 0 0;display:flex;align-items:center;justify-content:space-between;color:#666;font:14px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-brand{display:inline-flex;gap:6px;align-items:center;color:#555}.vr-brand::before{content:"";width:7px;height:7px;border:1px solid #a48830;border-radius:50%}.vr-brand sup{font-size:8px}.vr-github{display:inline-flex;align-items:center;gap:6px;color:inherit;text-decoration:none;transition:color .2s ease}.vr-github:hover{color:var(--ink)}.vr-hero{min-height:555px;display:flex;flex-direction:column;justify-content:center;padding:72px 0 48px}.vr-hero h1{max-width:620px;margin:0;font-size:106px;font-weight:780;line-height:.99}.vr-hero h1 span{display:block;animation:vr-word-in .72s cubic-bezier(.16,1,.3,1) both}.vr-hero h1 span:nth-child(2){animation-delay:.07s}.vr-hero h1 span:nth-child(3){animation-delay:.14s}@keyframes vr-word-in{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}.vr-hero-meta{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:36px;color:#686868;font-size:13px}.vr-hero-meta strong{color:var(--ink);font-size:17px}.vr-scroll-cue{display:inline-flex;gap:7px;align-items:center;margin-top:28px;color:#999;font-size:13px;animation:vr-cue 1.7s ease-in-out infinite}@keyframes vr-cue{50%{transform:translateY(5px)}}.vr-tab-zone{position:relative;padding-top:26px}.vr-tab-zone::after{content:"01";position:absolute;top:-4px;right:4px;color:transparent;-webkit-text-stroke:1px rgba(27,27,27,.08);font-size:190px;font-weight:800;line-height:1;pointer-events:none}.vr-tabs{position:sticky;top:0;z-index:20;display:flex;gap:38px;align-items:flex-end;padding:0 0 24px;background:rgba(255,255,255,.78);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}.vr-tab{position:relative;flex:0 0 auto;border:0;padding:0;background:transparent;color:#c5c5c5;font-size:48px;font-weight:760;line-height:1;transition:color .2s ease,transform .2s ease}.vr-tab:hover{color:#777;transform:translateY(-2px)}.vr-tab.is-active{color:var(--ink)}.vr-tab.is-active::after{content:"";position:absolute;left:-3px;right:-3px;bottom:1px;z-index:-1;height:13px;background:#ffe08a;transform-origin:left;animation:vr-marker .35s cubic-bezier(.16,1,.3,1) both}@keyframes vr-marker{from{transform:scaleX(0)}to{transform:scaleX(1)}}.vr-panel{position:relative;padding:42px 0 110px;min-height:520px;animation:vr-panel-in .48s cubic-bezier(.16,1,.3,1) both}@keyframes vr-panel-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}[data-reveal]{opacity:0;transform:translateY(18px);transition:opacity .64s cubic-bezier(.16,1,.3,1),transform .64s cubic-bezier(.16,1,.3,1)}[data-reveal].vr-is-visible{opacity:1;transform:translateY(0)}.vr-card{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.88);box-shadow:0 1px 0 rgba(0,0,0,.02);transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s ease,border-color .3s ease}.vr-card:hover{border-color:rgba(27,27,27,.18);box-shadow:0 18px 34px rgba(34,30,15,.1);transform:translateY(-3px)}.vr-spotlight{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:0;background:radial-gradient(220px circle at var(--spot-x,50%) var(--spot-y,50%),rgba(255,224,134,.3),transparent 72%);transition:opacity .22s ease}.vr-card:hover .vr-spotlight{opacity:1}.vr-product-list{display:grid;gap:18px}.vr-feature{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:278px}.vr-feature.is-reverse .vr-feature-copy{order:2}.vr-feature.is-reverse .vr-art{order:1}.vr-feature-copy{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:40px 32px}.vr-feature-index,.vr-skill-number,.vr-article-index,.vr-experience-index{position:absolute;color:transparent;-webkit-text-stroke:1px rgba(27,27,27,.12);font-size:44px;font-weight:760;line-height:1}.vr-feature-index{bottom:18px;left:25px}.vr-feature-title{display:flex;align-items:center;gap:12px}.vr-feature-title h2{margin:0;font-size:40px;font-weight:760;line-height:1}.vr-feature-copy p{max-width:285px;margin:18px 0 22px;color:#626262;font-size:15px;line-height:1.8}.vr-arrow-link{display:inline-flex;align-items:center;gap:7px;border:0;padding:0;color:#666;background:transparent;font-size:14px;transition:color .2s ease,transform .2s ease}.vr-arrow-link:hover{color:var(--ink);transform:translateX(4px)}.vr-art{position:relative;z-index:1;align-self:center;justify-self:stretch;min-height:202px;margin:24px;border:1px solid rgba(27,27,27,.1);border-radius:8px;background:#fcfcfc;box-shadow:0 12px 22px rgba(30,30,30,.07)}.vr-note-art{padding:18px;transform:rotate(-1deg)}.vr-note-toolbar,.vr-browser-bar{display:flex;gap:5px;align-items:center;padding-bottom:12px;border-bottom:1px solid #ececec}.vr-note-toolbar span,.vr-browser-bar span{width:7px;height:7px;border-radius:50%;background:#d8d8d8}.vr-note-title{margin-top:17px;font-size:13px;font-weight:700}.vr-note-line{height:7px;width:68%;margin-top:13px;background:#e5e5e5;border-radius:2px}.vr-note-line.wide{width:90%}.vr-note-line.short{width:44%}.vr-note-chip{position:absolute;right:15px;bottom:16px;display:inline-flex;gap:4px;align-items:center;padding:5px 8px;border:1px solid #dbe4d7;border-radius:99px;background:#f3f8f1;color:#608059;font-size:10px}.vr-prompt-art{padding:17px 20px;transform:rotate(1deg);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.vr-code-top{display:flex;align-items:center;gap:7px;color:#666;font-size:11px}.vr-code-top i{margin-left:auto;width:7px;height:7px;border-radius:50%;background:#f2c641}.vr-prompt-art p{margin:15px 0 0;color:#4e4e4e;font-size:12px}.vr-prompt-art mark{padding:2px 3px;background:#f2e4a4;color:inherit}.vr-code-status{display:flex;justify-content:space-between;margin-top:25px;color:#929292;font-size:10px}.vr-code-status b{color:#71976b;font-weight:600}.vr-motion-art{display:grid;grid-template-rows:auto 1fr auto;padding:14px;overflow:hidden}.vr-motion-title{display:flex;align-items:center;gap:7px;color:#626262;font-size:11px;font-weight:700}.vr-motion-stage{display:grid;min-height:121px;place-items:center}.vr-hover-sample,.vr-spring-sample{border:1px solid #222;border-radius:7px;padding:13px 17px;background:#fff;color:var(--ink);font-weight:700;transition:transform .25s cubic-bezier(.16,1,.3,1),background .25s ease,color .25s ease}.vr-hover-sample:hover{background:var(--ink);color:#fff;transform:translateY(-5px) rotate(-2deg)}.vr-hover-sample span{padding-left:5px}.vr-spring-sample{animation:vr-spring .82s cubic-bezier(.34,1.56,.64,1) both}.vr-spring-sample:hover{background:#ffe08a;transform:translateY(-3px)}@keyframes vr-spring{0%{opacity:0;transform:scale(.5)}55%{opacity:1;transform:scale(1.12)}100%{transform:scale(1)}}.vr-glass-sample{position:relative;width:88%;padding:14px;overflow:hidden;border:1px solid rgba(27,27,27,.12);border-radius:7px;background:rgba(255,255,255,.64)}.vr-glass-sample::before{content:"";position:absolute;inset:-20px;background:repeating-linear-gradient(135deg,#f2d760 0 16px,#fff 16px 32px,#8bd0d2 32px 48px)}.vr-glass-sample.is-blurred{backdrop-filter:blur(9px)}.vr-glass-copy,.vr-glass-sample button{position:relative;z-index:1}.vr-glass-copy{display:flex;justify-content:space-between;align-items:center}.vr-glass-copy b{font-size:14px}.vr-glass-copy span{color:#666;font-size:10px}.vr-glass-sample button{margin-top:13px;border:1px solid rgba(27,27,27,.16);border-radius:99px;padding:4px 7px;background:rgba(255,255,255,.82);color:#555;font-size:10px}.vr-motion-controls{display:flex;justify-content:center;align-items:center;gap:8px}.vr-motion-controls button{display:grid;place-items:center;width:19px;height:19px;border:0;padding:0;color:#8a8a8a;background:transparent}.vr-control-dot::after{content:"";width:5px;height:5px;border-radius:50%;background:#c6c6c6}.vr-control-dot.is-active{width:24px}.vr-control-dot.is-active::after{width:20px;height:3px;border-radius:99px;background:var(--ink)}.vr-calendar-art{padding:15px;transform:rotate(-1deg)}.vr-calendar-head{display:flex;align-items:center;gap:7px;border-bottom:1px solid #e8e8e8;padding-bottom:9px;color:#555;font-size:11px}.vr-calendar-head span{margin-left:auto;color:#999}.vr-days,.vr-date-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center}.vr-days{margin-top:10px;color:#aaa;font-size:8px;font-style:normal}.vr-date-grid{margin-top:8px}.vr-date-grid span{display:grid;place-items:center;width:19px;height:18px;justify-self:center;color:#666;font-size:9px}.vr-date-grid span.is-marked{border-radius:50%;background:#f6da73;color:#333;font-weight:700}.vr-calendar-event{margin-top:10px;border-left:3px solid #6d9875;padding:4px 7px;background:#f4f8f1;color:#5e735a;font-size:9px}.vr-link-art{padding:14px;transform:rotate(1deg)}.vr-browser-bar{padding-bottom:11px}.vr-browser-bar b{margin-left:8px;color:#999;font-size:10px;font-weight:500}.vr-link-row{display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:7px;padding:12px 2px;border-bottom:1px solid #ededed;color:#555;font-size:12px}.vr-link-row:last-child{border-bottom:0}.vr-link-row i{display:grid;place-items:center;width:20px;height:20px;border:1px solid #ddd;border-radius:50%;color:#999;font-size:9px;font-style:normal}.vr-skill-groups{display:grid;gap:53px}.vr-group-label,.vr-experience-label,.vr-contact-head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:18px;color:#444;font-size:13px;font-weight:700}.vr-group-label b{color:#999;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-skill-grid,.vr-article-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.vr-skill-card{min-height:186px;border:1px solid var(--line);padding:22px;text-align:left;color:var(--ink)}.vr-skill-card>*:not(.vr-spotlight){position:relative;z-index:1}.vr-skill-number{right:15px;bottom:13px;font-size:38px}.vr-skill-icon{display:grid;place-items:center;width:41px;height:41px;border:1px solid #e3e3e3;border-radius:7px;background:#fff;transition:transform .25s cubic-bezier(.16,1,.3,1),background .25s ease,color .25s ease}.vr-skill-card:hover .vr-skill-icon{background:var(--ink);color:#fff;transform:rotate(-6deg) scale(1.08)}.vr-skill-name{display:block;margin-top:27px;font-size:28px;font-weight:760;line-height:1.05}.vr-skill-hint{display:block;margin-top:8px;color:#707070;font-size:13px}.vr-skill-open{position:absolute;top:19px;right:19px;display:grid;place-items:center;width:29px;height:29px;border:1px solid #dedede;border-radius:50%;color:#777;transition:background .2s ease,color .2s ease,transform .2s ease}.vr-skill-card:hover .vr-skill-open{background:#fff;color:var(--ink);transform:translate(2px,-2px)}.vr-article-card{min-height:235px;border:1px solid var(--line);padding:26px 24px 22px;text-align:left;color:var(--ink)}.vr-article-card>*:not(.vr-spotlight){position:relative;z-index:1}.vr-article-index{right:16px;bottom:14px;font-size:42px}.vr-article-date{display:block;color:#999;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-article-card strong{display:block;max-width:260px;margin-top:17px;font-size:23px;line-height:1.34}.vr-article-desc{display:block;margin-top:12px;color:#666;font-size:13px;line-height:1.65}.vr-article-open{position:absolute;left:24px;bottom:20px;display:inline-flex;gap:5px;color:#777;font-size:12px;transition:color .2s ease,transform .2s ease}.vr-article-card:hover .vr-article-open{color:var(--ink);transform:translateX(3px)}.vr-all-link{grid-column:1/-1;justify-self:start;display:inline-flex;gap:8px;align-items:center;border:0;padding:3px 0;color:#555;background:transparent;font-size:14px;text-decoration:underline;text-decoration-color:#df6262;text-decoration-thickness:2px;text-underline-offset:5px}.vr-about-panel{display:grid;gap:66px}.vr-about-intro>span{color:#888;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-about-intro p{max-width:590px;margin:26px 0 22px;color:#666;font-size:19px;line-height:1.9}.vr-tags{display:flex;flex-wrap:wrap;gap:8px}.vr-tags span{border:1px solid #dedede;border-radius:99px;padding:7px 10px;color:#666;background:rgba(255,255,255,.7);font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;transition:background .2s ease,border-color .2s ease,color .2s ease}.vr-tags span:hover{border-color:#e7c750;background:#fff4c8;color:var(--ink)}.vr-experience{border-top:1px solid var(--line);padding-top:24px}.vr-experience-label b,.vr-contact-head b{color:#999;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:400}.vr-experience-list{display:grid;gap:14px}.vr-experience-card{display:grid;grid-template-columns:58px 1fr auto;align-items:center;min-height:154px;padding:26px 28px}.vr-experience-card>*:not(.vr-spotlight){position:relative;z-index:1}.vr-experience-index{left:22px;bottom:15px;font-size:40px}.vr-experience-card div>span{color:#999;font-size:12px}.vr-experience-card h2{margin:7px 0 8px;font-size:28px;line-height:1}.vr-experience-card p{max-width:425px;margin:0;color:#666;font-size:13px;line-height:1.65}.vr-experience-icon{color:#7c7c7c}.vr-contact-panel{border-top:1px solid var(--line);padding-top:24px}.vr-contact-list{display:grid}.vr-contact-row{display:grid;grid-template-columns:38px 34px minmax(124px,1fr) minmax(0,1fr) 24px;gap:10px;align-items:center;border-bottom:1px solid var(--line);padding:20px 3px;color:var(--ink);text-decoration:none;transition:padding .25s cubic-bezier(.16,1,.3,1),background .25s ease}.vr-contact-row:hover{padding-left:16px;background:rgba(255,255,255,.52)}.vr-contact-row>span{color:#999;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-contact-row strong{font-size:24px;line-height:1}.vr-contact-row em{overflow:hidden;color:#777;font-size:13px;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.vr-contact-row svg:last-child{justify-self:end;color:#777;opacity:0;transform:translateX(-5px);transition:opacity .2s ease,transform .2s ease}.vr-contact-row:hover svg:last-child{opacity:1;transform:translateX(0)}.vr-footer{width:min(100% - 48px,756px);margin:0 auto;padding:0 0 42px;color:#999;font-size:12px}@media(max-width:720px){.vr-stage,.vr-top,.vr-footer{width:min(100% - 40px,756px)}.vr-top{padding-top:24px;font-size:11px}.vr-github{max-width:170px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.vr-rail{display:none}.vr-hero{min-height:465px;padding:72px 0 38px}.vr-hero h1{font-size:62px}.vr-hero-meta{gap:10px;margin-top:28px;color:#686868;font-size:11px}.vr-hero-meta strong{color:var(--ink);font-size:14px}.vr-tab-zone{padding-top:10px}.vr-tab-zone::after{top:10px;right:-12px;font-size:116px}.vr-tabs{gap:26px;overflow-x:auto;padding:0 0 16px;scrollbar-width:none}.vr-tabs::-webkit-scrollbar{display:none}.vr-tab{font-size:28px}.vr-tab.is-active::after{height:8px}.vr-panel{padding:30px 0 72px}.vr-feature{grid-template-columns:1fr;min-height:0}.vr-feature.is-reverse .vr-feature-copy,.vr-feature.is-reverse .vr-art{order:initial}.vr-art{min-height:192px;margin:18px 18px 0}.vr-feature-copy{padding:26px 24px 30px}.vr-feature-title h2{font-size:31px}.vr-feature-copy p{margin:14px 0 18px;font-size:14px}.vr-feature-index{left:17px;bottom:13px;font-size:38px}.vr-skill-groups{gap:38px}.vr-skill-grid,.vr-article-grid{grid-template-columns:1fr}.vr-skill-card{min-height:166px}.vr-skill-name{margin-top:22px;font-size:27px}.vr-article-card{min-height:208px}.vr-article-card strong{font-size:21px}.vr-about-panel{gap:46px}.vr-about-intro p{margin-top:20px;font-size:17px}.vr-experience-card{grid-template-columns:44px 1fr;padding:24px 20px}.vr-experience-icon{display:none}.vr-contact-row{grid-template-columns:28px 27px minmax(82px,1fr) 18px;gap:8px}.vr-contact-row em{display:none}.vr-contact-row strong{font-size:19px}.vr-contact-row svg:last-child{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.vr-home *,.vr-home *::before,.vr-home *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
    `}</style>
    <style>{`
      .vr-home { position: relative; isolation: isolate; background-color: #fff; background-image: linear-gradient(rgba(0,0,0,.031) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.031) 1px, transparent 1px); background-size: 32px 32px; background-attachment: fixed; }
      .vr-home > .vr-top, .vr-home > main, .vr-home > .vr-footer { position: relative; z-index: 1; }
      .vr-home .vr-ambient { position: fixed; z-index: 0; inset: 0; overflow: clip; pointer-events: none; opacity: .16; }
      .vr-home .vr-ambient::before { content: ""; position: absolute; inset: 0; background: radial-gradient(80% 50% at 50% -10%, rgba(255,226,138,.2), transparent 70%); }
      .vr-home .vr-ambient i { position: absolute; display: block; width: 40vmax; height: 40vmax; border-radius: 50%; background: radial-gradient(circle, rgba(255,226,138,.96) 0%, rgba(255,226,138,.58) 45%, rgba(255,226,138,0) 74%); }
      .vr-home .vr-ambient-left { top: -12vmax; left: -10vmax; animation: vr-ambient-left 36s ease-in-out infinite alternate; }
      .vr-home .vr-ambient-right { top: 40vh; right: -12vmax; bottom: auto; animation: vr-ambient-right 44s ease-in-out infinite alternate; }
      @keyframes vr-ambient-left { 0%, 100% { transform: translate3d(0, 0, 0) scale(.84); } 50% { transform: translate3d(15vmax, 12vmax, 0) scale(1.08); } }
      @keyframes vr-ambient-right { 0%, 100% { transform: translate3d(0, 0, 0) scale(.8); } 50% { transform: translate3d(-13vmax, -11vmax, 0) scale(1.06); } }
      .vr-home .vr-tab-zone::after { display: none; }
      .vr-home .vr-tab-reel { position: absolute; z-index: 0; top: -5px; right: 4px; display: flex; color: transparent; -webkit-text-stroke: 1px rgba(27,27,27,.09); font-size: 190px; font-weight: 800; line-height: 1; perspective: 700px; pointer-events: none; }
      .vr-home .vr-tab-reel-digit { display: block; overflow: hidden; }
      .vr-home .vr-tab-reel-digit { animation: vr-tab-reel-in 1.15s cubic-bezier(.19,1,.22,1) var(--reel-delay) both; transform-origin: 50% 100%; }
      @keyframes vr-tab-reel-in { from { opacity: 0; transform: translateY(115%) rotateX(-42deg); } to { opacity: 1; transform: translateY(0) rotateX(0); } }
      .vr-home .vr-panel { position: relative; min-height: 520px; padding: 42px 0 110px; animation: none; }.vr-home .vr-panel[hidden] { display: none; }
      .vr-home .vr-panel.vr-panel-enter { animation: vr-panel-reference-in .9s cubic-bezier(.19,1,.22,1) both; }
      @keyframes vr-panel-reference-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      .vr-home .vr-panel-enter .vr-panel-stagger { animation: vr-panel-stagger-in .9s cubic-bezier(.19,1,.22,1) var(--panel-delay, .05s) backwards; }
      .vr-home .vr-panel-enter .vr-panel-stagger:nth-child(2) { --panel-delay: .13s; }.vr-home .vr-panel-enter .vr-panel-stagger:nth-child(3) { --panel-delay: .21s; }.vr-home .vr-panel-enter .vr-panel-stagger:nth-child(4) { --panel-delay: .29s; }.vr-home .vr-panel-enter .vr-panel-stagger:nth-child(5) { --panel-delay: .37s; }
      @keyframes vr-panel-stagger-in { from { opacity: 0; } to { opacity: var(--roll-opacity, 1); } }
      .vr-home [data-roll] { --roll-y: 0px; --roll-angle: 0deg; --roll-angle-mobile: 0deg; --roll-opacity: 1; --roll-origin-y: 50%; min-width: 0; opacity: var(--roll-opacity); transform: perspective(900px) translate3d(0, var(--roll-y), 0) rotateX(var(--roll-angle)); transform-origin: 50% var(--roll-origin-y); transform-style: preserve-3d; backface-visibility: hidden; }
      .vr-home [data-roll].vr-scroll-active { will-change: transform, opacity; }
      .vr-home .vr-roll-wrap > .vr-feature, .vr-home .vr-roll-wrap > .vr-article-card { width: 100%; height: 100%; }
      .vr-home [data-reveal] { opacity: 0; filter: blur(7px); transform: perspective(900px) translate3d(0, 42px, 0) rotateX(-7deg); transform-origin: 50% 100%; transition: opacity .9s cubic-bezier(.19,1,.22,1) var(--reveal-delay, 0s), transform .95s cubic-bezier(.19,1,.22,1) var(--reveal-delay, 0s), filter .72s ease var(--reveal-delay, 0s); will-change: opacity, transform, filter; }
      .vr-home [data-reveal].vr-is-visible { opacity: 1; filter: blur(0); transform: perspective(900px) translate3d(0, 0, 0) rotateX(0); }
      .vr-home .vr-card[data-reveal].vr-is-visible:hover { transform: translateY(-3px); }
      .vr-home .vr-top { width: min(100% - 48px, 756px); }
      .vr-home .vr-hero-shell { width: min(100% - 48px, 984px); min-height: calc(100svh - 34px); margin: 0 auto; }
      .vr-home .vr-hero { min-height: 0; align-items: center; padding: 50px 0 58px; text-align: center; justify-content: center; }
      .vr-home .vr-hero h1 { position: relative; z-index: 1; max-width: none; width: 100%; margin: 0; font-size: 164px; font-weight: 800; letter-spacing: 0; line-height: .82; text-shadow: 0 1px 0 rgba(255,255,255,.7); }
      .vr-home .vr-hero h1 span:nth-child(4) { animation-delay: .21s; }
      .vr-home .vr-hero-outline { position: relative; color: transparent; -webkit-text-stroke: 2px var(--ink); text-shadow: 7px 7px 0 rgba(255,226,138,.42); }
      .vr-home .vr-hero-meta { justify-content: center; margin-top: 40px; color: #5d5d5d; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; letter-spacing: 0; }
      .vr-home .vr-hero-meta strong { position: relative; padding-right: 18px; font-size: 15px; }.vr-home .vr-hero-meta strong::after { content: ""; position: absolute; top: 50%; right: 0; width: 8px; height: 1px; background: #c4a541; }
      .vr-home .vr-scroll-cue { margin-top: 34px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
      .vr-home .vr-tab { font-size: 48px; font-weight: 760; line-height: 1; }
      .vr-home .vr-arrow-link, .vr-home .vr-all-link { font-size: 14px; }
      .vr-home .vr-solo-skill { max-width: 756px; }
      .vr-home .vr-mathmodel-card { display: block; min-height: 314px; padding: 26px; color: var(--ink); text-decoration: none; }
      .vr-home .vr-mathmodel-card > *:not(.vr-spotlight) { position: relative; z-index: 1; }
      .vr-home .vr-mathmodel-top { display: grid; grid-template-columns: minmax(0, 1fr) auto 29px; gap: 12px; align-items: center; }
      .vr-home .vr-mathmodel-top strong { font-size: 31px; font-weight: 760; line-height: 1; }
      .vr-home .vr-mathmodel-meta { display: inline-flex; align-items: center; gap: 5px; color: #535353; font-size: 13px; font-weight: 700; }
      .vr-home .vr-mathmodel-meta svg { color: #d4a930; }
      .vr-home .vr-mathmodel-open { display: grid; place-items: center; width: 29px; height: 29px; border: 1px solid #dedede; border-radius: 50%; color: #777; transition: background .2s ease, color .2s ease, transform .2s ease; }
      .vr-home .vr-mathmodel-card:hover .vr-mathmodel-open { background: #fff; color: var(--ink); transform: translate(2px, -2px); }
      .vr-home .vr-mathmodel-tagline { display: block; margin-top: 8px; color: #777; font-size: 16px; font-weight: 650; }
      .vr-home .vr-mathmodel-card .vr-text-figure { position: absolute; right: 45px; bottom: 18px; z-index: 1; width: 180px; height: 174px; color: #303030; opacity: .92; transition: transform .35s cubic-bezier(.16,1,.3,1); }
      .vr-home .vr-mathmodel-card:hover .vr-text-figure { transform: translateY(-5px) rotate(-2deg); }
      .vr-home .vr-text-figure i { position: absolute; display: grid; place-items: center; margin: 0; border: 1px solid rgba(27,27,27,.24); border-radius: 4px; background: rgba(255,255,255,.74); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 15px; font-style: normal; font-weight: 700; line-height: 1; box-shadow: 0 5px 12px rgba(27,27,27,.06); }
      .vr-home .vr-figure-head { top: 0; left: 71px; width: 39px; height: 39px; border-radius: 50% !important; }
      .vr-home .vr-figure-body { top: 50px; left: 65px; width: 50px; height: 60px; line-height: 1.55 !important; }
      .vr-home .vr-figure-arm { top: 60px; width: 38px; height: 30px; }
      .vr-home .vr-figure-arm-left { left: 11px; transform: rotate(-17deg); }
      .vr-home .vr-figure-arm-right { right: 10px; transform: rotate(17deg); }
      .vr-home .vr-figure-leg { top: 121px; width: 39px; height: 35px; }
      .vr-home .vr-figure-leg-left { left: 50px; transform: rotate(10deg); }
      .vr-home .vr-figure-leg-right { right: 49px; transform: rotate(-10deg); }
      @media (max-width: 720px) { .vr-home .vr-top { width: min(100% - 40px, 756px); } .vr-home .vr-hero-shell { width: min(100% - 40px, 756px); min-height: calc(100svh - 14px); } .vr-home .vr-hero { min-height: calc(100svh - 14px); padding: 78px 0 54px; } .vr-home .vr-hero h1 { font-size: 76px; line-height: .84; } .vr-home .vr-hero-outline { -webkit-text-stroke-width: 1.25px; text-shadow: 4px 4px 0 rgba(255,226,138,.42); } .vr-home .vr-hero-meta { gap: 11px; margin-top: 31px; font-size: 10px; } .vr-home .vr-hero-meta strong { padding-right: 12px; font-size: 13px; } .vr-home .vr-hero-meta strong::after { width: 6px; } .vr-home .vr-scroll-cue { margin-top: 30px; } .vr-home .vr-tab { font-size: 28px; } .vr-home [data-roll] { transform: perspective(900px) translate3d(0, var(--roll-y), 0) rotateX(var(--roll-angle-mobile)); } .vr-home [data-reveal] { transform: translate3d(0, 26px, 0); filter: blur(4px); } .vr-home [data-reveal].vr-is-visible { transform: translate3d(0, 0, 0); } }
      @media (max-width: 720px) { .vr-home .vr-mathmodel-card { min-height: 294px; padding: 22px; } .vr-home .vr-mathmodel-top { grid-template-columns: minmax(0, 1fr) 29px; gap: 9px; } .vr-home .vr-mathmodel-top strong { font-size: 27px; } .vr-home .vr-mathmodel-meta { grid-column: 1 / -1; grid-row: 2; font-size: 12px; } .vr-home .vr-mathmodel-open { grid-column: 2; grid-row: 1; } .vr-home .vr-mathmodel-tagline { margin-top: 12px; font-size: 14px; } .vr-home .vr-text-figure { right: 18px; bottom: 5px; transform: scale(.83); transform-origin: bottom right; } .vr-home .vr-mathmodel-card:hover .vr-text-figure { transform: translateY(-5px) rotate(-2deg) scale(.83); } }
    `}</style>
    <div className="vr-ambient" aria-hidden="true"><i className="vr-ambient-left" /><i className="vr-ambient-right" /></div>
    <div className="vr-rail" aria-hidden="true"><div className="vr-rail-line" style={{ '--rail-y': `${Math.max(0, (progress / 100) * 86)}px` }} /><span>{String(progress).padStart(2, '0')}</span></div><span className="vr-progress-label">阅读进度 {progress}%</span>
    <header className="vr-top"><span className="vr-brand">VOYRA<sup>®</sup></span><a className="vr-github" href="https://github.com/liixnglinb" target="_blank" rel="noreferrer"><Github size={15} />github.com/liixnglinb</a></header>
    <main><section className="vr-hero-shell"><div className="vr-hero" data-roll><h1><span>Voyra</span><span>makes</span><span className="vr-hero-outline">ideas</span><span>useful.</span></h1><div className="vr-hero-meta"><strong>帅帅你阿历</strong><span>PERSONAL TOOLS / AI / OPEN-SOURCE</span></div><div className="vr-scroll-cue"><ChevronDown size={16} /> 向下探索</div></div></section><section className="vr-stage vr-tab-zone" data-active-work={activeTab} aria-label="内容分类"><TabReel activeTab={activeTab} /><div className="vr-tabs" data-roll role="tablist" aria-label="内容分类">{TABS.map(([id, label]) => <button id={`work-tab-${id}`} key={id} role="tab" aria-controls={`panel-${id}`} aria-selected={activeTab === id} className={`vr-tab${activeTab === id ? ' is-active' : ''}`} onClick={() => changeTab(id)}>{label}</button>)}</div><div className="vr-panels">{TABS.map(([id, label]) => <div className="vr-panel" ref={(node) => { panelRefs.current[id] = node; }} id={`panel-${id}`} role="tabpanel" aria-labelledby={`work-tab-${id}`} aria-label={label} aria-hidden={activeTab !== id} hidden={activeTab !== id} key={id}>{panels[id]}</div>)}</div></section></main>
    <footer className="vr-footer" data-roll>© 2026 Voyra®</footer>
  </div>;
}
