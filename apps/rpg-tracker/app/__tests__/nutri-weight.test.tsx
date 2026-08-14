import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NutriPage from '../(app)/nutri/page'

vi.mock('next/navigation', () => ({
  usePathname: () => '/nutri',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const mockListWeightLogs = vi.fn()
const mockGetWeightChart = vi.fn()
const mockCreateWeightLog = vi.fn()
const mockDeleteWeightLog = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  listWeightLogs: (...args: unknown[]) => mockListWeightLogs(...args),
  getWeightChart: (...args: unknown[]) => mockGetWeightChart(...args),
  createWeightLog: (...args: unknown[]) => mockCreateWeightLog(...args),
  deleteWeightLog: (...args: unknown[]) => mockDeleteWeightLog(...args),
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
  mockCreateWeightLog.mockResolvedValue({
    id: 'wl-2',
    weight_kg: 71.0,
    note: '',
    measured_at: '2026-06-13T08:00:00Z',
    created_at: '2026-06-13T08:00:01Z',
  })
  mockDeleteWeightLog.mockResolvedValue(undefined)
})

describe('/nutri weight page', () => {
  it('renders weight tracking heading', async () => {
    render(<NutriPage />, { wrapper })
    expect(await screen.findByRole('heading', { name: /weight tracking/i })).toBeInTheDocument()
  })

  it('renders recent weight entries from listWeightLogs', async () => {
    render(<NutriPage />, { wrapper })
    const row = await screen.findByTestId('weight-log-row')
    expect(row).toHaveTextContent('72.5 kg')
    expect(row).toHaveTextContent('Morning')
  })

  it('renders trend chart from getWeightChart response', async () => {
    render(<NutriPage />, { wrapper })
    expect(await screen.findByTestId('weight-chart')).toBeInTheDocument()
    expect(screen.getByTestId('weight-chart-line')).toBeInTheDocument()
    expect(mockGetWeightChart).toHaveBeenCalledWith(30)
  })

  it('adds a new entry after form submit', async () => {
    mockListWeightLogs
      .mockResolvedValueOnce([existingLog])
      .mockResolvedValueOnce([existingLog, {
        id: 'wl-2',
        weight_kg: 71.0,
        note: '',
        measured_at: '2026-06-13T08:00:00Z',
        created_at: '2026-06-13T08:00:01Z',
      }])

    render(<NutriPage />, { wrapper })
    await screen.findByTestId('weight-log-row')

    fireEvent.change(screen.getByLabelText(/weight \(kg\)/i), { target: { value: '71' } })
    fireEvent.click(screen.getByRole('button', { name: /log weight/i }))

    await waitFor(() => {
      expect(mockCreateWeightLog).toHaveBeenCalledWith({ weight_kg: 71, note: undefined })
    })

    await waitFor(() => {
      const rows = screen.getAllByTestId('weight-log-row')
      expect(rows.some((row) => row.textContent?.includes('71 kg'))).toBe(true)
    })
  })

  it('shows validation error for non-positive weight', async () => {
    render(<NutriPage />, { wrapper })
    await screen.findByTestId('weight-log-row')

    fireEvent.change(screen.getByLabelText(/weight \(kg\)/i), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /log weight/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/positive weight/i)
    expect(mockCreateWeightLog).not.toHaveBeenCalled()
  })

  it('calls deleteWeightLog when delete is clicked', async () => {
    render(<NutriPage />, { wrapper })
    await screen.findByTestId('weight-log-row')

    fireEvent.click(screen.getByRole('button', { name: /delete entry/i }))

    await waitFor(() => {
      expect(mockDeleteWeightLog).toHaveBeenCalledWith('wl-1')
    })
  })
})
