import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, Home } from 'lucide-react';

/* ============================================================
   UI 组件图鉴 · 开发者查阅工具页
   - 页面自身即 01 号组件的活演示：顶部通栏导航，滚动后变形为悬浮胶囊吸顶
   - 11 张知识卡片：中文名 / 英文专业名 / 外观 / 场景 / 原理，点击展开收起
   - 纯前端展示，无后台
   ============================================================ */

const COMPONENTS = [
  {
    no: '01', name: '变形胶囊吸顶导航', en: 'Morphing-Pill Navbar', cat: '导航',
    look: '页面在顶部时是一条通栏导航，内容左右分布；向下滚动后动画收缩为一枚居中悬浮的圆角胶囊，毛玻璃底加投影，固定吸顶不随页面滚走。',
    scene: '产品官网、文档站、SaaS 首页等长页面：顶部要大气完整，滚起来之后又不想让导航占空间、还要随时能跳转。',
    how: '监听 scroll 事件，滚动距离超过阈值（如 80px）时给导航挂上收缩态 class；两种态之间用 CSS transition 过渡宽度、内边距、圆角与背景；配合 position: sticky / fixed 实现吸顶。本页顶部的导航就是它的实时演示——试着滚一下。',
    demo: 'pillnav',
  },
  {
    no: '02', name: '浏览器标签小图标', en: 'Favicon', cat: '品牌',
    look: '显示在浏览器标签页、书签栏、历史记录里的 16×16 / 32×32 小图标，是多标签浏览时辨认网站的第一视觉锚点。',
    scene: '所有网站标配；标签开很多的工作党靠它找页面；也是 PWA 安装到桌面后的应用图标来源之一。',
    how: '在 <head> 里用 <link rel="icon"> 声明，可同时给 SVG / PNG / ICO 多个尺寸让浏览器择优；SVG 版本还能跟随系统深色模式切换配色。构建时放在站点根目录并带版本号防缓存。',
    demo: 'favicon',
  },
  {
    no: '03', name: 'API 令牌密钥列表表格', en: 'API Token Table', cat: '数据展示',
    look: '开发者后台的密钥管理表格：名称、脱敏密钥（sk-…****）、创建时间、操作列（复制 / 启停 / 删除），完整密钥只在创建那一刻展示一次。',
    scene: '开放平台、AI 中转站、云服务的「API Keys」页面，任何需要向用户下发访问凭证的系统。',
    how: '服务端只保存哈希、下发脱敏串，避免泄露；复制走 Clipboard API；启停/删除按行级权限校验后整行刷新；操作前弹确认框防误触。',
    demo: 'tokens',
  },
  {
    no: '04', name: '工作台仪表盘', en: 'Dashboard', cat: '数据展示',
    look: 'KPI 统计卡、趋势图表、快捷入口按栅格拼成一屏总览，重要数字大字号突出，次要信息折叠进卡片。',
    scene: '后台管理系统首屏、监控大盘、SaaS 工作台——打开第一眼就要看清「现在怎么样」。',
    how: 'CSS Grid 栅格分区布局；指标数据由轮询或 WebSocket 推送更新；图表由图表库渲染；成熟实现还支持卡片拖拽自定义与布局持久化。',
    demo: 'dashboard',
  },
  {
    no: '05', name: '知识卡片库瀑布流', en: 'Masonry Layout', cat: '布局',
    look: '多列卡片墙，各列高度错落不等，新卡片总是自动填进当前最矮的一列，像砌砖一样向下生长。',
    scene: '知识库、图片站、博客墙、模板市场——卡片高度参差不齐、又要最大化利用纵向空间的场景。',
    how: '三种实现：CSS 多列 columns（简单但顺序竖排）、Grid 的 masonry（仍在草案）、JS 计算每列高度把卡片插到最矮列（可控性最强）；常配合滚动到底加载更多。',
    demo: 'masonry',
  },
  {
    no: '06', name: '采样参数配置面板', en: 'Sampling Panel', cat: '表单与面板',
    look: '滑杆与数值输入框成对出现：Temperature、Top-P、Max Tokens 一行一个参数，拖动即时回显数值，越界自动钳制。',
    scene: 'AI 对话、AI 绘图应用的「参数调节」抽屉或侧栏，调模型的随机性与输出长度。',
    how: 'input[type=range] 与 number 输入双向绑定同一状态；拖动实时写入请求体；min/max/step 做边界校验；参数变化常伴随「恢复默认」按钮。',
    demo: 'sampling',
  },
  {
    no: '07', name: '上下文窗口设置表单', en: 'Context Window Form', cat: '表单与面板',
    look: '上下文长度档位（4K / 8K / 32K…）单选组，配一条「已用 token」进度条和输入框实时字数统计，逼近上限时进度条变色警告。',
    scene: 'AI 对话输入区、长文档总结工具——凡是受模型上下文长度约束的输入场景。',
    how: '用 tokenizer（或字符数近似）实时估算输入 token 数；进度条按 已用/上限 比例渲染，超阈值切换警示色；达到上限后禁用发送或自动截断最早的历史消息。',
    demo: 'context',
  },
  {
    no: '08', name: '模型参数设置面板', en: 'Model Settings Panel', cat: '表单与面板',
    look: '模型下拉选择器打头，下面按分组排布开关、单选、系统提示词文本域，角落常驻一枚「恢复默认」。',
    scene: 'AI 应用的设置页、模型对比工具、Prompt 调试台——需要在不同模型与参数组合间快速切换。',
    how: '受控表单统一收集配置对象，存 localStorage 或云端；切换模型时联动刷新该模型支持的参数范围与默认值；提交时把配置组装进每次推理请求。',
    demo: 'model',
  },
  {
    no: '09', name: '消耗额度统计展示', en: 'Usage / Quota Stats', cat: '数据展示',
    look: '余额大数字打头，配环形或条形进度表示已用比例，下方按日 / 按模型的消耗明细表，临近阈值数字变色告警。',
    scene: 'API 计费后台、订阅制产品的「用量」页，让用户随时掌握还剩多少额度。',
    how: '后端聚合调用日志得到用量；前端用 SVG 圆环（stroke-dasharray 控制弧长）或进度条可视化比例；超过 80% 等阈值切换警示色并触发通知。',
    demo: 'usage',
  },
  {
    no: '10', name: '分页控件', en: 'Pagination', cat: '导航与反馈',
    look: '「‹ 1 2 3 … 8 ›」页码组，当前页高亮，页码过多时用省略号折叠；另一派是无限滚动里的「加载更多」按钮。',
    scene: '任何超过一屏的列表：搜索结果、后台表格、卡片墙、日志查看器。',
    how: '总页数 = 向上取整(总数 ÷ 每页条数)；点页码请求对应页数据并回顶；页码多时折叠中间段只保留首尾与当前邻域；数据量大时改用游标分页（cursor）避免深翻页性能问题。',
    demo: 'pagination',
  },
  {
    no: '11', name: '状态开关切换', en: 'Toggle Switch', cat: '导航与反馈',
    look: '圆角胶囊轨道内一枚圆形滑块，点击在开 / 关之间滑动过渡，开启态常用主题色填充，旁配文字说明当前状态。',
    scene: '设置页的一切布尔配置：通知开关、深色模式、启用 / 禁用某功能。',
    how: '语义上是 checkbox（或 button + aria-checked）换肤：CSS 过渡滑块位移与轨道底色；保留原生 input 保证键盘空格可切换与表单兼容；状态变化即时生效或提交。',
    demo: 'toggle',
  },
];

/* ============ 纯 CSS 迷你演示 ============ */
function Demo({ type }) {
  switch (type) {
    case 'pillnav':
      return <div className="ui-demo">
        <div className="d-browser"><i /><i /><i />
          <div className="d-nav-wide"><b>LOGO</b><span>产品 · 文档 · 关于</span></div>
          <div className="d-nav-pill"><b>LOGO</b><span>菜单</span></div>
        </div>
        <p>上：页面顶部通栏态 · 下：滚动后胶囊态</p>
      </div>;
    case 'favicon':
      return <div className="ui-demo">
        <div className="d-tabs">
          <span className="d-tab is-on"><i className="d-fav">V</i>Voyra · 个人工具中心</span>
          <span className="d-tab"><i className="d-fav d-fav2">G</i>GitHub</span>
          <span className="d-tab"><i className="d-fav d-fav3">M</i>MCP 文档</span>
        </div>
        <p>标签页图标 · 当前页高亮</p>
      </div>;
    case 'tokens':
      return <div className="ui-demo">
        <div className="d-token-head"><span>名称</span><span>密钥</span><span>操作</span></div>
        <div className="d-token-row"><b>生产环境</b><code>sk-voyra-••••••••7f2a</code><em>复制</em></div>
        <div className="d-token-row"><b>测试环境</b><code>sk-voyra-••••••••c91d</code><em>复制</em></div>
        <p>密钥默认脱敏 · 完整值仅创建时可见</p>
      </div>;
    case 'dashboard':
      return <div className="ui-demo">
        <div className="d-dash">
          <div className="d-kpi"><span>今日调用</span><b>12,480</b></div>
          <div className="d-kpi"><span>成功率</span><b>99.2%</b></div>
          <div className="d-chart"><i style={{ height: '40%' }} /><i style={{ height: '65%' }} /><i style={{ height: '52%' }} /><i style={{ height: '88%' }} /><i style={{ height: '70%' }} /></div>
        </div>
        <p>KPI 卡 + 图表区栅格布局</p>
      </div>;
    case 'masonry':
      return <div className="ui-demo">
        <div className="d-masonry">
          <span style={{ height: 44 }} /><span style={{ height: 28 }} /><span style={{ height: 56 }} />
          <span style={{ height: 30 }} /><span style={{ height: 50 }} /><span style={{ height: 36 }} />
        </div>
        <p>三列错落 · 新卡插入最矮列</p>
      </div>;
    case 'sampling':
      return <div className="ui-demo">
        <div className="d-slider"><span>Temperature</span><i className="d-track"><i className="d-fill" style={{ width: '70%' }} /><i className="d-knob" style={{ left: '70%' }} /></i><b>0.7</b></div>
        <div className="d-slider"><span>Top-P</span><i className="d-track"><i className="d-fill" style={{ width: '90%' }} /><i className="d-knob" style={{ left: '90%' }} /></i><b>0.9</b></div>
        <p>滑杆与数值双向绑定</p>
      </div>;
    case 'context':
      return <div className="ui-demo">
        <div className="d-ctx-input">输入你的问题…<em>1,024 / 8,192</em></div>
        <div className="d-ctx-bar"><i style={{ width: '12.5%' }} /></div>
        <p>token 实时估算 · 逼近上限变色</p>
      </div>;
    case 'model':
      return <div className="ui-demo">
        <div className="d-select">voyra-pro-max <i>▾</i></div>
        <div className="d-radio"><i className="on" />流式输出<i className="off" />阻塞返回<i className="off" />JSON 模式</div>
        <p>下拉联动参数范围 · 受控表单</p>
      </div>;
    case 'usage':
      return <div className="ui-demo">
        <div className="d-usage">
          <i className="d-ring" />
          <div className="d-usage-copy"><b>$ 36.50</b><span>已用 73% · 剩 $ 13.50</span></div>
        </div>
        <p>SVG 圆环 · 阈值变色告警</p>
      </div>;
    case 'pagination':
      return <div className="ui-demo">
        <div className="d-pager"><i>‹</i><b>1</b><span>2</span><span>3</span><span>…</span><span>8</span><i>›</i></div>
        <p>当前页高亮 · 省略号折叠</p>
      </div>;
    case 'toggle':
      return <div className="ui-demo">
        <div className="d-toggle-row"><i className="d-toggle on" /><span>深色模式</span><i className="d-toggle" /><span>通知推送</span></div>
        <p>滑块位移过渡 · 键盘可达</p>
      </div>;
    default:
      return null;
  }
}

export default function UIKit() {
  const [shrunk, setShrunk] = useState(false);
  const [openId, setOpenId] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const findScroller = (el) => {
      let node = el && el.parentElement;
      while (node) {
        const oy = getComputedStyle(node).overflowY;
        if (oy === 'auto' || oy === 'scroll') return node;
        node = node.parentElement;
      }
      return null;
    };
    const scroller = findScroller(rootRef.current);
    const onScroll = () => {
      const y = scroller ? scroller.scrollTop : window.scrollY;
      setShrunk(y > 90);
    };
    if (scroller) scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      if (scroller) scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const toggle = (no) => setOpenId((cur) => (cur === no ? null : no));
  const jump = (id) => {
    setOpenId(id);
    window.setTimeout(() => document.getElementById(`comp-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  return <div className="uikit-page" ref={rootRef}>
    <style>{`
      .uikit-page { min-height:100vh; color:#1b1b1b; background:#fff;
        background-image:linear-gradient(rgba(0,0,0,.031) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.031) 1px,transparent 1px);
        background-size:32px 32px;
        font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; }
      .uikit-page * { box-sizing:border-box; }
      .uikit-page button { cursor:pointer; font:inherit; }
      .uikit-page button:focus-visible, .uikit-page a:focus-visible { outline:2px solid #1b1b1b; outline-offset:3px; }

      /* ===== 01 组件本体：变形胶囊吸顶导航 ===== */
      .ui-nav { position:fixed; top:18px; left:50%; transform:translateX(-50%); z-index:60;
        display:flex; align-items:center; justify-content:space-between; gap:24px;
        width:min(100% - 48px, 1160px); padding:15px 24px;
        border:1px solid rgba(27,27,27,.07); border-radius:16px; background:rgba(255,255,255,.4);
        transition:width .5s cubic-bezier(.16,1,.3,1), padding .5s cubic-bezier(.16,1,.3,1), top .5s cubic-bezier(.16,1,.3,1), border-radius .5s cubic-bezier(.16,1,.3,1), background .4s ease, box-shadow .4s ease, border-color .4s ease; }
      .ui-nav.is-shrunk { top:12px; width:min(100% - 40px, 680px); padding:9px 20px;
        border:1px solid rgba(27,27,27,.1); border-radius:999px; background:rgba(255,255,255,.85);
        backdrop-filter:blur(14px) saturate(140%); -webkit-backdrop-filter:blur(14px) saturate(140%);
        box-shadow:0 14px 34px -18px rgba(20,20,20,.4); }
      .ui-nav-logo { display:inline-flex; align-items:center; gap:8px; color:#1b1b1b; font-weight:760; font-size:14.5px; text-decoration:none; white-space:nowrap; }
      .ui-nav-logo i { width:9px; height:9px; flex:0 0 auto; border:1.5px solid #a48830; border-radius:50%; }
      .ui-nav-logo em { font-style:normal; color:#999; font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.06em; transition:opacity .3s ease; }
      .ui-nav.is-shrunk .ui-nav-logo em { opacity:0; width:0; overflow:hidden; }
      .ui-nav-links { display:inline-flex; align-items:center; gap:4px; }
      .ui-nav-links button, .ui-nav-home { display:inline-flex; align-items:center; gap:5px; border:0; border-radius:8px; padding:7px 11px; background:transparent; color:#666; font-size:12.5px; font-weight:600; text-decoration:none; white-space:nowrap; transition:background .18s ease, color .18s ease; }
      .ui-nav-links button:hover, .ui-nav-home:hover { background:var(--hl,#ffe08a); color:#1b1b1b; }
      .ui-nav-links button { transition:background .18s ease, color .18s ease, opacity .35s ease, max-width .45s cubic-bezier(.16,1,.3,1), padding .45s cubic-bezier(.16,1,.3,1); }
      .ui-nav.is-shrunk .ui-nav-links button { max-width:0; opacity:0; padding:7px 0; overflow:hidden; }
      .ui-nav.is-shrunk .ui-nav-home { background:transparent; }
      .ui-nav.is-shrunk .ui-nav-home:hover { background:var(--hl,#ffe08a); }

      /* ===== Hero ===== */
      .ui-hero { width:min(100% - 48px, 1160px); margin:0 auto; padding:150px 0 64px; text-align:left; }
      .ui-hero-kicker { color:#a0a0a0; font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.14em; }
      .ui-hero h1 { margin:18px 0 0; font-size:clamp(52px, 8vw, 96px); font-weight:800; line-height:.98; letter-spacing:-.02em; }
      .ui-hero h1 span { color:transparent; -webkit-text-stroke:2px #1b1b1b; text-shadow:6px 6px 0 rgba(255,224,138,.45); }
      .ui-hero p { max-width:560px; margin:26px 0 0; color:#5c5c5c; font-size:15.5px; line-height:1.9; }
      .ui-hero-stats { display:flex; flex-wrap:wrap; gap:10px 26px; margin-top:30px; color:#666; font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .ui-hero-stats b { color:#1b1b1b; font-size:15px; font-weight:750; margin-right:6px; }
      .ui-hero-cue { display:inline-flex; align-items:center; gap:7px; margin-top:34px; color:#999; font-size:12.5px; animation:ui-cue 1.8s ease-in-out infinite; }
      @keyframes ui-cue { 50% { transform:translateY(5px); } }

      /* ===== 卡片列表 ===== */
      .ui-list { width:min(100% - 48px, 880px); margin:0 auto; padding:20px 0 90px; display:grid; gap:16px; }
      .ui-card { position:relative; border:1px solid rgba(27,27,27,.12); border-radius:14px; background:rgba(255,255,255,.92);
        padding:20px 22px 18px; cursor:pointer; overflow:hidden;
        transition:border-color .22s ease, box-shadow .22s ease, transform .22s cubic-bezier(.16,1,.3,1); }
      .ui-card:hover { border-color:rgba(164,136,48,.5); box-shadow:0 16px 32px -26px rgba(0,0,0,.4); transform:translateY(-2px); }
      .ui-card.is-open { border-color:rgba(164,136,48,.65); box-shadow:0 22px 44px -30px rgba(0,0,0,.45); cursor:default; }
      .ui-card-top { display:flex; align-items:flex-start; gap:14px; }
      .ui-no { flex:0 0 auto; color:transparent; -webkit-text-stroke:1px rgba(164,136,48,.55); font:800 30px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .ui-card-name { display:grid; gap:3px; min-width:0; }
      .ui-card-name h3 { margin:0; font-size:19px; font-weight:760; letter-spacing:-.01em; }
      .ui-card-name em { color:var(--gold,#a48830); font:650 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace; font-style:normal; }
      .ui-card-cat { margin-left:auto; flex:0 0 auto; padding:4px 11px; border:1px solid var(--line,rgba(27,27,27,.12)); border-radius:99px; color:#888; font-size:11px; font-weight:600; }
      .ui-chevron { flex:0 0 auto; align-self:center; color:#999; transition:transform .35s cubic-bezier(.16,1,.3,1); }
      .ui-card.is-open .ui-chevron { transform:rotate(180deg); color:var(--gold,#a48830); }
      .ui-look { margin:13px 0 0; color:#5c5c5c; font-size:13.5px; line-height:1.85; }
      .ui-detail { display:grid; grid-template-rows:0fr; transition:grid-template-rows .5s cubic-bezier(.16,1,.3,1); }
      .ui-card.is-open .ui-detail { grid-template-rows:1fr; }
      .ui-detail-inner { overflow:hidden; }
      .ui-detail-body { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:20px; padding-top:16px; }
      .ui-demo { border:1px solid rgba(27,27,27,.1); border-radius:11px; background:#fafaf8; padding:14px; align-self:start; }
      .ui-demo p { margin:11px 0 0; color:#a0a0a0; font-size:10.5px; text-align:center; }
      .ui-fields { display:grid; gap:14px; align-content:start; }
      .ui-field h4 { display:flex; align-items:center; gap:7px; margin:0; font-size:12px; font-weight:750; color:#1b1b1b; }
      .ui-field h4::before { content:""; width:8px; height:8px; border-radius:2px; background:var(--hl,#ffe08a); border:1px solid rgba(164,136,48,.5); }
      .ui-field p { margin:6px 0 0; color:#5c5c5c; font-size:12.5px; line-height:1.85; }

      /* ===== 迷你演示元素 ===== */
      .uikit-page .ui-demo p { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
      .d-browser { border:1px solid #e2e2e2; border-radius:8px; background:#fff; padding:10px; display:grid; gap:8px; }
      .d-browser i { width:7px; height:7px; border-radius:50%; background:#ddd; display:inline-block; margin-right:4px; }
      .d-nav-wide { display:flex; align-items:center; justify-content:space-between; border:1px dashed #cfcfcf; border-radius:6px; padding:8px 10px; font-size:10px; color:#777; }
      .d-nav-wide b { font-size:10px; color:#1b1b1b; }
      .d-nav-pill { display:flex; align-items:center; justify-content:space-between; margin:0 auto; width:70%; border:1px solid rgba(164,136,48,.5); background:#fff9df; border-radius:99px; padding:6px 12px; font-size:10px; color:#8a6d1c; box-shadow:0 4px 10px -6px rgba(164,136,48,.6); }
      .d-nav-pill b { font-size:10px; color:#1b1b1b; }
      .ui-demo > p { text-align:center; }
      .d-tabs { display:flex; gap:6px; }
      .d-tab { flex:1; min-width:0; display:inline-flex; align-items:center; gap:5px; padding:7px 8px; border:1px solid #e2e2e2; border-bottom:2px solid #d4a930; border-radius:7px 7px 0 0; background:#f4f4f2; font-size:9px; color:#666; white-space:nowrap; overflow:hidden; }
      .d-tab.is-on { background:#fff; color:#1b1b1b; font-weight:650; }
      .d-fav { display:grid; place-items:center; width:14px; height:14px; flex:0 0 14px; border-radius:4px; background:#1b1b1b; color:#ffe08a; font:800 8px/1 sans-serif; font-style:normal; }
      .d-fav2 { background:#24292e; color:#fff; }
      .d-fav3 { background:#3b5bff; color:#fff; }
      .d-token-head, .d-token-row { display:grid; grid-template-columns:56px 1fr 30px; gap:8px; align-items:center; padding:6px 8px; font-size:10px; }
      .d-token-head { color:#a0a0a0; border-bottom:1px solid #e8e8e8; }
      .d-token-row { border-bottom:1px solid #f0f0f0; }
      .d-token-row b { font-weight:600; color:#333; }
      .d-token-row code { font:9px/1.4 ui-monospace,monospace; color:#8a6d1c; background:#fff9df; border-radius:4px; padding:2px 6px; }
      .d-token-row em { color:#a48830; font-style:normal; font-weight:700; }
      .d-dash { display:grid; grid-template-columns:1fr 1fr; grid-template-rows:auto auto; gap:7px; }
      .d-dash .d-kpi { border:1px solid #e5e5e5; border-radius:7px; padding:8px 10px; background:#fff; }
      .d-dash .d-kpi span { display:block; font-size:8.5px; color:#a0a0a0; }
      .d-dash .d-kpi b { font-size:15px; color:#1b1b1b; }
      .d-dash .d-chart { grid-column:1 / -1; display:flex; align-items:flex-end; gap:6px; height:52px; border:1px solid #e5e5e5; border-radius:7px; padding:8px; background:#fff; }
      .d-dash .d-chart i { flex:1; border-radius:3px 3px 0 0; background:linear-gradient(180deg,#d4a930,#efe3b0); }
      .d-masonry { display:columns; columns:3; column-gap:6px; }
      .d-masonry span { display:block; margin-bottom:6px; border-radius:5px; background:linear-gradient(135deg,#fff3c4,#ffe08a); border:1px solid rgba(164,136,48,.35); break-inside:avoid; }
      .d-slider { display:grid; grid-template-columns:74px 1fr 30px; align-items:center; gap:8px; margin-bottom:9px; font-size:10px; color:#555; }
      .d-track { position:relative; height:5px; border-radius:99px; background:#e8e8e4; display:block; }
      .d-fill { position:absolute; left:0; top:0; height:100%; border-radius:99px; background:#d4a930; display:block; }
      .d-knob { position:absolute; top:50%; width:12px; height:12px; border-radius:50%; background:#fff; border:2px solid #a48830; transform:translate(-50%,-50%); display:block; }
      .d-slider b { text-align:right; font-weight:700; color:#1b1b1b; }
      .d-ctx-input { position:relative; border:1px solid #e0e0e0; border-radius:7px; background:#fff; padding:9px 11px; font-size:10px; color:#999; }
      .d-ctx-input em { position:absolute; right:9px; bottom:6px; font:9px/1 ui-monospace,monospace; font-style:normal; color:#a48830; }
      .d-ctx-bar { height:6px; margin-top:7px; border-radius:99px; background:#eee; overflow:hidden; }
      .d-ctx-bar i { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg,#d4a930,#e8c96a); }
      .d-select { display:flex; align-items:center; justify-content:space-between; border:1px solid #e0e0e0; border-radius:7px; background:#fff; padding:8px 11px; font-size:10.5px; font-weight:650; color:#333; margin-bottom:9px; }
      .d-select i { color:#999; font-style:normal; }
      .d-radio { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:9.5px; color:#666; }
      .d-radio i { width:10px; height:10px; border-radius:50%; border:2px solid #cfcfcf; display:inline-block; font-style:normal; }
      .d-radio i.on { border-color:#a48830; background:#ffe08a; }
      .d-radio i.off { border-color:#ddd; background:#fff; }
      .d-usage { display:flex; align-items:center; gap:12px; }
      .d-ring { width:46px; height:46px; flex:0 0 46px; border-radius:50%; background:conic-gradient(#d4a930 0 73%, #eee 73% 100%); display:block; position:relative; }
      .d-ring::after { content:""; position:absolute; inset:6px; border-radius:50%; background:#fafaf8; }
      .d-usage-copy b { display:block; font-size:16px; color:#1b1b1b; }
      .d-usage-copy span { font-size:9px; color:#a0a0a0; }
      .d-pager { display:flex; align-items:center; justify-content:center; gap:5px; }
      .d-pager i, .d-pager b, .d-pager span { display:grid; place-items:center; min-width:22px; height:22px; border-radius:6px; font:600 10px/1 sans-serif; font-style:normal; }
      .d-pager i { color:#999; border:1px solid #e5e5e5; background:#fff; }
      .d-pager b { background:#1b1b1b; color:#fff; }
      .d-pager span { color:#666; border:1px solid #e8e8e8; background:#fff; }
      .d-toggle-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:10px; color:#555; }
      .d-toggle { position:relative; width:30px; height:17px; border-radius:99px; background:#d8d8d4; display:inline-block; transition:background .2s ease; font-style:normal; }
      .d-toggle::after { content:""; position:absolute; top:2px; left:2px; width:13px; height:13px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.25); transition:transform .2s ease; }
      .d-toggle.on { background:#d4a930; }
      .d-toggle.on::after { transform:translateX(13px); }

      /* ===== Footer ===== */
      .ui-footer { width:min(100% - 48px, 880px); margin:0 auto; padding:0 0 46px; color:#b5b5b5; font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }

      @media (max-width:820px) {
        .ui-hero { padding-top:130px; }
        .ui-hero h1 { font-size:clamp(40px, 11vw, 64px); }
        .ui-detail-body { grid-template-columns:1fr; }
        .ui-nav-links button { display:none; }
        .ui-nav.is-shrunk .ui-nav-links button { display:none; }
      }
      @media (prefers-reduced-motion:reduce) {
        .uikit-page *, .uikit-page *::before, .uikit-page *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
      }
    `}</style>

    {/* 01 变形胶囊导航（活演示） */}
    <nav className={`ui-nav${shrunk ? ' is-shrunk' : ''}`}>
      <a className="ui-nav-logo" href="#/"><i />UI 组件图鉴<em>UI COMPENDIUM</em></a>
      <div className="ui-nav-links">
        <button type="button" onClick={() => jump('01')}>导航</button>
        <button type="button" onClick={() => jump('06')}>面板</button>
        <button type="button" onClick={() => jump('10')}>反馈</button>
      </div>
      <a className="ui-nav-home" href="#/"><Home size={14} />返回主页</a>
    </nav>

    {/* 02 Hero 介绍区 */}
    <header className="ui-hero">
      <span className="ui-hero-kicker">UI COMPENDIUM · FOR DEVELOPERS</span>
      <h1>界面组件<br /><span>图鉴</span></h1>
      <p>
        专门讲解网页与后台系统里常见界面组件的查阅手册：每个部件叫什么名字、长什么样子、
        用在什么场景、又是怎么实现的。点击任意卡片展开完整讲解，再点一次收起。
      </p>
      <div className="ui-hero-stats">
        <span><b>11</b>个组件</span>
        <span><b>5</b>个讲解维度</span>
        <span><b>0</b>依赖后台</span>
        <span><b>1</b>个活演示导航</span>
      </div>
      <span className="ui-hero-cue">↓ 向下滚动，导航会变形为胶囊</span>
    </header>

    {/* 03 知识卡片列表 */}
    <main className="ui-list">
      {COMPONENTS.map((c) => {
        const open = openId === c.no;
        return (
          <article
            key={c.no}
            id={`comp-${c.no}`}
            className={`ui-card${open ? ' is-open' : ''}`}
            onClick={() => toggle(c.no)}
            role="button"
            tabIndex={0}
            aria-expanded={open}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c.no); } }}
          >
            <div className="ui-card-top">
              <span className="ui-no">{c.no}</span>
              <span className="ui-card-name"><h3>{c.name}</h3><em>{c.en}</em></span>
              <span className="ui-card-cat">{c.cat}</span>
              <ChevronDown size={18} className="ui-chevron" />
            </div>
            <p className="ui-look">{c.look}</p>
            <div className="ui-detail">
              <div className="ui-detail-inner">
                <div className="ui-detail-body">
                  <Demo type={c.demo} />
                  <div className="ui-fields">
                    <div className="ui-field"><h4>使用场景</h4><p>{c.scene}</p></div>
                    <div className="ui-field"><h4>实现原理</h4><p>{c.how}</p></div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </main>

    <footer className="ui-footer">VOYRA / UI COMPENDIUM · 纯前端查阅手册 · 持续收录新组件</footer>
  </div>;
}
