import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import SuiteAppsSection from './components/SuiteAppsSection'
import FeaturesSection from './components/FeaturesSection'
import HowItWorksSection from './components/HowItWorksSection'
import SocialProofSection from './components/SocialProofSection'
import CTASection from './components/CTASection'

export default function LandingPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <>
      <Navbar />

      <main id="main-content" tabIndex={-1}>
        <HeroSection appUrl={appUrl} />
        <SuiteAppsSection appUrl={appUrl} />
        <FeaturesSection />
        <HowItWorksSection />
        <SocialProofSection />
        <CTASection appUrl={appUrl} />

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
