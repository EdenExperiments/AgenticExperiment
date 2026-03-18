import { render, screen } from '@testing-library/react'
import { BlockerGateSection } from './BlockerGateSection'

test('shows gate title and description', () => {
  render(
    <BlockerGateSection
      gateLevel={9}
      title="Novice Gate"
      description="Complete 10 sessions to unlock Apprentice."
      currentXP={8500}
      rawLevel={10}
    />
  )
  expect(screen.getByText('Novice Gate')).toBeInTheDocument()
  expect(screen.getByText(/complete 10 sessions/i)).toBeInTheDocument()
  expect(screen.getByText(/gate locked/i)).toBeInTheDocument()
})

test('shows XP accruing value', () => {
  render(
    <BlockerGateSection
      gateLevel={9} title="Gate" description="Desc"
      currentXP={9000} rawLevel={10}
    />
  )
  expect(screen.getByText(/9,000/)).toBeInTheDocument()
})
