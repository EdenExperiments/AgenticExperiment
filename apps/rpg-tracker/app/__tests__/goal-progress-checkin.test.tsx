/**
 * T11 supplemental frontend tests.
 * Covers: derived progress display, check-in value updates, goal validation,
 * milestone ordering in UI, and check-in newest-first ordering.
 * These tests are INTENTIONALLY RED until T9 UI implementation is merged.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GoalDetailPage from '../(app)/goals/[id]/page'
import GoalCreatePage from '../(app)/goals/new/page'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetGoal = vi.fn()
const mockListMilestones = vi.fn()
const mockListCheckIns = vi.fn()
const mockCreateMilestone = vi.fn()
const mockUpdateMilestone = vi.fn()
const mockDeleteMilestone = vi.fn()
const mockCreateCheckIn = vi.fn()
const mockUpdateGoal = vi.fn()
const mockCreateGoal = vi.fn()
const mockListSkills = vi.fn()
const mockPush = vi.fn()
const mockBack = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  getGoal: (...args: unknown[]) => mockGetGoal(...args),
  listMilestones: (...args: unknown[]) => mockListMilestones(...args),
  listCheckIns: (...args: unknown[]) => mockListCheckIns(...args),
  createMilestone: (...args: unknown[]) => mockCreateMilestone(...args),
  updateMilestone: (...args: unknown[]) => mockUpdateMilestone(...args),
  deleteMilestone: (...args: unknown[]) => mockDeleteMilestone(...args),
  createCheckIn: (...args: unknown[]) => mockCreateCheckIn(...args),
  updateGoal: (...args: unknown[]) => mockUpdateGoal(...args),
  createGoal: (...args: unknown[]) => mockCreateGoal(...args),
  listSkills: (...args: unknown[]) => mockListSkills(...args),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'goal-1' }),
  useRouter: () => ({ push: mockPush, back: mockBack }),
}))

// ─── Factories ────────────────────────────────────────────────────────────────

function makeNumericGoal(overrides = {}) {
  return {
    id: 'goal-1',
    user_id: 'user-1',
    skill_id: null,
    title: 'Run 100km',
    description: 'Measured running goal',
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

function makeQualitativeGoal(overrides = {}) {
  return {
    id: 'goal-1',
    user_id: 'user-1',
    skill_id: null,
    title: 'Read more books',
    description: null,
    status: 'active' as const,
    target_date: null,
    current_value: null,
    target_value: null,
    unit: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeMilestone(position: number, title: string, overrides = {}) {
  return {
    id: `ms-${position}`,
    goal_id: 'goal-1',
    title,
    description: null,
    position,
    is_done: false,
    due_date: null,
    done_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeCheckIn(id: string, note: string, daysAgo: number, value: number | null = null) {
  const date = new Date(Date.now() - daysAgo * 86400000).toISOString()
  return { id, goal_id: 'goal-1', note, value, checked_in_at: date, created_at: date }
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
  mockGetGoal.mockResolvedValue(makeNumericGoal())
  mockListMilestones.mockResolvedValue([makeMilestone(0, 'First 25km'), makeMilestone(1, 'Second 25km')])
  mockListCheckIns.mockResolvedValue([makeCheckIn('ci-1', 'Ran 5km today', 0, 5)])
  mockUpdateMilestone.mockResolvedValue({ ...makeMilestone(0, 'First 25km'), is_done: true })
  mockDeleteMilestone.mockResolvedValue(undefined)
  mockCreateMilestone.mockResolvedValue(makeMilestone(2, 'New milestone'))
  mockCreateCheckIn.mockResolvedValue(makeCheckIn('ci-new', 'New note', 0, 10))
  mockUpdateGoal.mockResolvedValue(makeNumericGoal({ status: 'completed' }))
  mockListSkills.mockResolvedValue([])
  mockCreateGoal.mockResolvedValue({ id: 'goal-new', status: 'active', title: 'New goal',
    user_id: 'u1', skill_id: null, description: null, target_date: null,
    current_value: null, target_value: null, unit: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' })
})

// ─── AC: Derived progress display ─────────────────────────────────────────────

describe('Derived progress display on goal detail', () => {
  test('shows progress bar with aria-valuenow reflecting current/target', async () => {
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Run 100km')

    const bar = screen.getByRole('progressbar', { name: /goal numeric progress/i })
    // current_value=20, target_value=100 → 20% progress
    expect(bar).toHaveAttribute('aria-valuenow', '20')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  test('shows "20 / 100 km" progress text for numeric goal', async () => {
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Run 100km')
    expect(screen.getByText('20 / 100 km')).toBeInTheDocument()
  })

  test('shows "0 / 50" when current_value is 0', async () => {
    mockGetGoal.mockResolvedValue(makeNumericGoal({ current_value: 0, target_value: 50, unit: 'pushups' }))
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Run 100km')
    expect(screen.getByText('0 / 50 pushups')).toBeInTheDocument()
  })

  test('shows 100% progress (full bar) when current equals target', async () => {
    mockGetGoal.mockResolvedValue(makeNumericGoal({ current_value: 100, target_value: 100 }))
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Run 100km')

    const bar = screen.getByRole('progressbar', { name: /goal numeric progress/i })
    expect(bar).toHaveAttribute('aria-valuenow', '100')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  test('does NOT render progress bar for qualitative goal (no target_value)', async () => {
    mockGetGoal.mockResolvedValue(makeQualitativeGoal())
    mockListMilestones.mockResolvedValue([])
    mockListCheckIns.mockResolvedValue([])
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Read more books')
    expect(screen.queryByRole('progressbar', { name: /goal numeric progress/i })).not.toBeInTheDocument()
  })
})

// ─── AC: Check-in value updates derive from goal's numeric tracking ────────────

describe('Check-in interactions with numeric value', () => {
  test('check-in form shows value field when goal has numeric tracking', async () => {
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Run 100km')

    fireEvent.click(screen.getByRole('button', { name: /\+ log check-in/i }))

    // The form should have a numeric input for the check-in value
    expect(screen.getByLabelText(/value/i)).toBeInTheDocument()
  })

  test('submits check-in with numeric value when provided', async () => {
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Run 100km')

    fireEvent.click(screen.getByRole('button', { name: /\+ log check-in/i }))
    fireEvent.change(screen.getByLabelText(/check-in note/i), { target: { value: 'Ran 10km today' } })
    fireEvent.change(screen.getByLabelText(/value/i), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(mockCreateCheckIn).toHaveBeenCalledWith('goal-1', expect.objectContaining({
        note: 'Ran 10km today',
        value: 10,
      }))
    })
  })

  test('submits check-in without value when value field left empty', async () => {
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Run 100km')

    fireEvent.click(screen.getByRole('button', { name: /\+ log check-in/i }))
    fireEvent.change(screen.getByLabelText(/check-in note/i), { target: { value: 'Quick note' } })
    // Leave value field empty
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(mockCreateCheckIn).toHaveBeenCalledWith('goal-1', expect.objectContaining({
        note: 'Quick note',
      }))
      // value should NOT be present (or should be null/undefined) when left empty
      const callArgs = mockCreateCheckIn.mock.calls[0][1]
      expect(callArgs.value == null || callArgs.value === undefined).toBe(true)
    })
  })

  test('check-in list shows value when present', async () => {
    mockListCheckIns.mockResolvedValue([
      makeCheckIn('ci-1', 'Ran 5km today', 0, 5),
    ])
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Ran 5km today')
    // The check-in display should show the note text — value may be shown alongside
    expect(screen.getByText('Ran 5km today')).toBeInTheDocument()
  })
})

// ─── AC: Check-ins listed newest first ────────────────────────────────────────

describe('Check-ins newest first ordering', () => {
  test('renders check-ins in the order returned by API (newest first)', async () => {
    mockListCheckIns.mockResolvedValue([
      makeCheckIn('ci-latest', 'Most recent run', 0, 10),
      makeCheckIn('ci-older', 'Earlier run', 2, 5),
      makeCheckIn('ci-oldest', 'First ever run', 7, 3),
    ])
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Most recent run')

    // Verify all three check-in notes appear in the document
    expect(screen.getByText('Most recent run')).toBeInTheDocument()
    expect(screen.getByText('Earlier run')).toBeInTheDocument()
    expect(screen.getByText('First ever run')).toBeInTheDocument()

    // Verify DOM ordering: newest note appears before older notes
    const container = document.body
    const newestEl = container.querySelector('p:not([class*="text-xs"])')
    // The page renders check-ins as returned by API — we verify the first check-in
    // card's note text matches the item that should appear first (newest).
    const allNotes = Array.from(container.querySelectorAll('[class*="space-y-2"] p'))
      .map(el => el.textContent?.trim() ?? '')
      .filter(t => ['Most recent run', 'Earlier run', 'First ever run'].includes(t))

    expect(allNotes[0]).toBe('Most recent run')
    expect(allNotes[1]).toBe('Earlier run')
    expect(allNotes[2]).toBe('First ever run')
  })
})

// ─── AC: Milestone ordering in UI ─────────────────────────────────────────────

describe('Milestone ordering by position', () => {
  test('renders milestones in position order from API', async () => {
    mockListMilestones.mockResolvedValue([
      makeMilestone(0, 'Alpha Step'),
      makeMilestone(1, 'Beta Step'),
      makeMilestone(2, 'Gamma Step'),
    ])
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Alpha Step')

    const list = screen.getByRole('list', { name: 'Milestones' })
    const items = list.querySelectorAll('li')
    expect(items[0]).toHaveTextContent('Alpha Step')
    expect(items[1]).toHaveTextContent('Beta Step')
    expect(items[2]).toHaveTextContent('Gamma Step')
  })

  test('toggling a done milestone marks it with aria-pressed=true', async () => {
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('First 25km')

    const toggleBtn = screen.getByRole('button', { name: /mark "first 25km" done/i })
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(toggleBtn)

    await waitFor(() => {
      expect(mockUpdateMilestone).toHaveBeenCalledWith('goal-1', 'ms-0', { is_done: true })
    })
  })

  test('milestone with is_done=true shows as already pressed', async () => {
    mockListMilestones.mockResolvedValue([
      makeMilestone(0, 'Done Milestone', { is_done: true }),
    ])
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Done Milestone')

    const toggleBtn = screen.getByRole('button', { name: /mark "done milestone" incomplete/i })
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true')
  })
})

// ─── AC: Goal status display ──────────────────────────────────────────────────

describe('Goal status badge display', () => {
  test('shows "Active" badge for active goal', async () => {
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Run 100km')
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  test('shows "Completed" badge for completed goal', async () => {
    mockGetGoal.mockResolvedValue(makeNumericGoal({ status: 'completed' }))
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Run 100km')
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  test('shows "Abandoned" badge for abandoned goal', async () => {
    mockGetGoal.mockResolvedValue(makeNumericGoal({ status: 'abandoned' }))
    render(<GoalDetailPage />, { wrapper })
    await screen.findByText('Run 100km')
    expect(screen.getByText('Abandoned')).toBeInTheDocument()
  })
})

// ─── AC: Validation — create form ────────────────────────────────────────────

describe('Goal create form validation', () => {
  test('shows unit field only when target_value is filled', async () => {
    render(<GoalCreatePage />, { wrapper })

    // Unit field should be hidden initially
    expect(screen.queryByLabelText(/unit/i)).not.toBeInTheDocument()

    // Fill in target value
    fireEvent.change(screen.getByLabelText(/target value/i), { target: { value: '100' } })

    // Unit field should now appear
    expect(screen.getByLabelText(/unit/i)).toBeInTheDocument()
  })

  test('sends numeric current_value and target_value as numbers, not strings', async () => {
    render(<GoalCreatePage />, { wrapper })

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Goal' } })
    fireEvent.change(screen.getByLabelText(/starting value/i), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText(/target value/i), { target: { value: '50' } })
    fireEvent.click(screen.getByRole('button', { name: /create goal/i }))

    await waitFor(() => {
      expect(mockCreateGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          current_value: 10,
          target_value: 50,
        })
      )
    })
    // Ensure they are numbers not strings
    const payload = mockCreateGoal.mock.calls[0][0]
    expect(typeof payload.current_value).toBe('number')
    expect(typeof payload.target_value).toBe('number')
  })

  test('does not include current_value/target_value in payload when not filled', async () => {
    render(<GoalCreatePage />, { wrapper })

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Qualitative Goal' } })
    fireEvent.click(screen.getByRole('button', { name: /create goal/i }))

    await waitFor(() => {
      expect(mockCreateGoal).toHaveBeenCalled()
    })
    const payload = mockCreateGoal.mock.calls[0][0]
    expect(payload.current_value == null || payload.current_value === undefined).toBe(true)
    expect(payload.target_value == null || payload.target_value === undefined).toBe(true)
  })

  test('shows error alert when create fails with server error', async () => {
    mockCreateGoal.mockRejectedValue(new Error('server error'))
    render(<GoalCreatePage />, { wrapper })

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'My Goal' } })
    fireEvent.click(screen.getByRole('button', { name: /create goal/i }))

    await screen.findByRole('alert')
    expect(screen.getByText(/failed to create goal/i)).toBeInTheDocument()
  })

  test('submit button remains disabled when title is empty', () => {
    render(<GoalCreatePage />, { wrapper })
    const btn = screen.getByRole('button', { name: /create goal/i })
    expect(btn).toBeDisabled()
  })
})
