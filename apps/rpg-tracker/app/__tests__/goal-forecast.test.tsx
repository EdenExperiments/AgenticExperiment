import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GoalDetailPage from '../(app)/goals/[id]/page'

const mockGetGoal = vi.fn()
const mockListMilestones = vi.fn()
const mockListCheckIns = vi.fn()
const mockGetGoalForecast = vi.fn()
const mockUpdateGoal = vi.fn()
const mockCreateMilestone = vi.fn()
const mockUpdateMilestone = vi.fn()
const mockDeleteMilestone = vi.fn()
const mockCreateCheckIn = vi.fn()
const mockPush = vi.fn()
const mockBack = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  getGoal: (...args: unknown[]) => mockGetGoal(...args),
  listMilestones: (...args: unknown[]) => mockListMilestones(...args),
  listCheckIns: (...args: unknown[]) => mockListCheckIns(...args),
  getGoalForecast: (...args: unknown[]) => mockGetGoalForecast(...args),
  updateGoal: (...args: unknown[]) => mockUpdateGoal(...args),
  createMilestone: (...args: unknown[]) => mockCreateMilestone(...args),
  updateMilestone: (...args: unknown[]) => mockUpdateMilestone(...args),
  deleteMilestone: (...args: unknown[]) => mockDeleteMilestone(...args),
  createCheckIn: (...args: unknown[]) => mockCreateCheckIn(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useParams: () => ({ id: 'goal-1' }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

function makeGoal(overrides = {}) {
  return {
    id: 'goal-1',
    user_id: 'user-1',
    skill_id: null,
    title: 'Run 100km',
    description: null,
    status: 'active' as const,
    target_date: '2026-12-31',
    current_value: null,
    target_value: null,
    unit: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
    ...overrides,
  }
}

function makeForecast(overrides = {}) {
  return {
    track_state: 'on_track' as const,
    confidence_score: 0.82,
    drift_pct: 5,
    drift_direction: 'ahead' as const,
    expected_progress: 40,
    actual_progress: 45,
    milestone_done_ratio: 0.33,
    checkin_count: 8,
    days_remaining: 240,
    recommend_checkin: false,
    recommend_review: false,
    recommend_stretch: true,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetGoal.mockResolvedValue(makeGoal())
  mockListMilestones.mockResolvedValue([])
  mockListCheckIns.mockResolvedValue([])
  mockGetGoalForecast.mockResolvedValue(makeForecast())
})

test('renders weekly review section for active goal', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByLabelText('Weekly review')
})

test('shows track state label — on_track', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByTestId('track-state-label')
  expect(screen.getByTestId('track-state-label')).toHaveTextContent('On Track')
})

test('shows track state label — at_risk', async () => {
  mockGetGoalForecast.mockResolvedValue(makeForecast({ track_state: 'at_risk' }))
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByTestId('track-state-label')
  expect(screen.getByTestId('track-state-label')).toHaveTextContent('At Risk')
})

test('shows track state label — behind', async () => {
  mockGetGoalForecast.mockResolvedValue(makeForecast({ track_state: 'behind' }))
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByTestId('track-state-label')
  expect(screen.getByTestId('track-state-label')).toHaveTextContent('Behind')
})

test('shows days remaining', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByText('240d remaining')
})

test('shows check-in count', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByText('8')
})

test('shows recommend_stretch recommendation', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByText(/stretching your goal/i)
})

test('shows recommend_checkin recommendation when true', async () => {
  mockGetGoalForecast.mockResolvedValue(makeForecast({ recommend_checkin: true, recommend_stretch: false }))
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByText(/log a check-in/i)
})

test('shows recommend_review recommendation when true', async () => {
  mockGetGoalForecast.mockResolvedValue(makeForecast({ recommend_review: true, recommend_stretch: false }))
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByText(/review your milestones/i)
})

test('shows degraded forecast message when forecast fetch fails', async () => {
  mockGetGoalForecast.mockRejectedValue(new Error('not enough data'))
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByText(/forecast unavailable/i)
})

test('does not render weekly review section for completed goal', async () => {
  mockGetGoal.mockResolvedValue(makeGoal({ status: 'completed' }))
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  expect(screen.queryByLabelText('Weekly review')).not.toBeInTheDocument()
})

test('shows "ahead" drift direction label', async () => {
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByText(/5% ahead/i)
})

test('shows "behind" drift direction label', async () => {
  mockGetGoalForecast.mockResolvedValue(makeForecast({ drift_pct: 12, drift_direction: 'behind' }))
  render(<GoalDetailPage />, { wrapper })
  await screen.findByText('Run 100km')
  await screen.findByText(/12% behind/i)
})
