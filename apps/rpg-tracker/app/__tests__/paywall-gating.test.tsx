import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AiGoalWizardPage from '../(app)/goals/ai/new/page'
import GoalDetailPage from '../(app)/goals/[id]/page'
import GoalsPage from '../(app)/goals/page'
import { PaywallCTA } from '../../components/PaywallCTA'
import { setAnalyticsDispatcher } from '@/lib/analytics'

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
const mockTrack = vi.fn()

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
  return Object.assign(new Error('Forbidden'), { status: 403 })
}

beforeEach(() => {
  vi.clearAllMocks()
  setAnalyticsDispatcher(mockTrack)
  mockGetAIEntitlement.mockResolvedValue({ entitled: true, reason: 'ready' })
  mockListGoals.mockResolvedValue([])
  mockDeleteGoal.mockResolvedValue(undefined)
  mockGetGoal.mockResolvedValue(makeGoal())
  mockListMilestones.mockResolvedValue([])
  mockListCheckIns.mockResolvedValue([])
  mockGetGoalForecast.mockResolvedValue(makeForecast())
  mockUpdateGoal.mockResolvedValue(makeGoal())
})

afterEach(() => {
  setAnalyticsDispatcher(null)
})

describe('PaywallCTA', () => {
  test('api_key gate renders default title and links to /account/api-key', () => {
    render(<PaywallCTA gate="api_key" />)
    expect(screen.getByText(/AI features require an API key/i)).toBeInTheDocument()
    expect(screen.getByTestId('paywall-upgrade-btn')).toHaveAttribute('href', '/account/api-key')
  })

  test('subscription gate renders Pro title and links to /account#subscription', () => {
    render(<PaywallCTA gate="subscription" />)
    expect(screen.getByText(/AI Goal Coach requires Pro/i)).toBeInTheDocument()
    expect(screen.getByTestId('paywall-upgrade-btn')).toHaveAttribute('href', '/account#subscription')
  })

  test('emits paywall_viewed on mount with feature_gate for api_key', async () => {
    render(<PaywallCTA gate="api_key" surface="ai_goal_coach" />)
    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'paywall_viewed',
          payload: { surface: 'ai_goal_coach', trigger: 'feature_gate' },
        }),
      )
    })
  })

  test('emits paywall_viewed on mount with upgrade_prompt for subscription', async () => {
    render(<PaywallCTA gate="subscription" surface="account" />)
    await waitFor(() => {
      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'paywall_viewed',
          payload: { surface: 'account', trigger: 'upgrade_prompt' },
        }),
      )
    })
  })

  test('upgrade_clicked fires on CTA click', () => {
    render(<PaywallCTA gate="subscription" surface="ai_goal_coach" />)
    mockTrack.mockClear()
    fireEvent.click(screen.getByTestId('paywall-upgrade-btn'))
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'upgrade_clicked',
        payload: { surface: 'ai_goal_coach', trigger: 'paywall' },
      }),
    )
  })
})

describe('AI Wizard paywall gate', () => {
  test('shows API-key paywall when user is not entitled (no API key)', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    render(<AiGoalWizardPage />, { wrapper })

    await screen.findByTestId('paywall-cta')
    expect(screen.getByText(/AI features require an API key/i)).toBeInTheDocument()
  })

  test('shows subscription paywall when reason is subscription_required', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'subscription_required' })
    render(<AiGoalWizardPage />, { wrapper })

    await screen.findByTestId('paywall-cta')
    expect(screen.getByText(/AI Goal Coach requires Pro/i)).toBeInTheDocument()
    expect(screen.getByTestId('paywall-upgrade-btn')).toHaveAttribute('href', '/account#subscription')
  })

  test('API-key paywall links to /account/api-key', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    render(<AiGoalWizardPage />, { wrapper })

    await screen.findByTestId('paywall-cta')
    expect(screen.getByTestId('paywall-upgrade-btn')).toHaveAttribute('href', '/account/api-key')
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
    mockGetAIEntitlement.mockResolvedValue({ entitled: true, reason: 'ready' })
    render(<AiGoalWizardPage />, { wrapper })

    await screen.findByRole('heading', { name: /ai goal coach/i })
    expect(screen.getByLabelText(/goal statement/i)).toBeInTheDocument()
    expect(screen.queryByTestId('paywall-cta')).not.toBeInTheDocument()
  })

  test('paywall blocks wizard when entitlement check unknown', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'unknown' })
    render(<AiGoalWizardPage />, { wrapper })

    await screen.findByTestId('paywall-cta')
    expect(screen.queryByLabelText(/goal statement/i)).not.toBeInTheDocument()
  })
})

describe('Goal forecast errors', () => {
  test('shows unavailable message when forecast returns 403 (no paywall)', async () => {
    mockGetGoalForecast.mockRejectedValue(makeForbiddenError())
    render(<GoalDetailPage />, { wrapper })

    await screen.findByText('Run 100km')
    await screen.findByRole('status')
    expect(screen.getByText(/forecast unavailable/i)).toBeInTheDocument()
    expect(screen.queryByTestId('forecast-paywall-cta')).not.toBeInTheDocument()
    expect(screen.queryByTestId('paywall-cta')).not.toBeInTheDocument()
  })

  test('shows standard unavailable message for non-403 forecast errors', async () => {
    mockGetGoalForecast.mockRejectedValue(new Error('not enough data'))
    render(<GoalDetailPage />, { wrapper })

    await screen.findByText('Run 100km')
    await screen.findByRole('status')
    expect(screen.queryByTestId('forecast-paywall-cta')).not.toBeInTheDocument()
  })

  test('shows forecast when data is available', async () => {
    render(<GoalDetailPage />, { wrapper })

    await screen.findByText('Run 100km')
    await screen.findByLabelText('Weekly review')
    expect(screen.queryByTestId('forecast-paywall-cta')).not.toBeInTheDocument()
  })
})

describe('Goals list AI Plan button', () => {
  test('shows locked AI Plan button linking to /goals/ai/new when not entitled', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    render(<GoalsPage />, { wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('ai-plan-locked-btn')).toBeInTheDocument()
    })
    expect(screen.getByTestId('ai-plan-locked-btn')).toHaveAttribute('href', '/goals/ai/new')
    expect(screen.queryByTestId('ai-plan-btn')).not.toBeInTheDocument()
  })

  test('locked AI Plan button has accessible label indicating unlock required', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: false, reason: 'no_api_key' })
    render(<GoalsPage />, { wrapper })

    await waitFor(() => {
      const btn = screen.getByTestId('ai-plan-locked-btn')
      expect(btn).toHaveAttribute('aria-label', expect.stringMatching(/unlock AI goal planning/i))
    })
  })

  test('shows enabled AI Plan button linking to /goals/ai/new when entitled', async () => {
    mockGetAIEntitlement.mockResolvedValue({ entitled: true, reason: 'ready' })
    render(<GoalsPage />, { wrapper })

    await waitFor(() => {
      expect(screen.getByTestId('ai-plan-btn')).toBeInTheDocument()
    })
    expect(screen.getByTestId('ai-plan-btn')).toHaveAttribute('href', '/goals/ai/new')
    expect(screen.queryByTestId('ai-plan-locked-btn')).not.toBeInTheDocument()
  })
})

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
    mockListGoals.mockResolvedValue([makeGoal({ id: 'g1', title: 'My Manual Goal' })])
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

  test('check-in form is available for free users even when forecast errors', async () => {
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
