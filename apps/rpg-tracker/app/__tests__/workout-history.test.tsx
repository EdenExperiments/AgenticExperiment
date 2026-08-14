import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import WorkoutHistoryPage from '../(app)/workout/page'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => '/workout',
  useRouter: () => ({ push: mockPush }),
}))

const mockList = vi.fn()
const mockChart = vi.fn()
const mockStart = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  listWorkoutSessions: (...args: unknown[]) => mockList(...args),
  getWorkoutVolumeChart: (...args: unknown[]) => mockChart(...args),
  startWorkoutSession: (...args: unknown[]) => mockStart(...args),
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
  mockList.mockResolvedValue([])
  mockChart.mockResolvedValue({
    days: 30,
    data: [{ date: '2026-08-01', volume_kg: null }],
  })
  mockStart.mockResolvedValue({ id: 's-new', status: 'in_progress', volume_kg: 0, started_at: '2026-08-14T00:00:00Z', ended_at: null, created_at: '2026-08-14T00:00:00Z' })
})

test('renders Workout heading, chart, and start control', async () => {
  render(<WorkoutHistoryPage />, { wrapper })
  expect(await screen.findByRole('heading', { name: 'Workout' })).toBeInTheDocument()
  expect(await screen.findByTestId('workout-volume-chart')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /start session/i }))
  await waitFor(() => {
    expect(mockStart).toHaveBeenCalled()
  })
})

test('lists history newest-first rows', async () => {
  mockList.mockResolvedValue([
    { id: 's2', status: 'completed', volume_kg: 400, started_at: '2026-08-14T12:00:00Z', ended_at: '2026-08-14T13:00:00Z', created_at: '2026-08-14T12:00:00Z' },
    { id: 's1', status: 'abandoned', volume_kg: 0, started_at: '2026-08-13T12:00:00Z', ended_at: '2026-08-13T12:10:00Z', created_at: '2026-08-13T12:00:00Z' },
  ])
  render(<WorkoutHistoryPage />, { wrapper })
  const rows = await screen.findAllByTestId('workout-session-row')
  expect(rows[0]).toHaveTextContent(/completed/i)
  expect(rows[1]).toHaveTextContent(/abandoned/i)
})
