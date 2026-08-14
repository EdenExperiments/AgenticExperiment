import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WorkoutSessionPage from '../(app)/workout/session/page'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => '/workout/session',
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams('id=s1'),
}))

const mockGet = vi.fn()
const mockAddEx = vi.fn()
const mockAddSet = vi.fn()
const mockFinish = vi.fn()
const mockAbandon = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  getWorkoutSession: (...args: unknown[]) => mockGet(...args),
  addWorkoutExercise: (...args: unknown[]) => mockAddEx(...args),
  addWorkoutSet: (...args: unknown[]) => mockAddSet(...args),
  finishWorkoutSession: (...args: unknown[]) => mockFinish(...args),
  abandonWorkoutSession: (...args: unknown[]) => mockAbandon(...args),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue({
    id: 's1',
    status: 'in_progress',
    volume_kg: 0,
    started_at: '2026-08-14T00:00:00Z',
    ended_at: null,
    created_at: '2026-08-14T00:00:00Z',
    exercises: [],
  })
})

test('adds a named exercise to the open session', async () => {
  mockAddEx.mockResolvedValue({ id: 'ex1', session_id: 's1', name: 'Squat', position: 0, sets: [] })
  render(<WorkoutSessionPage />, { wrapper })
  await screen.findByRole('heading', { name: 'Session' })
  fireEvent.change(screen.getByLabelText(/exercise name/i), { target: { value: 'Squat' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  await waitFor(() => {
    expect(mockAddEx).toHaveBeenCalledWith('s1', 'Squat')
  })
})
