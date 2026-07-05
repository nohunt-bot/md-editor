import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

// §B: the shell must render BOTH zones even when /api/me fails (no backend).
// We mock the api module so getMe() rejects (offline) and the shell falls back
// to an empty identity — both zones must still be visible with zero clicks.
vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return {
    ...actual,
    getMe: vi.fn(() => Promise.reject(new Error('no backend'))),
    getTeams: vi.fn(() => Promise.reject(new Error('no backend'))),
    search: vi.fn(() => Promise.reject(new Error('no backend'))),
    skillApi: {
      ...actual.skillApi,
      list: vi.fn(() => Promise.reject(new Error('no backend'))),
      listOpen: vi.fn(() => Promise.reject(new Error('no backend'))),
    },
    folderApi: {
      ...actual.folderApi,
      getTree: vi.fn(() => Promise.reject(new Error('no backend'))),
    },
    tagApi: {
      ...actual.tagApi,
      list: vi.fn(() => Promise.reject(new Error('no backend'))),
    },
  }
})

describe('App shell (two zones, offline)', () => {
  it('renders both 我的團隊 and 開放空間 zones without a backend', () => {
    render(<App />)
    expect(screen.getByText('我的團隊')).toBeInTheDocument()
    expect(screen.getByText('開放空間')).toBeInTheDocument()
  })

  it('renders the user menu (identity + logout on open)', () => {
    render(<App />)
    // Offline identity falls back to the dev user; the menu trigger renders it.
    const trigger = document.querySelector('.user-menu-trigger') as HTMLElement
    expect(trigger).toBeTruthy()
    fireEvent.click(trigger)
    expect(screen.getByText('登出')).toBeInTheDocument()
  })
})
