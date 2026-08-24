import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Sparkles, Scroll, ShieldCheck, Ghost, X, Play, RotateCcw } from 'lucide-react';

/**
 * ZhanShen — 《我在精神病院学斩神》沉浸式全屏页
 * 风格：清亮酷炫 · 浅底色 + 淡蓝/淡紫微光粒子 · 发光边框 · 柔和渐变 · 不用深色黑底
 * 能力：粒子光效 / 渐变背景 / 卡片转场 / 文字打字机 / 弹窗 / 分支选项 / 角色立绘切换
 *
 * 素材路径：public/zhan-shen/*.jpg（BASE_URL 前缀拼接，兼容 GitHub Pages 子路径）
 */

const BASE = import.meta.env.BASE_URL + 'zhan-shen/';

const ROLES = [
  {
    id: 'linqiye',
    name: '林七夜',
    title: '诸神精神病院·院长 / 夜幕小队领袖',
    epithet: '逆天改命的失明少年',
    img: BASE + 'linqiye.jpg',
    accent: '#7C8CFF',
    quote: '纵使神明漫天，我亦以凡躯执剑，护佑万家灯火。',
    text: '全书主角，第五宇宙意志的化身。融合凡尘、黑夜、斗战等多重本源，可改写现实、逆转生死。以失明之身承载米迦勒神威，体内囚禁诸神，最终终结混沌浩劫，重塑宇宙轮回。',
    tags: ['凡尘神域', '因果权柄', 'SS级多神代理人'],
  },
  {
    id: 'sunwukong',
    name: '斗战胜佛·孙悟空',
    title: '诸神精神病院 / 至高神境强者',
    epithet: '金刚不坏，斗战法则',
    img: BASE + 'sunwukong.jpg',
    accent: '#F5A623',
    quote: '遇强则强，战到天荒地老，我自岿然不动。',
    text: '披袈裟的古猿，鲜红袈裟上纵横金色纹路。继承七十二变、筋斗云、金刚不坏之身，掌控斗战法则。经精神病院治愈后成为林七夜的强力底牌，是人类阵营对抗神明的重要力量。',
    tags: ['七十二变', '斗战神墟', '高等神格'],
  },
  {
    id: 'zhouping',
    name: '红尘剑仙·周平',
    title: '大夏剑圣 / 人类精神图腾',
    epithet: '一剑破万法',
    img: BASE + 'zhouping.jpg',
    accent: '#4FC3A7',
    quote: '一生仅出三剑，每一剑皆是完整的剑之法则。',
    text: '林七夜的剑道恩师，人类第一位以凡人之躯成神并斩神的存在。受肉身限制一生只能出三剑，却一剑斩杀主神赛特，两剑诛灭旧日支配者黑山羊。为人类对抗神明树立永恒榜样。',
    tags: ['剑之法则', '自创法则成神', '纯战力巅峰'],
  },
];

const CHAPTERS = [
  {
    id: 'c1', tag: '序章', title: '精神病院的三千神明',
    text: '大夏隐匿着不可言说的秘密：诸神精神病院内，关押着来自不同神系的古老神明——黑夜女神倪克斯、传奇魔法师梅林、斗战圣佛孙悟空、英雄王吉尔伽美什、千貌之神奈亚拉托提普……而失明少年林七夜，正是这座病院的院长。',
    choice: '是否与黑暗中苏醒的黑夜女神对话？',
    options: ['唤醒倪克斯', '保持沉默'],
  },
  {
    id: 'c2', tag: '觉醒', title: '神明代言人与守夜人',
    text: '神明代理人按契约强度分为五阶：C 级情报炮灰、B 级战争之刃、A 级人间代言人、S 级至高神使、SS 级规则打破者。而大夏的守夜人们，正夜复一夜地筑起人间的壁垒，抵御迷雾与神明的降临。',
    choice: '你选择加入哪方阵营？',
    options: ['大夏守夜人', '隐藏于暗处'],
  },
  {
    id: 'c3', tag: '绝巅', title: '战力榜单上的传奇',
    text: '从失明少年到宇宙主宰，从凡人剑客到剑仙不朽：林七夜断层登顶，红尘剑仙周平一剑破万法，至高天使米迦勒执掌光明审判，创世之母倪克斯吞噬黑夜梦境。每一位巅峰强者，都在书写自己的斩神史诗。',
    choice: '你更想追随哪位强者的道路？',
    options: ['林七夜', '周平', '米迦勒'],
  },
];

const FLOAT_PARTICLES = Array.from({ length: 34 }, (_, i) => ({
  id: i,
  left: (i * 37) % 100,
  size: 4 + ((i * 7) % 9),
  delay: (i * 0.8) % 7,
  dur: 9 + ((i * 13) % 9),
  shade: i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'violet' : 'cyan',
}));

/* ---------- 粒子 canvas 光效 ---------- */
function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c.getContext('2d');
    let raf; let w; let h; let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dots = [];
    const N = 70;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < N; i++) {
      dots.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2 + 0.6, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, hue: Math.random() > 0.5 ? 225 : 265, a: Math.random() * 0.4 + 0.15 });
    }
    const step = () => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < -5) d.x = w + 5; if (d.x > w + 5) d.x = -5;
        if (d.y < -5) d.y = h + 5; if (d.y > h + 5) d.y = -5;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${d.hue}, 85%, 72%, ${d.a})`;
        ctx.fill();
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i]; const b = dots[j];
          const dx = a.x - b.x; const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 85%, 78%, ${(1 - dist / 110) * 0.22})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
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
function Typewriter({ text, speed = 42, start = 0, onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let i = start; setN(start);
    let iv = null;
    const t = setTimeout(() => {
      iv = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) { clearInterval(iv); onDone && onDone(); }
      }, speed);
    }, start * speed);
    return () => { clearTimeout(t); iv && clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, start]);
  return (
    <span className="zs-type">
      {text.slice(0, n)}
      <span className="zs-type-caret" />
    </span>
  );
}

export default function ZhanShen() {
  const [heroDone, setHeroDone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeRole, setActiveRole] = useState(ROLES[0]);
  const [charIndex, setCharIndex] = useState(0);
  const [chIndex, setChIndex] = useState(0);
  const [branchMsg, setBranchMsg] = useState(null);
  const [branchPick, setBranchPick] = useState(null);

  const ch = CHAPTERS[chIndex];

  const choose = (o, idx) => {
    setBranchPick(idx);
    setTimeout(() => setBranchMsg(`${o}——你的选择已记入这场冒险的因果。`), 200);
  };

  const switchRole = (i) => {
    setCharIndex(i);
    setActiveRole(ROLES[i]);
  };

  const nextChapter = () => {
    setBranchMsg(null); setBranchPick(null);
    setChIndex((c) => (c + 1) % CHAPTERS.length);
  };
  const prevChapter = () => {
    setBranchMsg(null); setBranchPick(null);
    setChIndex((c) => (c - 1 + CHAPTERS.length) % CHAPTERS.length);
  };

  return (
    <div className="zs-root">
      {/* 返回工具中心的连接写在这里：由 Layout 提供退出，此处提供回首页 */}
      <a href={'#/' + BASE.replace(/\//g, '').slice(0, 0) || '/'} className="zs-back" title="返回">
        <ArrowLeft size={18} />
        <span>返回</span>
      </a>

      {/* 粒子背景 */}
      <ParticleCanvas />

      {/* 渐变光晕层 */}
      <div className="zs-glow zs-glow-a" />
      <div className="zs-glow zs-glow-b" />
      <div className="zs-glow zs-glow-c" />

      {/* 浮动装饰粒子 */}
      <div className="zs-floats">
        {FLOAT_PARTICLES.map((p) => (
          <i key={p.id} className={'zs-float zs-float-' + p.shade} style={{ left: p.left + '%', width: p.size, height: p.size, animationDelay: p.delay + 's', animationDuration: p.dur + 's' }} />
        ))}
      </div>

      <div className="zs-scroll">
        {/* ===== HERO ===== */}
        <section className="zs-hero">
          <div className="zs-hero-img" style={{ backgroundImage: `url(${BASE}hero.jpg)` }} />
          <div className="zs-hero-mask" />
          <div className="zs-hero-inner">
            <div className="zs-hero-badge">
              <Sparkles size={14} />
              <span>我在精神病院学斩神 · 沉浸式世界</span>
            </div>
            <h1 className="zs-hero-title">
              <Typewriter text="斩 神" speed={90} onDone={() => setHeroDone(true)} />
            </h1>
            <p className="zs-hero-sub">
              <Typewriter text="神明漫天之下，大夏的守夜人以凡躯执剑。纵使逆天改命，也要护住万家灯火。" speed={30} start={9} />
            </p>
            <div className={`zs-hero-actions ${heroDone ? 'zs-in' : ''}`}>
              <button className="zs-pill zs-pill-solid" onClick={() => document.getElementById('zs-world')?.scrollIntoView({ behavior: 'smooth' })}>
                <Scroll size={16} /> 进入世界观
              </button>
              <button className="zs-pill" onClick={() => document.getElementById('zs-roles')?.scrollIntoView({ behavior: 'smooth' })}>
                <Ghost size={16} /> 浏览角色
              </button>
            </div>
          </div>
        </section>

        {/* ===== 世界观·分支剧情 ===== */}
        <section className="zs-sec" id="zs-world">
          <div className="zs-sec-head">
            <span className="zs-sec-tag">世界观 · 分支叙事</span>
            <div className="zs-sec-nav">
              <button className="zs-arrow" onClick={prevChapter}><ArrowLeft size={18} /></button>
              <span className="zs-page">{chIndex + 1} / {CHAPTERS.length}</span>
              <button className="zs-arrow" onClick={nextChapter}><Play size={16} /></button>
            </div>
          </div>

          <div className="zs-chapter">
            <div className="zs-chapter-card">
              <div className="zs-chapter-top">
                <span className="zs-chapter-tag">{ch.tag}</span>
                <h2 className="zs-chapter-title">{ch.title}</h2>
              </div>
              <p className="zs-chapter-text">{ch.text}</p>
            </div>

            <div className="zs-branch">
              <p className="zs-branch-q">
                <ShieldCheck size={15} />
                <span>{ch.choice}</span>
              </p>
              <div className="zs-branch-opts">
                {ch.options.map((o, idx) => (
                  <button key={o} className={'zs-opt ' + (branchPick === idx ? 'zs-opt-on' : '')} onClick={() => choose(o, idx)}>
                    <span className="zs-opt-no">0{idx + 1}</span>
                    <span className="zs-opt-txt">{o}</span>
                  </button>
                ))}
              </div>
              {branchMsg && <p className="zs-branch-msg"><Sparkles size={13} />{branchMsg}</p>}
            </div>
          </div>
        </section>

        {/* ===== 角色立绘 · 切换 ===== */}
        <section className="zs-sec" id="zs-roles">
          <div className="zs-sec-head">
            <span className="zs-sec-tag">角色画廊 · 立绘切换</span>
            <span className="zs-sec-hint">点击下方切换角色</span>
          </div>

          <div className="zs-role-stage">
            <div className="zs-role-stage-inner">
              {ROLES.map((r, i) => (
                <div
                  key={r.id}
                  className={'zs-card ' + (charIndex === i ? 'zs-card-on' : '')}
                  style={{ '--acc': r.accent }}
                >
                  <div className="zs-card-img" style={{ backgroundImage: `url(${r.img})` }} />
                  <div className="zs-card-info">
                    <span className="zs-card-epithet">{r.epithet}</span>
                    <h3 className="zs-card-name">{r.name}</h3>
                    <p className="zs-card-title">{r.title}</p>
                    <p className="zs-card-text">{r.text}</p>
                    <div className="zs-card-tags">{r.tags.map((t) => <span key={t} className="zs-tag" style={{ color: r.accent, borderColor: r.accent + '55', background: r.accent + '14' }}>{t}</span>)}</div>
                    <button className="zs-detail-btn" style={{ background: r.accent, boxShadow: `0 10px 24px -10px ${r.accent}aa` }} onClick={() => { setActiveRole(r); setShowModal(true); }}>
                      查看详情
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="zs-role-dots">
              {ROLES.map((r, i) => (
                <button
                  key={r.id}
                  className={'zs-dot ' + (charIndex === i ? 'zs-dot-on' : '')}
                  style={{ '--dot-acc': r.accent }}
                  onClick={() => switchRole(i)}
                  title={r.name}
                >
                  <span className="zs-dot-name">{r.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 收尾 ===== */}
        <footer className="zs-foot">
          <p>灵感来自《我在精神病院学斩神》 · 非官方粉丝向页面</p>
          <button className="zs-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <RotateCcw size={14} /> 回到顶部
          </button>
        </footer>
      </div>

      {/* ===== 角色详情弹窗 ===== */}
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

      {/* ===== 组件内样式（局部作用域用前缀 zs-） ===== */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .zs-root {
          position: relative; min-height: 100vh; width: 100%;
          background: linear-gradient(160deg, #F4F7FF 0%, #EFF2FF 34%, #F4F0FF 68%, #ECF5FF 100%);
          color: #232a3d; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased;
        }
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

        .zs-scroll { position: relative; z-index: 2; }

        .zs-back {
          position: fixed; top: 18px; left: 18px; z-index: 60;
          display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
          border-radius: 999px; background: rgba(255,255,255,.72); backdrop-filter: blur(10px);
          border: 1px solid rgba(124,140,255,.35); color: #3a4568; font-size: 13px; font-weight: 600;
          text-decoration: none; box-shadow: 0 8px 24px -14px rgba(124,140,255,.7); transition: all .2s ease;
        }
        .zs-back:hover { background: #fff; border-color: #7C8CFF; transform: translateY(-1px); }

        /* HERO */
        .zs-hero { position: relative; min-height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; }
        .zs-hero-img { position: absolute; inset: 0; background-size: cover; background-position: center; z-index: 0; }
        .zs-hero-mask { position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgba(244,247,255,.62) 0%, rgba(244,247,255,.42) 45%, rgba(240,238,255,.92) 86%, #F0F1FF 100%); }
        .zs-hero-inner { position: relative; z-index: 2; text-align: center; padding: 40px 24px; max-width: 760px; }
        .zs-hero-badge { display: inline-flex; align-items: center; gap: 7px; padding: 7px 14px; border-radius: 999px; background: rgba(255,255,255,.7); border: 1px solid rgba(124,140,255,.4); color: #5460FF; font-size: 12.5px; font-weight: 600; box-shadow: 0 8px 26px -12px rgba(124,140,255,.6); backdrop-filter: blur(8px); }
        .zs-hero-title {
          margin: 22px 0 6px; font-size: 64px; font-weight: 800; letter-spacing: .14em; line-height: 1.05;
          background: linear-gradient(120deg, #5B6BFF 5%, #9A6BFF 42%, #4FB6FF 85%); -webkit-background-clip: text; background-clip: text; color: transparent;
          text-shadow: none; filter: drop-shadow(0 8px 26px rgba(124,140,255,.35));
        }
        .zs-hero-sub { margin: 0 auto; color: #4a5476; font-size: 15.5px; line-height: 1.8; max-width: 520px; min-height: 56px; font-weight: 500; }
        .zs-type-caret { display: inline-block; width: 2px; height: 1em; margin-left: 3px; vertical-align: text-bottom; background: #7C8CFF; animation: zsBlink .8s steps(1) infinite; }
        @keyframes zsBlink { 50% { opacity: 0; } }
        .zs-hero-actions { display: flex; gap: 12px; justify-content: center; margin-top: 30px; opacity: 0; transform: translateY(10px); transition: all .5s ease; }
        .zs-hero-actions.zs-in { opacity: 1; transform: none; }
        .zs-pill { display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; border-radius: 999px; border: 1px solid rgba(124,140,255,.5); background: rgba(255,255,255,.75); color: #5460FF; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 10px 30px -14px rgba(124,140,255,.8); backdrop-filter: blur(8px); transition: all .2s ease; font-family: inherit; }
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
        .zs-arrow { width: 34px; height: 34px; border-radius: 10px; border: 1px solid rgba(124,140,255,.45); background: rgba(255,255,255,.7); color: #5460FF; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s ease; }
        .zs-arrow:hover { background: #fff; transform: translateY(-1px); box-shadow: 0 8px 20px -10px rgba(124,140,255,.7); }

        /* CHAPTER + BRANCH */
        .zs-chapter { display: grid; grid-template-columns: 1.3fr 1fr; gap: 18px; }
        @media (max-width: 820px) { .zs-chapter { grid-template-columns: 1fr; } }
        .zs-chapter-card { background: rgba(255,255,255,.72); backdrop-filter: blur(14px); border: 1px solid rgba(124,140,255,.3); border-radius: 20px; padding: 26px 28px; box-shadow: 0 20px 50px -30px rgba(124,140,255,.8); transition: all .25s ease; }
        .zs-chapter-card:hover { transform: translateY(-3px); box-shadow: 0 26px 56px -28px rgba(124,140,255,.95); }
        .zs-chapter-tag { display: inline-block; padding: 4px 11px; border-radius: 999px; background: linear-gradient(120deg, #7C8CFF22, #B48CFF22); border: 1px solid rgba(124,140,255,.4); color: #5460FF; font-size: 12px; font-weight: 700; margin-bottom: 12px; }
        .zs-chapter-title { margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #232a3d; }
        .zs-chapter-text { margin: 0; line-height: 1.85; color: #4a5476; font-size: 14.5px; }

        .zs-branch { background: linear-gradient(150deg, rgba(255,255,255,.66), rgba(246,248,255,.66)); backdrop-filter: blur(14px); border: 1px solid rgba(124,140,255,.3); border-radius: 20px; padding: 22px 22px; box-shadow: 0 20px 50px -30px rgba(124,140,255,.8); display: flex; flex-direction: column; gap: 14px; }
        .zs-branch-q { display: flex; align-items: flex-start; gap: 9px; margin: 0; font-size: 14.5px; font-weight: 600; color: #3a4568; line-height: 1.5; }
        .zs-branch-q svg { color: #7C8CFF; flex-shrink: 0; margin-top: 2px; }
        .zs-branch-opts { display: flex; flex-direction: column; gap: 10px; }
        .zs-opt { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 13px; border: 1px solid rgba(124,140,255,.38); background: rgba(255,255,255,.6); cursor: pointer; transition: all .2s ease; text-align: left; font-family: inherit; box-shadow: 0 6px 18px -12px rgba(124,140,255,.5); }
        .zs-opt:hover { background: #fff; border-color: #7C8CFF; transform: translateY(-2px); box-shadow: 0 12px 26px -14px rgba(124,140,255,.85); }
        .zs-opt-on { background: linear-gradient(120deg, #7C8CFF14, #B48CFF14); border-color: #7C8CFF; }
        .zs-opt-no { font-size: 11px; font-weight: 800; color: #7C8CFF; opacity: .8; }
        .zs-opt-txt { font-size: 14px; font-weight: 600; color: #3a4568; }
        .zs-branch-msg { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 13px; color: #6fa567; font-weight: 600; animation: zsFade .4s ease; }
        .zs-branch-msg svg { color: #4FC3A7; }
        @keyframes zsFade { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: none;} }

        /* ROLES */
        .zs-role-stage { position: relative; min-height: 420px; }
        .zs-role-stage-inner { position: relative; }
        .zs-card {
          position: absolute; inset: 0; display: grid; grid-template-columns: 300px 1fr; gap: 26px;
          background: rgba(255,255,255,.74); backdrop-filter: blur(16px); border: 1px solid rgba(124,140,255,.32);
          border-radius: 22px; padding: 22px; box-shadow: 0 24px 60px -34px rgba(124,140,255,.9);
          opacity: 0; transform: translateY(24px) scale(.97); pointer-events: none; transition: all .45s cubic-bezier(.2,.7,.3,1);
        }
        .zs-card-on { opacity: 1; transform: none; pointer-events: auto; z-index: 2; }
        @media (max-width: 720px) { .zs-card { grid-template-columns: 1fr; position: relative; } .zs-role-stage { min-height: auto; } }
        .zs-card-img { border-radius: 16px; background-size: cover; background-position: center; min-height: 320px; border: 1px solid #fff; box-shadow: inset 0 0 0 1px rgba(124,140,255,.2); }
        .zs-card-info { display: flex; flex-direction: column; gap: 10px; }
        .zs-card-epithet { display: inline-block; width: fit-content; padding: 4px 12px; border-radius: 999px; background: var(--acc, #7C8CFF); color: #fff; font-size: 12px; font-weight: 700; box-shadow: 0 8px 20px -8px var(--acc, #7C8CFF); }
        .zs-card-name { margin: 0; font-size: 30px; font-weight: 800; color: #232a3d; }
        .zs-card-title { margin: 0; font-size: 14px; font-weight: 600; color: #7f8ab0; }
        .zs-card-text { margin: 0; line-height: 1.8; color: #4a5476; font-size: 14.5px; }
        .zs-card-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .zs-tag { padding: 5px 12px; border-radius: 999px; border: 1px solid; font-size: 12.5px; font-weight: 600; }
        .zs-detail-btn { align-self: flex-start; margin-top: 4px; display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; border: none; border-radius: 999px; color: #fff; font-size: 13.5px; font-weight: 700; cursor: pointer; transition: all .2s ease; font-family: inherit; }
        .zs-detail-btn:hover { transform: translateY(-2px); filter: brightness(1.06); }

        .zs-role-dots { display: flex; justify-content: center; gap: 12px; margin-top: 22px; }
        .zs-dot { position: relative; appearance: none; border: 1.5px solid var(--dot-acc, #7C8CFF); background: rgba(255,255,255,.6); color: #7f8ab0; border-radius: 999px; padding: 7px 16px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s ease; font-family: inherit; }
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
      `}</style>
    </div>
  );
}