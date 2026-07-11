import { render, screen, fireEvent } from '@testing-library/react'
import { ViewToggle } from './ViewToggle'

// GUI redesign step 2/3: shared list/grid + comfortable/compact controls.

describe('ViewToggle', () => {
  it('marks the current view and density as active/pressed', () => {
    render(
      <ViewToggle view="list" density="compact" onViewChange={() => {}} onDensityChange={() => {}} />,
    )
    expect(screen.getByLabelText('清單檢視')).toHaveClass('active')
    expect(screen.getByLabelText('清單檢視')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('格狀檢視')).not.toHaveClass('active')
    expect(screen.getByLabelText('緊湊')).toHaveClass('active')
    expect(screen.getByLabelText('寬鬆')).not.toHaveClass('active')
  })

  it('calls onViewChange when the grid button is clicked', () => {
    const onViewChange = vi.fn()
    render(
      <ViewToggle
        view="list"
        density="comfortable"
        onViewChange={onViewChange}
        onDensityChange={() => {}}
      />,
    )
    fireEvent.click(screen.getByLabelText('格狀檢視'))
    expect(onViewChange).toHaveBeenCalledWith('grid')
  })

  it('calls onDensityChange when the compact button is clicked', () => {
    const onDensityChange = vi.fn()
    render(
      <ViewToggle
        view="grid"
        density="comfortable"
        onViewChange={() => {}}
        onDensityChange={onDensityChange}
      />,
    )
    fireEvent.click(screen.getByLabelText('緊湊'))
    expect(onDensityChange).toHaveBeenCalledWith('compact')
  })
})
