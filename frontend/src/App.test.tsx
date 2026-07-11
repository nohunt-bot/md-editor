import { render, waitFor } from '@testing-library/react'
import App from './App'
import type { Identity } from './app/useIdentity'

// Bugfix sweep (docs/tasks/20260711-bugfix-sweep.md):
// 1. VIEWER (non-admin, non-EDITOR on the active team) must not see a live
//    新增 Skill entry point — EDITOR/admin do.
// 3. The portal (/) must not render the topbar GlobalSearch (the hero owns
//    search there); other routes (e.g. /team) keep it.
//
// Page-header relocation (docs/tasks/20260711-newskill-into-page-header.md):
// the 新增 Skill create entry moved out of the topbar into the /team page
// header (see SkillsPage.test.tsx for the role-branch gating assertions).
// This file now only asserts the topbar itself never renders it.

let mockIdentity: Identity

vi.mock('./app/useIdentity', async () => {
  const actual = await vi.importActual<typeof import('./app/useIdentity')>('./app/useIdentity')
  return { ...actual, useIdentity: () => mockIdentity }
})

vi.mock('./api/api', async () => {
  const actual = await vi.importActual<typeof import('./api/api')>('./api/api')
  return {
    ...actual,
    getPreferences: () => Promise.resolve({ data: {} }),
    search: () => Promise.resolve({ data: { team: [], open: [] } }),
    favoritesApi: { ...actual.favoritesApi, list: () => Promise.resolve({ data: [] }) },
    folderApi: { ...actual.folderApi, getTree: () => Promise.resolve({ data: [] }) },
    tagApi: { ...actual.tagApi, list: () => Promise.resolve({ data: [] }) },
  }
})

function identity(over: Partial<Identity>): Identity {
  return {
    loading: false,
    offline: true,
    userId: 'u1',
    displayName: 'Test User',
    admin: false,
    teams: [],
    activeTeam: null,
    activeTeamId: null,
    setActiveTeam: () => {},
    ...over,
  } as Identity
}

function renderAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

describe('AppShell — 新增 Skill button never renders in the topbar', () => {
  it.each(['/open', '/favorites', '/', '/settings', '/skills/abc', '/team'])(
    'does not render the 新增 Skill button in the topbar on %s',
    async (path) => {
      mockIdentity = identity({
        activeTeamId: 'team-1',
        activeTeam: { id: 'team-1', displayName: 'Team A', role: 'EDITOR' } as any,
        teams: [{ id: 'team-1', displayName: 'Team A', role: 'EDITOR' } as any],
      })
      renderAt(path)

      await waitFor(() => {
        expect(document.querySelector('.app-topbar')).not.toBeNull()
        expect(
          document.querySelector('.app-topbar')?.textContent,
        ).not.toContain('＋ 新增 Skill')
      })
    }
  )
})

describe('AppShell — single search box on the portal', () => {
  it('does not render the topbar GlobalSearch on /', async () => {
    mockIdentity = identity({})
    renderAt('/')

    await waitFor(() => {
      expect(document.querySelectorAll('.global-search').length).toBe(1)
    })
  })

  it('keeps the topbar GlobalSearch on /team', async () => {
    mockIdentity = identity({})
    renderAt('/team')

    await waitFor(() => {
      expect(document.querySelectorAll('.global-search').length).toBe(1)
      expect(document.querySelector('.app-topbar .global-search')).not.toBeNull()
    })
  })
})
