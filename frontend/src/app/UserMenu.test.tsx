import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { UserMenu } from './UserMenu'
import type { Identity } from './useIdentity'

function identity(over: Partial<Identity> = {}): Identity {
  return {
    loading: false,
    offline: false,
    userId: 'alice',
    displayName: 'Alice',
    admin: false,
    teams: [{ id: 'team-a', displayName: '平台團隊', role: 'EDITOR' }],
    activeTeamId: 'team-a',
    activeTeam: { id: 'team-a', displayName: '平台團隊', role: 'EDITOR' },
    setActiveTeam: () => {},
    ...over,
  } as Identity
}

function renderMenu(id = identity()) {
  return render(
    <MemoryRouter>
      <UserMenu identity={id} />
    </MemoryRouter>,
  )
}

describe('UserMenu', () => {
  it('shows the current identity name and team', () => {
    renderMenu()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText(/平台團隊/)).toBeInTheDocument()
  })

  it('opens the menu with settings + logout on click', () => {
    renderMenu()
    // Menu closed initially — logout not shown.
    expect(screen.queryByText('登出')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Alice'))
    expect(screen.getByText('登出')).toBeInTheDocument()
    expect(screen.getAllByText('設定').length).toBeGreaterThan(0)
  })
})
