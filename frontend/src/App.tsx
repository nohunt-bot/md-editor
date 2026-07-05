import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { SkillsPage } from './pages/SkillsPage'
import { OpenSpacePage } from './pages/OpenSpacePage'
import { SkillEditor } from './components/editor/SkillEditor'
import { SkillDetailPage } from './pages/SkillDetailPage'
import { Sidebar } from './app/Sidebar'
import { GlobalSearch } from './app/GlobalSearch'
import { TeamFilterProvider } from './app/TeamFilterContext'
import { useIdentity } from './app/useIdentity'
import './App.css'

function App() {
  // Identity loads once for the whole shell. Even if /api/me fails (no
  // backend), useIdentity falls back to an empty identity so both zones render.
  const identity = useIdentity()

  return (
    <BrowserRouter>
      <TeamFilterProvider>
        <div className="app-shell">
          <Sidebar identity={identity} />
          <div className="app-body">
            <header className="app-topbar">
              <GlobalSearch />
              {identity.activeTeamId ? (
                <Link to="/skills/new" className="btn-primary">
                  ＋ 新增 Skill
                </Link>
              ) : (
                // Phase 5.1 no-team guard: creating needs an owning team.
                <button
                  className="btn-primary"
                  disabled
                  title="請先在左側選擇團隊"
                >
                  ＋ 新增 Skill
                </button>
              )}
            </header>
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Navigate to="/team" replace />} />
                <Route path="/team" element={<SkillsPage identity={identity} />} />
                <Route path="/open" element={<OpenSpacePage />} />
                <Route path="/skills/new" element={<SkillEditor />} />
                <Route path="/skills/:id" element={<SkillDetailPage />} />
                <Route path="/skills/:id/edit" element={<SkillEditor />} />
                {/* Legacy alias */}
                <Route path="/skills" element={<Navigate to="/team" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </TeamFilterProvider>
    </BrowserRouter>
  )
}

export default App
