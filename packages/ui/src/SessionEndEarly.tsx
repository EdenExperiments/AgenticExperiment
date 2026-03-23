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
            className="btn btn-ghost w-full py-3 min-h-[44px]"
          >
            Keep Going
          </button>
          <button
            onClick={onClaim}
            className="btn btn-primary w-full py-3 min-h-[44px]"
          >
            Claim Session
          </button>
          <button
            onClick={onAbandon}
            className="btn btn-danger w-full py-3 min-h-[44px]"
          >
            Abandon
          </button>
        </div>
      </div>
    </div>
  )
}
