import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GoalDetailPage from '../(app)/goals/[id]/page'
import { setAnalyticsDispatcher } from '@/lib/analytics'

const mockGetGoal = vi.fn()
const mockListMilestones = vi.fn()
const mockListCheckIns = vi.fn()
const mockGetGoalForecast = vi.fn()
const mockCreateMilestone = vi.fn()
const mockUpdateMilestone = vi.fn()
const mockDeleteMilestone = vi.fn()
const mockCreateCheckIn = vi.fn()
const mockUpdateGoal = vi.fn()
const mockPush = vi.fn()
const mockBack = vi.fn()
const mockTrack = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  getGoal: (...args: unknown[]) => mockGetGoal(...args),
  listMilestones: (...args: unknown[]) => mockListMilestones(...args),
  listCheckIns: (...args: unknown[]) => mockListCheckIns(...args),
  getGoalForecast: (...args: unknown[]) => mockGetGoalForecast(...args),
  createMilestone: (...args: unknown[]) => mockCreateMilestone(...args),
  updateMilestone: (...args: unknown[]) => mockUpdateMilestone(...args),
  deleteMilestone: (...args: unknown[]) => mockDeleteMilestone(...args),
  createCheckIn: (...args: unknown[]) => mockCreateCheckIn(...args),
  updateGoal: (...args: unknown[]) => mockUpdateGoal(...args),
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
    description: 'Run a total of 100km this year',
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

function makeMilestone(overrides = {}) {
  return {
    id: 'ms-1',
    goal_id: 'goal-1',
    title: 'First 25km',
    description: null,
    position: 1,
    is_done: false,
    due_date: null,
    done_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeCheckIn(overrides = {}) {
  return {
    id: 'ci-1',
    goal_id: 'goal-1',
    note: 'Did a great 5km run today',
    value: 5,
    checked_in_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
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
  setAnalyticsDispatcher(mockTrack)
  mockGetGoal.mockResolvedValue(makeGoal())
  mockListMilestones.mockResolvedValue([makeMilestone()])
  mockListCheckIns.mockResolvedValue([makeCheckIn()])
  mockUpdateMilestone.mockResolvedValue({ ...makeMilestone(), is_done: true })
  mockDeleteMilestone.mockResolvedValue(undefined)
  mockCreateMilestone.mockResolvedValue({ ...makeMilestone(), id: 'ms-new', title: 'New milestone' })
  mockCreateCheckIn.mockResolvedValue(makeCheckIn({ id: 'ci-new', note: 'New note' }))
  mockUpdateGoal.mockResolvedValue(makeGoal({ status: 'completed' }))
  mockGetGoalForecast.mockResolvedValue({
    track_state: 'unknown',
    confidence_score: 0,
    drift_pct: 0,
    drift_direction: 'neutral',
    expected_progress: 0,
    actual_progress: 0,
    milestone_done_ratio: 0,
    checkin_count: 0,
    days_remaining: 0,
    recommend_checkin: false,
    recommend_review: false,
    recommend_stretch: false,
  })
})

afterEach(() => {
  setAnalyticsDispatcher(null)
})

test('renders goal title and description', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  expect(screen.getByText('Run a total of 100km this year')).toBeInTheDocument()
})

test('shows loading state initially', () => {
  mockGetGoal.mockImplementation(() => new Promise(() => {}))
  render(<GoalDetailPage />, { wrapper })
  expect(screen.getByText('Loading...')).toBeInTheDocument()
})

test('shows error state when goal fetch fails', async () => {
  mockGetGoal.mockRejectedValue(new Error('not found'))
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText(/failed to load goal/i)
})

test('renders status badge', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  expect(screen.getByText('Active')).toBeInTheDocument()
})

test('renders progress bar for numeric goals', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  expect(screen.getByRole('progressbar', { name: /goal numeric progress/i })).toBeInTheDocument()
  expect(screen.getByText('20 / 100 km')).toBeInTheDocument()
})

test('renders milestones list', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('First 25km')
  expect(screen.getByRole('list', { name: 'Milestones' })).toBeInTheDocument()
})

test('toggles milestone done state', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('First 25km')

  fireEvent.click(screen.getByRole('button', { name: /mark "first 25km" done/i }))

  await waitFor(() => {
    expect(mockUpdateMilestone).toHaveBeenCalledWith('goal-1', 'ms-1', { is_done: true })
  })
})

test('opens add milestone form on "+ Add" click', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('First 25km')

  fireEvent.click(screen.getByRole('button', { name: '+ Add' }))

  expect(screen.getByLabelText('Milestone title')).toBeInTheDocument()
})

test('submits new milestone and closes form', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('First 25km')

  fireEvent.click(screen.getByRole('button', { name: '+ Add' }))
  fireEvent.change(screen.getByLabelText('Milestone title'), { target: { value: 'New milestone' } })
  fireEvent.click(screen.getByRole('button', { name: /add milestone/i }))

  await waitFor(() => {
    expect(mockCreateMilestone).toHaveBeenCalledWith('goal-1', expect.objectContaining({ title: 'New milestone' }))
  })
})

test('shows error when add milestone fails', async () => {
  mockCreateMilestone.mockRejectedValue(new Error('server error'))
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('First 25km')

  fireEvent.click(screen.getByRole('button', { name: '+ Add' }))
  fireEvent.change(screen.getByLabelText('Milestone title'), { target: { value: 'New milestone' } })
  fireEvent.click(screen.getByRole('button', { name: /add milestone/i }))

  await screen.findByText(/failed to add milestone/i)
})

test('opens delete milestone confirmation', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('First 25km')

  fireEvent.click(screen.getByRole('button', { name: /delete milestone "first 25km"/i }))

  expect(screen.getByRole('dialog', { name: /delete milestone/i })).toBeInTheDocument()
})

test('calls deleteMilestone on confirm', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('First 25km')

  fireEvent.click(screen.getByRole('button', { name: /delete milestone "first 25km"/i }))
  fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))

  await waitFor(() => {
    expect(mockDeleteMilestone).toHaveBeenCalledWith('goal-1', 'ms-1')
  })
})

test('renders check-in list', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Did a great 5km run today')
})

test('shows Log Check-in button when no form open', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  expect(screen.getByRole('button', { name: /\+ log check-in/i })).toBeInTheDocument()
})

test('opens check-in form on button click', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')

  fireEvent.click(screen.getByRole('button', { name: /\+ log check-in/i }))

  expect(screen.getByLabelText(/check-in note/i)).toBeInTheDocument()
})

test('submits check-in and closes form', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')

  fireEvent.click(screen.getByRole('button', { name: /\+ log check-in/i }))
  fireEvent.change(screen.getByLabelText(/check-in note/i), { target: { value: 'Ran 10km today!' } })
  fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

  await waitFor(() => {
    expect(mockCreateCheckIn).toHaveBeenCalledWith('goal-1', expect.objectContaining({ note: 'Ran 10km today!' }))
  })
})

test('tracks weekly check-in completion metadata', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')

  fireEvent.click(screen.getByRole('button', { name: /\+ log check-in/i }))
  fireEvent.change(screen.getByLabelText(/check-in note/i), { target: { value: 'Ran 10km today!' } })
  fireEvent.change(screen.getByLabelText(/progress value/i), { target: { value: '30' } })
  fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

  await waitFor(() => {
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'weekly_checkin_completed',
        payload: {
          goal_id: 'goal-1',
          has_value: true,
          note_length_bucket: 'short',
          previous_track_state: 'unknown',
        },
      })
    )
  })
})

test('tracks off-track recovery when check-in follows behind forecast', async () => {
  mockGetGoalForecast.mockResolvedValue({
    track_state: 'behind',
    confidence_score: 0.7,
    drift_pct: 20,
    drift_direction: 'behind',
    expected_progress: 70,
    actual_progress: 50,
    milestone_done_ratio: 0.2,
    checkin_count: 3,
    days_remaining: 30,
    recommend_checkin: true,
    recommend_review: true,
    recommend_stretch: false,
  })

  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByTestId('track-state-label')

  fireEvent.click(screen.getByRole('button', { name: /\+ log check-in/i }))
  fireEvent.change(screen.getByLabelText(/check-in note/i), { target: { value: 'Back on the plan today' } })
  fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

  await waitFor(() => {
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'offtrack_recovered',
        payload: {
          goal_id: 'goal-1',
          previous_track_state: 'behind',
          recovery_action: 'checkin',
        },
      })
    )
  })
})

test('shows error when check-in submission fails', async () => {
  mockCreateCheckIn.mockRejectedValue(new Error('server error'))
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')

  fireEvent.click(screen.getByRole('button', { name: /\+ log check-in/i }))
  fireEvent.change(screen.getByLabelText(/check-in note/i), { target: { value: 'Ran 10km today!' } })
  fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

  await screen.findByText(/failed to save check-in/i)
})

test('calls updateGoal with completed status on "Mark Complete"', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')

  fireEvent.click(screen.getByRole('button', { name: /mark complete/i }))

  await waitFor(() => {
    expect(mockUpdateGoal).toHaveBeenCalledWith('goal-1', { status: 'completed' })
  })
})

test('hides "Mark Complete" button when goal is not active', async () => {
  mockGetGoal.mockResolvedValue(makeGoal({ status: 'completed' }))
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  expect(screen.queryByRole('button', { name: /mark complete/i })).not.toBeInTheDocument()
})

test('shows no check-ins message when list is empty', async () => {
  mockListCheckIns.mockResolvedValue([])
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  expect(screen.getByText(/no check-ins yet/i)).toBeInTheDocument()
})
