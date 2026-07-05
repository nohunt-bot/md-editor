import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { folderApi, tagApi, getDevUser, setDevUser, DEV_USERS } from '../api/api'
import { FolderTree } from '../components/tree/FolderTree'
import { useTeamFilter } from './TeamFilterContext'
import { useTheme, type ThemeMode } from './useTheme'
import type { Identity } from './useIdentity'

export function Sidebar({ identity }: { identity: Identity }) {
  const { selectedFolder, setSelectedFolder, selectedTag, setSelectedTag } = useTeamFilter()
  const theme = useTheme()
  const [folders, setFolders] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])

  const teamId = identity.activeTeamId

  // Load team-scoped folder tree + tags whenever the active team changes.
  useEffect(() => {
    if (!teamId) {
      setFolders([])
      setTags([])
      return
    }
    let cancelled = false
    Promise.all([folderApi.getTree(teamId), tagApi.list()])
      .then(([foldersRes, tagsRes]) => {
        if (cancelled) return
        setFolders(foldersRes.data || [])
        setTags(tagsRes.data || [])
      })
      .catch(() => {
        if (cancelled) return
        setFolders([])
        setTags([])
      })
    return () => {
      cancelled = true
    }
  }, [teamId])

  return (
    <aside className="app-sidebar">
      <div className="sidebar-scroll">
        {/* Zone 1: 我的團隊 */}
        <section className="zone">
          <div className="zone-header">
            <span className="zone-bar" />
            <NavLink to="/team" className="zone-title-link">
              我的團隊
            </NavLink>
          </div>

          <select
            className="team-switcher"
            value={teamId ?? ''}
            onChange={(e) => identity.setActiveTeam(e.target.value)}
            disabled={identity.teams.length === 0}
          >
            {identity.teams.length === 0 ? (
              <option value="">（尚無團隊）</option>
            ) : (
              identity.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName}（{t.role}）
                </option>
              ))
            )}
          </select>

          <div className="zone-block">
            <FolderTree
              folders={folders}
              selectedFolder={selectedFolder}
              onSelectFolder={setSelectedFolder}
              teamId={teamId}
            />
          </div>

          <div className="zone-block">
            <div className="zone-subtitle">標籤</div>
            <div className="tag-filter">
              <button
                className={`tag-chip ${!selectedTag ? 'active' : ''}`}
                onClick={() => setSelectedTag(null)}
              >
                全部
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  className={`tag-chip ${selectedTag === tag.name ? 'active' : ''}`}
                  onClick={() => setSelectedTag(tag.name)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="zone-divider" />

        {/* Zone 2: 開放空間 */}
        <section className="zone">
          <div className="zone-header">
            <span className="zone-bar" />
            <NavLink to="/open" className="zone-title-link">
              開放空間
            </NavLink>
          </div>
          <NavLink to="/open" className="zone-entry">
            瀏覽全部
          </NavLink>
        </section>
      </div>

      {/* Bottom: theme switcher (Phase D v2) + dev identity switcher (§2.1) */}
      <div className="dev-switcher">
        <label className="dev-switcher-label">主題</label>
        <select
          value={theme.mode}
          onChange={(e) => theme.setMode(e.target.value as ThemeMode)}
        >
          <option value="system">跟隨系統</option>
          <option value="light">淺色</option>
          <option value="dark">深色</option>
        </select>
        <label className="dev-switcher-label">開發身分（僅 dev）</label>
        <select
          value={getDevUser()}
          onChange={(e) => {
            setDevUser(e.target.value)
            // Reload so all data refetches as the new identity.
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
    </aside>
  )
}
