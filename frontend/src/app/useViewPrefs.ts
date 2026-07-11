import { useEffect, useState } from 'react'
import { getPreferences, savePreferences } from '../api/api'

// GUI redesign step 2/3 (docs/tasks/20260711-gui-card-view-prefs.md): card
// arrangement (list/grid) + density (comfortable/compact) follow the user
// across pages and devices, same localStorage-instant + server-override
// pattern as theme/language (App.tsx, useTheme.ts). null = "not set" — each
// page falls back to its own current-behavior default in that case.

export type CardView = 'list' | 'grid'
export type CardDensity = 'comfortable' | 'compact'

const VIEW_KEY = 'cardView'
const DENSITY_KEY = 'cardDensity'
// Pre-existing /team-only key (SkillsPage). Migrated once into VIEW_KEY.
const LEGACY_TEAM_VIEW_KEY = 'teamSkillsView'

function readView(): CardView | null {
  const stored = localStorage.getItem(VIEW_KEY)
  if (stored === 'list' || stored === 'grid') return stored
  const legacy = localStorage.getItem(LEGACY_TEAM_VIEW_KEY)
  if (legacy === 'list' || legacy === 'grid') {
    localStorage.setItem(VIEW_KEY, legacy)
    localStorage.removeItem(LEGACY_TEAM_VIEW_KEY)
    return legacy
  }
  return null
}

function readDensity(): CardDensity | null {
  const stored = localStorage.getItem(DENSITY_KEY)
  return stored === 'comfortable' || stored === 'compact' ? stored : null
}

export function useViewPrefs(): {
  view: CardView | null
  density: CardDensity | null
  setView: (v: CardView) => void
  setDensity: (d: CardDensity) => void
} {
  const [view, setViewState] = useState<CardView | null>(readView)
  const [density, setDensityState] = useState<CardDensity | null>(readDensity)

  // Server value overrides localStorage once loaded. Silent-degrade if
  // offline/unauthenticated — applying here does NOT re-save.
  useEffect(() => {
    getPreferences()
      .then((res) => {
        const { cardView, cardDensity } = res.data
        if (cardView === 'list' || cardView === 'grid') {
          localStorage.setItem(VIEW_KEY, cardView)
          setViewState(cardView)
        }
        if (cardDensity === 'comfortable' || cardDensity === 'compact') {
          localStorage.setItem(DENSITY_KEY, cardDensity)
          setDensityState(cardDensity)
        }
      })
      .catch(() => {})
  }, [])

  function setView(next: CardView) {
    localStorage.setItem(VIEW_KEY, next)
    setViewState(next)
    savePreferences({ cardView: next }).catch(() => {})
  }

  function setDensity(next: CardDensity) {
    localStorage.setItem(DENSITY_KEY, next)
    setDensityState(next)
    savePreferences({ cardDensity: next }).catch(() => {})
  }

  return { view, density, setView, setDensity }
}
