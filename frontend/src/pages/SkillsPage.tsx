import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { skillApi } from '../api/api'
import { useTeamFilter } from '../app/TeamFilterContext'
import { Badge } from '../components/common/Badge'
import { Pagination } from '../components/common/Pagination'
import { useTranslation } from 'react-i18next'
import type { Identity } from '../app/useIdentity'
import './SkillsPage.css'

// The team skill list (§6.4). Folder/tag filters live in the shell sidebar and
// are shared via TeamFilterContext. Light-minimal card restyle is Phase 2.3.
const VIEW_KEY = 'teamSkillsView'
type View = 'list' | 'grid'

function readView(): View {
  return localStorage.getItem(VIEW_KEY) === 'grid' ? 'grid' : 'list'
}

export function SkillsPage({ identity }: { identity: Identity }) {
  const { t } = useTranslation()
  const { selectedFolder, selectedTag } = useTeamFilter()
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState<View>(readView)
  // Phase A (v2): server-side pagination. Known limit: the sidebar/search
  // filters below are client-side and apply to the CURRENT page only —
  // server-side team-list filtering is backlog.
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const teamId = identity.activeTeamId

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  // New team → back to the first page.
  // Debounce the search box so we don't hit the API on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300)
    return () => clearTimeout(h)
  }, [searchQuery])

  // Server-side filtering (folder/tag/search) — applies across all pages, not
  // just the current one. Any filter change resets to the first page.
  useEffect(() => {
    setPage(0)
  }, [teamId, selectedFolder, selectedTag, debouncedSearch])

  useEffect(() => {
    if (!teamId) {
      setSkills([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    skillApi
      .list(teamId, page, {
        folderId: selectedFolder,
        tag: selectedTag,
        q: debouncedSearch,
      })
      .then((res) => {
        if (cancelled) return
        setSkills(res.data.content || [])
        setTotalPages(res.data.totalPages ?? 1)
      })
      .catch(() => {
        if (!cancelled) setSkills([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [teamId, page, selectedFolder, selectedTag, debouncedSearch])

  const filterActive = Boolean(selectedFolder || selectedTag || debouncedSearch)
  // Server already filtered; render the returned page as-is.
  const filteredSkills = skills

  function renderBody() {
    // (a) no team selected
    if (!teamId) {
      return (
        <div className="empty-state">
          <p className="empty-state-title">{t('skills:emptyNoTeam')}</p>
        </div>
      )
    }
    if (loading) {
      return <div className="loading">{t('common:loading')}</div>
    }
    // Empty result: distinguish "filter matched nothing" from "team has no
    // skills at all" (server-side filtering returns the same empty list).
    if (skills.length === 0) {
      if (filterActive) {
        return (
          <div className="empty-state">
            <p className="empty-state-title">{t('skills:emptyNoMatch')}</p>
          </div>
        )
      }
      return (
        <div className="empty-state">
          <p className="empty-state-title">{t('skills:emptyCreateFirst')}</p>
          <p className="empty-state-hint">{t('skills:emptyCreateFirstHint')}</p>
          <Link to="/skills/new" className="btn-primary">
            {t('skills:createSkill')}
          </Link>
        </div>
      )
    }
    return (
      <div className={`skills-list ${view}`}>
        {filteredSkills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>
    )
  }

  return (
    <div className="skills-main">
      <div className="skills-header">
        <h1>
          <span className="page-space-stripe page-space-stripe-team" aria-hidden="true" />
          {identity.activeTeam?.displayName
            ? t('skills:teamSkills', { team: identity.activeTeam.displayName })
            : t('skills:teamSkillsGeneric')}
        </h1>
        <div className="skills-actions">
          <input
            type="text"
            className="search-input"
            placeholder={t('skills:filterPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="view-toggle" role="group" aria-label={t('skills:viewMode')}>
            <button
              type="button"
              className={view === 'list' ? 'active' : ''}
              aria-label={t('skills:viewList')}
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              ☰
            </button>
            <button
              type="button"
              className={view === 'grid' ? 'active' : ''}
              aria-label={t('skills:viewGrid')}
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              ▦
            </button>
          </div>
        </div>
      </div>

      {filterActive && teamId && skills.length > 0 && (
        <div className="skills-count">{t('skills:matchCount', { count: filteredSkills.length })}</div>
      )}

      {renderBody()}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}

function SkillCard({ skill }: { skill: any }) {
  const navigate = useNavigate()
  return (
    <div
      className="skill-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/skills/${skill.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/skills/${skill.id}`)
        }
      }}
    >
      <div className="skill-card-header">
        <h3>{skill.displayName || skill.name}</h3>
        <Badge status={skill.status ?? 'draft'} />
      </div>
      <p className="skill-description">{skill.description}</p>
      <div className="skill-card-footer">
        <div className="skill-tags">
          {skill.tags?.slice(0, 3).map((tag: string) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        {skill.currentVersion != null && (
          <span className="skill-meta">v{skill.currentVersion}</span>
        )}
      </div>
    </div>
  )
}
