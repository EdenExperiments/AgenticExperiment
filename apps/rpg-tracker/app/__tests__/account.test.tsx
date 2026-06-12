import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AccountPage from '../(app)/account/page'

vi.mock('@rpgtracker/api-client', () => ({
  getAccount: vi.fn().mockResolvedValue({ display_name: 'Test User', email: 'test@example.com' }),
  getAPIKeyStatus: vi.fn().mockResolvedValue({ has_key: false }),
  getAccountStats: vi.fn().mockResolvedValue({
    total_xp: 0,
    longest_streak: 0,
    skill_count: 0,
    category_distribution: [],
  }),
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
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

describe('visual mode switcher (AC-045-5)', () => {
  test('renders Clean and Stylish mode controls on account page', () => {
    render(<AccountPage />, { wrapper })

    expect(screen.getByRole('group', { name: /visual mode/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clean/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /stylish/i })).toBeInTheDocument()
  })

  test('renders helper text explaining Stylish mode', () => {
    render(<AccountPage />, { wrapper })

    expect(
      screen.getByText(/stylish.*more motion|more motion.*decoration/i)
    ).toBeInTheDocument()
  })
})

