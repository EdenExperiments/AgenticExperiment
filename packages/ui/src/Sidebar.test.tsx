import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import type { NavItem } from './nav'

const items: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', matchPrefix: '/dashboard', icon: '🏠' },
  { label: 'Skills', href: '/skills', matchPrefix: '/skills', icon: '⚔️' },
  { label: 'Goals', href: '/goals', matchPrefix: '/goals', icon: '🎯' },
  { label: 'Account', href: '/account', matchPrefix: '/account', icon: '👤' },
]

test('renders navigation links from items', () => {
  render(<Sidebar currentPath="/dashboard" items={items} />)
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Skills' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Goals' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Account' })).toBeInTheDocument()
})

test('marks current section as active', () => {
  render(<Sidebar currentPath="/skills/new" items={items} />)
  expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute('aria-current', 'page')
})

test('does not hardcode other products', () => {
  render(<Sidebar currentPath="/dashboard" items={items} />)
  expect(screen.queryByText('NutriLog')).not.toBeInTheDocument()
  expect(screen.queryByText('Soon')).not.toBeInTheDocument()
})

test('renders brand label', () => {
  render(<Sidebar currentPath="/nutri" items={items} brand="NutriLog" />)
  expect(screen.getByText('NutriLog')).toBeInTheDocument()
})

test('links brand to suite hub when brandHref is set', () => {
  render(<Sidebar currentPath="/nutri" items={items} brand="NutriLog" brandHref="/dashboard" />)
  expect(screen.getByRole('link', { name: 'NutriLog' })).toHaveAttribute('href', '/dashboard')
})
