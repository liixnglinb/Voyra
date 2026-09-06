import React, { useEffect, useMemo, useRef, useState } from 'react';

/* 轻量 SVG 折线图（替代 chart.js，体积 -90%）
   props 与旧版一致：data / labels / color / height / unit / fill */

function niceCeil(v) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const n = v / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * base;
}

function smoothPath(pts) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export default function TrendChart({ data, labels, color = '#F97316', height = 140, unit = '', fill = false }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const padL = 42;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = Math.max(10, width - padL - padR);
  const innerH = Math.max(10, height - padT - padB);
  const maxVal = niceCeil(Math.max(...data, 0));
  const gradId = `tcg-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  /* 数据签名：变化时折线重放画入动画 */
  const sig = data.join('|');
  /* 均值参考线 */
  const avg = data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0;
  const showAvg = data.length >= 3 && avg > 0 && avg < maxVal;

  const pts = useMemo(() => data.map((v, i) => ([
    padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    padT + (1 - (Math.min(v, maxVal) / maxVal)) * innerH,
    v,
  ])), [data, innerW, innerH, maxVal, padL, padT]);

  const linePath = useMemo(() => smoothPath(pts), [pts]);
  const areaPath = fill && pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1][0]} ${padT + innerH} L ${pts[0][0]} ${padT + innerH} Z`
    : null;

  const onMove = (e) => {
    if (!pts.length) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let best = 0;
    let bestD = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(p[0] - x);
      if (d < bestD) { bestD = d; best = i; }
    });
    setHover(best);
  };

  const fmt = (v) => `${Math.round(v * 10) / 10}${unit}`;
  const isEmpty = !data.length || data.every((v) => !v);
  if (isEmpty) {
    return (
      <div style={{ height: fill ? '100%' : height, width: '100%', display: 'grid', placeItems: 'center' }}>
        <span style={{ color: '#BFB5A6', fontSize: 12.5 }}>暂无数据 · 记录后自动生成图表</span>
      </div>
    );
  }
  const xTickIdx = [];
  const step = Math.max(1, Math.ceil(data.length / 7));
  for (let i = 0; i < data.length; i += step) xTickIdx.push(i);
  if (data.length > 1 && xTickIdx[xTickIdx.length - 1] !== data.length - 1) xTickIdx.push(data.length - 1);

  return (
    <div style={{ height: fill ? '100%' : height, width: '100%', position: 'relative' }}>
      <style>{'@keyframes tc-draw { from { stroke-dashoffset: 2400; } to { stroke-dashoffset: 0; } }'}</style>
      <div
        ref={wrapRef}
        style={{ position: 'absolute', inset: 0 }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {width > 0 && (
          <svg width={width} height={height} style={{ display: 'block' }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {Array.from({ length: 5 }, (_, i) => {
              const y = padT + (1 - i / 4) * innerH;
              return (
                <g key={i}>
                  {i > 0 && <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="rgba(20,24,33,.08)" strokeWidth="1" />}
                  <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#8a8f98">{fmt((maxVal / 4) * i)}</text>
                </g>
              );
            })}
            <line x1={padL} y1={padT + innerH} x2={width - padR} y2={padT + innerH} stroke="rgba(20,24,33,.1)" />
            {xTickIdx.map((i) => (
              <text key={i} x={pts[i][0]} y={height - 6} textAnchor="middle" fontSize="10" fill="#8a8f98">
                {labels ? labels[i] : i + 1}
              </text>
            ))}
            {showAvg && (() => {
              const ay = padT + (1 - Math.min(avg, maxVal) / maxVal) * innerH;
              return (
                <g>
                  <line x1={padL} y1={ay} x2={width - padR} y2={ay} stroke={color} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={width - padR} y={ay - 4} textAnchor="end" fontSize="9" fill={color} opacity="0.75">均值 {fmt(avg)}</text>
                </g>
              );
            })()}
            {hover != null && pts[hover] && (
              <line x1={pts[hover][0]} y1={padT} x2={pts[hover][0]} y2={padT + innerH} stroke={color} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 3" />
            )}
            {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
            <path key={sig} d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ strokeDasharray: 2400, animation: 'tc-draw 1s ease-out both' }} />
            {pts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={hover === i ? 5 : 3.5} fill="#fff" stroke={color} strokeWidth="2" />
            ))}
            {hover != null && pts[hover] && (
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r="5" fill={color} stroke="#fff" strokeWidth="2" />
            )}
          </svg>
        )}
        {hover != null && pts[hover] && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(Math.max(pts[hover][0] - 42, 0), Math.max(0, width - 88)),
              top: Math.max(0, pts[hover][1] - 42),
              background: 'rgba(18,18,20,.96)',
              color: '#fff',
              padding: '6px 10px',
              borderRadius: 8,
              fontSize: 11,
              lineHeight: 1.4,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 6px 16px rgba(0,0,0,.25)',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,.6)' }}>{labels ? labels[hover] : `#${hover + 1}`}</span>
            <span style={{ marginLeft: 6, fontWeight: 600 }}>{fmt(data[hover])}</span>
          </div>
        )}
      </div>
    </div>
  );
}
