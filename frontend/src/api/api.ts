import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

// --- Dev identity (§2.1) -------------------------------------------------
// The active dev user is stored in localStorage and sent as X-Dev-User on
// every request. The backend derives author/lastEditor from this header via
// CurrentUserProvider, so the client no longer sends X-User-Id.
export const DEV_USER_KEY = 'devUser'
export const DEV_USERS = ['alice', 'bob', 'carol', 'admin'] as const
export type DevUser = (typeof DEV_USERS)[number]

export function getDevUser(): string {
  return localStorage.getItem(DEV_USER_KEY) || 'alice'
}

export function setDevUser(user: string): void {
  localStorage.setItem(DEV_USER_KEY, user)
}

// --- Active team --------------------------------------------------------
// The team currently selected in the sidebar switcher. Team-scoped calls
// (list, create) use it. Persisted so a reload keeps the same context.
export const ACTIVE_TEAM_KEY = 'activeTeamId'

export function getActiveTeamId(): string | null {
  return localStorage.getItem(ACTIVE_TEAM_KEY)
}

export function setActiveTeamId(teamId: string): void {
  localStorage.setItem(ACTIVE_TEAM_KEY, teamId)
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  config.headers['X-Dev-User'] = getDevUser()
  return config
})

// --- Identity / teams ---------------------------------------------------
export type TeamMembership = {
  id: string
  displayName: string
  role: string
}

export type MeResponse = {
  userId: string
  displayName: string
  teams: TeamMembership[]
  admin: boolean
}

export function getMe() {
  return api.get<MeResponse>('/api/me')
}

// User preferences (theme + language) that follow the account across devices.
export type PreferencesPayload = { theme?: string | null; language?: string | null }

export function getPreferences() {
  return api.get<PreferencesPayload>('/api/me/preferences')
}

export function savePreferences(prefs: PreferencesPayload) {
  return api.put<PreferencesPayload>('/api/me/preferences', prefs)
}

export function getTeams() {
  return api.get('/api/teams')
}

// --- Search (§6.5) ------------------------------------------------------
export type SearchResult = {
  id: string
  name: string
  displayName: string
  description: string
  teamId: string
  teamDisplayName: string
  scope: string
  status: string
  tags: string[]
  publishedAt: string | null
  updatedAt: string | null
}

export type SearchResponse = {
  team: SearchResult[]
  open: SearchResult[]
}

export function search(q: string, scope: string = 'all') {
  return api.get<SearchResponse>('/api/search', { params: { q, scope } })
}

// Skill API
export const skillApi = {
  list: (
    teamId: string,
    page = 0,
    opts: { folderId?: string | null; tag?: string | null; q?: string } = {},
    size = 20,
  ) =>
    api.get('/api/skills', {
      params: {
        teamId,
        page,
        size,
        folderId: opts.folderId || undefined,
        tag: opts.tag || undefined,
        q: opts.q || undefined,
      },
    }),

  listOpen: (params: { tag?: string; q?: string; sort?: string; page?: number; size?: number } = {}) =>
    api.get('/api/skills', { params: { view: 'open', ...params } }),

  // Phase E (v2): presence heartbeat/poll — returns { editors, currentVersion }.
  presence: (id: string) =>
    api.put(`/api/skills/${id}/presence`),

  leavePresence: (id: string) =>
    api.delete(`/api/skills/${id}/presence`),

  // Phase C (v2): like / unlike (idempotent) — returns { likeCount, likedByMe }.
  like: (id: string) =>
    api.put(`/api/skills/${id}/like`),

  unlike: (id: string) =>
    api.delete(`/api/skills/${id}/like`),

  get: (id: string) =>
    api.get(`/api/skills/${id}`),

  create: (data: CreateSkillData) =>
    api.post('/api/skills', data),

  update: (id: string, data: UpdateSkillData) =>
    api.put(`/api/skills/${id}`, data),

  delete: (id: string) =>
    api.delete(`/api/skills/${id}`),

  getVersions: (skillId: string) =>
    api.get(`/api/skills/${skillId}/versions`),

  getVersion: (skillId: string, version: number) =>
    api.get(`/api/skills/${skillId}/versions/${version}`),

  restoreVersion: (skillId: string, version: number) =>
    api.post(`/api/skills/${skillId}/versions/${version}/restore`),

  // §5.4 F4: publish to / unpublish from the open space.
  publish: (id: string) =>
    api.post(`/api/skills/${id}/publish`),

  unpublish: (id: string) =>
    api.delete(`/api/skills/${id}/publish`),

  // §5.4 F2: copy an open+published skill into a team the caller can edit.
  copyToTeam: (id: string, targetTeamId: string) =>
    api.post(`/api/skills/${id}/copy-to-team`, { targetTeamId }),
}

// Folder API
export const folderApi = {
  getTree: (teamId?: string) =>
    api.get('/api/folders/tree', { params: teamId ? { teamId } : {} }),

  list: () =>
    api.get('/api/folders'),

  // teamId is required by the backend (folders are team-scoped since v1 1.1).
  create: (name: string, teamId: string, parentId?: string) =>
    api.post('/api/folders', { name, teamId, parentId }),

  rename: (id: string, name: string) =>
    api.patch(`/api/folders/${id}`, { name }),

  move: (id: string, parentId?: string) =>
    api.patch(`/api/folders/${id}/move`, { parentId }),

  delete: (id: string) =>
    api.delete(`/api/folders/${id}`),
}

// Tag API
export const tagApi = {
  list: () =>
    api.get('/api/tags'),
}

export type CreateSkillData = {
  name: string
  displayName?: string
  description?: string
  content: string
  teamId?: string
  folderId?: string
  tags?: string[]
  references?: { skillId: string; relation: string }[]
  prerequisites?: { skillId: string; note: string }[]
}

export type UpdateSkillData = {
  name?: string
  displayName?: string
  description?: string
  content?: string
  folderId?: string
  tags?: string[]
  references?: { skillId: string; relation: string }[]
  prerequisites?: { skillId: string; note: string }[]
  commitMessage?: string
  expectedVersion?: number
  forceUpdate?: boolean
}
