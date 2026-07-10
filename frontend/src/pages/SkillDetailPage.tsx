import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { skillApi } from '../api/api'
import { Badge } from '../components/common/Badge'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { Markdown } from '../components/common/Markdown'
import { useTranslation } from 'react-i18next'
import { useIdentity, type Identity } from '../app/useIdentity'
import { useCopyToTeam } from '../app/useCopyToTeam'
import { VersionDiffDialog } from '../components/version/VersionDiffDialog'
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
  | { action: 'restore'; version: number }
  | null

export function SkillDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const identity = useIdentity()
  const { copy, targetTeams, canCopyTeam } = useCopyToTeam(identity)

  const [skill, setSkill] = useState<Skill | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [versions, setVersions] = useState<Version[]>([])
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [diffVersion, setDiffVersion] = useState<number | null>(null)
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
      setActionError(t('detail:publishFailed') + (e.response?.data?.message || e.message))
    } finally {
      setBusy(false)
    }
  }

  async function doRestore(version: number) {
    if (!id) return
    setBusy(true)
    try {
      await skillApi.restoreVersion(id, version)
      await reload()
      await refreshVersions()
      setConfirm(null)
    } catch (e: any) {
      setActionError(t('detail:restoreFailed') + (e.response?.data?.message || e.message))
    } finally {
      setBusy(false)
    }
  }

  async function refreshVersions() {
    if (!id) return
    try {
      const res = await skillApi.getVersions(id)
      setVersions(res.data || [])
    } catch {
      /* keep existing list */
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
      setActionError(t('detail:unpublishFailed') + (e.response?.data?.message || e.message))
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
      setActionError(t('detail:likeFailed') + (e.response?.data?.message || e.message))
    }
  }

  async function doCopy(targetTeamId: string) {
    if (!id) return
    setBusy(true)
    try {
      const newSkill = await copy(id, targetTeamId)
      const newId = newSkill?.id
      setCopyTeam(null)
      if (newId) navigate(`/skills/${newId}`)
    } catch (e: any) {
      setActionError(t('detail:copyFailed') + (e.response?.data?.message || e.message))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="detail-loading">{t('common:loading')}</div>
  }

  if (notFound || !skill) {
    return (
      <div className="detail-notfound">
        <p className="detail-notfound-title">{t('detail:notFound')}</p>
        <p className="detail-notfound-hint">{t('detail:notFoundHint')}</p>
        <Link to="/team" className="btn-secondary">
          {t('detail:backToTeam')}
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
  // "複製到我的團隊" — only makes sense for a skill belonging to a team the
  // viewer is NOT already a member of (publishing never moves it out of its
  // home team, so a member already has it). Admin is not a real member.
  const canCopy = isOpenPublished && canCopyTeam(skill.teamId)
  const teamName =
    identity.teams.find((tm) => tm.id === skill.teamId)?.displayName ?? skill.teamId

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
          <h2 className="detail-section-title">{t('detail:info')}</h2>
          <dl>
            <dt>{t('detail:team')}</dt>
            <dd>{teamName}</dd>
            <dt>{t('detail:scope')}</dt>
            <dd>
              {skill.scope === 'open'
                ? isOpenPublished
                  ? t('detail:scopeTeamAndOpen')
                  : t('detail:scopeOpen')
                : t('detail:scopeTeam')}
            </dd>
            <dt>{t('detail:status')}</dt>
            <dd>
              <Badge status={skill.status} />
            </dd>
            <dt>{t('detail:version')}</dt>
            <dd>
              v{skill.currentVersion ?? 1}
              {frozenView && <span className="frozen-note">{t('detail:frozenTag')}</span>}
            </dd>
            <dt>{t('detail:lastEditor')}</dt>
            <dd>{skill.lastEditorId ?? '—'}</dd>
            <dt>{t('detail:updatedAt')}</dt>
            <dd>{fmtTime(skill.updatedAt)}</dd>
            {skill.tags && skill.tags.length > 0 && (
              <>
                <dt>{t('common:tags')}</dt>
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
            <span className="copy-cite">{t('detail:citeCount', { count: skill.copyCount ?? 0 })}</span>
          </div>
        </section>

        {(editable || canCopy) && (
          <section className="detail-actions">
            <h2 className="detail-section-title">{t('detail:actions')}</h2>
            {editable && (
              <Link to={`/skills/${skill.id}/edit`} className="btn-secondary detail-action">
                {t('detail:edit')}
              </Link>
            )}
            {editable && skill.status !== 'published' && (
              <button
                type="button"
                className="btn-primary detail-action"
                onClick={() => setConfirm({ action: 'publish' })}
              >
                {t('detail:publish')}
              </button>
            )}
            {editable && skill.status === 'published' && (
              <button
                type="button"
                className="btn-secondary detail-action"
                onClick={() => setConfirm({ action: 'unpublish' })}
              >
                {t('detail:unpublish')}
              </button>
            )}
            {hasUnpublishedChanges && (
              <div className="unpublished-hint">
                <p>{t('detail:unpublishedChanges', { version: skill.publishedVersion })}</p>
                <button
                  type="button"
                  className="btn-primary detail-action"
                  onClick={() => setConfirm({ action: 'publish' })}
                >
                  {t('detail:republish')}
                </button>
              </div>
            )}
            {canCopy && (
              <>
                <button
                  type="button"
                  className="btn-primary detail-action"
                  disabled={busy || targetTeams.length === 0}
                  title={targetTeams.length === 0 ? t('detail:copyNeedsEditor') : undefined}
                  onClick={() => {
                    if (targetTeams.length <= 1) {
                      const target = targetTeams[0]?.id
                      if (target) doCopy(target)
                    } else {
                      setCopyTeam(targetTeams[0].id)
                    }
                  }}
                >
                  {t('detail:copyToTeam')}
                </button>
                {targetTeams.length === 0 && (
                  <p className="detail-copy-hint">{t('detail:copyNeedsEditor')}</p>
                )}
              </>
            )}
          </section>
        )}

        <section className="detail-versions">
          <h2 className="detail-section-title">{t('detail:versionHistory')}</h2>
          {versions.length === 0 ? (
            <p className="detail-empty">{t('detail:noVersions')}</p>
          ) : (
            <ul className="version-list">
              {versions.map((v) => (
                <li key={v.version} className="version-row">
                  <span className="version-num">v{v.version}</span>
                  <span className="version-editor">{v.editorId}</span>
                  <span className="version-time">{fmtTime(v.createdAt)}</span>
                  {v.version !== skill.currentVersion && (
                    <div className="version-actions">
                      <button
                        type="button"
                        className="version-diff-btn"
                        onClick={() => setDiffVersion(v.version)}
                      >
                        {t('detail:viewDiff')}
                      </button>
                      {editable && (
                        <button
                          type="button"
                          className="version-restore"
                          onClick={() => setConfirm({ action: 'restore', version: v.version })}
                        >
                          {t('detail:restore')}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      {confirm?.action === 'publish' && (
        <ConfirmDialog
          title={t('detail:publishTitle')}
          message={t('detail:publishMsg')}
          confirmLabel={t('detail:publishConfirm')}
          busy={busy}
          onConfirm={doPublish}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.action === 'unpublish' && (
        <ConfirmDialog
          title={t('detail:unpublishTitle')}
          message={t('detail:unpublishMsg')}
          confirmLabel={t('detail:unpublishConfirm')}
          busy={busy}
          onConfirm={doUnpublish}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.action === 'restore' && (
        <ConfirmDialog
          title={t('detail:restoreTitle')}
          message={t('detail:restoreMsg', { version: confirm.version })}
          confirmLabel={t('detail:restore')}
          busy={busy}
          onConfirm={() => doRestore(confirm.version)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {diffVersion !== null && (
        <VersionDiffDialog
          skillId={id!}
          version={diffVersion}
          currentVersion={skill.currentVersion ?? 1}
          currentContent={skill.content}
          canRestore={editable}
          onClose={() => setDiffVersion(null)}
          onRestore={(version) => {
            setDiffVersion(null)
            setConfirm({ action: 'restore', version })
          }}
        />
      )}
      {copyTeam !== null && (
        <div className="detail-dialog-backdrop" role="dialog" aria-modal="true">
          <div className="detail-dialog">
            <h3>{t('detail:copyTitle')}</h3>
            <p>{t('detail:copyPickTeam')}</p>
            <select value={copyTeam} onChange={(e) => setCopyTeam(e.target.value)}>
              {targetTeams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.displayName}
                </option>
              ))}
            </select>
            <div className="detail-dialog-actions">
              <button type="button" className="btn-secondary" onClick={() => setCopyTeam(null)}>
                {t('common:cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => doCopy(copyTeam)}
              >
                {t('detail:copyConfirm')}
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
  const { t } = useTranslation()
  return (
    <div className="detail-dialog-backdrop" role="dialog" aria-modal="true">
      <div className="detail-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="detail-dialog-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            {t('common:cancel')}
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm} disabled={busy}>
            {busy ? t('detail:processing') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
