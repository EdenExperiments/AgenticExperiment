import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AccountPage from '../(app)/account/page'

const mockGetAccount = vi.fn()
const mockGetAPIKeyStatus = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  getAccount: (...args: unknown[]) => mockGetAccount(...args),
  getAPIKeyStatus: (...args: unknown[]) => mockGetAPIKeyStatus(...args),
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

beforeEach(() => {
  mockGetAccount.mockResolvedValue({
    display_name: 'Test User',
    email: 'test@example.com',
    subscription_tier: 'free',
  })
  mockGetAPIKeyStatus.mockResolvedValue({ has_key: false })
})

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

describe('subscription section (AC-9)', () => {
  test('shows Free tier and trial CTA for free users', async () => {
    mockGetAccount.mockResolvedValue({
      display_name: 'Test User',
      email: 'test@example.com',
      subscription_tier: 'free',
    })
    render(<AccountPage />, { wrapper })

    const section = await screen.findByTestId('subscription-section')
    expect(section).toHaveAttribute('id', 'subscription')
    expect(screen.getByText(/current plan/i)).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText(/14-day free trial/i)).toBeInTheDocument()
    expect(screen.getByTestId('subscription-upgrade-btn')).toHaveAttribute('href', '/account#subscription')
  })

  test('shows Pro status for pro users', async () => {
    mockGetAccount.mockResolvedValue({
      display_name: 'Test User',
      email: 'test@example.com',
      subscription_tier: 'pro',
    })
    render(<AccountPage />, { wrapper })

    await screen.findByText('Pro')
    expect(screen.getByText(/you're on pro/i)).toBeInTheDocument()
    expect(screen.queryByTestId('subscription-upgrade-btn')).not.toBeInTheDocument()
  })

  test('pro user without API key sees link to set up key', async () => {
    mockGetAccount.mockResolvedValue({
      display_name: 'Test User',
      email: 'test@example.com',
      subscription_tier: 'pro',
    })
    mockGetAPIKeyStatus.mockResolvedValue({ has_key: false })
    render(<AccountPage />, { wrapper })

    await screen.findByRole('link', { name: /set up your api key/i })
  })
})
