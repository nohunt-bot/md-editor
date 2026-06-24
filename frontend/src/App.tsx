import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { SkillsPage } from './pages/SkillsPage'
import { SkillEditor } from './components/editor/SkillEditor'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <Link to="/" className="logo">Skill.md</Link>
          <div className="nav-links">
            <Link to="/skills">Skills</Link>
            <a href="http://localhost:8080/swagger-ui.html" target="_blank" rel="noreferrer">
              API Docs
            </a>
            <Link to="/skills/new" className="btn-primary">+ New Skill</Link>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/skills" replace />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/skills/new" element={<SkillEditor />} />
            <Route path="/skills/:id" element={<SkillDetail />} />
            <Route path="/skills/:id/edit" element={<SkillEditor />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function SkillDetail() {
  // TODO: Implement skill detail page with version history
  return (
    <div className="skill-detail">
      <h1>Skill Detail</h1>
      <p>Coming soon - will show skill content, references, and version history</p>
    </div>
  )
}

export default App
