import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiRequestError } from '@rpgtracker/api-client'
import NutriDiaryPage from '../(app)/nutri/diary/page'

vi.mock('next/navigation', () => ({
  usePathname: () => '/nutri/diary',
}))

const mockSearch = vi.fn()
const mockLog = vi.fn()
const mockList = vi.fn()
const mockRemaining = vi.fn()
const mockCreate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@rpgtracker/api-client', async () => {
  const actual = await vi.importActual<typeof import('@rpgtracker/api-client')>('@rpgtracker/api-client')
  return {
    ...actual,
    searchNutriFoods: (...args: unknown[]) => mockSearch(...args),
    logNutriDiary: (...args: unknown[]) => mockLog(...args),
    listNutriDiary: (...args: unknown[]) => mockList(...args),
    getNutriRemaining: (...args: unknown[]) => mockRemaining(...args),
    createNutriFood: (...args: unknown[]) => mockCreate(...args),
    deleteNutriDiary: (...args: unknown[]) => mockDelete(...args),
  }
})

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
  mockRemaining.mockResolvedValue({
    date: '2026-08-14',
    calorie_goal: 2000,
    calories_eaten: 300,
    calories_remaining: 1700,
    protein_g: null,
    protein_eaten: 0,
    carbs_g: null,
    carbs_eaten: 0,
    fat_g: null,
    fat_eaten: 0,
  })
  mockSearch.mockResolvedValue({
    source: 'off',
    foods: [{ name: 'Oats', calories: 100, protein_g: 4, carbs_g: 18, fat_g: 2, serving_label: '100 g', off_id: '123' }],
  })
  mockLog.mockResolvedValue({ id: 'd1', name: 'Oats', calories: 100, protein_g: 4, carbs_g: 18, fat_g: 2, serving_qty: 1, eaten_at: '2026-08-14T00:00:00Z' })
})

test('shows remaining today and logs a searched food snapshot', async () => {
  render(<NutriDiaryPage />, { wrapper })
  expect(await screen.findByText(/1700 kcal remaining of 2000/i)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText(/search foods/i), { target: { value: 'oats' } })
  fireEvent.click(screen.getByRole('button', { name: /search/i }))
  await screen.findByText(/Oats/)
  fireEvent.click(screen.getByRole('button', { name: 'Log' }))
  await waitFor(() => {
    expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Oats',
      calories: 100,
      serving_qty: 1,
      off_id: '123',
    }))
  })
})

test('remaining CTA when goals are missing', async () => {
  mockRemaining.mockRejectedValue(new ApiRequestError('goals not found', 404))
  render(<NutriDiaryPage />, { wrapper })
  expect(await screen.findByText(/set a calorie goal/i)).toBeInTheDocument()
})
