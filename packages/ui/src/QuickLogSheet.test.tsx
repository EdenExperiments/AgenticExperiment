import { render, screen, fireEvent } from '@testing-library/react'
import { QuickLogSheet } from './QuickLogSheet'

const chips: [number, number, number, number] = [50, 100, 250, 500]

test('renders all four chip amounts', () => {
  render(<QuickLogSheet skillName="Running" chips={chips} isOpen onClose={vi.fn()} onSubmit={vi.fn()} isLoading={false} />)
  expect(screen.getByRole('button', { name: '50 XP' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '100 XP' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '250 XP' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '500 XP' })).toBeInTheDocument()
})

test('second chip is selected by default', () => {
  render(<QuickLogSheet skillName="Running" chips={chips} isOpen onClose={vi.fn()} onSubmit={vi.fn()} isLoading={false} />)
  expect(screen.getByRole('button', { name: '100 XP' })).toHaveAttribute('aria-pressed', 'true')
})

test('calls onSubmit with selected XP amount', () => {
  const onSubmit = vi.fn()
  render(<QuickLogSheet skillName="Running" chips={chips} isOpen onClose={vi.fn()} onSubmit={onSubmit} isLoading={false} />)
  fireEvent.click(screen.getByRole('button', { name: '250 XP' }))
  fireEvent.click(screen.getByRole('button', { name: /log xp/i }))
  expect(onSubmit).toHaveBeenCalledWith({ xpDelta: 250, logNote: '' })
})

test('Log XP button is disabled while loading', () => {
  render(<QuickLogSheet skillName="Running" chips={chips} isOpen onClose={vi.fn()} onSubmit={vi.fn()} isLoading />)
  expect(screen.getByRole('button', { name: /log xp/i })).toBeDisabled()
})
