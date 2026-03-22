import { render } from '@testing-library/react'
import { XPProgressBar } from './XPProgressBar'

test('shows correct percentage', () => {
  const { container } = render(
    <XPProgressBar tierNumber={1} xpForCurrentLevel={50} xpToNextLevel={100} />
  )
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveStyle('width: 50%')
})

test('applies tier color via inline style for Novice', () => {
  const { container } = render(
    <XPProgressBar tierNumber={1} xpForCurrentLevel={0} xpToNextLevel={100} />
  )
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveStyle({ backgroundColor: '#9ca3af' })
})

test('applies tier color via inline style for Legend', () => {
  const { container } = render(
    <XPProgressBar tierNumber={11} xpForCurrentLevel={50} xpToNextLevel={100} />
  )
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveStyle({ backgroundColor: '#facc15' })
})

test('uses CSS variable for track background', () => {
  const { container } = render(
    <XPProgressBar tierNumber={1} xpForCurrentLevel={50} xpToNextLevel={100} />
  )
  const track = container.querySelector('[role="progressbar"]')
  expect(track).toHaveStyle({ backgroundColor: 'var(--color-xp-bg, rgba(212,168,83,0.1))' })
})

test('shows full bar at MaxLevel', () => {
  const { container } = render(
    <XPProgressBar tierNumber={11} xpForCurrentLevel={0} xpToNextLevel={0} isMaxLevel />
  )
  const fill = container.querySelector('[data-testid="xp-bar-fill"]')
  expect(fill).toHaveStyle('width: 100%')
})
