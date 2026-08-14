import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import type { NavItem } from './nav'

const lifequestItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', matchPrefix: '/dashboard' },
  { label: 'Skills', href: '/skills', icon: '⚔️', matchPrefix: '/skills' },
  { label: 'Goals', href: '/goals', icon: '🎯', matchPrefix: '/goals' },
  { label: 'Account', href: '/account', icon: '👤', matchPrefix: '/account' },
]

test('renders navigation links from items', () => {
  render(<Sidebar title="LifeQuest" currentPath="/dashboard" items={lifequestItems} />)
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Skills' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Goals' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Account' })).toBeInTheDocument()
  expect(screen.queryByText('Soon')).not.toBeInTheDocument()
  expect(screen.queryByText('NutriLog')).not.toBeInTheDocument()
})

test('marks current section as active', () => {
  render(<Sidebar title="LifeQuest" currentPath="/skills/new" items={lifequestItems} />)
  expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute('aria-current', 'page')
})

test('renders coming-soon item when href is null', () => {
  render(
    <Sidebar
      title="LifeQuest"
      currentPath="/dashboard"
      items={[{ label: 'MindTrack', href: null, icon: '🧠', matchPrefix: '/mind' }]}
    />
  )
  expect(screen.getByText('MindTrack')).toBeInTheDocument()
  expect(screen.getByText('Soon')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'MindTrack' })).not.toBeInTheDocument()
})
