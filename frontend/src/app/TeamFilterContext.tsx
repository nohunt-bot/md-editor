import { createContext, useContext, useState, type ReactNode } from 'react'

/**
 * Shared team-scoped filter state. Lives in the sidebar (folder tree + tag
 * filter) and is consumed by /team (SkillsPage) so the two panels stay in
 * sync across the two-zone layout.
 */
type TeamFilter = {
  selectedFolder: string | null
  setSelectedFolder: (id: string | null) => void
  selectedTag: string | null
  setSelectedTag: (tag: string | null) => void
}

const TeamFilterContext = createContext<TeamFilter | null>(null)

export function TeamFilterProvider({ children }: { children: ReactNode }) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  return (
    <TeamFilterContext.Provider
      value={{ selectedFolder, setSelectedFolder, selectedTag, setSelectedTag }}
    >
      {children}
    </TeamFilterContext.Provider>
  )
}

export function useTeamFilter(): TeamFilter {
  const ctx = useContext(TeamFilterContext)
  if (!ctx) throw new Error('useTeamFilter must be used within TeamFilterProvider')
  return ctx
}
