import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';

/* ============================================================
   AI 动画画廊 · PelicanGallery
   19 个 AI 模型生成的「鹈鹕骑自行车」SVG 动画同题对比
   布局：一行两个、向下排列，所有动效同时运行
   风格：黑白灰极简 + 金色点缀（#A48830 / #ffe08a），与首页一致
   ============================================================ */

const GALLERY = [
  {
    group: '豆包 Doubao', color: '#7C5CFF', items: [
      { file: 'doubao-2.1-turbo.html', model: '豆包 2.1 Turbo', orig: 'pelican_cycling_doubao_2.1_turbo.html', size: 18720, tags: ['纯 SVG+CSS', '轮子·踏板·身体起伏', '速度线'], note: '浅蓝渐变天空，橙色双腿蹬踏节奏明快，画面带速度线与地面阴影。' },
    ],
  },
  {
    group: 'Qwen', color: '#615CED', items: [
      { file: 'qwen38-max.html', model: 'Qwen3.8-Max', orig: 'pelican-bicycle.html', size: 13234, tags: ['纯 SVG+SMIL', '太阳光旋', '云漂移'], note: '白卡居中布局，太阳光芒 24s 缓转、云朵错时漂移，风格简洁干净。' },
      { file: 'qwen3.7-plus.html', model: 'Qwen3.7-Plus', orig: 'pelican-riding-bicycle-Qwen3.7-Plus.html', size: 15121, tags: ['CSS 动画', '渐变天空'], note: '天蓝渐变背景，带主标题与斜体模型署名。' },
    ],
  },
  {
    group: 'GLM 智谱', color: '#4A7DFF', items: [
      { file: 'glm-5.3.html', model: 'GLM-5.3', orig: 'pelican_cycling_glm-5.3.html', size: 26258, tags: ['深色主题', '金色标题', '1000×600 宽幅'], note: '深蓝径向渐变 + 金色大标题，画幅最宽的一版。' },
      { file: 'glm-5.2.html', model: 'GLM-5.2', orig: 'pelican-cycling-glm-5.2.html', size: 15327, tags: ['CSS 动画', '太阳 50s 慢转', '路面条纹滚动'], note: '太阳光芒 50 秒一圈，三层云朵错时漂移，路面条纹滚动出速度感。' },
      { file: 'glm-5.1.html', model: 'GLM-5.1', orig: 'pelican-cycling-glm5.1.html', size: 33966, tags: ['9 组关键帧', '翅膀·眨眼·喉囊', '鱼摆尾·尘埃'], note: '动效最密集的一版：9 组关键帧覆盖翅膀、眨眼、喉囊、鱼摆尾与尘土。' },
      { file: 'glm-5v-turbo.html', model: 'GLM-5v-Turbo', orig: 'pelican_cycling_GLM-5v-Turbo.html', size: 19395, tags: ['四联动', '腿部踩踏'], note: '轮子、踏板、身体起伏与腿部踩踏四组动画同步联动。' },
    ],
  },
  {
    group: 'Kimi 月之暗面', color: '#8A63D2', items: [
      { file: 'kimi-k3.html', model: 'Kimi-K3', orig: 'pelican_cycling_Kimi-K3.html', size: 24133, tags: ['深色主题', '辐条旋转', '角标徽章'], note: '深色舞台 + 右下角玻璃徽章，辐条 0.72s 高速旋转。' },
      { file: 'kimi-2.7-code.html', model: 'Kimi-2.7-Code', orig: 'pelican_cycling_Kimi-2.7-Code.html', size: 25341, tags: ['全屏 SVG', '底部控制面板', '滑块调节'], note: '全屏场景 + 毛玻璃控制面板，支持滑块调节的交互版本。' },
      { file: 'kimi-k2.6.html', model: 'Kimi-k2.6', orig: 'pelican-cycling-Kimi-k2.6.html', size: 30163, tags: ['云朵漂移', 'drop-shadow'], note: '蓝绿渐变 + 三层错时云朵，SVG 带柔和投影。' },
    ],
  },
  {
    group: 'DeepSeek', color: '#4D6BFE', items: [
      { file: 'deepseek-v4-pro.html', model: 'DeepSeek-V4-Pro 正式版', orig: '鹈鹕骑自行车.html', size: 13925, tags: ['data-model 标注', '云·太阳·翅膀', '页脚署名'], note: 'html 标签用 data-model 标注模型，云、太阳光芒与翅膀联动。' },
      { file: 'deepseek-official.html', model: 'DeepSeek 正式版', orig: 'pelican_bicycle.html', size: 12401, tags: ['深蓝底白卡', '链条传动动画'], note: '深色底白色卡片，链条虚线传动的细节独此一版。' },
      { file: 'deepseek-v4-flash.html', model: 'Deepseek-V4-Flash', orig: 'pelican_cycling_deepseek_v4_flash.html', size: 33846, tags: ['光线旋转', '速度线', 'credit 淡入'], note: '光芒 46s 旋转、虚线流动、多组速度线 + 落款淡入。' },
    ],
  },
  {
    group: 'GPT OpenAI', color: '#10A37F', items: [
      { file: 'gpt56-sol-ulter.html', model: 'gpt 5.6 sol Ulter', orig: 'pelican-bicycle-gpt-5.6-sol-ulter.html', size: 36736, tags: ['全屏场景', '控制坞', '0.65x / 1x / 1.45x 变速'], note: '功能最全：底部控制坞支持暂停与三档变速，JS 驱动。' },
      { file: 'gpt56-terra-ultra.html', model: 'gpt 5.6 Terra ultra', orig: 'pelican-bike-animation.html', size: 15019, tags: ['场景卡', '暂停 / 重播'], note: '顶栏卡片式布局，Pause / Replay 双按钮。' },
      { file: 'gpt56-terra-test.html', model: 'gpt 5.6Terra二次测试', orig: 'pelican-bicycle-animation.html', size: 14042, tags: ['复古杂志风', '衬线字体', '粗边框'], note: '米黄纸感 + 粗黑边框 + 衬线字体，复古杂志风格。' },
    ],
  },
  {
    group: 'MiniMax', color: '#FF6B3D', items: [
      { file: 'minmax-m3.html', model: 'MinMax-M3', orig: 'pelican-cycling-minmax-m3.html', size: 22998, tags: ['深色卡片', 'SVG 动画'], note: '深色玻璃卡片 + 内联 SVG，meta 双标注模型。' },
    ],
  },
  {
    group: 'WorkBuddy 会话', color: '#A48830', items: [
      { file: 'hy3-workbuddy.html', model: 'Hy3 (WorkBuddy)', orig: 'pelican_cycling_hy3.html', size: 14938, tags: ['深色舞台', 'SVG 落款'], note: 'SVG 内直接落款“由 Hy3 (WorkBuddy) 生成”。' },
      { file: 'hy4-preview.html', model: 'Hy4 preview', orig: 'pelican-bike.html', size: 35779, tags: ['16:9 舞台', '昼夜切换', '暂停按钮'], note: '唯一带昼夜切换的版本：夜晚切换星星、月亮与光束。' },
    ],
  },
];

const TOTAL = GALLERY.reduce((sum, group) => sum + group.items.length, 0);
const GROUP_TOTAL = GALLERY.length;

function formatSize(bytes) {
  return bytes > 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${bytes} B`;
}

function ModelCard({ item, group, seq }) {
  const src = `/pelican-gallery/${item.file}`;
  return (
    <article className="pg-card">
      <span className="pg-card-watermark" aria-hidden="true">{String(seq).padStart(2, '0')}</span>
      {/* 模型标注条：模型名始终在动画上方 */}
      <header className="pg-card-bar">
        <span className="pg-card-id">
          <i className="pg-dot" style={{ background: group.color }} />
          <b>{item.model}</b>
          <span className="pg-live"><i />LIVE</span>
        </span>
        <span className="pg-size">{formatSize(item.size)}</span>
      </header>
      <div className="pg-card-meta">
        <code>{item.orig}</code>
        <span className="pg-tags">{item.tags.map((tag) => <span className="pg-tag" key={tag}>{tag}</span>)}</span>
      </div>
      {/* 原文件 iframe 原样运行，动效实时播放 */}
      <div className="pg-frame">
        <iframe src={src} loading="lazy" title={`${item.model} 生成的动画`} scrolling="no" />
      </div>
      <footer className="pg-card-foot">
        <p>{item.note}</p>
        <a href={src} target="_blank" rel="noreferrer">单独打开<ExternalLink size={12} /></a>
      </footer>
    </article>
  );
}

export default function PelicanGallery() {
  let seq = 0;
  return <div className="pg-page">
    <style>{`
      .pg-page{--ink:#1b1b1b;--muted:#8d8d8d;--line:rgba(27,27,27,.11);--gold:#a48830;--gold-soft:#ffe08a;min-height:100%;color:var(--ink);background-color:#fff;background-image:linear-gradient(rgba(0,0,0,.031) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.031) 1px,transparent 1px);background-size:32px 32px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;padding:34px 0 90px}
      .pg-page *,.pg-page *::before,.pg-page *::after{box-sizing:border-box}
      .pg-shell{width:min(100% - 48px,1080px);margin:0 auto}
      /* —— 顶部文字区 —— */
      .pg-kicker{display:inline-flex;align-items:center;gap:10px;color:#a48830;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.22em}
      .pg-kicker::before{content:"";width:26px;height:1px;background:#a48830}
      .pg-head-row{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-top:16px;padding-bottom:24px;border-bottom:1px solid var(--line)}
      .pg-head h1{margin:0;font-size:54px;font-weight:780;letter-spacing:-.025em;line-height:1}
      .pg-head h1 em{font-style:normal;color:transparent;-webkit-text-stroke:1px rgba(27,27,27,.45)}
      .pg-head p{max-width:560px;margin:16px 0 0;color:#626262;font-size:14px;line-height:1.95}
      .pg-head p b{color:var(--ink);font-weight:700}
      .pg-stats{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;flex:0 0 auto;max-width:300px}
      .pg-stat{border:1px solid var(--line);border-radius:99px;padding:7px 13px;color:#626262;background:rgba(255,255,255,.75);font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap}
      .pg-stat b{color:var(--ink);font-weight:700}
      .pg-stat.is-gold{border-color:#e7c750;background:#fff4c8;color:#6b5b13}
      /* —— 分组 —— */
      .pg-groups{margin-top:42px;display:grid;gap:40px}
      .pg-group-head{display:flex;align-items:center;gap:10px;padding-bottom:13px;border-bottom:1px solid var(--line)}
      .pg-group-head i{width:9px;height:9px;border-radius:50%}
      .pg-group-head span{font-size:15px;font-weight:760;letter-spacing:.02em}
      .pg-group-head b{margin-left:auto;color:#999;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:400;letter-spacing:.06em}
      /* —— 一行两个，向下排列 —— */
      .pg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:16px}
      .pg-card{position:relative;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.92);overflow:hidden;transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s ease,border-color .3s ease}
      .pg-card:hover{transform:translateY(-4px);border-color:rgba(164,136,48,.55);box-shadow:0 20px 38px rgba(34,30,15,.12)}
      .pg-card-watermark{position:absolute;top:6px;right:14px;z-index:0;color:transparent;-webkit-text-stroke:1px rgba(27,27,27,.08);font-size:40px;font-weight:780;line-height:1;pointer-events:none}
      .pg-card-bar{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px 11px;border:0;box-shadow:none;background:transparent;border-radius:0}
      .pg-card-id{display:inline-flex;align-items:center;gap:9px;min-width:0}
      .pg-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
      .pg-card-id b{font-size:16px;font-weight:760;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pg-live{display:inline-flex;align-items:center;gap:5px;border:1px solid #e4d9a8;border-radius:99px;padding:3px 8px;background:#fdf8e3;color:#8a7420;font:9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.1em}
      .pg-live i{width:5px;height:5px;border-radius:50%;background:#c9a227;animation:pg-live-pulse 1.4s ease-in-out infinite}
      @keyframes pg-live-pulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
      .pg-size{flex:0 0 auto;color:#999;font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
      .pg-card-meta{position:relative;z-index:1;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0 16px 12px;border:0;box-shadow:none;background:transparent;border-radius:0}
      .pg-card-meta code{color:#9a9a9a;font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .pg-tags{display:flex;gap:5px;flex-wrap:wrap}
      .pg-tag{border:1px solid #ece3bd;border-radius:99px;padding:3px 8px;color:#8a7420;background:#fdfaf0;font-size:10px;white-space:nowrap}
      .pg-frame{position:relative;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#f2f3f5;overflow:hidden}
      .pg-frame::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;z-index:2;background:linear-gradient(90deg,transparent,#ffe08a 30%,#a48830 70%,transparent);opacity:.65}
      .pg-frame iframe{display:block;width:100%;aspect-ratio:16/9;height:auto;border:0;background:#fff}
      .pg-card-foot{display:flex;align-items:center;gap:12px;justify-content:space-between;padding:11px 16px 13px;border:0;box-shadow:none;background:transparent;border-radius:0}
      .pg-card-foot p{margin:0;color:#777;font-size:12px;line-height:1.6}
      .pg-card-foot a{display:inline-flex;align-items:center;gap:5px;flex:0 0 auto;border:1px solid var(--line);border-radius:99px;padding:5px 10px;color:#666;background:#fff;font-size:11px;text-decoration:none;white-space:nowrap;transition:border-color .2s ease,color .2s ease}
      .pg-card-foot a:hover{border-color:#a48830;color:var(--ink)}
      /* —— 页脚 —— */
      .pg-foot{margin-top:48px;padding-top:18px;border-top:1px solid var(--line);color:#999;font-size:12px;line-height:1.9}
      @media(max-width:900px){.pg-head-row{flex-direction:column;align-items:flex-start;gap:18px}.pg-stats{justify-content:flex-start;max-width:none}.pg-head h1{font-size:42px}.pg-grid{grid-template-columns:1fr}}
    `}</style>

    <div className="pg-shell">
      <header className="pg-head">
        <span className="pg-kicker">VOYRA · AI MODEL SHOWCASE</span>
        <div className="pg-head-row">
          <div>
            <h1>AI 动画<em>画廊</em></h1>
            <p>同一个题目「鹈鹕骑自行车 · SVG 2D 动画」，交给 <b>{TOTAL} 个 AI 模型</b>分别生成。<br />下方每一份都是原文件通过 iframe 原样运行，<b>全部动效同时播放</b>，无需点击切换。</p>
          </div>
          <div className="pg-stats">
            <span className="pg-stat"><b>{TOTAL}</b> 个模型</span>
            <span className="pg-stat"><b>{GROUP_TOTAL}</b> 家厂商</span>
            <span className="pg-stat is-gold"><Sparkles size={12} style={{ verticalAlign: '-2px' }} /> 全部实时播放</span>
          </div>
        </div>
      </header>

      <section className="pg-groups">
        {GALLERY.map((group, groupIndex) => (
          <div className="pg-group" key={group.group}>
            <div className="pg-group-head">
              <i style={{ background: group.color }} />
              <span>{group.group}</span>
              <b>{String(groupIndex + 1).padStart(2, '0')} / {String(GROUP_TOTAL).padStart(2, '0')} · {group.items.length} 个版本</b>
            </div>
            <div className="pg-grid">
              {group.items.map((item) => {
                seq += 1;
                return <ModelCard key={item.file} item={item} group={group} seq={seq} />;
              })}
            </div>
          </div>
        ))}
      </section>

      <footer className="pg-foot">
        <p>每个卡片顶部都标注了模型名、原文件名、体积与技术标签；卡片内即动画本身——车轮、踏板、翅膀、喉囊都在实时运动。部分版本自带控制按钮（暂停 / 变速 / 昼夜切换 / 滑块），直接在卡片内操作即可体验。</p>
        <p>模型署名均取自各 HTML 文件内部的标题 / meta / 注释 / 画面落款，与文件名无关。© 2026 Voyra®</p>
      </footer>
    </div>
  </div>;
}
