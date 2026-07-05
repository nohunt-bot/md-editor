import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SkillDetailPage } from './SkillDetailPage'
import type { Identity } from '../app/useIdentity'

// Phase 2.4: detail page shows permission-gated actions (§2.3) and a 404 state.
// Mock useIdentity to drive the caller role, and skillApi for the fetched skill.

let mockIdentity: Identity

vi.mock('../app/useIdentity', () => ({
  useIdentity: () => mockIdentity,
}))

const getMock = vi.fn()
const getVersionsMock = vi.fn(() => Promise.resolve({ data: [] }))
const likeMock = vi.fn()

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    skillApi: {
      ...actual.skillApi,
      get: (id: string) => getMock(id),
      getVersions: () => getVersionsMock(),
      like: (id: string) => likeMock(id),
    },
  }
})

function identity(over: Partial<Identity>): Identity {
  return {
    loading: false,
    userId: 'alice',
    displayName: 'alice',
    admin: false,
    teams: [],
    activeTeam: null,
    activeTeamId: null,
    setActiveTeamId: () => {},
    ...over,
  } as Identity
}

function renderAt(id = 's1') {
  return render(
    <MemoryRouter initialEntries={[`/skills/${id}`]}>
      <Routes>
        <Route path="/skills/:id" element={<SkillDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const draftTeamSkill = {
  id: 's1',
  name: 'deploy',
  displayName: 'Deploy',
  content: '# Deploy',
  teamId: 'team-a',
  scope: 'team',
  status: 'draft',
  currentVersion: 1,
}

const openPublishedSkill = {
  ...draftTeamSkill,
  id: 's2',
  scope: 'open',
  status: 'published',
}

beforeEach(() => {
  getMock.mockReset()
  getVersionsMock.mockClear()
})

describe('SkillDetailPage actions (§2.3)', () => {
  it('shows 編輯 and 發布到開放空間 for a team editor of a draft', async () => {
    mockIdentity = identity({
      teams: [{ id: 'team-a', displayName: '平台團隊', role: 'EDITOR' }],
    })
    getMock.mockResolvedValue({ data: draftTeamSkill })
    renderAt('s1')
    expect(await screen.findByText('編輯')).toBeInTheDocument()
    expect(screen.getByText('發布到開放空間')).toBeInTheDocument()
    expect(screen.queryByText('複製到我的團隊')).not.toBeInTheDocument()
  })

  it('hides 編輯/發布 for a viewer', async () => {
    mockIdentity = identity({
      teams: [{ id: 'team-a', displayName: '平台團隊', role: 'VIEWER' }],
    })
    getMock.mockResolvedValue({ data: draftTeamSkill })
    renderAt('s1')
    // Wait for load via the always-present metadata section, not the title
    // ("Deploy" also appears as the rendered '# Deploy' markdown heading).
    await screen.findByText('資訊')
    expect(screen.queryByText('編輯')).not.toBeInTheDocument()
    expect(screen.queryByText('發布到開放空間')).not.toBeInTheDocument()
  })

  it('shows 複製到我的團隊 for an open+published skill to an editor of another team', async () => {
    mockIdentity = identity({
      teams: [{ id: 'team-b', displayName: '資料團隊', role: 'EDITOR' }],
    })
    getMock.mockResolvedValue({ data: openPublishedSkill })
    renderAt('s2')
    expect(await screen.findByText('複製到我的團隊')).toBeInTheDocument()
  })

  it('hides 複製到我的團隊 when the viewer is already a member of the skill team', async () => {
    mockIdentity = identity({
      teams: [{ id: 'team-a', displayName: '平台團隊', role: 'VIEWER' }],
    })
    getMock.mockResolvedValue({ data: openPublishedSkill })
    renderAt('s2')
    await screen.findByText('資訊')
    expect(screen.queryByText('複製到我的團隊')).not.toBeInTheDocument()
  })

  it('shows 複製到我的團隊 for an admin who is not a real team member', async () => {
    mockIdentity = identity({
      admin: true,
      teams: [{ id: 'team-a', displayName: '平台團隊', role: 'VIEWER' }],
    })
    getMock.mockResolvedValue({ data: openPublishedSkill })
    renderAt('s2')
    expect(await screen.findByText('複製到我的團隊')).toBeInTheDocument()
  })

  it('shows a disabled copy button with a hint when the viewer has no editable team', async () => {
    mockIdentity = identity({
      teams: [{ id: 'team-b', displayName: '資料團隊', role: 'VIEWER' }],
    })
    getMock.mockResolvedValue({ data: openPublishedSkill })
    renderAt('s2')
    const btn = await screen.findByText('複製到我的團隊')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('title', '需要團隊編輯權限')
    expect(screen.getByText('需要團隊編輯權限', { selector: 'p' })).toBeInTheDocument()
  })

  it('shows the combined 團隊 + 開放空間 scope label for an open+published skill', async () => {
    mockIdentity = identity({
      teams: [{ id: 'team-a', displayName: '平台團隊', role: 'EDITOR' }],
    })
    getMock.mockResolvedValue({ data: openPublishedSkill })
    renderAt('s2')
    expect(await screen.findByText('團隊 + 開放空間')).toBeInTheDocument()
  })

  it('shows 重新發布 hint to an editor when live version is ahead of published (Phase B)', async () => {
    mockIdentity = identity({
      teams: [{ id: 'team-a', displayName: '平台團隊', role: 'EDITOR' }],
    })
    getMock.mockResolvedValue({
      data: { ...openPublishedSkill, currentVersion: 4, publishedVersion: 3 },
    })
    renderAt('s2')
    expect(await screen.findByText('重新發布')).toBeInTheDocument()
    expect(screen.getByText(/開放空間仍顯示 v3/)).toBeInTheDocument()
  })

  it('marks the version as 發布版 for a non-member frozen view (Phase B)', async () => {
    mockIdentity = identity({
      teams: [{ id: 'team-b', displayName: '資料團隊', role: 'EDITOR' }],
    })
    getMock.mockResolvedValue({
      data: { ...openPublishedSkill, currentVersion: 3, publishedVersion: 3 },
    })
    renderAt('s2')
    expect(await screen.findByText('（發布版）')).toBeInTheDocument()
    expect(screen.queryByText('重新發布')).not.toBeInTheDocument()
  })

  it('toggles the like button via the API (Phase C)', async () => {
    mockIdentity = identity({
      teams: [{ id: 'team-b', displayName: '資料團隊', role: 'EDITOR' }],
    })
    getMock.mockResolvedValue({
      data: { ...openPublishedSkill, likeCount: 2, likedByMe: false },
    })
    likeMock.mockResolvedValue({ data: { likeCount: 3, likedByMe: true } })
    renderAt('s2')
    const btn = await screen.findByRole('button', { name: /♡ 2/ })
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.click(btn)
    expect(await screen.findByRole('button', { name: /♥ 3/ })).toBeInTheDocument()
    expect(likeMock).toHaveBeenCalledWith('s2')
  })

  it('renders the 找不到或無權限 state on 404', async () => {
    mockIdentity = identity({})
    getMock.mockRejectedValue({ response: { status: 404 } })
    renderAt('s1')
    expect(await screen.findByText('找不到或無權限')).toBeInTheDocument()
  })
})
