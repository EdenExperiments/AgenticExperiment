import { TierBadge } from './TierBadge'

const TIER_DESCRIPTIONS: Record<number, string> = {
  2:  "You've mastered the basics and are building real consistency.",
  3:  "Solid competence — you're tackling harder challenges with confidence.",
  4:  "Consistent practice has made you genuinely skilled.",
  5:  "Focused dedication sets you apart from casual practitioners.",
  6:  "Deep experience and advanced technique define your practice.",
  7:  "Years of dedication have made you truly skilled. Keep going.",
  8:  "Elite-level mastery. Only a handful of practitioners reach this tier.",
  9:  "You are approaching the absolute peak of your practice.",
  10: "Near-peak mastery. Grandmaster-level achievement.",
  11: "Legend. This is exceptional. Fewer than a fraction of practitioners ever reach this level. The journey continues — there are 100 more levels ahead.",
}

interface TierTransitionModalProps {
  newTierName: string
  newTierNumber: number
  isOpen: boolean
  onContinue: () => void
}

export function TierTransitionModal({ newTierName, newTierNumber, isOpen, onContinue }: TierTransitionModalProps) {
  if (!isOpen) return null

  const description = TIER_DESCRIPTIONS[newTierNumber] ?? `You've reached ${newTierName}.`
  const isLegend = newTierNumber === 11

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:pl-64">
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full md:max-w-md rounded-t-3xl md:rounded-3xl p-8 text-center space-y-4 border"
        style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border-strong)' }}
      >
        <div className="flex justify-center">
          <TierBadge tierName={newTierName} tierNumber={newTierNumber} className="text-base px-4 py-1.5" />
        </div>
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          {isLegend ? `You've reached Legend.` : `You've reached ${newTierName}!`}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>{description}</p>
        <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
          The next tier requires more XP per level. This reflects the reality that advanced mastery takes greater effort.
        </p>
        <button
          onClick={onContinue}
          className="w-full py-4 mt-4 rounded-xl font-semibold text-white bg-[var(--color-accent,theme(colors.blue.600))] min-h-[48px] hover:opacity-90 transition-opacity"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
