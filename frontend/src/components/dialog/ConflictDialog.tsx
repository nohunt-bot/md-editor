import { useState } from 'react'
import ReactDiffViewer from 'react-diff-viewer-continued'
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

  return (
    <div className="conflict-dialog-overlay">
      <div className="conflict-dialog">
        <div className="conflict-header">
          <h2>⚠️ Edit Conflict Detected</h2>
          <p className="conflict-message">{message}</p>
        </div>

        <div className="conflict-info">
          <p>
            <strong>Version:</strong> {currentVersion} (by {currentEditorId})
          </p>
          <p>
            This skill was modified while you were editing. Please review the changes below.
          </p>
        </div>

        <div className="conflict-actions">
          <button onClick={() => setShowDiff(!showDiff)}>
            {showDiff ? 'Hide Diff' : 'Show Diff'}
          </button>
        </div>

        {showDiff && (
          <div className="conflict-diff">
            <ReactDiffViewer
              oldValue={currentContent}
              newValue={newContent}
              splitView={true}
              leftTitle={`Server (v${currentVersion})`}
              rightTitle="Your changes"
              useDarkTheme={true}
            />
          </div>
        )}

        <div className="conflict-actions">
          <button 
            className="btn-override" 
            onClick={onOverride}
          >
            Override (Force Save)
          </button>
          <button 
            className="btn-merge" 
            onClick={() => onMerge(currentContent)}
          >
            Use Server Version
          </button>
          <button 
            className="btn-abandon" 
            onClick={onAbandon}
          >
            Abandon Changes
          </button>
        </div>
      </div>
    </div>
  )
}
