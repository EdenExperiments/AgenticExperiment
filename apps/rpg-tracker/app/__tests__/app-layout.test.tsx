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

test('renders navigation', () => {
  vi.mocked(usePathname).mockReturnValue('/dashboard')
  render(<AppLayout><div>content</div></AppLayout>, { wrapper })
  // BottomTabBar is md:hidden; Sidebar is hidden md:flex — check nav links are present
  expect(screen.getAllByRole('link', { name: /dashboard/i }).length).toBeGreaterThan(0)
})
