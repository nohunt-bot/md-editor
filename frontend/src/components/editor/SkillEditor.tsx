import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { skillApi, getActiveTeamId, type CreateSkillData, type UpdateSkillData } from '../../api/api.ts'
import { MdxEditorWrapper, type MDXEditorMethods } from './MdxEditorWrapper'
import { ConflictDialog } from '../dialog/ConflictDialog'
import { Badge } from '../common/Badge'
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
      alert('Failed to load skill')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!formData.name || !formData.content) {
      alert('Name and content are required')
      return
    }

    setSaving(true)
    try {
      if (isEditing && id) {
        const updateData: UpdateSkillData = {
          ...formData,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
          expectedVersion: formData.currentVersion
        }
        await skillApi.update(id, updateData)
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
        await skillApi.create(createData)
      }
      navigate('/team')
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
      alert('Failed to save: ' + (error.response?.data?.message || error.message))
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
      navigate('/team')
    } catch (error: any) {
      console.error('Failed to force save:', error)
      alert('Failed to save: ' + (error.response?.data?.message || error.message))
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
    navigate('/team')
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
    return <div className="skill-editor loading">Loading...</div>
  }

  return (
    <div className="skill-editor">
      <div className="editor-header">
        <button className="btn-back" onClick={() => navigate('/team')}>← Back</button>
        <h1>
          {isEditing ? 'Edit Skill' : 'Create New Skill'}
          {isEditing && <Badge status={status} />}
        </h1>
        <button 
          className="btn-primary" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="editor-content">
        <div className="editor-main">
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., hermes-agent, github-pr-workflow"
            />
            <small>Unique identifier (lowercase, hyphens)</small>
          </div>

          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="e.g., Hermes Agent Configuration"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this skill"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Content (Markdown) *</label>
            <MdxEditorWrapper
              ref={editorRef}
              markdown={formData.content}
              onChange={(markdown) => setFormData(prev => ({ ...prev, content: markdown }))}
            />
            <small>Markdown supported. Use @skill-name to reference other skills.</small>
          </div>
        </div>

        <aside className="editor-sidebar">
          <div className="form-group">
            <label>Tags</label>
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
                placeholder="Add tag + Enter"
                onKeyDown={handleTagInput}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="folderId">Folder</label>
            <select
              id="folderId"
              value={formData.folderId}
              onChange={(e) => setFormData(prev => ({ ...prev, folderId: e.target.value }))}
            >
              <option value="">No folder</option>
              {/* TODO: Load and display folder options */}
            </select>
          </div>

          {isEditing && (
            <div className="form-group">
              <label htmlFor="commitMessage">Commit Message</label>
              <input
                id="commitMessage"
                type="text"
                value={formData.commitMessage}
                onChange={(e) => setFormData(prev => ({ ...prev, commitMessage: e.target.value }))}
                placeholder="Describe your changes..."
              />
            </div>
          )}

          <div className="editor-info">
            <h4>Tips</h4>
            <ul>
              <li>Use <code># Heading</code> for sections</li>
              <li>Use <code>@skill-name</code> to reference other skills</li>
              <li>Code blocks: <code>```language</code></li>
              <li>Lists: <code>- item</code> or <code>1. item</code></li>
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
