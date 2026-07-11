import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { folderApi, tagApi } from '../api/api'
import { FolderTree } from '../components/tree/FolderTree'
import { NewFolderModal } from './NewFolderModal'
import { useTeamFilter } from './TeamFilterContext'
import { useTranslation } from 'react-i18next'
import type { Identity } from './useIdentity'

export function Sidebar({ identity }: { identity: Identity }) {
  const { selectedFolder, setSelectedFolder, selectedTag, setSelectedTag } = useTeamFilter()
  const { t } = useTranslation()
  const [folders, setFolders] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [showNewFolder, setShowNewFolder] = useState(false)

  const teamId = identity.activeTeamId

  const loadFolders = useCallback(() => {
    if (!teamId) {
      setFolders([])
      return Promise.resolve()
    }
    return folderApi
      .getTree(teamId)
      .then((res) => setFolders(res.data || []))
      .catch(() => setFolders([]))
  }, [teamId])

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
              {t('shell:myTeam')}
            </NavLink>
          </div>

          <select
            className="team-switcher"
            value={teamId ?? ''}
            onChange={(e) => identity.setActiveTeam(e.target.value)}
            disabled={identity.teams.length === 0}
          >
            {identity.teams.length === 0 ? (
              <option value="">{t('shell:noTeams')}</option>
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
            />
            {teamId && (
              <button
                type="button"
                className="btn-small folder-new-btn"
                onClick={() => setShowNewFolder(true)}
              >
                {t('folders:newFolder')}
              </button>
            )}
          </div>

          <div className="zone-block">
            <div className="zone-subtitle">{t('common:tags')}</div>
            <div className="tag-filter">
              <button
                className={`tag-chip ${!selectedTag ? 'active' : ''}`}
                onClick={() => setSelectedTag(null)}
              >
                {t('common:all')}
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
      </div>

      {showNewFolder && teamId && (
        <NewFolderModal
          teamId={teamId}
          onClose={() => setShowNewFolder(false)}
          onCreated={() => {
            setShowNewFolder(false)
            loadFolders()
          }}
        />
      )}
    </aside>
  )
}
