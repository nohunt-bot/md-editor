import { render, screen, fireEvent } from '@testing-library/react'
import { Pagination } from './Pagination'

describe('Pagination (Phase A v2)', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(<Pagination page={0} totalPages={1} onPage={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows page status and disables 上一頁 on the first page', () => {
    render(<Pagination page={0} totalPages={3} onPage={() => {}} />)
    expect(screen.getByText('第 1 / 3 頁')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '← 上一頁' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '下一頁 →' })).toBeEnabled()
  })

  it('calls onPage with the next page number', () => {
    const onPage = vi.fn()
    render(<Pagination page={1} totalPages={3} onPage={onPage} />)
    fireEvent.click(screen.getByRole('button', { name: '下一頁 →' }))
    expect(onPage).toHaveBeenCalledWith(2)
    fireEvent.click(screen.getByRole('button', { name: '← 上一頁' }))
    expect(onPage).toHaveBeenCalledWith(0)
  })
})
