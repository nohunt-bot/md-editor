import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { skillApi } from '../api/api'
import { useTeamFilter } from '../app/TeamFilterContext'
import { Badge } from '../components/common/Badge'
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
  const { selectedFolder, selectedTag } = useTeamFilter()
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState<View>(readView)

  const teamId = identity.activeTeamId

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view)
  }, [view])

  useEffect(() => {
    if (!teamId) {
      setSkills([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    skillApi
      .list(teamId)
      .then((res) => {
        if (!cancelled) setSkills(res.data.content || [])
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
  }, [teamId])

  const filterActive = Boolean(selectedFolder || selectedTag || searchQuery)

  const filteredSkills = skills.filter((skill) => {
    const matchFolder = !selectedFolder || skill.folderId === selectedFolder
    const matchTag = !selectedTag || skill.tags?.includes(selectedTag)
    const matchSearch =
      !searchQuery ||
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchFolder && matchTag && matchSearch
  })

  function renderBody() {
    // (a) no team selected
    if (!teamId) {
      return (
        <div className="empty-state">
          <p className="empty-state-title">選擇一個團隊</p>
          <p className="empty-state-hint">從左側切換團隊以檢視其 skill。</p>
        </div>
      )
    }
    if (loading) {
      return <div className="loading">載入中…</div>
    }
    // (b) team selected but zero skills at all
    if (skills.length === 0) {
      return (
        <div className="empty-state">
          <p className="empty-state-title">建立第一個 skill</p>
          <p className="empty-state-hint">這個團隊還沒有任何 skill。</p>
          <Link to="/skills/new" className="btn-primary">
            + 建立 skill
          </Link>
        </div>
      )
    }
    // (c) filter active but no match
    if (filteredSkills.length === 0) {
      return (
        <div className="empty-state">
          <p className="empty-state-title">沒有符合的 skill</p>
          <p className="empty-state-hint">試試放寬篩選。</p>
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
        <h1>{identity.activeTeam?.displayName || '團隊'} Skills</h1>
        <div className="skills-actions">
          <input
            type="text"
            className="search-input"
            placeholder="篩選 skill…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="view-toggle" role="group" aria-label="檢視模式">
            <button
              type="button"
              className={view === 'list' ? 'active' : ''}
              aria-label="清單檢視"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              ☰
            </button>
            <button
              type="button"
              className={view === 'grid' ? 'active' : ''}
              aria-label="格狀檢視"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              ▦
            </button>
          </div>
        </div>
      </div>

      {filterActive && teamId && skills.length > 0 && (
        <div className="skills-count">共 {filteredSkills.length} 個符合</div>
      )}

      {renderBody()}
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
