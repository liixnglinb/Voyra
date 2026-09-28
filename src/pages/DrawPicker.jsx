import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dices, Plus, RotateCcw, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';

/* 随机抽人 · 站内小工具
   导入花名册（.xlsx / .xls / .csv）自动扫描识别姓名，或手动添加 / 删除；
   设置人数一键随机抽取（Fisher-Yates 洗牌），可选「抽中后不再参与」。
   全程在本机浏览器完成，不上传任何数据。 */

const HEADER_WORDS = /^(姓名|名字|名单|学生|学员|序号|编号|学号|工号|考号|班级|小组|性别|年龄|民族|生日|出生日期|电话|手机|手机号|邮箱|部门|职位|职务|身份|身份证|备注|签到|出勤|总?合计|统计|花名册|人员|成员|no\.?|id|name|index|number|gender|sex|age|phone|email|class|group|remark|note)$/i;

const BAD_CHARS = /[\d@#$%^&*()_+=\[\]{};:"\\|,.<>\/?~`！＠＃￥％…—＝［］｛｝；：＇｜＼，。＜＞？]/;

function normalizeName(raw) {
  const s = String(raw).trim().replace(/\s+/g, ' ');
  if (s.length < 2 || s.length > 20) return null;
  if (HEADER_WORDS.test(s)) return null;
  if (BAD_CHARS.test(s)) return null;
  if (/[\u4e00-\u9fa5]/.test(s)) return /^[\u4e00-\u9fa5a-zA-Z· ]+$/.test(s) ? s : null;
  if (/^[a-zA-Z][a-zA-Z' -]+$/.test(s) && s.includes(' ')) return s;
  return null;
}

const CONFETTI_COLORS = ['#A48830', '#c9a84c', '#ffe08a', '#211E19', '#8D8880', '#E7E1D2'];

export default function DrawPicker() {
  const [names, setNames] = useState([]);
  const [remaining, setRemaining] = useState([]);
  const [fileName, setFileName] = useState('');
  const [count, setCount] = useState(1);
  const [excludeDrawn, setExcludeDrawn] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [stage, setStage] = useState('？');
  const [stageFinal, setStageFinal] = useState(false);
  const [results, setResults] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const timersRef = useRef([]);
  const canvasRef = useRef(null);
  const confettiRef = useRef({ parts: [], running: false });
  const liveRef = useRef({ names: [], remaining: [], rolling: false, count: 1, exclude: true });

  /* liveRef 供定时器回调读到最新状态，避免闭包旧值 */
  useEffect(() => {
    liveRef.current = { names, remaining, rolling, count, exclude: excludeDrawn };
  }, [names, remaining, rolling, count, excludeDrawn]);

  useEffect(() => () => { timersRef.current.forEach((t) => clearTimeout(t)); }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return undefined;
    const fit = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const later = useCallback((fn, ms) => { timersRef.current.push(setTimeout(fn, ms)); }, []);
  const say = useCallback((msg, isErr = false) => {
    setToast({ msg, isErr });
    later(() => setToast(null), 2400);
  }, [later]);

  /* ---------- 导入识别 ---------- */
  const readFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
        const found = [];
        wb.SheetNames.forEach((sn) => {
          XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: '' }).forEach((row) => {
            row.forEach((cell) => {
              const name = normalizeName(cell);
              if (name && !found.includes(name)) found.push(name);
            });
          });
        });
        if (!found.length) { say('未识别到姓名，请检查文件内容', true); return; }
        const prevNames = liveRef.current.names;
        const merged = [...prevNames];
        const newRemaining = [...liveRef.current.remaining];
        found.forEach((n) => {
          if (!merged.some((x) => x.toLowerCase() === n.toLowerCase())) {
            merged.push(n);
            newRemaining.push(n);
          }
        });
        setNames(merged);
        setRemaining(newRemaining);
        setFileName(file.name);
        setResults([]);
        setStage('？');
        setStageFinal(false);
        say(`已导入并识别 ${found.length} 人`);
      } catch (err) {
        say('文件解析失败：' + err.message, true);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [say]);

  /* ---------- 手动添加 / 删除 ---------- */
  const addName = () => {
    const cur = liveRef.current;
    if (cur.rolling) return;
    const s = draft.trim().replace(/\s+/g, ' ');
    if (!s) { say('请输入姓名', true); return; }
    if (s.length > 20) { say('姓名过长（最多 20 字）', true); return; }
    if (/^\d+$/.test(s) || HEADER_WORDS.test(s)) { say('请输入有效姓名', true); return; }
    if (cur.names.some((x) => x.toLowerCase() === s.toLowerCase())) { say('该姓名已存在', true); return; }
    setNames([...cur.names, s]);
    setRemaining([...cur.remaining, s]);
    setDraft('');
    say(`已添加「${s}」`);
  };

  const deleteName = (name) => {
    if (liveRef.current.rolling) return;
    setNames((p) => p.filter((n) => n !== name));
    setRemaining((p) => p.filter((n) => n !== name));
    say(`已删除「${name}」`);
  };

  const resetAll = () => {
    if (liveRef.current.rolling) return;
    setRemaining([...liveRef.current.names]);
    setResults([]);
    setStage('？');
    setStageFinal(false);
  };

  /* ---------- 抽取 ---------- */
  const draw = () => {
    const cur = liveRef.current;
    /* 未勾选「抽中后不再参与」时，全员恢复可抽 */
    const pool = [...(cur.exclude ? cur.remaining : cur.names)];
    if (cur.rolling || !pool.length) return;
    const n = Math.max(1, Math.min(parseInt(cur.count, 10) || 1, pool.length));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const winners = pool.slice(0, n);
    setRolling(true);
    setResults([]);
    setStageFinal(false);
    setStage(pool[Math.floor(Math.random() * pool.length)]);
    let delay = 50;
    let elapsed = 0;
    const tick = () => {
      setStage(pool[Math.floor(Math.random() * pool.length)]);
      elapsed += delay;
      if (elapsed >= 2100) { reveal(winners, cur.exclude); return; }
      delay = Math.min(delay * 1.09, 300);
      later(tick, delay);
    };
    later(tick, delay);
  };

  const reveal = (winners, exclude) => {
    setRolling(false);
    setStage(winners[0]);
    setStageFinal(true);
    let d = 0;
    winners.forEach((name) => {
      later(() => {
        setResults((p) => [...p, name]);
        if (winners.length > 1) burst(55);
      }, d);
      d += 380;
    });
    later(() => {
      if (exclude) setRemaining((p) => p.filter((x) => !winners.includes(x)));
      burst(winners.length === 1 ? 130 : 80);
    }, d + 120);
  };

  /* ---------- 金色彩带 ---------- */
  const burst = (count) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parts = confettiRef.current;
    for (let i = 0; i < count; i++) {
      parts.parts.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 300,
        y: canvas.height * 0.32 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 9 - 3,
        w: Math.random() * 8 + 4,
        h: Math.random() * 5 + 3,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.25,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        life: 110,
      });
    }
    if (!parts.running) { parts.running = true; requestAnimationFrame(loop); }
  };

  const loop = () => {
    const canvas = canvasRef.current;
    const parts = confettiRef.current;
    if (!canvas) { parts.parts = []; parts.running = false; return; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.parts = parts.parts.filter((p) => p.life > 0);
    parts.parts.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.vx *= 0.99; p.rot += p.vr; p.life -= 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, p.life / 40);
      ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (parts.parts.length) requestAnimationFrame(loop);
    else { parts.running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  };

  /* 勾选「抽中后不再参与」时池子为剩余名单，否则全员可抽 */
  const pool = excludeDrawn ? remaining : names;

  return (
    <div className="dp-page">
      {/* 导入识别 */}
      <section className="dp-card">
        <div
          className={`dp-drop${dragOver ? ' is-over' : ''}`}
          onClick={() => fileRef.current && fileRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files[0]); }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={(e) => { if (e.target.files[0]) readFile(e.target.files[0]); e.target.value = ''; }}
          />
          <Upload size={26} strokeWidth={1.8} className="dp-drop-icon" />
          <div className="dp-drop-text"><strong>点击选择</strong> 或拖拽花名册文件到此处</div>
          <div className="dp-drop-hint">支持 .xlsx / .xls / .csv，自动扫描识别姓名，也可在下方手动添加</div>
        </div>
        {fileName && <div className="dp-file-ok">✅ 已导入 {fileName}（当前共 {names.length} 人）</div>}
      </section>

      {/* 名单管理 */}
      <section className="dp-card">
        <div className="dp-card-head">
          <h2>名单 <span className="dp-badge">{pool.length} 人</span></h2>
          <button className="dp-ghost" onClick={resetAll}><RotateCcw size={13} /> 重置名单</button>
        </div>
        <div className="dp-add-row">
          <input
            value={draft}
            placeholder="输入姓名，回车或点击添加"
            maxLength={20}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addName(); }}
          />
          <button className="dp-dark" onClick={addName}><Plus size={15} /> 添加</button>
        </div>
        {names.length === 0
          ? <div className="dp-empty">还没有名单 —— 导入花名册，或在上方手动添加姓名</div>
          : (
            <div className="dp-grid">
              {names.map((name, i) => (
                <div key={name} className={`dp-chip${pool.includes(name) ? '' : ' is-taken'}`} style={{ animationDelay: `${Math.min(i * 14, 400)}ms` }}>
                  <span className="dp-idx">{i + 1}</span>{name}
                  <button className="dp-chip-x" title="删除" onClick={() => deleteName(name)}><X size={11} /></button>
                </div>
              ))}
            </div>
          )}
      </section>

      {/* 抽取 */}
      <section className="dp-card">
        <div className="dp-controls">
          <label>
            抽取人数
            <input
              type="number"
              min={1}
              max={Math.max(pool.length, 1)}
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </label>
          <label className="dp-check">
            <input type="checkbox" checked={excludeDrawn} onChange={(e) => setExcludeDrawn(e.target.checked)} />
            {' '}抽中后不再参与
          </label>
          <button className="dp-primary" disabled={rolling || pool.length === 0} onClick={draw}>
            <Dices size={16} /> {rolling ? '抽取中…' : pool.length === 0 ? '名单已抽完' : '开始抽取'}
          </button>
        </div>
        <div className={`dp-stage${rolling ? ' is-rolling' : ''}${stageFinal ? ' is-final' : ''}`}><span>{stage}</span></div>
        {results.length > 0 && (
          <div className="dp-result">
            <h3>🎉 恭喜以下人员被抽中</h3>
            <div className="dp-result-list">
              {results.map((name, i) => <div key={name + i} className="dp-winner">{name}</div>)}
            </div>
          </div>
        )}
      </section>

      <canvas ref={canvasRef} className="dp-confetti" />
      {toast && <div className={`dp-toast${toast.isErr ? ' is-err' : ''}`}>{toast.msg}</div>}

      <style>{`
        .dp-page{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
        .dp-card{background:#fff;border:1px solid rgba(20,24,33,.08);border-radius:14px;padding:20px;box-shadow:0 1px 2px rgba(16,20,30,.04)}
        .dp-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
        .dp-card-head h2{margin:0;font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px}
        .dp-badge{background:#A48830;color:#fff;border-radius:999px;font-size:11px;padding:2px 9px;font-weight:700}
        .dp-drop{border:1.5px dashed rgba(20,24,33,.18);border-radius:12px;padding:26px 18px;text-align:center;cursor:pointer;transition:border-color .25s,background .25s;background:#fafbfc}
        .dp-drop:hover,.dp-drop.is-over{border-color:#A48830;background:#fdfbf4}
        .dp-drop-icon{color:#A48830;margin-bottom:6px}
        .dp-drop-text{font-size:13.5px;color:#212529}
        .dp-drop-text strong{color:#A48830}
        .dp-drop-hint{margin-top:4px;font-size:11.5px;color:#868e96}
        .dp-file-ok{margin-top:10px;font-size:12.5px;color:#A48830;font-weight:600}
        .dp-add-row{display:flex;gap:8px;margin-bottom:12px}
        .dp-add-row input{flex:1;min-width:0;padding:9px 12px;border:1px solid rgba(20,24,33,.14);border-radius:10px;font-size:13px;outline:none;transition:border-color .2s,box-shadow .2s;background:#fafbfc;color:#212529}
        .dp-add-row input:focus{border-color:#A48830;box-shadow:0 0 0 3px rgba(164,136,48,.12)}
        .dp-dark{display:inline-flex;align-items:center;gap:5px;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;background:#212529;color:#ffe08a;transition:background .2s;font-family:inherit}
        .dp-dark:hover{background:#343a40}
        .dp-ghost{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(20,24,33,.12);border-radius:9px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:#6c757d;transition:all .2s;font-family:inherit}
        .dp-ghost:hover{border-color:#212529;color:#212529}
        .dp-empty{padding:18px;text-align:center;font-size:12.5px;color:#868e96;background:#fafbfc;border-radius:10px}
        .dp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;max-height:264px;overflow:auto;padding-right:2px}
        .dp-grid::-webkit-scrollbar{width:5px}
        .dp-grid::-webkit-scrollbar-thumb{background:rgba(20,24,33,.15);border-radius:3px}
        .dp-chip{position:relative;display:flex;align-items:center;justify-content:center;padding:9px 6px;background:#fafbfc;border:1px solid rgba(20,24,33,.1);border-radius:10px;font-size:13px;font-weight:600;color:#212529;transition:border-color .25s,opacity .25s,filter .25s;animation:dp-pop .35s cubic-bezier(.22,1,.36,1) both}
        @keyframes dp-pop{from{transform:scale(.7);opacity:0}to{transform:scale(1);opacity:1}}
        .dp-chip:hover{border-color:#A48830}
        .dp-chip .dp-idx{position:absolute;top:2px;left:5px;font-size:9px;color:#adb5bd;font-weight:500}
        .dp-chip.is-taken{opacity:.3;filter:grayscale(1)}
        .dp-chip-x{position:absolute;top:-1px;right:-1px;display:flex;align-items:center;justify-content:center;width:19px;height:19px;border:none;border-radius:0 10px 0 9px;background:#212529;color:#fff;cursor:pointer;opacity:0;transition:opacity .2s,background .2s}
        .dp-chip:hover .dp-chip-x{opacity:.85}
        .dp-chip-x:hover{background:#e03131;opacity:1}
        @media (hover:none){.dp-chip-x{opacity:.7}}
        .dp-controls{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:12px}
        .dp-controls label{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:#495057}
        .dp-controls input[type="number"]{width:64px;padding:7px 8px;border:1px solid rgba(20,24,33,.14);border-radius:9px;text-align:center;font-size:13px;outline:none;background:#fafbfc;color:#212529;transition:border-color .2s}
        .dp-controls input[type="number"]:focus{border-color:#A48830}
        .dp-check input{width:15px;height:15px;accent-color:#A48830}
        .dp-primary{display:inline-flex;align-items:center;gap:7px;border:none;border-radius:10px;padding:10px 22px;font-size:13.5px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#A48830,#c9a84c);color:#fff;transition:transform .2s,box-shadow .2s,opacity .2s;font-family:inherit}
        .dp-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 16px rgba(164,136,48,.35)}
        .dp-primary:disabled{opacity:.45;cursor:not-allowed}
        .dp-stage{display:flex;align-items:center;justify-content:center;min-height:108px;background:#fafbfc;border:1px solid rgba(20,24,33,.08);border-radius:12px}
        .dp-stage span{font-size:38px;font-weight:800;letter-spacing:.18em;color:#212529}
        .dp-stage.is-rolling span{animation:dp-flick .09s linear infinite}
        @keyframes dp-flick{0%{opacity:.5;transform:scale(.98)}50%{opacity:1;transform:scale(1.02)}100%{opacity:.5;transform:scale(.98)}}
        .dp-stage.is-final span{background:linear-gradient(135deg,#A48830 20%,#e6c868 80%);-webkit-background-clip:text;background-clip:text;color:transparent;animation:dp-zoom .45s cubic-bezier(.22,1.4,.36,1)}
        @keyframes dp-zoom{from{transform:scale(2.4);opacity:0}to{transform:scale(1);opacity:1}}
        .dp-result{margin-top:14px;text-align:center}
        .dp-result h3{margin:0 0 10px;font-size:12.5px;font-weight:800;color:#A48830}
        .dp-result-list{display:flex;flex-wrap:wrap;gap:9px;justify-content:center}
        .dp-winner{background:#fdf6e3;border:1px solid #A48830;border-radius:10px;padding:10px 18px;font-size:14.5px;font-weight:800;color:#212529;box-shadow:0 2px 10px rgba(164,136,48,.15);animation:dp-zoom .4s cubic-bezier(.22,1.4,.36,1) both}
        .dp-confetti{position:fixed;inset:0;pointer-events:none;z-index:60}
        .dp-toast{position:fixed;top:18px;left:50%;transform:translateX(-50%);background:#212529;color:#fff;padding:9px 20px;border-radius:10px;font-size:12.5px;font-weight:600;z-index:70;box-shadow:0 6px 18px rgba(0,0,0,.18);animation:dp-toast-in .25s}
        .dp-toast.is-err{background:#e03131}
        @keyframes dp-toast-in{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translate(-50%,0)}}
        @media (prefers-reduced-motion:reduce){.dp-page *{animation:none!important;transition:none!important}}
      `}</style>
    </div>
  );
}
