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
  expect(valueEl.style.color).toBe('var(--color-accent)')
  expect(valueEl.style.fontFamily).toBe('var(--font-display, var(--font-body, Inter, system-ui, sans-serif))')
})

// --- AC-15: Hover lift with motion-scale gating ---
describe('AC-15: hover lift effect', () => {
  test('card wrapper has hover lift classes using @media(hover:hover) guard', () => {
    const { container } = render(<StatCard label="Test" value={42} />)
    const card = container.firstChild as HTMLElement
    // Must use Tailwind arbitrary variant with media(hover:hover) guard for hover lift
    expect(card.className).toMatch(/\[@media\(hover:hover\)\]:hover:-translate-y/)
  })

  test('card wrapper transition includes var(--motion-scale) gating', () => {
    const { container } = render(<StatCard label="Test" value={42} />)
    const card = container.firstChild as HTMLElement
    const transition = card.style.transition ?? ''
    expect(transition).toMatch(/var\(--motion-scale/)
  })

  test('card wrapper has focus-visible outline using --color-accent', () => {
    const { container } = render(<StatCard label="Test" value={42} />)
    const card = container.firstChild as HTMLElement
    expect(card.className).toMatch(/focus-visible:outline-\[var\(--color-accent/)
  })
})

// --- AC-17: minimal reduced motion transitions ---
describe('AC-17: minimal reduced motion transitions', () => {
  test('card transition string uses var(--duration-fast) * var(--motion-scale)', () => {
    const { container } = render(<StatCard label="Test" value={42} />)
    const card = container.firstChild as HTMLElement
    const transition = card.style.transition ?? ''
    expect(transition).toMatch(/var\(--duration-fast/)
    expect(transition).toMatch(/var\(--motion-scale/)
  })
})

// --- AC-19: Card hierarchy — bg-elevated + border ---
describe('AC-19: card hierarchy CSS variables', () => {
  test('card wrapper background references --color-bg-elevated', () => {
    const { container } = render(<StatCard label="Test" value={42} />)
    const card = container.firstChild as HTMLElement
    expect(card.style.backgroundColor).toMatch(/var\(--color-bg-elevated/)
  })

  test('card wrapper border references --color-border', () => {
    const { container } = render(<StatCard label="Test" value={42} />)
    const card = container.firstChild as HTMLElement
    expect(card.style.borderColor).toMatch(/var\(--color-border/)
  })
})
