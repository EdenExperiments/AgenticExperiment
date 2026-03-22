'use client'

interface PersonalBestsProps {
  highestSession: number
  longestStreak: number
  totalXP: number
}

export function PersonalBests({ highestSession, longestStreak, totalXP }: PersonalBestsProps) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface)' }}>
      <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
        Personal Bests
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{highestSession.toLocaleString()}</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Best Session XP</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{longestStreak}</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Longest Streak</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>{totalXP.toLocaleString()}</p>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Total XP</p>
        </div>
      </div>
    </div>
  )
}
