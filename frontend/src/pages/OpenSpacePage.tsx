import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { skillApi } from '../api/api'

// Minimal open-space browse (§6.4). The richer version (latest-published
// sort, tag chips, source-team meta) is Phase 3.1 — TODO(3.1).
export function OpenSpacePage() {
  const [params] = useSearchParams()
  const q = params.get('q') || undefined
  const [skills, setSkills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    skillApi
      .listOpen({ q })
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
  }, [q])

  return (
    <div className="page">
      <div className="page-header">
        <h1>開放空間</h1>
      </div>

      {loading ? (
        <div className="loading">載入中…</div>
      ) : skills.length === 0 ? (
        <div className="empty-state">
          <p>還沒有團隊發布 skill</p>
        </div>
      ) : (
        <ul className="open-list">
          {skills.map((skill) => (
            <li key={skill.id} className="open-row">
              <Link to={`/skills/${skill.id}`} className="open-row-title">
                {skill.displayName || skill.name}
              </Link>
              {skill.description && <p className="open-row-desc">{skill.description}</p>}
              <div className="open-row-meta">
                {skill.teamDisplayName || skill.teamId}
                {skill.publishedAt && ` · ${new Date(skill.publishedAt).toLocaleDateString()}`}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
