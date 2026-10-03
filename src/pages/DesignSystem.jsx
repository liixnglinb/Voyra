import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, Copy, Download, Search, Shapes, ShieldCheck, Sun, Moon, Loader2, X } from 'lucide-react';
import { COMMON_RULES, SOFTWARE_SPECS, STATE_MATRIX, UI_SECTIONS, buildSpecMarkdown } from '../data/software-ui-spec';
import '../styles/design-system.css';

const STATE_OPTIONS = [['normal', '默认'], ['loading', '加载'], ['disabled', '禁用'], ['success', '成功'], ['error', '失败']];

function ComponentLab({ product }) {
  const [theme, setTheme] = useState('light');
  const [state, setState] = useState('normal');
  const [notice, setNotice] = useState('');
  const timer = useRef(null);
  const dialog = useRef(null);
  const trigger = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { clearTimeout(timer.current); setState('normal'); setNotice(''); }, [product?.id]);
  const simulate = () => {
    clearTimeout(timer.current);
    setState('loading');
    timer.current = setTimeout(() => { setState('success'); setNotice('示例操作完成，未调用任何软件服务。'); }, 900);
  };
  const labels = { normal: '运行设计示例', loading: '处理中…', disabled: '请先选择对象', success: '示例已完成', error: '重新尝试示例' };
  return <section className="ds-lab" aria-labelledby="lab-title">
    <div className="ds-section-heading"><div><span className="ds-eyebrow">COMPONENT LAB</span><h2 id="lab-title">细节，在交互中确认。</h2></div><span className="ds-demo-label">设计示例 · 非实时数据</span></div>
    <div className="ds-lab-controls"><label>组件状态<select value={state} onChange={(e) => { clearTimeout(timer.current); setState(e.target.value); setNotice(''); }}>{STATE_OPTIONS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><button type="button" className="ds-quiet-button" onClick={() => setTheme((t) => t === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}切换为{theme === 'light' ? '深色' : '浅色'}预览</button></div>
    <div className="ds-preview" data-theme={theme} style={{ '--product-accent': product?.accent || '#80651c' }}>
      <div className="ds-preview-side" aria-hidden="true"><Shapes size={22} /><b>{product?.en || 'VOYRA'}</b><span className="is-selected">工作台</span><span>活动与明细</span><span>设置中心</span></div>
      <div className="ds-preview-main"><div className="ds-preview-top"><span>{product?.name || '统一工作台'}</span><small>仅用于样式预览</small></div><h3>{product?.task || '同一套视觉语言，不同的核心任务。'}</h3><div className="ds-preview-stats"><div><small>控件高度</small><strong>40<span>px</span></strong></div><div><small>正文基准</small><strong>14<span>px</span></strong></div><div><small>过渡节奏</small><strong>200<span>ms</span></strong></div></div><div className="ds-preview-bottom"><div><strong>有反馈，也有边界。</strong><p>焦点可见 · 禁用有原因 · 失败可恢复</p></div><button type="button" className={`ds-action state-${state}`} disabled={state === 'disabled' || state === 'loading'} aria-busy={state === 'loading'} onClick={simulate}>{state === 'loading' ? <Loader2 size={16} className="ds-spin" /> : state === 'success' ? <Check size={16} /> : <ArrowUpRight size={16} />}{labels[state]}</button></div>{state === 'error' && <p className="ds-example-error" role="alert">示例服务暂不可用，内容已保留。可以重新尝试。</p>}{state === 'disabled' && <p className="ds-example-note">禁用原因：这是未选择对象的样式示例。</p>}</div>
    </div>
    <div className="ds-lab-footer"><span role="status">{notice || '试试 Tab 键：焦点与选中态应当分别可见。'}</span><button ref={trigger} type="button" className="ds-text-button" onClick={() => dialog.current.showModal()}><ShieldCheck size={15} />查看安全确认示例</button></div>
    <dialog ref={dialog} className="ds-dialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc" onClose={() => trigger.current?.focus()}><form method="dialog"><span className="ds-eyebrow">SAFE BY DESIGN</span><h2 id="confirm-title">先确认范围，再进行操作。</h2><p id="confirm-desc">这是确认组件示例，不会扫描、删除或修改任何文件。危险操作需要明确对象、影响与恢复方式。</p><div className="ds-dialog-scope"><span>示例范围</span><b>3 个项目 · 仅设计预览</b><span>真实文件操作</span><b>不会执行</b></div><div className="ds-dialog-actions"><button autoFocus className="ds-quiet-button" value="cancel">取消并返回</button><button className="ds-action" value="confirm" onClick={() => setNotice('已确认设计示例，没有执行文件操作。')}>确认设计示例</button></div></form></dialog>
  </section>;
}

export default function DesignSystem() {
  const [productId, setProductId] = useState('all');
  const [sectionId, setSectionId] = useState('architecture');
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState('');
  const feedbackTimer = useRef(null);
  const root = useRef(null);
  const product = SOFTWARE_SPECS.find((p) => p.id === productId);
  const activeRules = product?.rules || COMMON_RULES;
  const needle = query.trim().toLocaleLowerCase();
  const visible = useMemo(() => UI_SECTIONS.filter((s) => needle || s.id === sectionId).map((section) => ({ ...section, rules: activeRules[section.id].filter((r) => !needle || `${section.title} ${r.name} ${r.rule} ${r.check}`.toLocaleLowerCase().includes(needle)) })).filter((s) => s.rules.length), [activeRules, needle, sectionId]);
  const count = Object.values(activeRules).reduce((sum, items) => sum + items.length, 0);
  useEffect(() => () => clearTimeout(feedbackTimer.current), []);
  const notify = (message) => { setFeedback(message); clearTimeout(feedbackTimer.current); feedbackTimer.current = setTimeout(() => setFeedback(''), 5000); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(buildSpecMarkdown(productId)); notify('已复制：通用基线＋所选软件规范。'); }
    catch { notify('剪贴板不可用，请使用「导出规范」保存 Markdown 文件。'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([buildSpecMarkdown(productId)], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `voyra-ui-${productId}.md`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('已导出规范，不包含任何私人信息或密钥。');
  };
  return <div className="ds-page" ref={root}>
    <a className="ds-skip" href="#ds-spec-content">跳到规范内容</a>
    <header className="ds-header"><Link to="/" className="ds-brand">VOYRA<span>®</span></Link><nav aria-label="规范页导航"><Link to="/"><ArrowLeft size={15} />返回首页</Link><Link to="/uikit">组件图鉴<ArrowUpRight size={15} /></Link></nav><span className="ds-release">DESIGN SYSTEM / 1.0</span></header>
    <main className="ds-container">
      <section className="ds-hero"><div><span className="ds-eyebrow"><span className="ds-dot" />ONE LANGUAGE. FIVE TOOLS.</span><h1>统一的秩序。<br /><span>各自的表达。</span></h1><p>从平台通用规范到五款软件的实际场景。<br />把布局、组件、状态与边界，变成可执行、可验收的设计契约。</p><div className="ds-hero-actions"><button className="ds-action" type="button" onClick={download}><Download size={16} />导出规范</button><button className="ds-quiet-button" type="button" onClick={copy}><Copy size={16} />复制给 AI</button></div></div><div className="ds-principles"><span className="ds-eyebrow">THE FOUNDATION</span><div><b>01</b><span>共享基线<small>同一套尺寸、材质与节奏</small></span></div><div><b>02</b><span>产品适配<small>尊重任务、密度与风险边界</small></span></div><div><b>03</b><span>状态验收<small>从正常路径到每一个异常</small></span></div><footer>WARM PAPER / GRAPHITE / GOLD</footer></div></section>
      <section className="ds-workspace" aria-labelledby="spec-title">
        <div className="ds-product-switch" aria-label="选择规范对象"><button type="button" className={!product ? 'is-active' : ''} aria-pressed={!product} onClick={() => setProductId('all')}>平台通用规范<span>基线</span></button>{SOFTWARE_SPECS.map((p) => <button type="button" key={p.id} className={productId === p.id ? 'is-active' : ''} aria-pressed={productId === p.id} onClick={() => setProductId(p.id)}>{p.name}</button>)}</div>
        <div className="ds-workspace-top"><div><span className="ds-eyebrow">{product?.en || 'PLATFORM STANDARD'}</span><h2 id="spec-title">{product?.name || '平台通用规范'}</h2><p>{product?.task || '七个维度，构成所有软件共同遵守的基础。'}</p></div><label className="ds-search"><Search size={17} /><span className="ds-sr">检索当前对象的全部规范</span><input value={query} placeholder="搜索规范、状态或验收场景…" onChange={(e) => setQuery(e.target.value)} />{query && <button type="button" aria-label="清除搜索" onClick={() => setQuery('')}><X size={16} /></button>}</label></div>
        <div className="ds-spec-layout"><aside className="ds-sidebar"><span>{count} 条细则 / 7 个维度</span><nav aria-label="规范维度">{UI_SECTIONS.map((s, i) => <button key={s.id} type="button" aria-current={!needle && sectionId === s.id ? 'true' : undefined} className={!needle && sectionId === s.id ? 'is-active' : ''} onClick={() => { setQuery(''); setSectionId(s.id); }}><b>{String(i + 1).padStart(2, '0')}</b>{s.title}<span>{activeRules[s.id].length}</span></button>)}</nav><p>这里列出目标规范与验收要求，不等同于全部业务功能已经落地。</p></aside>
          <div className="ds-spec-content" id="ds-spec-content" tabIndex={-1}>{product && <div className="ds-product-context"><span>{product.platform}</span><strong>{product.tag}</strong><p>继承平台通用基线；以下细则针对本软件的实际使用场景。</p><div>{product.nav.map((n) => <span key={n}>{n}</span>)}</div></div>}
            {needle && <p className="ds-results" role="status">在当前对象中找到 {visible.reduce((n, s) => n + s.rules.length, 0)} 条相关规范</p>}
            {!visible.length && <div className="ds-empty"><Search size={28} /><h3>没有找到匹配的规范</h3><p>试试「加载」「焦点」「风险」，或清除条件。</p><button type="button" className="ds-quiet-button" onClick={() => setQuery('')}>清除搜索</button></div>}
            {visible.map((s) => <section className="ds-rules-section" key={s.id}><div className="ds-rule-heading"><span className="ds-eyebrow">{s.en}</span><h3>{s.title}</h3></div>{s.rules.map((r, i) => <article className="ds-rule" key={r.name}><span className="ds-rule-no">{String(i + 1).padStart(2, '0')}</span><div><h4>{r.name}</h4><p>{r.rule}</p><div className="ds-check"><Check size={14} /><span>验收 · {r.check}</span></div></div></article>)}</section>)}
            {!needle && sectionId === 'states' && <section className="ds-state-matrix"><h3>组件 × 状态契约</h3><p>同一组件在八种状态下都应有确定的表现。</p><div className="ds-table-scroll" tabIndex={0} role="region" aria-label="组件状态矩阵，可横向滚动"><table><thead><tr>{['组件', '默认', '悬停', '按压', '焦点', '加载', '禁用', '成功', '失败'].map((s) => <th scope="col" key={s}>{s}</th>)}</tr></thead><tbody>{STATE_MATRIX.map(([name, ...states]) => <tr key={name}><th scope="row">{name}</th>{states.map((s, i) => <td key={i}>{s}</td>)}</tr>)}</tbody></table></div></section>}
            {product && <section className="ds-acceptance"><span className="ds-eyebrow">EDGE-CASE CHECKLIST</span><h3>这款软件必须覆盖的场景</h3><ul>{product.acceptance.map((item) => <li key={item}><ShieldCheck size={15} />{item}</li>)}</ul></section>}
          </div></div>
      </section>
      <ComponentLab product={product} />
      <footer className="ds-footer"><span>VOYRA / DESIGN WITH INTENT</span><p>规范版本 1.0 · 2026-10-02 · 保留业务逻辑与安全边界</p><Link to="/">返回首页<ArrowUpRight size={15} /></Link></footer>
    </main><div className="ds-feedback" role="status" aria-live="polite">{feedback}</div>
  </div>;
}
