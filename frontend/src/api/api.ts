import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED !== 'false'

let token: string | null = null

export function getToken(): string | null {
  return token
}

export function setToken(t: string | null): void {
  token = t
}

export async function refreshToken(): Promise<void> {
  // Keycloak token refresh handled via initKeycloak
}

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  async (config) => {
    if (AUTH_ENABLED) {
      let t = getToken()
      if (!t) {
        await refreshToken()
        t = getToken()
      }
      if (t) {
        config.headers.Authorization = `Bearer ${t}`
      }
    }
    config.headers['X-User-Id'] = AUTH_ENABLED ? (getToken() ? 'from-jwt' : 'anonymous') : 'user-123'
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (AUTH_ENABLED && error.response?.status === 401) {
      try {
        await refreshToken()
        error.config.headers.Authorization = `Bearer ${getToken()}`
        return api(error.config)
      } catch {
        window.location.reload()
      }
    }
    return Promise.reject(error)
  }
)

// Skill API
export const skillApi = {
  list: (page = 0, size = 20) => 
    api.get('/api/skills', { params: { page, size } }),
  
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
}

// Folder API
export const folderApi = {
  getTree: () => 
    api.get('/api/folders/tree'),
  
  create: (name: string, parentId?: string) => 
    api.post('/api/folders', { name, parentId, ownerId: 'user-123' }),
  
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
