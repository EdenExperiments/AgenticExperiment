import { render, screen } from '@testing-library/react'
import { BottomTabBar } from './BottomTabBar'
import type { NavItem } from './nav'

const lifequestItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', matchPrefix: '/dashboard' },
  { label: 'Skills', href: '/skills', icon: '⚔️', matchPrefix: '/skills' },
  { label: 'Goals', href: '/goals', icon: '🎯', matchPrefix: '/goals' },
  { label: 'Account', href: '/account', icon: '👤', matchPrefix: '/account' },
]

test('renders four LifeQuest tabs from items', () => {
  render(<BottomTabBar currentPath="/dashboard" items={lifequestItems} />)
  expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /skills/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /goals/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /account/i })).toBeInTheDocument()
  expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/nutrilog/i)).not.toBeInTheDocument()
})

test('marks dashboard as active on /dashboard', () => {
  render(<BottomTabBar currentPath="/dashboard" items={lifequestItems} />)
  const link = screen.getByRole('link', { name: /dashboard/i })
  expect(link).toHaveAttribute('aria-current', 'page')
})

test('renders coming-soon tab when href is null', () => {
  render(
    <BottomTabBar
      currentPath="/dashboard"
      items={[{ label: 'MindTrack', href: null, icon: '🧠', matchPrefix: '/mind' }]}
    />
  )
  expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /mindtrack/i })).not.toBeInTheDocument()
})
