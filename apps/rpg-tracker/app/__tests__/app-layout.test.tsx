import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import AppLayout from '../(app)/layout'

test('renders navigation', () => {
  vi.mocked(usePathname).mockReturnValue('/dashboard')
  render(<AppLayout><div>content</div></AppLayout>)
  // BottomTabBar is md:hidden; Sidebar is hidden md:flex — check nav links are present
  expect(screen.getAllByRole('link', { name: /dashboard/i }).length).toBeGreaterThan(0)
})
