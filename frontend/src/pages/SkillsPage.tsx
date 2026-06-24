import { useState, useEffect } from 'react'
import { skillApi, folderApi, tagApi, type CreateSkillData } from '../api/api'
import { SkillEditor } from '../components/editor/SkillEditor'
import { FolderTree } from '../components/tree/FolderTree'
import './SkillsPage.css'

export function SkillsPage() {
  const [skills, setSkills] = useState<any[]>([])
  const [folders, setFolders] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [skillsRes, foldersRes, tagsRes] = await Promise.all([
        skillApi.list(),
        folderApi.getTree(),
        tagApi.list()
      ])
      setSkills(skillsRes.data.content || [])
      setFolders(foldersRes.data)
      setTags(tagsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSkills = skills.filter(skill => {
    const matchFolder = !selectedFolder || skill.folderId === selectedFolder
    const matchTag = !selectedTag || skill.tags?.includes(selectedTag)
    const matchSearch = !searchQuery || 
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchFolder && matchTag && matchSearch
  })

  return (
    <div className="skills-page">
      <aside className="sidebar">
        <div className="sidebar-section">
          <h3>Folders</h3>
          <FolderTree 
            folders={folders}
            selectedFolder={selectedFolder}
            onSelectFolder={setSelectedFolder}
          />
        </div>
        <div className="sidebar-section">
          <h3>Tags</h3>
          <div className="tag-list">
            <button
              className={`tag-item ${!selectedTag ? 'active' : ''}`}
              onClick={() => setSelectedTag(null)}
            >
              All Tags
            </button>
            {tags.map(tag => (
              <button
                key={tag.id}
                className={`tag-item ${selectedTag === tag.name ? 'active' : ''}`}
                onClick={() => setSelectedTag(tag.name)}
                style={{ borderLeftColor: tag.color }}
              >
                {tag.name} ({tag.usageCount})
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="skills-main">
        <div className="skills-header">
          <h1>Skills</h1>
          <div className="skills-actions">
            <input
              type="text"
              className="search-input"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="view-toggle">
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
              >
                ☰
              </button>
              <button
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
              >
                ⊞
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading skills...</div>
        ) : filteredSkills.length === 0 ? (
          <div className="empty-state">
            <p>No skills found</p>
            <button className="btn-primary" onClick={() => window.location.href = '/skills/new'}>
              Create First Skill
            </button>
          </div>
        ) : (
          <div className={`skills-list ${viewMode}`}>
            {filteredSkills.map(skill => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function SkillCard({ skill }: { skill: any }) {
  return (
    <div className="skill-card">
      <div className="skill-card-header">
        <h3>{skill.displayName || skill.name}</h3>
        <div className="skill-tags">
          {skill.tags?.slice(0, 3).map((tag: string) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </div>
      <p className="skill-description">{skill.description}</p>
      <div className="skill-card-footer">
        <span className="skill-meta">v{skill.currentVersion}</span>
        <span className="skill-meta">Updated {new Date(skill.updatedAt).toLocaleDateString()}</span>
        <a href={`/skills/${skill.id}`} className="btn-link">View →</a>
      </div>
    </div>
  )
}
