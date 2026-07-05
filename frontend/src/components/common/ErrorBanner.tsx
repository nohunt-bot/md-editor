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
  if (!message) return null
  return (
    <div className="error-banner" role="alert">
      <span className="error-banner-text">{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="error-banner-close"
          aria-label="關閉"
          onClick={onDismiss}
        >
          ×
        </button>
      )}
    </div>
  )
}
