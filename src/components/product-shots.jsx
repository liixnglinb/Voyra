/* ==========================================================================
   产品截图外壳 · 6 种真实 UI 形态
   --------------------------------------------------------------------------
   为什么需要它（2026-10-13，用户三次反馈「还是不行」后定位到根因）：

   对照参考站 oiloil.org 的实测数据与四张截图，之前的舞台有两个方向性错误：
     ① **容器错了** —— 本站给舞台画了「1px 描边 + 圆角 14px + 径向渐变底 + 内高光」，
        参考站实测 `.stage` 是 `border:0 / background:transparent /
        border-radius:0 / overflow:visible`，只有 `aspect-ratio:16/9`。
        它不是「面板」，是���块透明画布，产品截图直接浮在白色卡面上。
     ② **内容错了** —— 本站舞台是「数据行 + 进度条」的仪表盘，
        参考站是真实 UI：macOS 窗口、编辑器、Spotlight 搜索框、深色终端、
        框选示意 —— 没有一个是图表。进度条更是图表专属语汇，
        真实产品界面里根本没有「数据热度条」这种东西。

   这 6 种外壳对应参考站里实际出现的形态（括号内是参考站的卡片）：
     Window    macOS 应用窗口（标题栏 + 三点）    —— NotchNotes
     Browser   浏览器窗口（地址栏 + 圆点）        —— Selector 的安装条
     Spotlight macOS 聚焦搜索（浮层 + 结果行）    —— Oil Find
     Terminal  深色终端（标签栏 + 等宽正文）      —— Oil Git
     Sheet     浮起的白色面板（无窗口框）          —— Selector 的框选示意
     Inline    无外壳，纯内容                    —— Text-Well

   共同点：**每个外壳都自带形状**（圆角 + 描边 + 投影），
   所以舞台容器不需要再画任何东西。
   样式在 src/styles/product-shots.css。
   ========================================================================== */

import React from 'react';

/* ── macOS 应用窗口 ──────────────────────────────────────────────────────
   props: title  标题栏居中的标题
           meta   标题栏右侧的小字（如电量、时间）
           dark   窗口内容区用深色（对应 Terminal 那种）
           className 追加类名
   children 是窗口内容区。 */
export function Window({ title, meta, dark, className = '', children }) {
  return (
    <div className={`Window${dark ? ' is-dark' : ''} ${className}`} aria-hidden="true">
      <div className="Window-bar">
        <span className="Window-dots"><i /><i /><i /></span>
        {title ? <span className="Window-title">{title}</span> : null}
        {meta ? (
          <span className="Window-meta">
            {meta.map((m) => <span key={m}>{m}</span>)}
          </span>
        ) : null}
      </div>
      <div className="Window-body">{children}</div>
    </div>
  );
}

/* ── 浏览器窗口 ──────────────────────────────────────────────────────────
   props: url   地址栏显示的域名
           title 窗口标题（也用作无障碍之外的语义，此处纯装饰）
   children 是网页内容区。 */
export function Browser({ url, title, className = '', children }) {
  return (
    <div className={`Browser ${className}`} aria-hidden="true">
      <div className="Browser-bar">
        <span className="Window-dots"><i /><i /><i /></span>
        <span className="Browser-url">
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          {url}
        </span>
      </div>
      <div className="Browser-body" data-title={title}>{children}</div>
    </div>
  );
}

/* ── macOS Spotlight 搜索 ────────────────────────────────────────────────
   props: query 搜索框里的关键词
           rows  结果行数组 [{icon, name, meta, on}]
   第一个 on=true 的行是高亮选中态（真实 Spotlight 就是这样）。 */
export function Spotlight({ query, rows = [], className = '' }) {
  return (
    <div className={`Spotlight ${className}`} aria-hidden="true">
      <div className="Spotlight-field">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <span>{query}</span>
      </div>
      {rows.length ? (
        <div className="Spotlight-rows">
          {rows.map((r) => (
            <div key={r.name} className={`Spotlight-row${r.on ? ' is-on' : ''}`}>
              <i>{r.icon}</i>
              <b>{r.name}</b>
              {r.meta ? <em>{r.meta}</em> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ── 深色终端 ────────────────────────────────────────────────────────────
   props: title   标签栏标题
           badge  右上角状态（如 "main"）
           side   左侧导航区的内容节点
           children 右侧命令输出区
   终端用等宽小字，深色底由 .Terminal 自身提供。 */
export function Terminal({ title, badge, side, className = '', children }) {
  return (
    <div className={`Terminal ${className}`} aria-hidden="true">
      <div className="Terminal-bar">
        <i />
        <span>{title}</span>
        {badge ? <em>{badge}</em> : null}
      </div>
      <div className="Terminal-body is-dark">
        {side ? <div className="Terminal-side">{side}</div> : null}
        <div className="Terminal-main">{children}</div>
      </div>
    </div>
  );
}

/* ── 浮起白面板（无窗口框）───────────────────────────────────────────────
   适合「工具本身没有窗口形态」的产品（参考站 Selector 的框选示意）。 */
export function Sheet({ className = '', children }) {
  return (
    <div className={`Sheet ${className}`} aria-hidden="true">
      <div className="Sheet-body">{children}</div>
    </div>
  );
}

/* ── 无外壳（纯内容）─────────────────────────────────────────────────────
   适合「内容本身就是产品」的场景（参考站 Text-Well：几行正文 + 分隔线）。 */
export function Inline({ lines = [], className = '', children }) {
  return (
    <div className={`Inline ${className}`} aria-hidden="true">
      {children}
      {lines.map((l, i) => (
        l === '-' ? <span key={i} className="Inline-line" />
                   : <span key={i} className="UI-title">{l}</span>
      ))}
    </div>
  );
}

/* ── 内容原子 ────────────────────────────────────────────────────────────
   下面这些是无背景色的最小排版元素，底色交给外壳。 */

/** 一行「标题 + 值」，用于设置项 / 键值表 */
export function Row({ children, value }) {
  return (
    <div className="UI-row">
      <b>{children}</b>
      {value ? <em>{value}</em> : null}
    </div>
  );
}

/** 一条 1px 分隔线 */
export function Sep() {
  return <span className="UI-sep" />;
}

/** 一个键值对（「标签 …… 值」），标签左灰值右墨 */
export function KV({ label, value }) {
  return (
    <div className="UI-kv">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

/** 终端里的一行等宽正文。tone 决定颜色：默认绿、dim 灰、key 蓝、prompt 黄 */
export function Term({ tone = '', children }) {
  return <div className={`UI-term${tone ? ` is-${tone}` : ''}`}>{children}</div>;
}