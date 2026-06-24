import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <Link to="/" className="logo">Skill.md</Link>
          <div className="nav-links">
            <Link to="/skills">Skills</Link>
            <Link to="/skills/new" className="btn-primary">New Skill</Link>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/skills/:id" element={<SkillDetailPage />} />
            <Route path="/skills/:id/edit" element={<SkillEditorPage />} />
            <Route path="/skills/new" element={<NewSkillPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function HomePage() {
  return (
    <div className="home">
      <h1>Welcome to Skill.md</h1>
      <p>Team-shared skill knowledge base</p>
      <Link to="/skills" className="btn-primary">Browse Skills</Link>
    </div>
  )
}

function SkillsPage() {
  return (
    <div className="skills-page">
      <h1>Skills</h1>
      <div className="skills-list">
        <p>Loading skills...</p>
      </div>
    </div>
  )
}

function SkillDetailPage() {
  return (
    <div className="skill-detail">
      <h1>Skill Detail</h1>
      <p>Skill content will be displayed here</p>
    </div>
  )
}

function SkillEditorPage() {
  return (
    <div className="skill-editor">
      <h1>Edit Skill</h1>
      <p>Editor will be loaded here</p>
    </div>
  )
}

function NewSkillPage() {
  return (
    <div className="new-skill">
      <h1>Create New Skill</h1>
      <p>New skill form will be here</p>
    </div>
  )
}

export default App
