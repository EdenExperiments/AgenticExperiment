import { render, screen } from '@testing-library/react'
import { XPBarChart } from './XPBarChart'

// Helper: build 30 days of zero XP data
function buildZeroData(days = 30) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(2026, 1, 20 + i) // Feb 20 onwards
    const dateStr = d.toISOString().split('T')[0]
    return { date: dateStr, xp_total: 0 }
  })
}

// Helper: build 30 days with some non-zero values
function buildMixedData() {
  return buildZeroData().map((entry, i) => ({
    ...entry,
    xp_total: i === 5 ? 350 : 0,
  }))
}

// AC-F1 empty state: when all 30 bars are 0, renders motivational copy, not empty bars
test('empty state (all values=0) renders motivational copy, not an empty bar grid', () => {
  render(
    <XPBarChart
      data={buildZeroData()}
      tierColor="var(--tier-1-color)"
    />
  )

  // Motivational copy must be shown (spec AC-F1)
  expect(
    screen.getByText(/start logging to see your progress/i)
  ).toBeInTheDocument()

  // No bar elements should be rendered for the empty state
  expect(screen.queryByRole('graphics-symbol')).not.toBeInTheDocument()
  expect(screen.queryByTestId('xp-bar')).not.toBeInTheDocument()
})

test('non-empty data renders bars, not the empty state copy', () => {
  render(
    <XPBarChart
      data={buildMixedData()}
      tierColor="var(--tier-1-color)"
    />
  )

  // Motivational copy should NOT appear when there is data
  expect(
    screen.queryByText(/start logging to see your progress/i)
  ).not.toBeInTheDocument()

  // Bars should be rendered
  expect(screen.getAllByTestId('xp-bar').length).toBeGreaterThan(0)
})

