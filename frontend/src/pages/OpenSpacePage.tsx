import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { skillApi, tagApi } from '../api/api'
import { Pagination } from '../components/common/Pagination'
import './OpenSpacePage.css'

// Phase 3.1: open-space browse. Latest-published cards (backend sorts by
// publishedAt desc), tag-chip filter, and honours ?q / ?tag from the URL so
// the global search and tag links land here. All rows are open+published, so
// provenance (source team + published date) is what the card foregrounds.

type OpenSkill = {
  id: string
  name: string
  displayName?: string
  description?: string
  teamId: string
  teamDisplayName?: string
  publishedAt?: string
  tags?: string[]
}

export function OpenSpacePage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') || undefined
  const tag = params.get('tag') || undefined

  const [skills, setSkills] = useState<OpenSkill[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  // Phase A (v2): server-side pagination; filter changes reset to page 0.
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setPage(0)
  }, [q, tag])

  useEffect(() => {
    tagApi
      .list()
      .then((res) => setTags((res.data || []).map((t: any) => t.name ?? t)))
      .catch(() => setTags([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    skillApi
      .listOpen({ q, tag, page })
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
  }, [q, tag, page])

  function selectTag(next?: string) {
    const p = new URLSearchParams(params)
    if (!next || next === tag) p.delete('tag')
    else p.set('tag', next)
    setParams(p, { replace: true })
  }

  const filtering = Boolean(q || tag)

  return (
    <div className="page open-space">
      <div className="page-header">
        <h1>開放空間</h1>
        {q && <span className="open-space-q">搜尋：「{q}」</span>}
      </div>

      {tags.length > 0 && (
        <div className="open-space-tags">
          <button
            className={`tag-chip ${!tag ? 'active' : ''}`}
            onClick={() => selectTag(undefined)}
          >
            全部
          </button>
          {tags.map((t) => (
            <button
              key={t}
              className={`tag-chip ${tag === t ? 'active' : ''}`}
              onClick={() => selectTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="empty-state">載入中…</div>
      ) : skills.length === 0 ? (
        <div className="empty-state">
          <p>{filtering ? '沒有符合的 skill，試試放寬篩選' : '還沒有團隊發布 skill'}</p>
        </div>
      ) : (
        <div className="open-grid">
          {skills.map((skill) => (
            <article
              key={skill.id}
              className="open-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/skills/${skill.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(`/skills/${skill.id}`)
              }}
            >
              <h2 className="open-card-title">{skill.displayName || skill.name}</h2>
              {skill.description && <p className="open-card-desc">{skill.description}</p>}
              {skill.tags && skill.tags.length > 0 && (
                <div className="open-card-tags">
                  {skill.tags.map((t) => (
                    <span key={t} className="tag">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="open-card-meta">
                <span className="open-card-team">{skill.teamDisplayName || skill.teamId}</span>
                {skill.publishedAt && (
                  <span className="open-card-date">
                    {new Date(skill.publishedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  )
}
