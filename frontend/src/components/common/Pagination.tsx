import './Pagination.css'

// Phase A (v2): shared pagination — 「上一頁 / 第 x / y 頁 / 下一頁」.
// Renders nothing when there is only one page.
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number // 0-based
  totalPages: number
  onPage: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav className="pagination" aria-label="分頁">
      <button
        className="pagination-btn"
        disabled={page <= 0}
        onClick={() => onPage(page - 1)}
      >
        ← 上一頁
      </button>
      <span className="pagination-status">
        第 {page + 1} / {totalPages} 頁
      </span>
      <button
        className="pagination-btn"
        disabled={page >= totalPages - 1}
        onClick={() => onPage(page + 1)}
      >
        下一頁 →
      </button>
    </nav>
  )
}
