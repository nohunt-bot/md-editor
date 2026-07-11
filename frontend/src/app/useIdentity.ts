import { useEffect, useState } from 'react'
import {
  getMe,
  getDevUser,
  getActiveTeamId,
  setActiveTeamId as persistActiveTeam,
  type MeResponse,
  type TeamMembership,
} from '../api/api'

export type Identity = {
  loading: boolean
  /** true when /api/me failed (e.g. no backend) — shell still renders. */
  offline: boolean
  userId: string
  displayName: string
  admin: boolean
  teams: TeamMembership[]
  activeTeamId: string | null
  activeTeam: TeamMembership | null
  setActiveTeam: (teamId: string) => void
}

/**
 * Whether the caller can create/edit content in the active team: an EDITOR
 * membership, or admin (admins bypass per-team role checks everywhere else
 * too — see useCopyToTeam.ts's canEdit). Used to gate create-entry-point UI
 * (topbar 新增 Skill, sidebar ＋新增資料夾) so VIEWERs never see a clickable
 * button that only 403s server-side.
 */
export function canEditActiveTeam(identity: Identity): boolean {
  if (identity.admin) return true
  return (identity.activeTeam?.role ?? '').toUpperCase() === 'EDITOR'
}

/**
 * Loads the current identity from /api/me and exposes the active team.
 * IMPORTANT (§B): if /api/me fails (no backend), we fall back to an empty
 * identity so the shell still renders both zones — never blank-screen.
 */
export function useIdentity(): Identity {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(getActiveTeamId())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMe()
      .then((res) => {
        if (cancelled) return
        setMe(res.data)
        setOffline(false)
        // Default the active team to the first membership if unset/invalid.
        const teamIds = res.data.teams.map((t) => t.id)
        const current = getActiveTeamId()
        if ((!current || !teamIds.includes(current)) && teamIds.length > 0) {
          persistActiveTeam(teamIds[0])
          setActiveTeamIdState(teamIds[0])
        }
      })
      .catch(() => {
        if (cancelled) return
        // Fall back to a default/empty identity; keep the shell visible.
        setMe(null)
        setOffline(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const teams = me?.teams ?? []
  const activeTeam = teams.find((t) => t.id === activeTeamId) ?? null

  function setActiveTeam(teamId: string) {
    persistActiveTeam(teamId)
    setActiveTeamIdState(teamId)
  }

  return {
    loading,
    offline,
    userId: me?.userId ?? getDevUser(),
    displayName: me?.displayName ?? getDevUser(),
    admin: me?.admin ?? false,
    teams,
    activeTeamId,
    activeTeam,
    setActiveTeam,
  }
}
