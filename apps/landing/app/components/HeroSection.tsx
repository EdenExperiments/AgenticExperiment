import { ThemeSwitcher } from '@rpgtracker/ui'
import ScrollReveal from './ScrollReveal'

interface Props {
  appUrl: string
}

export default function HeroSection({ appUrl }: Props) {
  return (
    <section className="hero-section" aria-label="Hero">
      {/* Atmosphere — hidden for Minimal, themed for Retro/Modern via CSS */}
      <div className="orb orb-1" aria-hidden="true" />
      <div className="orb orb-2" aria-hidden="true" />
      <div className="orb orb-3" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />

      <div className="container-landing hero-content">
        {/* Eyebrow — per-theme copy via CSS show/hide */}
        <p className="hero-eyebrow">
          <span className="theme-copy theme-copy-minimal">A skill-tracking platform</span>
          <span className="theme-copy theme-copy-retro">A self-improvement platform</span>
          <span className="theme-copy theme-copy-modern">Personal development system</span>
        </p>

        {/* Heading — per-theme copy and styling */}
        <h1 className="hero-heading">
          {/* Minimal — clean single heading */}
          <span className="theme-copy theme-copy-minimal">
            <span className="hero-heading-single">
              Track your skills.<br />
              See your progress.
            </span>
          </span>

          {/* Retro — two-line with gold accent */}
          <span className="theme-copy theme-copy-retro">
            <span className="hero-heading-line1">Forge your</span>
            <span className="hero-heading-accent">Legend</span>
          </span>

          {/* Modern — two-line with cyan accent */}
          <span className="theme-copy theme-copy-modern">
            <span className="hero-heading-line1">Command Your</span>
            <span className="hero-heading-accent">Growth</span>
          </span>
        </h1>

        {/* Sub-heading — per-theme copy */}
        <p className="hero-sub">
          <span className="theme-copy theme-copy-minimal">
            A practical platform for tracking real-world skill development.
            Set goals, log sessions, and measure your progress over time.
          </span>
          <span className="theme-copy theme-copy-retro">
            Turn real-world effort into RPG progression. Level up skills across
            fitness, music, languages, tech, and more — one session at a time.
          </span>
          <span className="theme-copy theme-copy-modern">
            Track. Train. Transform. A precision tool for measuring real-world
            skill development across every domain you care about.
          </span>
        </p>

        <div className="hero-ctas">
          <a href={`${appUrl}/register`} className="btn-primary">
            <span className="theme-copy theme-copy-minimal">Get Started →</span>
            <span className="theme-copy theme-copy-retro">Start Your Quest →</span>
            <span className="theme-copy theme-copy-modern">Launch →</span>
          </a>
          <a href="#apps" className="btn-ghost">
            See the Suite
          </a>
        </div>

        <div className="hero-theme-switcher">
          <ThemeSwitcher />
        </div>
      </div>

      {/* Scroll hint */}
      <div className="hero-scroll-hint" aria-hidden="true">
        <span>Scroll</span>
        <div className="scroll-chevron" />
      </div>
    </section>
  )
}
