import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SkillsPage } from './SkillsPage'
import { TeamFilterProvider } from '../app/TeamFilterContext'
import type { Identity } from '../app/useIdentity'
import { skillApi } from '../api/api'

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    skillApi: {
      ...actual.skillApi,
      list: vi.fn(),
    },
  }
})

const listMock = skillApi.list as unknown as ReturnType<typeof vi.fn>

function baseIdentity(overrides: Partial<Identity> = {}): Identity {
  return {
    loading: false,
    offline: false,
    userId: 'alice',
    displayName: 'Alice',
    admin: false,
    teams: [{ id: 't1', displayName: 'Team One', role: 'member' }],
    activeTeamId: 't1',
    activeTeam: { id: 't1', displayName: 'Team One', role: 'member' },
    setActiveTeam: vi.fn(),
    ...overrides,
  }
}

function renderPage(
  identity: Identity,
  initialEntries: string[] = ['/team'],
  provider?: React.ComponentType<{ children: React.ReactNode }>,
) {
  const Wrapper = provider ?? TeamFilterProvider
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Wrapper>
        <SkillsPage identity={identity} />
      </Wrapper>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  listMock.mockReset()
  localStorage.clear()
})

describe('SkillsPage empty states (§6.4)', () => {
  it('(a) no team selected → 選擇一個團隊', async () => {
    renderPage(baseIdentity({ activeTeamId: null, activeTeam: null }))
    expect(await screen.findByText('選擇一個團隊以檢視 skill')).toBeInTheDocument()
    expect(listMock).not.toHaveBeenCalled()
  })

  it('(b) team selected, zero skills → 建立第一個 skill + action', async () => {
    listMock.mockResolvedValue({ data: { content: [] } })
    renderPage(baseIdentity())
    expect(await screen.findByText('建立第一個 skill')).toBeInTheDocument()
    expect(screen.getByText('＋ 建立 skill')).toBeInTheDocument()
  })

  it('(c) filter active, no match → 沒有符合的 skill', async () => {
    // Server-side filtering: the search API returns matches based on the query.
    // Initial load returns one skill; a query that matches nothing returns [].
    listMock.mockImplementation((_teamId: string, _page: number, opts: any) =>
      Promise.resolve({
        data: {
          content: opts?.q
            ? []
            : [{ id: 's1', name: 'alpha', displayName: 'Alpha', tags: ['x'] }],
        },
      }),
    )
    const { container } = renderPage(baseIdentity())
    await screen.findByText('Alpha')
    const input = container.querySelector('.search-input') as HTMLInputElement
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(input, { target: { value: 'zzzznomatch' } })
    await waitFor(() =>
      expect(screen.getByText('沒有符合的 skill，試試放寬篩選')).toBeInTheDocument(),
    )
  })
})

describe('SkillsPage view/density prefs (GUI redesign step 2/3)', () => {
  it('defaults to list view with no stored preference (matches today)', async () => {
    listMock.mockResolvedValue({
      data: { content: [{ id: 's1', name: 'a', displayName: 'A', tags: [] }] },
    })
    const { container } = renderPage(baseIdentity())
    await screen.findByText('A')
    expect(container.querySelector('.skills-list')).toHaveClass('list')
    expect(container.querySelector('.skills-list')).not.toHaveClass('density-compact')
  })

  it('migrates the legacy teamSkillsView=grid key into grid view', async () => {
    localStorage.setItem('teamSkillsView', 'grid')
    listMock.mockResolvedValue({
      data: { content: [{ id: 's1', name: 'a', displayName: 'A', tags: [] }] },
    })
    const { container } = renderPage(baseIdentity())
    await screen.findByText('A')
    expect(container.querySelector('.skills-list')).toHaveClass('grid')
  })

  it('switching to compact density adds density-compact to the list container', async () => {
    const { fireEvent } = await import('@testing-library/react')
    listMock.mockResolvedValue({
      data: { content: [{ id: 's1', name: 'a', displayName: 'A', tags: [] }] },
    })
    const { container } = renderPage(baseIdentity())
    await screen.findByText('A')
    fireEvent.click(screen.getByLabelText('緊湊'))
    expect(container.querySelector('.skills-list')).toHaveClass('density-compact')
  })
})

// Moved from App.test.tsx (docs/tasks/20260711-newskill-into-page-header.md):
// the 新增 Skill create entry now lives in the page header, not the topbar.
describe('SkillsPage header — create-entry gating (VIEWER vs EDITOR)', () => {
  it('renders a disabled 新增 Skill button with an explanatory title for a VIEWER', async () => {
    listMock.mockResolvedValue({ data: { content: [] } })
    renderPage(
      baseIdentity({
        activeTeamId: 'team-1',
        activeTeam: { id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any,
        teams: [{ id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any],
      }),
    )

    await waitFor(() => {
      const btn = screen.getByText('＋ 新增 Skill').closest('button')
      expect(btn).toBeDisabled()
      expect(btn).toHaveAttribute('title', '需要團隊編輯權限')
    })
  })

  it('renders an active 新增 Skill link for an EDITOR', async () => {
    listMock.mockResolvedValue({ data: { content: [] } })
    renderPage(
      baseIdentity({
        activeTeamId: 'team-1',
        activeTeam: { id: 'team-1', displayName: 'Team A', role: 'EDITOR' } as any,
        teams: [{ id: 'team-1', displayName: 'Team A', role: 'EDITOR' } as any],
      }),
    )

    await waitFor(() => {
      const link = screen.getByText('＋ 新增 Skill').closest('a')
      expect(link).not.toBeNull()
      expect(link).toHaveAttribute('href', '/skills/new')
    })
  })

  it('renders an active 新增 Skill link for an admin even without an EDITOR role', async () => {
    listMock.mockResolvedValue({ data: { content: [] } })
    renderPage(
      baseIdentity({
        admin: true,
        activeTeamId: 'team-1',
        activeTeam: { id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any,
        teams: [{ id: 'team-1', displayName: 'Team A', role: 'VIEWER' } as any],
      }),
    )

    await waitFor(() => {
      const link = screen.getByText('＋ 新增 Skill').closest('a')
      expect(link).not.toBeNull()
    })
  })

  it('renders a disabled 新增 Skill button with a select-team title when no team is active', async () => {
    renderPage(baseIdentity({ activeTeamId: null, activeTeam: null }))

    await waitFor(() => {
      const btn = screen.getByText('＋ 新增 Skill').closest('button')
      expect(btn).toBeDisabled()
      expect(btn).toHaveAttribute('title', '請先在左側選擇團隊')
    })
  })
})

describe('SkillsPage cards + badges', () => {
  it('renders published and draft badges for skills', async () => {
    listMock.mockResolvedValue({
      data: {
        content: [
          { id: 's1', name: 'pub', displayName: 'Published Skill', status: 'published', tags: [] },
          { id: 's2', name: 'drf', displayName: 'Draft Skill', status: 'draft', tags: [] },
        ],
      },
    })
    renderPage(baseIdentity())
    expect(await screen.findByText('Published Skill')).toBeInTheDocument()
    const published = screen.getByText('published')
    const draft = screen.getByText('draft')
    expect(published).toHaveClass('badge-published')
    expect(draft).toHaveClass('badge-draft')
  })

  it('defaults to a draft badge when status is missing', async () => {
    listMock.mockResolvedValue({
      data: { content: [{ id: 's1', name: 'x', displayName: 'No Status', tags: [] }] },
    })
    renderPage(baseIdentity())
    await screen.findByText('No Status')
    expect(screen.getByText('draft')).toHaveClass('badge-draft')
  })
})
