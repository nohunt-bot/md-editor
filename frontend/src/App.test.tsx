import { render, screen, waitFor } from '@testing-library/react'
import App from './App'
import type { Identity } from './app/useIdentity'

// Bugfix sweep (docs/tasks/20260711-bugfix-sweep.md):
// 1. VIEWER (non-admin, non-EDITOR on the active team) must not see a live
//    新增 Skill entry point — EDITOR/admin do.
// 3. The portal (/) must not render the topbar GlobalSearch (the hero owns
//    search there); other routes (e.g. /team) keep it.

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

describe('AppShell — create-entry gating (VIEWER vs EDITOR)', () => {
  it('renders a disabled 新增 Skill button with an explanatory title for a VIEWER', async () => {
    mockIdentity = identity({
      activeTeamId: 'team-1',
      activeTeam: { id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any,
      teams: [{ id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any],
    })
    renderAt('/team')

    await waitFor(() => {
      const btn = screen.getByText('＋ 新增 Skill').closest('button')
      expect(btn).toBeDisabled()
      expect(btn).toHaveAttribute('title', '需要團隊編輯權限')
    })
  })

  it('renders an active 新增 Skill link for an EDITOR', async () => {
    mockIdentity = identity({
      activeTeamId: 'team-1',
      activeTeam: { id: 'team-1', displayName: 'Team A', role: 'EDITOR' } as any,
      teams: [{ id: 'team-1', displayName: 'Team A', role: 'EDITOR' } as any],
    })
    renderAt('/team')

    await waitFor(() => {
      const link = screen.getByText('＋ 新增 Skill').closest('a')
      expect(link).not.toBeNull()
      expect(link).toHaveAttribute('href', '/skills/new')
    })
  })

  it('renders an active 新增 Skill link for an admin even without an EDITOR role', async () => {
    mockIdentity = identity({
      admin: true,
      activeTeamId: 'team-1',
      activeTeam: { id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any,
      teams: [{ id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any],
    })
    renderAt('/team')

    await waitFor(() => {
      const link = screen.getByText('＋ 新增 Skill').closest('a')
      expect(link).not.toBeNull()
    })
  })
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
