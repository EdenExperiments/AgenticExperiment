import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SkillDetailPage from '../(app)/skills/[id]/page'

const mockGetSkill = vi.fn()
const mockGetActivity = vi.fn()

const mockGetXPChart = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  getSkill: (...args: unknown[]) => mockGetSkill(...args),
  getActivity: (...args: unknown[]) => mockGetActivity(...args),
  getXPChart: (...args: unknown[]) => mockGetXPChart(...args),
  logXP: vi.fn(),
  deleteSkill: vi.fn(),
  createSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'skill-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

// Mock XPGainAnimation to avoid framer-motion import issues
vi.mock('@/components/XPGainAnimation', () => ({
  XPGainAnimation: () => null,
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: no chart data (tests that need chart data override this)
  mockGetXPChart.mockResolvedValue(null)
  mockGetSkill.mockResolvedValue({
    id: 'skill-1', name: 'Running', description: 'Running practice', unit: 'km',
    user_id: 'u1', preset_id: null, starting_level: 1, current_xp: 500, current_level: 3,
    effective_level: 3, quick_log_chips: [50, 100, 250, 500],
    tier_name: 'Novice', tier_number: 1, gates: [], recent_logs: [],
    xp_to_next_level: 800, xp_for_current_level: 100, created_at: '', updated_at: '',
  })
  mockGetActivity.mockResolvedValue([
    { id: 'evt-1', skill_id: 'skill-1', skill_name: 'Running', xp_delta: 50, log_note: 'Morning run', created_at: new Date().toISOString() },
    { id: 'evt-2', skill_id: 'skill-1', skill_name: 'Running', xp_delta: 25, log_note: '', created_at: new Date(Date.now() - 86400000).toISOString() },
  ])
})

test('renders skill name and tier', async () => {
  render(<SkillDetailPage />, { wrapper })
  await screen.findByText('Running')
  expect(screen.getByText(/novice/i)).toBeInTheDocument()
  expect(screen.getByText(/level 3/i)).toBeInTheDocument()
})

test('shows Log XP button', async () => {
  render(<SkillDetailPage />, { wrapper })
  await screen.findByRole('button', { name: /log xp/i })
})

test('shows XP History section header', async () => {
  render(<SkillDetailPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('XP History')).toBeInTheDocument()
  })
})

test('shows date-grouped activity with Today header', async () => {
  render(<SkillDetailPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Today')).toBeInTheDocument()
  })
  expect(screen.getByText('Morning run')).toBeInTheDocument()
  expect(screen.getByText('Yesterday')).toBeInTheDocument()
})
