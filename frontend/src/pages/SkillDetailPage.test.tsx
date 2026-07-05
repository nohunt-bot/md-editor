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

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    skillApi: {
      ...actual.skillApi,
      get: (id: string) => getMock(id),
      getVersions: () => getVersionsMock(),
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

  it('renders the 找不到或無權限 state on 404', async () => {
    mockIdentity = identity({})
    getMock.mockRejectedValue({ response: { status: 404 } })
    renderAt('s1')
    expect(await screen.findByText('找不到或無權限')).toBeInTheDocument()
  })
})
