import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FavoritesPage } from './FavoritesPage'

// T1-4: /favorites renders 我的收藏 + 最近瀏覽, each with its own empty state.

const favoritesListMock = vi.fn()
const recentMock = vi.fn()

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    favoritesApi: {
      ...actual.favoritesApi,
      list: () => favoritesListMock(),
      recent: () => recentMock(),
    },
  }
})

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

const favoriteSkill = {
  id: 'fav-1',
  name: 'deploy',
  displayName: 'Deploy Guide',
  description: 'How to deploy',
  teamId: 'team-a',
  teamDisplayName: '平台團隊',
  status: 'published',
}

const recentSkill = {
  id: 'recent-1',
  name: 'onboarding',
  displayName: 'Onboarding',
  description: 'Getting started',
  teamId: 'team-b',
  teamDisplayName: '資料團隊',
  status: 'draft',
}

beforeEach(() => {
  favoritesListMock.mockReset()
  recentMock.mockReset()
  navigateMock.mockClear()
  localStorage.clear()
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/favorites']}>
      <FavoritesPage />
    </MemoryRouter>,
  )
}

describe('FavoritesPage (T1-4)', () => {
  it('renders both sections with their cards', async () => {
    favoritesListMock.mockResolvedValue({ data: [favoriteSkill] })
    recentMock.mockResolvedValue({ data: [recentSkill] })
    renderPage()
    expect(await screen.findByText('Deploy Guide')).toBeInTheDocument()
    expect(await screen.findByText('Onboarding')).toBeInTheDocument()
    expect(screen.getByText('我的收藏')).toBeInTheDocument()
    expect(screen.getByText('最近瀏覽')).toBeInTheDocument()
  })

  it('shows the empty state for favorites when there are none', async () => {
    favoritesListMock.mockResolvedValue({ data: [] })
    recentMock.mockResolvedValue({ data: [recentSkill] })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('尚無收藏，瀏覽 skill 時點擊 ☆ 即可收藏。')).toBeInTheDocument(),
    )
    expect(await screen.findByText('Onboarding')).toBeInTheDocument()
  })

  it('shows the empty state for recently viewed when there are none', async () => {
    favoritesListMock.mockResolvedValue({ data: [favoriteSkill] })
    recentMock.mockResolvedValue({ data: [] })
    renderPage()
    await waitFor(() => expect(screen.getByText('尚無瀏覽紀錄。')).toBeInTheDocument())
    expect(await screen.findByText('Deploy Guide')).toBeInTheDocument()
  })

  it('shows both empty states when nothing is favorited or viewed', async () => {
    favoritesListMock.mockResolvedValue({ data: [] })
    recentMock.mockResolvedValue({ data: [] })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('尚無收藏，瀏覽 skill 時點擊 ☆ 即可收藏。')).toBeInTheDocument()
      expect(screen.getByText('尚無瀏覽紀錄。')).toBeInTheDocument()
    })
  })

  it('defaults to grid view with no stored preference (matches today)', async () => {
    favoritesListMock.mockResolvedValue({ data: [favoriteSkill] })
    recentMock.mockResolvedValue({ data: [] })
    const { container } = renderPage()
    await screen.findByText('Deploy Guide')
    expect(container.querySelector('.open-grid')).toHaveClass('grid')
    expect(container.querySelector('.open-grid')).not.toHaveClass('list')
  })

  it('switches to a single-column list when the list toggle is clicked', async () => {
    favoritesListMock.mockResolvedValue({ data: [favoriteSkill] })
    recentMock.mockResolvedValue({ data: [] })
    const { container } = renderPage()
    await screen.findByText('Deploy Guide')
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.click(screen.getByLabelText('清單檢視'))
    expect(container.querySelector('.open-grid')).toHaveClass('list')
  })

  it('navigates to the skill detail page when a card is clicked', async () => {
    favoritesListMock.mockResolvedValue({ data: [favoriteSkill] })
    recentMock.mockResolvedValue({ data: [] })
    renderPage()
    const card = await screen.findByText('Deploy Guide')
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.click(card)
    expect(navigateMock).toHaveBeenCalledWith('/skills/fav-1')
  })
})
