import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight, BookOpen, Check, Copy, Flame, RefreshCw, Rocket, Search, Sparkles, Star, Trophy, X,
} from 'lucide-react';

/* ============================================================
   Skill 热榜 · GitHub Skill 聚合
   - 每周热点：GitHub Search API 实时拉取（近 7 天有更新的 skill 仓库，按星排序）
   - 刷新策略：本地按天缓存，每天首次访问自动拉取；支持手动刷新（60s 限流保护）
   - 星数排行榜：固定知名仓库 + 每日拉取实时星数（失败回退内置基准）
   - 优质精选：人工策展，含一键复制安装命令
   ============================================================ */

const HOT_CACHE_KEY = 'voyra.skills-hot-v5';
const RANK_BASE = [
  { repo: 'anthropics/skills', base: 44200, desc: 'Anthropic 官方技能库：docx · pptx · xlsx · pdf 与编写规范', area: '官方' },
  { repo: 'x1xhlol/system-prompts-and-models-of-ai-tools', base: 52000, desc: '主流 AI 工具系统提示词大合集，逆向工程参考宝库', area: '提示词' },
  { repo: 'modelcontextprotocol/servers', base: 41000, desc: 'MCP 官方服务器参考实现，Skill 生态的工具底座', area: 'MCP' },
  { repo: 'anthropics/claude-code', base: 28000, desc: 'Claude Code 官方 CLI，Skill 的运行环境与宿主', area: '官方' },
  { repo: 'obra/superpowers', base: 17900, desc: '为 Claude Code 注入系统化技能、TDD 与调试工作流', area: '工作流' },
  { repo: 'punkpeye/awesome-mcp-servers', base: 14000, desc: '社区维护的 MCP 服务器精选大目录', area: 'MCP' },
  { repo: 'punkpeye/fastmcp', base: 11600, desc: 'TypeScript 快速构建 MCP Server 的轻量框架', area: '框架' },
  { repo: 'hesreallyhim/awesome-claude-code', base: 12800, desc: 'Claude Code 生态资源总目录（命令/技能/工具）', area: '目录' },
  { repo: 'wshobson/agents', base: 9600, desc: '高质量领域 Subagent 集合，覆盖开发/数据/运维', area: 'Subagent' },
  { repo: 'VoltAgent/awesome-claude-code-subagents', base: 9200, desc: '100+ 现成 Claude Subagent 目录，按领域分类', area: 'Subagent' },
  { repo: 'contains-studio/agents', base: 8200, desc: '设计与内容向 Agent 技能合集，即装即用', area: '创作' },
  { repo: 'github/awesome-copilot', base: 6800, desc: 'GitHub 官方 Copilot Agent 指令、聊天模式与技能集', area: '官方' },
  { repo: 'wshobson/commands', base: 6000, desc: 'Claude Code 斜杠命令工作流集，一键调用最佳实践', area: '工作流' },
  { repo: 'davila7/claude-code-templates', base: 5500, desc: 'Claude Code 项目模板速启集：Agent、命令、MCP 配置', area: '模板' },
  { repo: 'iannuttall/claude-agents', base: 5400, desc: 'Claude Agent 配置范例与最佳实践', area: '范例' },
  { repo: 'e2b-dev/awesome-mcp-servers', base: 4600, desc: '按应用场景分类的 MCP 服务器目录（E2B 维护）', area: 'MCP' },
  { repo: 'browser-use/browser-use', base: 42000, desc: '浏览器自动化 Agent：让 AI 真实操作网页，可接入 Skill', area: '自动化' },
  { repo: 'microsoft/autogen', base: 34000, desc: '微软多智能体协作框架，Agent 编排的经典方案', area: 'Agent' },
  { repo: 'All-Hands-AI/OpenHands', base: 30000, desc: '开源 AI 软件工程师平台，端到端 Agent 开发', area: 'Agent' },
  { repo: 'crewAIInc/crewAI', base: 25000, desc: '角色扮演式多 Agent 协作框架，任务拆解与协作', area: 'Agent' },
  { repo: 'langchain-ai/langgraph', base: 12000, desc: 'LangChain 官方有状态 Agent 编排框架', area: 'Agent' },
  { repo: 'anthropics/claude-cookbooks', base: 10000, desc: 'Anthropic 官方 Claude 用例与集成示例（含 Skill 用法）', area: '官方' },
  { repo: 'e2b-dev/e2b', base: 8000, desc: 'AI 应用云端代码执行沙箱，让 Agent 安全跑代码', area: '沙箱' },
  { repo: 'dair-ai/Prompt-Engineering-Guide', base: 49000, desc: '提示词工程权威指南，Skill 编写的理论底座', area: '提示词' },
  { repo: 'stanfordnlp/dspy', base: 17000, desc: '斯坦福提示词自动优化框架，程序化调优 Skill 输出', area: '提示词' },
];

const CURATED = [
  { repo: 'anthropics/skills', name: '官方技能库', area: '官方', stars: 44200,
    desc: 'Word / PPT / Excel / PDF 等办公文档技能，Anthropic 官方维护，是学习 Skill 编写规范的第一站。',
    install: 'npx skills add anthropics/skills' },
  { repo: 'obra/superpowers', name: 'Superpowers', area: '工作流', stars: 17900,
    desc: '把系统化技能注入 Claude Code：测试驱动、系统调试、头脑风暴等数十个可组合工作流。',
    install: 'npx skills add obra/superpowers' },
  { repo: 'wshobson/agents', name: '领域 Subagent 集', area: 'Subagent', stars: 9600,
    desc: '覆盖后端、前端、数据、安全、DevOps 等领域的专家 Subagent，按需组合成团队。',
    install: 'npx skills add wshobson/agents' },
  { repo: 'contains-studio/agents', name: '创作 Agent 集', area: '创作', stars: 8200,
    desc: '设计、文案、市场向的技能与 Agent 合集，内容创作者的瑞士军刀。',
    install: 'npx skills add contains-studio/agents' },
  { repo: 'modelcontextprotocol/servers', name: 'MCP 服务器集', area: 'MCP', stars: 41000,
    desc: '官方 MCP 服务器参考实现：文件、数据库、浏览器等外部能力接入的标准方式。',
    install: 'https://github.com/modelcontextprotocol/servers' },
  { repo: 'punkpeye/fastmcp', name: 'FastMCP 框架', area: '框架', stars: 11600,
    desc: '用 TypeScript 几行代码构建自己的 MCP Server，把私有工具变成 Agent 可调用的技能。',
    install: 'npm install fastmcp' },
  { repo: 'x1xhlol/system-prompts-and-models-of-ai-tools', name: '系统提示词宝库', area: '提示词', stars: 52000,
    desc: '收录主流 AI 工具（Cursor、v0、Devin 等）泄露的系统提示词原文，写高质量 Skill 的最佳参考。',
    install: 'https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools' },
  { repo: 'anthropics/claude-code', name: 'Claude Code CLI', area: '官方', stars: 28000,
    desc: 'Anthropic 官方命令行 Agent：Skill 的宿主环境，支持自定义技能、斜杠命令与 MCP 接入。',
    install: 'npm install -g @anthropic-ai/claude-code' },
  { repo: 'VoltAgent/awesome-claude-code-subagents', name: 'Subagent 大目录', area: 'Subagent', stars: 9200,
    desc: '100+ 现成 Claude Subagent 按领域分类：前端、后端、测试、DevOps、数据、AI 工程等。',
    install: 'npx skills add VoltAgent/awesome-claude-code-subagents' },
  { repo: 'hesreallyhim/awesome-claude-code', name: '生态资源总目录', area: '目录', stars: 12800,
    desc: 'Claude Code 生态一站式清单：技能、命令、工具、代理与教程，找资源先看这里。',
    install: 'https://github.com/hesreallyhim/awesome-claude-code' },
  { repo: 'github/awesome-copilot', name: 'Copilot 指令集', area: '官方', stars: 6800,
    desc: 'GitHub 官方维护的 Copilot Agent 指令、聊天模式与集合，思路同样适用于其他 Agent 技能体系。',
    install: 'https://github.com/github/awesome-copilot' },
  { repo: 'wshobson/commands', name: '斜杠命令工作流', area: '工作流', stars: 6000,
    desc: '为 Claude Code 设计的斜杠命令库：把常见开发流程固化成一条命令调用。',
    install: 'npx skills add wshobson/commands' },
  { repo: 'davila7/claude-code-templates', name: '项目模板速启', area: '模板', stars: 5500,
    desc: '一键生成带 Agent、命令、MCP 配置的 Claude Code 项目脚手架，新项目冷启动利器。',
    install: 'npx claude-code-templates' },
  { repo: 'punkpeye/awesome-mcp-servers', name: 'MCP 服务器目录', area: 'MCP', stars: 14000,
    desc: '社区最活跃的 MCP Server 精选列表：文件、数据库、浏览器、搜索等能力按类索引。',
    install: 'https://github.com/punkpeye/awesome-mcp-servers' },
  { repo: 'e2b-dev/awesome-mcp-servers', name: '场景化 MCP 目录', area: 'MCP', stars: 4600,
    desc: 'E2B 团队按应用场景分类的 MCP 服务器目录，配简短中文导读更易上手。',
    install: 'https://github.com/e2b-dev/awesome-mcp-servers' },
  { repo: 'browser-use/browser-use', name: '浏览器自动化', area: '自动化', stars: 42000,
    desc: '让 AI 通过 Skill 真实操作浏览器：填表、点击、抓取、多步骤任务，前端自动化的标配。',
    install: 'pip install browser-use' },
  { repo: 'crewAIInc/crewAI', name: '多智能体协作', area: 'Agent', stars: 25000,
    desc: '把任务拆给不同角色的 Agent 并行协作，产出复杂工作流；Skill 可与 crew 组合使用。',
    install: 'pip install crewai' },
  { repo: 'All-Hands-AI/OpenHands', name: 'AI 软件工程师', area: 'Agent', stars: 30000,
    desc: '开源的端到端 AI 编程平台，自动完成编码、测试与修复，可用作技能实验台。',
    install: 'docker run -it --rm -p 3000:3000 ghcr.io/all-hands-ai/openhands' },
  { repo: 'anthropics/claude-cookbooks', name: '官方用例集', area: '官方', stars: 10000,
    desc: 'Anthropic 官方维护的 Claude 集成示例：工具调用、Agent 循环与 Skill 写法，边抄边学。',
    install: 'https://github.com/anthropics/claude-cookbooks' },
  { repo: 'langchain-ai/langgraph', name: 'Agent 编排框架', area: 'Agent', stars: 12000,
    desc: '把多步 Agent 流程建模成状态图：分支、循环、暂停恢复，复杂任务编排的工程化方案。',
    install: 'pip install langgraph' },
];

const dayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function readCache() {
  try { return JSON.parse(window.localStorage.getItem(HOT_CACHE_KEY) || 'null'); } catch { return null; }
}
function writeCache(data) {
  try { window.localStorage.setItem(HOT_CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

/* 热点仓库中文名映射：命中显示手写中文简介，未命中按关键词推断用途 */
const ZH_DESC = {
  'anthropics/skills': 'Anthropic 官方技能库：办公文档与编写规范',
  'obra/superpowers': '系统化技能注入：TDD、调试与头脑风暴工作流',
  'modelcontextprotocol/servers': 'MCP 官方服务器参考实现合集',
  'wshobson/agents': '领域专家 Subagent 集合，覆盖开发/数据/运维',
  'contains-studio/agents': '设计与内容创作向 Agent 技能合集',
  'punkpeye/fastmcp': 'TypeScript 快速构建 MCP Server 框架',
  'hesreallyhim/awesome-claude-code': 'Claude Code 生态资源总目录',
  'x1xhlol/system-prompts-and-models-of-ai-tools': '主流 AI 工具系统提示词大合集',
  'VoltAgent/awesome-claude-code-subagents': '100+ 现成 Claude Subagent 目录',
  'github/awesome-copilot': 'GitHub 官方 Copilot Agent 指令集',
  'davila7/claude-code-templates': 'Claude Code 项目模板速启集',
  'wshobson/commands': 'Claude Code 斜杠命令工作流集',
  'punkpeye/awesome-mcp-servers': '社区 MCP 服务器精选大目录',
  'e2b-dev/awesome-mcp-servers': '按场景分类的 MCP 服务器目录',
  'anthropics/claude-code': 'Claude Code 官方 CLI 本体',
  'iannuttall/claude-agents': 'Claude Agent 配置范例集',
  'browser-use/browser-use': '浏览器自动化 Agent：让 AI 真实操作网页',
  'microsoft/autogen': '微软多智能体协作框架',
  'All-Hands-AI/OpenHands': '开源 AI 软件工程师平台',
  'crewAIInc/crewAI': '角色扮演式多 Agent 协作框架',
  'langchain-ai/langgraph': 'LangChain 有状态 Agent 编排框架',
  'anthropics/claude-cookbooks': 'Anthropic 官方 Claude 集成用例集',
  'e2b-dev/e2b': 'AI 应用云端代码执行沙箱',
  'dair-ai/Prompt-Engineering-Guide': '提示词工程权威指南',
  'stanfordnlp/dspy': '斯坦福提示词自动优化框架',
};

/* 常见 GitHub topic 的中文标签（卡片 topic 徽章用） */
const TOPIC_ZH = {
  'claude-skills': 'Claude 技能', 'claude-code': 'Claude Code', claude: 'Claude',
  mcp: 'MCP', 'model-context-protocol': 'MCP', 'mcp-server': 'MCP 服务器',
  agent: 'Agent', agents: 'Agent', ai: 'AI', llm: 'LLM', automation: '自动化',
  python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript',
  pdf: 'PDF', docx: 'Word', xlsx: 'Excel', pptx: 'PPT',
  'web-scraping': '网页抓取', scraping: '网页抓取', nlp: '自然语言',
  'open-source': '开源', sdk: 'SDK', api: 'API', workflow: '工作流',
};

/* 仓库用途关键词推断表：命中名称/描述/topics 后给出中文用途标签（最多取 2 个） */
const KEYWORD_ZH = [
  [/pdf/, 'PDF 文档处理'], [/docx|\bword\b/, 'Word 文档'], [/xlsx|excel|spreadsheet/, 'Excel 表格'], [/pptx|powerpoint|slide/, 'PPT 演示'],
  [/code.?review/, '代码审查'], [/commit|\bgit\b/, 'Git 提交辅助'], [/\btest|testing/, '自动化测试'], [/debug/, '调试排错'],
  [/seo/, 'SEO 优化'], [/scrap|crawl|spider/, '网页抓取'], [/browser|playwright|puppeteer/, '浏览器自动化'],
  [/image|photo|screenshot/, '图像处理'], [/video/, '视频处理'], [/audio|speech|voice/, '语音音频'],
  [/translat/, '多语言翻译'], [/summar/, '内容总结'], [/resume|\bcv\b/, '简历助手'], [/interview/, '面试辅助'],
  [/memory/, '长期记忆'], [/\brag\b|retrieval|knowledge/, '知识库检索'], [/sql|database|\bdb\b/, '数据库操作'],
  [/email|\bmail\b/, '邮件处理'], [/calendar|schedule/, '日程管理'], [/weather/, '天气查询'],
  [/finance|stock|crypto|trading/, '金融数据'], [/news/, '资讯聚合'],
  [/figma|design|\bui\b/, '设计辅助'], [/docker|kubernetes|devops/, '容器运维'], [/security|vulnerab/, '安全扫描'],
  [/writ|blog|copywriting|content/, '写作文案'], [/note/, '笔记'], [/\btodo\b|task/, '任务管理'],
  [/docs|documentation/, '文档生成'], [/chart|plot|visual/, '图表可视化'], [/math|calculat/, '数学计算'],
];

function zhExplain(item) {
  if (ZH_DESC[item.repo]) return ZH_DESC[item.repo];
  const hay = `${item.repo} ${item.desc || ''} ${(item.topics || []).join(' ')}`.toLowerCase();
  const hits = [];
  for (const [re, label] of KEYWORD_ZH) {
    if (re.test(hay) && !hits.includes(label)) hits.push(label);
    if (hits.length >= 2) break;
  }
  return hits.length
    ? `用途推测：${hits.join(' · ')}`
    : `Skill 生态开源项目 · ${item.lang || '多语言'}编写 · 近 7 天活跃更新`;
}

async function fetchWeeklyHot(since) {
  /* 只收"真正的 skill"：claude-skills 主题仓库 + 精确短语匹配（不用松散关键词，避免混入无关仓库） */
  const urls = [
    `https://api.github.com/search/repositories?q=topic%3Aclaude-skills%20pushed%3A%3E${since}&sort=stars&order=desc&per_page=20`,
    `https://api.github.com/search/repositories?q=%22claude%20skill%22%20pushed%3A%3E${since}&sort=stars&order=desc&per_page=20`,
    `https://api.github.com/search/repositories?q=%22agent%20skills%22%20pushed%3A%3E${since}&sort=stars&order=desc&per_page=20`,
  ];
  const settled = await Promise.allSettled(urls.map((u) => fetchJson(u)));
  const seen = new Set();
  const items = [];
  for (const r of settled) {
    if (r.status !== 'fulfilled' || !Array.isArray(r.value.items)) continue;
    for (const it of r.value.items) {
      if (seen.has(it.full_name) || it.archived || it.fork) continue;
      seen.add(it.full_name);
      items.push({
        repo: it.full_name,
        desc: it.description || '',
        stars: it.stargazers_count || 0,
        lang: it.language || '',
        pushedAt: it.pushed_at || '',
        topics: Array.isArray(it.topics) ? it.topics : [],
        url: it.html_url,
      });
    }
  }
  items.sort((a, b) => b.stars - a.stars);
  return items.slice(0, 20);
}

async function fetchRankStars() {
  const settled = await Promise.allSettled(RANK_BASE.map((r) => fetchJson(`https://api.github.com/repos/${r.repo}`)));
  return RANK_BASE.map((r, i) => {
    const ok = settled[i].status === 'fulfilled' && settled[i].value && typeof settled[i].value.stargazers_count === 'number';
    return { ...r, stars: ok ? settled[i].value.stargazers_count : r.base, live: ok };
  }).sort((a, b) => b.stars - a.stars);
}

async function fetchRising(since) {
  const url = `https://api.github.com/search/repositories?q=topic%3Aclaude-skills%20created%3A%3E${since}&sort=stars&order=desc&per_page=12`;
  const res = await fetchJson(url);
  return (res.items || [])
    .filter((it) => !it.archived && !it.fork)
    .slice(0, 9)
    .map((it) => ({
      repo: it.full_name,
      desc: it.description || '',
      stars: it.stargazers_count || 0,
      lang: it.language || '',
      pushedAt: it.pushed_at || '',
      topics: Array.isArray(it.topics) ? it.topics : [],
      url: it.html_url,
    }));
}

/* 入门指南：静态策展内容（无 API 依赖） */
const GUIDE = [
  { no: '01', title: '什么是 Skill', desc: '一个文件夹 + 一份 SKILL.md：模型按需加载的「说明书」，教会 Agent 一项具体能力。触发靠描述写得准，而不是靠手动调用。', link: 'https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills', linkLabel: '官方设计理念' },
  { no: '02', title: '三步安装', desc: '复制安装命令到终端即可：npx skills add 仓库路径；或手动把技能文件夹放进 ~/.claude/skills 目录。', link: 'https://github.com/anthropics/skills', linkLabel: '官方技能库' },
  { no: '03', title: 'SKILL.md 怎么写', desc: 'YAML frontmatter（name / description）+ 正文步骤。description 写得越具体，触发就越准；长正文按需分文件。', link: 'https://github.com/anthropics/skills', linkLabel: '编写规范范例' },
  { no: '04', title: '搭配 MCP 扩能力', desc: 'Skill 教会 Agent「怎么做」，MCP 接上「用什么做」：文件、数据库、浏览器等外部工具经 MCP 接入。', link: 'https://github.com/modelcontextprotocol/servers', linkLabel: 'MCP 服务器集' },
  { no: '05', title: '学习路径', desc: '先跑通官方示例 → 读优质精选里的源码 → 模仿结构写自己的第一枚 Skill → 用评测集验证触发。', link: 'https://github.com/anthropics/claude-cookbooks', linkLabel: '官方用例集' },
];

function formatStars(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 36e5);
  if (h < 1) return '1 小时内';
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return d === 1 ? '昨天' : `${d} 天前`;
}

/* ============ 子组件 ============ */
function SectionHead({ icon: Icon, title, en, right }) {
  return <header className="sk-sec-head">
    <span className="sk-sec-ico"><Icon size={17} strokeWidth={1.8} /></span>
    <div className="sk-sec-copy"><h2>{title}</h2><span>{en}</span></div>
    {right}
  </header>;
}

function HotCard({ item, index, onCopy, copied }) {
  return <a className="sk-hot" href={item.url} target="_blank" rel="noreferrer" style={{ animationDelay: `${Math.min(index * 55, 400)}ms` }} title={item.desc || undefined}>
    <span className={`sk-hot-rank${index < 3 ? ' is-top' : ''}`}>{String(index + 1).padStart(2, '0')}</span>
    <span className="sk-hot-repo">{item.repo}<ArrowUpRight size={14} /></span>
    <span className="sk-hot-zh">{zhExplain(item)}</span>
    {item.topics && item.topics.length > 0 && (
      <span className="sk-hot-topics">
        {item.topics.slice(0, 3).map((topic) => <i key={topic}>{TOPIC_ZH[topic] || topic}</i>)}
      </span>
    )}
    <span className="sk-hot-meta">
      <b><Star size={12} />{formatStars(item.stars)}</b>
      {item.lang && <em>{item.lang}</em>}
      <em>{timeAgo(item.pushedAt)}更新</em>
      <button
        type="button"
        className={`sk-hot-copy${copied === item.repo ? ' is-copied' : ''}`}
        aria-label="复制安装命令"
        title={`复制安装命令：npx skills add ${item.repo}`}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); onCopy(`npx skills add ${item.repo}`, item.repo); }}
      >
        {copied === item.repo ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </span>
  </a>;
}

function Skeletons({ n = 6 }) {
  return <>{Array.from({ length: n }, (_, i) => <div className="sk-skel" key={i} />)}</>;
}

/* ============ 主页面 ============ */
export default function SkillHub() {
  const [hot, setHot] = useState([]);
  const [rank, setRank] = useState(RANK_BASE.map((r) => ({ ...r, stars: r.base, live: false })));
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');
  const [tab, setTab] = useState('hot');
  const [rising, setRising] = useState([]);
  const [slotEl, setSlotEl] = useState(null);
  const searchRef = useRef(null);
  const lastRefreshRef = useRef(null);

  /* 页头传送门口（Layout 的 tool-head-slot） */
  useEffect(() => { setSlotEl(document.getElementById('tool-head-slot')); }, []);

  /* 性能：预热 GitHub API 连接（首次数据拉取更快） */
  useEffect(() => {
    const l = document.createElement('link');
    l.rel = 'preconnect'; l.href = 'https://api.github.com';
    document.head.appendChild(l);
    return () => document.head.removeChild(l);
  }, []);

  /* 按 / 快速聚焦搜索 */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (e.key === '/' && tag !== 'input' && tag !== 'textarea') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const load = async (force = false) => {
    const now = Date.now();
    if (force && now - lastRefreshRef.current < 60000) return;
    lastRefreshRef.current = now;
    const today = dayStr();
    const cached = readCache();
    if (!force && cached && cached.date === today && Array.isArray(cached.hot)) {
      setHot(cached.hot);
      if (Array.isArray(cached.rank) && cached.rank.length) setRank(cached.rank);
      if (Array.isArray(cached.rising) && cached.rising.length) setRising(cached.rising);
      setUpdatedAt(cached.updatedAt || null);
      setStatus('ok');
      return;
    }
    if (!force) setStatus('loading');
    setRefreshing(true);
    const since = dayStr(new Date(Date.now() - 7 * 864e5));
    const since30 = dayStr(new Date(Date.now() - 30 * 864e5));
    const [hotRes, rankRes, risingRes] = await Promise.allSettled([fetchWeeklyHot(since), fetchRankStars(), fetchRising(since30)]);
    const hotItems = hotRes.status === 'fulfilled' ? hotRes.value : [];
    const rankItems = rankRes.status === 'fulfilled' ? rankRes.value : null;
    const risingItems = risingRes.status === 'fulfilled' ? risingRes.value : [];
    const ok = hotItems.length > 0 || !!rankItems;
    if (hotItems.length) setHot(hotItems);
    if (rankItems) setRank(rankItems);
    if (risingItems.length) setRising(risingItems);
    const stamp = Date.now();
    if (ok) {
      setUpdatedAt(stamp);
      setStatus('ok');
      writeCache({ date: today, hot: hotItems, rank: rankItems || cached?.rank || [], rising: risingItems, updatedAt: stamp });
    } else {
      if (cached?.hot) { setHot(cached.hot); setUpdatedAt(cached.updatedAt || null); }
      setStatus('error');
    }
    setRefreshing(false);
  };

  useEffect(() => { load(false); }, []);

  const q = query.trim().toLowerCase();
  const hotFiltered = useMemo(() => (q ? hot.filter((h) => `${h.repo} ${h.desc} ${h.lang}`.toLowerCase().includes(q)) : hot), [hot, q]);
  const curatedFiltered = useMemo(() => (q ? CURATED.filter((c) => `${c.repo} ${c.name} ${c.desc} ${c.area}`.toLowerCase().includes(q)) : CURATED), [q]);
  const rankFiltered = useMemo(() => (q ? rank.filter((r) => `${r.repo} ${r.desc} ${r.area}`.toLowerCase().includes(q)) : rank), [rank, q]);
  const risingFiltered = useMemo(() => (q ? rising.filter((h) => `${h.repo} ${h.desc} ${h.lang}`.toLowerCase().includes(q)) : rising), [rising, q]);
  const maxRankStars = useMemo(() => Math.max(...rankFiltered.map((r) => r.stars), 1), [rankFiltered]);

  const copyInstall = async (text, id) => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else throw new Error('no clipboard');
      setCopied(id);
      window.setTimeout(() => setCopied((c) => (c === id ? '' : c)), 1600);
    } catch { /* ignore */ }
  };

  const statusNode = status === 'loading'
    ? <span className="sk-status is-loading"><RefreshCw size={12} className="sk-spin" />正在拉取 GitHub 数据…</span>
    : status === 'error'
      ? <span className="sk-status is-error">实时数据获取失败，已展示缓存 / 精选数据</span>
      : <span className="sk-status is-ok"><i />每日自动刷新 · {updatedAt ? `今天 ${new Date(updatedAt).toTimeString().slice(0, 5)} 已更新` : '已就绪'}</span>;

  const TABS = [
    { key: 'hot', label: '每周热点', en: 'WEEKLY HOT', Icon: Flame, count: hotFiltered.length },
    { key: 'cur', label: '优质精选', en: 'CURATED', Icon: Sparkles, count: curatedFiltered.length },
    { key: 'rank', label: '星数排行', en: 'ALL-TIME', Icon: Trophy, count: rankFiltered.length },
    { key: 'new', label: '本周新星', en: 'NEW & RISING', Icon: Rocket, count: risingFiltered.length },
    { key: 'guide', label: '入门指南', en: 'GET STARTED', Icon: BookOpen, count: GUIDE.length },
  ];

  return <div className="sk-page">
    <style>{`
      .sk-page { --ink:#1b1b1b; --line:rgba(27,27,27,.12); --gold:#a48830; --hl:#ffe08a; --soft:#fff9df; --sk-ease:cubic-bezier(.22,1,.36,1);
        color:var(--ink); font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif; display:flex; flex-direction:column; gap:18px; }
      .sk-page * { box-sizing:border-box; }
      .sk-page button { cursor:pointer; font:inherit; }
      .sk-page a { text-decoration:none; }
      .sk-page button:focus-visible, .sk-page a:focus-visible { outline:1.5px solid var(--ink); outline-offset:2px; }

      /* ===== 顶部工具条（仅品牌；搜索/刷新已上移页头） ===== */
      .sk-top { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
        padding-bottom:12px; border-bottom:1px solid var(--line); }
      .sk-brand { display:inline-flex; align-items:center; gap:10px; }
      .sk-brand-ico { display:grid; width:38px; height:38px; place-items:center; border:1px solid rgba(164,136,48,.45); border-radius:9px; background:var(--soft); color:var(--gold); }
      .sk-brand-copy { display:grid; gap:2px; }
      .sk-brand-copy b { font-size:17px; font-weight:780; letter-spacing:-.01em; }
      .sk-brand-copy span { color:#999; font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.06em; }
      .sk-top-right { display:flex; align-items:center; gap:9px; flex-wrap:wrap; flex:0 0 auto; min-width:0; }
      .sk-status { display:inline-flex; align-items:center; gap:6px; padding:6px 11px; border:1px solid var(--line); border-radius:99px; font-size:11.5px; font-weight:600; color:#777; background:rgba(255,255,255,.8); }
      .sk-status.is-ok { border-color:rgba(164,136,48,.4); background:var(--soft); color:#8a6d1c; }
      .sk-status.is-ok i { width:6px; height:6px; border-radius:50%; background:#d4a930; }
      .sk-status.is-error { border-color:rgba(182,75,80,.35); background:#fdf1f1; color:#b64b50; }
      .sk-status.is-loading { color:#888; }
      .sk-spin { animation:sk-rot 1s linear infinite; }
      @keyframes sk-rot { to { transform:rotate(360deg); } }
      .sk-search { display:flex; width:280px; height:38px; align-items:center; gap:8px; padding:0 13px; border:1px solid var(--line); border-radius:99px; background:#fff; }
      .sk-search:focus-within { border-color:rgba(27,27,27,.32); box-shadow:0 0 0 3px rgba(255,224,138,.45); }
      .sk-search svg { flex:0 0 auto; color:#999; }
      .sk-search input { flex:1; min-width:0; border:0; outline:none; background:transparent; color:var(--ink); font-size:13px; }
      .sk-search input::placeholder { color:#a8a8a8; }
      .sk-refresh { display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 14px; border:1px solid var(--line); border-radius:99px; background:#fff; color:#555; font-size:12.5px; font-weight:650; transition:border-color .16s ease, color .16s ease, transform .16s ease; }
      .sk-refresh:hover:not(:disabled) { border-color:var(--gold); color:var(--gold); transform:translateY(-1px); }
      .sk-refresh:disabled { opacity:.5; cursor:not-allowed; }

      /* ===== 页头控件（Portal 注入，位于「数据服务可用」左侧） ===== */
      .sk-headctl { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .sk-headctl .sk-search { width:216px; height:34px; }
      .sk-headctl .sk-search input { font-size:12.5px; }
      .sk-headctl .sk-refresh, .sk-headctl .sk-status { height:34px; padding-top:0; padding-bottom:0; }
      .sk-headctl .sk-status { font-size:11px; }

      /* ===== 五大板块 Tab 栏（紧凑横排） ===== */
      .sk-tabs { position:sticky; top:0; z-index:30; display:flex; gap:8px; flex-wrap:wrap;
        padding:10px 0; margin-bottom:-10px;
        background:linear-gradient(180deg, rgba(247,247,245,.97) 82%, transparent); }
      .sk-tab { display:flex; align-items:center; gap:9px; border:1px solid var(--line); border-radius:12px;
        padding:9px 14px; background:#fff; color:#666; text-align:left;
        transition:border-color .2s var(--sk-ease), background .2s var(--sk-ease), color .16s ease, transform .2s var(--sk-ease), box-shadow .2s var(--sk-ease); }
      .sk-tab-ico { display:grid; width:30px; height:30px; flex:0 0 30px; place-items:center; border-radius:9px;
        background:#f1f3f5; color:#777; transition:background .2s var(--sk-ease), color .2s ease; }
      .sk-tab-copy { display:grid; gap:2px; min-width:0; }
      .sk-tab-copy b { font-size:13.5px; font-weight:740; color:inherit; }
      .sk-tab-copy span { color:#a0a0a0; font:9px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.06em; }
      .sk-tab-count { margin-left:2px; flex:0 0 auto; padding:3px 9px; border-radius:99px; background:#f1f3f5; color:#777;
        font:700 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; transition:background .16s ease, color .16s ease; }
      .sk-tab:hover { border-color:rgba(164,136,48,.5); transform:translateY(-1px); }
      .sk-tab.is-active { border-color:rgba(164,136,48,.6); background:var(--soft); color:var(--ink);
        box-shadow:0 10px 22px -16px rgba(164,136,48,.55); }
      .sk-tab.is-active .sk-tab-ico { background:var(--hl); color:var(--gold); }
      .sk-tab.is-active .sk-tab-count { background:var(--hl); color:#8a6d1c; }

      /* ===== Section 头 ===== */
      .sk-sec-head { display:flex; align-items:center; gap:11px; margin-bottom:16px; }
      .sk-sec-ico { display:grid; width:34px; height:34px; flex:0 0 34px; place-items:center; border:1px solid rgba(164,136,48,.4); border-radius:9px; background:var(--soft); color:var(--gold); }
      .sk-sec-copy { display:grid; gap:1px; }
      .sk-sec-copy h2 { margin:0; font-size:18px; font-weight:770; letter-spacing:-.01em; }
      .sk-sec-copy span { color:#a0a0a0; font:10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.05em; }
      .sk-sec-count { margin-left:auto; color:#a0a0a0; font:11px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }

      /* ===== 每周热点卡片 ===== */
      .sk-hot-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
      .sk-hot { position:relative; display:flex; min-width:0; min-height:196px; flex-direction:column; gap:8px; overflow:hidden;
        border:1px solid var(--line); border-radius:12px; padding:16px 16px 13px; background:#fff;
        box-shadow:0 1px 2px rgba(16,20,30,.04); animation:sk-in .45s var(--sk-ease) both;
        transition:border-color .2s var(--sk-ease), box-shadow .2s var(--sk-ease), transform .2s var(--sk-ease); }
      @keyframes sk-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
      .sk-hot::before { content:""; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg, var(--gold), transparent 70%); opacity:.55; transition:opacity .2s ease; }
      .sk-hot:hover { border-color:rgba(164,136,48,.5); box-shadow:0 18px 34px -24px rgba(0,0,0,.4); transform:translateY(-3px); }
      .sk-hot:hover::before { opacity:1; }
      .sk-hot-rank { position:absolute; top:10px; right:13px; color:transparent; -webkit-text-stroke:1px rgba(164,136,48,.4); font:800 26px/1 ui-monospace,SFMono-Regular,Menlo,monospace; transition:opacity .2s ease; }
      .sk-hot-rank.is-top { color:var(--gold); -webkit-text-stroke:0; }
      .sk-hot-repo { display:flex; align-items:center; gap:6px; padding-right:44px; color:var(--ink); font-size:14.5px; font-weight:740; word-break:break-all; }
      .sk-hot-repo svg { flex:0 0 auto; color:#b0b0b0; transition:color .18s ease, transform .18s ease; }
      .sk-hot:hover .sk-hot-repo svg { color:var(--gold); transform:translate(1px,-1px); }
      .sk-hot-zh { display:-webkit-box; overflow:hidden; color:#333; font-size:12.5px; font-weight:650; line-height:1.65; -webkit-line-clamp:2; -webkit-box-orient:vertical; min-height:41px; }
      .sk-hot-desc { display:-webkit-box; overflow:hidden; color:#9c9c9c; font-size:11px; line-height:1.6; -webkit-line-clamp:1; -webkit-box-orient:vertical; }
      .sk-hot-topics { display:flex; flex-wrap:wrap; gap:6px; }
      .sk-hot-topics i { font-style:normal; display:inline-flex; align-items:center; justify-content:center;
        min-height:24px; min-width:56px; padding:3px 12px; border:1px solid rgba(164,136,48,.26); border-radius:99px;
        background:rgba(255,249,223,.55); color:#8a6d1c; font-size:11px; font-weight:650; white-space:nowrap;
        transition:transform .2s var(--sk-ease), background .2s ease; }
      .sk-hot:hover .sk-hot-topics i { background:rgba(255,249,223,.9); }
      .sk-hot-meta { display:flex; align-items:center; gap:10px; margin-top:auto; padding-top:10px; border-top:1px dashed rgba(27,27,27,.09); color:#999; font-size:11px; }
      .sk-hot-meta b { display:inline-flex; align-items:center; gap:4px; color:var(--gold); font-weight:700; font-variant-numeric:tabular-nums; }
      .sk-hot-meta em { font-style:normal; }
      .sk-hot-copy { display:inline-grid; width:24px; height:24px; place-items:center; margin-left:auto; border:1px solid var(--line); border-radius:7px; background:#fff; color:#888; transition:border-color .16s ease, color .16s ease, background .16s ease; }
      .sk-hot-copy:hover { border-color:var(--gold); color:var(--gold); background:var(--soft); }
      .sk-hot-copy.is-copied { border-color:rgba(58,138,77,.4); color:#3a8a4d; background:#eef7ee; }

      /* ===== 优质精选 ===== */
      .sk-cur-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
      .sk-cur { display:flex; min-width:0; flex-direction:column; gap:10px; border:1px solid var(--line); border-radius:12px; padding:17px 18px 15px; background:rgba(255,255,255,.92); transition:border-color .2s ease, box-shadow .2s ease; }
      .sk-cur:hover { border-color:rgba(164,136,48,.5); box-shadow:0 14px 26px -22px rgba(0,0,0,.4); }
      .sk-cur-top { display:flex; align-items:center; gap:9px; }
      .sk-cur-area { padding:3px 10px; border-radius:99px; background:var(--soft); color:var(--gold); font:700 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .sk-cur-name { font-size:15px; font-weight:750; }
      .sk-cur-stars { margin-left:auto; display:inline-flex; align-items:center; gap:4px; color:var(--gold); font:700 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .sk-cur-desc { color:#6d6d6d; font-size:12.5px; line-height:1.7; }
      .sk-cur-install { display:flex; align-items:center; gap:9px; margin-top:auto; padding:9px 11px; border:1px solid rgba(27,27,27,.09); border-radius:8px; background:#fafaf8; }
      .sk-cur-install code { flex:1; min-width:0; overflow:hidden; color:#555; font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; text-overflow:ellipsis; white-space:nowrap; }
      .sk-cur-copy { display:inline-flex; align-items:center; gap:4px; flex:0 0 auto; border:0; border-radius:6px; padding:5px 8px; background:transparent; color:#777; font-size:10.5px; font-weight:650; transition:background .16s ease, color .16s ease; }
      .sk-cur-copy:hover, .sk-cur-copy.is-copied { background:var(--hl); color:var(--ink); }

      /* ===== 排行榜 ===== */
      .sk-rank-list { display:grid; gap:9px; }
      .sk-rank-row { display:grid; grid-template-columns:34px minmax(0,1fr) 180px 74px auto; gap:13px; align-items:center;
        border:1px solid var(--line); border-radius:11px; padding:12px 15px; background:rgba(255,255,255,.9); transition:border-color .18s ease, transform .18s ease; }
      .sk-rank-row:hover { border-color:rgba(164,136,48,.5); transform:translateX(3px); }
      .sk-rank-no { display:grid; width:32px; height:32px; place-items:center; border-radius:9px; background:#f1f3f5; color:#777; font:800 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .sk-rank-row:nth-child(1) .sk-rank-no { background:#d4a930; color:#fff; }
      .sk-rank-row:nth-child(2) .sk-rank-no { background:#a8abb4; color:#fff; }
      .sk-rank-row:nth-child(3) .sk-rank-no { background:#c08552; color:#fff; }
      .sk-rank-main { display:grid; gap:2px; min-width:0; }
      .sk-rank-repo { display:flex; align-items:center; gap:7px; font-size:13.5px; font-weight:730; }
      .sk-rank-live { padding:2px 7px; border-radius:99px; background:#eef7ee; color:#3a8a4d; font:700 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .sk-rank-desc { overflow:hidden; color:#8a8a8a; font-size:11.5px; text-overflow:ellipsis; white-space:nowrap; }
      .sk-rank-bar { display:grid; gap:5px; }
      .sk-rank-bar-track { height:6px; border-radius:99px; background:#f1f1ee; overflow:hidden; }
      .sk-rank-bar-fill { height:100%; border-radius:99px; background:linear-gradient(90deg, var(--gold), #d4a930); }
      .sk-rank-bar-num { color:#a0a0a0; font:10px/1 ui-monospace,SFMono-Regular,Menlo,monospace; text-align:right; }
      .sk-rank-stars { display:inline-flex; align-items:center; justify-content:flex-end; gap:4px; color:var(--gold); font:750 13px/1 ui-monospace,SFMono-Regular,Menlo,monospace; font-variant-numeric:tabular-nums; }
      .sk-rank-link { display:grid; width:30px; height:30px; place-items:center; border:1px solid var(--line); border-radius:7px; color:#888; background:#fff; transition:border-color .16s ease, color .16s ease; }
      .sk-rank-link:hover { border-color:var(--gold); color:var(--gold); }

      /* ===== 骨架 / 空态 / 提示 ===== */
      .sk-skel { min-height:196px; border:1px solid var(--line); border-radius:12px; background:linear-gradient(90deg,#f4f4f2 25%,#fafaf8 50%,#f4f4f2 75%); background-size:200% 100%; animation:sk-shimmer 1.3s infinite; }
      @keyframes sk-shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
      .sk-empty { display:grid; min-height:160px; place-items:center; border:1px dashed rgba(27,27,27,.24); border-radius:12px; color:#999; font-size:13px; }
      .sk-note { margin:0; color:#adb5bd; font-size:11.5px; }

      /* ===== 入门指南 ===== */
      .sk-guide-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
      .sk-guide { position:relative; display:flex; flex-direction:column; gap:9px; border:1px solid var(--line); border-radius:14px;
        padding:20px 20px 18px; background:#fff; overflow:hidden; animation:sk-in .45s var(--sk-ease) both;
        transition:border-color .2s var(--sk-ease), box-shadow .2s var(--sk-ease), transform .2s var(--sk-ease); }
      .sk-guide:hover { border-color:rgba(164,136,48,.5); box-shadow:0 16px 30px -22px rgba(0,0,0,.4); transform:translateY(-3px); }
      .sk-guide::before { content:""; position:absolute; top:0; left:0; bottom:0; width:3px; background:linear-gradient(180deg, var(--gold), transparent 85%); opacity:.6; }
      .sk-guide-no { position:absolute; top:14px; right:16px; color:transparent; -webkit-text-stroke:1px rgba(164,136,48,.4); font:800 24px/1 ui-monospace,SFMono-Regular,Menlo,monospace; }
      .sk-guide h3 { margin:0; font-size:15.5px; font-weight:750; }
      .sk-guide p { margin:0; color:#6d6d6d; font-size:12.5px; line-height:1.8; flex:1; }
      .sk-guide a { display:inline-flex; align-items:center; gap:5px; width:fit-content; color:var(--gold); font-size:12px; font-weight:700; transition:gap .2s var(--sk-ease), color .16s ease; }
      .sk-guide a:hover { gap:9px; color:#8a6d1c; }

      /* ===== 响应式 ===== */
      @media (max-width:1080px) { .sk-hot-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media (max-width:900px) {
        .sk-cur-grid { grid-template-columns:1fr; }
        .sk-guide-grid { grid-template-columns:1fr; }
        .sk-rank-row { grid-template-columns:34px minmax(0,1fr) 74px auto; }
        .sk-rank-bar { display:none; }
        .sk-headctl .sk-search { width:170px; }
      }
      @media (max-width:640px) {
        .sk-hot-grid { grid-template-columns:1fr; }
        .sk-top { flex-direction:column; align-items:stretch; }
        .sk-headctl { width:100%; }
        .sk-headctl .sk-search { flex:1; width:auto; }
        .sk-headctl .sk-status { display:none; }
        .sk-rank-row { grid-template-columns:34px minmax(0,1fr) auto; }
        .sk-rank-stars { display:none; }
        .sk-tabs { gap:6px; }
        .sk-tab { padding:9px 11px; gap:7px; }
        .sk-tab-ico { width:28px; height:28px; flex-basis:28px; }
        .sk-tab-copy span { display:none; }
      }
      @media (prefers-reduced-motion:reduce) { .sk-page *, .sk-page *::before, .sk-page *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; } }
    `}</style>

    {slotEl && createPortal(
      <div className="sk-headctl">
        <label className="sk-search">
          <Search size={15} />
          <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索仓库名 / 描述 / 领域…" aria-label="搜索 Skill" />
          {query && <button type="button" onClick={() => setQuery('')} style={{ border: 0, background: 'transparent', display: 'grid', placeItems: 'center', color: '#999', padding: 2 }} aria-label="清空搜索"><X size={14} /></button>}
        </label>
        <button type="button" className="sk-refresh" disabled={refreshing || status === 'loading'} onClick={() => load(true)}>
          <RefreshCw size={13} className={refreshing ? 'sk-spin' : ''} />手动刷新
        </button>
        {statusNode}
      </div>,
      slotEl
    )}

    <div className="sk-top">
      <div className="sk-brand">
        <span className="sk-brand-ico"><Sparkles size={19} strokeWidth={1.8} /></span>
        <span className="sk-brand-copy">
          <b>Skill 热榜</b>
          <span>GITHUB SKILL RADAR · 100% 官方入口</span>
        </span>
      </div>
    </div>

    <div className="sk-tabs" role="tablist" aria-label="Skill 五大板块">
      {TABS.map(({ key, label, en, Icon, count }) => (
        <button key={key} type="button" role="tab" aria-selected={tab === key} className={`sk-tab${tab === key ? ' is-active' : ''}`} onClick={() => setTab(key)}>
          <span className="sk-tab-ico"><Icon size={17} strokeWidth={1.9} /></span>
          <span className="sk-tab-copy"><b>{label}</b><span>{en}</span></span>
          <span className="sk-tab-count">{count}</span>
        </button>
      ))}
    </div>

    {tab === 'hot' && <section>
      {status === 'loading' ? (
        <div className="sk-hot-grid"><Skeletons n={6} /></div>
      ) : hotFiltered.length === 0 ? (
        <div className="sk-empty">{status === 'error' ? '实时热点暂时拉取不到，稍后点「手动刷新」重试' : '没有匹配的热点仓库'}</div>
      ) : (
        <div className="sk-hot-grid">{hotFiltered.map((item, i) => <HotCard key={item.repo} item={item} index={i} onCopy={copyInstall} copied={copied} />)}</div>
      )}
      <p className="sk-note">数据来自 GitHub 官方 API：仅收录与 Claude / Agent 技能直接相关的仓库（claude-skills 主题 + 精确短语匹配，已排除 fork），近 7 天有更新、按星数排序；每天首次访问自动刷新并缓存全天复用。卡片中的中文解释由仓库信息推断，仅供参考。</p>
    </section>}

    {tab === 'cur' && <section>
      <div className="sk-cur-grid">
        {curatedFiltered.map((c) => (
          <article key={c.repo} className="sk-cur">
            <div className="sk-cur-top">
              <span className="sk-cur-area">{c.area}</span>
              <span className="sk-cur-name">{c.name}</span>
              <span className="sk-cur-stars"><Star size={12} />{formatStars(c.stars)}</span>
            </div>
            <p className="sk-cur-desc" style={{ margin: 0 }}>{c.desc}</p>
            <div className="sk-cur-install">
              <code>{c.install}</code>
              <button type="button" className={`sk-cur-copy${copied === c.repo ? ' is-copied' : ''}`} onClick={() => copyInstall(c.install, c.repo)}>
                {copied === c.repo ? <Check size={12} /> : <Copy size={12} />}{copied === c.repo ? '已复制' : '复制'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>}

    {tab === 'rank' && <section>
      <div className="sk-rank-list">
        {rankFiltered.map((r, i) => (
          <div key={r.repo} className="sk-rank-row">
            <span className="sk-rank-no">{i + 1}</span>
            <div className="sk-rank-main">
              <span className="sk-rank-repo">{r.repo}{r.live && <span className="sk-rank-live">LIVE</span>}</span>
              <span className="sk-rank-desc">{r.desc}</span>
            </div>
            <div className="sk-rank-bar">
              <span className="sk-rank-bar-track"><span className="sk-rank-bar-fill" style={{ width: `${Math.max(4, (r.stars / maxRankStars) * 100)}%` }} /></span>
              <span className="sk-rank-bar-num">{formatStars(r.stars)} STARS</span>
            </div>
            <span className="sk-rank-stars"><Star size={13} />{formatStars(r.stars)}</span>
            <a className="sk-rank-link" href={`https://github.com/${r.repo}`} target="_blank" rel="noreferrer" aria-label={`打开 ${r.repo}`}><ArrowUpRight size={15} /></a>
          </div>
        ))}
      </div>
      <p className="sk-note">星数为每天自动拉取的 GitHub 实时值（LIVE 标记），拉取失败时回退到收录基准值。</p>
    </section>}

    {tab === 'new' && <section>
      {risingFiltered.length === 0 ? (
        <div className="sk-empty">近 30 天创建的 Skill 仓库暂无数据，稍后点「手动刷新」重试</div>
      ) : (
        <div className="sk-hot-grid">{risingFiltered.map((item, i) => <HotCard key={item.repo} item={item} index={i} onCopy={copyInstall} copied={copied} />)}</div>
      )}
      <p className="sk-note">「本周新星」= 最近 30 天内创建、带 claude-skills 主题的仓库，按星数排序——发现下一个爆款 Skill 的地方。</p>
    </section>}

    {tab === 'guide' && <section>
      <div className="sk-guide-grid">
        {GUIDE.map((g) => (
          <article key={g.no} className="sk-guide">
            <span className="sk-guide-no">{g.no}</span>
            <h3>{g.title}</h3>
            <p>{g.desc}</p>
            <a href={g.link} target="_blank" rel="noreferrer">{g.linkLabel} <ArrowUpRight size={13} /></a>
          </article>
        ))}
      </div>
      <p className="sk-note">入门内容人工整理、长期有效；配合上方三大板块的实战仓库食用更佳。</p>
    </section>}
  </div>;
}
