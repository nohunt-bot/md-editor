import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactDiffViewer from 'react-diff-viewer-continued'
import { skillApi } from '../../api/api'
import './VersionDiffDialog.css'

interface VersionDiffDialogProps {
  skillId: string
  version: number
  currentVersion: number
  currentContent: string
  canRestore: boolean
  onClose: () => void
  onRestore: (version: number) => void
}

// F4: version-history diff viewer. Left = the selected past version's
// snapshot content (fetched on open via skillApi.getVersion), right = the
// skill's current content. ReactDiffViewer usage + dark-theme handling
// imitate ConflictDialog.tsx; the "還原到此版本" button hands off to the
// page's existing restore-confirmation flow rather than restoring directly.
export function VersionDiffDialog({
  skillId,
  version,
  currentVersion,
  currentContent,
  canRestore,
  onClose,
  onRestore,
}: VersionDiffDialogProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [versionContent, setVersionContent] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    skillApi
      .getVersion(skillId, version)
      .then((res) => {
        if (cancelled) return
        setVersionContent(res.data?.snapshot?.content ?? '')
      })
      .catch((e: any) => {
        if (cancelled) return
        setError(t('detail:diffLoadFailed') + (e.response?.data?.message || e.message))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [skillId, version, t])

  return (
    <div className="version-diff-overlay" role="dialog" aria-modal="true">
      <div className="version-diff-dialog">
        <div className="version-diff-header">
          <h2>{t('detail:diffTitle', { version })}</h2>
        </div>

        {loading && <p className="version-diff-loading">{t('common:loading')}</p>}
        {error && <p className="version-diff-error">{error}</p>}

        {!loading && !error && (
          <div className="version-diff-body">
            <ReactDiffViewer
              oldValue={versionContent}
              newValue={currentContent}
              splitView={true}
              leftTitle={t('detail:diffOldLabel', { version })}
              rightTitle={t('detail:diffCurrentLabel', { version: currentVersion })}
              useDarkTheme={true}
            />
          </div>
        )}

        <div className="version-diff-actions">
          {canRestore && (
            <button
              type="button"
              className="btn-restore-version"
              onClick={() => onRestore(version)}
            >
              {t('detail:diffRestore')}
            </button>
          )}
          <button type="button" onClick={onClose}>
            {t('common:close')}
          </button>
        </div>
      </div>
    </div>
  )
}
