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
  hasApiKey,
  onSubmitForAssessment,
}: BlockerGateSectionProps) {
  const showSubmitButton = !!firstNotifiedAt && !isCleared

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-amber-500 text-xl">🔒</span>
        <span className="font-bold text-amber-700 dark:text-amber-400 uppercase text-sm tracking-wider">Gate Locked</span>
      </div>
      <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Level {gateLevel} — Progression Paused</p>
      <div className="border-t border-amber-200 pt-3">
        <p className="font-semibold text-gray-900 dark:text-white mb-1">{title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>
      <div className="border-t border-amber-200 pt-3 space-y-1">
        <p className="text-sm text-gray-500">
          XP Accruing: <span className="font-semibold text-gray-900 dark:text-white">{currentXP.toLocaleString()}</span>
        </p>
        <p className="text-xs text-gray-400">
          Level shown: {gateLevel} (actual level: {rawLevel})
        </p>
      </div>

      {activeGateSubmission && (
        <p data-testid="attempt-count" className="text-xs text-amber-600 dark:text-amber-400">
          Attempt {activeGateSubmission.attemptNumber} of ∞
        </p>
      )}

      {showSubmitButton && (
        <button
          data-testid="submit-gate-btn"
          onClick={onSubmitForAssessment}
          className="w-full py-3 rounded-xl font-semibold text-white bg-amber-500 hover:bg-amber-600 min-h-[44px]"
        >
          Submit for Assessment
        </button>
      )}

      {!firstNotifiedAt && (
        <p className="text-xs text-amber-700 dark:text-amber-400 italic">
          Your XP keeps growing. You'll advance to Level {gateLevel + 1} when this challenge is complete.
          Gate completion is coming in a future update.
        </p>
      )}
    </div>
  )
}
