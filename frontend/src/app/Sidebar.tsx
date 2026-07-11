import { useCallback, useEffect, useState } from 'react'
import { folderApi, tagApi } from '../api/api'
import { FolderTree } from '../components/tree/FolderTree'
import { NewFolderModal } from './NewFolderModal'
import { useTeamFilter } from './TeamFilterContext'
import { useTranslation } from 'react-i18next'
import { canEditActiveTeam, type Identity } from './useIdentity'

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
        {/* Team switcher — active tab (SpaceTabs) already says 我的團隊, so
            no zone-title header here. */}
        <section className="zone">
          <div className="sidebar-team-label">{t('detail:team')}</div>
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
            <div className="sidebar-section-header">
              <span className="zone-subtitle">{t('folders:section')}</span>
              {teamId &&
                (canEditActiveTeam(identity) ? (
                  <button
                    type="button"
                    className="btn-small folder-new-btn"
                    onClick={() => setShowNewFolder(true)}
                  >
                    {t('folders:newFolder')}
                  </button>
                ) : (
                  // VIEWER (non-admin): server would 403 on create, so don't
                  // render a live entry point — same pattern as App.tsx's
                  // topbar 新增 Skill button.
                  <button
                    type="button"
                    className="btn-small folder-new-btn"
                    disabled
                    title={t('detail:copyNeedsEditor')}
                  >
                    {t('folders:newFolder')}
                  </button>
                ))}
            </div>
            <FolderTree
              folders={folders}
              selectedFolder={selectedFolder}
              onSelectFolder={setSelectedFolder}
            />
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
