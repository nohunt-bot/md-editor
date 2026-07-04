import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { skillApi } from '../api/api'
import { useTeamFilter } from '../app/TeamFilterContext'
import type { Identity } from '../app/useIdentity'
import './SkillsPage.css'

// The team skill list (§6.4). Folder/tag filters live in the shell sidebar and
// are shared via TeamFilterContext. Card restyle is Phase 2.3 — TODO(2.3).
export function SkillsPage({ identity }: { identity: Identity }) {
  const { selectedFolder, selectedTag } = useTeamFilter()
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const teamId = identity.activeTeamId

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
        </div>
      </div>

      {!teamId ? (
        <div className="empty-state">
          <p>選擇一個團隊以檢視 skill</p>
        </div>
      ) : loading ? (
        <div className="loading">載入中…</div>
      ) : filteredSkills.length === 0 ? (
        <div className="empty-state">
          <p>還沒有 skill</p>
          <Link to="/skills/new" className="btn-primary">
            建立第一個 Skill
          </Link>
        </div>
      ) : (
        <div className="skills-list list">
          {filteredSkills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  )
}

function SkillCard({ skill }: { skill: any }) {
  return (
    <div className="skill-card">
      <div className="skill-card-header">
        <h3>{skill.displayName || skill.name}</h3>
        <div className="skill-tags">
          {skill.tags?.slice(0, 3).map((tag: string) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <p className="skill-description">{skill.description}</p>
      <div className="skill-card-footer">
        <span className="skill-meta">v{skill.currentVersion}</span>
        {skill.status && <span className={`badge badge-${skill.status}`}>{skill.status}</span>}
        <Link to={`/skills/${skill.id}`} className="btn-link">
          檢視 →
        </Link>
      </div>
    </div>
  )
}
