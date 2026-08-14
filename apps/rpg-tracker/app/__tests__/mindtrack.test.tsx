import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MindCheckInPage from '../(app)/mind/page'
import MindJournalPage from '../(app)/mind/journal/page'

vi.mock('next/navigation', () => ({
  usePathname: () => '/mind',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const mockListMoodLogs = vi.fn()
const mockCreateMoodLog = vi.fn()
const mockListJournalEntries = vi.fn()
const mockCreateJournalEntry = vi.fn()
const mockDeleteJournalEntry = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  listMoodLogs: (...args: unknown[]) => mockListMoodLogs(...args),
  createMoodLog: (...args: unknown[]) => mockCreateMoodLog(...args),
  listJournalEntries: (...args: unknown[]) => mockListJournalEntries(...args),
  createJournalEntry: (...args: unknown[]) => mockCreateJournalEntry(...args),
  deleteJournalEntry: (...args: unknown[]) => mockDeleteJournalEntry(...args),
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
  window.localStorage.clear()
  mockListMoodLogs.mockResolvedValue([])
  mockListJournalEntries.mockResolvedValue([])
})

test('requires 18+ acknowledgement before check-in', async () => {
  render(<MindCheckInPage />, { wrapper })
  expect(await screen.findByRole('button', { name: /i am 18 or over/i })).toBeInTheDocument()
  expect(mockListMoodLogs).not.toHaveBeenCalled()
})

test('saves a mood check-in after acknowledgement', async () => {
  window.localStorage.setItem('mh-ack-uk-v1', '1')
  mockCreateMoodLog.mockResolvedValue({
    id: 'm1',
    logged_at: new Date().toISOString(),
    valence: 3,
    energy: 2,
    note: '',
    created_at: new Date().toISOString(),
  })
  render(<MindCheckInPage />, { wrapper })
  fireEvent.click(await screen.findByRole('button', { name: /save check-in/i }))
  await waitFor(() => expect(mockCreateMoodLog).toHaveBeenCalled())
})

test('saves a journal page', async () => {
  mockCreateJournalEntry.mockResolvedValue({
    id: 'j1',
    body: 'quiet morning',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  render(<MindJournalPage />, { wrapper })
  fireEvent.change(await screen.findByPlaceholderText(/write a page/i), { target: { value: 'quiet morning' } })
  fireEvent.click(screen.getByRole('button', { name: /save page/i }))
  await waitFor(() => expect(mockCreateJournalEntry).toHaveBeenCalledWith('quiet morning'))
})
