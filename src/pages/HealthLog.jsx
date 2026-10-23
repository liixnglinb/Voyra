import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Heart, HeartPulse, Plus, X, Download, Upload, Database,
  Pencil, Trash2, Check, ChevronRight, Clock3, Activity, Search, RotateCcw, FileJson, FileSpreadsheet,
  Copy, Code2, Cloud, CloudOff, RefreshCw, Info, ShieldCheck, CalendarDays } from 'lucide-react';
import { useAuth } from '../components/AuthGate';
import { userKey } from '../lib/auth';
import { HEALTH_CLOUD_KEY, HealthStore, recordKey, readingLabel, healthCsv, parseHealthImport, importHealth } from '../lib/health-records';
import '../styles/health-log.css';

const PERIODS = ['晨起', '午后', '晚间', '运动后'];
const pad = value => String(value).padStart(2, '0');
const localTime = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
const timeParts = value => {
  const [date = '', time = ''] = String(value || '').split('T');
  const [year, month, day] = date.split('-');
  return { date, time: time.slice(0, 5), label: month && day ? `${Number(month)}月${Number(day)}日` : '日期未记录', year, md: month && day ? `${Number(month)}/${Number(day)}` : '—' };
};
const number = value => Number.isFinite(Number(value)) && value !== '' && value != null ? Number(value) : null;
const display = value => value === '' || value == null ? '—' : String(value);
const average = (rows, key) => {
  const values = rows.map(r => number(r[key])).filter(v => v !== null);
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : '—';
};
const download = (name, text, type) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const html = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const snippet = (latest, count) => `<a href="https://lxlrwxs.top/#/health" target="_blank" rel="noopener" style="display:block;max-width:448px;padding:24px;border:1px solid #ecd8d1;border-radius:20px;background:#fff5f0;color:#302724;text-decoration:none;font-family:system-ui,sans-serif"><strong>血压记录</strong><p style="font-size:32px;margin:16px 0">${html(display(latest?.sys))} / ${html(display(latest?.dia))} <small style="font-size:12px">mmHg</small></p><p>心率 ${html(display(latest?.hr))} bpm · ${html(latest?.time?.replace('T', ' ') || '暂无测量')}</p><span>共 ${count} 次记录 · 查看趋势 ↗</span></a>`;

function useRecords(authed) {
  const key = userKey('HealthBpData');
  const store = useMemo(() => new HealthStore({ storage: localStorage, key,
    isCurrent: () => userKey('HealthBpData') === key,
    cloud: authed ? {
      async load() {
        if (!window.electronAPI?.loadData) throw Error('云端服务暂时不可用，本机记录已保留。');
        return window.electronAPI.loadData(HEALTH_CLOUD_KEY);
      },
      async save(payload) {
        if (!window.electronAPI?.saveData) throw Error('云端服务暂时不可用，本机记录已保留。');
        await window.electronAPI.saveData(HEALTH_CLOUD_KEY, payload);
      },
    } : null,
  }), [key, authed]);
  const [state, setState] = useState(() => ({ owner: store, ...store.snapshot() }));
  useEffect(() => {
    setState({ owner: store, ...store.snapshot() });
    const unsubscribe = store.subscribe(value => setState({ owner: store, ...value }));
    store.sync();
    const online = () => store.sync();
    window.addEventListener('online', online);
    return () => { unsubscribe(); window.removeEventListener('online', online); };
  }, [store]);
  return { ...(state.owner === store ? state : store.snapshot()), store, key };
}

function Sheet({ title, subtitle, children, footer, onClose, small = false }) {
  const ref = useRef(null), titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const locks = [document.body, ...document.querySelectorAll('.tool-wrap,.tool-content')].map(el => [el, el.style.overflow]);
    locks.forEach(([el]) => { el.style.overflow = 'hidden'; });
    const viewport = window.visualViewport;
    const size = () => {
      ref.current?.style.setProperty('--bp-visible-height', `${viewport?.height || innerHeight}px`);
      ref.current?.parentElement.style.setProperty('--bp-visible-top', `${viewport?.offsetTop || 0}px`);
      ref.current?.parentElement.style.setProperty('--bp-visible-height', `${viewport?.height || innerHeight}px`);
    };
    size(); viewport?.addEventListener('resize', size); viewport?.addEventListener('scroll', size);
    if (!document.querySelector('.agm-overlay')) ref.current?.focus();
    const keydown = event => {
      if (document.querySelector('.agm-overlay')) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea,select,a[href],summary,[tabindex="0"]')].filter(el => el.getClientRects().length);
      if (!controls.length) { event.preventDefault(); return; }
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      locks.forEach(([el, overflow]) => { el.style.overflow = overflow; });
      viewport?.removeEventListener('resize', size); viewport?.removeEventListener('scroll', size);
      document.removeEventListener('keydown', keydown);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [onClose]);
  return createPortal(<div className="bp-veil" onPointerDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className={`bp-sheet${small ? ' bp-sheet-small' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
      <header className="bp-sheet-head"><div><span className="bp-eyebrow">HEALTH JOURNAL</span><h2 id={titleId}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="bp-icon" onClick={onClose} aria-label="关闭弹窗"><X size={20}/></button></header>
      <div className="bp-sheet-body">{children}</div>
      {footer && <footer className="bp-sheet-foot">{footer}</footer>}
    </section>
  </div>, document.body);
}

function RecordForm({ record, onClose, onSave }) {
  const [form, setForm] = useState(() => record ? { ...record, sys: String(record.sys ?? ''), dia: String(record.dia ?? ''), hr: String(record.hr ?? '') }
    : { sys: '', dia: '', hr: '', time: localTime(), period: new Date().getHours() < 12 ? '晨起' : new Date().getHours() < 18 ? '午后' : '晚间', note: '' });
  const [error, setError] = useState('');
  const id = useId(), status = readingLabel(form.sys, form.dia);
  const update = (key, value) => { setForm(f => ({ ...f, [key]: value })); setError(''); };
  const submit = e => {
    e.preventDefault();
    for (const [key, label] of [['sys', '收缩压'], ['dia', '舒张压'], ['hr', '心率']]) {
      if (!/^\d{1,3}$/.test(form[key]) || Number(form[key]) < 1) { setError(`请填写${label}的实际读数（1–999 的整数）。`); document.getElementById(`${id}-${key}`)?.focus(); return; }
    }
    if (!form.time || !Number.isFinite(new Date(form.time).getTime())) { setError('请选择有效的测量日期与时间。'); return; }
    try { onSave({ ...form, id: record?.id ?? `rec_${crypto.randomUUID()}`, sys: Number(form.sys), dia: Number(form.dia), hr: Number(form.hr) }); }
    catch (e) { setError(`保存未完成：${e.message} 请保留当前填写内容并导出备份。`); }
  };
  return <Sheet title={record ? '编辑这次测量' : '记录一次测量'} subtitle="按血压计上的实际读数填写" onClose={onClose}
    footer={<><button className="bp-button bp-secondary" onClick={onClose}>取消</button><button className="bp-button bp-primary" type="submit" form={id}><Check size={18}/>{record ? '保存修改' : '保存测量'}</button></>}>
    <form id={id} onSubmit={submit} noValidate>
      <div className="bp-input-grid">{[['sys', '收缩压', '大压', 'mmHg'], ['dia', '舒张压', '小压', 'mmHg'], ['hr', '心率', '脉搏', 'bpm']].map(([key, label, alias, unit]) =>
        <label className={`bp-reading-input bp-reading-${key}`} key={key} htmlFor={`${id}-${key}`}><span>{label}<small>{alias}</small></span>
          <input id={`${id}-${key}`} aria-label={label} inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="—" value={form[key]} onChange={e => update(key, e.target.value)} aria-invalid={!!error && !/^\d{1,3}$/.test(form[key])}/><em>{unit}</em></label>)}</div>
      <div className={`bp-read-reference bp-tone-${status.kind}`}><Activity size={16}/><span>{status.kind === 'unknown' ? '填写读数后，可查看家庭血压参考线提示' : `${status.text} · 135 / 85 mmHg`}</span></div>
      <div className="bp-field-heading"><span><CalendarDays size={16}/>测量时间</span><button type="button" className="bp-text-button" onClick={() => update('time', localTime())}>设为现在</button></div>
      <div className="bp-date-fields"><label><span>日期</span><input type="date" aria-label="测量日期" value={form.time?.split('T')[0] || ''} onChange={e => update('time', `${e.target.value}T${form.time?.split('T')[1] || '08:00'}`)}/></label>
        <label><span>时间</span><input type="time" aria-label="测量时间" value={form.time?.split('T')[1]?.slice(0, 5) || ''} onChange={e => update('time', `${form.time?.split('T')[0] || localTime().split('T')[0]}T${e.target.value}`)}/></label></div>
      <fieldset className="bp-periods"><legend>测量时段</legend><div>{[...new Set([...PERIODS, form.period].filter(Boolean))].map(period => <button key={period} type="button" aria-pressed={form.period === period} onClick={() => update('period', period)}>{period}</button>)}</div></fieldset>
      <label className="bp-note-field"><span>备注 <small>选填</small></span><textarea aria-label="测量备注" rows={3} placeholder="例如：晨起静息、服药后、运动后…" value={form.note || ''} onChange={e => update('note', e.target.value)}/></label>
      {error && <p className="bp-error" role="alert">{error}</p>}
      <p className="bp-form-hint">标签仅作记录参考，不作为诊断或用药依据。</p>
    </form>
  </Sheet>;
}

function Trend({ rows, range, setRange }) {
  const [metric, setMetric] = useState('bp'), [selected, setSelected] = useState(null);
  const plotted = useMemo(() => rows.slice(0, range).reverse(), [rows, range]);
  const series = metric === 'bp' ? [{ key: 'sys', label: '收缩压', color: '#c26d5b' }, { key: 'dia', label: '舒张压', color: '#667eaf' }]
    : [{ key: 'hr', label: '心率', color: '#527c6c' }];
  const values = plotted.flatMap(r => series.map(s => number(r[s.key]))).filter(v => v !== null);
  const min = Math.max(0, Math.floor(((values.length ? Math.min(...values) : 60) - 10) / 20) * 20);
  const max = Math.max(min + 40, Math.ceil(((values.length ? Math.max(...values) : 140) + 10) / 20) * 20);
  const W = 640, H = 270, left = 44, right = 20, top = 20, bottom = 36;
  const x = i => plotted.length <= 1 ? (W + left - right) / 2 : left + i * (W - left - right) / (plotted.length - 1);
  const y = value => top + (max - Number(value)) / (max - min) * (H - top - bottom);
  const active = plotted.find(r => recordKey(r) === selected) || plotted.at(-1);
  const ticks = Array.from({ length: 5 }, (_, i) => min + i * (max - min) / 4);
  const selectedIndex = plotted.indexOf(active);
  const id = useId().replace(/:/g, '');
  return <section className="bp-panel bp-trend" aria-label="测量趋势">
    <div className="bp-section-head"><div><span className="bp-eyebrow">YOUR RHYTHM</span><h2>每一次，都看得见</h2></div><label className="bp-range"><span className="bp-sr-only">趋势范围</span><select aria-label="趋势范围" value={range} onChange={e => { setRange(Number(e.target.value)); setSelected(null); }}><option value={7}>近 7 次</option><option value={14}>近 14 次</option><option value={999999}>全部记录</option></select></label></div>
    <div className="bp-trend-toolbar"><div className="bp-switch" aria-label="趋势指标"><button aria-pressed={metric === 'bp'} onClick={() => setMetric('bp')}>血压</button><button aria-pressed={metric === 'hr'} onClick={() => setMetric('hr')}>心率</button></div>
      <div className="bp-legend">{series.map(s => <span key={s.key}><i style={{ background: s.color }}/>{s.label}</span>)}</div></div>
    {plotted.length ? <>
      <div className="bp-chart-readout" aria-live="polite"><span>{timeParts(active.time).label} <b>{timeParts(active.time).time}</b></span><strong>{metric === 'bp' ? `${display(active.sys)} / ${display(active.dia)}` : display(active.hr)}<small>{metric === 'bp' ? 'mmHg' : 'bpm'}</small></strong></div>
      <div className="bp-chart-box"><svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${metric === 'bp' ? '血压' : '心率'}趋势，${plotted.length}次测量；纵轴${min}至${max}${metric === 'bp' ? '毫米汞柱' : '次每分'}`}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={series[0].color} stopOpacity=".13"/><stop offset="100%" stopColor={series[0].color} stopOpacity="0"/></linearGradient></defs>
        {ticks.map(tick => <g key={tick}><line x1={left} y1={y(tick)} x2={W - right} y2={y(tick)} stroke="#ebe7e1" strokeDasharray="3 6"/><text x={left - 12} y={y(tick) + 4} textAnchor="end">{Math.round(tick)}</text></g>)}
        <path d={`M${x(0)},${H - bottom} ${plotted.filter(r => number(r[series[0].key]) !== null).map(r => `L${x(plotted.indexOf(r))},${y(r[series[0].key])}`).join(' ')} L${x(plotted.length - 1)},${H - bottom}Z`} fill={`url(#${id})`}/>
        {series.map(s => <g key={s.key}><polyline points={plotted.filter(r => number(r[s.key]) !== null).map(r => `${x(plotted.indexOf(r))},${y(r[s.key])}`).join(' ')} fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
          {plotted.length <= 30 && plotted.map((r, i) => number(r[s.key]) !== null && <circle key={recordKey(r)} cx={x(i)} cy={y(r[s.key])} r={r === active ? 5 : 3} stroke={s.color} strokeWidth="2" fill="#fff"/>)}</g>)}
        <line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={top} y2={H - bottom} stroke="#b9aea2" strokeDasharray="3 5"/>
        {plotted.map((r, i) => (i === 0 || i === plotted.length - 1 || (plotted.length > 4 && i === Math.floor(plotted.length / 2))) && <text key={i} x={x(i)} y={H - 10} textAnchor="middle">{timeParts(r.time).md}</text>)}
      </svg><div className="bp-chart-hitarea" style={{ left: `${left / W * 100}%`, right: `${right / W * 100}%` }} onPointerDown={e => {
        const bounds = e.currentTarget.getBoundingClientRect(); e.currentTarget.setPointerCapture(e.pointerId);
        const index = Math.round(Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width)) * (plotted.length - 1)); setSelected(recordKey(plotted[index]));
      }} onPointerMove={e => { if (!e.buttons) return; const bounds = e.currentTarget.getBoundingClientRect(); const i = Math.round(Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width)) * (plotted.length - 1)); setSelected(recordKey(plotted[i])); }}/></div>
      <div className="bp-chart-nav"><button className="bp-icon" aria-label="上一次测量" disabled={selectedIndex <= 0} onClick={() => setSelected(recordKey(plotted[selectedIndex - 1]))}><ArrowLeft size={15}/></button><span>轻触图表查看读数 · {selectedIndex + 1} / {plotted.length}</span><button className="bp-icon" aria-label="下一次测量" disabled={selectedIndex >= plotted.length - 1} onClick={() => setSelected(recordKey(plotted[selectedIndex + 1]))}><ChevronRight size={15}/></button></div>
      <div className="bp-averages"><span>这 {plotted.length} 次平均</span><strong>{average(plotted, 'sys')}<em>/</em>{average(plotted, 'dia')}<small>mmHg</small></strong><span><Heart size={13}/><b>{average(plotted, 'hr')}</b> bpm</span></div>
    </> : <div className="bp-empty-chart"><Activity size={38}/><strong>从第一次测量开始</strong><p>记录后，血压和心率的变化会在这里呈现。</p></div>}
    <details className="bp-reference"><summary><Info size={14}/>关于读数参考线</summary><p>家庭血压参考线为收缩压 135 或舒张压 85 mmHg。标签描述本次读数与参考线的关系，不代表诊断；低于参考线也不代表一定正常。诊断需多日规范测量与医生评估，个人目标以医生建议为准。<a href="https://www.nhc.gov.cn/jkj/c100063/202009/b6a4c154c6574ed6814c15010c8b4b94.shtml" target="_blank" rel="noreferrer">查看国家卫健委说明 ↗</a></p></details>
  </section>;
}

function History({ rows, expanded, setExpanded, onEdit, onDelete }) {
  const [filter, setFilter] = useState('all'), [search, setSearch] = useState(''), [limit, setLimit] = useState(30);
  const filtered = rows.filter(r => (filter === 'all' || (filter === 'high' ? readingLabel(r.sys, r.dia).kind === 'high' : r.period === filter))
    && `${r.time} ${r.period} ${r.note} ${r.sys}/${r.dia} ${r.hr}`.toLowerCase().includes(search.toLowerCase()));
  const shown = filtered.slice(0, expanded ? limit : 3);
  return <section className="bp-panel bp-history" aria-label="历史记录">
    <div className="bp-section-head"><div><span className="bp-eyebrow">MEASUREMENT LOG</span><h2>{expanded ? '你的测量档案' : '最近记录'}<span className="bp-count">{rows.length}</span></h2></div>{!expanded && rows.length > 3 && <button className="bp-text-button" onClick={() => setExpanded(true)}>全部记录<ChevronRight size={16}/></button>}</div>
    {expanded && <><label className="bp-search"><Search size={17}/><input type="search" aria-label="搜索历史记录" placeholder="搜索日期、备注或读数" value={search} onChange={e => { setSearch(e.target.value); setLimit(30); }}/></label><div className="bp-filters" aria-label="历史筛选">{[['all', '全部'], ['晨起', '晨起'], ['晚间', '晚间'], ['high', '高于参考线']].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => { setFilter(key); setLimit(30); }}>{label}</button>)}</div></>}
    <div className="bp-entries">{shown.map((r, index) => {
      const time = timeParts(r.time), status = readingLabel(r.sys, r.dia);
      const dateHeading = index === 0 || time.date !== timeParts(shown[index - 1].time).date;
      return <React.Fragment key={recordKey(r)}>{dateHeading && <h3 className="bp-date-heading">{time.label}<span>{time.year}</span></h3>}<article className="bp-entry" data-record-id={recordKey(r)}>
        <div className="bp-entry-time"><b>{time.time || '—'}</b><span>{r.period || '日常'}</span></div>
        <div className="bp-entry-main"><div className="bp-entry-values"><strong>{display(r.sys)}<em>/</em>{display(r.dia)}</strong><small>mmHg</small><span><Heart size={12}/>{display(r.hr)}<small>bpm</small></span></div><span className={`bp-status bp-tone-${status.kind}`}>{status.text}</span>{r._healthConflictOf && <span className="bp-conflict-label">不同版本已保留</span>}{r.note && <p>{r.note}</p>}</div>
        <div className="bp-entry-actions"><button className="bp-icon" aria-label={`编辑 ${r.time} 的测量`} onClick={() => onEdit(r)}><Pencil size={16}/></button><button className="bp-icon bp-delete-icon" aria-label={`删除 ${r.time} 的测量`} onClick={() => onDelete(r)}><Trash2 size={16}/></button></div>
      </article></React.Fragment>;
    })}</div>
    {!shown.length && <div className="bp-history-empty"><Clock3 size={28}/><p>{rows.length ? '没有找到匹配的测量记录' : '还没有测量记录，先记录一次吧'}</p>{rows.length > 0 && <button className="bp-text-button" onClick={() => { setFilter('all'); setSearch(''); }}>清除筛选</button>}</div>}
    {expanded && filtered.length > shown.length && <button className="bp-more" onClick={() => setLimit(n => n + 30)}>再显示 {Math.min(30, filtered.length - shown.length)} 条 · 共 {filtered.length} 条</button>}
  </section>;
}

function DataTools({ rows, latest, store, onClose, say }) {
  const { guard } = useAuth();
  const [pending, setPending] = useState(null), [error, setError] = useState('');
  const [recovery, setRecovery] = useState(null);
  const input = useRef(null);
  const prepare = (payload, name) => { setPending({ ...importHealth(store.payload, payload), source: payload, name }); setError(''); };
  const read = async e => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    try { if (file.size > 15 * 1024 * 1024) throw Error('文件超过 15 MB，请拆分备份后重试。'); prepare(parseHealthImport(await file.text()), file.name); }
    catch (e) { setPending(null); setError(e.message); }
  };
  const restore = () => {
    const backup = store.backup();
    const options = [{ name: '本机首次改版前备份', value: backup.recovery.original }, { name: '云端首次读取备份', value: backup.recovery.cloudOriginal },
      ...(Array.isArray(backup.recovery.snapshots) ? [...backup.recovery.snapshots].reverse().map(s => ({ name: `${new Date(s.time).toLocaleString('zh-CN')} · ${s.reason}`, value: s.value })) : [])]
      .filter(entry => entry.value && (Array.isArray(entry.value) || Array.isArray(entry.value.records)));
    setRecovery(options);
  };
  const exportJson = () => download(`血压记录-完整备份-${localTime().slice(0, 10)}.json`, JSON.stringify(store.backup(), null, 2), 'application/json');
  return <Sheet title="数据与备份" subtitle={`共 ${rows.length} 次测量，导出包含全部记录`} onClose={onClose}>
    <div className="bp-data-promise"><ShieldCheck size={22}/><div><strong>把每一次记录，稳妥留下</strong><p>导入和恢复只合并记录。同名记录内容不同时保留副本，不会整份覆盖。</p></div></div>
    <h3 className="bp-tools-heading">导出记录</h3>
    <button className="bp-tool" onClick={exportJson}><span className="bp-tool-icon"><FileJson size={21}/></span><span><b>完整 JSON 备份</b><small>含原始字段、同步信息与恢复快照</small></span><Download size={18}/></button>
    <button className="bp-tool" onClick={() => download(`血压记录-${localTime().slice(0, 10)}.csv`, healthCsv(rows), 'text/csv;charset=utf-8')}><span className="bp-tool-icon bp-tool-blue"><FileSpreadsheet size={21}/></span><span><b>导出 CSV 表格</b><small>用 Excel 查看，或就诊时提供记录</small></span><Download size={18}/></button>
    <h3 className="bp-tools-heading">导入与恢复</h3>
    <input className="bp-sr-only" ref={input} type="file" accept=".json,application/json" onChange={read} aria-label="选择血压记录备份"/>
    <button className="bp-tool" onClick={() => input.current?.click()}><span className="bp-tool-icon bp-tool-green"><Upload size={21}/></span><span><b>导入 JSON 备份</b><small>兼容旧版数组，先预览再合并</small></span><ChevronRight size={18}/></button>
    <button className="bp-tool" onClick={restore}><span className="bp-tool-icon"><RotateCcw size={21}/></span><span><b>恢复历史备份</b><small>找回改版前、编辑前或删除前的记录</small></span><ChevronRight size={18}/></button>
    {recovery && <div className="bp-recovery"><label>选择需要恢复的快照<select aria-label="历史备份" defaultValue="" onChange={e => { if (e.target.value !== '') prepare(recovery[Number(e.target.value)].value, recovery[Number(e.target.value)].name); }}><option value="" disabled>请选择快照</option>{recovery.map((entry, i) => <option key={i} value={i}>{entry.name}</option>)}</select></label>{!recovery.length && <p>当前还没有历史快照。第一次保存或同步前会自动保留原始记录。</p>}</div>}
    {pending && <section className="bp-import-preview" aria-label="导入预览"><h3>合并预览</h3><p>{pending.name}</p><div><strong>{pending.added}<small>新增</small></strong><strong>{pending.skipped}<small>已存在</small></strong><strong>{pending.conflicts}<small>保留副本</small></strong></div><p>现有 {rows.length} 条记录全部保留。</p><div className="bp-import-actions"><button className="bp-button bp-secondary" onClick={() => setPending(null)}>取消</button><button className="bp-button bp-primary" disabled={!pending.added} onClick={() => { if (!guard()) return; try { const result = store.import(pending.source); say(`已合并 ${result.added} 条记录`); setPending(null); } catch (e) { setError(e.message); } }}>确认合并</button></div></section>}
    {error && <p className="bp-error" role="alert">{error}</p>}
    <details className="bp-code"><summary><Code2 size={16}/>门户卡片代码<ChevronRight size={16}/></summary><p>生成当前最新读数的静态 HTML 卡片。</p><textarea aria-label="门户卡片 HTML" readOnly rows={5} value={snippet(latest, rows.length)}/><button className="bp-button bp-secondary" onClick={async () => { try { await navigator.clipboard.writeText(snippet(latest, rows.length)); say('已复制门户卡片代码'); } catch { say('请在代码框中全选并复制'); } }}><Copy size={16}/>复制代码</button></details>
  </Sheet>;
}

export default function HealthLog() {
  const { guard, authed } = useAuth();
  const { records, status, error, store, key } = useRecords(authed);
  const [view, setView] = useState('overview'), [form, setForm] = useState(null), [tools, setTools] = useState(false), [deleting, setDeleting] = useState(null);
  const [range, setRange] = useState(7), [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const sorted = useMemo(() => [...records].sort((a, b) => String(b.time || '').localeCompare(String(a.time || ''))), [records]);
  const latest = sorted[0], previous = sorted[1], latestTime = timeParts(latest?.time);
  const label = readingLabel(latest?.sys, latest?.dia);
  const delta = latest && previous && number(latest.sys) !== null && number(previous.sys) !== null ? Number(latest.sys) - Number(previous.sys) : null;
  useEffect(() => { setForm(null); setTools(false); setDeleting(null); setToast(null); }, [key]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const say = (text, undo = null) => { clearTimeout(toastTimer.current); setToast({ text, undo }); toastTimer.current = setTimeout(() => setToast(null), undo ? 20000 : 4000); };
  const add = () => { if (guard()) setForm({ record: null }); };
  const edit = record => { if (guard()) setForm({ record }); };
  const syncText = { local: authed ? '保存在本机' : '登录后可同步', syncing: '正在核对云端', saving: '正在同步', synced: '已同步', error: '同步需重试' }[status];
  const SyncIcon = status === 'synced' ? Cloud : status === 'error' ? CloudOff : status === 'local' ? Database : RefreshCw;
  return <main className="bp-page">
    <header className="bp-header"><div className="bp-brand"><a className="bp-icon bp-back" href="#/" aria-label="返回主页"><ArrowLeft size={19}/></a><span className="bp-brand-icon"><HeartPulse size={23}/></span><div><span className="bp-eyebrow">A LITTLE CARE, EVERY DAY</span><h1>血压记录<span>把日常，记在心上。</span></h1></div></div><div className="bp-header-actions"><button className="bp-button bp-secondary" onClick={() => setTools(true)} aria-label="数据与备份"><Database size={17}/><span>数据与备份</span></button><button className="bp-button bp-primary bp-desktop-add" onClick={add}><Plus size={18}/>记录一次</button></div></header>
    <div className="bp-page-nav"><div className="bp-page-switch" aria-label="血压记录视图"><button aria-pressed={view === 'overview'} onClick={() => setView('overview')}>健康总览</button><button aria-pressed={view === 'history'} onClick={() => setView('history')}>历史记录<span>{sorted.length}</span></button></div><button className={`bp-sync bp-sync-${status}`} onClick={() => status === 'error' ? store.sync() : setTools(true)} title={error || syncText}><SyncIcon size={13}/><span>{syncText}</span></button></div>
    {status === 'error' && <div className="bp-sync-warning" role="status"><CloudOff size={17}/><span>{store.loadError ? '原记录读取异常，已保留原文。请先导出完整备份。' : '云端暂未同步，本机记录已保留。可重试或先导出备份。'}</span><button onClick={() => store.loadError ? setTools(true) : store.sync()}>{store.loadError ? '备份' : '重试'}</button></div>}
    {view === 'overview' && <div className="bp-overview">
      <section className="bp-latest" aria-label="最新测量"><div className="bp-latest-heading"><span><i/>最近一次测量</span><HeartPulse size={22}/></div>
        {latest ? <><div className="bp-latest-date">{latestTime.label}<span>{latestTime.time} · {latest.period || '日常'}</span></div><div className="bp-latest-values"><div><span>收缩压 <small>大压</small></span><strong>{display(latest.sys)}</strong></div><em>/</em><div><span>舒张压 <small>小压</small></span><strong>{display(latest.dia)}</strong></div><small>mmHg</small></div>
          <div className="bp-latest-reference"><span className={`bp-status bp-tone-${label.kind}`}>{label.text}</span><button className="bp-text-button" onClick={() => edit(latest)}><Pencil size={14}/>编辑</button></div>
          <svg className="bp-latest-wave" viewBox="0 0 400 60" fill="none" aria-hidden="true"><path d="M0 35H75l10-12 12 23 16-39 19 48 16-20h48l12-10 14 21 18-35 20 42 15-18h125" stroke="currentColor" strokeWidth="1.5"/></svg>
          <div className="bp-latest-footer"><div><Heart size={17}/><strong>{display(latest.hr)}</strong><span>bpm<small>心率</small></span></div><div><Activity size={17}/><strong>{number(latest.sys) !== null && number(latest.dia) !== null ? Number(latest.sys) - Number(latest.dia) : '—'}</strong><span>mmHg<small>脉压差</small></span></div></div>
          <p className="bp-comparison">{delta === null ? '这是你的第一次记录，慢慢积累自己的变化。' : `收缩压较上次${delta === 0 ? '持平' : `${delta > 0 ? ' + ' : ' − '}${Math.abs(delta)} mmHg`}，保留每一次真实测量。`}</p>
        </> : <div className="bp-first"><span><HeartPulse size={36}/></span><h2>从今天开始，<br/>关心每一次心跳。</h2><p>记录血压、心率和测量时刻，<br/>让日常变化慢慢有迹可循。</p><button className="bp-button bp-primary" onClick={add}><Plus size={18}/>记录第一次测量</button></div>}
      </section><Trend rows={sorted} range={range} setRange={setRange}/>
    </div>}
    <History rows={sorted} expanded={view === 'history'} setExpanded={() => setView('history')} onEdit={edit} onDelete={r => { if (guard()) setDeleting(r); }}/>
    <div className="bp-bottom-note"><ShieldCheck size={14}/><span>记录保存在当前账号下 · 支持完整备份与恢复</span></div>
    <div className="bp-mobile-dock"><span><HeartPulse size={19}/><b>每一次，都值得记录</b></span><button className="bp-button bp-primary" onClick={add}><Plus size={19}/>记录一次</button></div>
    {form && <RecordForm key={form.record ? recordKey(form.record) : 'new'} record={form.record} onClose={() => setForm(null)} onSave={record => {
      if (!guard()) return;
      store.upsert(record, form.record ? recordKey(form.record) : null);
      setForm(null); say('已保存在本机，云端状态见页面提示');
    }}/>}
    {tools && <DataTools rows={sorted} latest={latest} store={store} say={say} onClose={() => setTools(false)}/>}
    {deleting && <Sheet title="删除这次测量？" subtitle="删除后可撤销，也可从历史备份中合并找回。" small onClose={() => setDeleting(null)} footer={<><button className="bp-button bp-secondary" onClick={() => setDeleting(null)}>保留记录</button><button className="bp-button bp-danger" onClick={() => {
      if (!guard()) return;
      try { const record = deleting; store.remove(recordKey(record)); setDeleting(null); say('这次测量已删除', () => { store.upsert(record); say('已恢复这次测量'); }); }
      catch (e) { say(`删除未完成：${e.message}`); }
    }}><Trash2 size={17}/>确认删除</button></>}><div className="bp-delete-preview"><span>{timeParts(deleting.time).label} {timeParts(deleting.time).time} · {deleting.period || '日常'}</span><strong>{display(deleting.sys)} / {display(deleting.dia)}<small>mmHg</small></strong><p>心率 {display(deleting.hr)} bpm</p></div></Sheet>}
    {toast && createPortal(<div className="bp-toast" role="status"><Check size={16}/><span>{toast.text}</span>{toast.undo && <button onClick={() => { try { toast.undo(); } catch (e) { say(`恢复未完成：${e.message}`); } }}><RotateCcw size={15}/>撤销删除</button>}</div>, document.body)}
  </main>;
}
