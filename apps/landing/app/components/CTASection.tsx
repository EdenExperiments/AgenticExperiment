import ScrollReveal from './ScrollReveal'

interface Props {
  appUrl: string
}

export default function CTASection({ appUrl }: Props) {
  return (
    <section className="cta-section" aria-label="Call to action">
      <div className="container-landing cta-inner">
        <ScrollReveal>
          {/* Heading — per-theme */}
          <h2 className="cta-heading">
            <span className="theme-copy theme-copy-minimal">
              Ready to start<br />tracking?
            </span>
            <span className="theme-copy theme-copy-retro">
              Ready to begin<br />your quest?
            </span>
            <span className="theme-copy theme-copy-modern">
              Ready to<br />launch?
            </span>
          </h2>

          {/* Sub — per-theme */}
          <p className="cta-sub">
            <span className="theme-copy theme-copy-minimal">
              Free to use. Bring your own Claude API key for AI features.
              No subscriptions, no paywalls — just progress.
            </span>
            <span className="theme-copy theme-copy-retro">
              Free to use. Bring your own Claude API key for AI features.
              No subscriptions, no paywalls — just progression.
            </span>
            <span className="theme-copy theme-copy-modern">
              Free to deploy. Bring your own Claude API key for AI calibration.
              No subscriptions. No paywalls. Just data.
            </span>
          </p>

          <a href={`${appUrl}/register`} className="btn-primary" style={{ fontSize: '0.9rem', padding: '1rem 2.5rem' }}>
            <span className="theme-copy theme-copy-minimal">Create Free Account →</span>
            <span className="theme-copy theme-copy-retro">Create Free Account →</span>
            <span className="theme-copy theme-copy-modern">Create Account →</span>
          </a>
        </ScrollReveal>
      </div>
    </section>
  )
}
