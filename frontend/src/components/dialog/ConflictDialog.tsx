import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactDiffViewer from 'react-diff-viewer-continued'
import { useResolvedTheme } from '../../app/useTheme'
import './ConflictDialog.css'

interface ConflictDialogProps {
  newContent: string
  currentContent: string
  currentVersion: number
  currentEditorId: string
  message: string
  onOverride: () => void
  onMerge: (mergedContent: string) => void
  onAbandon: () => void
}

export function ConflictDialog({
  newContent,
  currentContent,
  currentVersion,
  currentEditorId,
  message,
  onOverride,
  onMerge,
  onAbandon
}: ConflictDialogProps) {
  const [showDiff, setShowDiff] = useState(true)
  const { t } = useTranslation()
  const resolvedTheme = useResolvedTheme()

  return (
    <div className="conflict-dialog-overlay">
      <div className="conflict-dialog">
        <div className="conflict-header">
          <h2>{t('conflict:title')}</h2>
          <p className="conflict-message">{message}</p>
        </div>

        <div className="conflict-info">
          <p>
            <strong>{t('conflict:version')}</strong>v{currentVersion}（{t('conflict:by', { editor: currentEditorId })}）
          </p>
          <p>{t('conflict:body')}</p>
        </div>

        <div className="conflict-actions">
          <button onClick={() => setShowDiff(!showDiff)}>
            {showDiff ? t('conflict:hideDiff') : t('conflict:showDiff')}
          </button>
        </div>

        {showDiff && (
          <div className="conflict-diff">
            <ReactDiffViewer
              oldValue={currentContent}
              newValue={newContent}
              splitView={true}
              leftTitle={t('conflict:serverTitle', { version: currentVersion })}
              rightTitle={t('conflict:yourChanges')}
              useDarkTheme={resolvedTheme === 'dark'}
            />
          </div>
        )}

        <div className="conflict-actions">
          <button className="btn-override" onClick={onOverride}>
            {t('conflict:override')}
          </button>
          <button className="btn-merge" onClick={() => onMerge(currentContent)}>
            {t('conflict:useServer')}
          </button>
          <button className="btn-abandon" onClick={onAbandon}>
            {t('conflict:abandon')}
          </button>
        </div>
      </div>
    </div>
  )
}
