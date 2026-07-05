import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { GlobalSearch } from './GlobalSearch'

// Phase 5.1/5.2: dropdown shows the 「在開放空間查看全部結果」 row when there
// are results, navigating to /open?q=.

const searchMock = vi.fn()

vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    search: (q: string, scope: string) => searchMock(q, scope),
  }
})

describe('GlobalSearch (Phase 5 polish)', () => {
  it('renders the view-all row when results exist', async () => {
    searchMock.mockResolvedValue({
      data: { team: [{ id: 's1', name: 'deploy', displayName: 'Deploy' }], open: [] },
    })
    render(
      <MemoryRouter>
        <GlobalSearch />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByPlaceholderText(/搜尋 skill/), {
      target: { value: 'dep' },
    })
    await waitFor(() =>
      expect(screen.getByText('在開放空間查看全部結果 →')).toBeInTheDocument(),
    )
    expect(screen.getByText('Deploy')).toBeInTheDocument()
  })
})
