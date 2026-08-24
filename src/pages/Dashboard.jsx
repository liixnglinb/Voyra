import React, { useState, useEffect, useRef } from 'react';
import {
  NotebookPen, Link, Lightbulb, BookOpen, Baby, Share2, Globe,
  Wrench, CalendarDays, CalendarClock, Bot, Newspaper,
  Github, ArrowUpRight, ChevronDown, Zap, Waves, Frame, Sparkles,
} from 'lucide-react';

/* ============================================================
   Voyra 首页 · 一比一复刻 oiloil.org 布局（纯文字版）
   - 产品卡：幽灵大编号 + 40px 标题 + 描述 + 数字标签
   - Skills：大字号标题放上方 + 星标计数 + 纯文字卡
   - 标签胶囊 / 联系区编号列表 全部对齐原站
   ============================================================ */

const FEATURED = [
  { to: '/smart-notes', no: '01', name: '智能笔记', en: 'NOTES · 随手记录灵感，沉淀结构化知识', match: 12, Icon: NotebookPen },
  { to: '/prompts',      no: '02', name: '提示词库', en: 'LIB · 管理 AI 提示词模板，随用随取', match: 8, Icon: Lightbulb },
  { to: '/agents',       no: '03', name: 'AI Agent', en: 'AGENTS · 主流 Agent 聚合与高分 Skill 资源', match: 6, Icon: Bot },
  { to: '/planner',      no: '04', name: '个人日程', en: 'PLAN · 日历假期与自定义日程，精准到点', match: 9, Icon: CalendarClock },
  { to: '/web-links',    no: '05', name: '网页链接', en: 'LINKS · 收藏与管理常用网页，分类快速访问', match: 7, Icon: Link },
];

const TOOL_GROUPS = [
  { title: 'EFFICIENCY · 效率工具', count: 6, items: [
    { to: '/smart-notes', label: '智能笔记', Icon: NotebookPen },
    { to: '/web-links', label: '网页链接', Icon: Link },
    { to: '/mindmap', label: '思维导图', Icon: Share2 },
    { to: '/tools', label: '工具网站', Icon: Wrench },
    { to: '/schedule', label: '个人课表', Icon: CalendarDays },
    { to: '/planner', label: '个人日程', Icon: CalendarClock },
  ]},
  { title: 'CREATION · 创作工具', count: 3, items: [
    { to: '/prompts', label: '提示词库', Icon: Lightbulb },
    { to: '/learning', label: '学习资料', Icon: BookOpen },
    { to: '/blog', label: '个人博客', Icon: Globe },
  ]},
  { title: 'LIFE · 生活与 AI', count: 3, items: [
    { to: '/baby-care', label: '宝宝护理', Icon: Baby },
    { to: '/agents', label: 'AI Agent & Skill', Icon: Bot },
    { to: '/news', label: 'AI 每日情报站', Icon: Newspaper },
  ]},
];

const MY_SKILLS = [
  { href: 'https://github.com/liixnglinb/mathmodel-skill', label: '数学建模', en: '竞赛课题建模全流程：分析 · 建模 · 出图 · 论文', Icon: BookOpen },
];

const ME_TAGS = ['VOYRA', 'FRONTEND', 'AI', 'CREATOR', 'CLOUDFLARE', 'BMOB'];

const EXPERIENCES = [
  { state: '现在', name: 'Voyra 个人站', desc: '云端一站式创作与效率平台，聚合 15 个高频效率与 AI 工具。', Icon: NotebookPen },
  { state: '基建', name: 'Cloudflare Pages', desc: 'GitHub 到 Cloudflare 自动构建部署，自定义域名 lxlrwxs.top。', Icon: Share2 },
  { state: '数据', name: 'Bmob 云后端', desc: '用户数据云端存储，免服务器，开箱即用。', Icon: Globe },
];

const CONTACTS = [
  { no: '01', label: 'GitHub', val: '@liixnglinb', href: 'https://github.com/liixnglinb', Icon: Github },
  { no: '02', label: 'Email', val: 'hello@lxlrwxs.top', href: 'mailto:hello@lxlrwxs.top', Icon: Sparkles },
  { no: '03', label: '网站', val: 'https://lxlrwxs.top', href: 'https://lxlrwxs.top', Icon: Globe },
];

export default function Dashboard() {
  const [tab, setTab] = useState('products');
  const [replay, setReplay] = useState(0);
  const [progress, setProgress] = useState(0);
  const rootRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setReplay((r) => r + 1), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onScroll = () => {
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(100, Math.round((el.scrollTop / total) * 100)) : 0);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const nodes = el.querySelectorAll('.oy-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const s = en.target;
          const d = s.dataset.revealDelays ? Number(s.dataset.revealDelays) : 0;
          setTimeout(() => s.classList.add('oy-in'), d);
          io.unobserve(s);
        }
      });
    }, { threshold: 0.12 });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [tab]);

  const go = (to) => window.open('#' + to, '_blank', 'noopener,noreferrer');

  return (
    <div className="oy" ref={rootRef}>
      <style>{`
        .oy {
          min-height: 100vh;
          background: #fff;
          color: #1a1a1a;
          font-family: "Helvetica Neue", -apple-system, "PingFang SC", "Noto Sans SC", sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }
        .oy * { box-sizing: border-box; }
        .oy a { color: inherit; text-decoration: none; }
        .oy button { font-family: inherit; cursor: pointer; }

        .oy-progress { position: sticky; top: 0; left: 0; z-index: 30; height: 2px; background: #1a1a1a; width: 0%; transition: width .12s linear; }

        .oy-top { display: flex; align-items: center; justify-content: space-between; padding: 26px 44px 0; flex-wrap: wrap; }
        .oy-brand { font-size: 20px; font-weight: 800; letter-spacing: -0.04em; }
        .oy-gh { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #555; border: 1px solid #e5e5e5; border-radius: 999px; padding: 7px 14px; transition: all .2s ease; }
        .oy-gh:hover { background: #fafafa; color: #1a1a1a; }

        /* tab 导航：大字号标题在下方固定 */
        .oy-nav { display: flex; justify-content: center; gap: 42px; padding: 20px 44px 16px; position: sticky; top: 2px; z-index: 20; background: rgba(255,255,255,.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        .oy-tab { appearance: none; border: none; background: none; font-size: 48px; font-weight: 700; letter-spacing: -0.03em; padding: 0; opacity: .76; color: #b8b8b8; transition: all .3s ease; position: relative; }
        .oy-tab:hover { color: #777; transform: translateY(-2px); opacity: 1; }
        .oy-tab.on { color: #1a1a1a; opacity: 1; }
        .oy-tab.on::after { content: ""; position: absolute; left: -2%; bottom: 4px; width: 104%; height: .3em; background: rgba(255,226,138,.9); z-index: -1; transform-origin: left; animation: oy-hl .5s cubic-bezier(.22,1,.36,1) both; }
        @keyframes oy-hl { 0%{transform:scaleX(0)} 100%{transform:scaleX(1)} }

        .oy-wrap { position: relative; max-width: 1032px; margin: 0 auto; padding: 48px 44px 100px; }
        .oy-panel { animation: oy-panelin .62s cubic-bezier(.19,1,.22,1) both; }
        @keyframes oy-panelin { 0%{opacity:0; transform:translateY(16px)} 100%{opacity:1; transform:translateY(0)} }
        .oy-reveal { opacity: 0; transform: translateY(22px); transition: opacity .9s cubic-bezier(.19,1,.22,1), transform .9s cubic-bezier(.19,1,.22,1); }
        .oy-reveal.oy-in { opacity: 1; transform: translateY(0); }

        .oy-hero { padding: 70px 0 30px; }
        .oy-hero h1 { font-size: clamp(56px, 9vw, 108px); font-weight: 700; letter-spacing: -0.045em; line-height: 1; margin: 0 0 24px; }
        .oy-hero h1 .lift { display: inline-block; animation: oy-lift 1.5s cubic-bezier(.19,1,.22,1) both; }
        .oy-hero h1 .lift:nth-child(2) { animation-delay: .16s; }
        .oy-hero h1 .lift:nth-child(3) { animation-delay: .32s; }
        @keyframes oy-lift { 0%{transform:translateY(38px); opacity:0} 100%{transform:translateY(0); opacity:1} }
        .oy-hero .hero-sub { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 15px; color: #555; margin-bottom: 34px; animation: oy-fadein .9s .5s both; }
        @keyframes oy-fadein { 0%{opacity:0; transform:translateY(10px)} 100%{opacity:1; transform:translateY(0)} }
        .oy-hero .hero-sub .sep { color: #ccc; }
        .oy-scroll { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #999; animation: oy-bob 1.8s ease-in-out infinite; }
        @keyframes oy-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }

        /* 产品卡 */
        .oy-feat-list { display: flex; flex-direction: column; gap: 18px; }
        .oy-feat { position: relative; overflow: hidden; display: flex; align-items: center; gap: 24px; border: 1px solid #e8e8e8; border-radius: 20px; padding: 22px 26px; background: #fff; min-height: 150px; transition: transform .45s cubic-bezier(.19,1,.22,1), box-shadow .7s cubic-bezier(.19,1,.22,1), border-color .7s ease; text-align: left; }
        .oy-feat:hover { transform: translateY(-3px); box-shadow: 0 3px 6px rgba(0,0,0,.04), 0 26px 48px -18px rgba(0,0,0,.18); border-color: #d5d5d5; }
        .oy-feat .f-no { position: absolute; top: 20px; left: 26px; font-size: 42px; font-weight: 800; letter-spacing: -0.84px; line-height: 1; color: transparent; -webkit-text-stroke: 1px rgba(0,0,0,.14); transition: transform .5s cubic-bezier(.19,1,.22,1); font-family: "Helvetica Neue", Arial, sans-serif; }
        .oy-feat:hover .f-no { transform: translateY(-6px); }
        .oy-feat .f-icon { width: 46px; height: 46px; border-radius: 12px; border: 1px solid #eee; background: #fafafa; display: flex; align-items: center; justify-content: center; color: #1a1a1a; flex-shrink: 0; transition: all .25s ease; margin-top: 16px; }
        .oy-feat:hover .f-icon { background: #1a1a1a; color: #fff; animation: oy-nod .5s cubic-bezier(.34,1.56,.64,1); }
        @keyframes oy-nod { 0%{transform:scale(1)} 40%{transform:scale(1.1)} 100%{transform:scale(1)} }
        .oy-feat .f-main { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; }
        .oy-feat .f-name { font-size: 52px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; margin-top: 30px; }
        .oy-feat .f-desc { font-size: 15px; color: #555; line-height: 1.6; margin-top: 6px; }
        .oy-feat .f-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; color: #999; font-family: ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .44px; padding: 7px 12px; border-radius: 999px; border: 1px solid #e8e8e8; background: transparent; transition: all .2s ease; flex-shrink: 0; }
        .oy-feat:hover .f-tag { background: rgba(255,226,138,.5); border-color: rgba(255,226,138,.6); color: #1a1a1a; }
        .oy-feat .f-arrow { color: #999; transition: all .35s ease; flex-shrink: 0; }
        .oy-feat:hover .f-arrow { color: #1a1a1a; transform: translate(3px,-3px); }

        /* Skills 分组 */
        .oy-group { margin-bottom: 56px; }
        .oy-group-title { font-size: 14px; font-weight: 400; letter-spacing: 3.36px; text-transform: uppercase; text-align: left; display: flex; align-items: baseline; gap: 8px; margin: 0 0 22px; }
        .oy-group-title .cnt { font-size: 12px; color: #999; letter-spacing: 3.36px; }
        .oy-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 22px; }
        .oy-cell { position: relative; display: flex; flex-direction: column; border: 1px solid #e8e8e8; border-radius: 18px; padding: 24px 24px 26px; background: #fff; min-height: 168px; text-align: left; transition: transform .45s cubic-bezier(.19,1,.22,1), box-shadow .7s cubic-bezier(.19,1,.22,1), border-color .7s ease; }
        .oy-cell:hover { transform: translateY(-3px); box-shadow: 0 3px 6px rgba(0,0,0,.04), 0 26px 48px -18px rgba(0,0,0,.16); border-color: #d5d5d5; }
        .oy-cell .c-ic { width: 34px; height: 34px; border-radius: 9px; border: 1px solid #eee; background: #fafafa; display: flex; align-items: center; justify-content: center; color: #1a1a1a; margin-top: 14px; transition: all .25s ease; }
        .oy-cell:hover .c-ic { background: #1a1a1a; color: #fff; }
        .oy-cell .c-name { font-size: 34px; font-weight: 900; letter-spacing: -1.9px; line-height: 1; }
        .oy-cell .c-ext { display: inline-flex; align-items: center; gap: 6px; font-size: 15px; color: #555; margin-top: 14px; transition: all .2s ease; }
        .oy-cell:hover .c-ext { background: rgba(255,226,138,.55); color: #1a1a1a; transform: translate(2px,-2px); }

        /* 标签胶囊 */
        .oy-me-tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 24px 0 40px; }
        .oy-me-tags span { font-size: 11px; font-weight: 400; color: #555; padding: 7px 11px; border-radius: 999px; border: 1px solid #e8e8e8; background: rgba(255,255,255,.72); font-family: ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .44px; line-height: 1.5; transition: all .2s ease; }
        .oy-me-tags span:hover { background: rgba(255,226,138,.5); border-color: rgba(255,226,138,.6); color: #1a1a1a; }

        /* 关于我 */
        .oy-me p { font-size: 15px; color: #555; line-height: 1.8; max-width: 640px; margin: 0; }
        .oy-exp { display: grid; grid-template-columns: 96px 1fr; gap: 18px; align-items: center; border: 1px solid #e8e8e8; border-radius: 18px; padding: 22px 26px; margin-bottom: 14px; transition: transform .45s cubic-bezier(.19,1,.22,1), box-shadow .7s cubic-bezier(.19,1,.22,1), border-color .7s ease; }
        .oy-exp:hover { transform: translateY(-3px); box-shadow: 0 3px 6px rgba(0,0,0,.04), 0 26px 48px -18px rgba(0,0,0,.16); }
        .oy-exp .e-state { font-size: 12px; color: #555; font-family: ui-monospace, Menlo, monospace; }
        .oy-exp .e-main { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .oy-exp .e-ic { width: 36px; height: 36px; border-radius: 11px; border: 1px solid #eee; background: #fafafa; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .oy-exp .e-name { font-size: 22px; font-weight: 800; letter-spacing: -0.4px; }
        .oy-exp .e-desc { font-size: 13px; color: #777; margin-top: 3px; }

        /* 交流 */
        .oy-contact-list { display: flex; flex-direction: column; }
        .oy-contact { display: grid; grid-template-columns: 40px 36px 1fr 1fr 24px; gap: 16px; align-items: center; padding: 24px 4px; border-bottom: 1px solid #e8e8e8; transition: all .35s cubic-bezier(.19,1,.22,1); }
        .oy-contact:hover { padding-left: 22px; }
        .oy-contact .c-no { font-size: 12px; color: #999; letter-spacing: .96px; font-family: ui-monospace, Menlo, monospace; }
        .oy-contact .c-ico { width: 36px; height: 36px; border-radius: 11px; border: 1px solid #e8e8e8; display: flex; align-items: center; justify-content: center; transition: all .3s ease; }
        .oy-contact:hover .c-ico { background: rgba(255,226,138,.7); transform: rotate(-6deg) scale(1.07); border-color: transparent; }
        .oy-contact .c-label { font-size: 28px; font-weight: 800; letter-spacing: -0.56px; transition: all .3s ease; }
        .oy-contact:hover .c-label { color: #1a1a1a; }
        .oy-contact .c-sub { font-size: 13px; color: #999; letter-spacing: .96px; }
        .oy-contact .c-open { opacity: 0; transform: translateX(-8px); transition: all .35s cubic-bezier(.19,1,.22,1); color: #1a1a1a; }
        .oy-contact:hover .c-open { opacity: 1; transform: translateX(0); }

        .oy-foot { display: flex; justify-content: space-between; max-width: 1032px; margin: 0 auto; padding: 80px 44px 46px; border-top: none; font-size: 14px; color: #999; flex-wrap: wrap; gap: 14px; }
        .oy-foot b { color: #1a1a1a; }
      `}</style>

      <div className="oy-progress" style={{ width: progress + '%' }} />

      <div className="oy-top">
        <div className="oy-brand">VOYRA<sup>®</sup></div>
        <a className="oy-gh" href="https://github.com/liixnglinb" target="_blank" rel="noreferrer"><Github size={15} strokeWidth={1.8} />github.com/liixnglinb</a>
      </div>

      <nav className="oy-nav">
        {[['products', '产品'], ['skills', 'Skills'], ['articles', '文章'], ['me', '关于我'], ['contact', '交流']].map(([k, l]) => (
          <button key={k} className={'oy-tab ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>

      {tab === 'products' && (
        <div className="oy-wrap oy-panel">
          <div className="oy-hero">
            <h1><span className="lift">Voyra</span>{' '}<span className="lift">makes</span>{' '}<span className="lift">things.</span></h1>
            <div className="hero-sub">
              <span>帅帅你阿历</span><span className="sep">/</span><span>BUILDER</span><span className="sep">/</span><span>CREATOR</span><span className="sep">/</span><span>OPEN-SOURCE</span>
            </div>
            <div className="oy-scroll"><ChevronDown size={15} />往下滑</div>
          </div>

          <div className="oy-feat-list">
            {FEATURED.map((f, i) => {
              const I = f.Icon;
              return (
                <button key={f.to} className="oy-feat oy-reveal" data-reveal-delays={i * 70} onClick={() => go(f.to)}>
                  <span className="f-no">{f.no}</span>
                  <span className="f-main">
                    <span className="f-name">{f.name}</span>
                    <span className="f-desc">{f.en}</span>
                    <span className="f-icon"><I size={22} strokeWidth={1.7} /></span>
                  </span>
                  <span className="f-tag">AI {f.match}<ArrowUpRight size={11} strokeWidth={2.2} /></span>
                  <span className="f-arrow"><ArrowUpRight size={20} strokeWidth={1.8} /></span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 70 }}>
            <div className="oy-group-title oy-reveal">INTERACTION · 交互演示 <span className="cnt">03</span></div>
            <div className="oy-grid" key={replay}>
              {[
                { Icon: Zap, en: 'N°01 HOVER', t: '悬停 Hover', d: '鼠标放上去卡片上浮、图标反色，让人知道它能点。整个页面都是这样的反馈。' },
                { Icon: Waves, en: 'N°02 MOTION', t: '弹性 Motion', d: '页面切换与卡片入场带轻微回弹动画，先越过目标再回到原位，不僵硬。' },
                { Icon: Frame, en: 'N°03 BACKDROP', t: '毛玻璃 Blur', d: '顶部导航半透明，内容滚动经过时模糊淡出，保持页面干净通透。' },
              ].map((it, j) => (
                <div className="oy-cell oy-reveal" data-reveal-delays={j * 80} key={it.en}>
                  <span className="c-name">{it.t}</span>
                  <span className="c-ic"><it.Icon size={18} strokeWidth={1.7} /></span>
                  <span className="c-ext" style={{ fontSize: 12, marginTop: 10 }}>{it.en}</span>
                  <span className="c-desc oy-desc" style={{ fontSize: 13, color: '#777', lineHeight: 1.6, marginTop: 8 }}>{it.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'skills' && (
        <div className="oy-wrap oy-panel">
          <div className="oy-group-title oy-reveal">MY SKILL · 我的 Skill <span className="cnt">01</span></div>
          <div className="oy-grid oy-reveal">
            {MY_SKILLS.map((s) => {
              const I = s.Icon;
              return (
                <a className="oy-cell" key={s.href} href={s.href} target="_blank" rel="noreferrer">
                  <span className="c-name">{s.label}</span>
                  <span className="c-ic"><I size={18} strokeWidth={1.7} /></span>
                  <span className="c-ext">GitHub <ArrowUpRight size={14} strokeWidth={2} /></span>
                  <span className="c-desc" style={{ fontSize: 13, color: '#777', lineHeight: 1.6, marginTop: 8 }}>{s.en}</span>
                </a>
              );
            })}
          </div>

          {TOOL_GROUPS.map((g) => (
            <div className="oy-group oy-reveal" key={g.title}>
              <div className="oy-group-title">{g.title} <span className="cnt">{g.count}</span></div>
              <div className="oy-grid">
                {g.items.map((t) => {
                  const I = t.Icon;
                  return (
                    <button key={t.to} className="oy-cell" onClick={() => go(t.to)}>
                      <span className="c-ic"><I size={18} strokeWidth={1.7} /></span>
                      <span className="c-name">{t.label}</span>
                      <span className="c-ext">打开 <ArrowUpRight size={14} strokeWidth={2} /></span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'articles' && (
        <div className="oy-wrap oy-panel">
          <div className="oy-me">
            <p className="oy-reveal">把高频工具与 AI 能力聚合到一处：笔记、日程、资料与 AI 工具，一个域名全部搞定。</p>
          </div>
          <div className="oy-grid" style={{ marginTop: 40 }}>
            {[
              { Icon: Waves, t: 'Voyra 是什么', d: 'React + Vite 前端，Bmob 云端数据，Cloudflare Pages 全球加速部署，零服务器成本。' },
              { Icon: Frame, t: '用什么构建', d: 'React + Vite 前端，Bmob 云端数据，Cloudflare Pages 全球加速部署，零服务器成本。' },
              { Icon: Zap, t: '怎么使用', d: '无需注册登录，打开即用。数据存于云端多端同步，随时记录、随时随地继续。' },
            ].map((it, j) => (
              <div className="oy-cell oy-reveal" data-reveal-delays={j * 80} key={it.t}>
                <span className="c-ic"><it.Icon size={18} strokeWidth={1.7} /></span>
                <span className="c-name" style={{ fontSize: 24 }}>{it.t}</span>
                <span className="c-desc" style={{ fontSize: 13, color: '#777', lineHeight: 1.6, marginTop: 8 }}>{it.d}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'me' && (
        <div className="oy-wrap oy-panel">
          <div className="oy-me oy-reveal">
            <p>独立开发者的个人工具站 Voyra 的作者。喜欢把高频需求做成小而美的网页应用，从笔记、日程到 AI 工具，都在这里一点点被点亮。</p>
          </div>
          <div className="oy-me-tags oy-reveal">
            {ME_TAGS.map((t) => <span key={t}>{t}</span>)}
          </div>
          <div className="oy-group-title oy-reveal" style={{ marginTop: 40 }}>EXPERIENCE · 经历</div>
          {EXPERIENCES.map((e, i) => {
            const I = e.Icon;
            return (
              <div className="oy-exp oy-reveal" data-reveal-delays={i * 80} key={e.name}>
                <span className="e-state">{e.state}</span>
                <div className="e-main">
                  <span className="e-ic"><I size={18} strokeWidth={1.7} /></span>
                  <div>
                    <div className="e-name">{e.name}</div>
                    <div className="e-desc">{e.desc}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'contact' && (
        <div className="oy-wrap oy-panel">
          <div className="oy-contact-list">
            {CONTACTS.map((c, i) => {
              const I = c.Icon;
              return (
                <a className="oy-contact oy-reveal" data-reveal-delays={i * 70} key={c.no} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                  <span className="c-no">{c.no}</span>
                  <span className="c-ico"><I size={17} strokeWidth={1.8} /></span>
                  <span className="c-label">{c.label}</span>
                  <span className="c-sub">{c.val}</span>
                  <span className="c-open"><ArrowUpRight size={20} strokeWidth={1.8} /></span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      <div className="oy-foot">
        <span>© 2026 <b>Voyra®</b></span>
        <span>React · Bmob · Cloudflare</span>
      </div>
    </div>
  );
}