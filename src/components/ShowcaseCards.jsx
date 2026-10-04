import React from 'react';
import {
  ArrowUpRight, Activity, MapPin, Clock, Heart, Sparkles, Copy,
  Sliders, KeyRound, Flame, Star, Terminal, Bot, GitFork, Cpu,
  ShieldCheck, Route, GitCommit, Milk, Moon, Thermometer,
  CheckCircle2, Droplets, Dumbbell, Code2, LineChart, Check,
  HardDrive, FileCode, Bell, Zap, Layers, BrainCircuit
} from 'lucide-react';

/* ==========================================================================
   FEATURED 01 ~ 11: 自研产品区橱窗卡片
   ========================================================================== */

export function CardRelayApi() {
  return (
    <a
      href="https://apilxl.bbroot.com/"
      target="_blank"
      rel="noreferrer"
      className="sc-card theme-api"
      aria-label="Voyra Relay API"
    >
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">01 / API GATEWAY</span>
          <h3 className="sc-title">Voyra Relay API</h3>
          <p className="sc-desc">统一 API 网关，接入海量 AI 模型，集中管理请求、路由与成本。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-api">
        <div className="api-preview-header">
          <span className="api-status-dot"></span>
          <span className="api-status-text">RELAY CLUSTER ACTIVE</span>
          <span className="api-ping">42ms · 99.98%</span>
        </div>

        <div className="api-topo">
          <div className="api-col api-col-left">
            <div className="api-node api-node-client">
              <span className="api-node-lbl">Client</span>
              <code className="api-code">POST /v1/chat</code>
            </div>
          </div>

          <div className="api-col api-col-center">
            <div className="api-hub">
              <Activity size={16} className="api-hub-icon" />
              <span className="api-hub-lbl">RELAY</span>
            </div>
          </div>

          <div className="api-col api-col-right">
            <div className="api-target">
              <span className="target-dot d-deepseek"></span>
              <span className="target-name">DeepSeek-V3</span>
              <span className="target-metric">¥0.002</span>
            </div>
            <div className="api-target target-active">
              <span className="target-dot d-claude"></span>
              <span className="target-name">Claude Sonnet</span>
              <span className="target-metric">200 OK</span>
            </div>
            <div className="api-target">
              <span className="target-dot d-openai"></span>
              <span className="target-name">GPT-4o</span>
              <span className="target-metric">Standby</span>
            </div>
          </div>
        </div>

        <div className="api-stream-bar">
          <div className="stream-cell">
            <span className="s-label">24H REQUESTS</span>
            <span className="s-val">128,420</span>
          </div>
          <div className="stream-cell">
            <span className="s-label">AVG LATENCY</span>
            <span className="s-val">180ms</span>
          </div>
          <div className="stream-cell">
            <span className="s-label">ROUTING</span>
            <span className="s-val">Smart Failover</span>
          </div>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">PROD GATEWAY</span>
        <span className="sc-cta">
          访问网关 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardScheduleHub() {
  return (
    <a href="#/timetable" className="sc-card theme-timetable" aria-label="日程中心">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">02 / WORKSPACE</span>
          <h3 className="sc-title">日程中心</h3>
          <p className="sc-desc">课程表与日历日程二合一，每周课程与每日安排一站管理。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-timetable">
        <div className="tt-subbar">
          <span className="tt-week-badge">第 04 周</span>
          <span className="tt-today-stat">
            <Clock size={11} /> 今日 2 节课 · 1 项日程
          </span>
        </div>

        <div className="tt-grid-box">
          <div className="tt-table">
            <div className="tt-row tt-header-row">
              <div className="tt-col-period">节次</div>
              <div className="tt-col-day">周一</div>
              <div className="tt-col-day">周二</div>
            </div>

            <div className="tt-row">
              <div className="tt-col-period">
                <b>1-2节</b>
                <span className="tt-time">08:20</span>
              </div>
              <div className="tt-col-day">
                <div className="tt-course-card c-math">
                  <span className="c-name">高等数学</span>
                  <span className="c-room"><MapPin size={9} /> 博学楼501</span>
                </div>
              </div>
              <div className="tt-col-day">
                <div className="tt-course-card c-empty">
                  <span className="c-free">自习时段</span>
                </div>
              </div>
            </div>

            <div className="tt-row">
              <div className="tt-col-period">
                <b>3-4节</b>
                <span className="tt-time">10:20</span>
              </div>
              <div className="tt-col-day">
                <div className="tt-course-card c-empty">
                  <span className="c-free">自主安排</span>
                </div>
              </div>
              <div className="tt-col-day">
                <div className="tt-course-card c-english">
                  <span className="c-name">大学英语</span>
                  <span className="c-room"><MapPin size={9} /> 外语楼204</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="tt-todo-strip">
          <span className="todo-dot"></span>
          <span className="todo-title">19:00 晚自习 · 高数作业提交</span>
          <span className="todo-tag">重要</span>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">SCHEDULE & PLANNER</span>
        <span className="sc-cta">
          打开日程 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardPelicanGallery() {
  return (
    <a href="#/pelican-gallery" className="sc-card theme-pelican" aria-label="AI 模型对比秀">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">03 / BENCHMARK SHOW</span>
          <h3 className="sc-title">AI 模型对比秀</h3>
          <p className="sc-desc">同一题交给 16 个 AI 模型分别生成，效果一页对比。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-pelican">
        <div className="pg-stage-top">
          <span className="pg-topic"><Sparkles size={11} /> 同题：鹈鹕骑自行车 SVG 动画</span>
          <span className="pg-count">16 模型实时</span>
        </div>

        <div className="pg-quad-grid">
          <div className="pg-quad-cell sky-green">
            <div className="pg-cell-tag">DeepSeek-V4 Pro</div>
            <div className="pg-bike-anim">
              <svg viewBox="0 0 80 50" className="pg-svg-pelican">
                <circle cx="22" cy="38" r="9" className="bike-wheel" />
                <circle cx="58" cy="38" r="9" className="bike-wheel" />
                <path d="M22 38 L38 38 L48 24 L34 24 Z" className="bike-frame" />
                <path d="M38 38 L44 18 L52 18" className="bike-frame" />
                <circle cx="42" cy="12" r="5" className="pelican-body" />
                <path d="M46 12 L56 14 L46 16 Z" className="pelican-beak" />
              </svg>
            </div>
            <div className="pg-cell-foot"><Heart size={9} fill="currentColor" /> 182</div>
          </div>

          <div className="pg-quad-cell sky-cyan">
            <div className="pg-cell-tag">GLM-5.3 Flash</div>
            <div className="pg-bike-anim">
              <svg viewBox="0 0 80 50" className="pg-svg-pelican">
                <circle cx="24" cy="36" r="8" className="bike-wheel wheel-fast" />
                <circle cx="56" cy="36" r="8" className="bike-wheel wheel-fast" />
                <path d="M24 36 L40 36 L48 22 L32 22 Z" className="bike-frame" />
                <circle cx="38" cy="11" r="5" className="pelican-body" />
                <path d="M42 11 L54 12 L42 15 Z" className="pelican-beak" />
              </svg>
            </div>
            <div className="pg-cell-foot"><Heart size={9} /> 124</div>
          </div>

          <div className="pg-quad-cell sky-blue">
            <div className="pg-cell-tag">Kimi-K3</div>
            <div className="pg-bike-anim">
              <svg viewBox="0 0 80 50" className="pg-svg-pelican">
                <circle cx="20" cy="38" r="9" className="bike-wheel" />
                <circle cx="58" cy="38" r="9" className="bike-wheel" />
                <path d="M20 38 L36 38 L48 26 L30 26 Z" className="bike-frame" />
                <circle cx="44" cy="14" r="6" className="pelican-body" />
                <path d="M49 14 L62 16 L49 18 Z" className="pelican-beak" />
              </svg>
            </div>
            <div className="pg-cell-foot"><Heart size={9} fill="currentColor" /> 98</div>
          </div>

          <div className="pg-quad-cell sky-yellow">
            <div className="pg-cell-tag">GPT 5.6 sol</div>
            <div className="pg-bike-anim">
              <svg viewBox="0 0 80 50" className="pg-svg-pelican">
                <circle cx="22" cy="38" r="9" className="bike-wheel" />
                <circle cx="56" cy="38" r="9" className="bike-wheel" />
                <path d="M22 38 L36 38 L46 22 L32 22 Z" className="bike-frame" />
                <circle cx="40" cy="12" r="5" className="pelican-body" />
                <path d="M44 12 L56 13 L44 15 Z" className="pelican-beak" />
              </svg>
            </div>
            <div className="pg-cell-foot"><Heart size={9} /> 165</div>
          </div>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">16 SVG ANIMATIONS</span>
        <span className="sc-cta">
          查看对比 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardPromptLibrary() {
  return (
    <a href="#/prompts" className="sc-card theme-prompts" aria-label="提示词库">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">04 / PROMPT HUB</span>
          <h3 className="sc-title">提示词库</h3>
          <p className="sc-desc">把常用指令、模板和使用场景放在一个随时可检索的位置。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-prompts">
        <div className="pr-top-bar">
          <span className="pr-cat-tag">#编程 · 审查</span>
          <span className="pr-var-badge">2 处可填空</span>
        </div>

        <div className="pr-snippet-card">
          <div className="pr-card-header">
            <span className="pr-card-title">高级代码审查员</span>
            <span className="pr-copy-pill">
              <Copy size={10} /> 复制
            </span>
          </div>

          <div className="pr-card-content">
            <p className="pr-line">
              你是一名精通 <span className="pr-var-slot">【技术栈: React】</span> 的资深架构师。
            </p>
            <p className="pr-line">请对以下代码进行深度审查，排查性能瓶颈：</p>
            <div className="pr-code-block">
              <code>
                const reviewTarget = <span className="pr-var-slot var-hl">【传入代码片段】</span>;<br />
                analyzePotentialMemoryLeak(reviewTarget);
              </code>
            </div>
          </div>
        </div>

        <div className="pr-meta-row">
          <span className="pr-search-hint">按 <kbd>/</kbd> 快速检索</span>
          <span className="pr-total">共收录 80+ 条精选指令</span>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">READY-TO-USE TEMPLATES</span>
        <span className="sc-cta">
          管理提示词 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardUIKit() {
  return (
    <a href="#/uikit" className="sc-card theme-uikit" aria-label="组件图鉴">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">05 / DESIGN SYSTEM</span>
          <h3 className="sc-title">组件图鉴</h3>
          <p className="sc-desc">网页与后台常见界面组件：名称、外观、场景与原理一页讲清。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-uikit">
        <div className="ui-stage-bar">
          <span className="ui-bar-title"><Sliders size={11} /> 活体交互组件架</span>
          <span className="ui-bar-badge">40 个循环动效</span>
        </div>

        <div className="ui-comp-shelf">
          <div className="ui-shelf-item">
            <div className="ui-item-head">
              <span className="ui-item-lbl">Temperature</span>
              <span className="ui-item-val num">0.70</span>
            </div>
            <div className="ui-slider-track">
              <div className="ui-slider-fill" style={{ width: '70%' }}></div>
              <div className="ui-slider-knob" style={{ left: '70%' }}></div>
            </div>
          </div>

          <div className="ui-shelf-row">
            <div className="ui-toggle-box">
              <span className="ui-toggle-lbl">深色模式</span>
              <div className="ui-micro-toggle on">
                <div className="ui-toggle-dot"></div>
              </div>
            </div>

            <div className="ui-micro-seg">
              <div className="seg-indicator"></div>
              <button type="button" className="seg-btn active">日</button>
              <button type="button" className="seg-btn">周</button>
              <button type="button" className="seg-btn">月</button>
            </div>
          </div>

          <div className="ui-key-card">
            <div className="ui-key-left">
              <KeyRound size={12} className="ui-key-ico" />
              <code className="ui-key-code">sk-voyra-••••7f2a</code>
            </div>
            <span className="ui-key-status">已验证</span>
          </div>
        </div>

        <div className="ui-stage-foot">
          <span>带使用场景 · 实现原理 · AI 提示词</span>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">40 INTERACTIVE COMPONENTS</span>
        <span className="sc-cta">
          查看图鉴 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardSkillHub() {
  return (
    <a href="#/skills" className="sc-card theme-skills" aria-label="Skill 热榜">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">06 / GITHUB HUB</span>
          <h3 className="sc-title">Skill 热榜</h3>
          <p className="sc-desc">GitHub 优质 Skill 与每周热点，星数排行每天自动刷新。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-skills">
        <div className="sk-stage-top">
          <span className="sk-live-tag">
            <span className="sk-dot"></span>每日自动刷新
          </span>
          <span className="sk-heat-lbl"><Flame size={11} /> WEEKLY HOT</span>
        </div>

        {/* 热榜按星数降序：anthropics/skills 44.2k 排在 52.0k 之后，
            仓库名用 SkillHub.jsx RANK_BASE 里的真实全名 */}
        <div className="sk-rank-list">
          <div className="sk-rank-row rank-first">
            <span className="sk-rank-no">01</span>
            <div className="sk-repo-info">
              <span className="sk-repo-name" title="x1xhlol/system-prompts-and-models-of-ai-tools">x1xhlol/system-prompts</span>
              <span className="sk-repo-sub">主流 AI 工具系统提示词大合集</span>
            </div>
            <div className="sk-stars-pill">
              <Star size={9} fill="currentColor" />
              <span>52.0k</span>
            </div>
          </div>

          <div className="sk-rank-row">
            <span className="sk-rank-no">02</span>
            <div className="sk-repo-info">
              <span className="sk-repo-name">anthropics/skills</span>
              <span className="sk-repo-sub">官方技能库 · docx/pptx/xlsx 规范</span>
            </div>
            <div className="sk-stars-pill">
              <Star size={9} fill="currentColor" />
              <span>44.2k</span>
            </div>
          </div>

          <div className="sk-rank-row">
            <span className="sk-rank-no">03</span>
            <div className="sk-repo-info">
              <span className="sk-repo-name">modelcontextprotocol/servers</span>
              <span className="sk-repo-sub">MCP 官方工具服务器参考实现</span>
            </div>
            <div className="sk-stars-pill">
              <Star size={9} fill="currentColor" />
              <span>41.0k</span>
            </div>
          </div>
        </div>

        <div className="sk-install-box">
          <Terminal size={11} className="sk-cli-ico" />
          <code className="sk-cli-code">npx skills add anthropics/skills</code>
          <span className="sk-cli-action">复制</span>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">RANKING & RADAR</span>
        <span className="sc-cta">
          查看热榜 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardAgentSkills() {
  return (
    <a href="#/agents" className="sc-card theme-agents" aria-label="AI Agent">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">07 / AUTONOMOUS WORKFLOW</span>
          <h3 className="sc-title">AI Agent</h3>
          <p className="sc-desc">汇集 Agent 与 Skill 的实用入口，快速进入合适的工作流。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-agents">
        <div className="ag-top-bar">
          <span className="ag-mode-tag">
            <Bot size={11} /> Multi-Agent DAG
          </span>
          <span className="ag-state-pill">运行中 · 2/4</span>
        </div>

        <div className="ag-dag-network">
          <div className="dag-node node-start">
            <div className="dnode-header">
              <GitFork size={10} />
              <span>Planner & Router</span>
            </div>
            <div className="dnode-status">任务拆解完成</div>
          </div>

          <div className="dag-fork-lines">
            <span className="fork-arm arm-left"></span>
            <span className="fork-arm arm-right"></span>
          </div>

          <div className="dag-parallel-row">
            <div className="dag-node node-exec">
              <div className="dnode-header">
                <Cpu size={10} className="txt-accent" />
                <span>Coder Agent</span>
              </div>
              <div className="dnode-sub">代码实现中...</div>
            </div>

            <div className="dag-node node-tool">
              <div className="dnode-header">
                <Bot size={10} className="txt-tool" />
                <span>Search MCP</span>
              </div>
              <div className="dnode-sub">资料检索完成</div>
            </div>
          </div>

          <div className="dag-merge-lines">
            <span className="merge-arm arm-left"></span>
            <span className="merge-arm arm-right"></span>
          </div>

          <div className="dag-node node-end">
            <div className="dnode-header">
              <ShieldCheck size={10} className="txt-check" />
              <span>Verifier & Gate</span>
            </div>
            <div className="dnode-status">待验收测试</div>
          </div>
        </div>

        <div className="ag-stage-foot">
          <span>角色编排 · 工具调用 · 产物落盘</span>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">PIPELINE & SUBAGENTS</span>
        <span className="sc-cta">
          查看资源 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardMindMap() {
  return (
    <a href="#/mindmap" className="sc-card theme-mindmap" aria-label="思维导图">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">08 / THOUGHT TREE</span>
          <h3 className="sc-title">思维导图</h3>
          <p className="sc-desc">将学习与创作中的线索展开为可继续补充的结构。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-mindmap">
        <div className="mm-stage-top">
          <span className="mm-tag"><Route size={11} /> 结构化发散树</span>
          <span className="mm-meta">16 节点 · 3 分支</span>
        </div>

        <div className="mm-canvas">
          <div className="mm-root-node">
            <GitCommit size={11} />
            <span>架构方案</span>
          </div>

          <svg className="mm-tree-svg" viewBox="0 0 80 120" preserveAspectRatio="none">
            <path d="M 0 60 C 40 60, 40 20, 80 20" className="tree-line" />
            <path d="M 0 60 C 40 60, 40 60, 80 60" className="tree-line active-line" />
            <path d="M 0 60 C 40 60, 40 100, 80 100" className="tree-line" />
          </svg>

          <div className="mm-branches">
            <div className="mm-branch-node b-orange">
              <span className="b-dot"></span>
              <span className="b-text">API 网关层</span>
              <span className="b-count">3</span>
            </div>

            <div className="mm-branch-node b-blue">
              <span className="b-dot"></span>
              <span className="b-text">数据与缓存</span>
              <span className="b-count">4</span>
            </div>

            <div className="mm-branch-node b-green">
              <span className="b-dot"></span>
              <span className="b-text">前端组件库</span>
              <span className="b-count">5</span>
            </div>
          </div>
        </div>

        <div className="mm-stage-foot">
          <span>无限缩放画布 · Markdown 互转 · 节点折叠</span>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">HIERARCHICAL STRUCTURING</span>
        <span className="sc-cta">
          打开导图 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardBabyCare() {
  return (
    <a href="#/baby-care" className="sc-card theme-care" aria-label="宝宝护理">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">09 / FAMILY CARE</span>
          <h3 className="sc-title">宝宝护理</h3>
          <p className="sc-desc">记录宝宝的作息、喂养和成长数据，让日常护理有迹可循。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-care">
        <div className="bc-summary-bar">
          <div className="bc-sum-item">
            <span className="bc-sum-lbl">今日奶量</span>
            <span className="bc-sum-val">540<small>ml</small></span>
          </div>
          <div className="bc-sum-item">
            <span className="bc-sum-lbl">总计睡眠</span>
            <span className="bc-sum-val">5.5<small>h</small></span>
          </div>
          <div className="bc-sum-item">
            <span className="bc-sum-lbl">换尿布</span>
            <span className="bc-sum-val">4<small>次</small></span>
          </div>
        </div>

        <div className="bc-timeline">
          <div className="bc-event-row">
            <div className="bc-time-col">08:30</div>
            <div className="bc-node-icon ico-feed">
              <Milk size={11} />
            </div>
            <div className="bc-event-card">
              <div className="bc-event-main">
                <b>亲喂母乳</b>
                <span className="bc-metric-pill">140 ml</span>
              </div>
              <span className="bc-event-sub">左侧 15m · 右侧 10m · 状态安稳</span>
            </div>
          </div>

          <div className="bc-event-row">
            <div className="bc-time-col">11:00</div>
            <div className="bc-node-icon ico-sleep">
              <Moon size={11} />
            </div>
            <div className="bc-event-card sleep-card">
              <div className="bc-event-main">
                <b>晨间小睡</b>
                <span className="bc-metric-pill sleep-pill">1h 45m</span>
              </div>
              <div className="bc-sleep-bar">
                <div className="bc-sleep-fill" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>

          <div className="bc-event-row">
            <div className="bc-time-col">14:15</div>
            <div className="bc-node-icon ico-temp">
              <Thermometer size={11} />
            </div>
            <div className="bc-event-card">
              <div className="bc-event-main">
                <b>体温测量</b>
                <span className="bc-metric-pill temp-pill">36.6 ℃ 正常</span>
              </div>
              <span className="bc-event-sub">额温枪复测 · 精神状态良好</span>
            </div>
          </div>
        </div>

        <div className="bc-stage-foot">
          <Heart size={10} className="bc-heart-ico" />
          <span>作息推算 · 喂养提醒 · 成长曲线追踪</span>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">DAILY LOG & HEALTH</span>
        <span className="sc-cta">
          进入护理 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardDrawPicker() {
  return (
    <a href="#/draw" className="sc-card theme-draw" aria-label="随机抽人">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">10 / LUCKY DRAW</span>
          <h3 className="sc-title">随机抽人</h3>
          <p className="sc-desc">课堂点名、活动抽奖随机抽取，支持花名册识别。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-draw">
        <div className="dp-roster-head">
          <span className="dp-roster-name">高三 (2) 班花名册</span>
          <span className="dp-count-pill">共 42 人 · 免重复</span>
        </div>

        <div className="dp-slot-window">
          <div className="dp-sparkles-layer">
            <Sparkles size={14} className="spk spk-1" />
            <Sparkles size={12} className="spk spk-2" />
          </div>

          <div className="dp-slot-list">
            <div className="dp-name-ghost">15 杜浩轩</div>
            <div className="dp-winner-card">
              <span className="dp-winner-no">NO. 08</span>
              <span className="dp-winner-name">王思涵</span>
              <span className="dp-winner-badge">
                <CheckCircle2 size={11} /> 选中
              </span>
            </div>
            <div className="dp-name-ghost">23 赵雨萌</div>
          </div>
        </div>

        <div className="dp-history-tray">
          <span className="dp-tray-lbl">近期抽出：</span>
          <div className="dp-chips-scroll">
            <span className="dp-chip">03 李明浩</span>
            <span className="dp-chip">19 陈奕安</span>
            <span className="dp-chip">31 张若曦</span>
          </div>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">RANDOM ROSTER SELECTOR</span>
        <span className="sc-cta">
          开始抽取 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardDietCheckin() {
  return (
    <a href="#/diet-checkin" className="sc-card theme-diet" aria-label="饮食打卡">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">11 / HEALTH & NUTRITION</span>
          <h3 className="sc-title">饮食打卡</h3>
          <p className="sc-desc">三餐执行、饮水与力量训练每日打卡，多端同步。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-diet">
        <div className="dc-badge-bar">
          <span className="dc-streak-tag">
            <Flame size={12} className="ico-flame" /> 连续打卡 14 天
          </span>
          <span className="dc-daily-ratio">今日已达标 2/3 餐</span>
        </div>

        <div className="dc-meals-box">
          <div className="dc-meal-row done">
            <div className="dc-meal-info">
              <span className="dc-meal-name">早餐 · 08:00</span>
              <span className="dc-meal-desc">燕麦无糖酸奶 + 水煮溏心蛋</span>
            </div>
            <div className="dc-status-icon">
              <Check size={11} strokeWidth={2.6} />
            </div>
          </div>

          <div className="dc-meal-row done">
            <div className="dc-meal-info">
              <span className="dc-meal-name">午餐 · 12:30</span>
              <span className="dc-meal-desc">香煎低脂鸡胸 + 杂粮糙米饭</span>
            </div>
            <div className="dc-status-icon">
              <Check size={11} strokeWidth={2.6} />
            </div>
          </div>

          <div className="dc-meal-row pending">
            <div className="dc-meal-info">
              <span className="dc-meal-name">晚餐 · 待记录</span>
              <span className="dc-meal-desc">高纤羽衣甘蓝牛油果轻沙拉</span>
            </div>
            <div className="dc-status-icon wait-icon">
              <span>待打卡</span>
            </div>
          </div>
        </div>

        <div className="dc-subtrack-row">
          <div className="dc-water-pill">
            <Droplets size={11} className="ico-water" />
            <span>1,750 / 2,000 ml</span>
          </div>
          <div className="dc-train-pill">
            <Dumbbell size={11} className="ico-train" />
            <span>力量训练 45m</span>
          </div>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">HABIT & DIET TRACKER</span>
        <span className="sc-cta">
          今日打卡 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

/* ==========================================================================
   SKILL 01: 数学建模核心 Skill 卡片
   ========================================================================== */

export function CardMathmodelSkill() {
  const steps = ['题意', '假设', '变量', '建模', '求解', '检验', '评价', '图表', '论文', '提交'];

  return (
    <a
      href="https://github.com/liixnglinb/Mathmodel-skill"
      target="_blank"
      rel="noreferrer"
      className="sc-card theme-mathmodel"
      aria-label="数学建模 Skill"
    >
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">SKILL / CUMCM WORKFLOW</span>
          <h3 className="sc-title">数学建模 Skill</h3>
          <p className="sc-desc">国赛（CUMCM）数学建模十阶段工作流，结构化工程推进。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-mathmodel">
        <div className="mm-head-tag">
          <span className="mm-tag-title"><Code2 size={11} /> CUMCM 规范工作流</span>
          <span className="mm-tag-status">求解阶段 (5/10)</span>
        </div>

        <div className="mm-steps-matrix">
          <div className="mm-steps-row">
            {steps.slice(0, 5).map((s, idx) => (
              <div key={s} className={`mm-step-node ${idx < 4 ? 'done' : 'active'}`}>
                <span className="mm-step-num">0{idx + 1}</span>
                <span className="mm-step-name">{s}</span>
                {idx < 4 && <Check size={8} className="mm-check" />}
              </div>
            ))}
          </div>

          <div className="mm-steps-row">
            {steps.slice(5, 10).map((s, idx) => (
              <div key={s} className="mm-step-node pending">
                <span className="mm-step-num">{idx + 6 < 10 ? `0${idx + 6}` : '10'}</span>
                <span className="mm-step-name">{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mm-academic-box">
          <div className="mm-formula-line">
            <code>min ∑ (y_i - f(x_i, θ))² + λ||θ||₂</code>
          </div>
          <div className="mm-stat-line">
            <span className="mm-metric"><LineChart size={10} /> 残差收敛 R² = 0.992</span>
            <span className="mm-epoch">迭代 240 / 300 轮</span>
          </div>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">10-STAGE CUMCM PIPELINE</span>
        <span className="sc-cta">
          打开 Skill 仓库 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

/* ==========================================================================
   APPS 01 ~ 07: 独立应用区橱窗卡片
   ========================================================================== */

export function CardModelflow() {
  return (
    <a href="/modelflow/" className="sc-card theme-modelflow" aria-label="织流 Jacquard">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">APP 01 / LOCAL AGENT PIPELINE</span>
          <h3 className="sc-title">织流 Jacquard</h3>
          <p className="sc-desc">本地智能体流水线工作台：流程可编辑，交给本机 CLI 逐步执行，产物实时落盘。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-modelflow">
        <div className="mf-bar">
          <span className="mf-badge">STAGE 02 · 逐项执行</span>
          <span className="mf-progress-tag">运行中 3/7 步</span>
        </div>

        <div className="mf-console-body">
          <div className="mf-log-line">
            <span className="mf-time">12:04</span>
            <span className="mf-tag tag-ok">DONE</span>
            <span className="mf-text">方案拆解 · PLAN.md 已就绪</span>
          </div>
          <div className="mf-log-line">
            <span className="mf-time">12:11</span>
            <span className="mf-tag tag-tool">TOOL</span>
            <span className="mf-text">Write Q1_solve.py (Python)</span>
          </div>
          <div className="mf-log-line active-line">
            <span className="mf-time">12:18</span>
            <span className="mf-tag tag-run">RUN</span>
            <span className="mf-text">求解收敛中，残差 1.2e-4</span>
            <span className="mf-cursor"></span>
          </div>
        </div>

        <div className="mf-disk-box">
          <div className="mf-disk-head">
            <HardDrive size={10} />
            <span>本机磁盘落盘 · data/workspaces</span>
          </div>
          <div className="mf-file-row">
            <span className="mf-file-name"><FileCode size={10} /> EXECUTION.md</span>
            <span className="mf-file-state">刚写入</span>
            <span className="mf-file-meta">24 KB · 本地</span>
          </div>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">WINDOWS 10/11 · ZERO TELEMETRY</span>
        <span className="sc-cta">
          下载软件 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardCheckin() {
  return (
    <a href="/checkin/" className="sc-card theme-checkin" aria-label="学习通自动签到助手">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">APP 02 / ATTENDANCE AUTOMATION</span>
          <h3 className="sc-title">学习通自动签到助手</h3>
          <p className="sc-desc">桌面端常驻后台，自动监听课程签到活动，支持普通、位置、二维码三种签到。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-checkin">
        <div className="ck-top-bar">
          <span className="ck-guard-tag">
            <span className="ck-live-dot"></span>后台常驻监听中
          </span>
          <span className="ck-safe-badge">
            <ShieldCheck size={10} /> 防风控已开启
          </span>
        </div>

        <div className="ck-course-list">
          <div className="ck-course-item active-listening">
            <div className="ck-item-main">
              <span className="ck-course-title">自动控制原理</span>
              <span className="ck-course-sub">周一 1-2 节 · 轮询间隔 45s</span>
            </div>
            <span className="ck-status-pill">监听中</span>
          </div>

          <div className="ck-course-item">
            <div className="ck-item-main">
              <span className="ck-course-title">电力电子技术</span>
              <span className="ck-course-sub">致远楼 312 · 自动取座标</span>
            </div>
            <span className="ck-status-pill pill-pos">位置待命</span>
          </div>
        </div>

        <div className="ck-toast-alert">
          <Bell size={12} className="ck-bell-ico" />
          <div className="ck-toast-copy">
            <b>发现签到活动：自动控制原理</b>
            <span>模拟人类延迟 · 倒计时 08s 提交</span>
          </div>
          <span className="ck-auto-btn">取消</span>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">DESKTOP BACKGROUND DAEMON</span>
        <span className="sc-cta">
          下载软件 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardLocalToolbox() {
  return (
    <a href="/local-toolbox/" className="sc-card theme-toolbox" aria-label="磁盘清理助手">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">APP 03 / DISK CLEANUP</span>
          <h3 className="sc-title">磁盘清理助手</h3>
          <p className="sc-desc">Windows 磁盘清理工作台：扫描、分类与目录分析一站完成，路径预览后再确认清理。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-toolbox">
        <div className="tb-drive-head">
          <div className="tb-drive-meta">
            <span className="tb-drive-name"><HardDrive size={11} /> 本地磁盘 (C:)</span>
            <span className="tb-drive-space num">118 GB / 256 GB</span>
          </div>
          <div className="tb-capacity-track">
            <div className="tb-capacity-fill" style={{ width: '46%' }}></div>
          </div>
        </div>

        <div className="tb-items-list">
          <div className="tb-item-row checked">
            <div className="tb-check-box checked">
              <Check size={9} strokeWidth={3} />
            </div>
            <div className="tb-item-info">
              <span className="tb-item-title">聊天软件缓存 (微信 / QQ)</span>
              <span className="tb-item-desc">AppLocal 临时文件 · 建议定期清理</span>
            </div>
            <span className="tb-item-size num">14.2 GB</span>
          </div>

          <div className="tb-item-row checked">
            <div className="tb-check-box checked">
              <Check size={9} strokeWidth={3} />
            </div>
            <div className="tb-item-info">
              <span className="tb-item-title">显卡着色器与系统临时</span>
              <span className="tb-item-desc">DirectX Shader Cache / Temp</span>
            </div>
            <span className="tb-item-size num">3.8 GB</span>
          </div>
        </div>

        <div className="tb-footer-box">
          <span className="tb-wiki-tag"><Sparkles size={10} /> 75条目录百科支持</span>
          <span className="tb-safe-note">
            <ShieldCheck size={10} /> 默认移入回收站
          </span>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">WINDOWS 10/11 · RECYCLE BIN FIRST</span>
        <span className="sc-cta">
          下载软件 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardBillTrace() {
  return (
    <a href="/billtrace/" className="sc-card theme-billtrace" aria-label="账迹 BillTrace">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">APP 04 / AUTO EXPENSE TRACKER</span>
          <h3 className="sc-title">账迹 BillTrace</h3>
          <p className="sc-desc">Android 自动记账：付款后 2 秒自动入库、智能分类，数据本地加密，全程零打扰。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-billtrace">
        <div className="bt-status-bar">
          <span className="bt-engine-pill">
            <Zap size={10} /> 2 秒自动入库
          </span>
          <span className="bt-source-tag">通知 + 短信双引擎</span>
        </div>

        <div className="bt-notif-banner">
          <span className="bt-notif-dot">支</span>
          <div className="bt-notif-info">
            <b>支付宝 · 支付成功</b>
            <span>美团外卖 -¥35.80 (餐饮分类)</span>
          </div>
          <span className="bt-auto-tag">已捕获</span>
        </div>

        <div className="bt-ledger-box">
          <div className="bt-ledger-row new-entry">
            <div className="bt-ledger-icon cat-food">餐</div>
            <div className="bt-ledger-info">
              <span className="bt-ledger-title">美团外卖</span>
              <span className="bt-ledger-time">刚刚 · 智能归类</span>
            </div>
            <span className="bt-ledger-amt exp">-¥35.80</span>
          </div>

          <div className="bt-ledger-row">
            <div className="bt-ledger-icon cat-trans">行</div>
            <div className="bt-ledger-info">
              <span className="bt-ledger-title">地铁出行</span>
              <span className="bt-ledger-time">09:15 · 微信支付</span>
            </div>
            <span className="bt-ledger-amt exp">-¥4.00</span>
          </div>
        </div>

        <div className="bt-stat-strip">
          <span className="bt-stat-lbl">近 7 天消费 · ¥806.20</span>
          <div className="bt-mini-bars">
            <i style={{ height: '40%' }}></i>
            <i style={{ height: '65%' }}></i>
            <i style={{ height: '30%' }}></i>
            <i style={{ height: '85%' }}></i>
            <i style={{ height: '50%' }}></i>
            <i style={{ height: '95%' }} className="bar-top"></i>
            <i style={{ height: '45%' }}></i>
          </div>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">ANDROID · LOCAL ENCRYPTION</span>
        <span className="sc-cta">
          下载 APK <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardTokenMonitor() {
  return (
    <a href="/token-monitor/" className="sc-card theme-token" aria-label="Token Monitor">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">APP 05 / USAGE OBSERVATORY</span>
          <h3 className="sc-title">Token Monitor</h3>
          <p className="sc-desc">本机 AI 编程工具用量看板：Token、请求与缓存明细一目了然，套餐与未定价明确区分。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-token">
        <div className="tm-summary-card">
          <div className="tm-metric-col">
            <span className="tm-label">TOKENS 总计</span>
            <span className="tm-big-val num">6.39 B</span>
          </div>
          <div className="tm-cost-col">
            <span className="tm-label">折算金额</span>
            <span className="tm-cost-val num">¥13,392</span>
          </div>
        </div>

        <div className="tm-breakdown-list">
          <div className="tm-source-row">
            <span className="tm-source-name">Codex</span>
            <div className="tm-progress-track">
              <div className="tm-progress-fill" style={{ width: '87%' }}></div>
            </div>
            <span className="tm-source-tokens num">1.41 B</span>
            <span className="tm-source-fee num">¥3,001</span>
          </div>

          <div className="tm-source-row">
            <span className="tm-source-name">Claude Code</span>
            <div className="tm-progress-track">
              <div className="tm-progress-fill fill-claude" style={{ width: '43%' }}></div>
            </div>
            <span className="tm-source-tokens num">696.9 M</span>
            <span className="tm-source-fee num">¥4,703</span>
          </div>

          <div className="tm-source-row">
            <span className="tm-source-name">Box Agent</span>
            <div className="tm-progress-track">
              <div className="tm-progress-fill fill-sub" style={{ width: '100%' }}></div>
            </div>
            <span className="tm-source-tokens num">1.62 B</span>
            <span className="tm-plan-tag">套餐内</span>
          </div>
        </div>

        <div className="tm-pills-row">
          <div className="tm-metric-pill">
            <Activity size={10} className="ico-req" />
            <span>18,479 次请求</span>
          </div>
          <div className="tm-metric-pill">
            <Layers size={10} className="ico-cache" />
            <span>缓存率 68.7%</span>
          </div>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">WINDOWS · 12 DATA SOURCES</span>
        <span className="sc-cta">
          下载软件 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardZenew() {
  return (
    <a href="/zenew/" className="sc-card theme-zenew" aria-label="知新 Zenew">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">APP 06 / FSRS SCHEDULING</span>
          <h3 className="sc-title">知新 Zenew</h3>
          <p className="sc-desc">把大学课程变成记得住的练习：词书 + AI 知识卡片，四选一学习与 FSRS 复习调度。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-zenew">
        <div className="zw-header-bar">
          <span className="zw-book-tag">英语四级 · 第 08 组</span>
          <span className="zw-fsrs-badge">
            <BrainCircuit size={10} /> FSRS 调度
          </span>
        </div>

        <div className="zw-quiz-card">
          <div className="zw-word-line">
            <b>legal</b>
            <span className="zw-phonetic">/ˈliːɡl/</span>
          </div>
          <div className="zw-example-sentence">
            In some areas, it is <b>legal</b> to carry a gun.
          </div>

          <div className="zw-options-grid">
            <div className="zw-opt">A. 非法的</div>
            <div className="zw-opt opt-correct">
              <span>B. 法定的</span>
              <Check size={10} className="zw-check-ico" />
            </div>
            <div className="zw-opt">C. 遗产的</div>
            <div className="zw-opt">D. 豪华的</div>
          </div>
        </div>

        <div className="zw-analysis-box">
          <span className="zw-morph-lbl">AI 词根词缀</span>
          <span className="zw-morph-val">leg (法律) + al (形容词)</span>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">WINDOWS 10/11 · FSRS SPACED REPETITION</span>
        <span className="sc-cta">
          下载软件 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}

export function CardAIChronicle() {
  return (
    <a href="/ai-chronicle/" className="sc-card theme-chronicle" aria-label="AI 轨迹">
      <header className="sc-card-head">
        <div className="sc-head-left">
          <span className="sc-no">APP 07 / AI OBSERVATORY</span>
          <h3 className="sc-title">AI 轨迹</h3>
          <p className="sc-desc">本机优先的 AI 工作观测台：自动解析 12 个数据源，整理成每日日报、历史档案与趋势看板。</p>
        </div>
      </header>

      <div className="sc-stage sc-stage-chronicle">
        <div className="ac-kpi-grid">
          <div className="ac-kpi-cell">
            <span className="ac-kpi-lbl">有效会话</span>
            <b className="ac-kpi-val num">20</b>
          </div>
          <div className="ac-kpi-cell">
            <span className="ac-kpi-lbl">任务进度</span>
            <b className="ac-kpi-val num">3 / 7</b>
          </div>
          <div className="ac-kpi-cell">
            <span className="ac-kpi-lbl">生成成果</span>
            <b className="ac-kpi-val num">8 份</b>
          </div>
          <div className="ac-kpi-cell">
            <span className="ac-kpi-lbl">聚焦时长</span>
            <b className="ac-kpi-val num">7h 14m</b>
          </div>
        </div>

        <div className="ac-tasks-box">
          <div className="ac-task-row">
            <span className="ac-task-idx">01</span>
            <div className="ac-task-info">
              <span className="ac-task-title">重构下载页架构</span>
              <span className="ac-task-src">Codex · 14:02 落盘</span>
            </div>
            <span className="ac-status-done">已完成</span>
          </div>

          <div className="ac-task-row">
            <span className="ac-task-idx">02</span>
            <div className="ac-task-info">
              <span className="ac-task-title">盘点本地数据源与日志</span>
              <span className="ac-task-src">Claude Code · 11:36 会话</span>
            </div>
            <span className="ac-status-run">进行中</span>
          </div>
        </div>

        <div className="ac-sources-bar">
          <span className="ac-src-dot d-codex">Codex</span>
          <span className="ac-src-dot d-claude">Claude Code</span>
          <span className="ac-src-dot d-wb">WorkBuddy</span>
          <span className="ac-src-more">+9 个源</span>
        </div>
      </div>

      <footer className="sc-card-foot">
        <span className="sc-foot-tag">WINDOWS 10/11 · 12 LOCAL SOURCES</span>
        <span className="sc-cta">
          下载软件 <ArrowUpRight size={14} />
        </span>
      </footer>
    </a>
  );
}
