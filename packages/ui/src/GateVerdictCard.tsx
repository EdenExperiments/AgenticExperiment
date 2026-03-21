'use client'

interface GateVerdictCardProps {
  verdict: 'pending' | 'approved' | 'rejected' | 'self_reported'
  aiFeedback?: string | null
  attemptNumber?: number
  nextRetryAt?: string | null
}

export function GateVerdictCard({ verdict, aiFeedback, attemptNumber, nextRetryAt }: GateVerdictCardProps) {
  if (verdict === 'approved' || verdict === 'self_reported') {
    return (
      <div className="p-4 rounded-xl bg-green-900/20 border border-green-700/40">
        <div className="flex items-center gap-2">
          <span>✅</span>
          <p className="font-semibold text-green-400">
            {verdict === 'approved' ? 'Gate Cleared!' : 'Self-Reported — Gate Cleared'}
          </p>
        </div>
        {aiFeedback && (
          <p className="text-sm text-green-300 mt-2">{aiFeedback}</p>
        )}
      </div>
    )
  }

  if (verdict === 'rejected') {
    return (
      <div className="p-4 rounded-xl bg-red-900/20 border border-red-700/40">
        <div className="flex items-center gap-2">
          <span>❌</span>
          <p className="font-semibold text-red-400">Assessment Rejected</p>
        </div>
        {aiFeedback && (
          <p className="text-sm text-red-300 mt-2">{aiFeedback}</p>
        )}
        {nextRetryAt && (
          <p className="text-xs text-gray-400 mt-2">Retry available on {nextRetryAt}</p>
        )}
        {attemptNumber && (
          <p className="text-xs text-gray-500 mt-1">Attempt {attemptNumber}</p>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-700/40">
      <div className="flex items-center gap-2">
        <span className="animate-spin">⟳</span>
        <p className="font-semibold text-blue-400">Assessment Pending</p>
      </div>
    </div>
  )
}
