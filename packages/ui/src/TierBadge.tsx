const TIER_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  1:  { bg: 'rgba(156,163,175,0.15)', text: '#d1d5db', border: 'rgba(156,163,175,0.3)' },
  2:  { bg: 'rgba(59,130,246,0.15)',  text: '#93c5fd', border: 'rgba(59,130,246,0.3)' },
  3:  { bg: 'rgba(20,184,166,0.15)',  text: '#5eead4', border: 'rgba(20,184,166,0.3)' },
  4:  { bg: 'rgba(34,197,94,0.15)',   text: '#86efac', border: 'rgba(34,197,94,0.3)' },
  5:  { bg: 'rgba(132,204,22,0.15)',  text: '#bef264', border: 'rgba(132,204,22,0.3)' },
  6:  { bg: 'rgba(147,51,234,0.15)',  text: '#c4b5fd', border: 'rgba(147,51,234,0.3)' },
  7:  { bg: 'rgba(192,38,211,0.15)',  text: '#f0abfc', border: 'rgba(192,38,211,0.3)' },
  8:  { bg: 'rgba(217,119,6,0.15)',   text: '#fcd34d', border: 'rgba(217,119,6,0.3)' },
  9:  { bg: 'rgba(234,88,12,0.15)',   text: '#fdba74', border: 'rgba(234,88,12,0.3)' },
  10: { bg: 'rgba(220,38,38,0.15)',   text: '#fca5a5', border: 'rgba(220,38,38,0.3)' },
  11: { bg: 'rgba(250,204,21,0.15)',  text: '#fde047', border: 'rgba(250,204,21,0.4)' },
}

interface TierBadgeProps {
  tierName: string
  tierNumber: number
  className?: string
}

export function TierBadge({ tierName, tierNumber, className = '' }: TierBadgeProps) {
  const style = TIER_STYLES[tierNumber] ?? TIER_STYLES[1]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {tierName}
    </span>
  )
}
