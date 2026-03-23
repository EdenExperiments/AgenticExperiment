'use client'

interface GateSubmissionData {
  verdict: string
  aiFeedback: string | null
  nextRetryAt: string | null
  attemptNumber: number
}

interface BlockerGateSectionProps {
  gateLevel: number
  title: string
  description: string
  currentXP: number
  rawLevel: number
  firstNotifiedAt?: string | null
  isCleared?: boolean
  activeGateSubmission?: GateSubmissionData | null
  hasApiKey?: boolean
  onSubmitForAssessment?: () => void
}

function LockIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export function BlockerGateSection({
  gateLevel,
  title,
  description,
  currentXP,
  rawLevel,
  firstNotifiedAt,
  isCleared,
  activeGateSubmission,
  onSubmitForAssessment,
}: BlockerGateSectionProps) {
  const showSubmitButton = !!firstNotifiedAt && !isCleared

  return (
    <div
      className="gate-section rounded-2xl p-5 space-y-4 relative overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-warning)',
        boxShadow: '0 0 30px rgba(250,204,21,0.08), inset 0 1px 0 rgba(250,204,21,0.1)',
      }}
    >
      {/* Subtle atmospheric glow in top-right corner */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(250,204,21,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Header row */}
      <div className="flex items-center gap-3 relative">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{
            backgroundColor: 'rgba(250,204,21,0.12)',
            color: 'var(--color-warning)',
          }}
        >
          <LockIcon />
        </div>
        <div>
          <span
            className="font-bold uppercase text-sm tracking-wider block"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-warning)',
            }}
          >
            Gate Locked
          </span>
          <span
            className="text-xs"
            style={{ color: 'var(--color-muted)' }}
          >
            Level {gateLevel} — Progression Paused
          </span>
        </div>
      </div>

      {/* Gate title */}
      <p
        className="gate-section__title font-semibold text-lg"
        style={{
          fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
          color: 'var(--color-text)',
        }}
      >
        {title}
      </p>

      {/* Requirements callout */}
      {description && (
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            className="text-[10px] uppercase tracking-widest mb-2 font-semibold"
            style={{ color: 'var(--color-warning)', opacity: 0.7 }}
          >
            Requirements
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {description}
          </p>
        </div>
      )}

      {/* XP / level stats */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            XP Accruing
          </p>
          <p
            className="text-xl font-bold tabular-nums"
            style={{
              fontFamily: 'var(--font-display, var(--font-body, Inter, system-ui, sans-serif))',
              color: 'var(--color-text)',
            }}
          >
            {currentXP.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Actual Progress
          </p>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Level {rawLevel}
            <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-muted)' }}>
              (shown as {gateLevel})
            </span>
          </p>
        </div>
      </div>

      {/* Attempt count */}
      {activeGateSubmission && activeGateSubmission.attemptNumber >= 1 && (
        <p
          data-testid="attempt-count"
          className="text-xs"
          style={{ color: 'var(--color-warning)', opacity: 0.7 }}
        >
          Attempt {activeGateSubmission.attemptNumber} of ∞
        </p>
      )}

      {/* Submit button */}
      {showSubmitButton && (
        <button
          data-testid="submit-gate-btn"
          onClick={onSubmitForAssessment}
          className="btn btn-warning w-full py-3.5 min-h-[44px]"
        >
          Submit for Assessment
        </button>
      )}

      {/* Not yet notified */}
      {!firstNotifiedAt && (
        <p className="text-xs italic" style={{ color: 'var(--color-muted)' }}>
          Your XP keeps accumulating. Once you clear this gate, progression resumes.
        </p>
      )}
    </div>
  )
}
