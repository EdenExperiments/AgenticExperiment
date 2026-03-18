import { render, screen } from '@testing-library/react'
import { BottomTabBar } from './BottomTabBar'

test('renders four tabs', () => {
  render(<BottomTabBar currentPath="/dashboard" />)
  expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /lifequest/i })).toBeInTheDocument()
  expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument()
})

test('marks dashboard as active on /dashboard', () => {
  render(<BottomTabBar currentPath="/dashboard" />)
  const link = screen.getByRole('link', { name: /dashboard/i })
  expect(link).toHaveAttribute('aria-current', 'page')
})

test('NutriLog tab is not a link (coming soon)', () => {
  render(<BottomTabBar currentPath="/dashboard" />)
  expect(screen.queryByRole('link', { name: /nutrilog/i })).not.toBeInTheDocument()
})
