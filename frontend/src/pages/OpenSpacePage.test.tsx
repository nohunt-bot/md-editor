import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OpenSpacePage } from './OpenSpacePage'

// Phase 3.1: open-space browse renders published cards with provenance,
// offers tag chips, and shows the right empty state when filtering yields none.

const listOpenMock = vi.fn()
const tagListMock = vi.fn(() => Promise.resolve({ data: [{ name: 'devops' }, { name: 'llm' }] }))

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    skillApi: { ...actual.skillApi, listOpen: (p: any) => listOpenMock(p) },
    tagApi: { ...actual.tagApi, list: () => tagListMock() },
  }
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
})
