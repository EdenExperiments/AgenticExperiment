import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AccountPage from '../(app)/account/page'

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

