import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDevUser, setDevUser, DEV_USERS } from '../api/api'
import type { Identity } from './useIdentity'
import './UserMenu.css'

// User menu pinned to the sidebar bottom (see docs/tasks/20260705-user-menu-
// settings.md). Shows the current identity and opens Profile/Settings links +
// logout. Theme/language live on /settings (not duplicated here). In dev-stub
// mode the identity is the X-Dev-User; when Keycloak lands, /api/me returns the
// real user and only the logout action changes (redirect to the IdP).
export function UserMenu({ identity }: { identity: Identity }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const role = identity.activeTeam?.role
  const teamLabel = identity.activeTeam?.displayName ?? (identity.admin ? t('settings:admin') : '')

  function logout() {
    // Dev-stub: no real session. Keycloak接回時：清 token + redirect 至 IdP logout。
    alert(t('settings:logoutDevNote'))
    setOpen(false)
  }

  return (
    <div className="user-menu" ref={boxRef}>
      {open && (
        <div className="user-menu-pop">
          <div className="user-menu-section">
            <NavLink to="/settings" className="user-menu-item" onClick={() => setOpen(false)}>
              {t('settings:menuProfile')}
            </NavLink>
            <NavLink to="/settings" className="user-menu-item" onClick={() => setOpen(false)}>
              {t('settings:menuSettings')}
            </NavLink>
          </div>

          {/* Dev-only: identity switching for cross-team testing. */}
          {import.meta.env.DEV && (
            <>
              <div className="user-menu-divider" />
              <div className="user-menu-section">
                <label className="user-menu-label">{t('settings:devSection')}</label>
                <select
                  value={getDevUser()}
                  onChange={(e) => {
                    setDevUser(e.target.value)
                    window.location.reload()
                  }}
                >
                  {DEV_USERS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="user-menu-divider" />
          <button type="button" className="user-menu-item user-menu-logout" onClick={logout}>
            {t('settings:logout')}
          </button>
        </div>
      )}

      <button type="button" className="user-menu-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="user-menu-avatar">{(identity.displayName || '?').charAt(0).toUpperCase()}</span>
        <span className="user-menu-id">
          <span className="user-menu-name">{identity.displayName || getDevUser()}</span>
          {(teamLabel || role) && (
            <span className="user-menu-team">
              {teamLabel}
              {role ? ` · ${role}` : ''}
            </span>
          )}
        </span>
        <span className="user-menu-caret">▾</span>
      </button>
    </div>
  )
}
