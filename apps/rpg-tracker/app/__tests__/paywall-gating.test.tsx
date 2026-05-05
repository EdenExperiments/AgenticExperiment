import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AiGoalWizardPage from '../(app)/goals/ai/new/page'
import GoalDetailPage from '../(app)/goals/[id]/page'
import GoalsPage from '../(app)/goals/page'

// ─── API client mocks ─────────────────────────────────────────────────────────

const mockGetAIEntitlement = vi.fn()
const mockPlanGoal = vi.fn()
const mockCreateGoal = vi.fn()
const mockCreateMilestone = vi.fn()
const mockListGoals = vi.fn()
const mockDeleteGoal = vi.fn()
const mockGetGoal = vi.fn()
const mockListMilestones = vi.fn()
const mockListCheckIns = vi.fn()
const mockGetGoalForecast = vi.fn()
const mockUpdateGoal = vi.fn()
const mockUpdateMilestone = vi.fn()
const mockDeleteMilestone = vi.fn()
const mockCreateCheckIn = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  getAIEntitlement: (...args: unknown[]) => mockGetAIEntitlement(...args),
  planGoal: (...args: unknown[]) => mockPlanGoal(...args),
  createGoal: (...args: unknown[]) => mockCreateGoal(...args),
  createMilestone: (...args: unknown[]) => mockCreateMilestone(...args),
  listGoals: (...args: unknown[]) => mockListGoals(...args),
  deleteGoal: (...args: unknown[]) => mockDeleteGoal(...args),
  getGoal: (...args: unknown[]) => mockGetGoal(...args),
  listMilestones: (...args: unknown[]) => mockListMilestones(...args),
  listCheckIns: (...args: unknown[]) => mockListCheckIns(...args),
  getGoalForecast: (...args: unknown[]) => mockGetGoalForecast(...args),
  updateGoal: (...args: unknown[]) => mockUpdateGoal(...args),
  updateMilestone: (...args: unknown[]) => mockUpdateMilestone(...args),
  deleteMilestone: (...args: unknown[]) => mockDeleteMilestone(...args),
  createCheckIn: (...args: unknown[]) => mockCreateCheckIn(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: 'goal-1' }),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
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
    confidence_score: 0.8,
    drift_pct: 5,
    drift_direction: 'ahead' as const,
    expected_progress: 40,
    actual_progress: 45,
    milestone_done_ratio: 0.5,
    checkin_count: 5,
    days_remaining: 200,
    recommend_checkin: false,
    recommend_review: false,
    recommend_stretch: false,
    ...overrides,
  }
}

function makeForbiddenError() {
  const err = Object.assign(new Error('Forbidden'), { status: 403 })
  return err
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAIEntitlement.mockResolvedValue({ entitled: true, reason: 'api_key_set' })
  mockListGoals.mockResolvedValue([])
  mockDeleteGoal.mockResolvedValue(undefined)
  mockGetGoal.mockResolvedValue(makeGoal())
  mockListMilestones.mockResolvedValue([])
  mockListCheckIns.mockResolvedValue([])
  mockGetGoalForecast.mockResolvedValue(makeForecast())
  mockUpdateGoal.mockResolvedValue(makeGoal())
})

// ─── AI Wizard — paywall gating ───────────────────────────────────────────────

describe('AI Wizard paywall gate', () => {
  test('shows paywall CTA when user is not entitled (no API key)', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    render(<AiGoalWizardPage />, { wrapper })

    await screen.findByTestId('paywall-cta')
    expect(screen.getByRole('region', { name: /ai feature locked/i })).toBeInTheDocument()
    expect(screen.getByText(/AI Goal Coach requires an API key/i)).toBeInTheDocument()
  })

  test('paywall CTA links to account settings', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    render(<AiGoalWizardPage />, { wrapper })

    await screen.findByTestId('paywall-cta')
    const upgradeBtn = screen.getByTestId('paywall-upgrade-btn')
    expect(upgradeBtn).toHaveAttribute('href', '/account')
  })

  test('paywall page shows manual goal link for free users', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    render(<AiGoalWizardPage />, { wrapper })

    await screen.findByTestId('paywall-cta')
    expect(screen.getByRole('link', { name: /create a goal manually instead/i })).toBeInTheDocument()
  })

  test('shows wizard while entitlement is loading (optimistic)', () => {
    mockGetAIEntitlement.mockImplementation(() => new Promise(() => {}))
    render(<AiGoalWizardPage />, { wrapper })
    expect(screen.getByRole('heading', { name: /ai goal coach/i })).toBeInTheDocument()
  })

  test('shows wizard when user is entitled', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: true, reason: 'api_key_set' })
    render(<AiGoalWizardPage />, { wrapper })

    await screen.findByRole('heading', { name: /ai goal coach/i })
    expect(screen.getByLabelText(/goal statement/i)).toBeInTheDocument()
    expect(screen.queryByTestId('paywall-cta')).not.toBeInTheDocument()
  })

  test('paywall does not appear when entitlement check unknown (fails gracefully as entitled=false)', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'unknown' })
    render(<AiGoalWizardPage />, { wrapper })

    await screen.findByTestId('paywall-cta')
    expect(screen.queryByLabelText(/goal statement/i)).not.toBeInTheDocument()
  })
})

// ─── Forecast — 403 paywall ───────────────────────────────────────────────────

describe('Goal forecast 403 paywall', () => {
  test('shows paywall CTA when forecast returns 403', async () => {
    mockGetGoalForecast.mockRejectedValue(makeForbiddenError())
    render(<GoalDetailPage />, { wrapper })

    await screen.findByText('Run 100km')
    await screen.findByTestId('forecast-paywall-cta')
    expect(screen.getByText(/AI Weekly Review requires an API key/i)).toBeInTheDocument()
  })

  test('forecast paywall links to account settings', async () => {
    mockGetGoalForecast.mockRejectedValue(makeForbiddenError())
    render(<GoalDetailPage />, { wrapper })

    await screen.findByTestId('forecast-paywall-cta')
    const btn = screen.getByTestId('paywall-upgrade-btn')
    expect(btn).toHaveAttribute('href', '/account')
  })

  test('shows standard unavailable message for non-403 forecast errors', async () => {
    mockGetGoalForecast.mockRejectedValue(new Error('not enough data'))
    render(<GoalDetailPage />, { wrapper })

    await screen.findByText('Run 100km')
    await screen.findByRole('status')
    expect(screen.queryByTestId('forecast-paywall-cta')).not.toBeInTheDocument()
  })

  test('shows forecast when data is available (entitled)', async () => {
    render(<GoalDetailPage />, { wrapper })

    await screen.findByText('Run 100km')
    await screen.findByLabelText('Weekly review')
    expect(screen.queryByTestId('forecast-paywall-cta')).not.toBeInTheDocument()
  })
})

// ─── Goals list — AI Plan button lock state ────────────────────────────────────

describe('Goals list AI Plan button', () => {
  test('shows locked AI Plan button linking to /account when not entitled', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    render(<GoalsPage />, { wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('ai-plan-locked-btn')).toBeInTheDocument()
    })
    expect(screen.getByTestId('ai-plan-locked-btn')).toHaveAttribute('href', '/account')
    expect(screen.queryByTestId('ai-plan-btn')).not.toBeInTheDocument()
  })

  test('locked AI Plan button has accessible label indicating setup required', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    render(<GoalsPage />, { wrapper })

    await waitFor(() => {
      const btn = screen.getByTestId('ai-plan-locked-btn')
      expect(btn).toHaveAttribute('aria-label', expect.stringMatching(/set up AI/i))
    })
  })

  test('shows enabled AI Plan button linking to /goals/ai/new when entitled', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: true, reason: 'api_key_set' })
    render(<GoalsPage />, { wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('ai-plan-btn')).toBeInTheDocument()
    })
    expect(screen.getByTestId('ai-plan-btn')).toHaveAttribute('href', '/goals/ai/new')
    expect(screen.queryByTestId('ai-plan-locked-btn')).not.toBeInTheDocument()
  })

  test('upgrade CTA click navigates to /account settings', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    render(<GoalsPage />, { wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('ai-plan-locked-btn')).toBeInTheDocument()
    })
    expect(screen.getByTestId('ai-plan-locked-btn')).toHaveAttribute('href', '/account')
  })
})

// ─── Manual goal flows — unaffected ──────────────────────────────────────────

describe('Manual goal flows are unaffected by paywall', () => {
  test('New Goal button always links to /goals/new regardless of entitlement', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    render(<GoalsPage />, { wrapper })

    await waitFor(() => {
      const links = screen.getAllByRole('link', { name: /new goal/i })
      expect(links.length).toBeGreaterThan(0)
      expect(links[0]).toHaveAttribute('href', '/goals/new')
    })
  })

  test('goals list renders goal cards for free users', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    mockListGoals.mockResolvedValue([
      makeGoal({ id: 'g1', title: 'My Manual Goal' }),
    ])
    render(<GoalsPage />, { wrapper })

    await screen.findByText('My Manual Goal')
    expect(screen.getByTestId('goals-list')).toBeInTheDocument()
  })

  test('goal detail page loads for free users — manual features intact', async () => {
    mockGetGoalForecast.mockRejectedValue(makeForbiddenError())
    render(<GoalDetailPage />, { wrapper })

    await screen.findByText('Run 100km')
    expect(screen.getByRole('button', { name: /mark complete/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /edit goal/i })).toBeInTheDocument()
  })

  test('check-in form is available for free users even when forecast is gated', async () => {
    mockGetGoalForecast.mockRejectedValue(makeForbiddenError())
    render(<GoalDetailPage />, { wrapper })

    await screen.findByText('Run 100km')
    expect(screen.getByRole('button', { name: /log check-in/i })).toBeInTheDocument()
  })

  test('milestones section shown for free users', async () => {
    mockGetGoalForecast.mockRejectedValue(makeForbiddenError())
    render(<GoalDetailPage />, { wrapper })

    await screen.findByText('Run 100km')
    expect(screen.getByRole('button', { name: /log check-in/i })).toBeInTheDocument()
    expect(screen.getByText(/no milestones yet/i)).toBeInTheDocument()
  })
})
