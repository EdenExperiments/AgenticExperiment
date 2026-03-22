'use client'

interface SkillStreakBadgeProps {
  current: number
  longest: number
}

export function SkillStreakBadge({ current, longest }: SkillStreakBadgeProps) {
  if (current === 0) return null

  return (
    <div
      data-testid="streak-badge"
      className="flex items-center gap-1 rounded-full px-3 py-1"
      style={{
        backgroundColor: 'var(--color-accent-muted)',
        border: '1px solid var(--color-accent-muted)',
      }}
    >
      <span role="img" aria-label="streak fire">🔥</span>
      <span className="font-semibold text-sm" style={{ color: 'var(--color-accent)' }}>{current}</span>
      {longest > current && (
        <span className="text-xs ml-1" style={{ color: 'var(--color-accent)', opacity: 0.8 }}>best: {longest}</span>
      )}
    </div>
  )
}
