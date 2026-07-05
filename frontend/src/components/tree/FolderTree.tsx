import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FolderIcon } from './FolderIcon'
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
}

export function FolderTree({ folders, selectedFolder, onSelectFolder }: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Selecting a folder filters the team list AND takes you there — clicking a
  // folder from /open or /settings previously did nothing visible.
  function selectFolder(folderId: string | null) {
    onSelectFolder(folderId)
    navigate('/team')
  }

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
          onClick={() => selectFolder(isSelected ? null : folder.id)}
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
          <span className="folder-icon">
            <FolderIcon open={isSelected} />
          </span>
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
    // Create moved to the sidebar (NewFolderModal); this is display-only now.
    return (
      <div className="folder-tree-empty">
        <p>{t('folders:none')}</p>
      </div>
    )
  }

  return (
    <div className="folder-tree">
      <div
        className={`folder-item ${selectedFolder === null ? 'selected' : ''}`}
        onClick={() => selectFolder(null)}
      >
        <span className="folder-icon">
          <FolderIcon open={selectedFolder === null} />
        </span>
        <span className="folder-name">{t('folders:allSkills')}</span>
      </div>
      {folders.map(folder => renderFolder(folder))}
    </div>
  )
}
