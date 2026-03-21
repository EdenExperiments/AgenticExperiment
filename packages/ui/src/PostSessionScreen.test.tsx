import { render, screen, fireEvent } from '@testing-library/react'
import { PostSessionScreen } from './PostSessionScreen'

// Mock createSession to detect API calls
vi.mock('@rpgtracker/api-client', () => ({
  createSession: vi.fn(),
}))

const defaultProps = {
  skillId: 'skill-1',
  sessionDurationSeconds: 1500,
  tierNumber: 1,
  quickLogChips: [50, 100, 250, 500],
  bonusPercentage: 25,
  onSubmit: vi.fn(),
  onDismiss: vi.fn(),
}

afterEach(() => {
  vi.clearAllMocks()
})

// AC-D4: Action buttons are pinned to the bottom of the viewport (sticky footer) on mobile.
// Test at 375px viewport width (standard mobile breakpoint).
test('action buttons have sticky positioning at 375px mobile viewport', () => {
  // Set viewport to 375px width
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 })
  fireEvent(window, new Event('resize'))

  render(<PostSessionScreen {...defaultProps} />)

  // The sticky footer container should be present
  const stickyFooter = screen.getByTestId('post-session-footer')
  expect(stickyFooter).toBeInTheDocument()

  const styles = window.getComputedStyle(stickyFooter)
  // It must be in a sticky or fixed container — check data attribute or class as proxy
  // (jsdom doesn't fully compute CSS, so we check the element has the sticky class)
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

  render(
    <PostSessionScreen
      {...defaultProps}
      onDismiss={onDismiss}
    />
  )

  const dismissLink = screen.getByRole('button', { name: /dismiss|log later/i })
  fireEvent.click(dismissLink)

  // createSession API must not have been called
  expect(createSession).not.toHaveBeenCalled()
  // onDismiss callback should have been called
  expect(onDismiss).toHaveBeenCalledTimes(1)
})
