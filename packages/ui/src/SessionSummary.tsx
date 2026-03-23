'use client'

import { useState } from 'react'
import Link from 'next/link'

interface SessionSummaryProps {
  earnedXP: number
  bonusPercentage: number
  streakStatus?: { current: number; longest: number } | null
  durationSeconds: number
  intervalsCompleted?: number
  intervalsPlanned?: number
  returnUrl: string
  onSubmit: (reflections: { what: string; how: string; feeling: string }) => void
}

export function SessionSummary({
  earnedXP,
  bonusPercentage,
  streakStatus,
  durationSeconds,
  intervalsCompleted,
  intervalsPlanned,
  returnUrl,
  onSubmit,
}: SessionSummaryProps) {
  const [what, setWhat] = useState('')
  const [how, setHow] = useState('')
  const [feeling, setFeeling] = useState('')

  const mins = Math.floor(durationSeconds / 60)
  const secs = durationSeconds % 60

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 overflow-y-auto"
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 space-y-6 border"
        style={{
          background: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border-strong)',
        }}
      >
        {/* XP earned */}
        <div className="text-center space-y-1">
          <p
            className="text-[10px] tracking-[0.25em] uppercase"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-muted)' }}
          >
            Session Complete
          </p>
          <p
            className="text-4xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-accent)' }}
          >
            +{earnedXP} XP
          </p>
          {bonusPercentage > 0 && (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              +{bonusPercentage}% bonus
            </p>
          )}
        </div>

        <div className="h-px" style={{ background: 'var(--color-border)' }} />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Duration</p>
            <p className="text-lg font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
              {mins}m {String(secs).padStart(2, '0')}s
            </p>
          </div>
          {streakStatus && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Streak</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                {streakStatus.current} day{streakStatus.current !== 1 ? 's' : ''}
              </p>
            </div>
          )}
          {intervalsPlanned != null && intervalsPlanned > 0 && (
            <div>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Intervals</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                {intervalsCompleted ?? 0}/{intervalsPlanned}
              </p>
            </div>
          )}
        </div>

        <div className="h-px" style={{ background: 'var(--color-border)' }} />

        {/* Reflections */}
        <div className="space-y-3">
          <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
            Quick reflection (optional)
          </p>
          <input
            placeholder="What did you work on?"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-shadow"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          <input
            placeholder="How did it go?"
            value={how}
            onChange={(e) => setHow(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-shadow"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
          <input
            placeholder="How do you feel?"
            value={feeling}
            onChange={(e) => setFeeling(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-shadow"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          />
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => onSubmit({ what, how, feeling })}
            className="w-full py-4 rounded-xl font-semibold min-h-[48px] transition-opacity hover:opacity-90"
            style={{
              background: 'var(--color-accent)',
              color: '#fff',
            }}
          >
            Log Session
          </button>
          <Link
            href={returnUrl}
            className="w-full py-3 rounded-xl font-medium min-h-[44px] border transition-colors block text-center"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Dismiss
          </Link>
        </div>
      </div>
    </div>
  )
}
