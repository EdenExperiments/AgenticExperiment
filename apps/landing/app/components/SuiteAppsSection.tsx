import ScrollReveal from './ScrollReveal'

interface Props {
  appUrl: string
}

export default function SuiteAppsSection({ appUrl }: Props) {
  return (
    <section className="section" id="apps" aria-label="The Suite">
      <div className="container-landing">
        <ScrollReveal>
          <div className="section-label-row">
            <div className="section-rule" />
            <span className="section-label">The Suite</span>
            <div className="section-rule" />
          </div>
          <h2 className="section-heading">Three Apps. One Platform.</h2>
          <p className="section-sub">
            Each app targets a different dimension of self-improvement —
            built on the same progression philosophy, tuned for its domain.
          </p>
        </ScrollReveal>

        <div className="apps-grid">
          {/* LifeQuest — Featured */}
          <ScrollReveal>
            <div className="app-card app-card-lifequest" style={{ height: '100%' }}>
              <div className="app-card-header">
                <div className="app-card-identity">
                  <span className="app-emoji">⚔️</span>
                  <span className="app-name">LifeQuest</span>
                </div>
                <span className="badge-live">Live</span>
              </div>

              <p className="app-tagline">
                Turn real skills into RPG progression. Log sessions, break through
                tier gates, and watch your level climb from Novice to Legend.
              </p>

              <ul className="app-features">
                <li className="app-feature">
                  <span className="app-feature-dot app-feature-dot-accent" />
                  <span>XP &amp; levelling across <strong style={{ color: 'var(--color-text)' }}>11 tiers</strong> — Novice through Legend</span>
                </li>
                <li className="app-feature">
                  <span className="app-feature-dot app-feature-dot-accent" />
                  <span><strong style={{ color: 'var(--color-text)' }}>Blocker gates</strong> at each tier boundary — prove mastery, don&apos;t grind past it</span>
                </li>
                <li className="app-feature">
                  <span className="app-feature-dot app-feature-dot-accent" />
                  <span><strong style={{ color: 'var(--color-text)' }}>100+ skill presets</strong> across 15 categories to start instantly</span>
                </li>
                <li className="app-feature">
                  <span className="app-feature-dot app-feature-dot-accent" />
                  <span><strong style={{ color: 'var(--color-text)' }}>AI calibration</strong> via Claude — describe your level, get a precise starting point</span>
                </li>
              </ul>

              <div className="app-stats">
                <div className="app-stat">
                  <span className="app-stat-value">11</span>
                  <span className="app-stat-label">Tiers</span>
                </div>
                <div className="app-stat">
                  <span className="app-stat-value">100+</span>
                  <span className="app-stat-label">Presets</span>
                </div>
                <div className="app-stat">
                  <span className="app-stat-value">10</span>
                  <span className="app-stat-label">Gates / Skill</span>
                </div>
              </div>

              <a href={`${appUrl}`} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                Enter LifeQuest →
              </a>
            </div>
          </ScrollReveal>

          {/* Side cards */}
          <div className="side-cards">
            <ScrollReveal delay={100}>
              <div className="app-card app-card-nutrilog">
                <div className="app-card-header">
                  <div className="app-card-identity">
                    <span className="app-emoji">🥗</span>
                    <span className="app-name" style={{ fontSize: '0.95rem' }}>NutriLog</span>
                  </div>
                  <span className="badge-soon">Coming Soon</span>
                </div>
                <p className="app-tagline" style={{ fontSize: '0.875rem' }}>
                  Track macros and weight with clarity. No complexity, just progress.
                </p>
                <ul className="app-features">
                  <li className="app-feature" style={{ fontSize: '0.85rem' }}>
                    <span className="app-feature-dot app-feature-dot-nutrilog" />
                    <span>Macro &amp; calorie tracking</span>
                  </li>
                  <li className="app-feature" style={{ fontSize: '0.85rem' }}>
                    <span className="app-feature-dot app-feature-dot-nutrilog" />
                    <span>Weight trend visualisation</span>
                  </li>
                  <li className="app-feature" style={{ fontSize: '0.85rem' }}>
                    <span className="app-feature-dot app-feature-dot-nutrilog" />
                    <span>Nutrition goal milestones</span>
                  </li>
                </ul>
                <span className="btn-disabled" style={{ alignSelf: 'flex-start' }}>Coming Soon</span>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="app-card app-card-mindtrack">
                <div className="app-card-header">
                  <div className="app-card-identity">
                    <span className="app-emoji">🧘</span>
                    <span className="app-name" style={{ fontSize: '0.95rem' }}>MindTrack</span>
                  </div>
                  <span className="badge-soon">Coming Soon</span>
                </div>
                <p className="app-tagline" style={{ fontSize: '0.875rem' }}>
                  Daily check-ins, mood patterns, and gentle self-reflection.
                </p>
                <ul className="app-features">
                  <li className="app-feature" style={{ fontSize: '0.85rem' }}>
                    <span className="app-feature-dot app-feature-dot-mindtrack" />
                    <span>Daily mood &amp; energy logging</span>
                  </li>
                  <li className="app-feature" style={{ fontSize: '0.85rem' }}>
                    <span className="app-feature-dot app-feature-dot-mindtrack" />
                    <span>Pattern detection over time</span>
                  </li>
                  <li className="app-feature" style={{ fontSize: '0.85rem' }}>
                    <span className="app-feature-dot app-feature-dot-mindtrack" />
                    <span>Reflection journal prompts</span>
                  </li>
                </ul>
                <span className="btn-disabled" style={{ alignSelf: 'flex-start' }}>Coming Soon</span>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}
