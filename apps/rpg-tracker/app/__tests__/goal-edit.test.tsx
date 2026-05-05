import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GoalEditPage from '../(app)/goals/[id]/edit/page'

const mockGetGoal = vi.fn()
const mockUpdateGoal = vi.fn()
const mockListSkills = vi.fn()
const mockPush = vi.fn()
const mockBack = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  getGoal: (...args: unknown[]) => mockGetGoal(...args),
  updateGoal: (...args: unknown[]) => mockUpdateGoal(...args),
  listSkills: (...args: unknown[]) => mockListSkills(...args),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'goal-1' }),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}))

function makeGoal(overrides = {}) {
  return {
    id: 'goal-1',
    user_id: 'user-1',
    skill_id: null,
    title: 'Run 100km',
    description: 'My running goal',
    status: 'active' as const,
    target_date: '2026-12-31',
    current_value: 20,
    target_value: 100,
    unit: 'km',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
    ...overrides,
  }
}

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetGoal.mockResolvedValue(makeGoal())
  mockUpdateGoal.mockResolvedValue(makeGoal({ title: 'Updated Goal' }))
  mockListSkills.mockResolvedValue([])
})

test('pre-populates form with existing goal data', async () => {
  render(<GoalEditPage />, { wrapper })

  const titleInput = await screen.findByLabelText(/title/i)
  expect(titleInput).toHaveValue('Run 100km')

  expect(screen.getByLabelText(/description/i)).toHaveValue('My running goal')
  expect(screen.getByLabelText(/status/i)).toHaveValue('active')
})

test('shows loading state initially', () => {
  mockGetGoal.mockImplementation(() => new Promise(() => {}))
  render(<GoalEditPage />, { wrapper })
  expect(screen.getByText('Loading...')).toBeInTheDocument()
})

test('shows error when goal fetch fails', async () => {
  mockGetGoal.mockRejectedValue(new Error('not found'))
  render(<GoalEditPage />, { wrapper })
  await screen.findByText(/failed to load goal/i)
})

test('disables submit when title is cleared', async () => {
  render(<GoalEditPage />, { wrapper })
  await screen.findByLabelText(/title/i)

  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: '' } })
  expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()
})

test('calls updateGoal with updated data on submit', async () => {
  render(<GoalEditPage />, { wrapper })
  await screen.findByLabelText(/title/i)

  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Run 200km' } })
  fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'completed' } })
  fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

  await waitFor(() => {
    expect(mockUpdateGoal).toHaveBeenCalledWith(
      'goal-1',
      expect.objectContaining({
        title: 'Run 200km',
        status: 'completed',
      })
    )
  })
})

test('navigates to goal detail on success', async () => {
  render(<GoalEditPage />, { wrapper })
  await screen.findByLabelText(/title/i)

  fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/goals/goal-1')
  })
})

test('shows error message when updateGoal fails', async () => {
  mockUpdateGoal.mockRejectedValue(new Error('server error'))
  render(<GoalEditPage />, { wrapper })
  await screen.findByLabelText(/title/i)

  fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

  await screen.findByRole('alert')
  expect(screen.getByText(/failed to save changes/i)).toBeInTheDocument()
})

test('all status options are present in status select', async () => {
  render(<GoalEditPage />, { wrapper })
  await screen.findByLabelText(/status/i)

  const select = screen.getByLabelText(/status/i)
  expect(select).toContainHTML('Active')
  expect(select).toContainHTML('Completed')
  expect(select).toContainHTML('Abandoned')
})

test('shows unit field when target value is populated', async () => {
  render(<GoalEditPage />, { wrapper })
  await screen.findByLabelText(/title/i)
  // goal has target_value: 100 so unit field should be visible
  expect(screen.getByLabelText(/unit/i)).toBeInTheDocument()
})
