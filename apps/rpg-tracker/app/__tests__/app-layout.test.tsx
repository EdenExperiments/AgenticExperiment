import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePathname } from 'next/navigation'
import AppLayout from '../(app)/layout'

vi.mock('@rpgtracker/api-client', () => ({
  getAccount: vi.fn().mockResolvedValue({
    display_name: 'Test',
    email: 'test@example.com',
    primary_skill_id: null,
    avatar_url: null,
  }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

test('renders LifeQuest navigation including Goals', () => {
  vi.mocked(usePathname).mockReturnValue('/dashboard')
  render(<AppLayout><div>content</div></AppLayout>, { wrapper })
  expect(screen.getAllByRole('link', { name: /dashboard/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('link', { name: /skills/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('link', { name: /goals/i }).length).toBeGreaterThan(0)
  expect(screen.getAllByRole('link', { name: /account/i }).length).toBeGreaterThan(0)
  expect(screen.queryByText(/nutrilog/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
})

test('skips LifeQuest chrome on product routes', () => {
  vi.mocked(usePathname).mockReturnValue('/nutri')
  render(<AppLayout><div>content</div></AppLayout>, { wrapper })
  expect(screen.queryByRole('link', { name: /skills/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /goals/i })).not.toBeInTheDocument()
})
