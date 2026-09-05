import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, Bot, CalendarRange, Check, ChevronDown, Code2, Github,
  Globe, HardDrive, LayoutGrid, Lightbulb, ListTree, Shapes,
  NotebookPen, Route, Sparkles, Star,
} from 'lucide-react';
import ArticleCover from '../components/ArticleCover';
import { ARTICLES } from '../data/articles';

const FEATURED = [
  { to: 'https://apilxl.bbroot.com/', external: true, no: '01', name: 'Voyra Relay API', desc: '统一 API 网关，接入海量 AI 模型，集中管理请求、路由与成本。', cta: '访问网关', Icon: Globe, art: 'api' },
  { to: '/timetable', no: '02', name: '日程中心', desc: '课程表与日历日程二合一，每周课程与每日安排一站管理。', cta: '打开日程', Icon: CalendarRange, art: 'timetable' },
  { to: '/prompts', no: '03', name: '提示词库', desc: '把常用指令、模板和使用场景放在一个随时可检索的位置。', cta: '管理提示词', Icon: Lightbulb, art: 'prompts' },
  { to: '/uikit', no: '04', name: '组件图鉴', desc: '网页与后台常见界面组件：名称、外观、场景与原理一页讲清。', cta: '查看图鉴', Icon: Shapes, art: 'uikit' },
  { to: '/skills', no: '05', name: 'Skill 热榜', desc: 'GitHub 优质 Skill 与每周热点，星数排行每天自动刷新。', cta: '查看热榜', Icon: Sparkles, art: 'skills' },
  { to: '/agents', no: '06', name: 'AI Agent', desc: '汇集 Agent 与 Skill 的实用入口，快速进入合适的工作流。', cta: '查看资源', Icon: Bot, art: 'agents' },
  { to: '/mindmap', no: '07', name: '思维导图', desc: '将学习与创作中的线索展开为可继续补充的结构。', cta: '打开导图', Icon: Route, art: 'mindmap' },
  { to: '/baby-care', no: '08', name: '宝宝护理', desc: '记录宝宝的作息、喂养和成长数据，让日常护理有迹可循。', cta: '进入护理', Icon: Sparkles, art: 'care' },
];


const APPS = [
  { to: '/modelflow/', external: false, no: '01', name: 'ModelFlow 智模流水线', desc: '数学建模竞赛全自动工作流，从赛题解析到论文 PDF，九步流水线一键跑完。仅支持 Windows 10/11。', cta: '下载软件', Icon: Sparkles, art: 'modelflow' },
  { to: '/checkin/', external: false, no: '02', name: '学习通自动签到助手', desc: '桌面端常驻后台，自动监听课程签到活动，支持普通签到、位置签到、二维码签到三种类型，内置智能防风控。', cta: '下载软件', Icon: CalendarRange, art: 'checkin' },
  { to: '/local-toolbox/', external: false, no: '03', name: '本地工具箱', desc: 'Windows 本地磁盘清理与系统工具平台：智能分类、深度解析、目录百科，删除永远由你确认。', cta: '下载软件', Icon: HardDrive, art: 'toolbox' },
];

const MATHMODEL_SKILL = {
  href: 'https://github.com/liixnglinb/mathmodel-skill',
  name: '数学建模 Skill',
  tagline: '国赛（CUMCM）数学建模十阶段工作流',
};

const HERO_LAYERS = [
  '/hero/voyra-person-skin-v3.webp',
  '/hero/voyra-person-body-v2.webp',
  '/hero/voyra-person-hair-v2.webp',
  '/hero/voyra-person-collar-v2.webp',
];

function preloadHeroLayer(src) {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    // 图片请求停滞时兜底：单张最多等 3 秒，不能让人物永远不出现
    const timer = setTimeout(finish, 3000);
    const done = () => {
      // decode 仅用于首帧平滑，自身也可能挂起，限时 1.5 秒
      const decoding = image.decode ? image.decode().catch(() => undefined) : Promise.resolve();
      Promise.race([decoding, new Promise((resolve) => setTimeout(resolve, 1500))]).then(finish, finish);
    };
    image.addEventListener('load', done, { once: true });
    image.addEventListener('error', finish, { once: true });
    image.src = src;
    if (image.complete) done();
  });
}

const EXPERIENCES = [
  { state: '现在', name: 'Voyra 个人站', desc: '云端一站式创作与效率平台，聚合常用工具与 AI 资源。', Icon: NotebookPen },
  { state: '基建', name: 'Cloudflare Pages', desc: 'GitHub 推送后自动构建，自定义域名稳定访问。', Icon: Globe },
  { state: '数据', name: 'Bmob 云后端', desc: '工具数据可云端保存，免去自建服务端的维护成本。', Icon: LayoutGrid },
];

const CONTACTS = [
  { no: '01', label: 'GitHub', value: '@liixnglinb', href: 'https://github.com/liixnglinb', Icon: Github },
  { no: '02', label: 'Email', value: 'lixingli1024@qq.com', copy: true, Icon: Sparkles },
  { no: '03', label: '网站', value: 'lxlrwxs.top', href: 'https://lxlrwxs.top', Icon: Globe },
];

const TABS = [['products', '产品'], ['skills', 'Skills'], ['apps', '应用'], ['me', '关于我'], ['contact', '交流']];
function getTabFromHash() {
  const query = window.location.hash.split('?')[1] || '';
  const tab = new URLSearchParams(query).get('tab');
  return TABS.some(([id]) => id === tab) ? tab : 'products';
}

function useNativeSmoothScroll(rootRef) {
  useEffect(() => {
    const scroller = rootRef.current?.parentElement;
    if (!scroller) return undefined;
    const previous = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = 'smooth';
    return () => { scroller.style.scrollBehavior = previous; };
  }, [rootRef]);
}

function useReveal(rootRef, activeTab) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const scroller = root.parentElement;
    const nodes = root.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('vr-is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { root: scroller || null, threshold: 0.15 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [activeTab, rootRef]);
}

function useScrollRoll(rootRef, activeTab) {
  useEffect(() => {
    const root = rootRef.current;
    const scroller = root?.parentElement;
    if (!root || !scroller || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame = 0;
    let needsUpdate = true;
    const activeNodes = new Set();
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const smoothStep = (value) => value * value * (3 - (2 * value));
    const update = () => {
      frame = 0;
      if (!needsUpdate) return;
      const viewport = scroller.getBoundingClientRect();
      activeNodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const local = clamp((viewport.height - (rect.top - viewport.top)) / Math.max(1, viewport.height + rect.height), 0, 1);
        const entering = smoothStep(clamp((0.3 - local) / 0.3, 0, 1));
        const leaving = smoothStep(clamp((local - 0.7) / 0.3, 0, 1));
        node.style.setProperty('--roll-origin-y', entering > 0 ? '4%' : leaving > 0 ? '96%' : '50%');
        node.style.setProperty('--roll-angle', `${(-14 * entering) + (28 * leaving)}deg`);
        node.style.setProperty('--roll-angle-mobile', `${(-9 * entering) + (18 * leaving)}deg`);
        node.style.setProperty('--roll-y', `${(6 * entering) - (10 * leaving)}px`);
        node.style.setProperty('--roll-opacity', `${1 - (0.1 * entering) - (0.14 * leaving)}`);
      });
      needsUpdate = false;
    };
    const requestUpdate = () => {
      needsUpdate = true;
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('vr-scroll-active', entry.isIntersecting);
        if (entry.isIntersecting) activeNodes.add(entry.target);
        else activeNodes.delete(entry.target);
      });
      requestUpdate();
    }, { root: scroller, rootMargin: '100% 0px 100% 0px' });
    const nodes = root.querySelectorAll('[data-roll]');
    nodes.forEach((node) => observer.observe(node));
    scroller.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    requestUpdate();
    return () => {
      scroller.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      observer.disconnect();
      activeNodes.clear();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [activeTab, rootRef]);
}

function updateSpotlight(event) {
  const card = event.currentTarget;
  const bounds = card.getBoundingClientRect();
  card.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
  card.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
}

function getToolUrl(path) {
  return `${window.location.origin}${window.location.pathname}#${path}`;
}

function FeatureArt({ type }) {
  const [active, setActive] = useState(0);
  const [checked, setChecked] = useState(false);

  if (type === 'api') {
    const protocols = ['Chat', 'Responses', 'Claude', 'Gemini'];
    const endpoints = ['/v1/chat/completions', '/v1/responses', '/v1/messages', '/v1beta/models'];
    return <div className="vr-art vr-tool-art vr-api-art">
      <div className="vr-api-tabs" role="tablist" aria-label="API 协议预览">{protocols.map((protocol, index) => <button type="button" key={protocol} role="tab" aria-selected={active === index} className={active === index ? 'is-active' : ''} onClick={() => setActive(index)}>{protocol}</button>)}</div>
      <div className="vr-api-route"><span><i /> 200 OK</span><b>POST</b><code>{endpoints[active]}</code></div>
      <div className="vr-api-pane"><div><span>REQUEST</span><code>{active === 2 ? 'model: claude-sonnet-4' : active === 3 ? 'model: gemini-2.5-pro' : 'model: gpt-5'}</code></div><div><span>RESPONSE</span><code>stream: connected</code></div></div>
      <div className="vr-api-metrics"><span><b>142</b> MS</span><span><b>27</b> TOKENS</span><span><b>$0.002</b> COST</span></div>
    </div>;
  }

  if (type === 'prompts') return <div className="vr-art vr-tool-art vr-prompts-art">
    <div className="vr-preview-top"><Code2 size={15} /><span>Prompt.md</span><b>模板</b></div>
    <div className="vr-prompt-copy"><span>请基于以下资料</span><mark>{['提炼结构', '给出行动项', '保留语气'][active]}</mark><span>输出一份清晰的回答。</span></div>
    <div className="vr-preview-actions">{['结构', '行动', '语气'].map((item, index) => <button className={active === index ? 'is-active' : ''} onClick={() => setActive(index)} key={item}>{item}</button>)}</div>
  </div>;

  if (type === 'agents') return <div className="vr-art vr-tool-art vr-agents-art">
    <div className="vr-preview-top"><Bot size={15} /><span>工作流</span><b>{active + 1}/3</b></div>
    <div className="vr-agent-flow">{['检索', '分析', '交付'].map((item, index) => <React.Fragment key={item}><button onClick={() => setActive(index)} className={active === index ? 'is-active' : ''}><i>{String(index + 1).padStart(2, '0')}</i>{item}</button>{index < 2 && <span />}</React.Fragment>)}</div>
    <p>当前节点：{['收集资料', '整理判断', '输出结果'][active]}</p>
  </div>;

  if (type === 'timetable') {
    const days = ['一', '二', '三', '四', '五'];
    const courses = ['高数', '算法', '英语', '数据结构', '自习'];
    const plans = ['09:30 课程资料整理', '15:00 项目复盘', '20:30 晚间阅读', '12:00 图书馆还书', '18:00 篮球局'];
    return <div className="vr-art vr-tool-art vr-timetable-art">
      <div className="vr-preview-top"><CalendarRange size={15} /><span>第 3 周 · 课程 + 日程</span><b>2 合 1</b></div>
      <div className="vr-week-strip">{days.map((d, i) => <button key={d} className={active === i ? 'is-active' : ''} onClick={() => setActive(i)}><b>周{d}</b><span>{courses[i]}</span></button>)}</div>
      <div className="vr-day-line"><i>{active === 1 ? <Check size={11} /> : ''}</i><span>{plans[active]}</span><em>日程</em></div>
    </div>;
  }

  if (type === 'skills') {
    const rows = [['anthropics/skills', '44.2k'], ['obra/superpowers', '17.9k'], ['fastmcp', '11.6k']];
    return <div className="vr-art vr-tool-art vr-skills-art">
      <div className="vr-preview-top"><Sparkles size={15} /><span>GitHub Skill 热榜</span><b>每日更新</b></div>
      <div className="vr-skill-rank">{rows.map((r, i) => <button key={r[0]} className={active === i ? 'is-active' : ''} onClick={() => setActive(i)}><i>{String(i + 1).padStart(2, '0')}</i><span>{r[0]}</span><em>{r[1]}</em></button>)}</div>
      <div className="vr-skill-foot"><Star size={11} />优质精选 · 每周热点</div>
    </div>;
  }

  if (type === 'learning') return <div className="vr-art vr-tool-art vr-learning-art">
    <div className="vr-preview-top"><LayoutGrid size={15} /><span>资料库</span><b>24 条</b></div>
    <div className="vr-material-stack">{['论文精读', '课程笔记', '代码片段'].map((item, index) => <button onClick={() => setActive(index)} className={active === index ? 'is-active' : ''} key={item}><i>{String(index + 1).padStart(2, '0')}</i><span>{item}</span><em>{['PDF', 'MD', 'JS'][index]}</em></button>)}</div>
  </div>;

  if (type === 'mindmap') return <div className="vr-art vr-tool-art vr-mindmap-art">
    <div className="vr-preview-top"><ListTree size={15} /><span>项目规划</span><b>导图</b></div>
    <div className="vr-map-stage"><button className="vr-map-root" onClick={() => setActive(0)}>Voyra</button>{['内容', '产品', '迭代'].map((item, index) => <button className={`vr-map-node n${index}${active === index + 1 ? ' is-active' : ''}`} onClick={() => setActive(index + 1)} key={item}>{item}</button>)}</div>
  </div>;

  if (type === 'uikit') {
    const rows = [['变形胶囊导航', 'Morphing Navbar'], ['状态开关', 'Toggle Switch'], ['分页控件', 'Pagination']];
    return <div className="vr-art vr-tool-art vr-uikit-art">
      <div className="vr-preview-top"><Shapes size={15} /><span>UI 组件图鉴</span><b>11 组件</b></div>
      <div className="vr-uikit-list">{rows.map((r, i) => <button key={r[0]} className={active === i ? 'is-active' : ''} onClick={() => setActive(i)}><span>{r[0]}</span><em>{r[1]}</em></button>)}</div>
      <div className="vr-uikit-foot">点击卡片 · 展开原理</div>
    </div>;
  }


  if (type === 'modelflow') {
    const steps = ['题意', '假设', '建模', '求解', '检验', '论文'];
    return <div className="vr-art vr-tool-art vr-modelflow-art">
      <div className="vr-preview-top"><Sparkles size={15} /><span>ModelFlow 流水线</span><b>9 步</b></div>
      <div className="vr-model-flow">{steps.map((step, index) => <React.Fragment key={step}><button className={active === index ? 'is-active' : ''} onClick={() => setActive(index)}><i>{String(index + 1).padStart(2, '0')}</i>{step}</button>{index < steps.length - 1 && <span />}</React.Fragment>)}</div>
      <div className="vr-model-flow-status"><span>当前阶段：{['解析题目', '建立假设', '构建模型', '求解计算', '结果检验', '撰写论文'][active]}</span><b>{active + 1}/6</b></div>
    </div>;
  }

  if (type === 'checkin') {
    const courses = ['自动控制原理', '电力电子技术', '单片机原理'];
    const statuses = ['监听中', '已签到', '监听中'];
    return <div className="vr-art vr-tool-art vr-checkin-art">
      <div className="vr-preview-top"><CalendarRange size={15} /><span>签到监控</span><b>18 门课</b></div>
      <div className="vr-checkin-stats"><span><b>6</b> 今日成功</span><span><b>1</b> 待处理</span><span><b>156</b> 累计</span></div>
      <div className="vr-checkin-list">{courses.map((course, index) => <button key={course} className={active === index ? 'is-active' : ''} onClick={() => setActive(index)}><span>{course}</span><em className={statuses[index] === '已签到' ? 'done' : 'monitoring'}>{statuses[index]}</em></button>)}</div>
    </div>;
  }

  if (type === 'toolbox') {
    const cats = [['系统文件', '12.4G'], ['软件缓存', '8.1G'], ['下载文件', '3.2G'], ['大文件', '1.9G']];
    return <div className="vr-art vr-tool-art vr-toolbox-art">
      <div className="vr-preview-top"><HardDrive size={15} /><span>磁盘扫描</span><b>{active ? '已清理 3.6G' : '24 万+ 文件'}</b></div>
      <div className="vr-toolbox-drive"><span>C: 系统盘</span><i className={active ? 'is-done' : ''} style={{ '--fill': '62%' }}><b /></i><em>{active ? '已清理 3.6 GB' : '已用 62% · 可清理 18.4 GB'}</em></div>
      <div className="vr-toolbox-cats">{cats.map((c, index) => <button key={c[0]} className={active === index ? 'is-active' : ''} onClick={() => setActive(index)}><span>{c[0]}</span><em>{c[1]}</em></button>)}</div>
      <div className="vr-toolbox-foot"><b>9 大功能</b><span>扫描 · 缓存清理 · 目录百科 · 重复文件</span></div>
    </div>;
  }

  return <div className="vr-art vr-tool-art vr-care-art">
    <div className="vr-preview-top"><Sparkles size={15} /><span>今日护理</span><b>{checked ? '已记录' : '待记录'}</b></div>
    <div className="vr-care-stats"><span><b>02</b> 喂养</span><span><b>03</b> 睡眠</span><span><b>01</b> 护理</span></div>
    <button className={`vr-care-check${checked ? ' is-active' : ''}`} onClick={() => setChecked((value) => !value)}>{checked ? <Check size={14} /> : '+'}{checked ? ' 今日记录完成' : ' 标记一条护理记录'}</button>
  </div>;
}

function ProductPanel({ openProduct }) {
  return <div className="vr-product-list">{FEATURED.map((feature, index) => {
    const Icon = feature.Icon;
    const openFeature = (event) => {
      if (event.target.closest('button')) return;
      openProduct(feature.to, feature.external);
    };
    return (
      <div className="vr-roll-wrap vr-panel-stagger" data-roll key={feature.to}><article className={`vr-feature vr-card${index % 2 ? ' is-reverse' : ''}${feature.art === 'api' ? ' is-api' : ''}`} data-reveal style={{ '--reveal-delay': `${Math.min(index * 0.08, 0.28)}s` }} onPointerMove={updateSpotlight} onClick={openFeature} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openProduct(feature.to, feature.external); } }} role="link" tabIndex={0}>
        <span className="vr-spotlight" aria-hidden="true" />
        <div className="vr-feature-copy"><span className="vr-feature-index">{String(index + 1).padStart(2, '0')}</span><div className="vr-feature-title"><Icon size={24} strokeWidth={1.7} /><h2>{feature.name}</h2></div><p>{feature.desc}</p><button className="vr-arrow-link" onClick={() => openProduct(feature.to, feature.external)}>{feature.cta}<ArrowUpRight size={17} /></button></div>
        <FeatureArt type={feature.art} />
      </article></div>
    );
  })}</div>;
}

function SkillsPanel() {
  const workflow = ['题意', '假设', '变量', '建模', '求解', '检验', '评价', '图表', '论文', '提交'];
  return <section className="vr-skill-group vr-solo-skill vr-panel-stagger" data-roll>
    <div className="vr-group-label"><span>我的 Skills</span><b>01</b></div>
    <a className="vr-mathmodel-card vr-card" data-reveal href={MATHMODEL_SKILL.href} target="_blank" rel="noreferrer" onPointerMove={updateSpotlight}>
      <span className="vr-spotlight" aria-hidden="true" />
      <span className="vr-mathmodel-watermark" aria-hidden="true">10</span>
      <span className="vr-mathmodel-top"><span className="vr-mathmodel-kicker">CUMCM / REUSABLE WORKFLOW</span><span className="vr-mathmodel-meta"><Star size={16} fill="currentColor" /> GitHub</span><span className="vr-mathmodel-open"><ArrowUpRight size={17} /></span></span>
      <span className="vr-mathmodel-heading"><strong>{MATHMODEL_SKILL.name}</strong><span>{MATHMODEL_SKILL.tagline}</span></span>
      <span className="vr-model-workflow" aria-label="数学建模十阶段工作流">{workflow.map((step, index) => <span className={index === 3 ? 'is-core' : ''} key={step}><i>{String(index + 1).padStart(2, '0')}</i><b>{step}</b></span>)}</span>
      <span className="vr-model-caption"><b>10</b> STEPS / FROM QUESTION TO PAPER</span>
    </a>
  </section>;
}

function AppsPanel({ openProduct }) {
  return <div className="vr-product-list">{APPS.map((app, index) => {
    const Icon = app.Icon;
    const openApp = (event) => {
      if (event.target.closest('button')) return;
      window.open(window.location.origin + app.to, '_blank', 'noopener,noreferrer');
    };
    return (
      <div className="vr-roll-wrap vr-panel-stagger" data-roll key={app.to}><article className={`vr-feature vr-card${index % 2 ? ' is-reverse' : ''}`} data-reveal style={{ '--reveal-delay': `${Math.min(index * 0.08, 0.28)}s` }} onPointerMove={updateSpotlight} onClick={openApp} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); openApp(event); } }} role="link" tabIndex={0}>
        <span className="vr-spotlight" aria-hidden="true" />
        <div className="vr-feature-copy"><span className="vr-feature-index">{String(index + 1).padStart(2, '0')}</span><div className="vr-feature-title"><Icon size={24} strokeWidth={1.7} /><h2>{app.name}</h2></div><p>{app.desc}</p></div>
        <FeatureArt type={app.art} />
      </article></div>
    );
  })}</div>;
}

function AboutPanel() {
  return <div className="vr-about-panel">
    <section className="vr-about-intro" data-roll><span>SHUAI SHUAI / VOYRA</span><p>个人开发者，持续把灵感、工具和 AI 能力整理成真正能反复使用的产品。</p><div className="vr-tags" aria-label="个人标签">{['VOYRA', 'FRONTEND', 'AI', 'CREATOR', 'CLOUDFLARE', 'BMOB'].map((tag) => <span key={tag}>{tag}</span>)}</div></section>
    <section className="vr-experience" data-reveal><div className="vr-experience-label"><span>经历 / EXPERIENCE</span><b>持续构建</b></div><div className="vr-experience-list">{EXPERIENCES.map((item, index) => {
      const Icon = item.Icon;
      return <article className="vr-experience-card vr-card" data-reveal style={{ '--reveal-delay': `${Math.min(index * 0.08, 0.2)}s` }} onPointerMove={updateSpotlight} key={item.name}><span className="vr-spotlight" aria-hidden="true" /><span className="vr-experience-index">{String(index + 1).padStart(2, '0')}</span><div><span>{item.state}</span><h2>{item.name}</h2><p>{item.desc}</p></div><Icon className="vr-experience-icon" size={35} strokeWidth={1.35} /></article>;
    })}</div></section>
  </div>;
}

function TabReel({ activeTab }) {
  const number = String(TABS.findIndex(([id]) => id === activeTab) + 1).padStart(2, '0');
  return <span className="vr-tab-reel" aria-hidden="true">{number.split('').map((digit, index) => <span className="vr-tab-reel-digit" key={`${activeTab}-${index}`} style={{ '--reel-delay': `${index * 0.1}s` }}>{digit}</span>)}</span>;
}

function ContactPanel() {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);
  const copyEmail = async () => {
    const email = 'lixingli1024@qq.com';
    try { await navigator.clipboard.writeText(email); } catch {
      const ta = document.createElement('textarea');
      ta.value = email;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };
  return <section className="vr-contact-panel" data-roll><div className="vr-contact-head" data-reveal><span>联系 / ELSEWHERE</span><b>保持交流</b></div><div className="vr-contact-list">{CONTACTS.map((contact, index) => {
    const Icon = contact.Icon;
    const reveal = { '--reveal-delay': `${index * 0.08}s` };
    const feedback = contact.copy && copied;
    const inner = <React.Fragment><span>{contact.no}</span><Icon size={19} strokeWidth={1.6} /><strong>{contact.label}</strong><em>{feedback ? '已复制，可直接粘贴' : contact.value}</em>{feedback ? <Check size={18} /> : <ArrowUpRight size={18} />}</React.Fragment>;
    return contact.copy ? (
      <button type="button" className="vr-contact-row" data-reveal style={reveal} key={contact.label} onClick={copyEmail} title="点击复制邮箱">{inner}</button>
    ) : (
      <a href={contact.href} className="vr-contact-row" data-reveal style={reveal} target="_blank" rel="noreferrer" key={contact.label}>{inner}</a>
    );
  })}</div></section>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [progress, setProgress] = useState(0);
  const [personReady, setPersonReady] = useState(false);
  const rootRef = useRef(null);
  const panelRefs = useRef({});
  useNativeSmoothScroll(rootRef);
  useReveal(rootRef, activeTab);
  useScrollRoll(rootRef, activeTab);

  useEffect(() => {
    let cancelled = false;
    const show = () => { if (!cancelled) setPersonReady(true); };
    Promise.all(HERO_LAYERS.map(preloadHeroLayer)).then(show);
    // 保底：任何情况下（请求停滞/后台标签页等）人物最迟 3.5 秒出现，不依赖 rAF
    const failsafe = setTimeout(show, 3500);
    return () => { cancelled = true; clearTimeout(failsafe); };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const scroller = root?.parentElement;
    if (!root || !scroller) return undefined;
    const updateProgress = () => {
      const available = scroller.scrollHeight - scroller.clientHeight;
      setProgress(available > 0 ? Math.round((scroller.scrollTop / available) * 100) : 0);
    };
    scroller.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
    return () => scroller.removeEventListener('scroll', updateProgress);
  }, []);

  const go = useCallback((to) => navigate(to), [navigate]);
  const openProduct = useCallback((target, external = false) => {
    window.open(external ? target : getToolUrl(target), '_blank', 'noopener,noreferrer');
  }, []);
  const changeTab = useCallback((next, updateHash = true) => {
    setActiveTab(next);
    if (updateHash) {
      const url = new URL(window.location.href);
      url.hash = `/?tab=${next}`;
      window.history.replaceState(window.history.state, '', url);
    }
  }, []);
  const panels = useMemo(() => ({
    products: <ProductPanel openProduct={openProduct} />,
    skills: <SkillsPanel />,
    apps: <AppsPanel openProduct={openProduct} />,
    me: <AboutPanel />,
    contact: <ContactPanel />,
  }), [go, openProduct]);

  useEffect(() => {
    const syncTabFromHash = () => {
      changeTab(getTabFromHash(), false);
    };
    window.addEventListener('hashchange', syncTabFromHash);
    window.addEventListener('popstate', syncTabFromHash);
    return () => {
      window.removeEventListener('hashchange', syncTabFromHash);
      window.removeEventListener('popstate', syncTabFromHash);
    };
  }, [changeTab]);

  useEffect(() => {
    const panel = panelRefs.current[activeTab];
    if (!panel) return undefined;
    panel.classList.remove('vr-panel-enter');
    void panel.offsetWidth;
    panel.classList.add('vr-panel-enter');
    return undefined;
  }, [activeTab]);

  return <div className="vr-home" ref={rootRef}>
    <style>{`
      .vr-home{--ink:#1b1b1b;--muted:#8d8d8d;--line:rgba(27,27,27,.11);--paper:#fff;min-height:100%;color:var(--ink);background-color:var(--paper);background-image:linear-gradient(rgba(0,0,0,.031) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.031) 1px,transparent 1px);background-size:32px 32px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;overflow:hidden}.vr-home *,.vr-home *::before,.vr-home *::after{box-sizing:border-box}.vr-home button,.vr-home a{font:inherit}.vr-home button{cursor:pointer}.vr-home button:focus-visible,.vr-home a:focus-visible{outline:2px solid #1b1b1b;outline-offset:4px}.vr-stage{width:min(100% - 48px,756px);margin:0 auto}.vr-rail{position:fixed;left:28px;top:42%;z-index:30;display:grid;grid-template-columns:2px 30px;align-items:end;gap:9px;color:#9c9c9c;font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-rail-line{position:relative;height:120px;background:var(--line)}.vr-rail-line::before{content:"";position:absolute;top:0;left:0;width:2px;height:34px;background:var(--ink);transform:translateY(var(--rail-y));transition:transform .16s linear}.vr-progress-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.vr-top{width:min(100% - 48px,756px);margin:0 auto;padding:40px 0 0;display:flex;align-items:center;justify-content:space-between;color:#666;font:14px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-brand{display:inline-flex;gap:6px;align-items:center;color:#555}.vr-brand::before{content:"";width:7px;height:7px;border:1px solid #a48830;border-radius:50%}.vr-brand sup{font-size:8px}.vr-github{display:inline-flex;align-items:center;gap:6px;color:inherit;text-decoration:none;transition:color .2s ease}.vr-github:hover{color:var(--ink)}.vr-hero{min-height:555px;display:flex;flex-direction:column;justify-content:center;padding:72px 0 48px}.vr-hero h1{max-width:620px;margin:0;font-size:106px;font-weight:780;line-height:.99}.vr-hero h1 span{display:block;animation:vr-word-in .72s cubic-bezier(.16,1,.3,1) both}.vr-hero h1 span:nth-child(2){animation-delay:.07s}.vr-hero h1 span:nth-child(3){animation-delay:.14s}@keyframes vr-word-in{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}.vr-hero-meta{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:36px;color:#686868;font-size:13px}.vr-hero-meta strong{color:var(--ink);font-size:17px}.vr-scroll-cue{display:inline-flex;gap:7px;align-items:center;margin-top:28px;color:#999;font-size:13px;animation:vr-cue 1.7s ease-in-out infinite}@keyframes vr-cue{50%{transform:translateY(5px)}}.vr-tab-zone{position:relative;padding-top:26px}.vr-tab-zone::after{content:"01";position:absolute;top:-4px;right:4px;color:transparent;-webkit-text-stroke:1px rgba(27,27,27,.08);font-size:190px;font-weight:800;line-height:1;pointer-events:none}.vr-tabs{position:sticky;top:0;z-index:20;display:flex;gap:38px;align-items:flex-end;padding:0 0 24px;background:rgba(255,255,255,.78);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}.vr-tab{position:relative;flex:0 0 auto;border:0;padding:0;background:transparent;color:#c5c5c5;font-size:48px;font-weight:760;line-height:1;transition:color .2s ease,transform .2s ease}.vr-tab:hover{color:#777;transform:translateY(-2px)}.vr-tab.is-active{color:var(--ink)}.vr-tab.is-active::after{content:"";position:absolute;left:-3px;right:-3px;bottom:1px;z-index:-1;height:13px;background:#ffe08a;transform-origin:left;animation:vr-marker .35s cubic-bezier(.16,1,.3,1) both}@keyframes vr-marker{from{transform:scaleX(0)}to{transform:scaleX(1)}}.vr-panel{position:relative;padding:42px 0 110px;min-height:520px;animation:vr-panel-in .48s cubic-bezier(.16,1,.3,1) both}@keyframes vr-panel-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}[data-reveal]{opacity:0;transform:translateY(18px);transition:opacity .64s cubic-bezier(.16,1,.3,1),transform .64s cubic-bezier(.16,1,.3,1)}[data-reveal].vr-is-visible{opacity:1;transform:translateY(0)}.vr-card{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.88);box-shadow:0 1px 0 rgba(0,0,0,.02);transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s ease,border-color .3s ease}.vr-card:hover{border-color:rgba(27,27,27,.18);box-shadow:0 18px 34px rgba(34,30,15,.1);transform:translateY(-3px)}.vr-spotlight{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:0;background:radial-gradient(220px circle at var(--spot-x,50%) var(--spot-y,50%),rgba(255,224,134,.3),transparent 72%);transition:opacity .22s ease}.vr-card:hover .vr-spotlight{opacity:1}.vr-product-list{display:grid;gap:18px}.vr-feature{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:278px}.vr-feature.is-reverse .vr-feature-copy{order:2}.vr-feature.is-reverse .vr-art{order:1}.vr-feature-copy{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:40px 32px}.vr-feature-index,.vr-skill-number,.vr-article-index,.vr-experience-index{position:absolute;color:transparent;-webkit-text-stroke:1px rgba(27,27,27,.12);font-size:44px;font-weight:760;line-height:1}.vr-feature-index{bottom:18px;left:25px}.vr-feature-title{display:flex;align-items:center;gap:12px}.vr-feature-title h2{margin:0;font-size:40px;font-weight:760;line-height:1}.vr-feature-copy p{max-width:285px;margin:18px 0 22px;color:#626262;font-size:15px;line-height:1.8}.vr-arrow-link{display:inline-flex;align-items:center;gap:7px;border:0;padding:0;color:#666;background:transparent;font-size:14px;transition:color .2s ease,transform .2s ease}.vr-arrow-link:hover{color:var(--ink);transform:translateX(4px)}.vr-art{position:relative;z-index:1;align-self:center;justify-self:stretch;min-height:202px;margin:24px;border:1px solid rgba(27,27,27,.1);border-radius:8px;background:#fcfcfc;box-shadow:0 12px 22px rgba(30,30,30,.07)}.vr-note-art{padding:18px;transform:rotate(-1deg)}.vr-note-toolbar,.vr-browser-bar{display:flex;gap:5px;align-items:center;padding-bottom:12px;border-bottom:1px solid #ececec}.vr-note-toolbar span,.vr-browser-bar span{width:7px;height:7px;border-radius:50%;background:#d8d8d8}.vr-note-title{margin-top:17px;font-size:13px;font-weight:700}.vr-note-line{height:7px;width:68%;margin-top:13px;background:#e5e5e5;border-radius:2px}.vr-note-line.wide{width:90%}.vr-note-line.short{width:44%}.vr-note-chip{position:absolute;right:15px;bottom:16px;display:inline-flex;gap:4px;align-items:center;padding:5px 8px;border:1px solid #dbe4d7;border-radius:99px;background:#f3f8f1;color:#608059;font-size:10px}.vr-prompt-art{padding:17px 20px;transform:rotate(1deg);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.vr-code-top{display:flex;align-items:center;gap:7px;color:#666;font-size:11px}.vr-code-top i{margin-left:auto;width:7px;height:7px;border-radius:50%;background:#f2c641}.vr-prompt-art p{margin:15px 0 0;color:#4e4e4e;font-size:12px}.vr-prompt-art mark{padding:2px 3px;background:#f2e4a4;color:inherit}.vr-code-status{display:flex;justify-content:space-between;margin-top:25px;color:#929292;font-size:10px}.vr-code-status b{color:#71976b;font-weight:600}.vr-motion-art{display:grid;grid-template-rows:auto 1fr auto;padding:14px;overflow:hidden}.vr-motion-title{display:flex;align-items:center;gap:7px;color:#626262;font-size:11px;font-weight:700}.vr-motion-stage{display:grid;min-height:121px;place-items:center}.vr-hover-sample,.vr-spring-sample{border:1px solid #222;border-radius:7px;padding:13px 17px;background:#fff;color:var(--ink);font-weight:700;transition:transform .25s cubic-bezier(.16,1,.3,1),background .25s ease,color .25s ease}.vr-hover-sample:hover{background:var(--ink);color:#fff;transform:translateY(-5px) rotate(-2deg)}.vr-hover-sample span{padding-left:5px}.vr-spring-sample{animation:vr-spring .82s cubic-bezier(.34,1.56,.64,1) both}.vr-spring-sample:hover{background:#ffe08a;transform:translateY(-3px)}@keyframes vr-spring{0%{opacity:0;transform:scale(.5)}55%{opacity:1;transform:scale(1.12)}100%{transform:scale(1)}}.vr-glass-sample{position:relative;width:88%;padding:14px;overflow:hidden;border:1px solid rgba(27,27,27,.12);border-radius:7px;background:rgba(255,255,255,.64)}.vr-glass-sample::before{content:"";position:absolute;inset:-20px;background:repeating-linear-gradient(135deg,#f2d760 0 16px,#fff 16px 32px,#8bd0d2 32px 48px)}.vr-glass-sample.is-blurred{backdrop-filter:blur(9px)}.vr-glass-copy,.vr-glass-sample button{position:relative;z-index:1}.vr-glass-copy{display:flex;justify-content:space-between;align-items:center}.vr-glass-copy b{font-size:14px}.vr-glass-copy span{color:#666;font-size:10px}.vr-glass-sample button{margin-top:13px;border:1px solid rgba(27,27,27,.16);border-radius:99px;padding:4px 7px;background:rgba(255,255,255,.82);color:#555;font-size:10px}.vr-motion-controls{display:flex;justify-content:center;align-items:center;gap:8px}.vr-motion-controls button{display:grid;place-items:center;width:19px;height:19px;border:0;padding:0;color:#8a8a8a;background:transparent}.vr-control-dot::after{content:"";width:5px;height:5px;border-radius:50%;background:#c6c6c6}.vr-control-dot.is-active{width:24px}.vr-control-dot.is-active::after{width:20px;height:3px;border-radius:99px;background:var(--ink)}.vr-calendar-art{padding:15px;transform:rotate(-1deg)}.vr-calendar-head{display:flex;align-items:center;gap:7px;border-bottom:1px solid #e8e8e8;padding-bottom:9px;color:#555;font-size:11px}.vr-calendar-head span{margin-left:auto;color:#999}.vr-days,.vr-date-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;text-align:center}.vr-days{margin-top:10px;color:#aaa;font-size:8px;font-style:normal}.vr-date-grid{margin-top:8px}.vr-date-grid span{display:grid;place-items:center;width:19px;height:18px;justify-self:center;color:#666;font-size:9px}.vr-date-grid span.is-marked{border-radius:50%;background:#f6da73;color:#333;font-weight:700}.vr-calendar-event{margin-top:10px;border-left:3px solid #6d9875;padding:4px 7px;background:#f4f8f1;color:#5e735a;font-size:9px}.vr-link-art{padding:14px;transform:rotate(1deg)}.vr-browser-bar{padding-bottom:11px}.vr-browser-bar b{margin-left:8px;color:#999;font-size:10px;font-weight:500}.vr-link-row{display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:7px;padding:12px 2px;border-bottom:1px solid #ededed;color:#555;font-size:12px}.vr-link-row:last-child{border-bottom:0}.vr-link-row i{display:grid;place-items:center;width:20px;height:20px;border:1px solid #ddd;border-radius:50%;color:#999;font-size:9px;font-style:normal}.vr-skill-groups{display:grid;gap:53px}.vr-group-label,.vr-experience-label,.vr-contact-head{display:flex;align-items:baseline;justify-content:space-between;padding-bottom:18px;color:#444;font-size:13px;font-weight:700}.vr-group-label b{color:#999;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-skill-grid,.vr-article-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.vr-skill-card{min-height:186px;border:1px solid var(--line);padding:22px;text-align:left;color:var(--ink)}.vr-skill-card>*:not(.vr-spotlight){position:relative;z-index:1}.vr-skill-number{right:15px;bottom:13px;font-size:38px}.vr-skill-icon{display:grid;place-items:center;width:41px;height:41px;border:1px solid #e3e3e3;border-radius:7px;background:#fff;transition:transform .25s cubic-bezier(.16,1,.3,1),background .25s ease,color .25s ease}.vr-skill-card:hover .vr-skill-icon{background:var(--ink);color:#fff;transform:rotate(-6deg) scale(1.08)}.vr-skill-name{display:block;margin-top:27px;font-size:28px;font-weight:760;line-height:1.05}.vr-skill-hint{display:block;margin-top:8px;color:#707070;font-size:13px}.vr-skill-open{position:absolute;top:19px;right:19px;display:grid;place-items:center;width:29px;height:29px;border:1px solid #dedede;border-radius:50%;color:#777;transition:background .2s ease,color .2s ease,transform .2s ease}.vr-skill-card:hover .vr-skill-open{background:#fff;color:var(--ink);transform:translate(2px,-2px)}.vr-article-card{min-height:235px;border:1px solid var(--line);padding:26px 24px 22px;text-align:left;color:var(--ink)}.vr-article-card>*:not(.vr-spotlight){position:relative;z-index:1}.vr-article-index{right:16px;bottom:14px;font-size:42px}.vr-article-date{display:block;color:#999;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-article-card strong{display:block;max-width:260px;margin-top:17px;font-size:23px;line-height:1.34}.vr-article-desc{display:block;margin-top:12px;color:#666;font-size:13px;line-height:1.65}.vr-article-open{position:absolute;left:24px;bottom:20px;display:inline-flex;gap:5px;color:#777;font-size:12px;transition:color .2s ease,transform .2s ease}.vr-article-card:hover .vr-article-open{color:var(--ink);transform:translateX(3px)}.vr-all-link{grid-column:1/-1;justify-self:start;display:inline-flex;gap:8px;align-items:center;border:0;padding:3px 0;color:#555;background:transparent;font-size:14px;text-decoration:underline;text-decoration-color:#df6262;text-decoration-thickness:2px;text-underline-offset:5px}.vr-about-panel{display:grid;gap:66px}.vr-about-intro>span{color:#888;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-about-intro p{max-width:590px;margin:26px 0 22px;color:#666;font-size:19px;line-height:1.9}.vr-tags{display:flex;flex-wrap:wrap;gap:8px}.vr-tags span{border:1px solid #dedede;border-radius:99px;padding:7px 10px;color:#666;background:rgba(255,255,255,.7);font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;transition:background .2s ease,border-color .2s ease,color .2s ease}.vr-tags span:hover{border-color:#e7c750;background:#fff4c8;color:var(--ink)}.vr-experience{border-top:1px solid var(--line);padding-top:24px}.vr-experience-label b,.vr-contact-head b{color:#999;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:400}.vr-experience-list{display:grid;gap:14px}.vr-experience-card{display:grid;grid-template-columns:58px 1fr auto;align-items:center;min-height:154px;padding:26px 28px}.vr-experience-card>*:not(.vr-spotlight){position:relative;z-index:1}.vr-experience-index{left:22px;bottom:15px;font-size:40px}.vr-experience-card div>span{color:#999;font-size:12px}.vr-experience-card h2{margin:7px 0 8px;font-size:28px;line-height:1}.vr-experience-card p{max-width:425px;margin:0;color:#666;font-size:13px;line-height:1.65}.vr-experience-icon{color:#7c7c7c}.vr-contact-panel{border-top:1px solid var(--line);padding-top:24px}.vr-contact-list{display:grid}.vr-contact-row{display:grid;grid-template-columns:38px 34px minmax(124px,1fr) minmax(0,1fr) 24px;gap:10px;align-items:center;border-bottom:1px solid var(--line);padding:20px 3px;color:var(--ink);text-decoration:none;transition:padding .25s cubic-bezier(.16,1,.3,1),background .25s ease}.vr-contact-row:hover{padding-left:16px;background:rgba(255,255,255,.52)}.vr-contact-row>span{color:#999;font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}.vr-contact-row strong{font-size:24px;line-height:1}.vr-contact-row em{overflow:hidden;color:#777;font-size:13px;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.vr-contact-row svg:last-child{justify-self:end;color:#777;opacity:0;transform:translateX(-5px);transition:opacity .2s ease,transform .2s ease}.vr-contact-row:hover svg:last-child{opacity:1;transform:translateX(0)}.vr-footer{width:min(100% - 48px,756px);margin:0 auto;padding:0 0 42px;color:#999;font-size:12px}@media(max-width:720px){.vr-stage,.vr-top,.vr-footer{width:min(100% - 40px,756px)}.vr-top{padding-top:24px;font-size:11px}.vr-github{max-width:170px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.vr-rail{display:none}.vr-hero{min-height:465px;padding:72px 0 38px}.vr-hero h1{font-size:62px}.vr-hero-meta{gap:10px;margin-top:28px;color:#686868;font-size:11px}.vr-hero-meta strong{color:var(--ink);font-size:14px}.vr-tab-zone{padding-top:10px}.vr-tab-zone::after{top:10px;right:-12px;font-size:116px}.vr-tabs{gap:26px;overflow-x:auto;padding:0 0 16px;scrollbar-width:none}.vr-tabs::-webkit-scrollbar{display:none}.vr-tab{font-size:28px}.vr-tab.is-active::after{height:8px}.vr-panel{padding:30px 0 72px}.vr-feature{grid-template-columns:1fr;min-height:0}.vr-feature.is-reverse .vr-feature-copy,.vr-feature.is-reverse .vr-art{order:initial}.vr-art{min-height:192px;margin:18px 18px 0}.vr-feature-copy{padding:26px 24px 30px}.vr-feature-title h2{font-size:31px}.vr-feature-copy p{margin:14px 0 18px;font-size:14px}.vr-feature-index{left:17px;bottom:13px;font-size:38px}.vr-skill-groups{gap:38px}.vr-skill-grid,.vr-article-grid{grid-template-columns:1fr}.vr-skill-card{min-height:166px}.vr-skill-name{margin-top:22px;font-size:27px}.vr-article-card{min-height:208px}.vr-article-card strong{font-size:21px}.vr-about-panel{gap:46px}.vr-about-intro p{margin-top:20px;font-size:17px}.vr-experience-card{grid-template-columns:44px 1fr;padding:24px 20px}.vr-experience-icon{display:none}.vr-contact-row{grid-template-columns:28px 27px minmax(82px,1fr) 18px;gap:8px}.vr-contact-row em{display:none}.vr-contact-row strong{font-size:19px}.vr-contact-row svg:last-child{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.vr-home *,.vr-home *::before,.vr-home *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}
    `}</style>
    <style>{`
      html { scroll-behavior: smooth; }
      .vr-home { position: relative; isolation: isolate; background-color: #fff; background-image: linear-gradient(rgba(0,0,0,.031) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.031) 1px, transparent 1px); background-size: 32px 32px; background-attachment: fixed; }
      .vr-home > .vr-top, .vr-home > main, .vr-home > .vr-footer { position: relative; z-index: 1; }
      .vr-home .vr-bg-fade { position: fixed; z-index: 0; inset: 0; pointer-events: none; background: radial-gradient(80% 50% at 50% -10%, rgba(255,226,138,.2), transparent 70%); }
      .vr-home .vr-ambient { position: fixed; z-index: 0; inset: 0; overflow: clip; pointer-events: none; opacity: .16; }
      .vr-home .vr-ambient i { position: absolute; display: block; width: 40vmax; height: 40vmax; border-radius: 50%; background: radial-gradient(circle, #ffe28af5 0%, #ffe28a94 45%, #ffe28a00 74%); }
      .vr-home .vr-ambient-left { top: -12vmax; left: -10vmax; animation: vr-ambient-left 36s ease-in-out infinite alternate; }
      .vr-home .vr-ambient-right { top: 40vh; right: -12vmax; bottom: auto; width: 32vmax; height: 32vmax; animation: vr-ambient-right 44s ease-in-out infinite alternate; }
      @keyframes vr-ambient-left { from { transform: translate(0); } to { transform: translate(10vmax, 8vmax); } }
      @keyframes vr-ambient-right { from { transform: translate(0); } to { transform: translate(-8vmax, 10vmax); } }
      .vr-home .vr-tab-zone::after { display: none; }
      .vr-home .vr-tab-reel { position: absolute; z-index: 0; top: -5px; right: 4px; display: flex; color: transparent; -webkit-text-stroke: 1px rgba(27,27,27,.09); font-size: 190px; font-weight: 800; line-height: 1; perspective: 700px; pointer-events: none; }
      .vr-home .vr-tab-reel-digit { display: block; overflow: hidden; }
      .vr-home .vr-tab-reel-digit { animation: vr-tab-reel-in 1.15s cubic-bezier(.19,1,.22,1) var(--reel-delay) both; transform-origin: 50% 100%; }
      @keyframes vr-tab-reel-in { from { opacity: 0; transform: translateY(115%) rotateX(-42deg); } to { opacity: 1; transform: translateY(0) rotateX(0); } }
      .vr-home .vr-panel { position: relative; min-height: 520px; padding: 42px 0 110px; animation: none; }.vr-home .vr-panel[hidden] { display: none; }
      .vr-home .vr-panel.vr-panel-enter { animation: vr-panel-reference-in .9s cubic-bezier(.19,1,.22,1) both; }
      @keyframes vr-panel-reference-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      .vr-home .vr-panel-enter .vr-panel-stagger { animation: vr-panel-stagger-in .9s cubic-bezier(.19,1,.22,1) var(--panel-delay, .05s) backwards; }
      .vr-home .vr-panel-enter .vr-panel-stagger:nth-child(2) { --panel-delay: .13s; }.vr-home .vr-panel-enter .vr-panel-stagger:nth-child(3) { --panel-delay: .21s; }.vr-home .vr-panel-enter .vr-panel-stagger:nth-child(4) { --panel-delay: .29s; }.vr-home .vr-panel-enter .vr-panel-stagger:nth-child(5) { --panel-delay: .37s; }
      @keyframes vr-panel-stagger-in { from { opacity: 0; } to { opacity: var(--roll-opacity, 1); } }
      .vr-home [data-roll] { --roll-y: 0px; --roll-angle: 0deg; --roll-angle-mobile: 0deg; --roll-opacity: 1; --roll-origin-y: 50%; min-width: 0; opacity: var(--roll-opacity); transform: perspective(900px) translate3d(0, var(--roll-y), 0) rotateX(var(--roll-angle)); transform-origin: 50% var(--roll-origin-y); transform-style: preserve-3d; backface-visibility: hidden; }
      .vr-home [data-roll].vr-scroll-active { will-change: transform, opacity; }
      .vr-home .vr-roll-wrap > .vr-feature, .vr-home .vr-roll-wrap > .vr-article-card { width: 100%; height: 100%; }
      .vr-home [data-reveal] { opacity: 0; transform: translateY(30px); transition: opacity 1.3s cubic-bezier(.19,1,.22,1) var(--reveal-delay, 0s), transform 1.3s cubic-bezier(.19,1,.22,1) var(--reveal-delay, 0s); }
      .vr-home [data-reveal].vr-is-visible { opacity: 1; transform: translateY(0); }
      .vr-home .vr-card[data-reveal].vr-is-visible:hover { transform: translateY(-3px); }
      .vr-home .vr-top { width: min(100% - 48px, 756px); }
      .vr-home .vr-hero-shell { width: min(100% - 48px, 984px); min-height: calc(100svh - 34px); margin: 0 auto; }
      .vr-home .vr-hero { min-height: 0; align-items: center; padding: 50px 0 58px; text-align: center; justify-content: center; }
      .vr-home .vr-hero h1 { position: relative; z-index: 1; max-width: none; width: 100%; margin: 0; font-size: 164px; font-weight: 800; letter-spacing: 0; line-height: .82; text-shadow: 0 1px 0 rgba(255,255,255,.7); }
      .vr-home .vr-hero h1 span:nth-child(4) { animation-delay: .21s; }
      .vr-home .vr-hero-outline { position: relative; color: transparent; -webkit-text-stroke: 2px var(--ink); text-shadow: 7px 7px 0 rgba(255,226,138,.42); }
      .vr-home .vr-hero-meta { justify-content: center; margin-top: 40px; color: #5d5d5d; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; letter-spacing: 0; }
      .vr-home .vr-hero-meta strong { position: relative; padding-right: 18px; font-size: 15px; }.vr-home .vr-hero-meta strong::after { content: ""; position: absolute; top: 50%; right: 0; width: 8px; height: 1px; background: #c4a541; }
      .vr-home .vr-scroll-cue { margin-top: 34px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
      .vr-home .vr-tab { font-size: 48px; font-weight: 760; line-height: 1; }
      .vr-home .vr-arrow-link, .vr-home .vr-all-link { font-size: 14px; }
      .vr-home button.vr-contact-row { appearance: none; border: 0; border-bottom: 1px solid var(--line); background: transparent; font: inherit; width: 100%; text-align: left; cursor: pointer; }
      .vr-home .vr-solo-skill { max-width: 756px; }
      .vr-home .vr-mathmodel-card { display: block; min-height: 344px; padding: 27px; color: var(--ink); text-decoration: none; }
      .vr-home .vr-mathmodel-card > *:not(.vr-spotlight):not(.vr-mathmodel-watermark) { position: relative; z-index: 1; }
      .vr-home .vr-mathmodel-watermark { position: absolute; top: 13px; right: 22px; z-index: 0; color: transparent; -webkit-text-stroke: 1px rgba(27,27,27,.07); font: 116px/.8 ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; pointer-events: none; }
      .vr-home .vr-mathmodel-top { display: grid; grid-template-columns: minmax(0, 1fr) auto 29px; gap: 12px; align-items: center; }
      .vr-home .vr-mathmodel-kicker { color: #888; font: 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; }
      .vr-home .vr-mathmodel-meta { display: inline-flex; align-items: center; gap: 5px; color: #535353; font-size: 13px; font-weight: 700; }
      .vr-home .vr-mathmodel-meta svg { color: #d4a930; }
      .vr-home .vr-mathmodel-open { display: grid; place-items: center; width: 29px; height: 29px; border: 1px solid #dedede; border-radius: 50%; color: #777; transition: background .2s ease, color .2s ease, transform .2s ease; }
      .vr-home .vr-mathmodel-card:hover .vr-mathmodel-open { background: #fff; color: var(--ink); transform: translate(2px, -2px); }
      .vr-home .vr-mathmodel-heading { display: grid; gap: 8px; max-width: 520px; margin-top: 27px; }
      .vr-home .vr-mathmodel-heading strong { font-size: 37px; font-weight: 760; line-height: 1; }
      .vr-home .vr-mathmodel-heading > span { color: #777; font-size: 15px; font-weight: 650; }
      .vr-home .vr-model-workflow { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin-top: 28px; border-top: 1px solid rgba(27,27,27,.14); border-left: 1px solid rgba(27,27,27,.14); }
      .vr-home .vr-model-workflow > span { display: grid; gap: 6px; min-height: 61px; align-content: center; padding: 9px 10px; border-right: 1px solid rgba(27,27,27,.14); border-bottom: 1px solid rgba(27,27,27,.14); background: rgba(255,255,255,.68); transition: background .2s ease, color .2s ease, transform .2s ease; }
      .vr-home .vr-model-workflow > span:nth-child(-n+5) { border-bottom: 0; }
      .vr-home .vr-model-workflow i { color: #9a9a9a; font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-style: normal; }
      .vr-home .vr-model-workflow b { font-size: 13px; line-height: 1; }
      .vr-home .vr-model-workflow > span.is-core { background: #ffe08a; color: #1b1b1b; }
      .vr-home .vr-mathmodel-card:hover .vr-model-workflow > span { background: #fff; }.vr-home .vr-mathmodel-card:hover .vr-model-workflow > span.is-core { background: #ffe08a; }
      .vr-home .vr-model-workflow > span:hover { background: #fff9df !important; transform: translateY(-2px); }
      .vr-home .vr-model-caption { display: flex; align-items: baseline; gap: 7px; margin-top: 12px; color: #8e8e8e; font: 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .vr-home .vr-model-caption b { color: #a48830; font-size: 17px; }
      @media (max-width: 720px) { .vr-home .vr-top { width: min(100% - 40px, 756px); } .vr-home .vr-hero-shell { width: min(100% - 40px, 756px); min-height: calc(100svh - 14px); } .vr-home .vr-hero { min-height: calc(100svh - 14px); padding: 78px 0 54px; } .vr-home .vr-hero h1 { font-size: 76px; line-height: .84; } .vr-home .vr-hero-outline { -webkit-text-stroke-width: 1.25px; text-shadow: 4px 4px 0 rgba(255,226,138,.42); } .vr-home .vr-hero-meta { gap: 11px; margin-top: 31px; font-size: 10px; } .vr-home .vr-hero-meta strong { padding-right: 12px; font-size: 13px; } .vr-home .vr-hero-meta strong::after { width: 6px; } .vr-home .vr-scroll-cue { margin-top: 30px; } .vr-home .vr-tab { font-size: 28px; } .vr-home [data-roll] { transform: perspective(900px) translate3d(0, var(--roll-y), 0) rotateX(var(--roll-angle-mobile)); } .vr-home [data-reveal] { filter: none; transform: translateY(30px); } .vr-home [data-reveal].vr-is-visible { transform: translateY(0); } }
      @media (max-width: 720px) { .vr-home .vr-mathmodel-card { min-height: 404px; padding: 22px; } .vr-home .vr-mathmodel-watermark { top: 18px; right: 15px; font-size: 92px; } .vr-home .vr-mathmodel-top { grid-template-columns: minmax(0, 1fr) 29px; gap: 9px; } .vr-home .vr-mathmodel-kicker { font-size: 9px; } .vr-home .vr-mathmodel-meta { grid-column: 1 / -1; grid-row: 2; font-size: 12px; } .vr-home .vr-mathmodel-open { grid-column: 2; grid-row: 1; } .vr-home .vr-mathmodel-heading { margin-top: 23px; gap: 9px; } .vr-home .vr-mathmodel-heading strong { font-size: 30px; } .vr-home .vr-mathmodel-heading > span { max-width: 250px; font-size: 14px; line-height: 1.55; } .vr-home .vr-model-workflow { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 24px; } .vr-home .vr-model-workflow > span { min-height: 44px; grid-template-columns: 25px 1fr; align-items: center; gap: 5px; padding: 7px 9px; } .vr-home .vr-model-workflow > span:nth-child(-n+5) { border-bottom: 1px solid rgba(27,27,27,.14); } .vr-home .vr-model-workflow > span:nth-child(n+9) { border-bottom: 0; } .vr-home .vr-model-workflow b { font-size: 12px; } .vr-home .vr-model-caption { margin-top: 10px; font-size: 9px; } .vr-home .vr-model-caption b { font-size: 15px; } }
    `}</style>
    <style>{`
      .vr-home .vr-hero-shell { width: min(100% - 48px, 820px); min-height: calc(100svh - 34px); }
      .vr-home .vr-hero { position: relative; display: grid; grid-template-columns: 460px 282px; align-items: end; justify-content: center; gap: 0; min-height: calc(100svh - 112px); padding: 28px 0 46px; text-align: left; }
      .vr-home .vr-hero-copy { position: relative; z-index: 2; align-self: end; }
      .vr-home .vr-hero h1 { width: auto; max-width: 460px; font-size: 140px; font-weight: 800; line-height: .94; }
      .vr-home .vr-hero-meta { justify-content: flex-start; margin-top: 24px; }
      .vr-home .vr-scroll-cue { margin-top: 24px; }
      .vr-home .vr-person-stage { position: relative; z-index: 1; align-self: end; width: 282px; height: 699px; min-height: 0; overflow: visible; }
      .vr-home .vr-person-stage::after { content: ""; position: absolute; right: -5%; bottom: 3%; width: 88%; height: 14px; border-radius: 50%; background: rgba(27,27,27,.11); filter: blur(9px); transform: rotate(-4deg); }
      .vr-home .vr-person-frame { position: absolute; right: 0; bottom: 0; z-index: 1; width: 282px; opacity: 0; transform: translate3d(0, 18px, 0); transition: opacity .62s ease-out, transform .94s cubic-bezier(.16,1,.3,1); will-change: opacity, transform; }
      .vr-home .vr-person-frame.is-ready { opacity: 1; transform: translate3d(0, 0, 0); }
      .vr-home .vr-person-motion { position: relative; transform: translateY(0) rotate(1deg); transform-origin: 51% 94%; }
      .vr-home .vr-person-frame.is-ready .vr-person-motion { animation: vr-person-breathe 5.4s ease-in-out .72s infinite; }
      .vr-home .vr-person-motion img { width: 100%; height: auto; }
      .vr-home .vr-person-skin, .vr-home .vr-person-hair, .vr-home .vr-person-collar { position: absolute; inset: 0; display: block; pointer-events: none; }
      .vr-home .vr-person-skin { z-index: 0; }
      .vr-home .vr-person-body { position: relative; z-index: 1; display: block; filter: drop-shadow(0 14px 18px rgba(0,0,0,.09)); }
      .vr-home .vr-person-hair { z-index: 2; }
      .vr-home .vr-person-collar { z-index: 3; }
      .vr-home .vr-person-hair { transform-origin: 49% 8%; }
      .vr-home .vr-person-collar { transform-origin: 50% 20%; }
      .vr-home .vr-person-frame.is-ready .vr-person-hair { animation: vr-hair-sway 6.8s ease-in-out .72s infinite; }
      .vr-home .vr-person-frame.is-ready .vr-person-collar { animation: vr-collar-sway 5.4s ease-in-out .72s infinite; }
      @keyframes vr-person-breathe { 0%, 100% { transform: translateY(0) rotate(1deg); } 50% { transform: translateY(-5px) rotate(.55deg); } }
      @keyframes vr-hair-sway { 0%, 100% { transform: rotate(0); } 50% { transform: translateX(1px) rotate(.65deg); } }
      @keyframes vr-collar-sway { 0%, 100% { transform: rotate(0); } 50% { transform: translateX(-.8px) rotate(-.45deg); } }
      @media (max-width: 720px) {
        .vr-home .vr-hero-shell { width: min(100% - 40px, 756px); min-height: calc(100svh - 14px); }
        .vr-home .vr-hero { display: block; min-height: calc(100svh - 82px); padding: 65px 0 35px; }
        .vr-home .vr-hero-copy { width: 69%; }
        .vr-home .vr-hero h1 { max-width: none; font-size: 68px; line-height: .84; }
        .vr-home .vr-hero-meta { gap: 8px; width: 118%; margin-top: 22px; font-size: 10px; }
        .vr-home .vr-hero-meta strong { font-size: 12px; }
        .vr-home .vr-scroll-cue { margin-top: 27px; font-size: 11px; }
        .vr-home .vr-person-stage { position: absolute; right: -9px; bottom: 8px; width: 49%; min-height: 0; height: min(62svh, 480px); }
        .vr-home .vr-person-stage::before { top: 12%; right: -10%; width: 115%; }
        .vr-home .vr-person-stage::after { right: -8%; bottom: 6%; width: 100%; height: 10px; }
        .vr-home .vr-person-frame { right: 0; width: 100%; }
      }
    `}</style>
    <style>{`
      .vr-home .vr-tool-art { display: flex; min-width: 0; flex-direction: column; padding: 16px; color: #4f4f4f; font-size: 11px; transform: rotate(-1deg); }
      .vr-home .vr-feature.is-reverse .vr-tool-art { transform: rotate(1deg); }
      .vr-home .vr-preview-top { display: flex; align-items: center; gap: 7px; padding-bottom: 10px; border-bottom: 1px solid #e9e9e9; color: #666; font-size: 11px; font-weight: 700; }
      .vr-home .vr-preview-top b { margin-left: auto; color: #a48830; font: 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; }
      .vr-home .vr-tool-art button { border: 1px solid transparent; border-radius: 5px; background: transparent; color: inherit; transition: border-color .18s ease, background .18s ease, color .18s ease, transform .18s ease; }
      .vr-home .vr-tool-art button:hover { border-color: rgba(27,27,27,.18); background: #fff; transform: translateY(-1px); }
      .vr-home .vr-tool-art button.is-active { border-color: #e0c35f; background: #ffe08a; color: #1b1b1b; }
      .vr-home .vr-prompt-copy { display: grid; gap: 8px; padding: 18px 3px 13px; color: #5f5f5f; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1.35; }
      .vr-home .vr-prompt-copy mark { width: fit-content; padding: 2px 4px; background: #ffe08a; color: #1b1b1b; }
      .vr-home .vr-preview-actions, .vr-home .vr-tool-filter { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
      .vr-home .vr-preview-actions button, .vr-home .vr-tool-filter button { padding: 5px 8px; color: #777; font-size: 10px; }
      .vr-home .vr-api-art { gap: 10px; padding: 14px; overflow: hidden; border-color: #d4e4ed; background: linear-gradient(145deg, #fbfdff 0%, #eefaf6 100%); color: #24527c; box-shadow: 0 13px 26px rgba(39, 93, 128, .12); transform: rotate(.65deg); }
      .vr-home .vr-feature.is-reverse .vr-api-art { transform: rotate(-.65deg); }
      .vr-home .vr-api-tabs { display: flex; gap: 3px; width: fit-content; max-width: 100%; padding: 3px; overflow-x: auto; border: 1px solid #dce9f0; border-radius: 6px; background: rgba(255, 255, 255, .76); scrollbar-width: none; }
      .vr-home .vr-api-tabs::-webkit-scrollbar { display: none; }
      .vr-home .vr-api-tabs button { flex: 0 0 auto; border: 0; border-radius: 4px; padding: 4px 7px; color: #5d7180; font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .vr-home .vr-api-tabs button:hover { border-color: transparent; background: #e6f2f8; color: #24527c; }
      .vr-home .vr-api-tabs button.is-active { border-color: transparent; background: #2589ed; color: #fff; box-shadow: 0 2px 5px rgba(37, 137, 237, .25); }
      .vr-home .vr-api-route { display: flex; min-width: 0; align-items: center; gap: 6px; padding: 7px 8px; border: 1px solid #dbe8ee; border-radius: 5px; background: rgba(255, 255, 255, .86); font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .vr-home .vr-api-route span { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 4px; color: #3b9b71; }
      .vr-home .vr-api-route span i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 3px rgba(59, 155, 113, .12); }
      .vr-home .vr-api-route b { flex: 0 0 auto; color: #9a60c4; font-weight: 800; }
      .vr-home .vr-api-route code { min-width: 0; overflow: hidden; color: #527286; text-overflow: ellipsis; white-space: nowrap; }
      .vr-home .vr-api-pane { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
      .vr-home .vr-api-pane div { display: grid; min-width: 0; gap: 5px; padding: 7px; border: 1px solid #deebf0; border-radius: 5px; background: rgba(248, 252, 253, .94); }
      .vr-home .vr-api-pane span { color: #8b9fab; font: 8px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .vr-home .vr-api-pane code { overflow: hidden; color: #285879; font: 8px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace; text-overflow: ellipsis; white-space: nowrap; }
      .vr-home .vr-api-metrics { display: flex; align-items: center; justify-content: space-between; gap: 7px; margin-top: auto; padding-top: 2px; color: #77909d; font: 8px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .vr-home .vr-api-metrics span { white-space: nowrap; }
      .vr-home .vr-api-metrics b { color: #24527c; font-weight: 800; }
      .vr-home .vr-feature-index { pointer-events: none; }
      .vr-home .vr-feature.is-api .vr-feature-index { right: 24px; left: auto; }
      .vr-home .vr-agent-flow { display: grid; grid-template-columns: 1fr 18px 1fr 18px 1fr; align-items: center; margin: auto 3px 12px; }
      .vr-home .vr-agent-flow button { display: grid; gap: 5px; place-items: center; min-height: 57px; padding: 7px 3px; font-size: 11px; }
      .vr-home .vr-agent-flow button i { color: #999; font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-style: normal; }
      .vr-home .vr-agent-flow span { height: 1px; background: #d5d5d5; }
      .vr-home .vr-agents-art p { margin: 0; color: #858585; font-size: 10px; }
      .vr-home .vr-agenda-row { display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: 8px; padding: 9px 2px; border-radius: 0 !important; border-width: 0 0 1px !important; border-color: #ececec !important; text-align: left; }
      .vr-home .vr-agenda-row:last-child { border-bottom: 0 !important; }
      .vr-home .vr-agenda-row i { display: grid; width: 15px; height: 15px; place-items: center; border: 1px solid #d9d9d9; border-radius: 3px; font-style: normal; }
      .vr-home .vr-agenda-row em { color: #999; font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-style: normal; }
      .vr-home .vr-week-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin: 16px 0 auto; }
      .vr-home .vr-week-grid button { display: grid; min-height: 88px; align-content: space-between; gap: 9px; padding: 7px; text-align: left; }
      .vr-home .vr-week-grid b { color: #a0a0a0; font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .vr-home .vr-week-grid span { display: block; overflow: hidden; color: #666; font-size: 10px; line-height: 1.35; overflow-wrap: anywhere; }
      .vr-home .vr-material-stack { display: grid; gap: 7px; margin-top: 12px; }
      .vr-home .vr-material-stack button { display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 8px; padding: 8px; text-align: left; }
      .vr-home .vr-material-stack i, .vr-home .vr-news-art i { color: #999; font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-style: normal; }
      .vr-home .vr-material-stack em { color: #999; font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-style: normal; }
      .vr-home .vr-tool-list { display: grid; gap: 7px; margin-top: 12px; }
      .vr-home .vr-tool-list span { display: flex; align-items: center; justify-content: space-between; padding: 5px 2px; border-bottom: 1px solid #ececec; color: #666; font-size: 11px; }
      .vr-home .vr-tool-list svg { color: #999; }
      .vr-home .vr-news-art button { display: grid; grid-template-columns: 20px 1fr; align-items: center; gap: 7px; padding: 9px 4px; border-radius: 0 !important; border-width: 0 0 1px !important; border-color: #ececec !important; text-align: left; font-size: 10px; }
      .vr-home .vr-news-art button:last-child { border-bottom: 0 !important; }
      .vr-home .vr-map-stage { position: relative; flex: 1; min-height: 128px; margin-top: 8px; }
      .vr-home .vr-map-stage::before, .vr-home .vr-map-stage::after { content: ""; position: absolute; left: 48%; width: 1px; height: 52px; background: #d7d7d7; transform-origin: top; }
      .vr-home .vr-map-stage::before { top: 43px; transform: rotate(-43deg); }.vr-home .vr-map-stage::after { top: 43px; transform: rotate(43deg); }
      .vr-home .vr-map-root, .vr-home .vr-map-node { position: absolute; z-index: 1; padding: 6px 9px !important; font-size: 10px; }
      .vr-home .vr-map-root { top: 27px; left: 50%; transform: translateX(-50%); border-color: #d7d7d7 !important; background: #fff !important; color: #1b1b1b !important; font-weight: 700; }
      .vr-home .vr-map-root:hover { transform: translateX(-50%) translateY(-1px) !important; }
      .vr-home .vr-map-node { bottom: 19px; }.vr-home .vr-map-node.n0 { left: 4%; }.vr-home .vr-map-node.n1 { left: 50%; transform: translateX(-50%); }.vr-home .vr-map-node.n2 { right: 4%; }
      .vr-home .vr-map-node.n1:hover { transform: translateX(-50%) translateY(-1px) !important; }
      .vr-home .vr-care-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin: auto 0 13px; }
      .vr-home .vr-care-stats span { display: grid; gap: 4px; padding: 8px; border: 1px solid #e5e5e5; border-radius: 5px; color: #999; font-size: 9px; }
      .vr-home .vr-care-stats b { color: #444; font: 16px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .vr-home .vr-care-check { display: inline-flex; width: fit-content; align-items: center; gap: 5px; padding: 6px 9px; font-size: 10px; }
      .vr-home .vr-care-check.is-active { border-color: #e0c35f; background: #ffe08a; color: #1b1b1b; }
      .vr-home .vr-week-strip { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin-top: 14px; }
      .vr-home .vr-week-strip button { display: grid; gap: 4px; min-height: 64px; align-content: center; justify-items: center; padding: 6px 4px; }
      .vr-home .vr-week-strip b { color: #a0a0a0; font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; }
      .vr-home .vr-week-strip span { color: #666; font-size: 10px; }
      .vr-home .vr-day-line { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 10px; border-top: 1px solid #ececec; color: #555; font-size: 10.5px; }
      .vr-home .vr-day-line i { display: grid; width: 15px; height: 15px; flex: 0 0 15px; place-items: center; border: 1px solid #d9d9d9; border-radius: 3px; color: #1b1b1b; font-style: normal; }
      .vr-home .vr-day-line em { margin-left: auto; color: #999; font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-style: normal; }
      .vr-home .vr-skill-rank { display: grid; gap: 5px; margin-top: 12px; }
      .vr-home .vr-skill-rank button { display: grid; grid-template-columns: 20px 1fr auto; align-items: center; gap: 7px; padding: 7px 8px; text-align: left; }
      .vr-home .vr-skill-rank i { color: #c9a53f; font: 800 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-style: normal; }
      .vr-home .vr-skill-rank span { overflow: hidden; color: #555; font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
      .vr-home .vr-skill-rank em { color: #a48830; font: 700 9.5px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-style: normal; }
      .vr-home .vr-skill-foot { display: flex; align-items: center; gap: 5px; margin-top: auto; padding-top: 9px; border-top: 1px solid #ececec; color: #999; font-size: 9.5px; }
      .vr-home .vr-uikit-list { display: grid; gap: 5px; margin-top: 12px; }
      .vr-home .vr-uikit-list button { display: flex; align-items: center; justify-content: space-between; gap: 7px; padding: 8px 9px; border-radius: 6px; text-align: left; }
      .vr-home .vr-uikit-list span { color: #555; font-size: 10.5px; font-weight: 650; }
      .vr-home .vr-uikit-list em { color: #a0a0a0; font: 9px/1 ui-monospace, SFMono-Regular, Menlo, monospace; font-style: normal; }
      .vr-home .vr-uikit-foot { margin-top: auto; padding-top: 9px; border-top: 1px solid #ececec; color: #999; font-size: 9.5px; }
      @media (max-width: 720px) { .vr-home .vr-tool-art { min-height: 192px; }.vr-home .vr-week-grid button { min-height: 80px; padding: 5px; } }
    `}</style>
    <style>{`
.vr-modelflow-art{padding:18px}.vr-model-flow{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.vr-model-flow button{display:grid;gap:4px;place-items:center;padding:10px 6px;border:1px solid #e5e5e5;border-radius:8px;background:#fff;transition:all .2s;cursor:pointer}.vr-model-flow button.is-active{background:#ffe08a;border-color:#d4a930}.vr-model-flow button i{font-size:10px;color:#999;font-style:normal;font-family:ui-monospace,monospace}.vr-model-flow button b{font-size:12px;font-weight:600}.vr-model-flow>span{display:none}.vr-model-flow-status{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#888}.vr-model-flow-status b{color:#a48830;font-family:ui-monospace,monospace}
.vr-checkin-art{padding:18px}.vr-checkin-stats{display:flex;gap:12px;margin-top:14px}.vr-checkin-stats span{flex:1;padding:10px 8px;border:1px solid #eee;border-radius:8px;background:#fff;text-align:center;font-size:10px;color:#999}.vr-checkin-stats span b{display:block;font-size:20px;font-weight:700;color:#1b1b1b;font-family:ui-monospace,monospace;margin-bottom:2px}.vr-checkin-list{display:grid;gap:6px;margin-top:14px}.vr-checkin-list button{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid #eee;border-radius:8px;background:#fff;transition:all .2s;cursor:pointer;text-align:left}.vr-checkin-list button.is-active{border-color:#FF6B35;background:#FFF3EE}.vr-checkin-list button span{font-size:12px;font-weight:600;color:#333}.vr-checkin-list button em{font-size:10px;font-style:normal;padding:3px 8px;border-radius:99px;font-weight:600}.vr-checkin-list button em.monitoring{background:#e8f5e9;color:#28a745}.vr-checkin-list button em.done{background:#fff3e0;color:#f57c00}
.vr-toolbox-art{padding:18px}.vr-toolbox-drive{margin-top:14px}.vr-toolbox-drive span{font-size:11px;font-weight:600;color:#333}.vr-toolbox-drive i{display:block;height:6px;border-radius:99px;background:#eee;margin-top:6px;position:relative;overflow:hidden}.vr-toolbox-drive i b{position:absolute;left:0;top:0;bottom:0;width:var(--fill);background:linear-gradient(90deg,#a48830,#d4a930);border-radius:99px}.vr-toolbox-drive i.is-done b{width:100%;background:linear-gradient(90deg,#34c759,#28a745)}.vr-toolbox-drive em{display:block;font-size:10px;font-style:normal;color:#999;margin-top:6px}.vr-toolbox-cats{display:grid;gap:6px;margin-top:14px}.vr-toolbox-cats button{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border:1px solid #eee;border-radius:8px;background:#fff;transition:all .2s;cursor:pointer;text-align:left}.vr-toolbox-cats button.is-active{border-color:#a48830;background:#FFFAEB}.vr-toolbox-cats button span{font-size:12px;font-weight:600;color:#333}.vr-toolbox-cats button em{font-size:10px;font-style:normal;color:#888;font-family:ui-monospace,monospace}.vr-toolbox-foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#999}.vr-toolbox-foot b{color:#a48830;font-family:ui-monospace,monospace}
`}</style>
    <div className="vr-bg-fade" aria-hidden="true" /><div className="vr-ambient" aria-hidden="true"><i className="vr-ambient-left" /><i className="vr-ambient-right" /></div>
    <div className="vr-rail" aria-hidden="true"><div className="vr-rail-line" style={{ '--rail-y': `${Math.max(0, (progress / 100) * 86)}px` }} /><span>{String(progress).padStart(2, '0')}</span></div><span className="vr-progress-label">阅读进度 {progress}%</span>
    <header className="vr-top"><span className="vr-brand">VOYRA<sup>®</sup></span><a className="vr-github" href="https://github.com/liixnglinb" target="_blank" rel="noreferrer"><Github size={15} />github.com/liixnglinb</a></header>
    <main><section className="vr-hero-shell"><div className="vr-hero" data-roll><div className="vr-hero-copy"><h1><span>Voyra</span><span>makes</span><span className="vr-hero-outline">ideas</span><span>useful.</span></h1><div className="vr-hero-meta"><strong>帅帅你阿历</strong><span>PERSONAL TOOLS / AI / OPEN-SOURCE</span></div><div className="vr-scroll-cue"><ChevronDown size={16} /> 向下探索</div></div><div className="vr-person-stage" aria-hidden="true"><div className={`vr-person-frame${personReady ? ' is-ready' : ''}`}><div className="vr-person-motion"><img className="vr-person-skin" src="/hero/voyra-person-skin-v3.webp" alt="" decoding="async" /><img className="vr-person-body" src="/hero/voyra-person-body-v2.webp" alt="" decoding="async" fetchPriority="high" /><img className="vr-person-hair" src="/hero/voyra-person-hair-v2.webp" alt="" decoding="async" /><img className="vr-person-collar" src="/hero/voyra-person-collar-v2.webp" alt="" decoding="async" /></div></div></div></div></section><section className="vr-stage vr-tab-zone" data-active-work={activeTab} aria-label="内容分类"><TabReel activeTab={activeTab} /><div className="vr-tabs" data-roll role="tablist" aria-label="内容分类">{TABS.map(([id, label]) => <button id={`work-tab-${id}`} key={id} role="tab" aria-controls={`panel-${id}`} aria-selected={activeTab === id} className={`vr-tab${activeTab === id ? ' is-active' : ''}`} onClick={() => changeTab(id)}>{label}</button>)}</div><div className="vr-panels">{TABS.map(([id, label]) => <div className="vr-panel" ref={(node) => { panelRefs.current[id] = node; }} id={`panel-${id}`} role="tabpanel" aria-labelledby={`work-tab-${id}`} aria-label={label} aria-hidden={activeTab !== id} hidden={activeTab !== id} key={id}>{panels[id]}</div>)}</div></section></main>
    <footer className="vr-footer" data-roll><span>© 2026 Voyra®</span><span style={{ marginLeft: 14, color: '#bbb' }}>Based on <a href="https://www.oiloil.org" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: '#ddd', textUnderlineOffset: 3 }} onMouseOver={(e) => { e.currentTarget.style.color = '#666'; }} onMouseOut={(e) => { e.currentTarget.style.color = 'inherit'; }}>oiloil.org</a></span></footer>
  </div>;
}
