const TIER_COLORS: Record<number, string> = {
  1:  'bg-gray-400',
  2:  'bg-blue-500',
  3:  'bg-teal-500',
  4:  'bg-green-500',
  5:  'bg-lime-500',
  6:  'bg-purple-600',
  7:  'bg-fuchsia-600',
  8:  'bg-amber-600',
  9:  'bg-orange-600',
  10: 'bg-red-600',
  11: 'bg-gradient-to-r from-yellow-400 to-amber-500',
}

const TIER_BG: Record<number, string> = {
  1:  'bg-gray-100',
  2:  'bg-blue-50',
  3:  'bg-teal-50',
  4:  'bg-green-50',
  5:  'bg-lime-50',
  6:  'bg-purple-50',
  7:  'bg-fuchsia-50',
  8:  'bg-amber-50',
  9:  'bg-orange-50',
  10: 'bg-red-50',
  11: 'bg-yellow-50',
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
  const fillClass = TIER_COLORS[tierNumber] ?? 'bg-gray-400'
  const bgClass = TIER_BG[tierNumber] ?? 'bg-gray-100'

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative h-3 rounded-full overflow-hidden ${bgClass} ${className}`}
    >
      <div
        data-testid="xp-bar-fill"
        className={`h-full rounded-full transition-all duration-300 ${fillClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
