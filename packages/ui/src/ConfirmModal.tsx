'use client'

interface ConfirmModalProps {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        aria-hidden="true"
        onClick={!isLoading ? onCancel : undefined}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl p-6 safe-area-inset-bottom
                   md:bottom-auto md:inset-x-auto md:top-1/2 md:-translate-y-1/2
                   md:left-[calc(50%+8rem)] md:-translate-x-1/2
                   md:w-[420px] md:rounded-2xl"
        style={{ backgroundColor: 'var(--color-bg-elevated)' }}
      >
        <h2
          id="confirm-modal-title"
          className="font-semibold mb-2"
          style={{ color: 'var(--color-text)' }}
        >
          {title}
        </h2>
        {message && (
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {message}
          </p>
        )}
        {!message && <div className="mb-4" />}
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full py-4 rounded-xl font-semibold text-white min-h-[48px] disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: destructive
                ? 'var(--color-error)'
                : 'var(--color-accent)',
            }}
          >
            {isLoading ? 'Working…' : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-medium min-h-[44px] border"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </>
  )
}
