const TIER_TEXT: Record<number, string> = {
  1:  'text-gray-600 bg-gray-100',
  2:  'text-blue-700 bg-blue-50',
  3:  'text-teal-700 bg-teal-50',
  4:  'text-green-700 bg-green-50',
  5:  'text-lime-700 bg-lime-50',
  6:  'text-purple-700 bg-purple-50',
  7:  'text-fuchsia-700 bg-fuchsia-50',
  8:  'text-amber-700 bg-amber-50',
  9:  'text-orange-700 bg-orange-50',
  10: 'text-red-700 bg-red-50',
  11: 'text-yellow-700 bg-yellow-100 font-bold',
}

interface TierBadgeProps {
  tierName: string
  tierNumber: number
  className?: string
}

export function TierBadge({ tierName, tierNumber, className = '' }: TierBadgeProps) {
  const colorClass = TIER_TEXT[tierNumber] ?? 'text-gray-600 bg-gray-100'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}>
      {tierName}
    </span>
  )
}
