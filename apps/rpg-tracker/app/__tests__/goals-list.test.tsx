import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GoalsPage from '../(app)/goals/page'

const mockListGoals = vi.fn()
const mockDeleteGoal = vi.fn()
const mockGetAIEntitlement = vi.fn()
const mockPush = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  listGoals: (...args: unknown[]) => mockListGoals(...args),
  deleteGoal: (...args: unknown[]) => mockDeleteGoal(...args),
  getAIEntitlement: (...args: unknown[]) => mockGetAIEntitlement(...args),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

function makeGoal(overrides = {}) {
  return {
    id: 'goal-1',
    user_id: 'user-1',
    skill_id: null,
    title: 'Run 100km',
    description: 'Run a total of 100km this year',
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

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAIEntitlement.mockResolvedValue({ entitled: true, reason: 'api_key_set' })
  mockListGoals.mockResolvedValue([makeGoal()])
  mockDeleteGoal.mockResolvedValue(undefined)
})

test('shows loading state initially', () => {
  mockListGoals.mockImplementation(() => new Promise(() => {}))
  render(<GoalsPage />, { wrapper })
  expect(screen.getByText('Loading...')).toBeInTheDocument()
})

test('renders goal list when goals exist', async () => {
  render(<GoalsPage />, { wrapper })
  await screen.findByText('Run 100km')
  expect(screen.getByTestId('goals-list')).toBeInTheDocument()
})

test('shows empty state when no goals', async () => {
  mockListGoals.mockResolvedValue([])
  render(<GoalsPage />, { wrapper })
  await screen.findByText('No goals yet')
  expect(screen.getByRole('link', { name: /create your first goal/i })).toBeInTheDocument()
})

test('shows error state when fetch fails', async () => {
  mockListGoals.mockRejectedValue(new Error('network error'))
  render(<GoalsPage />, { wrapper })
  await screen.findByText(/failed to load goals/i)
})

test('navigates to goal detail on card click', async () => {
  render(<GoalsPage />, { wrapper })
  await screen.findByText('Run 100km')
  fireEvent.click(screen.getByRole('article', { name: 'Run 100km' }))
  expect(mockPush).toHaveBeenCalledWith('/goals/goal-1')
})

test('renders status filter tabs', async () => {
  render(<GoalsPage />, { wrapper })
  await screen.findByText('Run 100km')
  expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Completed' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Abandoned' })).toBeInTheDocument()
})

test('filters goals by status — switching tabs fetches with status param', async () => {
  mockListGoals.mockResolvedValue([])
  render(<GoalsPage />, { wrapper })
  await screen.findByText('No goals yet')

  fireEvent.click(screen.getByRole('tab', { name: 'Active' }))

  await waitFor(() => {
    expect(mockListGoals).toHaveBeenCalledWith({ status: 'active' })
  })
})

test('opens delete confirmation modal when Delete is clicked', async () => {
  render(<GoalsPage />, { wrapper })
  await screen.findByText('Run 100km')

  fireEvent.click(screen.getByRole('button', { name: /delete run 100km/i }))

  expect(screen.getByRole('dialog', { name: /delete goal/i })).toBeInTheDocument()
  expect(screen.getByText(/permanently removed/i)).toBeInTheDocument()
})

test('cancels delete when Cancel button clicked in modal', async () => {
  render(<GoalsPage />, { wrapper })
  await screen.findByText('Run 100km')

  fireEvent.click(screen.getByRole('button', { name: /delete run 100km/i }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('calls deleteGoal and dismisses modal on confirm', async () => {
  render(<GoalsPage />, { wrapper })
  await screen.findByText('Run 100km')

  fireEvent.click(screen.getByRole('button', { name: /delete run 100km/i }))
  fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))

  await waitFor(() => {
    expect(mockDeleteGoal).toHaveBeenCalledWith('goal-1')
  })
})

test('shows error message in delete modal when delete fails', async () => {
  mockDeleteGoal.mockRejectedValue(new Error('server error'))
  render(<GoalsPage />, { wrapper })
  await screen.findByText('Run 100km')

  fireEvent.click(screen.getByRole('button', { name: /delete run 100km/i }))
  fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))

  await screen.findByText(/failed to delete/i)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

test('renders progress bar when goal has numeric tracking', async () => {
  render(<GoalsPage />, { wrapper })
  await screen.findByText('Run 100km')
  expect(screen.getByRole('progressbar', { name: /run 100km progress/i })).toBeInTheDocument()
})

test('shows "No active goals" empty state for active filter with no results', async () => {
  mockListGoals.mockResolvedValue([])
  render(<GoalsPage />, { wrapper })
  await screen.findByText('No goals yet')

  fireEvent.click(screen.getByRole('tab', { name: 'Active' }))
  await screen.findByText('No active goals')
})

test('Active tab is marked aria-selected when active filter chosen', async () => {
  render(<GoalsPage />, { wrapper })
  await screen.findByText('Run 100km')

  fireEvent.click(screen.getByRole('tab', { name: 'Active' }))

  // Re-query after re-render since loading state can unmount/remount tabs
  await waitFor(() => {
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute('aria-selected', 'true')
  })
})
