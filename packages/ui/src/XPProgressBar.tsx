const TIER_HEX: Record<number, string> = {
  1: '#9ca3af', 2: '#3b82f6', 3: '#14b8a6', 4: '#22c55e', 5: '#84cc16',
  6: '#9333ea', 7: '#c026d3', 8: '#d97706', 9: '#ea580c', 10: '#dc2626', 11: '#facc15',
}

interface XPProgressBarProps {
  tierNumber: number
  xpForCurrentLevel: number
  xpToNextLevel: number
  isMaxLevel?: boolean
  className?: string
}

export function XPProgressBar({
  tierNumber,
  xpForCurrentLevel,
  xpToNextLevel,
  isMaxLevel = false,
  className = '',
}: XPProgressBarProps) {
  const pct = isMaxLevel ? 100 : xpToNextLevel > 0 ? Math.round((xpForCurrentLevel / xpToNextLevel) * 100) : 0
  const tierColor = TIER_HEX[tierNumber] ?? '#9ca3af'

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative rounded-full overflow-hidden ${className}`}
      style={{ backgroundColor: 'var(--color-xp-bg, rgba(212,168,83,0.1))' }}
    >
      <div
        data-testid="xp-bar-fill"
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          backgroundColor: tierColor,
          boxShadow: pct > 0 ? `0 0 8px ${tierColor}40` : 'none',
        }}
      />
    </div>
  )
}
