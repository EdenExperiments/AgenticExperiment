import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SkillDetailPage from '../(app)/skills/[id]/page'

vi.mock('@rpgtracker/api-client', () => ({
  getSkill: vi.fn().mockResolvedValue({
    id: 'skill-1', name: 'Running', description: 'Running practice', unit: 'km',
    user_id: 'u1', preset_id: null, starting_level: 1, current_xp: 500, current_level: 3,
    effective_level: 3, quick_log_chips: [50, 100, 250, 500],
    tier_name: 'Novice', tier_number: 1, gates: [], recent_logs: [],
    xp_to_next_level: 800, xp_for_current_level: 100, created_at: '', updated_at: '',
  }),
  logXP: vi.fn(),
  deleteSkill: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'skill-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
}

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
