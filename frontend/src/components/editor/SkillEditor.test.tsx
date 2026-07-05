import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SkillEditor } from './SkillEditor'

// Phase 5.1: no-team guard renders a banner + disabled save; save failures
// render an inline Chinese error banner (no browser alert()).

let mockActiveTeam: string | null = 'team-a'
const createMock = vi.fn()

vi.mock('../../api/api.ts', async () => {
  const actual = await vi.importActual<typeof import('../../api/api.ts')>('../../api/api.ts')
  return {
    ...actual,
    getActiveTeamId: () => mockActiveTeam,
    skillApi: {
      ...actual.skillApi,
      create: (d: unknown) => createMock(d),
    },
  }
})

// MDXEditor doesn't render in jsdom — stub the wrapper with a plain textarea.
vi.mock('./MdxEditorWrapper', () => ({
  MdxEditorWrapper: ({ markdown, onChange }: any) => (
    <textarea
      aria-label="content"
      value={markdown}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/skills/new']}>
      <SkillEditor />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  createMock.mockReset()
  mockActiveTeam = 'team-a'
})

describe('SkillEditor (Phase 5.1 guards + inline errors)', () => {
  it('shows the no-team banner and disables save when no active team', () => {
    mockActiveTeam = null
    renderCreate()
    expect(screen.getByText('請先在左側選擇團隊，再建立 skill')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '儲存' })).toBeDisabled()
  })

  it('renders an inline error banner when save fails (no alert)', async () => {
    createMock.mockRejectedValue({ response: { data: { message: 'boom' } } })
    renderCreate()
    fireEvent.change(screen.getByLabelText('名稱 *'), { target: { value: 'x' } })
    fireEvent.change(screen.getByLabelText('content'), { target: { value: '# hi' } })
    fireEvent.click(screen.getByRole('button', { name: '儲存' }))
    await waitFor(() => expect(screen.getByText(/儲存失敗：boom/)).toBeInTheDocument())
  })

  it('shows the required-fields banner when name/content missing', () => {
    renderCreate()
    fireEvent.click(screen.getByRole('button', { name: '儲存' }))
    expect(screen.getByText('名稱與內容為必填')).toBeInTheDocument()
  })
})
