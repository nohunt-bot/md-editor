import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { favoritesApi, type FavoriteItem } from '../api/api'
import { GlobalSearch } from '../app/GlobalSearch'
import type { Identity } from '../app/useIdentity'
import './HomePage.css'

// GUI redesign step 3/3 (docs/tasks/20260711-gui-portal-home.md): "/" is now a
// minimal portal instead of redirecting straight into /team — a newcomer
// should grasp the whole product (search + the two spaces) at a glance, and
// a returner should reach frequent content (favorites/recent) in one step.

const MAX_SHORTCUTS = 5

function ChipRow({ title, items }: { title: string; items: FavoriteItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="home-shortcut-row">
      <div className="home-shortcut-label">{title}</div>
      <div className="home-chips">
        {items.slice(0, MAX_SHORTCUTS).map((item) => (
          <Link key={item.id} to={`/skills/${item.id}`} className="home-chip">
            {item.displayName || item.name}
          </Link>
        ))}
      </div>
    </div>
  )
}

export function HomePage({ identity }: { identity: Identity }) {
  const { t } = useTranslation()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [recent, setRecent] = useState<FavoriteItem[]>([])

  useEffect(() => {
    let cancelled = false
    favoritesApi
      .list()
      .then((res) => {
        if (!cancelled) setFavorites(res.data || [])
      })
      .catch(() => {
        if (!cancelled) setFavorites([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    favoritesApi
      .recent()
      .then((res) => {
        if (!cancelled) setRecent(res.data || [])
      })
      .catch(() => {
        if (!cancelled) setRecent([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hasShortcuts = favorites.length > 0 || recent.length > 0

  return (
    <div className="home-portal">
      <div className="home-brand">
        <div className="home-wordmark">{t('common:appTitle')}</div>
        <p className="home-tagline">{t('home:tagline')}</p>
      </div>

      <div className="home-search-hero">
        <GlobalSearch />
      </div>

      <div className="home-doors">
        {identity.activeTeamId ? (
          <Link to="/team" className="home-door home-door-team">
            <h2 className="home-door-title">{t('home:myTeamDoor')}</h2>
            <p className="home-door-name">{identity.activeTeam?.displayName}</p>
            <p className="home-door-guidance">{t('home:myTeamDoorHint')}</p>
          </Link>
        ) : (
          <div className="home-door home-door-team home-door-disabled">
            <h2 className="home-door-title">{t('home:myTeamDoor')}</h2>
            <p className="home-door-guidance">{t('home:noTeamGuidance')}</p>
          </div>
        )}
        <Link to="/open" className="home-door home-door-open">
          <h2 className="home-door-title">{t('home:openSpaceDoor')}</h2>
          <p className="home-door-guidance">{t('home:openSpaceDoorHint')}</p>
        </Link>
      </div>

      {hasShortcuts && (
        <div className="home-shortcuts">
          <ChipRow title={t('favorites:myFavorites')} items={favorites} />
          <ChipRow title={t('favorites:recentlyViewed')} items={recent} />
        </div>
      )}
    </div>
  )
}
