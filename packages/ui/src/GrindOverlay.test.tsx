import { render, screen, fireEvent } from '@testing-library/react'
import { GrindOverlay } from './GrindOverlay'

const defaultProps = {
  skillId: 'skill-1',
  skillName: 'Piano',
  animationTheme: 'general',
  tierColor: 'var(--tier-1-color)',
  tierNumber: 1,
  requiresActiveUse: false,
  onBegin: vi.fn(),
  onCancel: vi.fn(),
  onSessionEnd: vi.fn(),
}

afterEach(() => {
  vi.clearAllMocks()
})

test('session config overlay renders Cancel button', () => {
  render(<GrindOverlay {...defaultProps} phase="config" />)
  // Cancel affordance must exist — user can dismiss without starting (AC-B2)
  expect(
    screen.getByRole('button', { name: /cancel/i })
  ).toBeInTheDocument()
})

test('clicking Cancel closes overlay without calling onBegin', () => {
  const onCancel = vi.fn()
  const onBegin = vi.fn()
  render(
    <GrindOverlay
      {...defaultProps}
      phase="config"
      onCancel={onCancel}
      onBegin={onBegin}
    />
  )

  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

  expect(onCancel).toHaveBeenCalledTimes(1)
  expect(onBegin).not.toHaveBeenCalled()
})

test('end-session-early sheet renders three options: Keep Going, Claim Session, Abandon', () => {
  render(<GrindOverlay {...defaultProps} phase="end-early" />)

  // AC-C3: three options in confirmation
  expect(screen.getByRole('button', { name: /keep going/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /claim session/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /abandon/i })).toBeInTheDocument()
})

test('system back (popstate) during work phase triggers end-session-early sheet', () => {
  render(<GrindOverlay {...defaultProps} phase="work" />)

  // Initially the end-early sheet should NOT be visible
  expect(screen.queryByRole('button', { name: /keep going/i })).not.toBeInTheDocument()

  // Simulate system back-button press (AC-B3)
  fireEvent(window, new PopStateEvent('popstate'))

  // After popstate, end-session-early options should appear
  expect(screen.getByRole('button', { name: /keep going/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /claim session/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /abandon/i })).toBeInTheDocument()
})
