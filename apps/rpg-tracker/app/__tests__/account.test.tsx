import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AccountPage from '../(app)/account/page'
import PasswordPage from '../(app)/account/password/page'
import APIKeyPage from '../(app)/account/api-key/page'

vi.mock('@rpgtracker/api-client', () => ({
  getAccount: vi.fn().mockResolvedValue({ display_name: 'Test User', email: 'test@example.com' }),
  getAPIKeyStatus: vi.fn().mockResolvedValue({ has_key: false }),
  saveAPIKey: vi.fn().mockResolvedValue({}),
}))

vi.mock('@rpgtracker/auth/client', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
    },
  })),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/account',
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

// AccountPage must not have server-only imports (it uses 'use client')
test('renders account heading', () => {
  render(<AccountPage />, { wrapper })
  expect(screen.getByRole('heading', { name: /account/i })).toBeInTheDocument()
})

// ── T1b: Layout + Colour Migration Tests ──────────────────────────────────────

test('AC-06: account page settings container has md:grid-cols-2 class', async () => {
  const { container } = render(<AccountPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /account/i })).toBeInTheDocument()
  })
  const settingsGrid = container.querySelector('[data-testid="settings-grid"]')
  expect(settingsGrid).not.toBeNull()
  expect(settingsGrid!.className).toMatch(/md:grid-cols-2/)
})

test('AC-10: account page rendered HTML contains no hardcoded gray- colour classes', async () => {
  const { container } = render(<AccountPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /account/i })).toBeInTheDocument()
  })
  // Scan full rendered HTML for forbidden pattern — exclude tier-accent-* classes
  const html = container.innerHTML
  // Remove tier-accent class occurrences before scanning
  const htmlWithoutTierAccent = html.replace(/tier-accent-[^\s"']*/g, '')
  const forbiddenPattern = /(bg|text|border)-gray-\d/
  expect(htmlWithoutTierAccent).not.toMatch(forbiddenPattern)
})

test('AC-11: password page rendered HTML contains no dark:bg-gray-* or dark:border-gray-* classes', () => {
  const { container } = render(<PasswordPage />, { wrapper })
  const html = container.innerHTML
  const forbiddenPattern = /dark:(bg|border)-gray-\d/
  expect(html).not.toMatch(forbiddenPattern)
})

test('AC-12: api-key page rendered HTML contains no dark:bg-gray-* or dark:border-gray-* classes', () => {
  const { container } = render(<APIKeyPage />, { wrapper })
  const html = container.innerHTML
  const forbiddenPattern = /dark:(bg|border)-gray-\d/
  expect(html).not.toMatch(forbiddenPattern)
})

test('AC-18: account page section headers reference var(--font-display)', async () => {
  const { container } = render(<AccountPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /account/i })).toBeInTheDocument()
  })
  // At least one heading (h1 or h2) must use var(--font-display)
  const headings = container.querySelectorAll('h1, h2')
  expect(headings.length).toBeGreaterThan(0)
  const atLeastOneUsesDisplayFont = Array.from(headings).some(
    (h) => (h as HTMLElement).style.fontFamily.includes('var(--font-display')
  )
  expect(atLeastOneUsesDisplayFont).toBe(true)
})
