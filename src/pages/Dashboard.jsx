import React, { useState, useEffect } from 'react';
import {
  NotebookPen, Link, Lightbulb, BookOpen, Baby, Share2, Globe,
  Wrench, CalendarDays, CalendarClock, Bot, Newspaper,
  Github, ArrowUpRight, ChevronDown, Zap, Waves, Frame, Sparkles,
} from 'lucide-react';

/* ============================================================
   Voyra 首页 · 复刻 oiloil.org 风格
   - 黑白灰极简 / 大号负字距标题 / N°编号 / hover 上浮
   - tab 分区：产品 / Skills / 文章 / 关于我 / 交流
   - 所有内容已替换为 Voyra 站内功能
   ============================================================ */

/* ---------- 数据 ---------- */
const FEATURED = [
  { to: '/smart-notes', no: '01', name: 'Spell', en: 'NOTES', desc: '随手记录灵感，沉淀结构化知识', tag: '效率工具', Icon: NotebookPen },
  { to: '/prompts',      no: '03', name: 'Prompt', en: 'LIB', desc: '管理 AI 提示词模板，随用随取', tag: '创作工具', Icon: Lightbulb },
  { to: '/agents',       no: '04', name: 'Hub', en: 'AGENTS', desc: '主流 Agent 聚合与高分 Skill 资源', tag: 'AI 前沿', Icon: Bot },
  { to: '/planner',      no: '05', name: 'Plan', en: 'DAY', desc: '日历假期与自定义日程，精准到点', tag: '效率工具', Icon: CalendarClock },
  { to: '/web-links',    no: '06', name: 'Links', en: 'URLS', desc: '收藏与管理常用网页，分类快速访问', tag: '效率工具', Icon: Link },
];

const TOOL_GROUPS = [
  {
    title: '效率与创作', items: [
      { to: '/smart-notes', label: '智能笔记', desc: '随手记录灵感', Icon: NotebookPen },
      { to: '/web-links', label: '网页链接', desc: '收藏常用网页', Icon: Link },
      { to: '/prompts', label: '提示词库', desc: 'AI 模板管理', Icon: Lightbulb },
      { to: '/learning', label: '学习资料', desc: '笔记与资料', Icon: BookOpen },
      { to: '/mindmap', label: '思维导图', desc: '独立工作台', Icon: Share2 },
      { to: '/blog', label: '个人博客', desc: '阅读与思考', Icon: Globe },
      { to: '/tools', label: '工具网站', desc: '效率导航', Icon: Wrench },
      { to: '/schedule', label: '个人课表', desc: '按周同步', Icon: CalendarDays },
      { to: '/planner', label: '个人日程', desc: '日程一目了然', Icon: CalendarClock },
    ],
  },
  {
    title: '生活与 AI', items: [
      { to: '/baby-care', label: '宝宝护理', desc: '成长记录与护理', Icon: Baby },
      { to: '/agents', label: 'AI Agent & Skill', desc: '主流 Agent 聚合', Icon: Bot },
      { to: '/news', label: 'AI 每日情报站', desc: '五大类资讯速览', Icon: Newspaper },
    ],
  },
];

const INSIGHTS = [
  { Icon: Waves, title: 'Voyra 是什么', en: 'ABOUT', body: '把高频工具与 AI 能力聚合到一处：笔记、日程、资料与 AI 工具，一个域名全部搞定。' },
  { Icon: Frame, title: '用什么构建', en: 'STACK', body: 'React + Vite 前端，Bmob 云端数据，Cloudflare Pages 全球加速部署，零服务器成本。' },
  { Icon: Zap, title: '怎么使用', en: 'GUIDE', body: '无需注册登录，打开即用。数据存于云端多端同步，随时记录、随时随地继续。' },
];

const ME_TAGS = ['Voyra', 'Frontend', 'AI', 'Creator', 'Cloudflare', 'Bmob'];

const EXPERIENCES = [
  { state: '现在', name: 'Voyra 个人站', desc: '云端一站式创作与效率平台，聚合 15 个高频效率与 AI 工具。', Icon: NotebookPen },
  { state: '基建', name: 'Cloudflare Pages', desc: 'GitHub 到 Cloudflare 自动构建部署，自定义域名 lxlrwxs.top。', Icon: Share2 },
  { state: '数据', name: 'Bmob 云后端', desc: '用户数据云端存储，免服务器，开箱即用。', Icon: Globe },
];

const CONTACTS = [
  { no: '01', label: 'GitHub', sub: '开源与代码仓库', href: 'https://github.com/liixnglinb', Icon: Github },
  { no: '02', label: 'Email', sub: 'hello@lxlrwxs.top', href: 'mailto:hello@lxlrwxs.top', Icon: Sparkles },
  { no: '03', label: '网站', sub: 'https://lxlrwxs.top', href: 'https://lxlrwxs.top', Icon: Globe },
];

/* ---------- 组件 ---------- */
export default function Dashboard() {
  const [tab, setTab] = useState('products'); // products | skills | articles | me | contact
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setReplay((r) => r + 1), 4000);
    return () => clearTimeout(t);
  }, []);

  const go = (to) => window.open(to, '_blank', 'noopener,noreferrer');

  return (
    <div className="oy">
      <style>{`
        .oy {
          min-height: 100vh;
          background: #fff;
          color: #1a1a1a;
          font-family: "Helvetica Neue", -apple-system, "PingFang SC", "Noto Sans SC", sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .oy * { box-sizing: border-box; }
        .oy a { color: inherit; text-decoration: none; }
        .oy button { font-family: inherit; cursor: pointer; }

        /* ---- 顶部 bar ---- */
        .oy-top {
          display: flex; align-items: center; justify-content: space-between;
          padding: 22px 36px 0; gap: 24px; flex-wrap: wrap;
        }
        .oy-brand { font-size: 20px; font-weight: 800; letter-spacing: -0.04em; }
        .oy-brand sup { font-size: 11px; font-weight: 700; vertical-align: super; }
        .oy-gh {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13px; color: #555; font-weight: 500;
          border: 1px solid #e5e5e5; border-radius: 999px; padding: 7px 14px;
          transition: all .2s ease;
        }
        .oy-gh:hover { background: #fafafa; color: #1a1a1a; transform: translateY(-1px); }

        /* ---- tab 导航 ---- */
        .oy-nav {
          display: flex; gap: 22px;
          padding: 18px 36px 0;
          position: sticky; top: 0; z-index: 5;
          background: rgba(255,255,255,.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid #f0f0f0;
        }
        .oy-tab {
          appearance: none; border: none; background: none;
          font-size: 14px; color: #b8b8b8; font-weight: 500;
          padding: 14px 2px; position: relative; transition: color .2s ease;
        }
        .oy-tab:hover { color: #1a1a1a; }
        .oy-tab.on { color: #1a1a1a; }
        .oy-tab.on::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: -1px;
          height: 2px; background: #1a1a1a;
        }

        /* ---- 通用容器 ---- */
        .oy-wrap { max-width: 1120px; margin: 0 auto; padding: 40px 36px 80px; }
        .oy-section-title { font-size: 30px; font-weight: 700; letter-spacing: -0.03em; margin: 0 0 6px; }
        .oy-section-en { font-size: 12px; color: #999; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 28px; }

        /* ---- HERO ---- */
        .oy-hero { padding: 64px 0 40px; }
        .oy-hero h1 {
          font-size: clamp(44px, 8vw, 74px);
          font-weight: 700; letter-spacing: -0.045em; line-height: 1.02;
          margin: 0 0 18px;
        }
        .oy-hero h1 .lift {
          display: inline-block;
          animation: oy-lift 1.1s cubic-bezier(.22,1,.36,1) both;
        }
        .oy-hero h1 .lift:nth-child(2) { animation-delay: .12s; }
        .oy-hero h1 .lift:nth-child(3) { animation-delay: .24s; }
        @keyframes oy-lift {
          0% { transform: translateY(34px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .oy-hero .hero-sub {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          font-size: 14px; color: #555; margin-bottom: 42px;
        }
        .oy-hero .hero-sub .sep { color: #ccc; }
        .oy-scroll { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #999; animation: oy-bob 1.8s ease-in-out infinite; }
        @keyframes oy-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }

        /* ---- 产品卡片（横排） ---- */
        .oy-feat-list { display: flex; flex-direction: column; gap: 14px; }
        .oy-feat {
          display: flex; align-items: center; gap: 20px;
          border: 1px solid #ededed; border-radius: 16px;
          padding: 20px 24px; background: #fff; width: 100%; text-align: left;
          transition: all .25s ease;
        }
        .oy-feat:hover { transform: translateY(-3px); box-shadow: 0 18px 40px -20px rgba(0,0,0,.16); border-color: rgba(26,26,26,.2); }
        .oy-feat .f-no {
          font-size: 13px; font-weight: 600; color: #aaa;
          min-width: 34px; letter-spacing: .04em;
        }
        .oy-feat .f-icon {
          width: 52px; height: 52px; border-radius: 14px;
          border: 1px solid #eee; background: #fafafa;
          display: flex; align-items: center; justify-content: center;
          color: #1a1a1a; flex-shrink: 0;
          transition: all .25s ease;
        }
        .oy-feat:hover .f-icon { background: #1a1a1a; color: #fff; }
        .oy-feat .f-main { flex: 1; min-width: 0; }
        .oy-feat .f-name { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; display: flex; align-items: baseline; gap: 10px; }
        .oy-feat .f-name .en { font-size: 11px; color: #bbb; font-weight: 600; letter-spacing: .18em; }
        .oy-feat .f-desc { font-size: 13px; color: #777; margin-top: 4px; }
        .oy-feat .f-tag { font-size: 12px; border: 1px solid #eee; color: #888; border-radius: 999px; padding: 4px 12px; flex-shrink: 0; }
        .oy-feat .f-arrow { color: #bbb; transition: all .25s ease; flex-shrink: 0; }
        .oy-feat:hover .f-arrow { color: #1a1a1a; transform: translate(2px,-2px); }

        /* ---- Skills 分类网格 ---- */
        .oy-group { margin-bottom: 34px; }
        .oy-group-title {
          font-size: 16px; font-weight: 700; letter-spacing: -0.01em;
          display: flex; align-items: center; gap: 10px; margin: 0 0 14px;
        }
        .oy-group-title .cnt { font-size: 12px; color: #bbb; font-weight: 600; }
        .oy-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
        .oy-cell {
          border: 1px solid #ededed; border-radius: 14px; padding: 18px;
          background: #fff; text-align: left; transition: all .22s ease;
          display: flex; flex-direction: column; gap: 10px;
        }
        .oy-cell:hover { transform: translateY(-2px); box-shadow: 0 14px 30px -18px rgba(0,0,0,.14); border-color: rgba(26,26,26,.2); }
        .oy-cell .c-ic {
          width: 38px; height: 38px; border-radius: 10px; border: 1px solid #eee; background: #fafafa;
          display: flex; align-items: center; justify-content: center; color: #1a1a1a; transition: all .22s ease;
        }
        .oy-cell:hover .c-ic { background: #1a1a1a; color: #fff; }
        .oy-cell .c-name { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
        .oy-cell .c-desc { font-size: 12px; color: #888; line-height: 1.5; }

        /* ---- 文章/说明卡片 ---- */
        .oy-insight-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
        .oy-insight {
          border: 1px solid #ededed; border-radius: 16px; padding: 26px 24px;
          background: #fff; transition: all .22s ease;
        }
        .oy-insight:hover { transform: translateY(-3px); box-shadow: 0 18px 40px -22px rgba(0,0,0,.16); }
        .oy-insight .i-ic { color: #1a1a1a; margin-bottom: 16px; }
        .oy-insight .i-en { font-size: 11px; color: #bbb; letter-spacing: .18em; font-weight: 600; }
        .oy-insight h3 { font-size: 19px; font-weight: 700; letter-spacing: -0.02em; margin: 6px 0 10px; }
        .oy-insight p { font-size: 13.5px; color: #666; line-height: 1.7; margin: 0; }

        /* ---- 关于我 ---- */
        .oy-me-tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 34px; }
        .oy-me-tags span {
          font-size: 13px; color: #555; border: 1px solid #e5e5e5;
          border-radius: 999px; padding: 7px 15px; font-weight: 500;
        }
        .oy-exp { border: 1px solid #ededed; border-radius: 16px; padding: 22px 26px; display: flex; gap: 18px; align-items: center; transition: all .22s ease; margin-bottom: 12px; }
        .oy-exp:hover { transform: translateY(-2px); box-shadow: 0 16px 34px -20px rgba(0,0,0,.14); }
        .oy-exp .e-state { font-size: 12px; color: #fff; background: #1a1a1a; border-radius: 999px; padding: 5px 13px; font-weight: 600; flex-shrink: 0; }
        .oy-exp .e-name { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; }
        .oy-exp .e-desc { font-size: 13px; color: #777; margin-top: 4px; }

        /* ---- 联系 ---- */
        .oy-contact-list { display: flex; flex-direction: column; gap: 10px; }
        .oy-contact {
          display: flex; align-items: center; gap: 16px;
          border: 1px solid #ededed; border-radius: 14px; padding: 18px 22px;
          background: #fff; transition: all .22s ease; text-align: left;
        }
        .oy-contact:hover { transform: translateX(4px); border-color: rgba(26,26,26,.2); background: #fafafa; }
        .oy-contact .c-no { font-size: 13px; color: #aaa; font-weight: 600; min-width: 26px; }
        .oy-contact .c-label { font-size: 16px; font-weight: 700; flex: 1; }
        .oy-contact .c-sub { font-size: 13px; color: #888; }
        .oy-contact .c-open { color: #bbb; }

        /* ---- footer ---- */
        .oy-foot {
          max-width: 1120px; margin: 0 auto; padding: 40px 36px 30px;
          border-top: 1px solid #f0f0f0;
          display: flex; justify-content: space-between; align-items: center;
          font-size: 12.5px; color: #999; flex-wrap: wrap; gap: 12px;
        }
        .oy-foot b { color: #1a1a1a; font-weight: 700; }
      `}</style>

      {/* 顶部 */}
      <div className="oy-top">
        <div className="oy-brand">VOYRA<sup>®</sup></div>
        <a className="oy-gh" href="https://github.com/liixnglinb" target="_blank" rel="noreferrer">
          <Github size={15} strokeWidth={1.8} />github.com/liixnglinb
        </a>
      </div>

      {/* tab 导航 */}
      <nav className="oy-nav">
        {[['products', '产品'], ['articles', '文章'], ['me', '关于我'], ['contact', '交流']].map(([k, l]) => (
          <button key={k} className={'oy-tab ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>

      {/* ============ 产品 ============ */}
      {tab === 'products' && (
        <div className="oy-wrap">
          <div className="oy-hero">
            <h1>
              <span className="lift">Voyra</span>{' '}
              <span className="lift">makes</span>{' '}
              <span className="lift">things.</span>
            </h1>
            <div className="hero-sub">
              <span>欧 呦</span><span className="sep">/</span>
              <span>BUILDER</span><span className="sep">/</span>
              <span>CREATOR</span><span className="sep">/</span>
              <span>OPEN-SOURCE</span>
            </div>
            <div className="oy-scroll"><ChevronDown size={15} />往下滑</div>
          </div>

          <div className="oy-section-title">产品</div>
          <div className="oy-section-en">PRODUCTS</div>
          <div className="oy-feat-list">
            {FEATURED.map((f) => {
              const I = f.Icon;
              return (
                <button key={f.to} className="oy-feat" onClick={() => go(f.to)}>
                  <span className="f-no">{f.no}</span>
                  <span className="f-icon"><I size={24} strokeWidth={1.7} /></span>
                  <span className="f-main">
                    <span className="f-name">{f.name} <span className="en">{f.en}</span></span>
                    <span className="f-desc">{f.desc}</span>
                  </span>
                  <span className="f-tag">{f.tag}</span>
                  <span className="f-arrow"><ArrowUpRight size={19} strokeWidth={1.8} /></span>
                </button>
              );
            })}
          </div>

          {/* 全部工具 */}
          <div style={{ marginTop: 46 }}>
            <div className="oy-section-title">全部工具</div>
            <div className="oy-section-en">ALL TOOLS</div>
            {TOOL_GROUPS.map((g) => (
              <div className="oy-group" key={g.title}>
                <div className="oy-group-title">{g.title} <span className="cnt">{g.items.length}</span></div>
                <div className="oy-grid">
                  {g.items.map((t) => {
                    const I = t.Icon;
                    return (
                      <button key={t.to} className="oy-cell" onClick={() => go(t.to)}>
                        <span className="c-ic"><I size={18} strokeWidth={1.7} /></span>
                        <span className="c-name">{t.label}</span>
                        <span className="c-desc">{t.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 编号动效演示卡（复刻原站 N° 交互教学） */}
          <div style={{ marginTop: 46 }}>
            <div className="oy-section-title">交互演示</div>
            <div className="oy-section-en">INTERACTION</div>
            <div className="oy-insight-list" key={replay}>
              <div className="oy-insight">
                <span className="i-ic"><Zap size={26} strokeWidth={1.6} /></span>
                <div className="i-en">N°01 HOVER</div>
                <h3>悬停 Hover</h3>
                <p>鼠标放上去卡片上浮、图标反色，让人知道它能点。整个页面都是这样的反馈。</p>
              </div>
              <div className="oy-insight">
                <span className="i-ic"><Waves size={26} strokeWidth={1.6} /></span>
                <div className="i-en">N°02 MOTION</div>
                <h3>弹性 Motion</h3>
                <p>页面切换与卡片入场带轻微回弹动画，先越过目标再回到原位，不僵硬。</p>
              </div>
              <div className="oy-insight">
                <span className="i-ic"><Frame size={26} strokeWidth={1.6} /></span>
                <div className="i-en">N°03 BACKDROP</div>
                <h3>毛玻璃 Blur</h3>
                <p>顶部导航半透明，内容滚动经过时模糊淡出，保持页面干净通透。</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ 文章 ============ */}
      {tab === 'articles' && (
        <div className="oy-wrap">
          <div className="oy-section-title">站点</div>
          <div className="oy-section-en">ABOUT / GUIDE</div>
          <div className="oy-insight-list">
            {INSIGHTS.map((it) => {
              const I = it.Icon;
              return (
                <div className="oy-insight" key={it.title}>
                  <span className="i-ic"><I size={26} strokeWidth={1.6} /></span>
                  <div className="i-en">{it.en}</div>
                  <h3>{it.title}</h3>
                  <p>{it.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ 关于我 ============ */}
      {tab === 'me' && (
        <div className="oy-wrap">
          <div className="oy-section-title">关于我</div>
          <div className="oy-section-en">ABOUT ME</div>
          <p style={{ fontSize: 15, color: '#444', lineHeight: 1.8, margin: '0 0 22px', maxWidth: 640 }}>
            独立开发者的个人工具站 Voyra 的作者。喜欢把高频需求做成小而美的网页应用，
            从笔记、日程到 AI 工具，都在这里一点点被点亮。
          </p>
          <div className="oy-me-tags">
            {ME_TAGS.map((t) => <span key={t}>{t}</span>)}
          </div>
          <div className="oy-section-title" style={{ fontSize: 21 }}>经历 / EXPERIENCE</div>
          <div className="oy-section-en" style={{ marginBottom: 16 }}>从工具到平台</div>
          {EXPERIENCES.map((e) => {
            const I = e.Icon;
            return (
              <div className="oy-exp" key={e.name}>
                <span className="e-state">{e.state}</span>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <I size={20} strokeWidth={1.7} style={{ color: '#1a1a1a', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="e-name">{e.name}</div>
                    <div className="e-desc">{e.desc}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============ 交流 ============ */}
      {tab === 'contact' && (
        <div className="oy-wrap">
          <div className="oy-section-title">联系 / Elsewhere</div>
          <div className="oy-section-en">CONTACT</div>
          <div className="oy-contact-list">
            {CONTACTS.map((c) => {
              const I = c.Icon;
              return (
                <a className="oy-contact" key={c.no} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                  <span className="c-no">{c.no}</span>
                  <I size={18} strokeWidth={1.7} style={{ color: '#1a1a1a' }} />
                  <span className="c-label">{c.label}</span>
                  <span className="c-sub">{c.sub}</span>
                  <span className="c-open"><ArrowUpRight size={17} strokeWidth={1.7} /></span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* footer */}
      <div className="oy-foot">
        <span>© 2026 <b>Voyra®</b></span>
        <span>React · Bmob · Cloudflare</span>
      </div>
    </div>
  );
}