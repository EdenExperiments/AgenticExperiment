import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardPage from '../(app)/dashboard/page'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard',
}))

function makeMockSkills() {
  return [
    {
      id: 'skill-1',
      user_id: 'user-1',
      name: 'Guitar',
      description: 'Practice guitar',
      unit: 'session',
      preset_id: null,
      starting_level: 1,
      current_xp: 500,
      current_level: 5,
      effective_level: 5,
      quick_log_chips: [10, 25, 50, 100] as [number, number, number, number],
      tier_name: 'Novice',
      tier_number: 1,
      gates: [
        {
          id: 'g1',
          skill_id: 'skill-1',
          gate_level: 9,
          title: 'Gate 1',
          description: '',
          first_notified_at: null,
          is_cleared: false,
          cleared_at: null,
        },
      ],
      recent_logs: [],
      xp_to_next_level: 200,
      xp_for_current_level: 100,
      created_at: '2026-03-19T00:00:00Z',
      updated_at: '2026-03-19T10:00:00Z',
    },
    {
      id: 'skill-2',
      user_id: 'user-1',
      name: 'Running',
      description: '',
      unit: 'km',
      preset_id: null,
      starting_level: 1,
      current_xp: 2000,
      current_level: 15,
      effective_level: 15,
      quick_log_chips: [25, 50, 100, 250] as [number, number, number, number],
      tier_name: 'Apprentice',
      tier_number: 2,
      gates: [],
      recent_logs: [],
      xp_to_next_level: 500,
      xp_for_current_level: 300,
      created_at: '2026-03-18T00:00:00Z',
      updated_at: '2026-03-18T10:00:00Z',
    },
  ]
}

function makeMockActivity() {
  return [
    {
      id: 'evt-1',
      skill_id: 'skill-1',
      skill_name: 'Guitar',
      xp_delta: 25,
      log_note: 'Practiced scales',
      created_at: new Date().toISOString(),
    },
    {
      id: 'evt-2',
      skill_id: 'skill-2',
      skill_name: 'Running',
      xp_delta: 50,
      log_note: '',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ]
}

const mockListSkills = vi.fn()
const mockGetActivity = vi.fn()
const mockLogXP = vi.fn()
const mockGetAccount = vi.fn()
const mockSetPrimarySkill = vi.fn()
const mockGetCurrentFast = vi.fn()
const mockListWeightLogs = vi.fn()
const mockListPantry = vi.fn()
const mockGetCurrentWorkout = vi.fn()
const mockListWorkoutHistory = vi.fn()
const mockListMoodLogs = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  listSkills: (...args: unknown[]) => mockListSkills(...args),
  getActivity: (...args: unknown[]) => mockGetActivity(...args),
  logXP: (...args: unknown[]) => mockLogXP(...args),
  getAccount: (...args: unknown[]) => mockGetAccount(...args),
  setPrimarySkill: (...args: unknown[]) => mockSetPrimarySkill(...args),
  getCurrentFast: (...args: unknown[]) => mockGetCurrentFast(...args),
  listWeightLogs: (...args: unknown[]) => mockListWeightLogs(...args),
  listPantry: (...args: unknown[]) => mockListPantry(...args),
  getCurrentWorkout: (...args: unknown[]) => mockGetCurrentWorkout(...args),
  listWorkoutHistory: (...args: unknown[]) => mockListWorkoutHistory(...args),
  listMoodLogs: (...args: unknown[]) => mockListMoodLogs(...args),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockListSkills.mockResolvedValue(makeMockSkills())
  mockGetActivity.mockResolvedValue(makeMockActivity())
  mockGetAccount.mockResolvedValue({ id: 'user-1', email: 'test@example.com', display_name: null, primary_skill_id: null })
  mockGetCurrentFast.mockResolvedValue(null)
  mockListWeightLogs.mockResolvedValue([])
  mockListPantry.mockResolvedValue([])
  mockGetCurrentWorkout.mockResolvedValue(null)
  mockListWorkoutHistory.mockResolvedValue([])
  mockListMoodLogs.mockResolvedValue([])
  mockLogXP.mockResolvedValue({
    skill: makeMockSkills()[0],
    xp_added: 25,
    level_before: 5,
    level_after: 5,
    tier_crossed: false,
    tier_name: 'Novice',
    tier_number: 1,
    quick_log_chips: [10, 25, 50, 100],
    gate_first_hit: null,
  })
})

test('renders the dashboard heading', async () => {
  render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
  })
})

test('renders 4 stat cards with correct values (AC-4, AC-5)', async () => {
  render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Total Skills')).toBeInTheDocument()
  })
  expect(screen.getByText('Active Gates')).toBeInTheDocument()
  expect(screen.getByText('XP Today')).toBeInTheDocument()
  expect(screen.getByText('Highest Tier')).toBeInTheDocument()

  // Total Skills = 2
  const statValues = screen.getAllByTestId('stat-value')
  expect(statValues[0]).toHaveTextContent('2')
})

test('shows skills section with all skills listed (AC-6)', async () => {
  render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Your Skills')).toBeInTheDocument()
  })
  // Both skills should appear in the grid (may also appear in activity feed)
  expect(screen.getAllByText('Guitar').length).toBeGreaterThanOrEqual(1)
  expect(screen.getAllByText('Running').length).toBeGreaterThanOrEqual(1)
})

test('renders activity feed items (AC-7)', async () => {
  render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })
  expect(screen.getByText('Practiced scales')).toBeInTheDocument()
  expect(screen.getByText('+25 XP')).toBeInTheDocument()
  expect(screen.getByText('+50 XP')).toBeInTheDocument()
})

test('activity feed items are clickable and navigate to skill detail (AC-8)', async () => {
  render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })
  // Find the activity feed buttons — they contain XP info
  const activityButtons = screen.getAllByRole('button').filter((btn) =>
    btn.textContent?.includes('+25 XP')
  )
  expect(activityButtons.length).toBeGreaterThan(0)
  fireEvent.click(activityButtons[0])
  expect(mockPush).toHaveBeenCalledWith('/skills/skill-1')
})

test('shows empty state when user has zero skills (AC-9)', async () => {
  mockListSkills.mockResolvedValueOnce([])

  render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Begin Your Quest')).toBeInTheDocument()
  })
  expect(screen.getByText('Create your first skill')).toBeInTheDocument()
  const link = screen.getByRole('link', { name: /create your first skill/i })
  expect(link).toHaveAttribute('href', '/skills/new')
})

test('shows Quick Log panel button', async () => {
  render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    // The QuickLogPanel collapsed button shows "Log XP — {skillName}"
    const logButtons = screen.getAllByRole('button', { name: /log xp/i })
    expect(logButtons.length).toBeGreaterThan(0)
  })
})

test('shows empty activity message when no events exist', async () => {
  mockGetActivity.mockResolvedValueOnce([])

  render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(
      screen.getByText('No activity yet. Log some XP to see your progress here.')
    ).toBeInTheDocument()
  })
})

async function expandQuickLogPanel() {
  const expandBtn = await screen.findByRole('button', { name: /log xp — guitar/i })
  fireEvent.click(expandBtn)
  await waitFor(() => {
    expect(screen.getByText('Guitar — Quick Log')).toBeInTheDocument()
  })
}

async function submitQuickLogFromPanel() {
  const panelHeading = screen.getByText('Guitar — Quick Log')
  const panel = panelHeading.closest('.rounded-xl')
  expect(panel).toBeTruthy()
  fireEvent.click(within(panel!).getByRole('button', { name: 'Log XP' }))
}

test('shows TierTransitionModal after quick log when tier_crossed is true (D-022)', async () => {
  mockLogXP.mockResolvedValueOnce({
    skill: { ...makeMockSkills()[0], tier_name: 'Apprentice', tier_number: 2, current_level: 10 },
    xp_added: 90,
    level_before: 9,
    level_after: 10,
    tier_crossed: true,
    tier_name: 'Apprentice',
    tier_number: 2,
    quick_log_chips: [10, 25, 50, 100],
    gate_first_hit: null,
  })

  render(<DashboardPage />, { wrapper })
  await expandQuickLogPanel()
  await submitQuickLogFromPanel()

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /apprentice/i })).toBeInTheDocument()
  })

  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: /apprentice/i })).not.toBeInTheDocument()
  })
})

test('does not show TierTransitionModal when tier_crossed is false (D-022)', async () => {
  render(<DashboardPage />, { wrapper })
  await expandQuickLogPanel()
  await submitQuickLogFromPanel()

  await waitFor(() => {
    expect(mockLogXP).toHaveBeenCalled()
  })
  expect(screen.queryByRole('heading', { name: /you've reached/i })).not.toBeInTheDocument()
})

test('hub doors show receipts instead of Open placeholders', async () => {
  mockGetCurrentFast.mockResolvedValue({
    id: 'f1',
    started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    target_hours: 16,
    created_at: new Date().toISOString(),
  })
  mockListWeightLogs.mockResolvedValue([
    { id: 'w1', weight_kg: 72.5, note: '', measured_at: '2026-08-14T08:00:00Z', created_at: '2026-08-14T08:00:00Z' },
  ])
  mockListPantry.mockResolvedValue([{ id: 'p1', name: 'Eggs', amount_text: '6', created_at: '' }])
  mockGetCurrentWorkout.mockResolvedValue(null)
  mockListWorkoutHistory.mockResolvedValue([])
  mockListMoodLogs.mockResolvedValue([
    { id: 'm1', logged_at: '2026-08-14T08:00:00Z', valence: 4, energy: 2, note: '', created_at: '' },
  ])

  render(<DashboardPage />, { wrapper })
  const nutri = await screen.findByRole('link', { name: /open nutrilog/i })
  await waitFor(() => {
    expect(nutri).toHaveTextContent('2h')
    expect(nutri).toHaveTextContent('72.5 kg')
    expect(nutri).toHaveTextContent('1 item')
  })
  const workout = screen.getByRole('link', { name: /open workout/i })
  expect(workout).toHaveTextContent('None')
  expect(workout).toHaveTextContent('Off')
  const mind = screen.getByRole('link', { name: /open mindtrack/i })
  expect(mind).toHaveTextContent('4')
  expect(mind).toHaveTextContent('Private')
})

