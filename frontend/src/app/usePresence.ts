import { useEffect, useRef, useState } from 'react'
import { skillApi } from '../api/api'

// Phase E (v2): soft presence via DB polling (see ADR
// 20260705-presence-db-poll-over-websocket). Heartbeats every 5s while the
// editor is mounted; returns the other active editors and whether the live
// version has moved past what the editor loaded (someone else saved).
// Degrades silently: on any error the hook returns empty state and the editor
// keeps working (the optimistic-lock 409 remains the last line of defense).

const POLL_MS = 5000

export function usePresence(skillId: string | undefined, loadedVersion: number | undefined) {
  const [editors, setEditors] = useState<string[]>([])
  const [versionChanged, setVersionChanged] = useState(false)
  const loadedRef = useRef(loadedVersion)
  loadedRef.current = loadedVersion

  useEffect(() => {
    if (!skillId) return
    let cancelled = false

    async function beat() {
      try {
        const res = await skillApi.presence(skillId!)
        if (cancelled) return
        setEditors(res.data.editors ?? [])
        const live = res.data.currentVersion
        const base = loadedRef.current
        setVersionChanged(base != null && live != null && live > base)
      } catch {
        if (!cancelled) setEditors([]) // silent degrade
      }
    }

    beat()
    const timer = setInterval(beat, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
      // Best-effort leave so others stop seeing us promptly.
      skillApi.leavePresence(skillId).catch(() => {})
    }
  }, [skillId])

  return { editors, versionChanged }
}
