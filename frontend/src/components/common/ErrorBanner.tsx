import { useTranslation } from 'react-i18next'
import './ErrorBanner.css'

// Phase 5.1: inline error banner replacing browser alert()s — light-minimal,
// dismissable, Chinese copy supplied by callers.
export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string | null
  onDismiss?: () => void
}) {
  const { t } = useTranslation()
  if (!message) return null
  return (
    <div className="error-banner" role="alert">
      <span className="error-banner-text">{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="error-banner-close"
          aria-label={t('common:close')}
          onClick={onDismiss}
        >
          ×
        </button>
      )}
    </div>
  )
}
