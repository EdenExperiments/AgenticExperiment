import { render, screen, fireEvent } from '@testing-library/react'
import { QuickLogPanel } from './QuickLogPanel'

const defaultProps = {
  skillName: 'Running',
  tierNumber: 1,
  isLoading: false,
  onSubmit: vi.fn(),
}

test('collapsed state shows single Log XP button (tap 1)', () => {
  render(<QuickLogPanel {...defaultProps} />)
  expect(screen.getByRole('button', { name: 'Log XP — Running' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '15 min' })).not.toBeInTheDocument()
})

test('expands to four time chips with 30 min selected by default (tap 2)', () => {
  render(<QuickLogPanel {...defaultProps} />)
  fireEvent.click(screen.getByRole('button', { name: 'Log XP — Running' }))
  expect(screen.getByRole('button', { name: '15 min' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '30 min' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '45 min' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '60 min' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '30 min' })).toHaveAttribute('aria-pressed', 'true')
})

test('calls onSubmit with xpDelta from tier 1 rate (30 min → 90 XP)', () => {
  const onSubmit = vi.fn()
  render(<QuickLogPanel {...defaultProps} tierNumber={1} onSubmit={onSubmit} />)
  fireEvent.click(screen.getByRole('button', { name: 'Log XP — Running' }))
  fireEvent.click(screen.getByRole('button', { name: 'Log XP' }))
  expect(onSubmit).toHaveBeenCalledWith({ xpDelta: 90, logNote: '', timeSpentMinutes: 30 })
})

test('calls onSubmit with tier 2 rate multiplier (30 min → 126 XP)', () => {
  const onSubmit = vi.fn()
  render(<QuickLogPanel {...defaultProps} tierNumber={2} onSubmit={onSubmit} />)
  fireEvent.click(screen.getByRole('button', { name: 'Log XP — Running' }))
  fireEvent.click(screen.getByRole('button', { name: 'Log XP' }))
  expect(onSubmit).toHaveBeenCalledWith({ xpDelta: 126, logNote: '', timeSpentMinutes: 30 })
})

test('Log button is disabled while loading', () => {
  render(<QuickLogPanel {...defaultProps} isLoading />)
  fireEvent.click(screen.getByRole('button', { name: 'Log XP — Running' }))
  expect(screen.getByRole('button', { name: 'Log XP' })).toBeDisabled()
})

test('panel collapses after successful submit', () => {
  const onSubmit = vi.fn()
  render(<QuickLogPanel {...defaultProps} onSubmit={onSubmit} />)
  fireEvent.click(screen.getByRole('button', { name: 'Log XP — Running' }))
  fireEvent.click(screen.getByRole('button', { name: 'Log XP' }))
  expect(onSubmit).toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Log XP — Running' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '30 min' })).not.toBeInTheDocument()
})

test('default 30 min log completes in two taps (expand → log)', () => {
  const onSubmit = vi.fn()
  render(<QuickLogPanel {...defaultProps} onSubmit={onSubmit} />)
  fireEvent.click(screen.getByRole('button', { name: 'Log XP — Running' }))
  fireEvent.click(screen.getByRole('button', { name: 'Log XP' }))
  expect(onSubmit).toHaveBeenCalledTimes(1)
})
