'use client'

interface SessionEndEarlyProps {
  elapsedSeconds: number
  tierColor: string
  onKeepGoing: () => void
  onClaim: () => void
  onAbandon: () => void
}

export function SessionEndEarly({
  elapsedSeconds,
  tierColor,
  onKeepGoing,
  onClaim,
  onAbandon,
}: SessionEndEarlyProps) {
  const mins = Math.floor(elapsedSeconds / 60)
  const secs = elapsedSeconds % 60

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-6 space-y-4 border"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border-strong)',
        }}
      >
        <h2
          className="text-xl font-bold text-center"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          End Session Early?
        </h2>

        <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
          {elapsedSeconds > 0
            ? `${mins}m ${String(secs).padStart(2, '0')}s elapsed`
            : 'Choose what to do with your progress'}
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={onKeepGoing}
            className="w-full py-3 rounded-xl font-medium min-h-[44px]"
            style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
          >
            Keep Going
          </button>
          <button
            onClick={onClaim}
            className="w-full py-3 rounded-xl font-semibold min-h-[44px] transition-opacity hover:opacity-90"
            style={{ background: tierColor, color: '#fff' }}
          >
            Claim Session
          </button>
          <button
            onClick={onAbandon}
            className="w-full py-3 rounded-xl font-medium min-h-[44px] border"
            style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
          >
            Abandon
          </button>
        </div>
      </div>
    </div>
  )
}
