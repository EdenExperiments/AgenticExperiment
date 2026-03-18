import { render } from '@testing-library/react'
import { XPProgressBar } from './XPProgressBar'

test('shows correct percentage', () => {
  const { container } = render(
    <XPProgressBar tierNumber={1} xpForCurrentLevel={50} xpToNextLevel={100} />
  )
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveStyle('width: 50%')
})

test('applies tier-1 color class for Novice', () => {
  const { container } = render(
    <XPProgressBar tierNumber={1} xpForCurrentLevel={0} xpToNextLevel={100} />
  )
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveClass('bg-gray-400')
})

test('applies gradient for Legend tier 11', () => {
  const { container } = render(
    <XPProgressBar tierNumber={11} xpForCurrentLevel={50} xpToNextLevel={100} />
  )
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveClass('bg-gradient-to-r')
})

test('shows full bar at MaxLevel', () => {
  const { container } = render(
    <XPProgressBar tierNumber={11} xpForCurrentLevel={0} xpToNextLevel={0} isMaxLevel />
  )
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveStyle('width: 100%')
})
