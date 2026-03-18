import { render, screen, fireEvent } from '@testing-library/react'
import { TierTransitionModal } from './TierTransitionModal'

test('shows new tier name', () => {
  render(<TierTransitionModal newTierName="Apprentice" newTierNumber={2} isOpen onContinue={vi.fn()} />)
  expect(screen.getByRole('heading', { name: /apprentice/i })).toBeInTheDocument()
})

test('calls onContinue when dismissed', () => {
  const onContinue = vi.fn()
  render(<TierTransitionModal newTierName="Apprentice" newTierNumber={2} isOpen onContinue={onContinue} />)
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  expect(onContinue).toHaveBeenCalled()
})
