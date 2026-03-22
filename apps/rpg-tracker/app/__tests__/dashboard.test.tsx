import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

vi.mock('@rpgtracker/api-client', () => ({
  listSkills: (...args: unknown[]) => mockListSkills(...args),
  getActivity: (...args: unknown[]) => mockGetActivity(...args),
  logXP: (...args: unknown[]) => mockLogXP(...args),
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

test('shows featured skill section with most recent skill (AC-6)', async () => {
  render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Continue where you left off')).toBeInTheDocument()
  })
  // Guitar is the first/most recently updated skill — appears in both SkillCard and activity feed
  const guitarElements = screen.getAllByText('Guitar')
  expect(guitarElements.length).toBeGreaterThanOrEqual(1)
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

test('shows Log XP quick action button', async () => {
  render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    // The main "Log XP" button (full-width primary action)
    const logButtons = screen.getAllByRole('button', { name: /log/i })
    // There should be at least 2: the SkillCard "+ Log" and the main "Log XP" button
    const mainLogButton = logButtons.find((btn) => btn.textContent === 'Log XP')
    expect(mainLogButton).toBeTruthy()
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

// ── T1b: Layout + Colour Migration Tests ──────────────────────────────────────

test('AC-02: stats container has md:grid-cols-4 class for 4-column desktop grid', async () => {
  const { container } = render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Total Skills')).toBeInTheDocument()
  })
  const statsRegion = container.querySelector('[aria-label="Stats"]')
  expect(statsRegion).not.toBeNull()
  expect(statsRegion!.className).toMatch(/md:grid-cols-4/)
})

test('AC-03: skills grid appears before activity feed in DOM order', async () => {
  const { container } = render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })
  const skillsGrid = container.querySelector('[data-testid="skills-grid"]')
  const activityFeed = container.querySelector('[data-testid="activity-feed"]')
  expect(skillsGrid).not.toBeNull()
  expect(activityFeed).not.toBeNull()
  // Activity feed must come after skills grid in document order
  const position = skillsGrid!.compareDocumentPosition(activityFeed!)
  // Node.DOCUMENT_POSITION_FOLLOWING = 4
  expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
})

test('AC-03: skills section uses multi-column grid class on desktop', async () => {
  const { container } = render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Total Skills')).toBeInTheDocument()
  })
  const skillsGrid = container.querySelector('[data-testid="skills-grid"]')
  expect(skillsGrid).not.toBeNull()
  // Must have a grid class with at least 2 columns on md
  expect(skillsGrid!.className).toMatch(/md:grid-cols-[2-9]|md:grid-cols-\[repeat/)
})

test('AC-13a: loading skeleton uses CSS variable tokens — no bg-gray-* classes', () => {
  // Render in loading state by not resolving mocks before render
  mockListSkills.mockReturnValue(new Promise(() => {}))
  mockGetActivity.mockReturnValue(new Promise(() => {}))

  const { container } = render(<DashboardPage />, { wrapper })
  // While loading, skeleton is shown — scan for forbidden bg-gray- pattern
  const forbiddenPattern = /bg-gray-\d/
  expect(container.innerHTML).not.toMatch(forbiddenPattern)
})

test('AC-18: dashboard section headers reference var(--font-display)', async () => {
  const { container } = render(<DashboardPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })
  // Find all h2 elements (section headers)
  const sectionHeaders = container.querySelectorAll('h2')
  expect(sectionHeaders.length).toBeGreaterThan(0)
  const atLeastOneUsesDisplayFont = Array.from(sectionHeaders).some(
    (h) => h.style.fontFamily.includes('var(--font-display')
  )
  expect(atLeastOneUsesDisplayFont).toBe(true)
})
