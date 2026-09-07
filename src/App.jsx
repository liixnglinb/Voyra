import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import AuthGate from './components/AuthGate'
import RouteLoader from './components/RouteLoader'
import Dashboard from './pages/Dashboard'
import ArticleDetail from './pages/ArticleDetail'

const PromptLibrary = lazy(() => import('./pages/PromptLibrary'))
const LearningHub = lazy(() => import('./pages/LearningHub'))
const MindMap = lazy(() => import('./pages/MindMap'))
const BabyCare = lazy(() => import('./pages/BabyCare'))
const ScheduleHub = lazy(() => import('./pages/ScheduleHub'))
const SkillHub = lazy(() => import('./pages/SkillHub'))
const UIKit = lazy(() => import('./pages/UIKit'))
const AgentSkills = lazy(() => import('./pages/AgentSkills'))
const PelicanGallery = lazy(() => import('./pages/PelicanGallery'))


function App() {
  /* 首页空闲时预载提示词库分包，消除进入 /prompts 时的加载白屏 */
  useEffect(() => {
    const warm = () => { import('./pages/PromptLibrary'); };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warm, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(warm, 1500);
    return () => clearTimeout(timer);
  }, [])

  return (
    <ErrorBoundary>
      <Layout>
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="text-[var(--text-3)] text-lg">加载中...</div>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/articles/:slug" element={<ArticleDetail />} />
                {/* 工具页各自挂路由级加载动效：分包加载期间展示与站点风格匹配的等待动画 */}
                <Route path="/mindmap" element={<AuthGate variant="dark"><Suspense fallback={<RouteLoader variant="mindmap" />}><MindMap /></Suspense></AuthGate>} />
                <Route path="/prompts" element={<Suspense fallback={<RouteLoader variant="prompts" />}><PromptLibrary /></Suspense>} />
                <Route path="/learning" element={<LearningHub />} />
                <Route path="/baby-care" element={<AuthGate><Suspense fallback={<RouteLoader variant="baby" />}><BabyCare /></Suspense></AuthGate>} />
                <Route path="/timetable" element={<AuthGate><Suspense fallback={<RouteLoader variant="timetable" />}><ScheduleHub /></Suspense></AuthGate>} />
                <Route path="/schedule" element={<Navigate to="/timetable?tab=courses" replace />} />
                <Route path="/planner" element={<Navigate to="/timetable?tab=planner" replace />} />
                <Route path="/agents" element={<Suspense fallback={<RouteLoader variant="agents" />}><AgentSkills /></Suspense>} />
                <Route path="/skills" element={<Suspense fallback={<RouteLoader variant="skills" />}><SkillHub /></Suspense>} />
                <Route path="/uikit" element={<Suspense fallback={<RouteLoader variant="uikit" />}><UIKit /></Suspense>} />
                <Route path="/pelican-gallery" element={<Suspense fallback={<RouteLoader variant="pelican" />}><PelicanGallery /></Suspense>} />

                {/* 未知路径重定向回首页，避免空白页 */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
      </Layout>
    </ErrorBoundary>
  )
}

export default App
