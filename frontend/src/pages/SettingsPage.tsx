import { useTranslation } from 'react-i18next'
import { useIdentity } from '../app/useIdentity'
import { useTheme, type ThemeMode } from '../app/useTheme'
import { LANGUAGES, setLanguage, readLang, type LanguageCode } from '../i18n'
import './SettingsPage.css'

// /settings — the full settings surface (docs/tasks/20260705-user-menu-
// settings.md). Profile is read-only from /api/me (dev-stub for now);
// preferences (theme/language) have full controls; account + team management
// are deferred placeholders until Keycloak lands.
export function SettingsPage() {
  const { t } = useTranslation()
  const identity = useIdentity()
  const theme = useTheme()

  return (
    <div className="page settings-page">
      <div className="page-header">
        <h1>{t('settings:title')}</h1>
      </div>

      {/* Profile — read-only from /api/me */}
      <section className="settings-section">
        <h2 className="settings-section-title">{t('settings:profile')}</h2>
        <dl className="settings-dl">
          <dt>{t('settings:userId')}</dt>
          <dd>{identity.userId || '—'}</dd>
          <dt>{t('settings:displayName')}</dt>
          <dd>{identity.displayName || '—'}</dd>
          <dt>{t('settings:teams')}</dt>
          <dd>
            {identity.teams.length === 0
              ? '—'
              : identity.teams
                  .map((tm) => `${tm.displayName}（${tm.role}）`)
                  .join('、')}
            {identity.admin && ` · ${t('settings:admin')}`}
          </dd>
        </dl>
      </section>

      {/* Preferences — full theme + language controls */}
      <section className="settings-section">
        <h2 className="settings-section-title">{t('settings:preferences')}</h2>
        <div className="settings-field">
          <label htmlFor="settings-theme">{t('common:theme')}</label>
          <select
            id="settings-theme"
            value={theme.mode}
            onChange={(e) => theme.setMode(e.target.value as ThemeMode)}
          >
            <option value="system">{t('common:themeSystem')}</option>
            <option value="light">{t('common:themeLight')}</option>
            <option value="dark">{t('common:themeDark')}</option>
          </select>
        </div>
        <div className="settings-field">
          <label htmlFor="settings-lang">{t('common:language')}</label>
          <select
            id="settings-lang"
            value={readLang()}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Account + team management — deferred until Keycloak */}
      <section className="settings-section settings-deferred">
        <h2 className="settings-section-title">{t('settings:account')}</h2>
        <p className="settings-deferred-hint">{t('settings:deferredHint')}</p>
      </section>
      <section className="settings-section settings-deferred">
        <h2 className="settings-section-title">{t('settings:teamManagement')}</h2>
        <p className="settings-deferred-hint">{t('settings:deferredHint')}</p>
      </section>
    </div>
  )
}
