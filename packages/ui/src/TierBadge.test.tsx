import { render, screen } from '@testing-library/react'
import { TierBadge } from './TierBadge'

test('renders tier name', () => {
  render(<TierBadge tierName="Journeyman" tierNumber={4} />)
  expect(screen.getByText('Journeyman')).toBeInTheDocument()
})

test('applies legend gold styling for tier 11', () => {
  render(<TierBadge tierName="Legend" tierNumber={11} />)
  const badge = screen.getByText('Legend')
  expect(badge).toHaveClass('text-yellow-700')
  expect(badge).toHaveClass('bg-yellow-100')
})
