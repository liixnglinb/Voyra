import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  ArrowLeft, Lightbulb, BookOpen, Baby, CalendarRange, Bot, GitBranch, Sparkles, Film,
} from 'lucide-react';

/**
 * Layout — 页面布局壳（经典简约商务白底风）
 *  - / 首页：全屏（Dashboard 自控）
 *  - 文章页：全屏内容
 *  - 其他工具页：统一"浅灰白背景 + 白卡片页头 + 内容居中容器"外壳
 *    无渐变 / 无光晕 / 无玻璃 / 无弹跳动画
 */

const FULLSCREEN_PATHS = ['/', '/articles', '/mindmap', '/agents', '/uikit'];
const WIDE_WORKSPACE_PATHS = ['/mindmap', '/timetable', '/learning', '/baby-care', '/skills', '/pelican-gallery'];

const TOOL_META = {
  '/prompts': {
    label: '提示词库', sub: '管理 AI 提示词模板，随用随取', Icon: Lightbulb, accent: '#D97706',
  },
  '/learning': {
    label: '学习资料', sub: '学科笔记与资料，知识体系一目了然', Icon: BookOpen, accent: '#059669',
  },
  '/mindmap': {
    label: '思维导图', sub: '把想法展开成可编辑、可保存的结构', Icon: GitBranch, accent: '#A48830',
  },
  '/baby-care': {
    label: '宝宝护理手册', sub: '每一天的成长都值得被温柔记录', Icon: Baby, accent: '#E8835E',
  },
  '/timetable': {
    label: '日程中心', sub: '课程表与日历日程二合一，每周课程与每日安排一站管理', Icon: CalendarRange, accent: '#0EA5E9',
  },
  '/agents': {
    label: 'AI Agent & Skill', sub: '主流 Agent 聚合与高分 Skill 资源', Icon: Bot, accent: '#7C5CFF',
  },
  '/skills': {
    label: 'Skill 热榜', sub: 'GitHub 优质 Skill · 每周热点 · 星数排行，每日自动刷新', Icon: Sparkles, accent: '#D4A930',
  },
  '/pelican-gallery': {
    label: 'AI 模型对比秀', sub: '同一题交给 16 个 AI 模型分别生成 SVG 动画，一页对比', Icon: Film, accent: '#A48830',
  },
};

function getMeta(pathname) {
  // 匹配精确前缀即可（以后 query/hash 不影响）
  for (const [p, meta] of Object.entries(TOOL_META)) {
    if (pathname === p || pathname.startsWith(p + '/')) return meta;
  }
  return null;
}

export default function Layout({ children }) {
  const { pathname } = useLocation();
  // '/' 精确匹配首页；其余子路径按前缀匹配，避免 '/' 误伤所有工具页
  const isFullscreen = FULLSCREEN_PATHS.some(
    (p) => p === '/' ? pathname === '/' : (pathname === p || pathname.startsWith(p + '/'))
  );
  const meta = getMeta(pathname);
  const isWideWorkspace = WIDE_WORKSPACE_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'));
  const isPromptWorkspace = pathname === '/prompts';
  /* 日程中心的页头介绍文字在手机上被账户浮标的避让挤成 6 行竖排，
     且它只是重复三个视图的名字 —— 手机端整条去掉，故给它一个页面级类名 */
  const isScheduleWorkspace = pathname === '/timetable' || pathname.startsWith('/timetable/');

  if (isFullscreen) {
    const isDarkPage = pathname.startsWith('/agents');
    return (
      <div
        className="vr-fullscreen"
        style={{
          overflow: 'auto',
          background: isDarkPage ? '#04060e' : '#FFFFFF',
          color: isDarkPage ? '#e5e7eb' : '#111111',
        }}
      >
        <div style={{ height: '100%', overflow: 'auto' }}>
          {children}
        </div>
      </div>
    );
  }

  // ===== 工具页：统一外壳（简约商务白底） =====
  return (
    <div className={`tool-wrap${isPromptWorkspace ? ' tool-wrap-prompt' : ''}`}>
      <div className={`tool-inner${isWideWorkspace ? ' tool-inner-wide' : ''}${isPromptWorkspace ? ' tool-inner-prompt' : ''}${isScheduleWorkspace ? ' tool-inner-schedule' : ''}`}>
        {/* 页头：白卡片 */}
        {!isPromptWorkspace && meta && (() => {
          const { label, sub, Icon, accent } = meta;
          return (
            <header className="tool-head">
              <div className="tool-head-left">
                <a className="tool-back" href="#/" aria-label="返回主页" title="返回主页"><ArrowLeft size={16} /></a>
                <div className="tool-icon" style={{ color: accent, background: '#fff', border: `1px solid ${accent}33` }}>
                  <Icon size={24} strokeWidth={1.8} />
                </div>
                <div className="tool-head-copy">
                  <h1 className="tool-title">{label}</h1>
                  <p className="tool-sub">{sub}</p>
                </div>
              </div>
              <div className="tool-head-actions">
                {/* 工具页可通过 portal 向页头注入操作区（如日程中心的视图切换） */}
                <div id="tool-head-slot" />
                <div className="tool-head-right">
                  <span className="tool-dot" />
                  <span>数据服务可用</span>
                </div>
              </div>
            </header>
          );
        })()}

        {/* 内容区：浅底白卡片 */}
        <div className={`tool-content${isPromptWorkspace ? ' tool-content-prompt' : ''}`}>
          {children}
        </div>
      </div>

      <style>{`
        .tool-wrap {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          width: 100%;
          background: #f8f9fa;
          color: #212529;
        }

        /* 内容层 */
        .tool-inner {
          position: relative;
          height: 100vh;
          height: 100dvh;
          max-width: 1180px;
          margin: 0 auto;
          padding: 24px 24px 12px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-sizing: border-box;
        }

        /* 页头 */
        .tool-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          row-gap: 12px;
          gap: 16px;
          background: #fff;
          border: 1px solid rgba(20,24,33,.08);
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(16,20,30,.04);
          padding: 16px 20px;
        }
        .tool-head-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .tool-icon {
          width: 46px; height: 46px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .tool-head-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .tool-title {
          margin: 0;
          font-size: 21px;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.1;
          color: #212529;
          white-space: nowrap;
        }
        .tool-sub {
          margin: 0;
          font-size: 12.5px;
          font-weight: 500;
          color: #6c757d;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tool-head-right {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          background: #f8f9fa;
          border: 1px solid rgba(20,24,33,.07);
          color: #6c757d;
          font-size: 11.5px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .tool-dot {
          width: 6px; height: 6px; border-radius: 999px;
          background: #22C55E;
        }

        /* 内容区 */
        .tool-content {
          flex: 1;
          min-height: 0;
          overflow: auto;
          background: #fff;
          border: 1px solid rgba(20,24,33,.07);
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(16,20,30,.04);
          padding: 28px 30px 32px;
          color: #212529;
          --content-accent: #7C5CFF;
          --content-accent-soft: rgba(124,92,255,0.08);
          --content-danger: #EF4444;
          --content-success: #16A34A;
          --content-warn: #F59E0B;
        }
        /* 所有工具页统一：内容不贴边 */
        .tool-content > *:last-child { margin-bottom: 12px; }
        .tool-content td, .tool-content th { padding: 12px 16px; }

        /* ======= 通用卡片：白底细边框小圆角 ======= */
        .tool-content [class*="card"]:not([class*="grid"]),
        .tool-content [class*="Card"]:not([class*="grid"]),
        .tool-content [class*="note-item"],
        .tool-content [class*="note-card"],
        .tool-content [class*="link-item"],
        .tool-content [class*="link-card"],
        .tool-content [class*="prompt-item"],
        .tool-content [class*="prompt-card"],
        .tool-content [class*="material-item"],
        .tool-content [class*="material-card"],
        .tool-content [class*="record-item"],
        .tool-content [class*="record-card"],
        .tool-content [class*="key-item"],
        .tool-content [class*="key-card"],
        .tool-content [class*="draft-item"],
        .tool-content [class*="draft-card"] {
          background: #fff !important;
          border: 1px solid rgba(20,24,33,.09) !important;
          border-radius: 14px !important;
          box-shadow: 0 1px 2px rgba(16,20,30,.04) !important;
          padding: 16px 18px !important;
          transition: border-color .2s ease, box-shadow .2s ease;
        }
        .tool-content [class*="item"]:hover,
        .tool-content [class*="card"]:hover {
          border-color: rgba(20,24,33,.16) !important;
          box-shadow: 0 4px 12px -6px rgba(16,20,30,.12) !important;
        }

        /* ======= 表格 ======= */
        .tool-content tbody tr { transition: background .15s ease; }
        .tool-content tbody tr:hover { background: #f8f9fa !important; }
        .tool-content thead th {
          background: #f8f9fa;
          color: #6c757d !important;
          border-bottom: 1px solid rgba(20,24,33,.08) !important;
          font-weight: 600;
        }

        /* ======= Tab（页签白底灰边） ======= */
        .tool-content [role="tablist"],
        .tool-content [class*="tablist"],
        .tool-content [class*="seg-"],
        .tool-content [class*="filter-row"],
        .tool-content [class*="category-row"] {
          border: 1px solid rgba(20,24,33,.09) !important;
          border-radius: 10px !important;
          background: #f8f9fa !important;
          display: inline-flex !important;
          gap: 2px !important;
          padding: 3px !important;
        }
        .tool-content [role="tab"],
        .tool-content [class*="tablist"] button,
        .tool-content [class*="category-row"] button:not([class*="p-1"]):not([class*="p-2"]) {
          padding: 7px 16px !important;
          border-radius: 8px !important;
          border: 0 !important;
          background: transparent !important;
          color: #6c757d !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          box-shadow: none !important;
        }
        .tool-content [role="tab"]:hover,
        .tool-content [class*="tablist"] button:hover { color: #212529 !important; }
        .tool-content [role="tab"][aria-selected="true"],
        .tool-content [class*="tablist"] button[class*="active"],
        .tool-content [class*="category-row"] button[class*="active"] {
          background: #fff !important;
          color: #212529 !important;
          box-shadow: 0 1px 3px rgba(16,20,30,.1) !important;
        }

        /* ======= 模态框 ======= */
        body [class*="modal"]:not([class*="backdrop"]),
        body [class*="Modal"]:not([class*="backdrop"]) {
          border-radius: 14px !important;
          background: #fff !important;
          border: 1px solid rgba(20,24,33,.1) !important;
          box-shadow: 0 20px 50px -20px rgba(16,20,30,.3) !important;
          padding: 22px 24px !important;
        }
        body [class*="modal-overlay"],
        body [class*="backdrop"] {
          background: rgba(20,24,33,.35) !important;
        }

        /* ======= 滚动条细腻化 ======= */
        .tool-content::-webkit-scrollbar { width: 10px; height: 10px; }
        .tool-content::-webkit-scrollbar-thumb {
          background: #C9CDD6;
          border-radius: 999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .tool-content::-webkit-scrollbar-thumb:hover { background: #AAB0BC; background-clip: content-box; }
        .tool-content::-webkit-scrollbar-track { background: transparent; }

        /* ======= Voyra tool surface ======= */
        .tool-wrap {
          height: 100%;
          min-height: 100%;
          overflow: auto;
          background-color: #fff;
          background-image: linear-gradient(rgba(0,0,0,.031) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.031) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .tool-inner {
          width: min(100% - 48px, 1080px);
          height: auto;
          min-height: 100%;
          padding: 34px 0 56px;
          gap: 0;
        }
        .tool-inner.tool-inner-wide {
          width: min(100% - 48px, 1480px);
          max-width: 1480px;
        }
        .tool-head {
          min-height: 56px;
          padding: 0 0 18px;
          border: 0;
          border-bottom: 1px solid rgba(27,27,27,.13);
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }
        .tool-head-left { gap: 11px; }
        .tool-back {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border: 1px solid rgba(27,27,27,.13);
          border-radius: 6px;
          color: #666;
          text-decoration: none;
          transition: color .18s ease, background .18s ease, transform .18s ease;
        }
        .tool-back:hover { color: #1b1b1b; background: #fff9df; transform: translateX(-2px); }
        .tool-back:focus-visible { outline: 2px solid #1b1b1b; outline-offset: 3px; }
        .tool-icon {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(168,136,26,.46) !important;
          border-radius: 7px;
          background: #fff9e2 !important;
          color: #9a7515 !important;
        }
        .tool-title { color: #1b1b1b; font-size: 20px; font-weight: 760; }
        .tool-sub { color: #777; font-size: 12px; }
        .tool-head-right {
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: #888;
          font: 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        /* 页头操作区：portal 注入内容（如日程中心视图切换）+ 状态标签 */
        .tool-head-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          flex-shrink: 0;
        }
        #tool-head-slot:empty { display: none; }
        .tool-dot { width: 5px; height: 5px; border-radius: 0; background: #a48830; }
        .tool-content {
          display: block;
          flex: 0 0 auto;
          min-height: 0;
          overflow: visible;
          padding: 28px 0 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          color: #1b1b1b;
          --content-accent: #a48830;
          --content-accent-soft: rgba(255,224,138,.48);
        }
        .tool-inner.tool-inner-prompt {
          width: min(100% - 48px, 1280px);
          padding-top: 40px;
        }
        .tool-content.tool-content-prompt { padding-top: 0; }
        .tool-content > *:last-child { margin-bottom: 0; }
        .tool-content :is(input, textarea, select) {
          border-radius: 6px !important;
          border-color: rgba(27,27,27,.17) !important;
          background: rgba(255,255,255,.92) !important;
          color: #1b1b1b !important;
        }
        .tool-content :is(input, textarea, select):focus {
          border-color: #1b1b1b !important;
          box-shadow: 0 0 0 3px rgba(255,224,138,.52) !important;
        }
        .tool-content :is(.glass, .sn-card, .pl-card, .cs-card, .ag-sec, .ag-card, .ag-skill, .ag-rank-row, .hub-box, .ak-group, .ak-key, .nw-bar, .nw-card, .nw-rank-row, .bookmark-card, .pl-sidebar, .pl-empty, .pl-ev, .sn-item, .sn-note, .cs-review, .cs-review-item) {
          border-color: rgba(27,27,27,.13) !important;
          border-radius: 8px !important;
          background: rgba(255,255,255,.9) !important;
          box-shadow: none !important;
        }
        .tool-content :is(.glass, .sn-card, .pl-card, .cs-card, .ag-sec, .hub-box, .ak-group, .nw-bar, .bookmark-card, .pl-sidebar) {
          box-shadow: 0 10px 25px -28px rgba(20,20,20,.55) !important;
        }
        .tool-content :is(.sn-card, .pl-card, .cs-card, .ag-sec, .hub-box, .ak-group, .nw-bar, .bookmark-card, .pl-sidebar):hover {
          border-color: rgba(27,27,27,.22) !important;
          box-shadow: 0 16px 30px -28px rgba(20,20,20,.62) !important;
        }
        .tool-content :is(.btn-primary, .sn-btn-primary, .pl-btn.primary, .cs-btn.primary, .ag-btn.solid, .nw-btn.solid, .hub-open, .bc-btn-primary) {
          border-color: #1b1b1b !important;
          border-radius: 6px !important;
          background: #1b1b1b !important;
          color: #fff !important;
          box-shadow: none !important;
        }
        .tool-content :is(.btn-primary, .sn-btn-primary, .pl-btn.primary, .cs-btn.primary, .ag-btn.solid, .nw-btn.solid, .hub-open, .bc-btn-primary):hover:not(:disabled) {
          border-color: #1b1b1b !important;
          background: #3a3a3a !important;
        }
        .tool-content :is(.btn-default, .sn-btn-ghost, .sn-icobtn, .pl-btn, .cs-btn, .ag-btn, .nw-btn, .ak-act, .pl-action, .bc-btn-secondary) {
          border-radius: 6px !important;
          border-color: rgba(27,27,27,.16) !important;
          background: rgba(255,255,255,.82) !important;
          color: #555 !important;
          box-shadow: none !important;
        }
        .tool-content :is(.btn-default, .sn-btn-ghost, .sn-icobtn, .pl-btn, .cs-btn, .ag-btn, .nw-btn, .ak-act, .pl-action, .bc-btn-secondary):hover:not(:disabled) {
          border-color: #a48830 !important;
          background: #fff9df !important;
          color: #1b1b1b !important;
        }
        .tool-content :is(.sn-tab.active, .sn-type.active, .pl-cat-active, .cat-chip-active, .hub-chip.on, .ag-chip.on, .nw-chip.on, .ak-sel, .cs-chip) {
          border-color: #e0c35f !important;
          background: #ffe08a !important;
          color: #1b1b1b !important;
          box-shadow: none !important;
        }
        .tool-content :is(.sn-tabs, .inline-flex.rounded-full) { border-radius: 7px !important; }
        .tool-content :is(.cat-chip, .hub-chip, .ag-chip, .nw-chip, .sn-type, .pl-cat, .ag-badge, .ag-area, .nw-badge, .nw-imp, .ak-count-badge, .ak-chip) {
          border-radius: 999px !important;
          box-shadow: none !important;
        }
        .tool-content :is(.sn-ic, .pl-ico, .cs-h .ico, .ag-ico, .nw-logo, .hub-logo, .ak-key-dot, .bc-title-icon, .bc-nav-icon) {
          border-radius: 7px !important;
          background: #fff9df !important;
          color: #9a7515 !important;
        }
        .tool-content :is(.weblinks-page, .learning-hub) {
          --accent: #1b1b1b !important;
          --accent-deep: #000 !important;
          --accent-soft: rgba(255,224,138,.42) !important;
          --accent-line: rgba(164,136,48,.55) !important;
          --accent-2: #1b1b1b !important;
          --accent-3: #a48830 !important;
          --sel: rgba(255,224,138,.5) !important;
        }
        .tool-content .pl-gold { --t-gold: #1b1b1b !important; --t-gold-soft: rgba(255,224,138,.42) !important; --t-gold-line: rgba(164,136,48,.55) !important; }
        .tool-content .ak-wrap { --ak: #1b1b1b !important; --ak-2: #000 !important; --ak-soft1: rgba(255,224,138,.42) !important; --ak-soft2: rgba(255,224,138,.62) !important; --ak-line: rgba(164,136,48,.55) !important; }
        .tool-content :is(.pl-gold-bar, .selected-indicator) { background: #ffe08a !important; }
        .tool-content .bc-nav-item.active { background: #ffe08a !important; color: #1b1b1b !important; }
        .tool-content :is(.ag-pre, .nw-pre) { border-radius: 0 0 7px 7px !important; background: #1b1b1b !important; }
        .tool-content table :is(th, td) { border-color: rgba(27,27,27,.13) !important; }
        .tool-content thead th { background: #fff9df !important; color: #555 !important; }
        /* 手机断点抬到 767 与 index.css 对齐（原 720）。
           站点手机口径是 767：index.css 的字号/控件阶梯、各页自己的 @media 都写在 767，
           而这一批 44px 触控兜底却停在 720 —— 结果 721–767（平板竖屏 / 小折叠外屏）
           两头都不沾：既拿不到这里的 44px，也已经被 index.css 当手机处理，
           实测该档 .pl-btn / .cs-btn 只剩 index.css :where 兜的 40px。
           抬到 767 后与 index.css 同一条线，≥768 的桌面渲染一字未动（媒体查询上界变化）。 */
        @media (max-width: 767px) {
          .tool-inner, .tool-inner.tool-inner-wide { width: 100%; padding-left: 0; padding-right: 0; padding-top: 18px; padding-bottom: 34px; }
          .tool-head { align-items: flex-start; }
          .tool-inner.tool-inner-prompt { width: 100%; padding-left: 0; padding-right: 0; padding-top: 18px; }
          .tool-head-right { display: none; }
          /* 手机上返回按钮反而要比桌面更大，凑足拇指命中区 */
          .tool-back { flex: 0 0 auto; width: 40px; height: 40px; }
          .tool-back svg { width: 19px; height: 19px; }
          .tool-title { font-size: var(--fs-h4); line-height: 1.2; }
          .tool-sub { max-width: 300px; white-space: normal; line-height: 1.5; font-size: var(--fs-label); }
          /* 日程中心：介绍文字整条去掉，页头只留标题 + 视图切换 */
          .tool-inner-schedule .tool-sub { display: none; }
          /* 页头与正文共用一条左边线，避免图标/标题/内容逐层缩进 */
          /* 页头左侧对齐正文，右侧给固定账户浮标让位，避免文字被压 */
          /* 只让标题区避让固定的账户浮标；操作区换行后仍可用满整行 */
          .tool-head { padding-left: 0; padding-right: 0; }
          /* 账户区从「用户名 + 退出」胶囊（实测占宽 ~130px）换成 36px 头像后，
             避让从 138px 收到 56px：头像在 right:10px、宽 36，留 10px 呼吸。 */
          .tool-head-left { padding-right: 56px; }
          .tool-head-actions { flex-wrap: wrap; gap: 10px; }
          /* 操作区换行后位于浮标下方，让它用满整行 */
          .tool-head-actions { width: 100%; justify-content: flex-start; }
          /* slot 是 flex 子项，不撑开的话 .shub-modes 的 width:100% 会绕回内容宽度 */
          #tool-head-slot { flex: 1 1 auto; min-width: 0; }
          /* 日程中心手机页头：去掉「日程中心」大字和页头图标，
             视图切换收成一个下拉后够矮，就和返回按钮并到同一行。
             禁止换行 —— .tool-head 基础样式是 flex-wrap:wrap，
             操作区一旦超宽就整组掉到第二行，页头从 63px 变两行。 */
          .tool-inner-schedule .tool-title,
          .tool-inner-schedule .tool-icon { display: none; }
          .tool-inner-schedule .tool-head { align-items: center; flex-wrap: nowrap; }
          .tool-inner-schedule .tool-head-left { padding-right: 0; }
          .tool-inner-schedule .tool-head-actions { width: auto; flex: 1 1 auto; }
          .tool-content { padding: 14px 0 30px; }
          /* 上面那条通用卡片归一化规则写的是 16px 18px !important，
             手机上四层叠加会吃掉 35% 宽度，这里统一收紧 */
          .tool-content :is([class*="card"], [class*="Card"], [class*="note-item"], [class*="link-item"], [class*="prompt-item"], [class*="material-item"], [class*="record-item"], [class*="key-item"], [class*="draft-item"]):not([class*="grid"]) {
            padding: 12px !important;
            border-radius: 12px !important;
          }
          /* 实测卡片竖向余量主要来自正文行距（各页普遍 1.7~1.8）而不是留白：
             padding 早就是 14px，压到 12 只省 4px/卡。这里把卡片内正文行距
             收到 1.6 —— 仍高于站点 1.62 的手机阅读基线附近，不影响可读性 */
          .tool-content :is([class*="card"], [class*="Card"]) :is(p, li) { line-height: 1.6; }
          .tool-content td, .tool-content th { padding: 8px 10px; }
          .tool-content .flex.items-end.justify-between { align-items: flex-start; flex-wrap: wrap; gap: 12px; }
          .tool-content :is(.search-box, .pl-search, .hub-search, .nw-search, .ag-search) { max-width: 100%; }
          body [class*="modal"]:not([class*="backdrop"]):not([class*="overlay"]) { max-width: calc(100vw - 24px) !important; }
          /* 主操作按钮给足 44px 拇指区 */
          .tool-content .btn { min-height: 44px; }
          /* 成对的胶囊/主操作按钮给足 44px；纯图标按钮走 index.css 的 40px 方形规则 */
          .tool-content :is(.cs-btn, .pl-btn, .tp-btn, .bc-nav-item, .ui-cat, .pl-chip, .agx-chip, .sk-tab, .sk-refresh, .cs-tag) { min-height: 44px; }

          /* 上面的分段控件归一化器为了视觉统一，强制 gap:2px 和
             font-size:13px !important；手机上这会直接造成误触和看不清，
             这里用同优先级 + 后置覆盖回来 */
          .tool-content :is([role="tablist"], [class*="tablist"], [class*="seg-"], [class*="filter-row"], [class*="category-row"]) {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: var(--gap-tap) !important;
            padding: 4px !important;
          }
          .tool-content :is([role="tab"], [class*="tablist"] button, [class*="category-row"] button) {
            flex: 1 1 auto;
            min-height: var(--ctl-md) !important;
            padding: 0 14px !important;
            font-size: var(--fs-label) !important;
          }

          /* 主 CTA 阶梯：下载/添加/导入/提交这类页内唯一动作给到 52px */
          .tool-content :is(.btn-primary, .cs-btn.primary, .pl-btn.primary, .bc-btn-primary,
                          .ag-btn.solid, .nw-btn.solid, .hub-open, .sk-refresh,
                          .cs-btn.primary, .tp-btn.primary) {
            min-height: var(--ctl-lg);
            font-size: var(--fs-body);
            padding-left: 20px;
            padding-right: 20px;
          }

          /* 输入框与正文控件对齐到同一阶梯 */
          .tool-content :is(.cs-input, .pl-input, .hub-input, .ag-input, .nw-input, .bc-input) {
            min-height: var(--ctl-md);
            font-size: 16px;   /* 同时避开 iOS 聚焦自动放大 */
          }
        }
      `}</style>
    </div>
  );
}
