import { useState } from 'react'
import { folderApi } from '../../api/api'
import './FolderTree.css'

interface FolderNode {
  id: string
  name: string
  path: string
  children?: FolderNode[]
}

interface FolderTreeProps {
  folders: FolderNode[]
  selectedFolder: string | null
  onSelectFolder: (folderId: string | null) => void
  teamId?: string | null
}

export function FolderTree({ folders, selectedFolder, onSelectFolder, teamId }: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  function toggleExpand(folderId: string) {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  function renderFolder(folder: FolderNode, depth = 0) {
    const hasChildren = folder.children && folder.children.length > 0
    const isExpanded = expandedFolders.has(folder.id)
    const isSelected = selectedFolder === folder.id

    return (
      <div key={folder.id} className="folder-node">
        <div
          className={`folder-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => onSelectFolder(isSelected ? null : folder.id)}
        >
          {hasChildren && (
            <button
              className={`expand-btn ${isExpanded ? 'expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(folder.id)
              }}
            >
              ▶
            </button>
          )}
          <span className="folder-icon">📁</span>
          <span className="folder-name">{folder.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div className="folder-children">
            {folder.children!.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!folders || folders.length === 0) {
    return (
      <div className="folder-tree-empty">
        <p>尚無資料夾</p>
        <button
          className="btn-small"
          disabled={!teamId}
          title={!teamId ? '請先選擇團隊' : undefined}
          onClick={() => {
            if (!teamId) return
            const name = prompt('輸入資料夾名稱：')
            if (name) folderApi.create(name, teamId)
          }}
        >
          + 新增資料夾
        </button>
      </div>
    )
  }

  return (
    <div className="folder-tree">
      <div 
        className={`folder-item ${selectedFolder === null ? 'selected' : ''}`}
        onClick={() => onSelectFolder(null)}
      >
        <span className="folder-icon">📂</span>
        <span className="folder-name">全部 skill</span>
      </div>
      {folders.map(folder => renderFolder(folder))}
    </div>
  )
}
