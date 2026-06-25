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

    expect(screen.getByText('⚠️ Edit Conflict Detected')).toBeInTheDocument()
    expect(screen.getByText('Conflict detected')).toBeInTheDocument()
    expect(screen.getByText(/Version:/)).toBeInTheDocument()
    expect(screen.getByText(/user-456/)).toBeInTheDocument()
  })

  it('calls onOverride when Override button clicked', () => {
    render(<ConflictDialog {...defaultProps} />)

    fireEvent.click(screen.getByText('Override (Force Save)'))

    expect(defaultProps.onOverride).toHaveBeenCalledTimes(1)
  })

  it('calls onMerge with server content when Use Server Version clicked', () => {
    render(<ConflictDialog {...defaultProps} />)

    fireEvent.click(screen.getByText('Use Server Version'))

    expect(defaultProps.onMerge).toHaveBeenCalledWith('server content')
  })

  it('calls onAbandon when Abandon button clicked', () => {
    render(<ConflictDialog {...defaultProps} />)

    fireEvent.click(screen.getByText('Abandon Changes'))

    expect(defaultProps.onAbandon).toHaveBeenCalledTimes(1)
  })

  it('toggles diff view when Show/Hide Diff button clicked', () => {
    render(<ConflictDialog {...defaultProps} />)

    // Diff should be visible by default
    expect(screen.getByText(/Server \(v5\)/)).toBeInTheDocument()

    // Hide diff
    fireEvent.click(screen.getByText('Hide Diff'))

    // Show diff again
    fireEvent.click(screen.getByText('Show Diff'))
    expect(screen.getByText(/Server \(v5\)/)).toBeInTheDocument()
  })
})
