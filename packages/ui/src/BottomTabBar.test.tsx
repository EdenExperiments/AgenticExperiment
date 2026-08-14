import { render, screen } from '@testing-library/react'
import { BottomTabBar } from './BottomTabBar'
import type { NavItem } from './nav'

const items: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', matchPrefix: '/dashboard', icon: '🏠' },
  { label: 'Skills', href: '/skills', matchPrefix: '/skills', icon: '⚔️' },
  { label: 'Goals', href: '/goals', matchPrefix: '/goals', icon: '🎯' },
  { label: 'Account', href: '/account', matchPrefix: '/account', icon: '👤' },
]

test('renders four tabs from items', () => {
  render(<BottomTabBar currentPath="/dashboard" items={items} />)
  expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /skills/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /goals/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument()
})

test('marks dashboard as active on /dashboard', () => {
  render(<BottomTabBar currentPath="/dashboard" items={items} />)
  const link = screen.getByRole('link', { name: /dashboard/i })
  expect(link).toHaveAttribute('aria-current', 'page')
})

test('does not render a coming-soon NutriLog tab', () => {
  render(<BottomTabBar currentPath="/dashboard" items={items} />)
  expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /nutrilog/i })).not.toBeInTheDocument()
})
