import { useEffect } from 'react'


function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !busy) onCancel()
    }

    function handleNativeBack(event) {
      if (busy) return
      event.preventDefault()
      onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('prime:native-back', handleNativeBack)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('prime:native-back', handleNativeBack)
    }
  }, [busy, onCancel, open])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={busy ? undefined : onCancel}>
      <section
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="page-eyebrow">Please confirm</p>
        <h2 id="confirm-modal-title">{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onCancel} disabled={busy}>
            Go back
          </button>
          <button className={`button ${danger ? 'button-danger' : 'button-primary'}`} type="button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export default ConfirmModal
