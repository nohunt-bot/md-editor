import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VersionDiffDialog } from './VersionDiffDialog'

const getVersionMock = vi.fn()

vi.mock('../../api/api', async () => {
  const actual = await vi.importActual<typeof import('../../api/api')>('../../api/api')
  return {
    ...actual,
    skillApi: {
      ...actual.skillApi,
      getVersion: (skillId: string, version: number) => getVersionMock(skillId, version),
    },
  }
})

describe('VersionDiffDialog', () => {
  const onClose = vi.fn()
  const onRestore = vi.fn()

  const baseProps = {
    skillId: 's1',
    version: 3,
    currentVersion: 7,
    currentContent: 'current skill content',
    canRestore: true,
    onClose,
    onRestore,
  }

  beforeEach(() => {
    getVersionMock.mockReset()
    onClose.mockClear()
    onRestore.mockClear()
  })

  it('fetches the selected version and renders diff with both versions\' content', async () => {
    getVersionMock.mockResolvedValue({
      data: { version: 3, snapshot: { content: 'old version content' } },
    })
    const { container } = render(<VersionDiffDialog {...baseProps} />)

    await waitFor(() => expect(getVersionMock).toHaveBeenCalledWith('s1', 3))
    await waitFor(() => expect(container.textContent).toContain('old version content'))
    expect(container.textContent).toContain('current skill content')
    expect(screen.getByText('v3')).toBeInTheDocument()
    expect(screen.getByText('目前（v7）')).toBeInTheDocument()
  })

  it('shows a loading state before the version content resolves', () => {
    getVersionMock.mockReturnValue(new Promise(() => {}))
    render(<VersionDiffDialog {...baseProps} />)
    expect(screen.getByText('載入中…')).toBeInTheDocument()
  })

  it('calls onRestore with the selected version when 還原到此版本 is clicked', async () => {
    getVersionMock.mockResolvedValue({
      data: { version: 3, snapshot: { content: 'old version content' } },
    })
    render(<VersionDiffDialog {...baseProps} />)

    fireEvent.click(screen.getByText('還原到此版本'))
    expect(onRestore).toHaveBeenCalledWith(3)
  })

  it('hides the restore button when not permitted', async () => {
    getVersionMock.mockResolvedValue({
      data: { version: 3, snapshot: { content: 'old version content' } },
    })
    render(<VersionDiffDialog {...baseProps} canRestore={false} />)

    await waitFor(() => expect(getVersionMock).toHaveBeenCalled())
    expect(screen.queryByText('還原到此版本')).not.toBeInTheDocument()
  })
})
