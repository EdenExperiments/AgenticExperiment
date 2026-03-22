'use client'

interface GateVerdictCardProps {
  verdict: 'pending' | 'approved' | 'rejected' | 'self_reported'
  aiFeedback?: string | null
  attemptNumber?: number
  nextRetryAt?: string | null
}

function CheckIcon() {
  return (
    <svg
      role="img"
      aria-label="Gate cleared"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg
      role="img"
      aria-label="Assessment rejected"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function GateVerdictCard({ verdict, aiFeedback, attemptNumber, nextRetryAt }: GateVerdictCardProps) {
  if (verdict === 'approved' || verdict === 'self_reported') {
    return (
      <div
        className="p-4 rounded-xl border"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-success, #4ade80)',
          color: 'var(--color-success, #4ade80)',
        }}
      >
        <div className="flex items-center gap-2">
          <CheckIcon />
          <p className="font-semibold" style={{ color: 'var(--color-success, #4ade80)' }}>
            {verdict === 'approved' ? 'Gate Cleared!' : 'Self-Reported — Gate Cleared'}
          </p>
        </div>
        {aiFeedback && (
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            {aiFeedback}
          </p>
        )}
      </div>
    )
  }

  if (verdict === 'rejected') {
    return (
      <div
        className="p-4 rounded-xl border"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-error)',
          color: 'var(--color-error)',
        }}
      >
        <div className="flex items-center gap-2">
          <CrossIcon />
          <p className="font-semibold" style={{ color: 'var(--color-error)' }}>
            Assessment Rejected
          </p>
        </div>
        {aiFeedback && (
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            {aiFeedback}
          </p>
        )}
        {nextRetryAt && (
          <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
            Retry available on {nextRetryAt}
          </p>
        )}
        {attemptNumber && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
            Attempt {attemptNumber}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className="p-4 rounded-xl border"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-info)',
      }}
    >
      <div className="flex items-center gap-2">
        <span role="img" aria-label="Assessment pending" className="animate-spin inline-block">⟳</span>
        <p className="font-semibold" style={{ color: 'var(--color-info)' }}>
          Assessment Pending
        </p>
      </div>
    </div>
  )
}
