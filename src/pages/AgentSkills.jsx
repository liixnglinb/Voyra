import React, { useState, useMemo } from 'react';
import {
  Bot, Search, X, Sparkles, ArrowUpRight,
  Cpu, Wrench, Palette, Briefcase, MessageCircleHeart, Workflow,
} from 'lucide-react';

/* ============================================================
   AI Agent 生态全景页（深色赛博风）
   - 全类型 AI Agent 收录：通用 / 编程 / 办公 / 创意 / 自动化 / 开源框架
   - 每个 Agent 带官方品牌 Logo（lobe-icons CDN）
   ============================================================ */

/* logo: 本地打包图标（public/agent-icons/，随网站部署，加载零延迟）
   ⚠️ 必须定义在 AGENTS 数组之前 */
const L = (name) => `./agent-icons/${name}.png`;

/* 少数无现成图标的站点用 favicon 抓取版（同样已本地化） */
const FAVICONS = {
  'Character.AI': './agent-icons/fav-character.png',
  HeyGen: './agent-icons/fav-heygen.png',
  Gamma: './agent-icons/fav-gamma.png',
  Replika: './agent-icons/fav-replika.png',
  Devin: './agent-icons/fav-devin.png',
  '千问办公': './agent-icons/fav-qwenwork.png',
};
const L2 = (name) => FAVICONS[name];

/* ---------- Agent 数据 ----------
   cat: general 通用助手 / coding 编程开发 / office 办公效率
        creative 创意设计 / automation 自动化工作流 / dev 开源框架与平台
        companion 情感陪伴
*/
const AGENTS = [
  /* ===== 通用助手 ===== */
  { name: 'ChatGPT', logo: L('openai'), cat: 'general', vendor: 'OpenAI', desc: '全球最流行的 AI 助手，联网搜索、文件分析、图像生成与 Agent 任务执行全能', url: 'https://chatgpt.com', tags: ['联网', '多模态', 'Agent 模式'] },
  { name: 'Claude', logo: L('claude'), cat: 'general', vendor: 'Anthropic', desc: '长文本与写作能力顶尖，Artifacts 实时预览，深度推理与代码能力全面', url: 'https://claude.ai', tags: ['长文本', '写作', 'Artifacts'] },
  { name: 'Gemini', logo: L('gemini'), cat: 'general', vendor: 'Google', desc: '深度整合 Google 生态，多模态理解强，Deep Research 自动产出研究报告', url: 'https://gemini.google.com', tags: ['多模态', 'Deep Research'] },
  { name: 'Grok', logo: L('grok'), cat: 'general', vendor: 'xAI', desc: '马斯克旗下 xAI 出品，实时接入 X（Twitter）数据，风格直率', url: 'https://grok.com', tags: ['实时热点', 'X 数据'] },
  { name: 'Perplexity', logo: L('perplexity'), cat: 'general', vendor: 'Perplexity AI', desc: 'AI 搜索引擎标杆，答案带来源引用，Comet 浏览器内置 Agent', url: 'https://www.perplexity.ai', tags: ['AI 搜索', '来源引用'] },
  { name: 'DeepSeek', logo: L('deepseek'), cat: 'general', vendor: '深度求索', desc: 'V4 Pro 正式版已上线：100 万 Token 上下文、最大输出 38.4 万，支持 Responses 与 Anthropic API，推理能力比肩闭源旗舰', url: 'https://chat.deepseek.com', tags: ['开源', 'V4 Pro', '100万上下文'] },
  { name: 'Kimi', logo: L('kimi'), cat: 'general', vendor: '月之暗面', desc: 'K3 开源模型全球首个 3 万亿级参数、原生视觉理解 + 100 万上下文；Kimi Work 桌面 Agent 支持 300 个子 Agent 并行', url: 'https://www.kimi.com', tags: ['K3 开源', 'Kimi Work'] },
  { name: '豆包', logo: L('doubao'), cat: 'general', vendor: '字节跳动', desc: '月活 3.82 亿；「工作任务」模式上线技能中心（200+ 技能）、连接器与多 Agent 工作小队，支持手机远控电脑与云电脑双模式', url: 'https://www.doubao.com', tags: ['任务模式', '多Agent协同', '月活3.8亿'] },
  { name: '通义千问', logo: L('qwen'), cat: 'general', vendor: '阿里巴巴', desc: 'Qwen3.8-MAX（2.4 万亿参数）登顶 SuperCLUE 中文榜；千问 App 上线思考研究、定时任务、办公助理，已进入特斯拉车机测试', url: 'https://tongyi.aliyun.com', tags: ['Qwen3.8-MAX', '办公助理', '上车特斯拉'] },
  { name: '文心一言', logo: L2('心响') || L('wenxin'), cat: 'general', vendor: '百度', desc: '文心助手任务引擎 2.0 发布并完全免费：自主规划执行、定时触发主动推送；PinchBench v2 以 94.6% 成功率登顶全球第一', url: 'https://yiyan.baidu.com', tags: ['任务引擎2.0', '免费', '评测登顶'] },
  { name: '智谱清言', logo: L('chatglm'), cat: 'general', vendor: '智谱AI', desc: 'GLM-5.2 支持 1M 无损上下文、开源 SOTA；AutoGLM 桌面 Agent 内置 50+ 技能可操控电脑浏览器，GLM-Claw 云端多智能体平台已上线', url: 'https://chatglm.cn', tags: ['GLM-5.2', 'AutoGLM', '1M上下文'] },
  { name: '讯飞星火', logo: L('spark'), cat: 'general', vendor: '科大讯飞', desc: '星火 X2-VL 是唯一基于全国产算力训练的主流大模型，多模态学科答题准确率近 95%，教育语音赛道优势突出', url: 'https://xinghuo.xfyun.cn', tags: ['全国产算力', 'X2-VL', '教育'] },
  { name: '腾讯元宝', logo: L('yuanbao'), cat: 'general', vendor: '腾讯', desc: '接入混元 Hy3 后任务解决率从 72% 升至 90%，免费生成 PPT/Word/PDF；Hy ASR 3.0 支持方言识别，已打通京东电商生态', url: 'https://yuanbao.tencent.com', tags: ['混元Hy3', '免费办公', '方言识别'] },
  { name: 'Manus', logo: L('manus'), cat: 'office', vendor: 'Monica（中国）', desc: '宣布恢复独立运营并限时免费；新上 Plan Mode 先审方案再执行、对话分支 Branch、智能 PPT 生成与 Auto-Publish 网站自动发布', url: 'https://manus.im', tags: ['通用自主', 'Plan Mode', '限时免费'] },
  { name: 'WorkBuddy', logo: L('hunyuan'), cat: 'office', vendor: '腾讯', desc: '国内桌面端 AI 办公智能体第一（日活破 1300 万），内置 20+ Skills 兼容 OpenClaw 技能体系，安全中心支持越权拦截与操作回滚', url: 'https://workbuddy.cn', tags: ['市占第一', '日活1300万', '企业级'] },
  { name: '千问办公', logo: L2('千问办公'), cat: 'office', vendor: '阿里巴巴', desc: '2026 年 8 月公测的企业级智能办公平台，整合 QoderWork/MuleRun/悟空三款 Agent，首款同时支持桌面/云端/协同 Agent，已过信通院首批评估', url: 'https://qwenwork.cn', tags: ['新发布', '企业级', '鸿蒙适配'] },

  /* ===== 编程开发 ===== */
  { name: 'Cursor', logo: L('cursor'), cat: 'coding', vendor: 'Anysphere', desc: 'AI 原生代码编辑器销量第一，Composer 多文件自主改写，Agent 模式全自动编程', url: 'https://cursor.com', tags: ['AI IDE', 'Agent 模式'] },
  { name: 'GitHub Copilot', logo: L('copilot'), cat: 'coding', vendor: 'GitHub / Microsoft', desc: '最广泛使用的编程助手，Copilot X 支持多模型与 Agent 任务', url: 'https://github.com/features/copilot', tags: ['IDE 插件', '多模型'] },
  { name: 'Claude Code', logo: L('claude'), cat: 'coding', vendor: 'Anthropic', desc: '终端里的自主编程 Agent，端到端完成开发、调试、重构与项目管理', url: 'https://claude.com/product/claude-code', tags: ['终端 Agent', '自主编程'] },
  { name: 'OpenAI Codex', logo: L('codex'), cat: 'coding', vendor: 'OpenAI', desc: '云端并行编程 Agent，同时处理多个开发任务，CLI 本地也可用', url: 'https://openai.com/codex', tags: ['云端并行', 'CLI'] },
  { name: 'Devin', logo: L('devin'), cat: 'coding', vendor: 'Cognition', desc: '全球第一个「AI 软件工程师」，独立完成代码迁移、PR 审查与全栈开发', url: 'https://devin.ai', tags: ['AI 工程师', '全栈自主'] },
  { name: 'Trae', logo: L('trae'), cat: 'coding', vendor: '字节跳动', desc: '国内可直访的 AI IDE，内置 Builder 模式从零搭建项目，免费额度慷慨', url: 'https://www.trae.com.cn', tags: ['国内直访', '免费'] },
  { name: 'Windsurf', logo: L('windsurf'), cat: 'coding', vendor: 'Windsurf', desc: 'Cascade 深度感知代码库的 AI IDE，编辑体验流畅自然', url: 'https://windsurf.com', tags: ['代码库感知', 'AI IDE'] },
  { name: 'Google Jules', logo: L('google'), cat: 'coding', vendor: 'Google DeepMind', desc: '异步自主编程 Agent，克隆仓库自主规划修改代码并提交 PR', url: 'https://jules.google.com', tags: ['异步执行', '自动 PR'] },
  { name: 'Bolt.new', logo: L('v0'), cat: 'coding', vendor: 'StackBlitz', desc: '浏览器里对话生成全栈应用，即时预览一键部署', url: 'https://bolt.new', tags: ['全栈生成', '即时预览'] },
  { name: 'v0', logo: L('v0'), cat: 'coding', vendor: 'Vercel', desc: '对话生成 React/Tailwind UI 与全栈应用，Vercel 生态无缝部署', url: 'https://v0.dev', tags: ['UI 生成', 'Vercel'] },
  { name: 'Lovable', logo: L('lovable'), cat: 'coding', vendor: 'Lovable', desc: '欧洲增长最快的 AI 应用构建器，对话式全栈开发', url: 'https://lovable.dev', tags: ['全栈', '对话构建'] },
  { name: 'Replit Agent', logo: L('replit'), cat: 'coding', vendor: 'Replit', desc: '自然语言描述任务，自动构建、迭代并部署完整项目', url: 'https://replit.com', tags: ['云端 IDE', '自动部署'] },
  { name: 'Cline', logo: L('cline'), cat: 'coding', vendor: '开源', desc: 'VSCode 开源自主编程插件，支持任意模型，插件生态丰富', url: 'https://cline.bot', tags: ['开源', 'VSCode'] },

  /* ===== 办公效率 ===== */
  { name: 'Microsoft Copilot', logo: L('copilot'), cat: 'office', vendor: 'Microsoft', desc: 'Windows + Office 全生态 AI，文档、表格、邮件、会议全自动辅助', url: 'https://copilot.microsoft.com', tags: ['Office 整合', '系统级'] },
  { name: 'Notion AI', logo: L('notion'), cat: 'office', vendor: 'Notion', desc: '笔记与知识库原生 AI，写作、总结、数据库自动填充一体化', url: 'https://www.notion.so/product/ai', tags: ['知识管理', '写作'] },
  { name: 'WPS 灵犀', logo: L('spark'), cat: 'office', vendor: '金山办公', desc: 'WPS 原生办公智能体，文档生成、PPT 制作、数据处理一句话完成，深度适配国产办公生态', url: 'https://ai.wps.cn', tags: ['国产办公', 'PPT 生成'] },
  { name: '钉钉 AI 助理', logo: L('alibaba'), cat: 'office', vendor: '阿里巴巴', desc: '深嵌钉钉生态（2600 万企业组织），与千问办公打通，会议纪要、审批流程、日程管理自动化', url: 'https://www.dingtalk.com', tags: ['企业协同', '流程自动化'] },
  { name: '飞书智能伙伴', logo: L('bytedance'), cat: 'office', vendor: '字节跳动', desc: '飞书产品团队已并入豆包体系，企业知识问答与多维表格 AI 字段持续强化，AI 协作内容自动沉淀回知识库', url: 'https://www.feishu.cn', tags: ['知识问答', '并入豆包'] },
  { name: 'Gamma', logo: L2('Gamma') || L('gamma'), cat: 'office', vendor: 'Gamma', desc: 'AI 演示文稿标杆，一句话生成精美 PPT/网页/文档', url: 'https://gamma.app', tags: ['PPT 生成', '设计感强'] },
  { name: 'Manus', logo: L('manus'), cat: 'office', vendor: 'Monica', desc: '云原生通用自主 Agent，隔离计算环境里自主完成调研、开发、数据处理', url: 'https://manus.im', tags: ['通用自主', '云端执行'] },

  /* ===== 创意设计 ===== */
  { name: 'Midjourney', logo: L('midjourney'), cat: 'creative', vendor: 'Midjourney', desc: 'AI 图像生成美学天花板，风格化创作与角色一致性领先', url: 'https://www.midjourney.com', tags: ['图像生成', '艺术风格'] },
  { name: 'Runway', logo: L('runway'), cat: 'creative', vendor: 'Runway', desc: 'AI 视频创作专业工具，Gen-4 视频生成与电影级特效', url: 'https://runwayml.com', tags: ['视频生成', '电影级'] },
  { name: 'Suno', logo: L('suno'), cat: 'creative', vendor: 'Suno', desc: 'AI 音乐生成王者，一句话生成完整歌曲（含人声）', url: 'https://suno.com', tags: ['音乐生成', '人声合成'] },
  { name: 'Pika', logo: L('pika'), cat: 'creative', vendor: 'Pika Labs', desc: '轻量趣味 AI 视频工具，特效模板丰富，社媒创作利器', url: 'https://pika.art', tags: ['短视频', '特效模板'] },
  { name: 'Figma AI', logo: L('figma'), cat: 'creative', vendor: 'Figma', desc: '设计协作平台原生 AI，自动生成设计稿、命名图层与原型', url: 'https://www.figma.com', tags: ['UI 设计', '协作'] },
  { name: '即梦 AI', logo: L('jimeng'), cat: 'creative', vendor: '字节跳动', desc: '即梦（Dreamina）图像与视频生成，深度整合剪映创作链路', url: 'https://jimeng.jianying.com', tags: ['图像视频', '剪映联动'] },
  { name: '可灵 AI', logo: L('klingai'), cat: 'creative', vendor: '快手', desc: '国产视频生成第一梯队，物理真实感与运动幅度领先', url: 'https://klingai.kuaishou.com', tags: ['视频生成', '物理真实'] },
  { name: 'HeyGen', logo: L2('HeyGen') || L('heygen'), cat: 'creative', vendor: 'HeyGen', desc: 'AI 数字人视频平台，口型同步与多语言翻译自然逼真', url: 'https://www.heygen.com', tags: ['数字人', '视频翻译'] },

  /* ===== 自动化工作流 ===== */
  { name: 'n8n', logo: L('n8n'), cat: 'automation', vendor: 'n8n', desc: '最流行的开源自动化平台，AI Agent 节点 + 400+ 应用集成，可自托管', url: 'https://n8n.io', tags: ['开源', '自托管', '工作流'] },
  { name: 'Dify', logo: L('dify'), cat: 'automation', vendor: 'LangGenius', desc: '开源 LLM 应用开发平台，可视化编排 Agent 工作流与 RAG 知识库', url: 'https://dify.ai', tags: ['开源', '可视化编排'] },
  { name: 'Coze 扣子', logo: L('coze'), cat: 'automation', vendor: '字节跳动', desc: '3.0 版本支持多人多 Agent 协作与行业技能包，全量接入豆包 2.1 模型；自媒体 Skill 覆盖选题到复盘全流程', url: 'https://www.coze.cn', tags: ['零代码', '3.0 版本', '多Agent协作'] },
  { name: 'Zapier', logo: L('zapier'), cat: 'automation', vendor: 'Zapier', desc: '自动化鼻祖，6000+ 应用集成，AI 动作让工作流自主决策', url: 'https://zapier.com', tags: ['6000+ 集成', 'AI 决策'] },
  { name: 'FastGPT', logo: L('fastgpt'), cat: 'automation', vendor: '开源', desc: '开源知识库问答系统，Flow 可视化编排，企业私有化部署首选', url: 'https://fastgpt.in', tags: ['知识库', '私有化'] },
  { name: 'Hugging Face', logo: L('huggingface'), cat: 'automation', vendor: 'Hugging Face', desc: '全球最大 AI 开源社区，Gradio Spaces 一键托管 AI 应用与 Agent Demo', url: 'https://huggingface.co', tags: ['开源社区', '模型托管'] },

  /* ===== 开源框架与本地部署 ===== */
  { name: 'LangChain', logo: L('langchain'), cat: 'dev', vendor: 'LangChain', desc: '最流行的 LLM 应用开发框架，LangGraph 构建生产级状态机 Agent', url: 'https://www.langchain.com', tags: ['开发框架', 'LangGraph'] },
  { name: 'Ollama', logo: L('ollama'), cat: 'dev', vendor: 'Ollama', desc: '本地一键运行开源大模型，Llama/Qwen/DeepSeek 全支持', url: 'https://ollama.com', tags: ['本地部署', '一键运行'] },
  { name: 'OpenAI Agents SDK', logo: L('openai'), cat: 'dev', vendor: 'OpenAI', desc: '官方 Agent 开发框架，工具调用、护栏与追踪开箱即用', url: 'https://openai.github.io/openai-agents-python/', tags: ['官方 SDK', '生产级'] },
  { name: 'AutoGen', logo: L('microsoft'), cat: 'dev', vendor: 'Microsoft', desc: '微软多 Agent 对话协作框架，学术与企业研究常用', url: 'https://microsoft.github.io/autogen/', tags: ['多 Agent', '微软出品'] },
  { name: 'CrewAI', logo: L('crewai'), cat: 'dev', vendor: 'CrewAI', desc: '多智能体角色分工框架，产品/开发/测试 Agent 组队干活', url: 'https://www.crewai.com', tags: ['角色分工', '多 Agent'] },
  { name: 'Mistral', logo: L('mistral'), cat: 'dev', vendor: 'Mistral AI', desc: '欧洲 AI 旗帜，开源模型权重开放，Agents API 构建自主智能体', url: 'https://mistral.ai', tags: ['开源权重', '欧洲'] },
  { name: 'Groq', logo: L('groq'), cat: 'dev', vendor: 'Groq', desc: 'LPU 推理芯片，全球最快的 LLM 推理速度，实时 Agent 首选', url: 'https://groq.com', tags: ['极速推理', 'LPU'] },

  /* ===== 情感陪伴 ===== */
  { name: 'Replika', logo: L2('Replika'), cat: 'companion', vendor: 'Luka', desc: '最知名的 AI 伴侣，长期记忆与情感联结，全球千万用户', url: 'https://replika.com', tags: ['AI 伴侣', '长期记忆'] },
  { name: 'Character.AI', logo: L2('Character.AI') || L('character'), cat: 'companion', vendor: 'Character.AI', desc: '角色扮演对话平台，海量虚拟角色与自定义人格', url: 'https://character.ai', tags: ['角色扮演', '自定义人格'] },
  { name: '星野', logo: L('minimax'), cat: 'companion', vendor: 'MiniMax', desc: '国产沉浸式 AI 角色扮演 App；MiniMax 同期发布 Mavis 多智能体协作平台与海螺视频', url: 'https://www.xingyeai.com', tags: ['沉浸对话', 'MiniMax 系'] },

  /* ===== 垂直领域 ===== */
  { name: '商汤日日新', logo: L('sensenova'), cat: 'general', vendor: '商汤科技', desc: 'SenseNova 6.8 多模态智能体：数百步长程任务稳定执行、动态调度十余个专业 Agent 并行协作，主推「委派智能」', url: 'https://www.sensetime.com/cn/technology-product', tags: ['多模态', '多Agent协作', '委派智能'] },
];

const CATS = [
  { key: 'general', label: '通用助手', icon: Bot, color: '#22d3ee', desc: '对话、搜索、写作全能型' },
  { key: 'coding', label: '编程开发', icon: Cpu, color: '#a78bfa', desc: '自主写码、调试、部署' },
  { key: 'office', label: '办公效率', icon: Briefcase, color: '#34d399', desc: '文档、表格、演示自动化' },
  { key: 'creative', label: '创意设计', icon: Palette, color: '#f472b6', desc: '图像、视频、音乐生成' },
  { key: 'automation', label: '自动化工作流', icon: Workflow, color: '#fbbf24', desc: '跨应用联动、零代码编排' },
  { key: 'dev', label: '框架与平台', icon: Wrench, color: '#60a5fa', desc: '开发框架、本地部署、推理' },
  { key: 'companion', label: '情感陪伴', icon: MessageCircleHeart, color: '#fb7185', desc: '角色扮演、情感交互' },
];

const CAT_MAP = Object.fromEntries(CATS.map((c) => [c.key, c]));

/* ---------- 星空数据（模块加载时生成一次，避免每次渲染重算） ---------- */
const STARS = Array.from({ length: 110 }, (_, i) => ({
  x: (i * 61.8 + 13) % 100,                       // 黄金比例散列，分布均匀
  y: (i * 37.7 + 7) % 100,
  r: 0.8 + ((i * 7) % 10) / 6,                    // 0.8 ~ 2.4px
  tw: 2.5 + ((i * 11) % 40) / 10,                 // 闪烁周期 2.5~6.5s
  o1: 0.12 + ((i * 13) % 20) / 100,               // 最暗透明度
  o2: 0.55 + ((i * 17) % 45) / 100,               // 最亮透明度
}));
const METEORS = [
  { x: 78, y: 4,  dur: 14,  delay: 0,    ang: -36, dx: -460, dy: 330 },
  { x: 92, y: 14, dur: 12,  delay: 9,    ang: -40, dx: -380, dy: 300 },
  { x: 55, y: 2,  dur: 16,  delay: 18,   ang: -33, dx: -520, dy: 330 },
  { x: 30, y: 8,  dur: 13,  delay: 29,   ang: -38, dx: -430, dy: 320 },
  { x: 68, y: 20, dur: 15,  delay: 41,   ang: -35, dx: -480, dy: 330 },
];

export default function AgentSkills() {
  const [cat, setCat] = useState('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => AGENTS.filter((a) => {
    const cf = cat === 'all' || a.cat === cat;
    const q = query.trim().toLowerCase();
    const mq = !q || a.name.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q) || (a.vendor || '').toLowerCase().includes(q);
    return cf && mq;
  }), [cat, query]);

  const grouped = useMemo(() => {
    const g = {};
    for (const c of CATS) g[c.key] = filtered.filter((a) => a.cat === c.key);
    return g;
  }, [filtered]);

  const logoFallback = (e) => {
    e.currentTarget.style.display = 'none';
    if (e.currentTarget.nextElementSibling) e.currentTarget.nextElementSibling.style.display = 'flex';
  };

  return (
    <div className="agx-page">
      <style>{`
        .agx-page { min-height:100vh; color:#e6e9f2; position:relative; overflow-x:hidden; background:#000; }

        /* ===== 星空 ===== */
        .agx-stars { position:fixed; inset:0; z-index:0; pointer-events:none; }
        .agx-star { position:absolute; border-radius:50%; background:#fff;
          animation:agx-twinkle var(--tw, 4s) ease-in-out infinite; }
        @keyframes agx-twinkle { 0%,100%{ opacity:var(--o1,.25); } 50%{ opacity:var(--o2,.9); } }

        /* ===== 流星（缓慢划过） ===== */
        .agx-meteor { position:fixed; top:0; z-index:0; pointer-events:none; width:2px; height:2px; border-radius:50%;
          background:#fff; box-shadow:0 0 6px 1px rgba(200,225,255,.75); opacity:0;
          animation:agx-shoot var(--dur,9s) linear infinite; animation-delay:var(--delay,0s); }
        @keyframes agx-shoot {
          0%   { opacity:0; transform:translate(0,0) rotate(var(--ang,-38deg)); }
          1%   { opacity:.9; }
          16%  { opacity:.9; }
          26%  { opacity:0; transform:translate(var(--dx,-420px), var(--dy,300px)) rotate(var(--ang,-38deg)); }
          100% { opacity:0; transform:translate(var(--dx,-420px), var(--dy,300px)) rotate(var(--ang,-38deg)); }
        }
        .agx-meteor::before { content:''; position:absolute; top:50%; right:0; width:150px; height:1.5px;
          transform:translateY(-50%); transform-origin:right center;
          background:linear-gradient(270deg, rgba(220,238,255,.9), rgba(150,190,255,.3), transparent); }

        /* ===== 布局：单列全宽 ===== */
        .agx-inner { position:relative; z-index:2; width:min(100% - 48px, 1680px); max-width:1680px; margin:0 auto; padding:30px 0 64px; }
        @media (max-width:640px){ .agx-inner { width:min(100% - 28px, 1680px); padding-top:22px; } }

        /* ===== 顶栏（一行式） ===== */
        .agx-top { display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
        .agx-top h1 { margin:0; font-size:27px; font-weight:800; letter-spacing:-.03em; color:#f5f8ff; }
        .agx-top h1 em { font-style:normal; background:linear-gradient(100deg,#9cc8ff,#d3c4fd 60%,#ffd8ec); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
        .agx-top p { margin:0; font-size:12.5px; color:#5e6a92; }
        .agx-top .spacer { flex:1; }
        .agx-top-badge { font-size:10.5px; font-weight:650; letter-spacing:.1em; color:#9cc8ff; border:1px solid rgba(156,200,255,.28);
          background:rgba(156,200,255,.06); border-radius:999px; padding:4px 12px; }
        .agx-top-stat { font-size:11.5px; color:#5e6a92; }
        .agx-top-stat b { color:#c9d6f2; font-weight:750; }

        /* ===== 分类横排导航 ===== */
        .agx-nav { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
        .agx-chip { display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.035);
          color:#8590b5; border-radius:10px; font-size:12.5px; font-weight:600; padding:7.5px 15px; cursor:pointer; transition:all .16s ease; }
        .agx-chip:hover { background:rgba(255,255,255,.07); color:#e2e9fa; border-color:rgba(255,255,255,.18); transform:translateY(-1px); }
        .agx-chip.on { color:#fff; border-color:color-mix(in srgb, var(--cc, #8ec5ff) 55%, transparent);
          background:linear-gradient(120deg, color-mix(in srgb, var(--cc, #8ec5ff) 20%, transparent), color-mix(in srgb, var(--cc, #8ec5ff) 10%, transparent));
          box-shadow:0 0 20px -4px color-mix(in srgb, var(--cc, #8ec5ff) 45%, transparent); }
        .agx-chip.on svg { color:var(--cc, #8ec5ff); }

        /* ===== 搜索行 ===== */
        .agx-searchrow { display:flex; gap:10px; align-items:center; margin-bottom:26px; max-width:460px;
          border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.04); border-radius:11px; padding:9px 14px; transition:all .18s ease; }
        .agx-searchrow:focus-within { border-color:rgba(156,200,255,.45); background:rgba(255,255,255,.06); box-shadow:0 0 20px -6px rgba(156,200,255,.35); }
        .agx-searchrow input { flex:1; min-width:0; border:0 !important; outline:0; background:transparent !important; font-size:13px; color:#e6e9f2 !important;
          padding:0 !important; border-radius:0 !important; box-shadow:none !important; }
        .agx-searchrow input:hover, .agx-searchrow input:focus { background:transparent !important; border:0 !important; box-shadow:none !important; }
        .agx-searchrow input::placeholder { color:#4d5878; }

        /* ===== 分组区 ===== */
        .agx-group { margin-bottom:34px; }
        .agx-group-head { display:flex; align-items:center; gap:10px; margin-bottom:13px; }
        .agx-group-ico { width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; border:1px solid; flex-shrink:0; }
        .agx-group-head h2 { margin:0; font-size:16px; font-weight:750; color:#eef3ff; letter-spacing:-.015em; }
        .agx-group-head small { color:#5a6488; font-size:11.5px; margin-left:auto; }

        /* ===== 卡片网格（紧凑） ===== */
        .agx-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(232px, 1fr)); gap:12px; }
        .agx-card { position:relative; display:flex; flex-direction:column; gap:8px; border:1px solid rgba(255,255,255,.1); border-radius:15px;
          background:linear-gradient(170deg, rgba(22,27,46,.78), rgba(12,15,28,.66)); backdrop-filter:blur(10px); padding:15px; transition:all .22s cubic-bezier(.22,.68,.4,1); overflow:hidden; }
        .agx-card::before { content:''; position:absolute; top:0; left:12%; right:12%; height:1px; opacity:0; transition:opacity .22s ease;
          background:linear-gradient(90deg, transparent, var(--gc, #8ec5ff), transparent); }
        .agx-card:hover { transform:translateY(-3px); border-color:color-mix(in srgb, var(--gc, #8ec5ff) 52%, transparent);
          background:linear-gradient(170deg, rgba(30,37,62,.88), rgba(16,20,38,.78)); box-shadow:0 14px 36px -14px color-mix(in srgb, var(--gc, #8ec5ff) 36%, transparent); }
        .agx-card:hover::before { opacity:1; }
        .agx-card-top { display:flex; align-items:center; gap:10px; }
        .agx-logo { width:38px; height:38px; border-radius:11px;
          background:radial-gradient(circle at 32% 28%, rgba(255,255,255,.13), rgba(255,255,255,.045) 65%);
          border:1px solid rgba(255,255,255,.12);
          display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.09), 0 2px 8px -2px rgba(0,0,0,.5); }
        .agx-logo img { width:26px; height:26px; object-fit:contain; filter:drop-shadow(0 1px 3px rgba(0,0,0,.45)); }
        .agx-logo-fb { display:none; width:100%; height:100%; align-items:center; justify-content:center; color:var(--gc, #8ec5ff); }
        .agx-name { font-size:14.5px; font-weight:750; color:#f4f7ff; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .agx-vendor { font-size:10.5px; color:#64719c; margin-top:1px; }
        .agx-desc { font-size:11.5px; line-height:1.58; color:#98a3c6; flex:1;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        .agx-tags { display:flex; gap:5px; flex-wrap:wrap; }
        .agx-tag { font-size:9.5px; font-weight:650; color:color-mix(in srgb, var(--gc, #8ec5ff) 82%, #fff);
          background:color-mix(in srgb, var(--gc, #8ec5ff) 13%, transparent);
          border:1px solid color-mix(in srgb, var(--gc, #8ec5ff) 26%, transparent); border-radius:999px; padding:1.5px 8px; }
        .agx-go { position:absolute; top:12px; right:12px; color:#4d5878; opacity:0; transform:translate(-4px,4px); transition:all .2s ease; z-index:1; }
        .agx-card:hover .agx-go { opacity:1; transform:translate(0,0); color:var(--gc, #8ec5ff); }

        .agx-empty { text-align:center; padding:70px 0; color:#4d5878; font-size:14px; }
        .agx-foot { text-align:center; margin-top:44px; font-size:11.5px; color:#4d5878; line-height:1.8; }
        .agx-foot a { color:#9cc8ff; text-decoration:none; }

        @media (max-width:640px){
          .agx-grid { grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:10px; }
          .agx-card { padding:13px; }
          .agx-chip { padding:7px 12px; font-size:12px; }
        }
        @media (max-width:420px){ .agx-grid { grid-template-columns:1fr 1fr; } }
        @media (prefers-reduced-motion:reduce){
          .agx-meteor, .agx-star { animation:none; }
          .agx-meteor { display:none; }
        }
      `}</style>

      {/* ===== 星空背景 ===== */}
      <div className="agx-stars" aria-hidden="true">
        {STARS.map((s, i) => (
          <span key={'s' + i} className="agx-star" style={{ left: s.x + '%', top: s.y + '%', width: s.r + 'px', height: s.r + 'px', '--tw': s.tw + 's', '--o1': s.o1, '--o2': s.o2 }} />
        ))}
        {METEORS.map((m, i) => (
          <span key={'m' + i} className="agx-meteor" style={{ left: m.x + '%', top: m.y + '%', '--dur': m.dur + 's', '--delay': m.delay + 's', '--ang': m.ang + 'deg', '--dx': m.dx + 'px', '--dy': m.dy + 'px' }} />
        ))}
      </div>

      <div className="agx-inner">

        {/* ===== 一行式顶栏 ===== */}
        <div className="agx-top">
          <h1>AI Agent <em>全景图</em></h1>
          <p>从对话到自主执行，找到最适合的数字员工</p>
          <span className="spacer" />
          <span className="agx-top-stat"><b>{AGENTS.length}</b> 款收录 · <b>{CATS.length}</b> 大类型</span>
          <span className="agx-top-badge">100% 官方入口</span>
        </div>

        {/* ===== 分类横排导航 ===== */}
        <nav className="agx-nav">
          <button className={`agx-chip${cat === 'all' ? ' on' : ''}`} onClick={() => setCat('all')}>
            <Sparkles size={13} />全部<span style={{ opacity: .55, fontSize: 11 }}>{AGENTS.length}</span>
          </button>
          {CATS.map((c) => {
            const Icon = c.icon;
            const n = AGENTS.filter((a) => a.cat === c.key).length;
            return (
              <button key={c.key} className={`agx-chip${cat === c.key ? ' on' : ''}`} onClick={() => setCat(c.key)} style={{ '--cc': c.color }}>
                <Icon size={13} />{c.label}<span style={{ opacity: .55, fontSize: 11 }}>{n}</span>
              </button>
            );
          })}
        </nav>

        {/* ===== 搜索行 ===== */}
        <div className="agx-searchrow">
          <Search size={14} color="#4d5878" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索 Agent、厂商或能力…" />
          {query && <button onClick={() => setQuery('')} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#4d5878', padding: 0 }}><X size={12} /></button>}
        </div>

        {/* ===== 分组展示 ===== */}
        {filtered.length === 0 ? (
          <div className="agx-empty">没有匹配的 Agent，换个关键词试试</div>
        ) : (
          CATS.filter((c) => grouped[c.key].length > 0).map((c) => {
            const Icon = c.icon;
            return (
              <section key={c.key} className="agx-group">
                <div className="agx-group-head">
                  <div className="agx-group-ico" style={{ color: c.color, borderColor: c.color + '44', background: c.color + '12' }}><Icon size={15} /></div>
                  <h2>{c.label}</h2>
                  <small>{c.desc} · {grouped[c.key].length} 款</small>
                </div>
                <div className="agx-grid">
                  {grouped[c.key].map((a) => (
                    <a key={a.name} className="agx-card" href={a.url} target="_blank" rel="noopener noreferrer" style={{ '--gc': c.color, textDecoration: 'none' }}>
                      <div className="agx-card-top">
                        <div className="agx-logo" loading-eager="true">
                          <img src={a.logo} alt={a.name + ' logo'} onError={logoFallback} />
                          <div className="agx-logo-fb"><Bot size={20} /></div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="agx-name">{a.name}</div>
                          <div className="agx-vendor">{a.vendor}</div>
                        </div>
                      </div>
                      <div className="agx-desc">{a.desc}</div>
                      <div className="agx-tags">{a.tags.map((t) => <span key={t} className="agx-tag">{t}</span>)}</div>
                      <span className="agx-go"><ArrowUpRight size={15} /></span>
                    </a>
                  ))}
                </div>
              </section>
            );
          })
        )}

        <footer className="agx-foot">
          共收录 {AGENTS.length} 款 AI Agent · 图标来自各官方品牌 · 持续更新中 · <a href="https://lxlrwxs.top" target="_blank" rel="noopener noreferrer">Voyra</a> · 帅帅你阿历
        </footer>
      </div>
    </div>
  );
}
