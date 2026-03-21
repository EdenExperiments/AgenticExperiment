import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScrollReveal from '../components/ScrollReveal'
import Navbar from '../components/Navbar'
import LandingPage from '../page'
import RootLayout from '../layout'

// Stub IntersectionObserver — not available in jsdom
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// ─── Test 1: ScrollReveal reduced motion (AC-3) ──────────────────────────────

test('ScrollReveal renders children immediately when reduced motion is preferred', () => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))

  const { container } = render(
    <ScrollReveal>
      <span>child content</span>
    </ScrollReveal>
  )

  const wrapper = container.firstChild as HTMLElement
  // After T2 implements reduced-motion support, the `reveal` class must NOT
  // appear on the wrapper when reduced motion is preferred.
  // Currently ScrollReveal always adds `reveal` in its initial JSX, so this fails.
  expect(wrapper).not.toHaveClass('reveal')
})

// ─── Test 2: Navbar focus management (AC-6) ───────────────────────────────────

test('Navbar moves focus into menu on open and back to toggle on close', async () => {
  const user = userEvent.setup()

  const { getByRole } = render(<Navbar />)

  const hamburgerButton = getByRole('button', { name: /open menu/i })

  await user.click(hamburgerButton)
  // After T2 implements focus management, clicking open should move focus to
  // the first link inside .navbar-links. Currently no focus management exists.
  await waitFor(() =>
    expect(document.activeElement).toBe(document.querySelector('.navbar-links a'))
  )

  await user.click(hamburgerButton)
  // After closing, focus should return to the hamburger toggle button.
  await waitFor(() => expect(document.activeElement).toBe(hamburgerButton))
})

// ─── Test 3: <main> landmark (AC-4) ───────────────────────────────────────────

test('page has a <main id="main-content"> landmark', () => {
  render(<LandingPage />)

  // After T2 wraps page sections in <main id="main-content" tabIndex={-1}>,
  // these assertions will pass. Currently page.tsx has no <main> element.
  expect(document.querySelector('main#main-content')).not.toBeNull()
  expect(document.querySelector('main#main-content')?.getAttribute('tabindex')).toBe('-1')
})

// ─── Test 4: Skip link (AC-5) ─────────────────────────────────────────────────

test('layout has a skip link pointing to #main-content', () => {
  // Skip link lives in layout.tsx, not page.tsx — test the layout component directly.
  render(<RootLayout><div /></RootLayout>)

  expect(document.querySelector('a[href="#main-content"]')).not.toBeNull()
})

// ─── Test 5: Env var wiring (AC-1 / AC-11) ───────────────────────────────────

describe('page CTA links use NEXT_PUBLIC_APP_URL, not localhost:3000', () => {
  const originalUrl = process.env.NEXT_PUBLIC_APP_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:4000'
  })

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalUrl
    }
  })

  test('CTA links use NEXT_PUBLIC_APP_URL value, not hardcoded localhost:3000', () => {
    render(<LandingPage />)

    const hrefs = Array.from(document.querySelectorAll('[href]')).map(el =>
      el.getAttribute('href')
    )

    // After T2 replaces hardcoded URLs with process.env.NEXT_PUBLIC_APP_URL,
    // at least one href will contain 'localhost:4000' and none will contain
    // 'localhost:3000'. Currently all CTA hrefs are hardcoded to localhost:3000.
    expect(hrefs.some(href => href?.includes('localhost:4000'))).toBe(true)
    expect(hrefs.every(href => !href?.includes('localhost:3000'))).toBe(true)
  })
})
