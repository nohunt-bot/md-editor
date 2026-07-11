import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { favoritesApi, type FavoriteItem } from '../api/api'
import { Badge } from '../components/common/Badge'
import { ViewToggle } from '../components/common/ViewToggle'
import { useTranslation } from 'react-i18next'
import { useViewPrefs } from '../app/useViewPrefs'
import './FavoritesPage.css'

// T1-4: 我的收藏 + 最近瀏覽. Two independent sections, each metadata-only
// (GET /api/me/favorites, GET /api/me/recent — both already visibility-
// filtered server-side), rendered as cards linking to the detail page.

function Card({ skill, onClick }: { skill: FavoriteItem; onClick: () => void }) {
  return (
    <article
      className="open-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
    >
      <h2 className="open-card-title">{skill.displayName || skill.name}</h2>
      {skill.description && <p className="open-card-desc">{skill.description}</p>}
      <div className="open-card-meta">
        <span className="open-card-team">{skill.teamDisplayName || skill.teamId}</span>
        <Badge status={skill.status} />
      </div>
    </article>
  )
}

function Section({
  title,
  items,
  loading,
  emptyMessage,
  onOpen,
  view,
  density,
}: {
  title: string
  items: FavoriteItem[]
  loading: boolean
  emptyMessage: string
  onOpen: (id: string) => void
  view: 'list' | 'grid'
  density: 'comfortable' | 'compact'
}) {
  return (
    <section className="favorites-section">
      <h2>{title}</h2>
      {loading ? (
        <div className="empty-state">…</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className={`open-grid ${view}${density === 'compact' ? ' density-compact' : ''}`}>
          {items.map((skill) => (
            <Card key={skill.id} skill={skill} onClick={() => onOpen(skill.id)} />
          ))}
        </div>
      )}
    </section>
  )
}

export function FavoritesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [recent, setRecent] = useState<FavoriteItem[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)
  const [loadingRecent, setLoadingRecent] = useState(true)
  // GUI redesign step 2/3: shared view/density prefs. Default here (when
  // unset) stays "grid" — today's behavior.
  const { view: prefView, density: prefDensity, setView, setDensity } = useViewPrefs()
  const view = prefView ?? 'grid'
  const density = prefDensity ?? 'comfortable'

  useEffect(() => {
    let cancelled = false
    setLoadingFavorites(true)
    favoritesApi
      .list()
      .then((res) => {
        if (!cancelled) setFavorites(res.data || [])
      })
      .catch(() => {
        if (!cancelled) setFavorites([])
      })
      .finally(() => {
        if (!cancelled) setLoadingFavorites(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoadingRecent(true)
    favoritesApi
      .recent()
      .then((res) => {
        if (!cancelled) setRecent(res.data || [])
      })
      .catch(() => {
        if (!cancelled) setRecent([])
      })
      .finally(() => {
        if (!cancelled) setLoadingRecent(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function open(id: string) {
    navigate(`/skills/${id}`)
  }

  return (
    <div className="page favorites-page">
      <div className="page-header">
        <h1>
          <span className="page-space-stripe page-space-stripe-fav" aria-hidden="true" />
          {t('favorites:title')}
        </h1>
        <ViewToggle
          view={view}
          density={density}
          onViewChange={setView}
          onDensityChange={setDensity}
        />
      </div>
      <Section
        title={t('favorites:myFavorites')}
        items={favorites}
        loading={loadingFavorites}
        emptyMessage={t('favorites:emptyFavorites')}
        onOpen={open}
        view={view}
        density={density}
      />
      <Section
        title={t('favorites:recentlyViewed')}
        items={recent}
        loading={loadingRecent}
        emptyMessage={t('favorites:emptyRecent')}
        onOpen={open}
        view={view}
        density={density}
      />
    </div>
  )
}
