import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SkillCreatePage from '../(app)/skills/new/page'

vi.mock('@rpgtracker/api-client', () => ({
  createSkill: vi.fn().mockResolvedValue({ id: 'new-skill-1' }),
  calibrateSkill: vi.fn(),
  getAPIKeyStatus: vi.fn().mockResolvedValue({ has_key: false }),
  getPresets: vi.fn().mockResolvedValue([]),
  listCategories: vi.fn().mockResolvedValue([]),
  listSkills: vi.fn().mockResolvedValue([]),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
}

async function openCustomPath() {
  fireEvent.click(screen.getByRole('button', { name: /create custom skill/i }))
  await screen.findByPlaceholderText(/skill name \(required\)/i)
}

test('shows path selector first', () => {
  render(<SkillCreatePage />, { wrapper })
  expect(screen.getByRole('heading', { name: /create a new skill/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /create custom skill/i })).toBeInTheDocument()
})

test('preset path shows template picker with Start from scratch', async () => {
  render(<SkillCreatePage />, { wrapper })
  fireEvent.click(screen.getByRole('button', { name: /choose a preset/i }))
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /choose a preset/i })).toBeInTheDocument()
  })
  expect(screen.getByRole('button', { name: /start from scratch/i })).toBeInTheDocument()
})

test('Next is disabled until skill name is entered', async () => {
  render(<SkillCreatePage />, { wrapper })
  await openCustomPath()

  const nextBtn = screen.getByRole('button', { name: /^next$/i })
  expect(nextBtn).toBeDisabled()

  fireEvent.change(screen.getByPlaceholderText(/skill name \(required\)/i), { target: { value: 'Running' } })
  expect(nextBtn).not.toBeDisabled()
})

test('advances to Starting Level step after Next', async () => {
  render(<SkillCreatePage />, { wrapper })
  await openCustomPath()

  fireEvent.change(screen.getByPlaceholderText(/skill name \(required\)/i), { target: { value: 'Running' } })
  fireEvent.click(screen.getByRole('button', { name: /^next$/i }))

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /starting level/i })).toBeInTheDocument()
  })
})
