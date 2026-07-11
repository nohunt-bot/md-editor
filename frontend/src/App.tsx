import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { SkillsPage } from './pages/SkillsPage'
import { OpenSpacePage } from './pages/OpenSpacePage'
import { SkillEditor } from './components/editor/SkillEditor'
import { SkillDetailPage } from './pages/SkillDetailPage'
import { SettingsPage } from './pages/SettingsPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { Sidebar } from './app/Sidebar'
import { SpaceTabs } from './app/SpaceTabs'
import { UserMenu } from './app/UserMenu'
import { GlobalSearch } from './app/GlobalSearch'
import { TeamFilterProvider } from './app/TeamFilterContext'
import { useEffect } from 'react'
import { useIdentity } from './app/useIdentity'
import { setThemeMode, type ThemeMode } from './app/useTheme'
import { getPreferences } from './api/api'
import { setLanguage, type LanguageCode } from './i18n'
import { useTranslation } from 'react-i18next'
import './App.css'

function App() {
  // Identity loads once for the whole shell. Even if /api/me fails (no
  // backend), useIdentity falls back to an empty identity so both zones render.
  const identity = useIdentity()
  const { t } = useTranslation()

  // Preferences follow the user: localStorage is applied instantly on boot
  // (no FOUC); once identity is known, the server's saved theme/language
  // override it. Silent-degrade if offline. Applying here does NOT re-save.
  useEffect(() => {
    if (identity.loading || identity.offline) return
    getPreferences()
      .then((res) => {
        const { theme, language } = res.data
        if (theme) setThemeMode(theme as ThemeMode)
        if (language) setLanguage(language as LanguageCode)
      })
      .catch(() => {})
  }, [identity.loading, identity.offline, identity.userId])

  return (
    <BrowserRouter>
      <TeamFilterProvider>
        <AppShell identity={identity} t={t} />
      </TeamFilterProvider>
    </BrowserRouter>
  )
}

// GUI redesign step 1/3 (docs/tasks/20260711-gui-space-tabs.md): the sidebar
// is now a contextual panel that only appears in the team space (/team).
// Needs useLocation, so it must render inside <BrowserRouter>.
function AppShell({
  identity,
  t,
}: {
  identity: ReturnType<typeof useIdentity>
  t: ReturnType<typeof useTranslation>['t']
}) {
  const location = useLocation()
  const showSidebar = location.pathname === '/team'

  return (
    <div className="app-shell">
      {showSidebar && <Sidebar identity={identity} />}
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
          <UserMenu identity={identity} />
        </header>
        <SpaceTabs />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/team" replace />} />
            <Route path="/team" element={<SkillsPage identity={identity} />} />
            <Route path="/open" element={<OpenSpacePage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
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
  )
}

export default App
