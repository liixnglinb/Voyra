import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ============================================================
   斗破苍穹 · 沉浸式视觉小说体验页
   - 粒子光效、柔和渐变背景、打字机动画、分支选项、角色立绘切换、弹窗、卡片转场、发光边框
   - 风格：微光粒子，发光边框，柔和渐变，不用深色黑底，画面通透干净
   - 素材：角色立绘与各地点的场景图均为全网搜集的真实动漫图（斗破苍穹 动画官方，来自 AniList CDN），
           经本地化引用，断链无忧。
   ============================================================ */

// ===== 真实动漫图片（本地化引用，构建后由 Vite 处理路径）=====
const charModules = import.meta.glob('../assets/doupo/characters/*.{png,jpg,jpeg}', { eager: true });
const CHAR_IMG = {};
Object.entries(charModules).forEach(([p, m]) => {
  const name = p.split('/').pop().replace(/\.[^.]+$/, '');
  CHAR_IMG[name] = m.default;
});
const coverModules = import.meta.glob('../assets/doupo/covers/*.{png,jpg,jpeg}', { eager: true });
const COVER_IMG = {};
Object.entries(coverModules).forEach(([p, m]) => {
  const name = p.split('/').pop().replace(/\.[^.]+$/, '');
  COVER_IMG[name] = m.default;
});

// ===== 角色配置（真实立绘 + 简介）=====
const CHARACTERS = {
  xiaoyan: {
    name: '萧炎', title: '炎帝 · 主角', color: '#F97316',
    img: CHAR_IMG.xiaoyan,
    desc: '乌坦城萧家曾第一天才，三载陨落被称废物。古戒中苏醒的药尘收其为徒，凭《焚诀》吞噬异火、一路逆袭，终成末法时代唯一斗帝。「莫欺少年穷」——三年之约，一战破苍穹。',
  },
  xunger: {
    name: '萧薰儿', title: '古族千金', color: '#FACC15',
    img: CHAR_IMG.xunger,
    desc: '远古八族之一古族的第一顺位继承人，身负千年来最完美的斗帝血脉。与萧炎青梅竹马，在其最落魄时默默守护，温柔坚贞，是萧炎心底最柔软的依靠。',
  },
  yaochen: {
    name: '药尘', title: '药老 · 星陨阁主', color: '#A855F7',
    img: CHAR_IMG.yaochen,
    desc: '大陆第一炼药师，星陨阁创始者，封号「药尊者」。陨落后魂魄寄居古戒，收萧炎为徒，传功授艺、亦师亦父。后以萧炎集齐的异火重铸肉身，再临巅峰。',
  },
  cailin: {
    name: '彩鳞', title: '美杜莎 · 蛇人女王', color: '#EC4899',
    img: CHAR_IMG.cailin,
    desc: '蛇人族女王，高傲冷艳、霸道深情。吞服青莲地心火后化为七彩吞天蟒，与萧炎羁绊极深，几经生死，终成萧炎之妻，统御九幽地冥蟒族。',
  },
  yunyun: {
    name: '云韵', title: '云岚宗宗主', color: '#38BDF8',
    img: CHAR_IMG.yunyun,
    desc: '云岚宗宗主，温婉大气、进退有度。与萧炎恩怨交织、情愫暗生，却因宗门之累与师徒之仇难成眷属，是书中最令人唏嘘的红颜。',
  },
  nalan: {
    name: '纳兰嫣然', title: '云岚宗少宗主', color: '#22D3EE',
    img: CHAR_IMG.nalan,
    desc: '云岚宗少宗主，曾当众退婚萧炎，留下「莫欺少年穷」之辱。后虽悔悟、屡次相助，却已成萧炎崛起之路上最锋利的那根刺。',
  },
  ziyan: {
    name: '紫妍', title: '太虚古龙公主', color: '#34D399',
    img: CHAR_IMG.ziyan,
    desc: '太虚古龙族公主，外表萝莉、实力恐怖，天生能啃食龙族血脉。与萧炎亦师亦友，后统御分裂的古龙一族，为星陨阁与天府联盟重要战力。',
  },
};

// ===== 地点 / 场景配置（真实动漫场景图 + 柔和渐变）=====
const PLACES = {
  wutan: {
    name: '乌坦城', gradient: 'linear-gradient(180deg, #FFF7ED 0%, #FED7AA 55%, #FDBA74 100%)',
    particles: '#F97316', cover: COVER_IMG.wutan,
    desc: '加玛帝国边境的小城，萧家所在。天才陨落与三年之约的起点，萧炎从这里踏上逆袭之路。',
  },
  moshou: {
    name: '魔兽山脉', gradient: 'linear-gradient(180deg, #F0FDF4 0%, #BBF7D0 55%, #86EFAC 100%)',
    particles: '#22C55E', cover: COVER_IMG.moshou,
    desc: '凶险的试炼之地。萧炎与药尘在此历练、初遇小医仙，收服青莲地心火，实力完成第一次蜕变。',
  },
  canaan: {
    name: '迦南学院', gradient: 'linear-gradient(180deg, #F0F9FF 0%, #BAE6FD 55%, #7DD3FC 100%)',
    particles: '#0EA5E9', cover: COVER_IMG.nianfan2,
    desc: '大陆顶尖学府，天焚炼气塔底封印着陨落心炎。萧炎在此结交挚友、炼化心炎，奠定强者之基。',
  },
  zhongzhou: {
    name: '中州 · 丹会', gradient: 'linear-gradient(180deg, #FAF5FF 0%, #E9D5FF 55%, #D8B4FE 100%)',
    particles: '#A855F7', cover: COVER_IMG.zhongzhou,
    desc: '中州乃大陆中心，强者如云。丹会之上，萧炎炼药扬名、重铸药老肉身，声名震动天下。',
  },
  xingyun: {
    name: '星陨阁', gradient: 'linear-gradient(180deg, #EEF2FF 0%, #C7D2FE 55%, #A5B4FC 100%)',
    particles: '#6366F1', cover: COVER_IMG.xingyun,
    desc: '药尘所创、萧炎接掌的势力。从这里开始，天府联盟聚起反抗魂族的中坚力量。',
  },
  shuangdi: {
    name: '双帝之战', gradient: 'linear-gradient(180deg, #FFF1F2 0%, #FECDD3 55%, #FDA4AF 100%)',
    particles: '#F43F5E', cover: COVER_IMG.shuangdi,
    desc: '斗气大陆的终章。萧炎借陀舍古帝传承，与魂天帝决战苍穹之巅，一战而定天下。',
  },
};

// ===== 分支剧情（沿不同地点推进）=====
const STORY = {
  start: {
    id: 'start', place: 'wutan', speaker: 'xiaoyan',
    text: '我萧炎，曾为乌坦城第一天才，却在一夜之间沦为废物。直到这枚母亲留下的古戒中，苏醒了一位灵魂……莫欺少年穷——三年之后，我必上云岚宗，亲自讨回今日之辱。',
    choices: [
      { text: '踏入魔兽山脉，生死历练', next: 'moshan' },
      { text: '回望萧家岁月', next: 'family' },
    ],
  },
  family: {
    id: 'family', place: 'wutan', speaker: 'xunger',
    text: '炎哥哥，无论旁人如何议论，薰儿都信你。这三年，我以古族秘法为你温养经脉……答应我，无论走多远，都要活着回来。',
    choices: [
      { text: '随你一同前行', next: 'moshan' },
      { text: '潜心修炼，不负所托', next: 'cultivate' },
    ],
  },
  moshan: {
    id: 'moshan', place: 'moshou', speaker: 'yaochen',
    text: '小子，魔兽山脉凶险，却也机缘遍地。青莲地心火便藏于火山深处——随老夫好好历练，炼化异火，方能在斗气大陆真正立足。',
    choices: [
      { text: '前往迦南学院', next: 'canaan' },
      { text: '独斗六阶魔兽', next: 'battle' },
    ],
  },
  cultivate: {
    id: 'cultivate', place: 'moshou', speaker: 'xiaoyan',
    text: '《焚诀》可吞噬异火而进阶，但每一步都如烈火焚身。我咬紧牙关，在生死之间，把斗之气一段段，重新炼了回来。',
    choices: [
      { text: '晋入迦南学院', next: 'canaan' },
    ],
  },
  battle: {
    id: 'battle', place: 'moshou', speaker: 'xiaoyan',
    text: '佛怒火莲！青莲地心火与紫火交融，轰然炸开——六阶魔兽轰然陨落。我萧炎，终于有了自保之力。',
    choices: [
      { text: '前往迦南学院', next: 'canaan' },
    ],
  },
  canaan: {
    id: 'canaan', place: 'canaan', speaker: 'xunger',
    text: '迦南学院藏天焚炼气塔，塔底封印着陨落心炎。炎哥哥，这里有你要的机缘，也有足以焚尽强者的危险。',
    choices: [
      { text: '赴中州丹会', next: 'danhoi' },
      { text: '闭关炼化心炎', next: 'breakthrough' },
    ],
  },
  breakthrough: {
    id: 'breakthrough', place: 'canaan', speaker: 'xiaoyan',
    text: '心炎入体，经脉重铸。我盘膝塔底三载，出关之日，斗皇之威，已可撼山。',
    choices: [
      { text: '赴中州丹会', next: 'danhoi' },
    ],
  },
  danhoi: {
    id: 'danhoi', place: 'zhongzhou', speaker: 'yaochen',
    text: '中州丹会，天下炼药师云集。徒儿，为师当年便是丹会冠军。如今该你，替星陨阁、替我药尘再夺一回荣耀——更要借天地异火，重铸为师肉身！',
    choices: [
      { text: '创立星陨阁', next: 'xingyun' },
      { text: '直面魂族', next: 'soul' },
    ],
  },
  xingyun: {
    id: 'xingyun', place: 'xingyun', speaker: 'yunyun',
    text: '星陨阁虽小，却聚起了你我这样的痴人。云岚宗旧怨已了，可这大陆的风云才刚刚开始。萧炎，这一局，我们赌上全族。',
    choices: [
      { text: '双帝之战', next: 'final' },
      { text: '寻觅净莲妖火', next: 'lotus' },
    ],
  },
  soul: {
    id: 'soul', place: 'xingyun', speaker: 'xiaoyan',
    text: '魂天帝吞噬万魂，欲以屠城成就帝境。我萧炎立誓——天府联盟，护这天下苍生。这一战，不死不休。',
    choices: [
      { text: '双帝之战', next: 'final' },
    ],
  },
  lotus: {
    id: 'lotus', place: 'xingyun', speaker: 'xiaoyan',
    text: '净莲妖火，天地间最诡谲的异火。我以多种异火熔炼，五色佛怒火莲于掌中成形——距离斗帝，只差最后一步。',
    choices: [
      { text: '双帝之战', next: 'final' },
    ],
  },
  final: {
    id: 'final', place: 'shuangdi', speaker: 'xiaoyan',
    text: '陀舍古帝传承加身，异火恒古尺横空！魂天帝，这斗气大陆的终章，由我萧炎来写。——一战破苍穹，炎帝之名，自此不朽。',
    choices: [
      { text: '重新开始', next: 'start' },
    ],
  },
};

// ===== 粒子组件 =====
function Particles({ color }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const particleCount = 55;
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      particlesRef.current.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.02;
        if (p.x < 0) p.x = canvas.offsetWidth;
        if (p.x > canvas.offsetWidth) p.x = 0;
        if (p.y < 0) p.y = canvas.offsetHeight;
        if (p.y > canvas.offsetHeight) p.y = 0;
        const currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = currentOpacity;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        glow.addColorStop(0, color);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.globalAlpha = currentOpacity * 0.3;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [color]);

  return (
    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
  );
}

// ===== 打字机文本组件 =====
function TypewriterText({ text, onComplete, speed = 45 }) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    indexRef.current = 0;
    const timer = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span>
      {displayText}
      {!isComplete && <span className="dp-cursor">|</span>}
    </span>
  );
}

// ===== 角色立绘组件（真实动漫图）=====
function CharacterPortrait({ charKey, isActive, onClick }) {
  const charData = CHARACTERS[charKey];
  if (!charData) return null;
  return (
    <button
      className={`dp-portrait ${isActive ? 'active' : ''}`}
      style={{ '--char-color': charData.color }}
      onClick={() => onClick(charKey)}
      title={`${charData.name} · ${charData.title}`}
    >
      <div className="dp-portrait-glow" />
      <div className="dp-portrait-frame">
        <img src={charData.img} alt={charData.name} className="dp-portrait-img" />
      </div>
      <div className="dp-portrait-name">{charData.name}</div>
    </button>
  );
}

// ===== 主组件 =====
export default function DoupoCangqiong() {
  const [currentScene, setCurrentScene] = useState('start');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [textComplete, setTextComplete] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [history, setHistory] = useState(['start']);
  const [fadeIn, setFadeIn] = useState(true);
  const [charModal, setCharModal] = useState(null); // 角色弹窗 key
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTab, setGalleryTab] = useState('place'); // 'place' | 'char'

  const scene = STORY[currentScene] || STORY.start;
  const place = PLACES[scene.place] || PLACES.wutan;
  const speaker = CHARACTERS[scene.speaker] || CHARACTERS.xiaoyan;

  useEffect(() => {
    setFadeIn(true);
    setTextComplete(false);
    setShowChoices(false);
    const timer = setTimeout(() => setFadeIn(false), 500);
    return () => clearTimeout(timer);
  }, [currentScene]);

  const handleChoice = useCallback((nextScene) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setFadeIn(true);
    setTimeout(() => {
      setCurrentScene(nextScene);
      setHistory((prev) => [...prev, nextScene]);
      setIsTransitioning(false);
    }, 400);
  }, [isTransitioning]);

  const handleTextComplete = useCallback(() => {
    setTextComplete(true);
    setTimeout(() => setShowChoices(true), 300);
  }, []);

  const handleRestart = () => {
    setHistory(['start']);
    setCurrentScene('start');
  };

  return (
    <div className="dp-root">
      {/* 背景层：柔和渐变 + 真实场景图（低透明柔化）+ 粒子 */}
      <div className={`dp-bg ${fadeIn ? 'fade-in' : ''}`} style={{ background: place.gradient }}>
        {place.cover && (
          <div
            className="dp-bg-cover"
            style={{ backgroundImage: `url(${place.cover})` }}
          />
        )}
        <Particles color={place.particles} />
        <div className="dp-glow dp-glow-1" />
        <div className="dp-glow dp-glow-2" />
        <div className="dp-glow dp-glow-3" />
      </div>

      {/* 内容层 */}
      <div className="dp-content">
        {/* 顶部标题 + 地点徽标 + 图鉴入口 */}
        <header className="dp-header">
          <div className="dp-title-wrap">
            <h1 className="dp-title">斗破苍穹</h1>
            <p className="dp-subtitle">莫欺少年穷 · 一战破苍穹</p>
          </div>
          <div className="dp-header-right">
            <div className="dp-place-badge">
              <span className="dp-place-dot" style={{ background: place.particles }} />
              <span className="dp-place-name">{place.name}</span>
              {place.cover && (
                <img src={place.cover} alt={place.name} className="dp-place-thumb" />
              )}
            </div>
            <button className="dp-gallery-btn" onClick={() => setGalleryOpen(true)}>
              <span className="dp-gallery-ico">❖</span> 图鉴
            </button>
          </div>
        </header>

        {/* 角色立绘区域（真实动漫图，可点击查看）*/}
        <div className="dp-characters">
          {Object.keys(CHARACTERS).map((key) => (
            <CharacterPortrait
              key={key}
              charKey={key}
              isActive={key === scene.speaker}
              onClick={setCharModal}
            />
          ))}
        </div>

        {/* 对话框 */}
        <div className={`dp-dialog ${isTransitioning ? 'transitioning' : ''}`}>
          <div className="dp-dialog-border" style={{ '--accent': speaker.color }}>
            <div className="dp-name-tag" style={{ background: speaker.color }}>
              {speaker.name}
            </div>
            <div className="dp-dialog-text">
              <TypewriterText
                key={currentScene}
                text={scene.text}
                onComplete={handleTextComplete}
                speed={45}
              />
            </div>
            {showChoices && (
              <div className="dp-choices">
                {scene.choices.map((choice, index) => (
                  <button
                    key={index}
                    className="dp-choice-btn"
                    style={{ '--btn-accent': speaker.color }}
                    onClick={() => handleChoice(choice.next)}
                  >
                    <span className="dp-choice-text">{choice.text}</span>
                    <span className="dp-choice-arrow">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部控制栏 */}
        <footer className="dp-footer">
          <button className="dp-ctrl-btn" onClick={handleRestart} title="重新开始">
            ↺ 重新开始
          </button>
          <div className="dp-history-dots">
            {history.map((_, i) => (
              <span key={i} className={`dp-dot ${i === history.length - 1 ? 'active' : ''}`} />
            ))}
          </div>
          <div className="dp-cultivation">
            斗之气 → 斗者 → 斗师 → … → 斗圣 → <b>斗帝</b>
          </div>
        </footer>
      </div>

      {/* ===== 角色信息弹窗 ===== */}
      {charModal && CHARACTERS[charModal] && (
        <div className="dp-modal-overlay" onClick={() => setCharModal(null)}>
          <div
            className="dp-modal dp-char-modal"
            style={{ '--accent': CHARACTERS[charModal].color }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="dp-modal-close" onClick={() => setCharModal(null)}>×</button>
            <div className="dp-char-modal-imgwrap">
              <img src={CHARACTERS[charModal].img} alt={CHARACTERS[charModal].name} className="dp-char-modal-img" />
            </div>
            <h3 className="dp-char-modal-name">{CHARACTERS[charModal].name}</h3>
            <div className="dp-char-modal-title" style={{ color: CHARACTERS[charModal].color }}>{CHARACTERS[charModal].title}</div>
            <p className="dp-char-modal-desc">{CHARACTERS[charModal].desc}</p>
          </div>
        </div>
      )}

      {/* ===== 图鉴弹窗（地点 / 人物）===== */}
      {galleryOpen && (
        <div className="dp-modal-overlay" onClick={() => setGalleryOpen(false)}>
          <div className="dp-modal dp-gallery-modal" onClick={(e) => e.stopPropagation()}>
            <button className="dp-modal-close" onClick={() => setGalleryOpen(false)}>×</button>
            <div className="dp-gallery-tabs">
              <button
                className={`dp-tab ${galleryTab === 'place' ? 'active' : ''}`}
                onClick={() => setGalleryTab('place')}
              >地点图鉴</button>
              <button
                className={`dp-tab ${galleryTab === 'char' ? 'active' : ''}`}
                onClick={() => setGalleryTab('char')}
              >人物图鉴</button>
            </div>
            <div className="dp-gallery-grid">
              {galleryTab === 'place' && Object.entries(PLACES).map(([key, p]) => (
                <div className="dp-gallery-card" key={key}>
                  {p.cover && <img src={p.cover} alt={p.name} className="dp-gallery-img" />}
                  <div className="dp-gallery-card-body">
                    <div className="dp-gallery-card-name">{p.name}</div>
                    <div className="dp-gallery-card-desc">{p.desc}</div>
                  </div>
                </div>
              ))}
              {galleryTab === 'char' && Object.entries(CHARACTERS).map(([key, c]) => (
                <div className="dp-gallery-card" key={key} style={{ '--accent': c.color }}>
                  <img src={c.img} alt={c.name} className="dp-gallery-img dp-gallery-img-round" />
                  <div className="dp-gallery-card-body">
                    <div className="dp-gallery-card-name">{c.name}<span className="dp-gallery-card-title">{c.title}</span></div>
                    <div className="dp-gallery-card-desc">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 全局样式 */}
      <style>{`
        .dp-root {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
        }

        /* 背景层 */
        .dp-bg {
          position: absolute;
          inset: 0;
          transition: background 0.8s ease;
          z-index: 0;
          overflow: hidden;
        }
        .dp-bg.fade-in { opacity: 0.7; }

        /* 真实场景图：低透明 + 柔化，仅作纹理，不压暗 */
        .dp-bg-cover {
          position: absolute;
          inset: -8%;
          background-size: cover;
          background-position: center;
          opacity: 0.2;
          filter: blur(8px) saturate(1.1);
          mix-blend-mode: normal;
          pointer-events: none;
        }

        /* 装饰光晕 */
        .dp-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.45;
          pointer-events: none;
        }
        .dp-glow-1 { width: 420px; height: 420px; top: -120px; right: -120px;
          background: radial-gradient(circle, rgba(255,255,255,0.85) 0%, transparent 70%); animation: dpfloat1 9s ease-in-out infinite; }
        .dp-glow-2 { width: 320px; height: 320px; bottom: 15%; left: -60px;
          background: radial-gradient(circle, rgba(255,255,255,0.65) 0%, transparent 70%); animation: dpfloat2 11s ease-in-out infinite; }
        .dp-glow-3 { width: 220px; height: 220px; top: 38%; right: 12%;
          background: radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 70%); animation: dpfloat3 13s ease-in-out infinite; }
        @keyframes dpfloat1 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-30px,20px) scale(1.1);} }
        @keyframes dpfloat2 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(20px,-30px) scale(1.05);} }
        @keyframes dpfloat3 { 0%,100%{transform:translate(0,0) scale(1);} 50%{transform:translate(-20px,-20px) scale(1.15);} }

        /* 内容层 */
        .dp-content {
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 18px 24px;
          box-sizing: border-box;
        }

        /* 顶部 */
        .dp-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          flex-shrink: 0;
          padding-top: 6px;
        }
        .dp-title {
          margin: 0;
          font-size: 30px;
          font-weight: 800;
          background: linear-gradient(135deg, #1F2937 0%, #4B5563 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          letter-spacing: 6px;
        }
        .dp-subtitle { margin: 4px 0 0; font-size: 12.5px; color: #6B7280; letter-spacing: 3px; }
        .dp-header-right { display: flex; align-items: center; gap: 10px; }

        .dp-place-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 10px 6px 12px; border-radius: 999px;
          background: rgba(255,255,255,0.72); backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.85);
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
        }
        .dp-place-dot { width: 8px; height: 8px; border-radius: 999px; box-shadow: 0 0 8px currentColor; }
        .dp-place-name { font-size: 13px; font-weight: 700; color: #374151; }
        .dp-place-thumb {
          width: 30px; height: 30px; border-radius: 8px; object-fit: cover;
          border: 1px solid rgba(255,255,255,0.9); box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
        .dp-gallery-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: 999px; cursor: pointer; font-family: inherit;
          font-size: 13px; font-weight: 700; color: #4B5563;
          background: rgba(255,255,255,0.72); backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.85);
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          transition: all 0.25s ease;
        }
        .dp-gallery-btn:hover { color: #F97316; border-color: #F97316; box-shadow: 0 4px 20px rgba(249,115,22,0.25); }
        .dp-gallery-ico { font-size: 14px; }

        /* 角色立绘 */
        .dp-characters {
          display: flex; justify-content: center; flex-wrap: wrap;
          gap: 14px; padding: 16px 0; flex-shrink: 0;
        }
        .dp-portrait {
          position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px;
          background: none; border: 0; cursor: pointer; padding: 0; font-family: inherit;
          opacity: 0.5; transform: scale(0.86); transition: all 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        .dp-portrait.active { opacity: 1; transform: scale(1); }
        .dp-portrait-glow {
          position: absolute; top: -8px; width: 78px; height: 78px; border-radius: 50%;
          background: var(--char-color); filter: blur(18px); opacity: 0; transition: opacity 0.5s ease;
        }
        .dp-portrait.active .dp-portrait-glow { opacity: 0.55; animation: dppulse 2.2s ease-in-out infinite; }
        @keyframes dppulse { 0%,100%{transform:scale(1);opacity:0.5;} 50%{transform:scale(1.18);opacity:0.8;} }
        .dp-portrait-frame {
          width: 64px; height: 64px; border-radius: 50%; overflow: hidden;
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7));
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 4px 18px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }
        .dp-portrait-img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
        .dp-portrait.active .dp-portrait-frame {
          border-color: var(--char-color); box-shadow: 0 4px 28px var(--char-color); transform: translateY(-4px);
        }
        .dp-portrait:hover { opacity: 0.95; transform: scale(0.94); }
        .dp-portrait-name { font-size: 11px; font-weight: 600; color: #6B7280; padding: 2px 9px; border-radius: 10px; background: rgba(255,255,255,0.7); transition: all 0.3s ease; }
        .dp-portrait.active .dp-portrait-name { color: var(--char-color); background: rgba(255,255,255,0.95); box-shadow: 0 2px 10px rgba(0,0,0,0.08); }

        /* 对话框 */
        .dp-dialog {
          flex: 1; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 18px;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .dp-dialog.transitioning { opacity: 0; transform: translateY(20px); }
        .dp-dialog-border {
          position: relative; width: 100%; max-width: 720px;
          background: rgba(255,255,255,0.86); backdrop-filter: blur(20px);
          border-radius: 20px; border: 2px solid rgba(255,255,255,0.92);
          padding: 30px 28px 24px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.5), inset 0 1px 0 rgba(255,255,255,0.8);
          animation: dpdialog 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes dpdialog { from{opacity:0;transform:translateY(30px) scale(0.95);} to{opacity:1;transform:translateY(0) scale(1);} }
        .dp-dialog-border::before {
          content: ''; position: absolute; inset: -2px; border-radius: 22px;
          background: linear-gradient(135deg, var(--accent), transparent, var(--accent));
          opacity: 0.35; z-index: -1; animation: dpborder 3s ease-in-out infinite;
        }
        @keyframes dpborder { 0%,100%{opacity:0.3;} 50%{opacity:0.6;} }
        .dp-name-tag {
          position: absolute; top: -14px; left: 24px; padding: 6px 16px; border-radius: 20px;
          font-size: 13px; font-weight: 700; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.15); letter-spacing: 1px;
        }
        .dp-dialog-text { font-size: 17px; line-height: 1.85; color: #374151; min-height: 64px; letter-spacing: 0.4px; }
        .dp-cursor { display: inline-block; animation: dpblink 0.8s infinite; color: var(--accent, #F97316); font-weight: bold; }
        @keyframes dpblink { 0%,50%{opacity:1;} 51%,100%{opacity:0;} }

        /* 选项按钮 */
        .dp-choices { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; animation: dpchoices 0.4s ease; }
        @keyframes dpchoices { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:translateY(0);} }
        .dp-choice-btn {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; border-radius: 14px; border: 1.5px solid rgba(0,0,0,0.08);
          background: rgba(255,255,255,0.72); backdrop-filter: blur(10px); cursor: pointer;
          font-family: inherit; font-size: 15px; color: #374151; position: relative; overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .dp-choice-btn::before {
          content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, var(--btn-accent), transparent);
          opacity: 0; transition: opacity 0.3s ease;
        }
        .dp-choice-btn:hover {
          transform: translateX(8px); border-color: var(--btn-accent);
          box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 0 30px var(--btn-accent); background: rgba(255,255,255,0.95);
        }
        .dp-choice-btn:hover::before { opacity: 0.1; }
        .dp-choice-btn:active { transform: translateX(4px) scale(0.98); }
        .dp-choice-text { position: relative; z-index: 1; font-weight: 500; }
        .dp-choice-arrow { position: relative; z-index: 1; opacity: 0; transform: translateX(-10px); transition: all 0.3s ease; color: var(--btn-accent); font-weight: bold; }
        .dp-choice-btn:hover .dp-choice-arrow { opacity: 1; transform: translateX(0); }

        /* 底部 */
        .dp-footer { display: flex; align-items: center; justify-content: space-between; padding: 8px 0 12px; flex-shrink: 0; gap: 12px; }
        .dp-ctrl-btn {
          padding: 8px 16px; border-radius: 20px; border: 1.5px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.72); backdrop-filter: blur(10px); font-family: inherit; font-size: 13px; color: #6B7280; cursor: pointer; transition: all 0.3s ease; flex-shrink: 0;
        }
        .dp-ctrl-btn:hover { background: rgba(255,255,255,0.95); border-color: #F97316; color: #F97316; box-shadow: 0 2px 15px rgba(249,115,22,0.2); }
        .dp-history-dots { display: flex; gap: 6px; overflow: hidden; }
        .dp-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(0,0,0,0.15); transition: all 0.3s ease; }
        .dp-dot.active { background: #F97316; transform: scale(1.3); box-shadow: 0 0 10px rgba(249,115,22,0.5); }
        .dp-cultivation { font-size: 11.5px; color: #9CA3AF; letter-spacing: 0.5px; flex-shrink: 0; }
        .dp-cultivation b { color: #F97316; }

        /* ===== 弹窗 ===== */
        .dp-modal-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(20,24,33,0.35); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 20px;
          animation: dpfade 0.25s ease;
        }
        @keyframes dpfade { from{opacity:0;} to{opacity:1;} }
        .dp-modal {
          position: relative; background: rgba(255,255,255,0.92); backdrop-filter: blur(20px);
          border-radius: 20px; border: 2px solid rgba(255,255,255,0.95);
          box-shadow: 0 24px 60px -20px rgba(16,20,30,0.4), 0 0 0 1px rgba(var(--accent-strip,99,102,241),0.2);
          padding: 24px; max-width: 560px; width: 100%; max-height: 86vh; overflow: auto;
          animation: dppop 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .dp-modal::before {
          content: ''; position: absolute; inset: -2px; border-radius: 22px;
          background: linear-gradient(135deg, var(--accent, #F97316), transparent, var(--accent, #F97316));
          opacity: 0.3; z-index: -1;
        }
        @keyframes dppop { from{opacity:0;transform:translateY(20px) scale(0.96);} to{opacity:1;transform:translateY(0) scale(1);} }
        .dp-modal-close {
          position: absolute; top: 12px; right: 14px; width: 30px; height: 30px; border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.1); background: rgba(255,255,255,0.8); color: #6B7280;
          font-size: 18px; line-height: 1; cursor: pointer; transition: all 0.2s ease; z-index: 2;
        }
        .dp-modal-close:hover { color: #EF4444; border-color: #EF4444; }

        /* 角色弹窗 */
        .dp-char-modal { text-align: center; max-width: 420px; }
        .dp-char-modal-imgwrap {
          width: 150px; height: 150px; margin: 6px auto 14px; border-radius: 24px; overflow: hidden;
          border: 3px solid var(--accent); box-shadow: 0 8px 30px var(--accent); background: #fff;
        }
        .dp-char-modal-img { width: 100%; height: 100%; object-fit: cover; object-position: top center; }
        .dp-char-modal-name { margin: 0; font-size: 22px; font-weight: 800; color: #1F2937; letter-spacing: 2px; }
        .dp-char-modal-title { font-size: 13px; font-weight: 700; margin: 4px 0 12px; letter-spacing: 1px; }
        .dp-char-modal-desc { margin: 0; font-size: 14px; line-height: 1.8; color: #4B5563; text-align: left; }

        /* 图鉴 */
        .dp-gallery-modal { max-width: 880px; }
        .dp-gallery-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .dp-tab {
          padding: 8px 18px; border-radius: 10px; border: 1px solid rgba(20,24,33,0.1); background: #f8f9fa;
          font-family: inherit; font-size: 13px; font-weight: 700; color: #6B7280; cursor: pointer; transition: all 0.2s ease;
        }
        .dp-tab.active { background: #fff; color: #F97316; border-color: #F97316; box-shadow: 0 2px 10px rgba(249,115,22,0.18); }
        .dp-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
        .dp-gallery-card {
          background: #fff; border: 1px solid rgba(20,24,33,0.08); border-radius: 14px; overflow: hidden;
          box-shadow: 0 2px 10px rgba(16,20,30,0.06); transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .dp-gallery-card:hover { transform: translateY(-3px); box-shadow: 0 10px 26px -14px rgba(16,20,30,0.25); }
        .dp-gallery-img { width: 100%; height: 150px; object-fit: cover; display: block; }
        .dp-gallery-img-round { height: 180px; }
        .dp-gallery-card-body { padding: 12px 14px 14px; }
        .dp-gallery-card-name { font-size: 15px; font-weight: 700; color: #1F2937; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
        .dp-gallery-card-title { font-size: 11.5px; font-weight: 600; color: var(--accent, #F97316); }
        .dp-gallery-card-desc { font-size: 12.5px; line-height: 1.7; color: #6B7280; margin-top: 6px; }

        @media (max-width: 640px) {
          .dp-title { font-size: 22px; letter-spacing: 3px; }
          .dp-characters { gap: 8px; }
          .dp-portrait-frame { width: 50px; height: 50px; }
          .dp-portrait-glow { width: 60px; height: 60px; }
          .dp-dialog-border { padding: 22px 16px 16px; }
          .dp-dialog-text { font-size: 15px; }
          .dp-choice-btn { padding: 12px 16px; font-size: 14px; }
          .dp-cultivation { display: none; }
          .dp-place-thumb { display: none; }
        }
      `}</style>
    </div>
  );
}
