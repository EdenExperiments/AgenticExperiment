'use client'

interface PersonalBestsProps {
  highestSession: number
  longestStreak: number
  totalXP: number
}

export function PersonalBests({ highestSession, longestStreak, totalXP }: PersonalBestsProps) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-bg-surface, #1f2937)' }}>
      <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--color-text-muted, #6b7280)' }}>
        Personal Bests
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent, #6366f1)' }}>{highestSession.toLocaleString()}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted, #6b7280)' }}>Best Session XP</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent, #6366f1)' }}>{longestStreak}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted, #6b7280)' }}>Longest Streak</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent, #6366f1)' }}>{totalXP.toLocaleString()}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-muted, #6b7280)' }}>Total XP</p>
        </div>
      </div>
    </div>
  )
}
