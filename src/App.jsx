import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import ArticleDetail from './pages/ArticleDetail'

const PromptLibrary = lazy(() => import('./pages/PromptLibrary'))
const LearningHub = lazy(() => import('./pages/LearningHub'))
const MindMap = lazy(() => import('./pages/MindMap'))
const BabyCare = lazy(() => import('./pages/BabyCare'))
const Blog = lazy(() => import('./pages/Blog'))
const ScheduleHub = lazy(() => import('./pages/ScheduleHub'))
const SkillHub = lazy(() => import('./pages/SkillHub'))
const UIKit = lazy(() => import('./pages/UIKit'))
const AgentSkills = lazy(() => import('./pages/AgentSkills'))


function App() {
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
                <Route path="/profile" element={<Profile />} />
                <Route path="/mindmap" element={<MindMap />} />
                <Route path="/prompts" element={<PromptLibrary />} />
                <Route path="/learning" element={<LearningHub />} />
                <Route path="/baby-care" element={<BabyCare />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/timetable" element={<ScheduleHub />} />
                <Route path="/schedule" element={<Navigate to="/timetable?tab=courses" replace />} />
                <Route path="/planner" element={<Navigate to="/timetable?tab=planner" replace />} />
                <Route path="/agents" element={<AgentSkills />} />
                <Route path="/skills" element={<SkillHub />} />
                <Route path="/uikit" element={<UIKit />} />

                {/* 未知路径重定向回首页，避免空白页 */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
      </Layout>
    </ErrorBoundary>
  )
}

export default App
