import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'X-Dev-User': 'alice',
  },
})

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

  list: () =>
    api.get('/api/folders'),

  create: (name: string, parentId?: string) =>
    api.post('/api/folders', { name, parentId }),

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
