import { useTranslation } from 'react-i18next'
import type { CardDensity, CardView } from '../../app/useViewPrefs'
import './ViewToggle.css'

// GUI redesign step 2/3: shared segmented controls for card arrangement
// (list/grid) and density (comfortable/compact). Style/iconography extracted
// from SkillsPage's original local toggle. Mounted in the page-header right
// side of /team, /open, /favorites.

export function ViewToggle({
  view,
  density,
  onViewChange,
  onDensityChange,
}: {
  view: CardView
  density: CardDensity
  onViewChange: (v: CardView) => void
  onDensityChange: (d: CardDensity) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="view-toggle-group">
      <div className="view-toggle" role="group" aria-label={t('skills:viewMode')}>
        <button
          type="button"
          className={view === 'list' ? 'active' : ''}
          aria-label={t('skills:viewList')}
          aria-pressed={view === 'list'}
          onClick={() => onViewChange('list')}
        >
          ☰
        </button>
        <button
          type="button"
          className={view === 'grid' ? 'active' : ''}
          aria-label={t('skills:viewGrid')}
          aria-pressed={view === 'grid'}
          onClick={() => onViewChange('grid')}
        >
          ▦
        </button>
      </div>
      <div className="view-toggle" role="group" aria-label={t('skills:densityMode')}>
        <button
          type="button"
          className={density === 'comfortable' ? 'active' : ''}
          aria-label={t('skills:densityComfortable')}
          aria-pressed={density === 'comfortable'}
          onClick={() => onDensityChange('comfortable')}
        >
          ▭
        </button>
        <button
          type="button"
          className={density === 'compact' ? 'active' : ''}
          aria-label={t('skills:densityCompact')}
          aria-pressed={density === 'compact'}
          onClick={() => onDensityChange('compact')}
        >
          ▪
        </button>
      </div>
    </div>
  )
}
