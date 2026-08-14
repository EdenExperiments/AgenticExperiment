import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WorkoutTodayPage from '../(app)/workout/page'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/workout',
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}))

const mockGetCurrentWorkout = vi.fn()
const mockStartWorkout = vi.fn()
const mockListWorkoutHistory = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  getCurrentWorkout: (...args: unknown[]) => mockGetCurrentWorkout(...args),
  startWorkout: (...args: unknown[]) => mockStartWorkout(...args),
  listWorkoutHistory: (...args: unknown[]) => mockListWorkoutHistory(...args),
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
  mockListWorkoutHistory.mockResolvedValue([])
})

test('starts a workout session', async () => {
  mockGetCurrentWorkout.mockResolvedValue(null)
  mockStartWorkout.mockResolvedValue({
    id: 's1',
    title: 'Lower body',
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    sets: [],
    set_count: 0,
    rep_count: 0,
    volume_kg: 0,
  })
  render(<WorkoutTodayPage />, { wrapper })
  fireEvent.change(await screen.findByPlaceholderText(/lower body/i), { target: { value: 'Lower body' } })
  fireEvent.click(screen.getByRole('button', { name: /start session/i }))
  await waitFor(() => expect(mockStartWorkout).toHaveBeenCalled())
  expect(mockPush).toHaveBeenCalledWith('/workout/session/s1')
})

test('shows the last finished session', async () => {
  mockGetCurrentWorkout.mockResolvedValue(null)
  mockListWorkoutHistory.mockResolvedValue([
    {
      id: 's0',
      title: 'Push',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      sets: [],
      set_count: 4,
      rep_count: 20,
      volume_kg: 240,
    },
  ])
  render(<WorkoutTodayPage />, { wrapper })
  expect(await screen.findByText('Last finished')).toBeInTheDocument()
  expect(screen.getByText('Push')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /history/i })).toHaveAttribute('href', '/workout/history')
})
