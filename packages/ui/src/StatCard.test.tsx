import { render, screen } from '@testing-library/react'
import { StatCard } from './StatCard'

test('renders label and value', () => {
  render(<StatCard label="Total Skills" value={5} />)
  expect(screen.getByText('Total Skills')).toBeInTheDocument()
  expect(screen.getByTestId('stat-value')).toHaveTextContent('5')
})

test('renders string value', () => {
  render(<StatCard label="Highest Tier" value="Master" />)
  expect(screen.getByTestId('stat-value')).toHaveTextContent('Master')
})

test('renders icon when provided', () => {
  render(<StatCard label="XP Today" value={100} icon={<span data-testid="icon">*</span>} />)
  expect(screen.getByTestId('icon')).toBeInTheDocument()
})

test('applies custom className', () => {
  const { container } = render(<StatCard label="Test" value={0} className="custom-class" />)
  expect(container.firstChild).toHaveClass('custom-class')
})

test('uses theme CSS custom properties for styling', () => {
  render(<StatCard label="Test" value={42} />)
  const valueEl = screen.getByTestId('stat-value')
  expect(valueEl.style.color).toBe('var(--color-accent, #6366f1)')
  expect(valueEl.style.fontFamily).toBe('var(--font-display, var(--font-body, Inter, system-ui, sans-serif))')
})
