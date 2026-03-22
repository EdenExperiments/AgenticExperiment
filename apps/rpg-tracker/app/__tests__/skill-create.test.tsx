import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SkillCreatePage from '../(app)/skills/new/page'

vi.mock('@rpgtracker/api-client', () => ({
  createSkill: vi.fn().mockResolvedValue({ id: 'new-skill-1' }),
  calibrateSkill: vi.fn(),
  getAPIKeyStatus: vi.fn().mockResolvedValue({ has_key: false }),
  getPresets: vi.fn().mockResolvedValue([]),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
}

test('renders step 1 by default', () => {
  render(<SkillCreatePage />, { wrapper })
  expect(screen.getByText(/step 1/i)).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/skill name/i)).toBeInTheDocument()
})

test('advances to step 2 on next', async () => {
  render(<SkillCreatePage />, { wrapper })
  fireEvent.change(screen.getByPlaceholderText(/skill name/i), { target: { value: 'Running' } })
  fireEvent.click(screen.getByRole('button', { name: /next/i }))
  await waitFor(() => expect(screen.getByText(/step 2/i)).toBeInTheDocument())
  expect(screen.getByText(/where are you starting/i)).toBeInTheDocument()
})

test('step 1 next button is disabled when name is empty', () => {
  render(<SkillCreatePage />, { wrapper })
  expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
})

// ── T1b: Layout Tests (AC-08) ─────────────────────────────────────────────────

test('AC-08: form container has mx-auto centering class', () => {
  const { container } = render(<SkillCreatePage />, { wrapper })
  // The outer form container should use mx-auto for centering
  const formContainer = container.firstElementChild
  expect(formContainer).not.toBeNull()
  expect(formContainer!.className).toMatch(/\bmx-auto\b/)
})

test('AC-08: form container uses max-w-xl or max-w-2xl (not max-w-lg or max-w-2xl as outer constraint)', () => {
  const { container } = render(<SkillCreatePage />, { wrapper })
  const formContainer = container.firstElementChild
  expect(formContainer).not.toBeNull()
  // New layout: max-w-xl or max-w-2xl (wider than old max-w-lg)
  expect(formContainer!.className).toMatch(/max-w-xl|max-w-2xl/)
  // Must NOT still be the old max-w-lg
  expect(formContainer!.className).not.toMatch(/\bmax-w-lg\b/)
})
