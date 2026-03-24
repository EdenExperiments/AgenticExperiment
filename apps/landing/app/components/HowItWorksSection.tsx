import ScrollReveal from './ScrollReveal'

/* ─── SVG Icons ────────────────────────────────────────── */
function IconSword() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2.5l7 7-12 12-7-7z" />
      <path d="M3 21l3-3M16 6l2-2" />
    </svg>
  )
}
function IconScroll() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" />
    </svg>
  )
}
function IconTrophy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 0 0 5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 1 0 5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  )
}

const steps = [
  {
    numeral: 'I',
    icon: <IconSword />,
    title: 'Choose a Skill',
    desc: 'Pick from a library of presets or build your own. Use AI calibration to find your true starting level — no inflated beginnings.',
    delay: 0,
  },
  {
    numeral: 'II',
    icon: <IconScroll />,
    title: 'Log Your Sessions',
    desc: 'Use the built-in Pomodoro timer or log XP directly. Each session earns XP toward your next level. The dashboard shows your recent momentum at a glance.',
    delay: 120,
  },
  {
    numeral: 'III',
    icon: <IconTrophy />,
    title: 'Break Through Gates',
    desc: 'At each tier boundary, a gate locks your progress. Complete a meaningful real-world challenge, clear the gate, and advance to the next tier.',
    delay: 240,
  },
]

export default function HowItWorksSection() {
  return (
    <section className="section" id="how" aria-label="How it works">
      <div className="container-landing">
        <ScrollReveal>
          <div className="section-label-row">
            <div className="section-rule" />
            <span className="section-label">Your Path</span>
            <div className="section-rule" />
          </div>
          <h2 className="section-heading">How it works.</h2>
          <p className="section-sub">
            Three steps stand between you and your first level-up.
          </p>
        </ScrollReveal>

        <div className="how-grid">
          {steps.map((s) => (
            <ScrollReveal key={s.numeral} delay={s.delay}>
              <div className="how-step">
                <div className="how-number">{s.numeral}</div>
                <div className="feature-icon" style={{ margin: '0 auto 1rem', width: 44, height: 44 }}>
                  {s.icon}
                </div>
                <p className="how-title">{s.title}</p>
                <p className="how-desc">{s.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
