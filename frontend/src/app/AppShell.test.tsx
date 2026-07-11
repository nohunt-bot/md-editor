import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

// §B: the shell must render even when /api/me fails (no backend). We mock the
// api module so getMe() rejects (offline) and the shell falls back to an
// empty identity — the space tabs must still be visible with zero clicks.
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

describe('App shell (top-level space tabs, offline)', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('renders the three space tabs without a backend', () => {
    render(<App />)
    const nav = document.querySelector('.space-tabs') as HTMLElement
    expect(nav).toBeTruthy()
    expect(nav.querySelector('.space-tab-team')).toHaveTextContent('我的團隊')
    expect(nav.querySelector('.space-tab-open')).toHaveTextContent('開放空間')
    expect(nav.querySelector('.space-tab-fav')).toHaveTextContent('我的收藏')
  })

  it('renders the user menu in the topbar on the default (/team) route', () => {
    render(<App />)
    const trigger = document.querySelector('.app-topbar .user-menu-trigger') as HTMLElement
    expect(trigger).toBeTruthy()
    fireEvent.click(trigger)
    expect(screen.getByText('登出')).toBeInTheDocument()
  })

  it('shows the contextual sidebar on /team', () => {
    window.history.pushState({}, '', '/team')
    render(<App />)
    expect(document.querySelector('.app-sidebar')).toBeTruthy()
  })

  it('hides the sidebar on /open and /favorites, keeps the user menu reachable', () => {
    window.history.pushState({}, '', '/open')
    render(<App />)
    expect(document.querySelector('.app-sidebar')).toBeFalsy()
    expect(document.querySelector('.app-topbar .user-menu-trigger')).toBeTruthy()
  })
})
