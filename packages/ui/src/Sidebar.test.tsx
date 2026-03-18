import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'

test('renders navigation links', () => {
  render(<Sidebar currentPath="/dashboard" />)
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Skills' })).toBeInTheDocument()
})

test('marks current section as active', () => {
  render(<Sidebar currentPath="/skills/new" />)
  expect(screen.getByRole('link', { name: 'Skills' })).toHaveAttribute('aria-current', 'page')
})
