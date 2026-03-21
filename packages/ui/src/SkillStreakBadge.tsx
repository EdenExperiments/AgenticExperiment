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
      className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/40 rounded-full px-3 py-1"
    >
      <span role="img" aria-label="streak fire">🔥</span>
      <span className="font-semibold text-orange-400 text-sm">{current}</span>
      {longest > current && (
        <span className="text-xs text-orange-300 ml-1">best: {longest}</span>
      )}
    </div>
  )
}
