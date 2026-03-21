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

test('skill name uses font-display styling (AC-9)', async () => {
  render(<SkillDetailPage />, { wrapper })
  const heading = await screen.findByRole('heading', { name: 'Running' })
  expect(heading.style.fontFamily).toContain('var(--font-display')
})

test('shows XP History section header (AC-10)', async () => {
  render(<SkillDetailPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('XP History')).toBeInTheDocument()
  })
})

test('shows date-grouped activity with Today header (AC-10)', async () => {
  render(<SkillDetailPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Today')).toBeInTheDocument()
  })
  expect(screen.getByText('Morning run')).toBeInTheDocument()
  expect(screen.getByText('Yesterday')).toBeInTheDocument()
})

// ── T1b: Layout Tests (AC-05, AC-18) ──────────────────────────────────────────

test('AC-05: hero section exists at full width containing skill name and tier', async () => {
  const { container } = render(<SkillDetailPage />, { wrapper })
  await screen.findByText('Running')
  const heroSection = container.querySelector('[data-testid="hero-section"]')
  expect(heroSection).not.toBeNull()
  // Hero section contains the skill name
  expect(heroSection!.textContent).toContain('Running')
  // Hero section contains tier info
  expect(heroSection!.textContent?.toLowerCase()).toContain('novice')
})

test('AC-05: two-column detail grid exists below hero when XP chart data is present', async () => {
  mockGetXPChart.mockResolvedValue({
    data: [
      { date: '2026-03-21', xp: 100 },
      { date: '2026-03-20', xp: 50 },
    ],
  })
  const { container } = render(<SkillDetailPage />, { wrapper })
  await screen.findByText('Running')
  await waitFor(() => {
    const detailGrid = container.querySelector('[data-testid="detail-grid"]')
    expect(detailGrid).not.toBeNull()
    expect(detailGrid!.className).toMatch(/md:grid-cols-2/)
  })
})

test('AC-05: history section gets col-span-2 when no XP chart data (chart absent state)', async () => {
  // mockGetXPChart returns null (set in beforeEach — no chart data)
  const { container } = render(<SkillDetailPage />, { wrapper })
  await screen.findByText('XP History')
  // When chart is absent, the history/right-column section should span full width
  const historySection = container.querySelector('[data-testid="history-section"]')
  expect(historySection).not.toBeNull()
  expect(historySection!.className).toMatch(/md:col-span-2/)
})

test('AC-18: skill detail section headers reference var(--font-display)', async () => {
  const { container } = render(<SkillDetailPage />, { wrapper })
  await screen.findByText('XP History')
  const sectionHeaders = container.querySelectorAll('h2')
  expect(sectionHeaders.length).toBeGreaterThan(0)
  const atLeastOneUsesDisplayFont = Array.from(sectionHeaders).some(
    (h) => (h as HTMLElement).style.fontFamily.includes('var(--font-display')
  )
  expect(atLeastOneUsesDisplayFont).toBe(true)
})
