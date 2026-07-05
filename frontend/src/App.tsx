import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { SkillsPage } from './pages/SkillsPage'
import { OpenSpacePage } from './pages/OpenSpacePage'
import { SkillEditor } from './components/editor/SkillEditor'
import { SkillDetailPage } from './pages/SkillDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { Sidebar } from './app/Sidebar'
import { GlobalSearch } from './app/GlobalSearch'
import { TeamFilterProvider } from './app/TeamFilterContext'
import { useIdentity } from './app/useIdentity'
import { useTranslation } from 'react-i18next'
import './App.css'

function App() {
  // Identity loads once for the whole shell. Even if /api/me fails (no
  // backend), useIdentity falls back to an empty identity so both zones render.
  const identity = useIdentity()
  const { t } = useTranslation()

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
                  {t('common:newSkill')}
                </Link>
              ) : (
                // Phase 5.1 no-team guard: creating needs an owning team.
                <button
                  className="btn-primary"
                  disabled
                  title={t('common:selectTeamFirst')}
                >
                  {t('common:newSkill')}
                </button>
              )}
            </header>
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Navigate to="/team" replace />} />
                <Route path="/team" element={<SkillsPage identity={identity} />} />
                <Route path="/open" element={<OpenSpacePage />} />
                <Route path="/settings" element={<SettingsPage />} />
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
