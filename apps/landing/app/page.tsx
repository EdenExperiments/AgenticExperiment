import Navbar from './components/Navbar'
import ScrollReveal from './components/ScrollReveal'

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

/* ─── Page ─────────────────────────────────────────────── */
export default function LandingPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <>
      <Navbar />

      <main id="main-content" tabIndex={-1}>
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="hero-section" aria-label="Hero">
          {/* Atmosphere */}
          <div className="orb orb-1" aria-hidden="true" />
          <div className="orb orb-2" aria-hidden="true" />
          <div className="orb orb-3" aria-hidden="true" />
          <div className="hero-grid" aria-hidden="true" />

          <div className="container-landing hero-content">
            <p className="hero-eyebrow">A self-improvement platform</p>

            <h1 className="hero-heading">
              <span className="hero-heading-line1">Forge your</span>
              <span className="hero-heading-gold">Legend</span>
            </h1>

            <p className="hero-sub">
              Turn real-world effort into RPG progression. Level up skills across
              fitness, music, languages, tech, and more — one session at a time.
            </p>

            <div className="hero-ctas">
              <a href={`${appUrl}/register`} className="btn-primary">
                Start Your Quest →
              </a>
              <a href="#apps" className="btn-ghost">
                See the Suite
              </a>
            </div>
          </div>

          {/* Scroll hint */}
          <div className="hero-scroll-hint" aria-hidden="true">
            <span>Scroll</span>
            <div className="scroll-chevron" />
          </div>
        </section>

        {/* ── Apps Section ──────────────────────────────────── */}
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
                      <span className="app-feature-dot-gold" />
                      <span>XP & levelling across <strong style={{ color: 'var(--color-text)' }}>11 tiers</strong> — Novice through Legend</span>
                    </li>
                    <li className="app-feature">
                      <span className="app-feature-dot-gold" />
                      <span><strong style={{ color: 'var(--color-text)' }}>Blocker gates</strong> at each tier boundary — prove mastery, don't grind past it</span>
                    </li>
                    <li className="app-feature">
                      <span className="app-feature-dot-gold" />
                      <span><strong style={{ color: 'var(--color-text)' }}>100+ skill presets</strong> across 15 categories to start instantly</span>
                    </li>
                    <li className="app-feature">
                      <span className="app-feature-dot-gold" />
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
                        <span className="app-feature-dot-emerald" />
                        <span>Macro & calorie tracking</span>
                      </li>
                      <li className="app-feature" style={{ fontSize: '0.85rem' }}>
                        <span className="app-feature-dot-emerald" />
                        <span>Weight trend visualisation</span>
                      </li>
                      <li className="app-feature" style={{ fontSize: '0.85rem' }}>
                        <span className="app-feature-dot-emerald" />
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
                        <span className="app-feature-dot-sage" />
                        <span>Daily mood & energy logging</span>
                      </li>
                      <li className="app-feature" style={{ fontSize: '0.85rem' }}>
                        <span className="app-feature-dot-sage" />
                        <span>Pattern detection over time</span>
                      </li>
                      <li className="app-feature" style={{ fontSize: '0.85rem' }}>
                        <span className="app-feature-dot-sage" />
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

        {/* ── Features ──────────────────────────────────────── */}
        <section className="section" id="features" style={{ background: 'linear-gradient(180deg, var(--color-bg) 0%, var(--color-surface) 100%)' }} aria-label="Features">
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
              <ScrollReveal delay={0}>
                <div className="feature-card">
                  <div className="feature-icon"><IconXP /></div>
                  <div>
                    <p className="feature-name">XP & Level System</p>
                    <p className="feature-desc">
                      Log real-world sessions to earn XP and climb through 11 tiers — from
                      Novice to Legend. The curve steepens as you advance, reflecting how
                      mastery actually works.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={100}>
                <div className="feature-card">
                  <div className="feature-icon"><IconGate /></div>
                  <div>
                    <p className="feature-name">Blocker Gates</p>
                    <p className="feature-desc">
                      Ten tier checkpoints per skill. Reaching a gate locks your visible level until
                      you clear it — forcing a meaningful challenge instead of grinding
                      past plateaus.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={150}>
                <div className="feature-card">
                  <div className="feature-icon"><IconPresets /></div>
                  <div>
                    <p className="feature-name">Skill Presets</p>
                    <p className="feature-desc">
                      Over 100 pre-built skill templates across 15 categories — fitness, music,
                      languages, tech, cooking, and more. Start a skill in seconds with
                      sensible defaults.
                    </p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={200}>
                <div className="feature-card">
                  <div className="feature-icon"><IconAI /></div>
                  <div>
                    <p className="feature-name">AI Calibration</p>
                    <p className="feature-desc">
                      Bring your own Claude API key. Describe your current ability in plain language
                      and get a precise starting level with a reasoned rationale — so you
                      begin exactly where you are.
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────── */}
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
              <ScrollReveal delay={0}>
                <div className="how-step">
                  <div className="how-number">I</div>
                  <div className="feature-icon" style={{ margin: '0 auto 1rem', width: 44, height: 44 }}>
                    <IconSword />
                  </div>
                  <p className="how-title">Choose a Skill</p>
                  <p className="how-desc">
                    Pick from 100+ presets or build your own. Use AI calibration to find
                    your true starting level — no inflated beginnings.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={120}>
                <div className="how-step">
                  <div className="how-number">II</div>
                  <div className="feature-icon" style={{ margin: '0 auto 1rem', width: 44, height: 44 }}>
                    <IconScroll />
                  </div>
                  <p className="how-title">Log Your Sessions</p>
                  <p className="how-desc">
                    Each real-world session earns XP. Add a note, pick an amount, watch
                    your level climb. The dashboard shows your recent momentum at a glance.
                  </p>
                </div>
              </ScrollReveal>

              <ScrollReveal delay={240}>
                <div className="how-step">
                  <div className="how-number">III</div>
                  <div className="feature-icon" style={{ margin: '0 auto 1rem', width: 44, height: 44 }}>
                    <IconTrophy />
                  </div>
                  <p className="how-title">Break Through Gates</p>
                  <p className="how-desc">
                    At each tier boundary, a gate locks your progress. Complete a meaningful
                    real-world challenge, clear the gate, and advance to the next tier.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ────────────────────────────────────── */}
        <section className="cta-section" aria-label="Call to action">
          <div className="container-landing cta-inner">
            <ScrollReveal>
              <h2 className="cta-heading">
                Ready to begin<br />your quest?
              </h2>
              <p className="cta-sub">
                Free to use. Bring your own Claude API key for AI features.
                No subscriptions, no paywalls — just progression.
              </p>
              <a href={`${appUrl}/register`} className="btn-primary" style={{ fontSize: '0.9rem', padding: '1rem 2.5rem' }}>
                Create Free Account →
              </a>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────── */}
        <footer className="footer" aria-label="Footer">
          <div className="container-landing footer-inner">
            <a href="#" className="footer-logo">
              <span aria-hidden="true">⚔</span>
              <span>RpgTracker</span>
            </a>

            <ul className="footer-links">
              <li>
                <a href="https://github.com/EdenExperiments" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </li>
              <li><a href="#features">Features</a></li>
              <li><a href="#apps">The Suite</a></li>
              <li><a href={`${appUrl}/login`}>Sign In</a></li>
            </ul>

            <p className="footer-copy">
              © {new Date().getFullYear()} RpgTracker. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}
