import { render, screen, fireEvent } from '@testing-library/react'
import { PostSessionScreen } from './PostSessionScreen'

vi.mock('@rpgtracker/api-client', () => ({
  createSession: vi.fn(),
}))

const defaultProps = {
  sessionDurationSeconds: 1500,
  earnedXP: 113,
  bonusPercentage: 25,
  onSubmit: vi.fn(),
  onDismiss: vi.fn(),
}

afterEach(() => {
  vi.clearAllMocks()
})

// AC-D4: Action buttons are pinned to the bottom of the viewport (sticky footer) on mobile.
test('action buttons have sticky positioning at 375px mobile viewport', () => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
  fireEvent(window, new Event('resize'))

  render(<PostSessionScreen {...defaultProps} />)

  const stickyFooter = screen.getByTestId('post-session-footer')
  expect(stickyFooter).toBeInTheDocument()

  const hasStickyClass =
    stickyFooter.classList.contains('sticky') ||
    stickyFooter.classList.contains('fixed') ||
    stickyFooter.getAttribute('data-sticky') === 'true'
  expect(hasStickyClass).toBe(true)
})

// AC-D8: "Dismiss / Log Later" does NOT call createSession API.
test('"Dismiss / Log Later" does not call createSession API', async () => {
  const { createSession } = await import('@rpgtracker/api-client')
  const onDismiss = vi.fn()

  render(<PostSessionScreen {...defaultProps} onDismiss={onDismiss} />)

  fireEvent.click(screen.getByRole('button', { name: /dismiss|log later/i }))

  expect(createSession).not.toHaveBeenCalled()
  expect(onDismiss).toHaveBeenCalledTimes(1)
})

test('shows earned XP and bonus percentage', () => {
  render(<PostSessionScreen {...defaultProps} earnedXP={113} bonusPercentage={25} />)
  // XP appears in both the summary card and the log button — just assert it's present
  expect(screen.getAllByText(/\+113 XP/).length).toBeGreaterThan(0)
  expect(screen.getByText(/25%/)).toBeInTheDocument()
})

test('log session button calls onSubmit', () => {
  const onSubmit = vi.fn()
  render(<PostSessionScreen {...defaultProps} onSubmit={onSubmit} />)
  fireEvent.click(screen.getByTestId('log-session-btn'))
  expect(onSubmit).toHaveBeenCalledWith({
    reflectionWhat: '',
    reflectionHow: '',
    reflectionFeeling: '',
  })
})
