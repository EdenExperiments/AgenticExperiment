import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityFeedItem, formatRelativeTime } from './ActivityFeedItem'

test('renders skill name and XP delta', () => {
  render(
    <ActivityFeedItem
      skillName="Guitar"
      xpDelta={25}
      createdAt={new Date().toISOString()}
    />
  )
  expect(screen.getByText('Guitar')).toBeInTheDocument()
  expect(screen.getByText('+25 XP')).toBeInTheDocument()
})

test('renders log note when provided', () => {
  render(
    <ActivityFeedItem
      skillName="Running"
      xpDelta={50}
      logNote="Morning run"
      createdAt={new Date().toISOString()}
    />
  )
  expect(screen.getByText('Morning run')).toBeInTheDocument()
})

test('does not render log note when absent', () => {
  render(
    <ActivityFeedItem
      skillName="Running"
      xpDelta={50}
      createdAt={new Date().toISOString()}
    />
  )
  // No log note paragraph should exist
  expect(screen.queryByText('Morning run')).not.toBeInTheDocument()
})

test('renders relative time', () => {
  render(
    <ActivityFeedItem
      skillName="Guitar"
      xpDelta={25}
      createdAt={new Date().toISOString()}
    />
  )
  expect(screen.getByTestId('relative-time')).toHaveTextContent('just now')
})

test('calls onClick when clicked', () => {
  const onClick = vi.fn()
  render(
    <ActivityFeedItem
      skillName="Guitar"
      xpDelta={25}
      createdAt={new Date().toISOString()}
      onClick={onClick}
    />
  )
  fireEvent.click(screen.getByRole('button'))
  expect(onClick).toHaveBeenCalled()
})

test('renders as div (not button) when onClick is not provided', () => {
  render(
    <ActivityFeedItem
      skillName="Guitar"
      xpDelta={25}
      createdAt={new Date().toISOString()}
    />
  )
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

// formatRelativeTime unit tests
describe('formatRelativeTime', () => {
  test('returns "just now" for timestamps less than a minute ago', () => {
    const now = new Date()
    expect(formatRelativeTime(now.toISOString())).toBe('just now')
  })

  test('returns minutes ago for timestamps less than an hour ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatRelativeTime(fiveMinAgo.toISOString())).toBe('5m ago')
  })

  test('returns hours ago for timestamps less than a day ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000)
    expect(formatRelativeTime(threeHoursAgo.toISOString())).toBe('3h ago')
  })

  test('returns "Yesterday" for timestamps one day ago', () => {
    const yesterday = new Date(Date.now() - 86400 * 1000)
    expect(formatRelativeTime(yesterday.toISOString())).toBe('Yesterday')
  })
})
