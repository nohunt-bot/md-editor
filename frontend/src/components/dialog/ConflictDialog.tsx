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
          <h2>⚠️ 偵測到編輯衝突</h2>
          <p className="conflict-message">{message}</p>
        </div>

        <div className="conflict-info">
          <p>
            <strong>版本：</strong>v{currentVersion}（由 {currentEditorId}）
          </p>
          <p>
            這份 skill 在你編輯期間被修改了，請檢視下方差異後再決定。
          </p>
        </div>

        <div className="conflict-actions">
          <button onClick={() => setShowDiff(!showDiff)}>
            {showDiff ? '隱藏差異' : '顯示差異'}
          </button>
        </div>

        {showDiff && (
          <div className="conflict-diff">
            <ReactDiffViewer
              oldValue={currentContent}
              newValue={newContent}
              splitView={true}
              leftTitle={`伺服器（v${currentVersion}）`}
              rightTitle="你的變更"
              useDarkTheme={true}
            />
          </div>
        )}

        <div className="conflict-actions">
          <button
            className="btn-override"
            onClick={onOverride}
          >
            覆蓋（強制儲存）
          </button>
          <button
            className="btn-merge"
            onClick={() => onMerge(currentContent)}
          >
            改用伺服器版本
          </button>
          <button
            className="btn-abandon"
            onClick={onAbandon}
          >
            放棄變更
          </button>
        </div>
      </div>
    </div>
  )
}
