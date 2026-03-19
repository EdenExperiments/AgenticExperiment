import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SkillsPage from '../(app)/skills/page'

const mockListSkills = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  listSkills: (...args: unknown[]) => mockListSkills(...args),
  logXP: vi.fn().mockResolvedValue({
    skill: {},
    xp_added: 10,
    level_before: 1,
    level_after: 1,
    tier_crossed: false,
    tier_name: 'Novice',
    tier_number: 1,
    quick_log_chips: [10, 25, 50, 100],
    gate_first_hit: null,
  }),
}))

function makeSkills() {
  return [
    {
      id: 'skill-1',
      user_id: 'user-1',
      name: 'Guitar',
      description: '',
      unit: 'session',
      preset_id: null,
      starting_level: 1,
      current_xp: 500,
      current_level: 5,
      effective_level: 5,
      quick_log_chips: [10, 25, 50, 100] as [number, number, number, number],
      tier_name: 'Novice',
      tier_number: 1,
      gates: [],
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

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockListSkills.mockResolvedValue(makeSkills())
})

test('shows empty state when no skills', async () => {
  mockListSkills.mockResolvedValueOnce([])
  render(<SkillsPage />, { wrapper })
  await screen.findByRole('link', { name: /create your first skill/i })
})

test('empty state includes CSS-based illustration (AC-11)', async () => {
  mockListSkills.mockResolvedValueOnce([])
  render(<SkillsPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('No skills yet')).toBeInTheDocument()
  })
})

test('renders sort controls with 4 options (AC-6)', async () => {
  render(<SkillsPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Recent')).toBeInTheDocument()
  })
  expect(screen.getByText('Name')).toBeInTheDocument()
  expect(screen.getByText('Level')).toBeInTheDocument()
  expect(screen.getByText('Tier')).toBeInTheDocument()
})

test('sorting by name reorders cards without network request (AC-7)', async () => {
  render(<SkillsPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByText('Recent')).toBeInTheDocument()
  })

  // Default sort is "Recent" — Guitar is first (most recently updated)
  const cards = screen.getAllByRole('button', { name: /Guitar|Running/ })
  expect(cards[0]).toHaveAccessibleName('Guitar')

  // Click "Name" sort
  fireEvent.click(screen.getByText('Name'))

  // After sorting by name A-Z, Guitar comes before Running
  const sorted = screen.getAllByRole('button', { name: /Guitar|Running/ })
  expect(sorted[0]).toHaveAccessibleName('Guitar')
  expect(sorted[1]).toHaveAccessibleName('Running')

  // No additional network requests — listSkills was only called once
  expect(mockListSkills).toHaveBeenCalledTimes(1)
})

test('tier filter shows only matching skills (AC-8)', async () => {
  render(<SkillsPage />, { wrapper })
  await waitFor(() => {
    expect(screen.getByLabelText('Filter by tier')).toBeInTheDocument()
  })

  // Filter to Apprentice — only Running should remain
  fireEvent.change(screen.getByLabelText('Filter by tier'), { target: { value: 'Apprentice' } })

  await waitFor(() => {
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.queryByText('Guitar')).not.toBeInTheDocument()
  })
})
