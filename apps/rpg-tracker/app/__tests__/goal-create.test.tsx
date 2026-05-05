import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GoalCreatePage from '../(app)/goals/new/page'
import { setAnalyticsDispatcher } from '@/lib/analytics'

const mockCreateGoal = vi.fn()
const mockListSkills = vi.fn()
const mockPush = vi.fn()
const mockTrack = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  createGoal: (...args: unknown[]) => mockCreateGoal(...args),
  listSkills: (...args: unknown[]) => mockListSkills(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  setAnalyticsDispatcher(mockTrack)
  mockListSkills.mockResolvedValue([])
  mockCreateGoal.mockResolvedValue({
    id: 'goal-new',
    user_id: 'user-1',
    skill_id: null,
    title: 'My New Goal',
    description: null,
    status: 'active',
    target_date: null,
    current_value: null,
    target_value: null,
    unit: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  })
})

afterEach(() => {
  setAnalyticsDispatcher(null)
})

test('renders the create form', async () => {
  render(<GoalCreatePage />, { wrapper })
  expect(screen.getByRole('heading', { name: /new goal/i })).toBeInTheDocument()
  expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
})

test('disables submit when title is empty', async () => {
  render(<GoalCreatePage />, { wrapper })
  expect(screen.getByRole('button', { name: /create goal/i })).toBeDisabled()
})

test('enables submit when title is filled', async () => {
  render(<GoalCreatePage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Goal' } })
  expect(screen.getByRole('button', { name: /create goal/i })).not.toBeDisabled()
})

test('calls createGoal with correct data on submit', async () => {
  render(<GoalCreatePage />, { wrapper })

  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Run 100km' } })
  fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'My running goal' } })
  fireEvent.click(screen.getByRole('button', { name: /create goal/i }))

  await waitFor(() => {
    expect(mockCreateGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Run 100km',
        description: 'My running goal',
      })
    )
  })
})

test('navigates to goal detail after successful create', async () => {
  render(<GoalCreatePage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Run 100km' } })
  fireEvent.click(screen.getByRole('button', { name: /create goal/i }))

  await waitFor(() => {
    expect(mockPush).toHaveBeenCalledWith('/goals/goal-new')
  })
})

test('tracks manual goal creation metadata', async () => {
  render(<GoalCreatePage />, { wrapper })
  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Run 100km' } })
  fireEvent.change(screen.getByLabelText(/target date/i), { target: { value: '2026-12-31' } })
  fireEvent.change(screen.getByLabelText(/target value/i), { target: { value: '100' } })
  fireEvent.click(screen.getByRole('button', { name: /create goal/i }))

  await waitFor(() => {
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'goal_created',
        payload: expect.objectContaining({
          goal_id: 'goal-new',
          source: 'manual',
          has_target_date: true,
          has_linked_skill: false,
          has_value_tracking: true,
        }),
      })
    )
  })
})

test('shows error message when createGoal fails', async () => {
  mockCreateGoal.mockRejectedValue(new Error('server error'))
  render(<GoalCreatePage />, { wrapper })

  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Run 100km' } })
  fireEvent.click(screen.getByRole('button', { name: /create goal/i }))

  await screen.findByRole('alert')
  expect(screen.getByText(/failed to create goal/i)).toBeInTheDocument()
})

test('shows unit field when target value is entered', async () => {
  render(<GoalCreatePage />, { wrapper })

  expect(screen.queryByLabelText(/unit/i)).not.toBeInTheDocument()

  fireEvent.change(screen.getByLabelText(/target value/i), { target: { value: '100' } })

  expect(screen.getByLabelText(/unit/i)).toBeInTheDocument()
})

test('sends numeric values as numbers in createGoal call', async () => {
  render(<GoalCreatePage />, { wrapper })

  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Run goal' } })
  fireEvent.change(screen.getByLabelText(/starting value/i), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText(/target value/i), { target: { value: '100' } })
  fireEvent.click(screen.getByRole('button', { name: /create goal/i }))

  await waitFor(() => {
    expect(mockCreateGoal).toHaveBeenCalledWith(
      expect.objectContaining({
        current_value: 10,
        target_value: 100,
      })
    )
  })
})

test('renders skill dropdown when skills exist', async () => {
  mockListSkills.mockResolvedValue([
    { id: 's1', name: 'Running', description: '', unit: 'km', preset_id: null, starting_level: 1,
      current_xp: 100, current_level: 2, effective_level: 2, quick_log_chips: [10, 25, 50, 100],
      tier_name: 'Novice', tier_number: 1, gates: [], recent_logs: [], xp_to_next_level: 200,
      xp_for_current_level: 100, created_at: '', updated_at: '', category_id: null, category_name: null,
      category_slug: null, category_emoji: null, is_favourite: false, tags: [], current_streak: 0 },
  ])
  render(<GoalCreatePage />, { wrapper })
  await screen.findByLabelText(/linked skill/i)
  expect(screen.getByRole('option', { name: 'Running' })).toBeInTheDocument()
})
