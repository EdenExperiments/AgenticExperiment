import { render, screen } from '@testing-library/react'
import { TierBadge } from './TierBadge'

test('renders tier name', () => {
  render(<TierBadge tierName="Journeyman" tierNumber={4} />)
  expect(screen.getByText('Journeyman')).toBeInTheDocument()
})

test('applies Legend gold styling for tier 11 using inline styles', () => {
  render(<TierBadge tierName="Legend" tierNumber={11} />)
  const badge = screen.getByText('Legend')
  // Now uses inline styles with gold tones instead of Tailwind utility classes
  expect(badge).toHaveStyle({ color: '#fde047' })
  expect(badge).toHaveStyle({ backgroundColor: 'rgba(250,204,21,0.15)' })
})

test('uses dark-appropriate tier color for non-legend tiers', () => {
  render(<TierBadge tierName="Apprentice" tierNumber={2} />)
  const badge = screen.getByText('Apprentice')
  expect(badge).toHaveStyle({ color: '#93c5fd' })
})
