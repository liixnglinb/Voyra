import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Sparkles, BookOpen, Ghost, X, Play, RotateCcw, ChevronRight, Send, Swords, Eye } from 'lucide-react';

/**
 * ZhanShen — 《我在精神病院学斩神》章节式沉浸阅读页
 * 真实动画/漫画立绘与剧照（public/zhan-shen/*），非 AI 生成图
 * 能力：章节化剧情 / 首页动态背景 / 右上角章节指示 / 打字机 / 分支选项 / 立绘切换 / 弹窗
 * 风格：清亮酷炫 · 浅底色 + 淡蓝淡紫微光粒子 · 发光边框 · 柔和渐变 · 不用深色黑底
 */

const BASE = import.meta.env.BASE_URL + 'zhan-shen/';

/* ============ 章节（覆盖核心剧情线，逐章推进） ============ */
const CHAPTERS = [
  {
    id: 'c0', tag: '序章', title: '迷雾笼罩的大夏',
    bg: BASE + 'bg-season1.webp',
    text: [
      '这是一个神明漫天、迷雾封锁的世界。',
      '在人类可见的现代都市之外，古老的众神、旧日支配者与不可名状的怪物悄然苏醒。大夏国运倾覆的阴影下，一个隐藏的组织——守夜人，以凡人之躯撑起人间的灯火。',
      '而这一切的起点，藏在一座不起眼的建筑里：诸神精神病院。',
    ],
    cliff: '年轻失明的院长林七夜，正缓缓睁开他那双被封印的眼睛……',
    choice: '若你进入这个迷雾世界，你会选择？',
    options: ['成为一名守夜人', '隐藏于世俗平凡之中'],
  },
  {
    id: 'c1', tag: '第一章', title: '失明的院长',
    bg: BASE + 'bg2.webp',
    text: [
      '林七夜，一个自小双目失明的少年，却拥有着不为人知的秘密——他是诸神精神病院的院长。',
      '病院里囚禁着古老的神明：深夜低语的黑夜女神倪克斯、推演因果的传奇法师梅林、慈悲又疯狂的斗战胜佛孙悟空、桀骜不驯的英雄王吉尔伽美什……',
      '每一个神，都被"治愈"与"遏制"之间的天平撕扯。而少年的眼虽盲，心却早已看穿诸神的本质。',
    ],
    cliff: '当第一个神挣脱束缚，朝医院外的人间咆哮而去，林七夜第一次握紧了剑……',
    choice: '面对苏醒的神明，你会？',
    options: ['以剑相向，护住人间', '以理相劝，平息神怒'],
  },
  {
    id: 'c2', tag: '第二章', title: '守夜人誓约',
    bg: BASE + 'bg3.webp',
    text: [
      '为了守护这座精神病院与背后的人间，林七夜加入了守夜人序列，被编入136小队，后与一群怪才组成了传说中的"夜幕小队"。',
      '安卿鱼，手持真理之门碎片，空间穿梭、灵魂解析无往不利；周平，人间剑圣，一生只凝三剑；还有那披着袈裟、斗战法则冠绝诸天的孙悟空。',
      '他们以凡人之躯立下誓约：神明之下，守土有责；迷雾之前，绝不后退。',
    ],
    cliff: '而沧南市的夜幕之下，一场由古神教会酝酿的浩劫，正悄然逼近……',
    choice: '夜幕小队开赴沧南，你选择？',
    options: ['正面迎战邪神', '潜入敌营刺探'],
  },
  {
    id: 'c3', tag: '第三章', title: '米迦勒的神威',
    bg: BASE + 'bg4.webp',
    text: [
      '真正的神明从来不会温柔。四大天使长之首——米迦勒，掌管光明与审判。当他将神力降予林七夜，凡尘的力量便第一次涌入这具失明的躯体。',
      '克制不住的剑光撕裂夜空，林七夜以凡人之躯，第一次品尝到"神"的滋味，也第一次意识到：欲斩神明，必先承受神明的重量。',
      '黑暗相随，倪克斯的黑夜梦境在暗处低语，为这场无尽的征伐铺就前路。',
    ],
    cliff: '神威落下的那一刻，林七夜的左眼，似乎捕捉到了一丝耀眼的金色……',
    choice: '神力入体，你会如何驾驭？',
    options: ['炼化本源，为我所用', '封存神力，谨守初心'],
  },
  {
    id: 'c4', tag: '第四章', title: '红尘剑仙·周平',
    bg: BASE + 'yemu.webp',
    text: [
      '人类中有人以凡人之躯成神，并真正斩下过神——他就是红尘剑仙周平。',
      '受肉身所限，周平一生只出三剑。第一剑，斩主神赛特；第二剑、第三剑，斩旧日支配者黑山羊。每一剑，都承载完整的剑之法则。',
      '他既是林七夜的剑道恩师，也是人类反抗神明的不灭图腾。他教会七夜的不仅是剑招，更是"即便凡躯，亦可斩神"的信念。',
    ],
    cliff: '当旧日支配者黑山羊遮天蔽日地降临，周平缓缓抬起了他的第二剑……',
    choice: '面对不可名状的存在，你选择？',
    options: ['信我剑锋，斩落黑暗', '以身为饵，以身试险'],
  },
  {
    id: 'c5', tag: '终章', title: '独断万古 · 重塑轮回',
    bg: BASE + 'nikex.webp',
    text: [
      '从精神病院的失明少年，到夜幕小队的领袖，再到第五宇宙意志的化身——林七夜融合凡尘、黑夜、斗战多重本源，逆转生死，改写了现实。',
      '体内囚禁诸神，心间却始终护着万家灯火。当混沌浩劫降临，他终结了一切，重塑了宇宙的轮回。',
      '神明漫天又如何？火焰燃尽本源，他依旧立于万万人前，横刀向渊，染血红海。',
    ],
    cliff: '故事结束了吗？不——新的神明，正从轮回的另一端，睁开双眼……',
    choice: '若你有机会继承这份力量，你会？',
    options: ['斩神而行，守护人间', '退隐山林，归于平凡'],
  },
];

/* ============ 角色立绘（真实动漫图） ============ */
const ROLES = [
  {
    id: 'linqiye', name: '林七夜', title: '诸神精神病院院长 · 夜幕小队领袖',
    epithet: '逆天改命的失明少年', img: BASE + 'linqiye.jpg', accent: '#7C8CFF',
    quote: '我若成魔，佛奈我何；我若成佛，天下无魔。',
    text: '全书主角，第五宇宙意志的化身。以失明之身承载米迦勒神威，融合凡尘、黑夜、斗战多重本源，逆转生死、改写现实，最终终结混沌浩劫，重塑宇宙轮回。',
    tags: ['凡尘神域', '因果权柄', '夜幕领袖'],
  },
  {
    id: 'sunwukong', name: '斗战胜佛', title: '诸神精神病院 · 至高神境',
    epithet: '金刚不坏，斗战法则', img: BASE + 'sunwukong.jpg', accent: '#F5A623',
    quote: '遇强则强，战到天荒地老，我自岿然不动。',
    text: '披袈裟的古猿，毛发深棕，鲜红袈裟纵横金色纹路。继承七十二变、筋斗云与金刚不坏之身，掌控斗战法则，是人类阵营对抗神明的重要力量。',
    tags: ['七十二变', '斗战神墟', '高等神格'],
  },
  {
    id: 'zhouping', name: '红尘剑仙·周平', title: '大夏剑圣 · 人类精神图腾',
    epithet: '一剑破万法', img: BASE + 'zhouping.jpg', accent: '#4FC3A7',
    quote: '一生仅出三剑，每一剑皆是完整的剑之法则。',
    text: '林七夜的剑道恩师，人类第一位以凡人之躯成神并斩神的存在。奉命一剑斩主神赛特，两剑诛灭旧日支配者黑山羊，为人类反抗神明树立永恒榜样。',
    tags: ['剑之法则', '斩神第一人', '战力巅峰'],
  },
  {
    id: 'michael', name: '米迦勒', title: '四大天使长之首 · 至天神',
    epithet: '光明与审判之主', img: BASE + 'michael.jpg', accent: '#5B8DEF',
    quote: '以光之名，审判黑暗；以我之剑，守护人间。',
    text: '凡尘神域第一位出场的神明，西方圣教四大守护天使之首。将神力与神性共鸣赋予林七夜，多次在人类危难之际降临，掌控光明与审判法则。',
    tags: ['光明审判', '神威浩瀚', '人类守护者'],
  },
  {
    id: 'anqingyu', name: '安卿鱼', title: '真理之门掌控者',
    epithet: '智武双绝的军师', img: BASE + 'anqingyu.jpg', accent: '#9A6BFF',
    quote: '玩战术的心都脏——可我只想赢下这场战争。',
    text: '林七夜的铁杆伙伴与军师，手握真理之门碎片，精通空间穿梭与灵魂解析，能以弱胜强，甚至独闯克苏鲁神国全身而退。',
    tags: ['空间穿梭', '灵魂解析', '智斗之王'],
  },
];

/* ============ 浮动粒子 ============ */
const FLOAT_PARTICLES = Array.from({ length: 34 }, (_, i) => ({
  id: i, left: (i * 37) % 100, size: 4 + ((i * 7) % 9),
  delay: (i * 0.8) % 7, dur: 9 + ((i * 13) % 9),
  shade: i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'violet' : 'cyan',
}));

/* ---------- 粒子 canvas ---------- */
function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; const ctx = c.getContext('2d');
    let raf; let w; let h; let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dots = []; const N = 70;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(); window.addEventListener('resize', resize);
    for (let i = 0; i < N; i++) dots.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2 + 0.6, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, hue: Math.random() > 0.5 ? 225 : 265, a: Math.random() * 0.4 + 0.15 });
    const step = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < -5) d.x = w + 5; if (d.x > w + 5) d.x = -5;
        if (d.y < -5) d.y = h + 5; if (d.y > h + 5) d.y = -5;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${d.hue}, 85%, 72%, ${d.a})`; ctx.fill();
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i]; const b = dots[j];
          const dx = a.x - b.x; const dy = a.y - b.y; const dist = Math.hypot(dx, dy);
          if (dist < 110) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 85%, 78%, ${(1 - dist / 110) * 0.22})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="zs-canvas" />;
}

/* ---------- 打字机 ---------- */
function Typewriter({ text, speed = 45, start = 0, onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let i = start; setN(start); let iv = null;
    const t = setTimeout(() => {
      iv = setInterval(() => { i += 1; setN(i); if (i >= text.length) { clearInterval(iv); onDone && onDone(); } }, speed);
    }, start * speed);
    return () => { clearTimeout(t); iv && clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, start]);
  return (<span className="zs-type">{text.slice(0, n)}<span className="zs-type-caret" /></span>);
}

export default function ZhanShen() {
  const [heroDone, setHeroDone] = useState(false);
  const [chIndex, setChIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [branchPick, setBranchPick] = useState(null);
  const [branchMsg, setBranchMsg] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeRole, setActiveRole] = useState(ROLES[0]);
  const [charIndex, setCharIndex] = useState(0);

  const ch = CHAPTERS[chIndex];
  const total = CHAPTERS.length;

  useEffect(() => {
    setShowChoices(false); setBranchPick(null); setBranchMsg(null);
    const t = setTimeout(() => setShowChoices(true), 600);
    return () => clearTimeout(t);
  }, [chIndex]);

  const choose = (o, idx) => { setBranchPick(idx); setBranchMsg(null); setTimeout(() => setBranchMsg(`${o}——你的选择，已刻进这场斩神的因果。`), 150); };
  const nextCh = () => { if (chIndex < total - 1) setChIndex(chIndex + 1); };
  const prevCh = () => { if (chIndex > 0) setChIndex(chIndex - 1); };
  const switchRole = (i) => { setCharIndex(i); setActiveRole(ROLES[i]); };

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="zs-root">
      <ParticleCanvas />
      <div className="zs-glow zs-glow-a" /><div className="zs-glow zs-glow-b" /><div className="zs-glow zs-glow-c" />
      <div className="zs-floats">{FLOAT_PARTICLES.map((p) => (<i key={p.id} className={'zs-float zs-float-' + p.shade} style={{ left: p.left + '%', width: p.size, height: p.size, animationDelay: p.delay + 's', animationDuration: p.dur + 's' }} />))}</div>

      {/* 顶部悬浮条：返回 —— 章节指示 */}
      <header className="zs-topbar">
        <a href="#/" className="zs-back"><ArrowLeft size={18} /><span>返回</span></a>
        <div className="zs-chapter-hud">
          <span className="zs-hud-tag">{ch.tag}</span>
          <span className="zs-hud-tit">第 {chIndex + 1} 章</span>
          <span className="zs-hud-total">/ 共 {total} 章</span>
        </div>
      </header>

      <div className="zs-scroll">
        {/* ===== 首页 HERO：动态背景 ===== */}
        <section className="zs-hero">
          <div className="zs-hero-bg" style={{ backgroundImage: `url(${BASE}hero.webp)` }} />
          <div className="zs-hero-mask" />
          <div className="zs-hero-inner">
            <div className="zs-hero-badge"><Sparkles size={14} /><span>我在精神病院学斩神 · 章节阅读</span></div>
            <h1 className="zs-hero-title"><Typewriter text="斩 神" speed={90} onDone={() => setHeroDone(true)} /></h1>
            <p className="zs-hero-sub"><Typewriter text="神明漫天之下，大夏的守夜人以凡躯执剑。纵使逆天改命，也要护住万家灯火。点击进入，从序章开始这场斩神之旅。" speed={30} start={9} /></p>
            <div className={'zs-hero-actions ' + (heroDone ? 'zs-in' : '')}>
              <button className="zs-pill zs-pill-solid" onClick={() => scrollTo('zs-chapter')}><BookOpen size={16} /> 开始阅读</button>
              <button className="zs-pill" onClick={() => scrollTo('zs-roles')}><Ghost size={16} /> 浏览角色</button>
            </div>
          </div>
        </section>

        {/* ===== 章节阅读区 ===== */}
        <section className="zs-sec" id="zs-chapter">
          <div className="zs-sec-head">
            <span className="zs-sec-tag">章节剧情 · 逐章推进</span>
            <div className="zs-sec-nav">
              <button className="zs-pager" onClick={prevCh} disabled={chIndex === 0}><ArrowLeft size={17} /></button>
              <span className="zs-page">{chIndex + 1} / {total}</span>
              <button className="zs-pager" onClick={nextCh} disabled={chIndex === total - 1}><Play size={16} /></button>
            </div>
          </div>

          <article className="zs-article" key={chIndex}>
            <div className="zs-art-img" style={{ backgroundImage: `url(${ch.bg})` }} />
            <div className="zs-art-body">
              <span className="zs-art-tag">{ch.tag}</span>
              <h2 className="zs-art-title">{ch.title}</h2>
              {ch.text.map((p, i) => <p key={i} className="zs-art-p">{p}</p>)}
              <p className="zs-cliff"><Swords size={15} /><span>{ch.cliff}</span></p>

              {showChoices && (
                <div className="zs-branch">
                  <p className="zs-branch-q"><Eye size={15} /><span>{ch.choice}</span></p>
                  <div className="zs-branch-opts">
                    {ch.options.map((o, idx) => (
                      <button key={o} className={'zs-opt ' + (branchPick === idx ? 'zs-opt-on' : '')} onClick={() => choose(o, idx)}>
                        <span className="zs-opt-no">0{idx + 1}</span><span className="zs-opt-txt">{o}</span><ChevronRight size={16} className="zs-opt-ar" />
                      </button>
                    ))}
                  </div>
                  {branchMsg && <p className="zs-branch-msg"><Sparkles size={13} />{branchMsg}</p>}
                </div>
              )}

              <div className="zs-article-cta">
                {chIndex < total - 1
                  ? <button className="zs-next" onClick={nextCh}><Send size={16} /> 进入下一章</button>
                  : <button className="zs-next" onClick={() => { setChIndex(0); scrollTo('zs-chapter'); }}><RotateCcw size={16} /> 重读全文</button>}
                {chIndex > 0 && <button className="zs-ghost" onClick={prevCh}><ArrowLeft size={15} /> 上一章</button>}
              </div>
            </div>
          </article>
        </section>

        {/* ===== 角色画廊 ===== */}
        <section className="zs-sec zs-roles-sec" id="zs-roles">
          <div className="zs-sec-head"><span className="zs-sec-tag">角色画廊 · 真实立绘</span><span className="zs-sec-hint">点击下方切换角色</span></div>
          <div className="zs-role-stage">
            <div className="zs-role-stage-inner">
              {ROLES.map((r, i) => (
                <div key={r.id} className={'zs-card ' + (charIndex === i ? 'zs-card-on' : '')} style={{ '--acc': r.accent }}>
                  <div className="zs-card-img" style={{ backgroundImage: `url(${r.img})` }} />
                  <div className="zs-card-info">
                    <span className="zs-card-epithet">{r.epithet}</span>
                    <h3 className="zs-card-name">{r.name}</h3>
                    <p className="zs-card-title">{r.title}</p>
                    <p className="zs-card-text">{r.text}</p>
                    <div className="zs-card-tags">{r.tags.map((t) => <span key={t} className="zs-tag" style={{ color: r.accent, borderColor: r.accent + '55', background: r.accent + '14' }}>{t}</span>)}</div>
                    <button className="zs-detail-btn" style={{ background: r.accent, boxShadow: `0 10px 24px -10px ${r.accent}aa` }} onClick={() => { setActiveRole(r); setShowModal(true); }}>查看详情</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="zs-role-dots">{ROLES.map((r, i) => (<button key={r.id} className={'zs-dot ' + (charIndex === i ? 'zs-dot-on' : '')} style={{ '--dot-acc': r.accent }} onClick={() => switchRole(i)} title={r.name}>{r.name}</button>))}</div>
          </div>
        </section>

        <footer className="zs-foot">
          <p>灵感来自《我在精神病院学斩神》· 非官方粉丝向页面 · 图片来自网络公开资料</p>
          <button className="zs-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><RotateCcw size={14} /> 回到顶部</button>
        </footer>
                  </div>

      {showModal && (
        <div className="zs-modal" onClick={() => setShowModal(false)}>
          <div className="zs-modal-card" onClick={(e) => e.stopPropagation()} style={{ '--acc': activeRole.accent }}>
            <button className="zs-modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            <div className="zs-modal-body">
              <div className="zs-modal-img" style={{ backgroundImage: `url(${activeRole.img})` }} />
              <div className="zs-modal-info">
                <span className="zs-card-epithet">{activeRole.epithet}</span>
                <h3 className="zs-modal-name">{activeRole.name}</h3>
                <p className="zs-modal-role">{activeRole.title}</p>
                <blockquote className="zs-modal-quote">「{activeRole.quote}」</blockquote>
                <p className="zs-modal-text">{activeRole.text}</p>
                <div className="zs-card-tags">{activeRole.tags.map((t) => <span key={t} className="zs-tag" style={{ color: activeRole.accent, borderColor: activeRole.accent + '55', background: activeRole.accent + '14' }}>{t}</span>)}</div>
              </div>
            </div>
          </div>
        </div>
            )}

      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .zs-root { position: relative; min-height: 100vh; width: 100%; background: linear-gradient(160deg, #F4F7FF 0%, #EFF2FF 34%, #F4F0FF 68%, #ECF5FF 100%); color: #232a3d; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        .zs-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .zs-glow { position: fixed; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
        .zs-glow-a { width: 520px; height: 520px; left: -140px; top: -120px; background: rgba(124,140,255,0.34); }
        .zs-glow-b { width: 460px; height: 460px; right: -120px; top: 30%; background: rgba(176,140,255,0.30); }
        .zs-glow-c { width: 520px; height: 520px; left: 30%; bottom: -180px; background: rgba(90,200,255,0.24); }
        .zs-floats { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .zs-float { position: absolute; border-radius: 50%; top: -30px; opacity: .55; filter: blur(1px); animation: zsFloat linear infinite; }
        .zs-float-blue { background: #8FA4FF; box-shadow: 0 0 10px 2px rgba(143,164,255,.7); }
        .zs-float-violet { background: #C7A8FF; box-shadow: 0 0 10px 2px rgba(199,168,255,.7); }
        .zs-float-cyan { background: #8FE3FF; box-shadow: 0 0 10px 2px rgba(143,227,255,.7); }
        @keyframes zsFloat { from { transform: translateY(0) translateX(0) rotate(0);} to { transform: translateY(110vh) translateX(40px) rotate(180deg);} }

        /* 顶部悬浮条 + 章节指示 */
        .zs-topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 60; display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; pointer-events: none; }
        .zs-back { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; background: rgba(255,255,255,.75); backdrop-filter: blur(10px); border: 1px solid rgba(124,140,255,.35); color: #3a4568; font-size: 13px; font-weight: 600; text-decoration: none; box-shadow: 0 8px 24px -14px rgba(124,140,255,.7); transition: all .2s ease; pointer-events: auto; }
        .zs-back:hover { background: #fff; border-color: #7C8CFF; transform: translateY(-1px); }
        .zs-chapter-hud { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; background: rgba(255,255,255,.75); backdrop-filter: blur(10px); border: 1px solid rgba(124,140,255,.4); box-shadow: 0 8px 26px -14px rgba(124,140,255,.8); font-weight: 700; }
        .zs-hud-tag { font-size: 12px; color: #fff; background: linear-gradient(120deg, #7C8CFF, #9A6BFF); padding: 3px 10px; border-radius: 999px; }
        .zs-hud-tit { font-size: 14px; color: #5460FF; letter-spacing: .04em; }
        .zs-hud-total { font-size: 12px; color: #9aa3c4; font-weight: 600; }

        .zs-scroll { position: relative; z-index: 2; }

        /* HERO 动态背景 */
        .zs-hero { position: relative; min-height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .zs-hero-bg { position: absolute; inset: -6%; background-size: cover; background-position: center; z-index: 0; animation: zsKen 22s ease-in-out infinite alternate; will-change: transform; }
        @keyframes zsKen { from { transform: scale(1.05) translateX(-1%);} to { transform: scale(1.2) translateX(1%);} }
        .zs-hero-mask { position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgba(244,247,255,.55) 0%, rgba(244,247,255,.40) 40%, rgba(240,238,255,.88) 82%, #F0F1FF 100%); }
        .zs-hero-inner { position: relative; z-index: 2; text-align: center; padding: 40px 24px; max-width: 780px; }
        .zs-hero-badge { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 999px; background: rgba(255,255,255,.75); border: 1px solid rgba(124,140,255,.4); color: #5460FF; font-size: 12.5px; font-weight: 600; box-shadow: 0 8px 26px -12px rgba(124,140,255,.6); backdrop-filter: blur(8px); }
        .zs-hero-title { margin: 22px 0 6px; font-size: 64px; font-weight: 800; letter-spacing: .14em; line-height: 1.05; background: linear-gradient(120deg, #5B6BFF 5%, #9A6BFF 42%, #4FB6FF 85%); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 8px 26px rgba(124,140,255,.35)); }
        .zs-hero-sub { margin: 0 auto; color: #4a5476; font-size: 15.5px; line-height: 1.8; max-width: 540px; min-height: 56px; font-weight: 500; }
        .zs-type-caret { display: inline-block; width: 2px; height: 1em; margin-left: 3px; vertical-align: text-bottom; background: #7C8CFF; animation: zsBlink .8s steps(1) infinite; }
        @keyframes zsBlink { 50% { opacity: 0; } }
        .zs-hero-actions { display: flex; gap: 12px; justify-content: center; margin-top: 30px; opacity: 0; transform: translateY(10px); transition: all .5s ease; }
        .zs-hero-actions.zs-in { opacity: 1; transform: none; }
        .zs-pill { display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; border-radius: 999px; border: 1px solid rgba(124,140,255,.5); background: rgba(255,255,255,.78); color: #5460FF; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 10px 30px -14px rgba(124,140,255,.8); backdrop-filter: blur(8px); transition: all .2s ease; font-family: inherit; }
        .zs-pill:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 16px 34px -14px rgba(124,140,255,.9); }
        .zs-pill-solid { background: linear-gradient(120deg, #7C8CFF, #9A6BFF); color: #fff; border-color: transparent; }
        .zs-pill-solid:hover { background: linear-gradient(120deg, #6b7cff, #8b5bff); }

        /* SECTION */
        .zs-sec { max-width: 1080px; margin: 0 auto; padding: 72px 24px 40px; }
        .zs-sec-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
        .zs-sec-tag { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; letter-spacing: .12em; color: #6b76a1; }
        .zs-sec-tag::before { content: ''; width: 22px; height: 2px; border-radius: 999px; background: linear-gradient(90deg, #7C8CFF, #B48CFF); }
        .zs-sec-hint { font-size: 12px; color: #9aa3c4; }
        .zs-sec-nav { display: flex; align-items: center; gap: 10px; }
        .zs-page { font-size: 13px; font-weight: 700; color: #5460FF; }
        .zs-pager { width: 36px; height: 36px; border-radius: 11px; border: 1px solid rgba(124,140,255,.45); background: rgba(255,255,255,.7); color: #5460FF; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s ease; }
        .zs-pager:hover:not(:disabled) { background: #fff; transform: translateY(-1px); box-shadow: 0 8px 20px -10px rgba(124,140,255,.7); }
        .zs-pager:disabled { opacity: .35; cursor: not-allowed; }

        /* 章节文章卡 */
        .zs-article { display: grid; grid-template-columns: 380px 1fr; gap: 22px; background: rgba(255,255,255,.74); backdrop-filter: blur(16px); border: 1px solid rgba(124,140,255,.32); border-radius: 22px; padding: 22px; box-shadow: 0 24px 60px -34px rgba(124,140,255,.9); animation: zsCardIn .45s cubic-bezier(.2,.7,.3,1); }
        @keyframes zsCardIn { from { opacity: 0; transform: translateY(24px) scale(.98);} to { opacity: 1; transform: none;} }
        @media (max-width: 860px) { .zs-article { grid-template-columns: 1fr; } }
        .zs-art-img { border-radius: 16px; background-size: cover; background-position: center; min-height: 380px; border: 1px solid rgba(124,140,255,.22); box-shadow: inset 0 0 0 1px rgba(124,140,255,.2); }
        .zs-art-body { display: flex; flex-direction: column; }
        .zs-art-tag { display: inline-block; width: fit-content; padding: 4px 12px; border-radius: 999px; background: linear-gradient(120deg, #7C8CFF, #9A6BFF); color: #fff; font-size: 12px; font-weight: 700; box-shadow: 0 8px 20px -8px #7C8CFF; }
        .zs-art-title { margin: 12px 0 14px; font-size: 28px; font-weight: 800; color: #232a3d; line-height: 1.3; }
        .zs-art-p { margin: 0 0 14px; line-height: 1.95; color: #3a4568; font-size: 15px; }
        .zs-cliff { display: flex; align-items: flex-start; gap: 9px; margin: 4px 0 0; padding: 14px 16px; border-radius: 14px; background: linear-gradient(120deg, rgba(124,140,255,.12), rgba(154,107,255,.10)); border: 1px solid rgba(124,140,255,.35); color: #5460FF; font-size: 14px; font-weight: 700; line-height: 1.6; }
        .zs-cliff svg { flex-shrink: 0; margin-top: 3px; }

        .zs-branch { margin-top: 18px; display: flex; flex-direction: column; gap: 14px; }
        .zs-branch-q { display: flex; align-items: flex-start; gap: 9px; margin: 0; font-size: 14.5px; font-weight: 600; color: #3a4568; line-height: 1.5; }
        .zs-branch-q svg { color: #7C8CFF; flex-shrink: 0; margin-top: 2px; }
        .zs-branch-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 560px) { .zs-branch-opts { grid-template-columns: 1fr; } }
        .zs-opt { display: flex; align-items: center; gap: 12px; padding: 13px 14px; border-radius: 13px; border: 1px solid rgba(124,140,255,.38); background: rgba(255,255,255,.6); cursor: pointer; transition: all .2s ease; text-align: left; font-family: inherit; box-shadow: 0 6px 18px -12px rgba(124,140,255,.5); }
        .zs-opt:hover { background: #fff; border-color: #7C8CFF; transform: translateY(-2px); box-shadow: 0 12px 26px -14px rgba(124,140,255,.85); }
        .zs-opt-on { background: linear-gradient(120deg, #7C8CFF14, #B48CFF14); border-color: #7C8CFF; }
        .zs-opt-no { font-size: 11px; font-weight: 800; color: #7C8CFF; opacity: .8; }
        .zs-opt-txt { font-size: 14px; font-weight: 600; color: #3a4568; flex: 1; }
        .zs-opt-ar { color: #7C8CFF; opacity: 0; transform: translateX(-6px); transition: all .2s ease; }
        .zs-opt:hover .zs-opt-ar { opacity: 1; transform: none; }
        .zs-branch-msg { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 13px; color: #6fa567; font-weight: 600; animation: zsFade .4s ease; }
        .zs-branch-msg svg { color: #4FC3A7; }
        @keyframes zsFade { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: none;} }

        .zs-article-cta { display: flex; gap: 12px; margin-top: 22px; }
        .zs-next { display: inline-flex; align-items: center; gap: 8px; padding: 13px 24px; border: none; border-radius: 999px; background: linear-gradient(120deg, #7C8CFF, #9A6BFF); color: #fff; font-size: 14.5px; font-weight: 700; cursor: pointer; box-shadow: 0 12px 30px -12px #7C8CFF; transition: all .2s ease; font-family: inherit; }
        .zs-next:hover { transform: translateY(-2px); filter: brightness(1.06); }
        .zs-ghost { display: inline-flex; align-items: center; gap: 7px; padding: 12px 20px; border-radius: 999px; border: 1px solid rgba(124,140,255,.45); background: rgba(255,255,255,.7); color: #5460FF; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all .2s ease; font-family: inherit; }
        .zs-ghost:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 8px 20px -10px rgba(124,140,255,.7); }

        /* 角色画廊 */
        .zs-role-stage { position: relative; min-height: 460px; }
        .zs-role-stage-inner { position: relative; }
        .zs-card { position: absolute; inset: 0; display: grid; grid-template-columns: 300px 1fr; gap: 26px; background: rgba(255,255,255,.74); backdrop-filter: blur(16px); border: 1px solid rgba(124,140,255,.32); border-radius: 22px; padding: 22px; box-shadow: 0 24px 60px -34px rgba(124,140,255,.9); opacity: 0; transform: translateY(24px) scale(.97); pointer-events: none; transition: all .45s cubic-bezier(.2,.7,.3,1); }
        .zs-card-on { opacity: 1; transform: none; pointer-events: auto; z-index: 2; }
        @media (max-width: 720px) { .zs-card { grid-template-columns: 1fr; position: relative; min-height: auto; } .zs-role-stage { min-height: auto; } }
        .zs-card-img { border-radius: 16px; background-size: cover; background-position: center; min-height: 340px; border: 1px solid rgba(124,140,255,.22); }
        .zs-card-info { display: flex; flex-direction: column; gap: 10px; }
        .zs-card-epithet { display: inline-block; width: fit-content; padding: 4px 12px; border-radius: 999px; background: var(--acc, #7C8CFF); color: #fff; font-size: 12px; font-weight: 700; box-shadow: 0 8px 20px -8px var(--acc, #7C8CFF); }
        .zs-card-name { margin: 0; font-size: 30px; font-weight: 800; color: #232a3d; }
        .zs-card-title { margin: 0; font-size: 14px; font-weight: 600; color: #7f8ab0; }
        .zs-card-text { margin: 0; line-height: 1.8; color: #4a5476; font-size: 14.5px; }
        .zs-card-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .zs-tag { padding: 5px 12px; border-radius: 999px; border: 1px solid; font-size: 12.5px; font-weight: 600; }
        .zs-detail-btn { align-self: flex-start; margin-top: 4px; display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; border: none; border-radius: 999px; color: #fff; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all .2s ease; font-family: inherit; }
        .zs-detail-btn:hover { transform: translateY(-2px); filter: brightness(1.06); }
        .zs-role-dots { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
        .zs-dot { appearance: none; border: 1.5px solid var(--dot-acc, #7C8CFF); background: rgba(255,255,255,.6); color: #7f8ab0; border-radius: 999px; padding: 7px 16px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s ease; font-family: inherit; }
        .zs-dot:hover { background: #fff; transform: translateY(-2px); }
        .zs-dot-on { background: var(--dot-acc, #7C8CFF); color: #fff; box-shadow: 0 10px 24px -8px var(--dot-acc, #7C8CFF); }

        /* FOOT */
        .zs-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; max-width: 1080px; margin: 20px auto 0; padding: 34px 24px 48px; border-top: 1px solid rgba(124,140,255,.25); color: #8b95bb; font-size: 13px; }
        .zs-foot p { margin: 0; }
        .zs-top { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 999px; border: 1px solid rgba(124,140,255,.4); background: rgba(255,255,255,.7); color: #5460FF; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .2s ease; font-family: inherit; }
        .zs-top:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 8px 20px -10px rgba(124,140,255,.7); }

        /* MODAL */
        .zs-modal { position: fixed; inset: 0; z-index: 100; background: rgba(40,48,90,.35); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 24px; animation: zsFade .2s ease; }
        .zs-modal-card { position: relative; width: 100%; max-width: 840px; background: rgba(255,255,255,.96); border-radius: 22px; border: 1px solid var(--acc, #7C8CFF); box-shadow: 0 40px 90px -40px var(--acc, #7C8CFF); overflow: hidden; }
        .zs-modal-close { position: absolute; top: 14px; right: 14px; z-index: 5; width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(20,24,33,.08); background: #fff; color: #6b76a1; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s ease; }
        .zs-modal-close:hover { background: #f3f4ff; color: #232a3d; }
        .zs-modal-body { display: grid; grid-template-columns: 320px 1fr; }
        @media (max-width: 720px) { .zs-modal-body { grid-template-columns: 1fr; } }
        .zs-modal-img { background-size: cover; background-position: center; min-height: 360px; }
        .zs-modal-info { padding: 28px 28px; display: flex; flex-direction: column; gap: 12px; }
        .zs-modal-name { margin: 0; font-size: 28px; font-weight: 800; color: #232a3d; }
        .zs-modal-role { margin: 0; font-size: 14px; font-weight: 600; color: #7f8ab0; }
        .zs-modal-quote { margin: 0; padding-left: 14px; border-left: 3px solid var(--acc, #7C8CFF); color: #5460FF; font-size: 15px; font-weight: 600; line-height: 1.6; font-style: italic; }
        .zs-modal-text { margin: 0; line-height: 1.85; color: #4a5476; font-size: 14.5px; }

        @media (max-width: 560px) {
          .zs-hero-title { font-size: 44px; }
          .zs-topbar { padding: 12px 14px; }
          .zs-hud-total { display: none; }
        }
      `}</style>
    </div>
  );
}
