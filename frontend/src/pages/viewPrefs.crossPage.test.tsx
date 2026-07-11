import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SkillsPage } from './SkillsPage'
import { OpenSpacePage } from './OpenSpacePage'
import { FavoritesPage } from './FavoritesPage'
import { TeamFilterProvider } from '../app/TeamFilterContext'
import type { Identity } from '../app/useIdentity'

// GUI redesign step 2/3: a server-saved view/density preference applies
// across all three list pages (/team, /open, /favorites), overriding each
// page's own current-behavior default.

const listMock = vi.fn()
const listOpenMock = vi.fn()
const tagListMock = vi.fn(() => Promise.resolve({ data: [] }))
const favoritesListMock = vi.fn(() => Promise.resolve({ data: [] as any[] }))
const recentMock = vi.fn(() => Promise.resolve({ data: [] }))
const getPreferencesMock = vi.fn(() =>
  Promise.resolve({ data: { cardView: 'grid', cardDensity: 'compact' } }),
)

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    skillApi: {
      ...actual.skillApi,
      list: (...args: unknown[]) => listMock(...args),
      listOpen: (p: unknown) => listOpenMock(p),
    },
    tagApi: { ...actual.tagApi, list: () => tagListMock() },
    favoritesApi: {
      ...actual.favoritesApi,
      list: () => favoritesListMock(),
      recent: () => recentMock(),
    },
    getPreferences: () => getPreferencesMock(),
  }
})

vi.mock('../app/useIdentity', () => ({
  useIdentity: () => baseIdentity(),
  canEditActiveTeam: () => false,
}))

function baseIdentity(): Identity {
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
  }
}

beforeEach(() => {
  localStorage.clear()
  listMock.mockReset().mockResolvedValue({
    data: { content: [{ id: 's1', name: 'a', displayName: 'A', tags: [] }] },
  })
  listOpenMock.mockReset().mockResolvedValue({
    data: {
      content: [
        {
          id: 'o1',
          name: 'o',
          displayName: 'O',
          teamId: 't1',
          teamDisplayName: 'Team One',
        },
      ],
    },
  })
  favoritesListMock.mockReset().mockResolvedValue({ data: [] })
  recentMock.mockReset().mockResolvedValue({ data: [] })
})

describe('card view/density preference — cross-page (GUI redesign step 2/3)', () => {
  it('applies the server-saved grid+compact preference on /team', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/team']}>
        <TeamFilterProvider>
          <SkillsPage identity={baseIdentity()} />
        </TeamFilterProvider>
      </MemoryRouter>,
    )
    await screen.findByText('A')
    await waitFor(() =>
      expect(container.querySelector('.skills-list')).toHaveClass('grid'),
    )
    expect(container.querySelector('.skills-list')).toHaveClass('density-compact')
  })

  it('applies the same preference on /open', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/open']}>
        <OpenSpacePage />
      </MemoryRouter>,
    )
    await screen.findByText('O')
    await waitFor(() =>
      expect(container.querySelector('.open-grid')).toHaveClass('grid'),
    )
    expect(container.querySelector('.open-grid')).toHaveClass('density-compact')
  })

  it('applies the same preference on /favorites', async () => {
    favoritesListMock.mockResolvedValue({
      data: [{ id: 'f1', name: 'f', displayName: 'F', teamId: 't1' }],
    })
    const { container } = render(
      <MemoryRouter initialEntries={['/favorites']}>
        <FavoritesPage />
      </MemoryRouter>,
    )
    await screen.findByText('F')
    await waitFor(() =>
      expect(container.querySelector('.open-grid')).toHaveClass('grid'),
    )
    expect(container.querySelector('.open-grid')).toHaveClass('density-compact')
  })
})
