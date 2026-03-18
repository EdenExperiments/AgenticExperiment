import { render, screen } from '@testing-library/react'
import { TierBadge } from './TierBadge'

test('renders tier name', () => {
  render(<TierBadge tierName="Journeyman" tierNumber={4} />)
  expect(screen.getByText('Journeyman')).toBeInTheDocument()
})

test('applies legend gold styling for tier 11', () => {
  const { container } = render(<TierBadge tierName="Legend" tierNumber={11} />)
  const badge = container.firstChild as HTMLElement
  expect(badge.className).toMatch(/yellow|amber|gold/)
})
