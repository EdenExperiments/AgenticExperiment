import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import WorkoutLayout from '../(app)/workout/layout'

test('Workout layout sets data-theme and owns chrome', () => {
  vi.mocked(usePathname).mockReturnValue('/workout')
  const { container } = render(
    <WorkoutLayout>
      <div>history</div>
    </WorkoutLayout>
  )
  expect(container.querySelector('[data-theme="workout-strength"]')).not.toBeNull()
  expect(screen.getAllByRole('link', { name: /history/i }).length).toBeGreaterThan(0)
  expect(screen.queryByRole('link', { name: /skills/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /goals/i })).not.toBeInTheDocument()
})

test('shell tokens import workout-strength', () => {
  const tokens = readFileSync(resolve(__dirname, '../../tokens.css'), 'utf-8')
  expect(tokens).toContain("@import '@rpgtracker/ui/tokens/workout-strength.css'")
})
