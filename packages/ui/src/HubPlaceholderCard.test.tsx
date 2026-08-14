import { render, screen } from '@testing-library/react'
import { HubPlaceholderCard } from './HubPlaceholderCard'

const metrics = [{ label: 'Calories', value: '—' }]

test('placeholder has no link and shows Coming Soon', () => {
  render(
    <HubPlaceholderCard
      appName="MindTrack"
      tagline="Mental health check-ins"
      icon="🧠"
      metrics={metrics}
    />
  )
  expect(screen.getByText('Coming Soon')).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /mindtrack/i })).not.toBeInTheDocument()
})

test('href makes the card a link and hides Coming Soon', () => {
  render(
    <HubPlaceholderCard
      appName="NutriLog"
      tagline="Nutrition tracking"
      icon="🥗"
      href="/nutri"
      metrics={metrics}
    />
  )
  expect(screen.queryByText('Coming Soon')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: /nutrilog/i })).toHaveAttribute('href', '/nutri')
})
