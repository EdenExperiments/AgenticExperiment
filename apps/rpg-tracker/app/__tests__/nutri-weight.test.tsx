import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NutriTodayPage from '../(app)/nutri/page'
import NutriWeightPage from '../(app)/nutri/weight/page'

vi.mock('next/navigation', () => ({
  usePathname: () => '/nutri',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const mockListWeightLogs = vi.fn()
const mockGetWeightChart = vi.fn()
const mockCreateWeightLog = vi.fn()
const mockDeleteWeightLog = vi.fn()
const mockGetCurrentFast = vi.fn()
const mockListPantry = vi.fn()
const mockListDiary = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  listWeightLogs: (...args: unknown[]) => mockListWeightLogs(...args),
  getWeightChart: (...args: unknown[]) => mockGetWeightChart(...args),
  createWeightLog: (...args: unknown[]) => mockCreateWeightLog(...args),
  deleteWeightLog: (...args: unknown[]) => mockDeleteWeightLog(...args),
  getCurrentFast: (...args: unknown[]) => mockGetCurrentFast(...args),
  listPantry: (...args: unknown[]) => mockListPantry(...args),
  listDiary: (...args: unknown[]) => mockListDiary(...args),
}))

const existingLog = {
  id: 'wl-1',
  weight_kg: 72.5,
  note: 'Morning',
  measured_at: '2026-06-12T08:00:00Z',
  created_at: '2026-06-12T08:00:01Z',
}

const chartResponse = {
  days: 30,
  unit: 'kg' as const,
  data: [
    { date: '2026-05-14', weight_kg: null },
    { date: '2026-06-12', weight_kg: 72.5 },
  ],
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
  mockListWeightLogs.mockResolvedValue([existingLog])
  mockGetWeightChart.mockResolvedValue(chartResponse)
  mockGetCurrentFast.mockResolvedValue(null)
  mockListPantry.mockResolvedValue([])
  mockListDiary.mockResolvedValue([])
  mockCreateWeightLog.mockResolvedValue({
    id: 'wl-2',
    weight_kg: 71.0,
    note: '',
    measured_at: '2026-06-13T08:00:00Z',
    created_at: '2026-06-13T08:00:01Z',
  })
  mockDeleteWeightLog.mockResolvedValue(undefined)
})

describe('NutriLog today', () => {
  it('renders today heading and weight tracking', async () => {
    render(<NutriTodayPage />, { wrapper })
    expect(await screen.findByRole('heading', { name: /today/i })).toBeInTheDocument()
    expect(await screen.findByTestId('weight-log-row')).toHaveTextContent('72.5 kg')
  })

  it('shows live fast and pantry receipts', async () => {
    mockGetCurrentFast.mockResolvedValue({
      id: 'f1',
      started_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      target_hours: 16,
      created_at: new Date().toISOString(),
    })
    mockListPantry.mockResolvedValue([{ id: 'p1', name: 'Eggs', amount_text: '6', created_at: '' }])
    mockListDiary.mockResolvedValue([
      { id: 'd1', eaten_at: '', source: 'cook', title: 'Omelette', servings: 1, created_at: '' },
    ])
    render(<NutriTodayPage />, { wrapper })
    expect(await screen.findByText('1h 30m')).toBeInTheDocument()
    expect(screen.getByText('1 item')).toBeInTheDocument()
    expect(screen.getByText('Omelette')).toBeInTheDocument()
  })
})

describe('NutriLog weight page', () => {
  it('renders weight tracking heading', async () => {
    render(<NutriWeightPage />, { wrapper })
    expect(await screen.findByRole('heading', { name: /weight tracking/i })).toBeInTheDocument()
  })

  it('adds a new entry after form submit', async () => {
    mockListWeightLogs
      .mockResolvedValueOnce([existingLog])
      .mockResolvedValueOnce([
        existingLog,
        {
          id: 'wl-2',
          weight_kg: 71.0,
          note: '',
          measured_at: '2026-06-13T08:00:00Z',
          created_at: '2026-06-13T08:00:01Z',
        },
      ])

    render(<NutriWeightPage />, { wrapper })
    await screen.findByTestId('weight-log-row')

    fireEvent.change(screen.getByLabelText(/weight \(kg\)/i), { target: { value: '71' } })
    fireEvent.click(screen.getByRole('button', { name: /log weight/i }))

    await waitFor(() => {
      expect(mockCreateWeightLog).toHaveBeenCalledWith({ weight_kg: 71, note: undefined })
    })
  })

  it('shows validation error for non-positive weight', async () => {
    render(<NutriWeightPage />, { wrapper })
    await screen.findByTestId('weight-log-row')

    fireEvent.change(screen.getByLabelText(/weight \(kg\)/i), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /log weight/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/positive weight/i)
    expect(mockCreateWeightLog).not.toHaveBeenCalled()
  })
})
