import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { skillApi } from '../api/api'
import { Badge } from '../components/common/Badge'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { Markdown } from '../components/common/Markdown'
import { useIdentity, type Identity } from '../app/useIdentity'
import './SkillDetailPage.css'

// §6.4 detail: two columns. Left = rendered markdown; right = metadata + a
// permission-gated actions block (§2.3) + version history. Data: GET
// /api/skills/{id}; 404 → clean 「找不到或無權限」state.

type Skill = {
  id: string
  name: string
  displayName?: string
  description?: string
  content: string
  teamId: string
  scope: string
  status: string
  currentVersion?: number
  publishedVersion?: number // Phase B (v2): version frozen at last publish
  likeCount?: number // Phase C (v2)
  copyCount?: number // Phase C (v2)
  likedByMe?: boolean // Phase C (v2)
  lastEditorId?: string
  updatedAt?: string
  tags?: string[]
}

type Version = {
  version: number
  editorId: string
  createdAt: string
  commitMessage?: string
}

// canEdit(teamId): the caller is EDITOR of that team, or a global admin (§2.3).
// Role serialises from the Java enum as 'EDITOR'/'VIEWER'; compare uppercased.
function canEdit(identity: Identity, teamId?: string): boolean {
  if (identity.admin) return true
  if (!teamId) return false
  const membership = identity.teams.find((t) => t.id === teamId)
  return (membership?.role ?? '').toUpperCase() === 'EDITOR'
}

function fmtTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

type Confirm =
  | { action: 'publish' }
  | { action: 'unpublish' }
  | null

export function SkillDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const identity = useIdentity()

  const [skill, setSkill] = useState<Skill | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [busy, setBusy] = useState(false)
  const [copyTeam, setCopyTeam] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  // Phase C (v2): like state, seeded from the detail response.
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    skillApi
      .get(id)
      .then((res) => {
        if (cancelled) return
        setSkill(res.data)
        setLiked(Boolean(res.data.likedByMe))
        setLikeCount(res.data.likeCount ?? 0)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!id || !skill) return
    let cancelled = false
    skillApi
      .getVersions(id)
      .then((res) => {
        if (!cancelled) setVersions(res.data || [])
      })
      .catch(() => {
        if (!cancelled) setVersions([])
      })
    return () => {
      cancelled = true
    }
  }, [id, skill])

  async function reload() {
    if (!id) return
    const res = await skillApi.get(id)
    setSkill(res.data)
  }

  async function doPublish() {
    if (!id) return
    setBusy(true)
    try {
      await skillApi.publish(id)
      await reload()
      setConfirm(null)
    } catch (e: any) {
      setActionError('發布失敗：' + (e.response?.data?.message || e.message))
    } finally {
      setBusy(false)
    }
  }

  async function doUnpublish() {
    if (!id) return
    setBusy(true)
    try {
      await skillApi.unpublish(id)
      await reload()
      setConfirm(null)
    } catch (e: any) {
      setActionError('下架失敗：' + (e.response?.data?.message || e.message))
    } finally {
      setBusy(false)
    }
  }

  async function toggleLike() {
    if (!id) return
    try {
      const res = liked ? await skillApi.unlike(id) : await skillApi.like(id)
      setLiked(res.data.likedByMe)
      setLikeCount(res.data.likeCount)
    } catch (e: any) {
      setActionError('操作失敗：' + (e.response?.data?.message || e.message))
    }
  }

  async function doCopy(targetTeamId: string) {
    if (!id) return
    setBusy(true)
    try {
      const res = await skillApi.copyToTeam(id, targetTeamId)
      const newId = res.data?.id
      setCopyTeam(null)
      if (newId) navigate(`/skills/${newId}`)
    } catch (e: any) {
      setActionError('複製失敗：' + (e.response?.data?.message || e.message))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="detail-loading">載入中…</div>
  }

  if (notFound || !skill) {
    return (
      <div className="detail-notfound">
        <p className="detail-notfound-title">找不到或無權限</p>
        <p className="detail-notfound-hint">此 skill 不存在，或你沒有檢視權限。</p>
        <Link to="/team" className="btn-secondary">
          回到團隊
        </Link>
      </div>
    )
  }

  const editable = canEdit(identity, skill.teamId)
  const isOpenPublished = skill.scope === 'open' && skill.status === 'published'
  // Phase B (v2): the team edited after publishing — the open space still
  // shows the frozen snapshot until re-publish.
  const hasUnpublishedChanges =
    editable &&
    skill.status === 'published' &&
    skill.publishedVersion != null &&
    (skill.currentVersion ?? 1) > skill.publishedVersion
  // Non-members of a published skill are looking at the frozen view.
  const frozenView = !editable && isOpenPublished && skill.publishedVersion != null
  // "複製到我的團隊" — any authenticated viewer of an open+published skill (§2.3).
  const canCopy = isOpenPublished && Boolean(identity.userId)
  // Teams the caller may copy into (editor or admin). Admin sees all teams.
  const targetTeams = identity.teams.filter((t) => canEdit(identity, t.id))
  const teamName =
    identity.teams.find((t) => t.id === skill.teamId)?.displayName ?? skill.teamId

  return (
    <div className="skill-detail-wrap">
      <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
      <div className="skill-detail">
      <article className="detail-reading">
        <h1 className="detail-title">{skill.displayName || skill.name}</h1>
        {skill.description && <p className="detail-desc">{skill.description}</p>}
        <Markdown content={skill.content} />
      </article>

      <aside className="detail-sidebar">
        <section className="detail-meta">
          <h2 className="detail-section-title">資訊</h2>
          <dl>
            <dt>團隊</dt>
            <dd>{teamName}</dd>
            <dt>範圍</dt>
            <dd>{skill.scope === 'open' ? '開放空間' : '團隊'}</dd>
            <dt>狀態</dt>
            <dd>
              <Badge status={skill.status} />
            </dd>
            <dt>版本</dt>
            <dd>
              v{skill.currentVersion ?? 1}
              {frozenView && <span className="frozen-note">（發布版）</span>}
            </dd>
            <dt>最後編輯</dt>
            <dd>{skill.lastEditorId ?? '—'}</dd>
            <dt>更新時間</dt>
            <dd>{fmtTime(skill.updatedAt)}</dd>
            {skill.tags && skill.tags.length > 0 && (
              <>
                <dt>標籤</dt>
                <dd className="detail-tags">
                  {skill.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </dd>
              </>
            )}
          </dl>
          <div className="like-row">
            <button
              type="button"
              className={`like-btn ${liked ? 'liked' : ''}`}
              aria-pressed={liked}
              onClick={toggleLike}
            >
              {liked ? '♥' : '♡'} {likeCount}
            </button>
            <span className="copy-cite">引用 {skill.copyCount ?? 0} 次</span>
          </div>
        </section>

        {(editable || canCopy) && (
          <section className="detail-actions">
            <h2 className="detail-section-title">動作</h2>
            {editable && (
              <Link to={`/skills/${skill.id}/edit`} className="btn-secondary detail-action">
                編輯
              </Link>
            )}
            {editable && skill.status !== 'published' && (
              <button
                type="button"
                className="btn-primary detail-action"
                onClick={() => setConfirm({ action: 'publish' })}
              >
                發布到開放空間
              </button>
            )}
            {editable && skill.status === 'published' && (
              <button
                type="button"
                className="btn-secondary detail-action"
                onClick={() => setConfirm({ action: 'unpublish' })}
              >
                從開放空間下架
              </button>
            )}
            {hasUnpublishedChanges && (
              <div className="unpublished-hint">
                <p>
                  有未發布的更新（開放空間仍顯示 v{skill.publishedVersion}）
                </p>
                <button
                  type="button"
                  className="btn-primary detail-action"
                  onClick={() => setConfirm({ action: 'publish' })}
                >
                  重新發布
                </button>
              </div>
            )}
            {canCopy && (
              <button
                type="button"
                className="btn-primary detail-action"
                disabled={busy || targetTeams.length === 0}
                onClick={() => {
                  if (targetTeams.length <= 1) {
                    const target = targetTeams[0]?.id
                    if (target) doCopy(target)
                  } else {
                    setCopyTeam(targetTeams[0].id)
                  }
                }}
              >
                複製到我的團隊
              </button>
            )}
          </section>
        )}

        <section className="detail-versions">
          <h2 className="detail-section-title">版本歷史</h2>
          {versions.length === 0 ? (
            <p className="detail-empty">尚無版本紀錄。</p>
          ) : (
            <ul className="version-list">
              {versions.map((v) => (
                <li key={v.version} className="version-row">
                  <span className="version-num">v{v.version}</span>
                  <span className="version-editor">{v.editorId}</span>
                  <span className="version-time">{fmtTime(v.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          {/* TODO(2.x): version restore (canEdit only) — POST
              /api/skills/{id}/versions/{v}/restore. Not wired this phase;
              VersionController's X-User-Id restore handler left untouched. */}
        </section>
      </aside>

      {confirm?.action === 'publish' && (
        <ConfirmDialog
          title="發布到開放空間"
          message="發布後此 skill 將全公司可見。確定要發布嗎？"
          confirmLabel="發布"
          busy={busy}
          onConfirm={doPublish}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.action === 'unpublish' && (
        <ConfirmDialog
          title="從開放空間下架"
          message="下架後其他團隊已複製的副本不受影響。確定要下架嗎？"
          confirmLabel="下架"
          busy={busy}
          onConfirm={doUnpublish}
          onCancel={() => setConfirm(null)}
        />
      )}
      {copyTeam !== null && (
        <div className="detail-dialog-backdrop" role="dialog" aria-modal="true">
          <div className="detail-dialog">
            <h3>複製到我的團隊</h3>
            <p>選擇目標團隊：</p>
            <select value={copyTeam} onChange={(e) => setCopyTeam(e.target.value)}>
              {targetTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.displayName}
                </option>
              ))}
            </select>
            <div className="detail-dialog-actions">
              <button type="button" className="btn-secondary" onClick={() => setCopyTeam(null)}>
                取消
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => doCopy(copyTeam)}
              >
                複製
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="detail-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="detail-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="detail-dialog-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            取消
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? '處理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
