import ScrollReveal from './ScrollReveal'

/* ─── SVG Icons ────────────────────────────────────────── */
function IconXP() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  )
}
function IconGate() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}
function IconPresets() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
    </svg>
  )
}
function IconAI() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z" />
      <path d="M9 21v-2a3 3 0 0 1 3-3 3 3 0 0 1 3 3v2" />
      <path d="M19 9h2M3 9h2M12 17v2" />
    </svg>
  )
}

const features = [
  {
    icon: <IconXP />,
    name: 'XP & Level System',
    desc: 'Log real-world sessions to earn XP and climb through 11 tiers — from Novice to Legend. The curve steepens as you advance, reflecting how mastery actually works.',
    delay: 0,
  },
  {
    icon: <IconGate />,
    name: 'Blocker Gates',
    desc: 'Ten tier checkpoints per skill. Reaching a gate locks your visible level until you clear it — forcing a meaningful challenge instead of grinding past plateaus.',
    delay: 100,
  },
  {
    icon: <IconPresets />,
    name: 'Skill Presets',
    desc: 'Over 100 pre-built skill templates across 15 categories — fitness, music, languages, tech, cooking, and more. Start a skill in seconds with sensible defaults.',
    delay: 150,
  },
  {
    icon: <IconAI />,
    name: 'AI Calibration',
    desc: 'Bring your own Claude API key. Describe your current ability in plain language and get a precise starting level with a reasoned rationale — so you begin exactly where you are.',
    delay: 200,
  },
]

export default function FeaturesSection() {
  return (
    <section className="section features-section-bg" id="features" aria-label="Features">
      <div className="container-landing">
        <ScrollReveal>
          <div className="section-label-row">
            <div className="section-rule" />
            <span className="section-label">LifeQuest Features</span>
            <div className="section-rule" />
          </div>
          <h2 className="section-heading">Built around real mastery.</h2>
          <p className="section-sub">
            No streak-chasing. No hollow gamification. Every mechanic is designed
            to reflect and reinforce genuine skill development.
          </p>
        </ScrollReveal>

        <div className="features-grid">
          {features.map((f) => (
            <ScrollReveal key={f.name} delay={f.delay}>
              <div className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <div>
                  <p className="feature-name">{f.name}</p>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
