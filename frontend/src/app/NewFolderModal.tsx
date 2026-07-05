import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { folderApi } from '../api/api'
import { Modal } from '../components/common/Modal'

// Folder-create modal (replaces the old prompt()). On success calls onCreated
// so the sidebar reloads the folder tree — the created folder now actually
// appears (the prompt version never refreshed).
export function NewFolderModal({
  teamId,
  onClose,
  onCreated,
}: {
  teamId: string
  onClose: () => void
  onCreated: () => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      await folderApi.create(trimmed, teamId)
      onCreated()
    } catch (e: any) {
      setError(t('folders:createFailed') + (e.response?.data?.message || e.message))
      setBusy(false)
    }
  }

  return (
    <Modal title={t('folders:createTitle')} onClose={onClose}>
      <input
        className="modal-input"
        autoFocus
        value={name}
        placeholder={t('folders:namePlaceholder')}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
        }}
      />
      {error && <p className="modal-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
          {t('common:cancel')}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={submit}
          disabled={busy || !name.trim()}
        >
          {busy ? t('detail:processing') : t('folders:create')}
        </button>
      </div>
    </Modal>
  )
}
