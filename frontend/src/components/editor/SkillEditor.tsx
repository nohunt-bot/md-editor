import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { skillApi, getActiveTeamId, type CreateSkillData, type UpdateSkillData } from '../../api/api.ts'
import { MdxEditorWrapper, type MDXEditorMethods } from './MdxEditorWrapper'
import { ConflictDialog } from '../dialog/ConflictDialog'
import { Badge } from '../common/Badge'
import { ErrorBanner } from '../common/ErrorBanner'
import './SkillEditor.css'

interface Conflict {
  currentVersion: number
  currentContent: string
  currentEditorId: string
  message: string
}

export function SkillEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditing = !!id
  const editorRef = useRef<MDXEditorMethods>(null)
  
  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  // Phase 5.1 no-team guard: creating requires an active team (belt-and-braces
  // with the top-bar guard in App.tsx).
  const noTeam = !isEditing && !getActiveTeamId()
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    content: '',
    folderId: '',
    tags: [] as string[],
    commitMessage: '',
    currentVersion: 0,
    updatedAt: null as string | null
  })

  useEffect(() => {
    if (isEditing) {
      loadSkill()
    }
  }, [id])

  async function loadSkill() {
    if (!id) return
    try {
      const res = await skillApi.get(id)
      const skill = res.data
      setStatus(skill.status)
      setFormData({
        name: skill.name,
        displayName: skill.displayName || '',
        description: skill.description || '',
        content: skill.content,
        folderId: skill.folderId || '',
        tags: skill.tags || [],
        commitMessage: '',
        currentVersion: skill.currentVersion,
        updatedAt: skill.updatedAt
      })
    } catch (error) {
      console.error('Failed to load skill:', error)
      setError('無法載入 skill，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (noTeam) {
      setError('請先在左側選擇團隊，再建立 skill')
      return
    }
    if (!formData.name || !formData.content) {
      setError('名稱與內容為必填')
      return
    }

    setError(null)
    setSaving(true)
    try {
      if (isEditing && id) {
        const updateData: UpdateSkillData = {
          ...formData,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          expectedVersion: formData.currentVersion
        }
        await skillApi.update(id, updateData)
        // Back to the detail page they came from (F1: 儲存→詳情→發布).
        navigate(`/skills/${id}`)
        return
      } else {
        const createData: CreateSkillData = {
          name: formData.name,
          displayName: formData.displayName || undefined,
          description: formData.description || undefined,
          content: formData.content,
          // New skills are owned by the sidebar's active team (§F1).
          teamId: getActiveTeamId() || undefined,
          folderId: formData.folderId || undefined,
          tags: formData.tags.length > 0 ? formData.tags : undefined
        }
        const res = await skillApi.create(createData)
        // Land on the new skill's detail page, where the publish button
        // lives (PRD §7 F1 step 4) — not back on the list.
        navigate(`/skills/${res.data.id}`)
        return
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Optimistic lock conflict
        const data = error.response.data
        setConflict({
          currentVersion: data.currentVersion,
          currentContent: data.currentContent,
          currentEditorId: data.currentEditorId,
          message: data.message
        })
        setSaving(false)
        return  // Don't navigate away
      }
      console.error('Failed to save skill:', error)
      setError('儲存失敗：' + (error.response?.data?.message || error.message))
      setSaving(false)
    }
  }

  async function handleOverride() {
    if (!id) return
    setConflict(null)
    setSaving(true)
    try {
      const updateData: UpdateSkillData = {
        ...formData,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        expectedVersion: formData.currentVersion,
        forceUpdate: true
      }
      await skillApi.update(id, updateData)
      navigate(`/skills/${id}`)
    } catch (error: any) {
      console.error('Failed to force save:', error)
      setError('儲存失敗：' + (error.response?.data?.message || error.message))
    } finally {
      setSaving(false)
    }
  }

  function handleMerge(mergedContent: string) {
    setFormData(prev => ({ ...prev, content: mergedContent }))
    setConflict(null)
  }

  function handleAbandon() {
    setConflict(null)
    navigate(isEditing && id ? `/skills/${id}` : '/team')
  }

  function handleTagInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && e.currentTarget.value) {
      e.preventDefault()
      const newTag = e.currentTarget.value.trim()
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }))
      }
      e.currentTarget.value = ''
    }
  }

  function removeTag(tagToRemove: string) {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }))
  }

  if (loading) {
    return <div className="skill-editor loading">載入中…</div>
  }

  return (
    <div className="skill-editor">
      <div className="editor-header">
        <button
          className="btn-back"
          onClick={() => navigate(isEditing && id ? `/skills/${id}` : '/team')}
        >
          ← 返回
        </button>
        <h1>
          {isEditing ? '編輯 Skill' : '建立 Skill'}
          {isEditing && <Badge status={status} />}
        </h1>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || noTeam}
          title={noTeam ? '請先在左側選擇團隊' : undefined}
        >
          {saving ? '儲存中…' : '儲存'}
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      {noTeam && <ErrorBanner message="請先在左側選擇團隊，再建立 skill" />}

      <div className="editor-content">
        <div className="editor-main">
          <div className="form-group">
            <label htmlFor="name">名稱 *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例：github-pr-workflow"
            />
            <small>唯一識別（小寫、連字號；團隊內不可重複）</small>
          </div>

          <div className="form-group">
            <label htmlFor="displayName">顯示名稱</label>
            <input
              id="displayName"
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="例：GitHub PR 工作流程"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">描述</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="這個 skill 的簡短說明"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">內容（Markdown）*</label>
            <MdxEditorWrapper
              ref={editorRef}
              markdown={formData.content}
              onChange={(markdown) => setFormData(prev => ({ ...prev, content: markdown }))}
            />
            <small>支援 Markdown；code block 用 ```language。</small>
          </div>
        </div>

        <aside className="editor-sidebar">
          <div className="form-group">
            <label>標籤</label>
            <div className="tags-input-container">
              <div className="tags-list">
                {formData.tags.map(tag => (
                  <span key={tag} className="tag">
                    {tag}
                    <button onClick={() => removeTag(tag)}>×</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="輸入標籤後按 Enter"
                onKeyDown={handleTagInput}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="folderId">資料夾</label>
            <select
              id="folderId"
              value={formData.folderId}
              onChange={(e) => setFormData(prev => ({ ...prev, folderId: e.target.value }))}
            >
              <option value="">未分類</option>
              {/* TODO: Load and display folder options */}
            </select>
          </div>

          {isEditing && (
            <div className="form-group">
              <label htmlFor="commitMessage">版本說明</label>
              <input
                id="commitMessage"
                type="text"
                value={formData.commitMessage}
                onChange={(e) => setFormData(prev => ({ ...prev, commitMessage: e.target.value }))}
                placeholder="描述這次的變更…"
              />
            </div>
          )}

          <div className="editor-info">
            <h4>小提示</h4>
            <ul>
              <li>章節用 <code># 標題</code></li>
              <li>程式碼區塊：<code>```language</code></li>
              <li>清單：<code>- 項目</code> 或 <code>1. 項目</code></li>
            </ul>
          </div>
        </aside>
      </div>

      {conflict && (
        <ConflictDialog
          newContent={formData.content}
          currentContent={conflict.currentContent}
          currentVersion={conflict.currentVersion}
          currentEditorId={conflict.currentEditorId}
          message={conflict.message}
          onOverride={handleOverride}
          onMerge={handleMerge}
          onAbandon={handleAbandon}
        />
      )}
    </div>
  )
}
