import ScrollReveal from './ScrollReveal'

const highlights = [
  { value: '11', label: 'Progression Tiers' },
  { value: '100+', label: 'Skill Presets' },
  { value: '15', label: 'Categories' },
  { value: '10', label: 'Gates per Skill' },
]

export default function SocialProofSection() {
  return (
    <section className="social-proof-section" aria-label="Why RpgTracker">
      <div className="container-landing">
        <ScrollReveal>
          <div className="social-proof-inner">
            {/* Heading — per-theme */}
            <h2 className="social-proof-heading">
              <span className="theme-copy theme-copy-minimal">
                Built for people who take skill development seriously.
              </span>
              <span className="theme-copy theme-copy-retro">
                Your Legend Begins Here.
              </span>
              <span className="theme-copy theme-copy-modern">
                Mission Architecture.
              </span>
            </h2>

            {/* Body — per-theme */}
            <p className="social-proof-body">
              <span className="theme-copy theme-copy-minimal">
                Real progression based on logged effort, not streaks or points.
                Calibrated starting levels so you never begin at zero when you
                shouldn&apos;t. Over 100 skill presets across 15 categories, ready to go.
              </span>
              <span className="theme-copy theme-copy-retro">
                Every quest starts with a single step. RpgTracker was built by
                someone who wanted real progression — not empty gamification.
                Every mechanic serves the goal of genuine skill development.
              </span>
              <span className="theme-copy theme-copy-modern">
                Engineered for measurable growth. Every system in the platform is
                designed to track, calibrate, and accelerate real skill development
                across every domain.
              </span>
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <ul className="social-proof-highlights">
            {highlights.map((h) => (
              <li key={h.label} className="social-proof-highlight">
                <span className="social-proof-highlight-value">{h.value}</span>
                <span className="social-proof-highlight-label">{h.label}</span>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </div>
    </section>
  )
}
