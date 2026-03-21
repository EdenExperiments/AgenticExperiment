import { render, screen, fireEvent } from '@testing-library/react'
import { QuickLogSheet } from './QuickLogSheet'

const defaultProps = {
  skillName: 'Running',
  tierNumber: 1,
  isOpen: true,
  isLoading: false,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
}

test('renders four time chip buttons', () => {
  render(<QuickLogSheet {...defaultProps} />)
  expect(screen.getByRole('button', { name: '15 min' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '30 min' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '45 min' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '60 min' })).toBeInTheDocument()
})

test('30 min chip is selected by default', () => {
  render(<QuickLogSheet {...defaultProps} />)
  expect(screen.getByRole('button', { name: '30 min' })).toHaveAttribute('aria-pressed', 'true')
})

test('calls onSubmit with xpDelta computed from time', () => {
  const onSubmit = vi.fn()
  render(<QuickLogSheet {...defaultProps} tierNumber={1} onSubmit={onSubmit} />)
  // 30 min × 3 XP/min at tier 1 = 90 XP
  fireEvent.click(screen.getByRole('button', { name: '30 min' }))
  fireEvent.click(screen.getByRole('button', { name: /log xp/i }))
  expect(onSubmit).toHaveBeenCalledWith({ xpDelta: 90, logNote: '', timeSpentMinutes: 30 })
})

test('Log button is disabled while loading', () => {
  render(<QuickLogSheet {...defaultProps} isLoading />)
  expect(screen.getByRole('button', { name: /log/i })).toBeDisabled()
})
