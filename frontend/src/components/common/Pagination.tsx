import { useTranslation } from 'react-i18next'
import './Pagination.css'

// Phase A (v2): shared pagination. Renders nothing when there is one page.
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number // 0-based
  totalPages: number
  onPage: (page: number) => void
}) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  return (
    <nav className="pagination" aria-label={t('pagination:label')}>
      <button
        className="pagination-btn"
        disabled={page <= 0}
        onClick={() => onPage(page - 1)}
      >
        {t('pagination:prev')}
      </button>
      <span className="pagination-status">
        {t('pagination:status', { page: page + 1, total: totalPages })}
      </span>
      <button
        className="pagination-btn"
        disabled={page >= totalPages - 1}
        onClick={() => onPage(page + 1)}
      >
        {t('pagination:next')}
      </button>
    </nav>
  )
}
