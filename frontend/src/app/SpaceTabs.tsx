import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// GUI redesign step 1/3 (docs/tasks/20260711-gui-space-tabs.md): "which space
// am I in" now lives in this top-level tab row instead of the sidebar. Each
// tab carries its space's identity colour (tokenised in index.css) for the
// active underline + text.
export function SpaceTabs() {
  const { t } = useTranslation()

  return (
    <nav className="space-tabs" aria-label={t('shell:spaceTabsLabel')}>
      <NavLink to="/team" className="space-tab space-tab-team">
        {t('shell:myTeam')}
      </NavLink>
      <NavLink to="/open" className="space-tab space-tab-open">
        {t('shell:openSpace')}
      </NavLink>
      <NavLink to="/favorites" className="space-tab space-tab-fav">
        {t('shell:favorites')}
      </NavLink>
    </nav>
  )
}
