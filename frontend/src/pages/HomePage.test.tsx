import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'
import type { Identity } from '../app/useIdentity'

// GUI redesign step 3/3: "/" is a minimal portal — brand + hero search + two
// door cards + shortcut chips (favorites then recent, each capped at 5).

const favoritesListMock = vi.fn()
const recentMock = vi.fn()

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    search: vi.fn(() => Promise.resolve({ data: { team: [], open: [] } })),
    favoritesApi: {
      ...actual.favoritesApi,
      list: () => favoritesListMock(),
      recent: () => recentMock(),
    },
  }
})

function identity(over: Partial<Identity>): Identity {
  return {
    loading: false,
    offline: false,
    userId: 'u1',
    displayName: 'Alice',
    admin: false,
    teams: [],
    activeTeamId: null,
    activeTeam: null,
    setActiveTeam: () => {},
    ...over,
  }
}

beforeEach(() => {
  favoritesListMock.mockReset()
  recentMock.mockReset()
})

function renderPage(id: Identity) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <HomePage identity={id} />
    </MemoryRouter>,
  )
}

describe('HomePage (GUI redesign step 3/3)', () => {
  it('renders the brand wordmark and both door cards', async () => {
    favoritesListMock.mockResolvedValue({ data: [] })
    recentMock.mockResolvedValue({ data: [] })
    renderPage(
      identity({
        activeTeamId: 'team-a',
        activeTeam: { id: 'team-a', displayName: '平台團隊', role: 'editor' },
      }),
    )
    expect(screen.getByText('Skill.md')).toBeInTheDocument()
    expect(screen.getByText('我的團隊')).toBeInTheDocument()
    expect(screen.getByText('平台團隊')).toBeInTheDocument()
    expect(screen.getByText('開放空間')).toBeInTheDocument()
    const teamLink = screen.getByText('平台團隊').closest('a')
    expect(teamLink).toHaveAttribute('href', '/team')
    const openLink = screen.getByText('開放空間').closest('a')
    expect(openLink).toHaveAttribute('href', '/open')
  })

  it('shows no-team guidance instead of a team link when the user has no team', async () => {
    favoritesListMock.mockResolvedValue({ data: [] })
    recentMock.mockResolvedValue({ data: [] })
    renderPage(identity({}))
    expect(await screen.findByText('請先在左側選擇團隊')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /我的團隊/ })).not.toBeInTheDocument()
  })

  it('renders favorites and recent shortcut chips from the APIs', async () => {
    favoritesListMock.mockResolvedValue({
      data: [{ id: 'fav-1', name: 'deploy', displayName: 'Deploy Guide' }],
    })
    recentMock.mockResolvedValue({
      data: [{ id: 'recent-1', name: 'onboarding', displayName: 'Onboarding' }],
    })
    renderPage(identity({}))
    expect(await screen.findByText('Deploy Guide')).toBeInTheDocument()
    expect(screen.getByText('Onboarding')).toBeInTheDocument()
    expect(screen.getByText('我的收藏')).toBeInTheDocument()
    expect(screen.getByText('最近瀏覽')).toBeInTheDocument()
    expect(screen.getByText('Deploy Guide').closest('a')).toHaveAttribute(
      'href',
      '/skills/fav-1',
    )
  })

  it('caps shortcuts at 5 per section', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: `fav-${i}`,
      name: `skill-${i}`,
      displayName: `Skill ${i}`,
    }))
    favoritesListMock.mockResolvedValue({ data: many })
    recentMock.mockResolvedValue({ data: [] })
    renderPage(identity({}))
    await waitFor(() => expect(screen.getByText('Skill 0')).toBeInTheDocument())
    const chips = document.querySelectorAll('.home-chip')
    expect(chips.length).toBe(5)
  })

  it('renders no shortcuts section when both favorites and recent are empty', async () => {
    favoritesListMock.mockResolvedValue({ data: [] })
    recentMock.mockResolvedValue({ data: [] })
    renderPage(identity({}))
    await waitFor(() => expect(recentMock).toHaveBeenCalled())
    expect(document.querySelector('.home-shortcuts')).toBeFalsy()
  })
})
