import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TeamFilterProvider } from './TeamFilterContext'
import type { Identity } from './useIdentity'

// Bugfix sweep (docs/tasks/20260711-bugfix-sweep.md), bug 1: the sidebar's
// ＋新增資料夾 button must gate on can-edit the active team the same way the
// topbar 新增 Skill button does.

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    folderApi: { ...actual.folderApi, getTree: () => Promise.resolve({ data: [] }) },
    tagApi: { ...actual.tagApi, list: () => Promise.resolve({ data: [] }) },
  }
})

function identity(over: Partial<Identity>): Identity {
  return {
    loading: false,
    offline: false,
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

function renderSidebar(id: Identity) {
  return render(
    <MemoryRouter>
      <TeamFilterProvider>
        <Sidebar identity={id} />
      </TeamFilterProvider>
    </MemoryRouter>,
  )
}

describe('Sidebar — ＋新增資料夾 gating (VIEWER vs EDITOR)', () => {
  it('renders a disabled button with an explanatory title for a VIEWER', async () => {
    renderSidebar(
      identity({
        activeTeamId: 'team-1',
        activeTeam: { id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any,
        teams: [{ id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any],
      }),
    )

    await waitFor(() => {
      const btn = screen.getByText('+ 新增資料夾')
      expect(btn).toBeDisabled()
      expect(btn).toHaveAttribute('title', '需要團隊編輯權限')
    })
  })

  it('renders an active button for an EDITOR', async () => {
    renderSidebar(
      identity({
        activeTeamId: 'team-1',
        activeTeam: { id: 'team-1', displayName: 'Team A', role: 'EDITOR' } as any,
        teams: [{ id: 'team-1', displayName: 'Team A', role: 'EDITOR' } as any],
      }),
    )

    await waitFor(() => {
      const btn = screen.getByText('+ 新增資料夾')
      expect(btn).not.toBeDisabled()
      expect(btn).not.toHaveAttribute('title')
    })
  })

  it('renders an active button for an admin even without an EDITOR role', async () => {
    renderSidebar(
      identity({
        admin: true,
        activeTeamId: 'team-1',
        activeTeam: { id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any,
        teams: [{ id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any],
      }),
    )

    await waitFor(() => {
      const btn = screen.getByText('+ 新增資料夾')
      expect(btn).not.toBeDisabled()
    })
  })
})
