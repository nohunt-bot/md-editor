import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OpenSpacePage } from './OpenSpacePage'
import type { Identity } from '../app/useIdentity'

// Phase 3.1: open-space browse renders published cards with provenance,
// offers tag chips, and shows the right empty state when filtering yields none.

const listOpenMock = vi.fn()
const tagListMock = vi.fn(() => Promise.resolve({ data: [{ name: 'devops' }, { name: 'llm' }] }))
const copyToTeamMock = vi.fn()

let mockIdentity: Identity

vi.mock('../app/useIdentity', () => ({
  useIdentity: () => mockIdentity,
}))

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    skillApi: {
      ...actual.skillApi,
      listOpen: (p: any) => listOpenMock(p),
      copyToTeam: (id: string, targetTeamId: string) => copyToTeamMock(id, targetTeamId),
    },
    tagApi: { ...actual.tagApi, list: () => tagListMock() },
  }
})

function identity(over: Partial<Identity>): Identity {
  return {
    loading: false,
    offline: false,
    userId: '',
    displayName: '',
    admin: false,
    teams: [],
    activeTeam: null,
    activeTeamId: null,
    setActiveTeam: () => {},
    ...over,
  } as Identity
}

const navigateMock = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateMock }
})

const publishedSkill = {
  id: 's1',
  name: 'deploy',
  displayName: 'Deploy Guide',
  description: 'How to deploy',
  teamId: 'team-a',
  teamDisplayName: '平台團隊',
  publishedAt: '2026-07-01T00:00:00Z',
  tags: ['devops'],
}

beforeEach(() => {
  listOpenMock.mockReset()
  tagListMock.mockClear()
  copyToTeamMock.mockReset()
  navigateMock.mockClear()
  mockIdentity = identity({ userId: 'alice', teams: [] })
})

function renderAt(path = '/open') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <OpenSpacePage />
    </MemoryRouter>,
  )
}

describe('OpenSpacePage (§3.1)', () => {
  it('renders a published card with title and source team', async () => {
    listOpenMock.mockResolvedValue({ data: { content: [publishedSkill] } })
    renderAt()
    expect(await screen.findByText('Deploy Guide')).toBeInTheDocument()
    expect(screen.getByText('平台團隊')).toBeInTheDocument()
  })

  it('shows tag chips fetched from the API', async () => {
    listOpenMock.mockResolvedValue({ data: { content: [publishedSkill] } })
    renderAt()
    // Chips are buttons ('devops' also appears as a card tag span, so query
    // by role to target the chip specifically).
    expect(await screen.findByRole('button', { name: 'devops' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'llm' })).toBeInTheDocument()
  })

  it('shows the filter-empty state when a tag filter yields nothing', async () => {
    listOpenMock.mockResolvedValue({ data: { content: [] } })
    renderAt('/open?tag=devops')
    await waitFor(() =>
      expect(screen.getByText('沒有符合的 skill，試試放寬篩選')).toBeInTheDocument(),
    )
  })

  it('shows the empty state when nothing is published (no filter)', async () => {
    listOpenMock.mockResolvedValue({ data: { content: [] } })
    renderAt('/open')
    await waitFor(() =>
      expect(screen.getByText('還沒有團隊發布 skill')).toBeInTheDocument(),
    )
  })

  it('passes sort=likes when the 最熱 chip is clicked (Phase C)', async () => {
    listOpenMock.mockResolvedValue({ data: { content: [publishedSkill] } })
    renderAt()
    const hot = await screen.findByRole('button', { name: '最熱' })
    fireEvent.click(hot)
    await waitFor(() =>
      expect(listOpenMock).toHaveBeenCalledWith(expect.objectContaining({ sort: 'likes' })),
    )
  })

  it('passes the selected tag to listOpen when a chip is clicked', async () => {
    listOpenMock.mockResolvedValue({ data: { content: [publishedSkill] } })
    renderAt()
    const chip = await screen.findByRole('button', { name: 'llm' })
    fireEvent.click(chip)
    await waitFor(() =>
      expect(listOpenMock).toHaveBeenCalledWith(expect.objectContaining({ tag: 'llm' })),
    )
  })

  it('shows the quick-copy button for a non-member with an editable team', async () => {
    mockIdentity = identity({
      userId: 'alice',
      teams: [{ id: 'team-b', displayName: '資料團隊', role: 'EDITOR' }],
    })
    listOpenMock.mockResolvedValue({ data: { content: [publishedSkill] } })
    renderAt()
    expect(await screen.findByText('複製到我的團隊')).toBeInTheDocument()
  })

  it('hides the quick-copy button for a member of the card team', async () => {
    mockIdentity = identity({
      userId: 'alice',
      teams: [{ id: 'team-a', displayName: '平台團隊', role: 'EDITOR' }],
    })
    listOpenMock.mockResolvedValue({ data: { content: [publishedSkill] } })
    renderAt()
    await screen.findByText('Deploy Guide')
    expect(screen.queryByText('複製到我的團隊')).not.toBeInTheDocument()
  })

  it('copies directly (single editable team) without navigating to the card detail first', async () => {
    mockIdentity = identity({
      userId: 'alice',
      teams: [{ id: 'team-b', displayName: '資料團隊', role: 'EDITOR' }],
    })
    listOpenMock.mockResolvedValue({ data: { content: [publishedSkill] } })
    copyToTeamMock.mockResolvedValue({ data: { id: 'new-skill' } })
    renderAt()
    const btn = await screen.findByText('複製到我的團隊')
    fireEvent.click(btn)
    await waitFor(() => expect(copyToTeamMock).toHaveBeenCalledWith('s1', 'team-b'))
    // Only the copy navigation should fire — no navigate(`/skills/s1`) from
    // the card's own onClick (stopPropagation prevented it).
    expect(navigateMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith('/skills/new-skill')
  })
})
