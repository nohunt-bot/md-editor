import { render, screen, fireEvent } from '@testing-library/react'
import { ConflictDialog } from './ConflictDialog'

describe('ConflictDialog', () => {
  const defaultProps = {
    newContent: 'user changes',
    currentContent: 'server content',
    currentVersion: 5,
    currentEditorId: 'user-456',
    message: 'Conflict detected',
    onOverride: vi.fn(),
    onMerge: vi.fn(),
    onAbandon: vi.fn(),
  }

  it('renders conflict information', () => {
    render(<ConflictDialog {...defaultProps} />)

    expect(screen.getByText('⚠️ 偵測到編輯衝突')).toBeInTheDocument()
    expect(screen.getByText('Conflict detected')).toBeInTheDocument()
    expect(screen.getByText(/版本：/)).toBeInTheDocument()
    expect(screen.getByText(/user-456/)).toBeInTheDocument()
  })

  it('calls onOverride when 覆蓋 button clicked', () => {
    render(<ConflictDialog {...defaultProps} />)

    fireEvent.click(screen.getByText('覆蓋（強制儲存）'))

    expect(defaultProps.onOverride).toHaveBeenCalledTimes(1)
  })

  it('calls onMerge with server content when 改用伺服器版本 clicked', () => {
    render(<ConflictDialog {...defaultProps} />)

    fireEvent.click(screen.getByText('改用伺服器版本'))

    expect(defaultProps.onMerge).toHaveBeenCalledWith('server content')
  })

  it('calls onAbandon when 放棄變更 button clicked', () => {
    render(<ConflictDialog {...defaultProps} />)

    fireEvent.click(screen.getByText('放棄變更'))

    expect(defaultProps.onAbandon).toHaveBeenCalledTimes(1)
  })

  it('toggles diff view when 顯示/隱藏差異 button clicked', () => {
    render(<ConflictDialog {...defaultProps} />)

    // Diff should be visible by default
    expect(screen.getByText(/伺服器（v5）/)).toBeInTheDocument()

    // Hide diff
    fireEvent.click(screen.getByText('隱藏差異'))

    // Show diff again
    fireEvent.click(screen.getByText('顯示差異'))
    expect(screen.getByText(/伺服器（v5）/)).toBeInTheDocument()
  })
})
