const features = [
  {
    icon: '⚡',
    title: 'XP & Levels',
    desc: '11 tiers from Novice to Legend with a real mastery curve.',
  },
  {
    icon: '🔒',
    title: 'Blocker Gates',
    desc: 'Prove your skills at each tier boundary — no grinding past plateaus.',
  },
  {
    icon: '🤖',
    title: 'AI Calibration',
    desc: 'Describe your ability, get a precise starting level via Claude.',
  },
  {
    icon: '📦',
    title: '100+ Presets',
    desc: 'Start any skill instantly across 15 categories.',
  },
]

export default function FeaturePreview() {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3
        className="text-sm font-semibold mb-4 uppercase tracking-wider"
        style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
      >
        What you&apos;ll get
      </h3>
      <ul className="space-y-3">
        {features.map((f) => (
          <li key={f.title} className="flex gap-3">
            <span className="text-lg flex-shrink-0" aria-hidden="true">{f.icon}</span>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {f.title}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                {f.desc}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
