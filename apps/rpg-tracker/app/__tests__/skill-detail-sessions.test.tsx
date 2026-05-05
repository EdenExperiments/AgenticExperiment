import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SkillDetailPage from '../(app)/skills/[id]/page'

const mockGetSkill = vi.fn()
const mockGetActivity = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  getSkill: (...args: unknown[]) => mockGetSkill(...args),
  getActivity: (...args: unknown[]) => mockGetActivity(...args),
  getAccount: vi.fn().mockResolvedValue({ primary_skill_id: null }),
  listTags: vi.fn().mockResolvedValue([]),
  logXP: vi.fn(),
  deleteSkill: vi.fn(),
  createSession: vi.fn(),
  getXPChart: vi.fn().mockResolvedValue({ days: 30, data: [] }),
  toggleFavourite: vi.fn(),
  updateSkill: vi.fn(),
  setPrimarySkill: vi.fn(),
  setSkillTags: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'skill-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

vi.mock('@/components/XPGainAnimation', () => ({
  XPGainAnimation: () => null,
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

// Base skill without streak — covers the zero-streak case (AC-E5)
const baseSkill = {
  id: 'skill-1',
  name: 'Running',
  description: 'Running practice',
  unit: 'km',
  user_id: 'u1',
  preset_id: null,
  starting_level: 1,
  current_xp: 500,
  current_level: 3,
  effective_level: 3,
  quick_log_chips: [50, 100, 250, 500],
  tier_name: 'Novice',
  tier_number: 1,
  gates: [],
  recent_logs: [],
  xp_to_next_level: 800,
  xp_for_current_level: 100,
  created_at: '',
  updated_at: '',
  requires_active_use: false,
  animation_theme: 'general',
  streak: { current: 0, longest: 0 },
  active_gate_submission: null,
  tags: [],
  is_custom: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSkill.mockResolvedValue(baseSkill)
  mockGetActivity.mockResolvedValue([])
})

// AC-B1: "Start Session" renders as primary button and "Log XP" as secondary
test('"Start Session" is the primary button and "Log XP" is secondary', async () => {
  render(<SkillDetailPage />, { wrapper })

  await waitFor(() => {
    expect(screen.getByTestId('start-session-btn')).toBeInTheDocument()
  })

  const startBtn = screen.getByTestId('start-session-btn')
  const logXPBtn = screen.getByRole('button', { name: /log xp/i })

  // Both controls must be present (Start Session is a Next.js Link → role link)
  expect(startBtn).toBeInTheDocument()
  expect(logXPBtn).toBeInTheDocument()

  // "Start Session" must have primary styling (filled/prominent)
  const startIsPrimary =
    startBtn.classList.contains('btn-primary') ||
    startBtn.classList.contains('primary') ||
    startBtn.getAttribute('data-variant') === 'primary'
  expect(startIsPrimary).toBe(true)

  // "Log XP" must have secondary styling (outlined/subdued)
  const logXPIsSecondary =
    logXPBtn.classList.contains('btn-secondary') ||
    logXPBtn.classList.contains('secondary') ||
    logXPBtn.classList.contains('outline') ||
    logXPBtn.getAttribute('data-variant') === 'secondary'
  expect(logXPIsSecondary).toBe(true)
})

// AC-E5: When current_streak=0, streak badge is hidden and motivational prompt shown
test('when current_streak=0, streak badge hidden and motivational prompt shown', async () => {
  mockGetSkill.mockResolvedValue({
    ...baseSkill,
    streak: { current: 0, longest: 0 },
  })

  render(<SkillDetailPage />, { wrapper })

  await waitFor(() => {
    expect(screen.getByTestId('start-session-btn')).toBeInTheDocument()
  })

  // No streak badge (flame + count) should appear
  expect(screen.queryByTestId('streak-badge')).not.toBeInTheDocument()

  // Motivational prompt must appear (spec AC-E5)
  expect(
    screen.getByText(/log today to start your streak/i)
  ).toBeInTheDocument()
})

// AC-E5: When current_streak > 0, streak badge is shown (not motivational prompt)
test('when current_streak > 0, streak badge is shown and prompt is hidden', async () => {
  mockGetSkill.mockResolvedValue({
    ...baseSkill,
    streak: { current: 5, longest: 12 },
  })

  render(<SkillDetailPage />, { wrapper })

  await waitFor(() => {
    expect(screen.getByTestId('streak-badge')).toBeInTheDocument()
  })

  // Motivational prompt should NOT appear when streak is active
  expect(
    screen.queryByText(/log today to start your streak/i)
  ).not.toBeInTheDocument()
})
