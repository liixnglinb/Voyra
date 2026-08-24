import React, { useState, useEffect, useRef, useCallback } from 'react';

/* ============================================================
   完美世界 · 视觉小说体验页
   - 粒子光效、渐变背景、打字机动画、分支选项、角色立绘切换
   - 风格：微光粒子，发光边框，柔和渐变，画面通透干净
   ============================================================ */

// ===== 故事数据 =====
const STORY_DATA = {
  start: {
    id: 'start',
    bg: 'dawn',
    character: 'shihao',
    characterName: '石昊',
    text: '大荒之中，万族林立。我名石昊，从石村走出，一路征战，只为守护心中所爱之人。',
    choices: [
      { text: '踏上修行之路', next: 'cultivation' },
      { text: '回忆石村岁月', next: 'village' },
    ],
  },
  cultivation: {
    id: 'cultivation',
    bg: 'mountain',
    character: 'shihao',
    characterName: '石昊',
    text: '搬血境、洞天境、化灵境……每一步都是生死考验。我以身化种，走出一条前无古人的道路。',
    choices: [
      { text: '挑战强敌', next: 'battle' },
      { text: '参悟大道', next: 'enlightenment' },
    ],
  },
  village: {
    id: 'village',
    bg: 'village',
    character: 'liushen',
    characterName: '柳神',
    text: '小不点，你回来了。这株老柳看着你长大，看着你从弱小的孩子，成长为顶天立地的荒天帝。',
    choices: [
      { text: '感谢柳神庇护', next: 'gratitude' },
      { text: '询问前路', next: 'future' },
    ],
  },
  battle: {
    id: 'battle',
    bg: 'war',
    character: 'anlan',
    characterName: '安澜',
    text: '赤锋矛，不朽盾，九天十地我为王！区区荒天也敢挡我？今日便让你见识真正的仙王之力！',
    choices: [
      { text: '「我身即火，万劫不烬！」', next: 'victory' },
      { text: '「男儿走四方，天下青山一样！」', next: 'victory' },
    ],
  },
  enlightenment: {
    id: 'enlightenment',
    bg: 'starry',
    character: 'shihao',
    characterName: '石昊',
    text: '他化自在，他化万古。我化自在大法，一念可化诸天万道，一念可照古今未来。',
    choices: [
      { text: '突破境界', next: 'breakthrough' },
      { text: '回归石村', next: 'village' },
    ],
  },
  gratitude: {
    id: 'gratitude',
    bg: 'village',
    character: 'shihao',
    characterName: '石昊',
    text: '柳神大人，若无您当年庇护，便没有今日的石昊。此恩此情，永生不忘。',
    choices: [
      { text: '继续前行', next: 'cultivation' },
      { text: '寻找故人', next: 'search' },
    ],
  },
  future: {
    id: 'future',
    bg: 'starry',
    character: 'liushen',
    characterName: '柳神',
    text: '前路漫漫，黑暗将至。但你要记住——一粒尘可填海，一根草斩尽日月星辰。你便是那道光。',
    choices: [
      { text: '直面黑暗', next: 'battle' },
      { text: '守护苍生', next: 'victory' },
    ],
  },
  victory: {
    id: 'victory',
    bg: 'dawn',
    character: 'shihao',
    characterName: '荒天帝',
    text: '独断万古荒天帝，唯负罪州火桑女。我平定黑暗动乱，只为给后世留下一片完美的世界。',
    choices: [
      { text: '重新开始', next: 'start' },
    ],
  },
  breakthrough: {
    id: 'breakthrough',
    bg: 'starry',
    character: 'shihao',
    characterName: '石昊',
    text: '轰——！天地共鸣，万道臣服。我终于突破桎梏，踏入传说中的境界。这，只是开始。',
    choices: [
      { text: '继续征战', next: 'battle' },
      { text: '回归平静', next: 'victory' },
    ],
  },
  search: {
    id: 'search',
    bg: 'war',
    character: 'huoer',
    characterName: '火灵儿',
    text: '石昊……你终于来了。我在火桑树下等了你很久，很久。两百万年，只为再看你一眼。',
    choices: [
      { text: '「我回来了」', next: 'victory' },
      { text: '「此生不负」', next: 'victory' },
    ],
  },
};

// ===== 角色配置 =====
const CHARACTERS = {
  shihao: {
    name: '石昊',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    avatar: '🗡️',
  },
  liushen: {
    name: '柳神',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    avatar: '🌿',
  },
  anlan: {
    name: '安澜',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
    avatar: '⚔️',
  },
  huoer: {
    name: '火灵儿',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
    avatar: '🔥',
  },
};

// ===== 背景配置 =====
const BACKGROUNDS = {
  dawn: {
    gradient: 'linear-gradient(180deg, #FFF7ED 0%, #FED7AA 50%, #FDBA74 100%)',
    particles: '#F97316',
  },
  mountain: {
    gradient: 'linear-gradient(180deg, #F0F9FF 0%, #BAE6FD 50%, #7DD3FC 100%)',
    particles: '#0EA5E9',
  },
  village: {
    gradient: 'linear-gradient(180deg, #F0FDF4 0%, #BBF7D0 50%, #86EFAC 100%)',
    particles: '#22C55E',
  },
  war: {
    gradient: 'linear-gradient(180deg, #FFF1F2 0%, #FECDD3 50%, #FDA4AF 100%)',
    particles: '#F43F5E',
  },
  starry: {
    gradient: 'linear-gradient(180deg, #FAF5FF 0%, #E9D5FF 50%, #D8B4FE 100%)',
    particles: '#A855F7',
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
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    // 初始化粒子
    const particleCount = 50;
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
        
        // 发光效果
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
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}

// ===== 打字机文本组件 =====
function TypewriterText({ text, onComplete, speed = 50 }) {
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
      {!isComplete && <span className="cursor">|</span>}
    </span>
  );
}

// ===== 角色立绘组件 =====
function CharacterPortrait({ character, isActive }) {
  const charData = CHARACTERS[character] || CHARACTERS.shihao;
  
  return (
    <div
      className={`character-portrait ${isActive ? 'active' : ''}`}
      style={{
        '--char-color': charData.color,
        '--char-gradient': charData.gradient,
      }}
    >
      <div className="character-glow" />
      <div className="character-avatar">
        <span className="character-emoji">{charData.avatar}</span>
      </div>
      <div className="character-name-tag">{charData.name}</div>
    </div>
  );
}

// ===== 主组件 =====
export default function PerfectWorld() {
  const [currentScene, setCurrentScene] = useState('start');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [textComplete, setTextComplete] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [history, setHistory] = useState(['start']);
  const [fadeIn, setFadeIn] = useState(true);

  const scene = STORY_DATA[currentScene] || STORY_DATA.start;
  const bg = BACKGROUNDS[scene.bg] || BACKGROUNDS.dawn;
  const character = CHARACTERS[scene.character] || CHARACTERS.shihao;

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
    <div className="pw-root">
      {/* 背景层 */}
      <div
        className={`pw-bg ${fadeIn ? 'fade-in' : ''}`}
        style={{ background: bg.gradient }}
      >
        <Particles color={bg.particles} />
        
        {/* 装饰性光晕 */}
        <div className="pw-glow pw-glow-1" />
        <div className="pw-glow pw-glow-2" />
        <div className="pw-glow pw-glow-3" />
      </div>

      {/* 内容层 */}
      <div className="pw-content">
        {/* 顶部标题 */}
        <header className="pw-header">
          <h1 className="pw-title">完美世界</h1>
          <p className="pw-subtitle">一粒尘可填海，一根草斩尽日月星辰</p>
        </header>

        {/* 角色立绘区域 */}
        <div className="pw-characters">
          {Object.entries(CHARACTERS).map(([key, char]) => (
            <CharacterPortrait
              key={key}
              character={key}
              isActive={key === scene.character}
            />
          ))}
        </div>

        {/* 对话框 */}
        <div className={`pw-dialog ${isTransitioning ? 'transitioning' : ''}`}>
          <div className="pw-dialog-border" style={{ '--accent': character.color }}>
            <div className="dialog-name-tag" style={{ background: character.gradient }}>
              {scene.characterName}
            </div>
            
            <div className="dialog-text">
              <TypewriterText
                key={currentScene}
                text={scene.text}
                onComplete={handleTextComplete}
                speed={60}
              />
            </div>

            {/* 选项按钮 */}
            {showChoices && (
              <div className="dialog-choices">
                {scene.choices.map((choice, index) => (
                  <button
                    key={index}
                    className="choice-btn"
                    style={{ '--btn-accent': character.color }}
                    onClick={() => handleChoice(choice.next)}
                  >
                    <span className="choice-text">{choice.text}</span>
                    <span className="choice-arrow">→</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 底部控制栏 */}
        <footer className="pw-footer">
          <button className="ctrl-btn" onClick={handleRestart} title="重新开始">
            ↺ 重新开始
          </button>
          <div className="history-dots">
            {history.map((_, i) => (
              <span key={i} className={`dot ${i === history.length - 1 ? 'active' : ''}`} />
            ))}
          </div>
        </footer>
      </div>

      {/* 全局样式 */}
      <style>{`
        /* ===== 根容器 ===== */
        .pw-root {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
        }

        /* ===== 背景层 ===== */
        .pw-bg {
          position: absolute;
          inset: 0;
          transition: background 0.8s ease;
          z-index: 0;
        }
        .pw-bg.fade-in {
          opacity: 0.7;
        }

        /* ===== 装饰光晕 ===== */
        .pw-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          pointer-events: none;
        }
        .pw-glow-1 {
          width: 400px;
          height: 400px;
          top: -100px;
          right: -100px;
          background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
          animation: float1 8s ease-in-out infinite;
        }
        .pw-glow-2 {
          width: 300px;
          height: 300px;
          bottom: 20%;
          left: -50px;
          background: radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%);
          animation: float2 10s ease-in-out infinite;
        }
        .pw-glow-3 {
          width: 200px;
          height: 200px;
          top: 40%;
          right: 10%;
          background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%);
          animation: float3 12s ease-in-out infinite;
        }

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 20px) scale(1.1); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(20px, -30px) scale(1.05); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, -20px) scale(1.15); }
        }

        /* ===== 内容层 ===== */
        .pw-content {
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 20px 24px;
          box-sizing: border-box;
        }

        /* ===== 顶部标题 ===== */
        .pw-header {
          text-align: center;
          padding-top: 10px;
          flex-shrink: 0;
        }
        .pw-title {
          margin: 0;
          font-size: 32px;
          font-weight: 800;
          background: linear-gradient(135deg, #1F2937 0%, #4B5563 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 4px;
        }
        .pw-subtitle {
          margin: 6px 0 0;
          font-size: 13px;
          color: #6B7280;
          letter-spacing: 2px;
        }

        /* ===== 角色立绘区域 ===== */
        .pw-characters {
          display: flex;
          justify-content: center;
          gap: 20px;
          padding: 20px 0;
          flex-shrink: 0;
        }

        .character-portrait {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          opacity: 0.4;
          transform: scale(0.85);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .character-portrait.active {
          opacity: 1;
          transform: scale(1);
        }

        .character-glow {
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--char-gradient);
          filter: blur(20px);
          opacity: 0;
          transition: opacity 0.5s ease;
          top: -10px;
        }
        .character-portrait.active .character-glow {
          opacity: 0.6;
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }

        .character-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
        }
        .character-portrait.active .character-avatar {
          border-color: var(--char-color);
          box-shadow: 0 4px 30px var(--char-color);
          transform: translateY(-5px);
        }

        .character-emoji {
          font-size: 28px;
        }

        .character-name-tag {
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          padding: 3px 10px;
          border-radius: 10px;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(5px);
          transition: all 0.3s ease;
        }
        .character-portrait.active .character-name-tag {
          color: var(--char-color);
          background: rgba(255,255,255,0.95);
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        /* ===== 对话框 ===== */
        .pw-dialog {
          flex: 1;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 20px;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .pw-dialog.transitioning {
          opacity: 0;
          transform: translateY(20px);
        }

        .pw-dialog-border {
          position: relative;
          width: 100%;
          max-width: 700px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 2px solid rgba(255, 255, 255, 0.9);
          padding: 30px 28px 24px;
          box-shadow: 
            0 10px 40px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(255, 255, 255, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          animation: dialog-appear 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes dialog-appear {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* 发光边框效果 */
        .pw-dialog-border::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 22px;
          background: linear-gradient(135deg, var(--accent), transparent, var(--accent));
          opacity: 0.3;
          z-index: -1;
          animation: border-glow 3s ease-in-out infinite;
        }

        @keyframes border-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        .dialog-name-tag {
          position: absolute;
          top: -14px;
          left: 24px;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          color: white;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
          letter-spacing: 1px;
        }

        .dialog-text {
          font-size: 17px;
          line-height: 1.8;
          color: #374151;
          min-height: 60px;
          letter-spacing: 0.5px;
        }

        .cursor {
          display: inline-block;
          animation: blink 0.8s infinite;
          color: var(--accent, #6366F1);
          font-weight: bold;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* ===== 选项按钮 ===== */
        .dialog-choices {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 20px;
          animation: choices-appear 0.4s ease;
        }

        @keyframes choices-appear {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .choice-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-radius: 14px;
          border: 1.5px solid rgba(0, 0, 0, 0.08);
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          cursor: pointer;
          font-family: inherit;
          font-size: 15px;
          color: #374151;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .choice-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--btn-accent), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .choice-btn:hover {
          transform: translateX(8px);
          border-color: var(--btn-accent);
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.08),
            0 0 30px var(--btn-accent);
          background: rgba(255, 255, 255, 0.95);
        }

        .choice-btn:hover::before {
          opacity: 0.1;
        }

        .choice-btn:active {
          transform: translateX(4px) scale(0.98);
        }

        .choice-text {
          position: relative;
          z-index: 1;
          font-weight: 500;
        }

        .choice-arrow {
          position: relative;
          z-index: 1;
          opacity: 0;
          transform: translateX(-10px);
          transition: all 0.3s ease;
          color: var(--btn-accent);
          font-weight: bold;
        }

        .choice-btn:hover .choice-arrow {
          opacity: 1;
          transform: translateX(0);
        }

        /* ===== 底部控制栏 ===== */
        .pw-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0 15px;
          flex-shrink: 0;
        }

        .ctrl-btn {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1.5px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          font-family: inherit;
          font-size: 13px;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .ctrl-btn:hover {
          background: rgba(255, 255, 255, 0.95);
          border-color: #6366F1;
          color: #6366F1;
          box-shadow: 0 2px 15px rgba(99, 102, 241, 0.2);
        }

        .history-dots {
          display: flex;
          gap: 6px;
        }

        .history-dots .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
        }

        .history-dots .dot.active {
          background: #6366F1;
          transform: scale(1.3);
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
        }

        /* ===== 响应式 ===== */
        @media (max-width: 640px) {
          .pw-title {
            font-size: 24px;
          }
          .pw-characters {
            gap: 12px;
          }
          .character-avatar {
            width: 50px;
            height: 50px;
          }
          .character-emoji {
            font-size: 22px;
          }
          .pw-dialog-border {
            padding: 24px 18px 18px;
          }
          .dialog-text {
            font-size: 15px;
          }
          .choice-btn {
            padding: 12px 16px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
