import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { search, type SearchResult } from '../api/api'

// TODO(2.x): ⌘K keyboard shortcut to focus this input (PRD §6.5).

export function GlobalSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ team: SearchResult[]; open: SearchResult[] }>({
    team: [],
    open: [],
  })
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Debounced search.
  useEffect(() => {
    const term = q.trim()
    if (!term) {
      setResults({ team: [], open: [] })
      setOpen(false)
      return
    }
    const handle = setTimeout(() => {
      search(term, 'all')
        .then((res) => {
          setResults({ team: res.data.team ?? [], open: res.data.open ?? [] })
          setOpen(true)
        })
        .catch(() => {
          setResults({ team: [], open: [] })
          setOpen(true)
        })
    }, 250)
    return () => clearTimeout(handle)
  }, [q])

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function go(id: string) {
    setOpen(false)
    setQ('')
    navigate(`/skills/${id}`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      const first = results.team[0] ?? results.open[0]
      if (first) go(first.id)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const hasResults = results.team.length > 0 || results.open.length > 0

  return (
    <div className="global-search" ref={boxRef}>
      <input
        className="global-search-input"
        type="search"
        placeholder="搜尋 skill…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.trim() && setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div className="global-search-dropdown">
          {!hasResults ? (
            <div className="search-empty">找不到符合的 skill</div>
          ) : (
            <>
              <SearchGroup title="我的團隊" items={results.team} onPick={go} />
              <SearchGroup title="開放空間" items={results.open} onPick={go} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SearchGroup({
  title,
  items,
  onPick,
}: {
  title: string
  items: SearchResult[]
  onPick: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="search-group">
      <div className="search-group-title">{title}</div>
      {items.map((r) => (
        <button key={r.id} className="search-row" onClick={() => onPick(r.id)}>
          <span className="search-row-name">{r.displayName || r.name}</span>
          {r.description && <span className="search-row-desc">{r.description}</span>}
        </button>
      ))}
    </div>
  )
}
