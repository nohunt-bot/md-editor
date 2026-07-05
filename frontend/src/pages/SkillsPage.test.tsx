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
    listMock.mockResolvedValue({
      data: { content: [{ id: 's1', name: 'alpha', displayName: 'Alpha', tags: ['x'] }] },
    })
    // Provider whose default tag never matches the skill's tags.
    const FilteredProvider = ({ children }: { children: React.ReactNode }) => (
      <TeamFilterProvider>{children}</TeamFilterProvider>
    )
    const { container } = renderPage(baseIdentity(), ['/team'], FilteredProvider)
    // Wait for skills to load, then set search that matches nothing.
    await screen.findByText('Alpha')
    const input = container.querySelector('.search-input') as HTMLInputElement
    input.focus()
    // Type a query with no match.
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.change(input, { target: { value: 'zzzznomatch' } })
    await waitFor(() =>
      expect(screen.getByText('沒有符合的 skill，試試放寬篩選')).toBeInTheDocument(),
    )
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
