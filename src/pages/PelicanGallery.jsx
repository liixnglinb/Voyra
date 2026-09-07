import React from 'react';

/* ============================================================
   AI 模型对比秀 · PelicanGallery
   16 个 AI 模型生成的「鹈鹕骑自行车」SVG 动画同题对比
   排序：按各 HTML 生成时间从新到旧（不分厂商大类）
   卡片：一个大框 = 模型名称 + 生成的画面，无多余元素
   画面：iframe 按各自 viewBox 比例适配，完整展示、不留黑边
   ============================================================ */

const ITEMS = [
  { file: 'glm-5.3-flash.html',     model: 'GLM-5.3 Flash',          ratio: '880/460' },
  { file: 'deepseek-v4-pro.html',   model: 'DeepSeek-V4 Pro 正式版',  ratio: '900/520' },
  { file: 'deepseek-v4-flash.html', model: 'DeepSeek-V4 Flash 正式版', ratio: '900/520' },
  { file: 'gpt56-sol-ulter.html',   model: 'gpt 5.6 sol Ulter',      ratio: '1600/900' },
  { file: 'qwen38-max.html',        model: 'Qwen3.8-Max',            ratio: '800/480', zoom: 1.62 },
  { file: 'qwen3.7-plus.html',      model: 'Qwen3.7-Plus',           ratio: '600/400' },
  { file: 'kimi-k3.html',           model: 'Kimi-K3',                ratio: '800/480' },
  { file: 'kimi-k2.6.html',         model: 'Kimi-k2.6',              ratio: '900/500' },
  { file: 'glm-5.1.html',           model: 'GLM-5.1',                ratio: '900/600' },
  { file: 'kimi-2.7-code.html',     model: 'Kimi-2.7-Code',          ratio: '1200/800' },
  { file: 'minmax-m3.html',         model: 'MinMax-M3',              ratio: '800/500' },
  { file: 'glm-5.3.html',           model: 'GLM-5.3',                ratio: '1000/600' },
  { file: 'glm-5.2.html',           model: 'GLM-5.2',                ratio: '920/520' },
  { file: 'hy3-workbuddy.html',     model: 'Hy3 (WorkBuddy)',        ratio: '800/460' },
  { file: 'doubao-2.1-turbo.html',  model: '豆包 2.1 Turbo',         ratio: '900/500' },
  { file: 'hy4-preview.html',       model: 'Hy4 preview',            ratio: '960/540' },
];

const TOTAL = ITEMS.length;

export const PELICAN_MODEL_COUNT = ITEMS.length;

export default function PelicanGallery() {
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
      /* —— 网格：一行两个，向下排列 —— */
      .pg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:42px}
      .pg-card{position:relative;display:flex;flex-direction:column;border:1px solid rgba(27,27,27,.12);border-radius:12px;background:#fff;overflow:hidden;content-visibility:auto;contain-intrinsic-size:auto 380px;transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s ease,border-color .3s ease}
      .pg-card:hover{transform:translateY(-4px);border-color:rgba(164,136,48,.6);box-shadow:0 20px 38px rgba(34,30,15,.12)}
      /* 模型名行：唯一文字信息 */
      .pg-bar{display:flex;align-items:baseline;gap:10px;padding:14px 16px 13px}
      .pg-seq{color:#c0b07a;font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}
      .pg-name{font-size:16px;font-weight:760;line-height:1;letter-spacing:-.01em;transition:color .2s ease}
      .pg-card:hover .pg-name{color:#a48830}
      /* 画面：iframe 按各自 viewBox 比例适配，无黑边 */
      .pg-frame{position:relative;background:#f2f3f5;overflow:hidden;border-radius:12px}
      .pg-frame iframe{display:block;width:100%;height:100%;position:absolute;inset:0;border:0;background:#fff;border-radius:12px}
      @media(max-width:900px){.pg-head-row{flex-direction:column;align-items:flex-start;gap:18px}.pg-stats{justify-content:flex-start;max-width:none}.pg-head h1{font-size:42px}.pg-grid{grid-template-columns:1fr}}
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

      <section className="pg-grid">
        {ITEMS.map((item, index) => (
          <article className="pg-card" key={item.file}>
            <div className="pg-bar">
              <span className="pg-seq">{String(index + 1).padStart(2, '0')}</span>
              <span className="pg-name">{item.model}</span>
            </div>
            <div className="pg-frame" style={{ aspectRatio: item.ratio }}>
              <iframe src={`/pelican-gallery/${item.file}`} loading="lazy" title={`${item.model} 生成的动画`} scrolling="no" style={item.zoom ? { transform: `scale(${item.zoom})`, transformOrigin: 'center' } : undefined} />
            </div>
          </article>
        ))}
      </section>

      <footer className="pg-foot" style={{ marginTop: '48px', paddingTop: '18px', borderTop: '1px solid rgba(27,27,27,.11)', color: '#999', fontSize: '12px', lineHeight: 1.9 }}>
        <p>模型署名均取自各 HTML 文件内部的标题 / meta / 注释 / 画面落款；排序依据为各文件的生成时间。部分版本自带控制按钮（暂停 / 变速 / 昼夜切换 / 滑块），直接在画面内操作即可体验。© 2026 Voyra®</p>
      </footer>
    </div>
  </div>;
}
