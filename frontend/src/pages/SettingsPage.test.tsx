import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPage } from './SettingsPage'

const saveMock = vi.fn((_p: unknown) => Promise.resolve({ data: {} }))
vi.mock('../api/api', async () => {
  const actual = await vi.importActual<typeof import('../api/api')>('../api/api')
  return { ...actual, savePreferences: (p: unknown) => saveMock(p) }
})

// useIdentity reads /api/me; mock it to a stub identity.
vi.mock('../app/useIdentity', () => ({
  useIdentity: () => ({
    loading: false,
    offline: false,
    userId: 'alice',
    displayName: 'Alice',
    admin: false,
    teams: [{ id: 'team-a', displayName: '平台團隊', role: 'EDITOR' }],
    activeTeamId: 'team-a',
    activeTeam: { id: 'team-a', displayName: '平台團隊', role: 'EDITOR' },
    setActiveTeam: () => {},
  }),
}))

describe('SettingsPage', () => {
  it('renders profile, preferences, and deferred sections', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
    // Profile shows the stub identity
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText(/平台團隊/)).toBeInTheDocument()
    // Preferences controls present
    expect(screen.getByLabelText('主題')).toBeInTheDocument()
    expect(screen.getByLabelText('語言')).toBeInTheDocument()
    // Deferred hints present (account + team management)
    expect(screen.getAllByText('需接上 Keycloak 後啟用').length).toBe(2)
  })

  it('persists theme + language changes to the backend', () => {
    saveMock.mockClear()
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('主題'), { target: { value: 'dark' } })
    expect(saveMock).toHaveBeenCalledWith({ theme: 'dark' })
    fireEvent.change(screen.getByLabelText('語言'), { target: { value: 'en' } })
    expect(saveMock).toHaveBeenCalledWith({ language: 'en' })
  })
})
