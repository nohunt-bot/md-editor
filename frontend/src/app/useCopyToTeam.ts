import { useState } from 'react'
import { skillApi } from '../api/api'
import type { Identity } from './useIdentity'

// Shared "複製到我的團隊" logic for SkillDetailPage and OpenSpacePage (§5.4 F2).
// Copying an open+published skill only makes sense into a team the caller can
// edit AND is not already a member of — publishing never moves the skill out
// of its home team, so a member already has it in their team list.
function canEdit(identity: Identity, teamId?: string): boolean {
  if (identity.admin) return true
  if (!teamId) return false
  const membership = identity.teams.find((t) => t.id === teamId)
  return (membership?.role ?? '').toUpperCase() === 'EDITOR'
}

export function useCopyToTeam(identity: Identity) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Teams the caller may copy into (editor or admin). Admin sees all teams.
  const targetTeams = identity.teams.filter((tm) => canEdit(identity, tm.id))

  // Whether the "複製到我的團隊" affordance should be shown at all for a skill
  // belonging to `skillTeamId`: logged in, and not already a member of the
  // skill's own team. Admin is NOT a "real" member — a stray team-membership
  // record on an admin identity never hides the copy action for them. This
  // does NOT require an editable target team — that only gates whether the
  // button is enabled (§ requirement 2: shown-but-disabled needs its own hint).
  function canCopyTeam(skillTeamId: string | undefined): boolean {
    if (!identity.userId) return false
    if (identity.admin) return true
    if (!skillTeamId) return true
    return !identity.teams.some((t) => t.id === skillTeamId)
  }

  async function copy(skillId: string, targetTeamId: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await skillApi.copyToTeam(skillId, targetTeamId)
      return res.data
    } catch (e: any) {
      setError(e.response?.data?.message || e.message)
      throw e
    } finally {
      setBusy(false)
    }
  }

  return { copy, targetTeams, canCopyTeam, busy, error, setError }
}
