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
      className="rounded-xl border-2 p-4 space-y-3"
      style={{
        backgroundColor: 'var(--color-bg-elevated, #1a1a2e)',
        borderColor: 'var(--color-warning, #facc15)',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">🔒</span>
        <span
          className="font-bold uppercase text-sm tracking-wider"
          style={{ color: 'var(--color-warning, #facc15)' }}
        >
          Gate Locked
        </span>
      </div>

      <p
        className="text-sm font-medium"
        style={{ color: 'var(--color-warning, #facc15)', opacity: 0.8 }}
      >
        Level {gateLevel} — Progression Paused
      </p>

      <div
        className="border-t pt-3"
        style={{ borderColor: 'var(--color-border, rgba(212,168,83,0.2))' }}
      >
        <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary, #f0e6d3)' }}>
          {title}
        </p>
        {description && (
          <div
            className="mt-2 rounded-lg p-3"
            style={{ backgroundColor: 'var(--color-bg-surface, #12121c)' }}
          >
            <p
              className="text-xs uppercase tracking-wider mb-1 font-semibold"
              style={{ color: 'var(--color-text-muted, #6b5e4e)' }}
            >
              Requirements
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary, #a89880)' }}>
              {description}
            </p>
          </div>
        )}
      </div>

      <div
        className="border-t pt-3 space-y-1"
        style={{ borderColor: 'var(--color-border, rgba(212,168,83,0.2))' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-muted, #6b5e4e)' }}>
          XP Accruing:{' '}
          <span className="font-semibold" style={{ color: 'var(--color-text-primary, #f0e6d3)' }}>
            {currentXP.toLocaleString()}
          </span>
        </p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted, #6b5e4e)' }}>
          Level shown: {gateLevel} (actual level: {rawLevel})
        </p>
      </div>

      {activeGateSubmission && activeGateSubmission.attemptNumber >= 1 && (
        <p
          data-testid="attempt-count"
          className="text-xs"
          style={{ color: 'var(--color-warning, #facc15)', opacity: 0.8 }}
        >
          Attempt {activeGateSubmission.attemptNumber} of ∞
        </p>
      )}

      {showSubmitButton && (
        <button
          data-testid="submit-gate-btn"
          onClick={onSubmitForAssessment}
          className="w-full py-3 rounded-xl font-semibold min-h-[44px] hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: 'var(--color-warning, #facc15)',
            color: 'var(--color-text-inverse, #0a0a0f)',
            minHeight: '44px',
          }}
        >
          Submit for Assessment
        </button>
      )}

      {!firstNotifiedAt && (
        <p className="text-xs italic" style={{ color: 'var(--color-text-muted, #6b5e4e)' }}>
          Your XP keeps accumulating. Once you clear this gate, progression resumes.
        </p>
      )}
    </div>
  )
}
