import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NutriFastPage from '../(app)/nutri/fast/page'
import NutriCookPage from '../(app)/nutri/cook/page'

vi.mock('next/navigation', () => ({
  usePathname: () => '/nutri/fast',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

const mockGetCurrentFast = vi.fn()
const mockListFasts = vi.fn()
const mockStartFast = vi.fn()
const mockCloseFast = vi.fn()
const mockListPantry = vi.fn()
const mockAddPantryItem = vi.fn()
const mockDeletePantryItem = vi.fn()
const mockListRecipes = vi.fn()
const mockCreateRecipe = vi.fn()
const mockListDiary = vi.fn()
const mockCookRecipe = vi.fn()

vi.mock('@rpgtracker/api-client', () => ({
  ApiRequestError: class ApiRequestError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  },
  getCurrentFast: (...args: unknown[]) => mockGetCurrentFast(...args),
  listFasts: (...args: unknown[]) => mockListFasts(...args),
  startFast: (...args: unknown[]) => mockStartFast(...args),
  closeFast: (...args: unknown[]) => mockCloseFast(...args),
  listPantry: (...args: unknown[]) => mockListPantry(...args),
  addPantryItem: (...args: unknown[]) => mockAddPantryItem(...args),
  deletePantryItem: (...args: unknown[]) => mockDeletePantryItem(...args),
  listRecipes: (...args: unknown[]) => mockListRecipes(...args),
  createRecipe: (...args: unknown[]) => mockCreateRecipe(...args),
  listDiary: (...args: unknown[]) => mockListDiary(...args),
  cookRecipe: (...args: unknown[]) => mockCookRecipe(...args),
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
  mockGetCurrentFast.mockResolvedValue(null)
  mockListFasts.mockResolvedValue([])
  mockListPantry.mockResolvedValue([])
  mockListRecipes.mockResolvedValue([])
  mockListDiary.mockResolvedValue([])
})

test('fasting page can start a fast', async () => {
  mockStartFast.mockResolvedValue({
    id: 'f1',
    started_at: new Date().toISOString(),
    target_hours: 16,
    created_at: new Date().toISOString(),
  })
  mockGetCurrentFast
    .mockResolvedValueOnce(null)
    .mockResolvedValue({
      id: 'f1',
      started_at: new Date().toISOString(),
      target_hours: 16,
      created_at: new Date().toISOString(),
    })
  render(<NutriFastPage />, { wrapper })
  fireEvent.click(await screen.findByRole('button', { name: /start fast/i }))
  await waitFor(() => expect(mockStartFast).toHaveBeenCalled())
})

test('open fast shows progress toward the target', async () => {
  mockGetCurrentFast.mockResolvedValue({
    id: 'f1',
    started_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    target_hours: 16,
    created_at: new Date().toISOString(),
  })
  render(<NutriFastPage />, { wrapper })
  const bar = await screen.findByRole('progressbar', { name: /fast progress toward target/i })
  expect(bar).toHaveAttribute('aria-valuenow', '50')
})

test('cook page lists pantry empty state', async () => {
  render(<NutriCookPage />, { wrapper })
  expect(await screen.findByText(/pantry is empty/i)).toBeInTheDocument()
})
