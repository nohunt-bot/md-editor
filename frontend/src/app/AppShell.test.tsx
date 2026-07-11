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

  it('shows the contextual sidebar inside the content row on /team', () => {
    window.history.pushState({}, '', '/team')
    render(<App />)
    expect(document.querySelector('.app-content-row > .app-sidebar')).toBeTruthy()
  })

  it('hides the sidebar on /open and /favorites, keeps the user menu reachable', () => {
    window.history.pushState({}, '', '/open')
    render(<App />)
    expect(document.querySelector('.app-sidebar')).toBeFalsy()
    expect(document.querySelector('.app-topbar .user-menu-trigger')).toBeTruthy()
  })
})

describe('App shell — three-band layout (docs/tasks/20260711-sidebar-layout-fix.md)', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/team')
  })

  it('renders topbar and space tabs as full-width ancestors above the content row (not inside the sidebar)', () => {
    render(<App />)
    const shell = document.querySelector('.app-shell') as HTMLElement
    const children = Array.from(shell.children)
    const topbarIndex = children.indexOf(document.querySelector('.app-topbar') as Element)
    const tabsIndex = children.indexOf(document.querySelector('.space-tabs') as Element)
    const contentRowIndex = children.indexOf(document.querySelector('.app-content-row') as Element)

    // Topbar and tabs must be direct children of the shell, ordered before
    // the content row — the sidebar (inside the content row) is not an
    // ancestor of either.
    expect(topbarIndex).toBeGreaterThanOrEqual(0)
    expect(tabsIndex).toBeGreaterThanOrEqual(0)
    expect(contentRowIndex).toBeGreaterThanOrEqual(0)
    expect(topbarIndex).toBeLessThan(contentRowIndex)
    expect(tabsIndex).toBeLessThan(contentRowIndex)
    expect(document.querySelector('.app-topbar .app-sidebar')).toBeNull()
    expect(document.querySelector('.space-tabs .app-sidebar')).toBeNull()
    expect(document.querySelector('.app-content-row .app-sidebar')).toBeTruthy()
  })

  it('renders a brand wordmark in the topbar that links to /', () => {
    render(<App />)
    const brand = document.querySelector('.app-topbar .app-brand') as HTMLAnchorElement
    expect(brand).toBeTruthy()
    expect(brand).toHaveAttribute('href', '/')
  })

  it('renders the brand wordmark on the portal (/) too', () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    const brand = document.querySelector('.app-topbar .app-brand') as HTMLAnchorElement
    expect(brand).toBeTruthy()
    expect(brand).toHaveAttribute('href', '/')
  })
})
