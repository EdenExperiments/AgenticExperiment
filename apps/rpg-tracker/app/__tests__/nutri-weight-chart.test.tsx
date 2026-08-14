import { render, screen } from '@testing-library/react'
import { WeightChart } from '../(app)/nutri/components/WeightChart'

test('axis labels keep the calendar day from a date-only string', () => {
  render(
    <WeightChart
      data={[
        { date: '2026-06-12', weight_kg: 72.5 },
        { date: '2026-06-13', weight_kg: 72.0 },
      ]}
    />,
  )
  const labels = screen.getAllByTestId('weight-chart-label').map((el) => el.textContent)
  expect(labels).toContain('Jun 12')
  expect(labels).toContain('Jun 13')
})
