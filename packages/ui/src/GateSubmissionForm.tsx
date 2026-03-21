'use client'

import { useState } from 'react'

const MIN_CHARS = 50

interface PreviousSubmission {
  verdict: 'pending' | 'approved' | 'rejected' | 'self_reported'
  aiFeedback: string | null
  nextRetryAt: string | null
  attemptNumber: number
}

interface GateSubmissionFormProps {
  gateId: string
  path: 'ai' | 'self_report'
  onPathChange: (path: 'ai' | 'self_report') => void
  onSubmit: (data: {
    path: 'ai' | 'self_report'
    evidenceWhat: string
    evidenceHow: string
    evidenceFeeling: string
  }) => void
  isLoading: boolean
  hasApiKey: boolean
  submissionError: string | null
  previousSubmission: PreviousSubmission | null
}

function formatRetryDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const retryDay = new Date(date)
  retryDay.setHours(0, 0, 0, 0)

  if (retryDay <= today) {
    return 'Retry available today'
  }
  if (retryDay.getTime() === tomorrow.getTime()) {
    return 'Retry available tomorrow'
  }
  return `Retry available on ${dateStr}`
}

export function GateSubmissionForm({
  gateId,
  path,
  onPathChange,
  onSubmit,
  isLoading,
  hasApiKey,
  submissionError,
  previousSubmission,
}: GateSubmissionFormProps) {
  const [evidenceWhat, setEvidenceWhat] = useState('')
  const [evidenceHow, setEvidenceHow] = useState('')
  const [evidenceFeeling, setEvidenceFeeling] = useState('')

  // Rejected state: form hidden, show feedback only
  if (previousSubmission?.verdict === 'rejected') {
    const retryMessage = previousSubmission.nextRetryAt
      ? formatRetryDate(previousSubmission.nextRetryAt)
      : 'Retry available soon'

    return (
      <div className="space-y-4">
        {previousSubmission.aiFeedback && (
          <div data-testid="ai-feedback" className="p-4 rounded-xl bg-red-900/20 border border-red-700/40">
            <p className="text-sm text-red-300">{previousSubmission.aiFeedback}</p>
          </div>
        )}
        <p data-testid="retry-date" className="text-sm text-gray-400">
          {retryMessage}
        </p>
        <button
          data-testid="retry-btn"
          disabled
          className="w-full py-3 rounded-xl font-semibold bg-gray-700 text-gray-500 cursor-not-allowed"
        >
          Retry Assessment
        </button>
      </div>
    )
  }

  function handleSubmit() {
    onSubmit({ path, evidenceWhat, evidenceHow, evidenceFeeling })
  }

  const whatCount = evidenceWhat.length
  const whatMet = whatCount >= MIN_CHARS

  return (
    <div className="space-y-4">
      {/* Path selector — always visible (AI / Self-report) */}
      <div role="group" aria-label="Assessment path" className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`path-${gateId}`}
            value="ai"
            data-testid="path-ai"
            checked={path === 'ai'}
            onChange={() => onPathChange('ai')}
            aria-label="AI"
          />
          <span className="text-sm">AI</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`path-${gateId}`}
            value="self_report"
            data-testid="path-self"
            checked={path === 'self_report'}
            onChange={() => onPathChange('self_report')}
            aria-label="Self-report"
          />
          <span className="text-sm">Self-report</span>
        </label>
      </div>

      {/* AI unavailable error */}
      {submissionError === 'ai_unavailable' && (
        <div data-testid="ai-error" className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/40">
          <p className="text-sm text-yellow-400">AI assessment is unavailable right now. You can switch to Self-report instead.</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div data-testid="ai-loading" className="flex items-center gap-2 text-blue-400 text-sm">
          <span>⟳</span>
          <span>Assessing your evidence...</span>
        </div>
      )}

      {/* Form fields */}
      <div data-testid="form-fields" className="space-y-4">
        <div>
          <label htmlFor={`evidence-what-${gateId}`} className="block text-sm font-medium text-gray-300 mb-1">
            What did you accomplish?
          </label>
          <textarea
            id={`evidence-what-${gateId}`}
            value={evidenceWhat}
            onChange={(e) => setEvidenceWhat(e.target.value)}
            placeholder="Describe what you accomplished in detail..."
            className="w-full rounded-xl p-3 bg-gray-800 text-white text-sm resize-none border border-gray-700 focus:border-blue-500"
            rows={4}
          />
          <p
            data-testid="counter-what"
            data-met={whatMet ? 'true' : 'false'}
            className={`text-xs mt-1 text-right ${whatMet ? 'text-green-500' : 'text-gray-500'}`}
          >
            {whatCount} / {MIN_CHARS}
          </p>
        </div>

        <div>
          <label htmlFor={`evidence-how-${gateId}`} className="block text-sm font-medium text-gray-300 mb-1">
            How did you practice?
          </label>
          <textarea
            id={`evidence-how-${gateId}`}
            value={evidenceHow}
            onChange={(e) => setEvidenceHow(e.target.value)}
            placeholder="Describe your practice method..."
            className="w-full rounded-xl p-3 bg-gray-800 text-white text-sm resize-none border border-gray-700"
            rows={3}
          />
          <p data-testid="counter-how" className="text-xs mt-1 text-right text-gray-500">
            {evidenceHow.length} / {MIN_CHARS}
          </p>
        </div>

        <div>
          <label htmlFor={`evidence-feeling-${gateId}`} className="block text-sm font-medium text-gray-300 mb-1">
            How did it feel?
          </label>
          <textarea
            id={`evidence-feeling-${gateId}`}
            value={evidenceFeeling}
            onChange={(e) => setEvidenceFeeling(e.target.value)}
            placeholder="Describe how the session felt..."
            className="w-full rounded-xl p-3 bg-gray-800 text-white text-sm resize-none border border-gray-700"
            rows={3}
          />
          <p data-testid="counter-feeling" className="text-xs mt-1 text-right text-gray-500">
            {evidenceFeeling.length} / {MIN_CHARS}
          </p>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Assessing...' : path === 'ai' ? 'Submit for AI Assessment' : 'Submit Self-Report'}
      </button>
    </div>
  )
}
