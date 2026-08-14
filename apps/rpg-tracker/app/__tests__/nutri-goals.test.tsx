import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiRequestError } from '@rpgtracker/api-client'
import NutriGoalsPage from '../(app)/nutri/goals/page'

vi.mock('next/navigation', () => ({
  usePathname: () => '/nutri/goals',
}))

const mockGet = vi.fn()
const mockPut = vi.fn()

vi.mock('@rpgtracker/api-client', async () => {
  const actual = await vi.importActual<typeof import('@rpgtracker/api-client')>('@rpgtracker/api-client')
  return {
    ...actual,
    getNutriGoals: (...args: unknown[]) => mockGet(...args),
    upsertNutriGoals: (...args: unknown[]) => mockPut(...args),
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
  mockGet.mockRejectedValue(new ApiRequestError('goals not found', 404))
  mockPut.mockResolvedValue({
    user_id: 'u1',
    calorie_goal: 2200,
    protein_g: 140,
    carbs_g: null,
    fat_g: null,
    target_weight_kg: null,
    updated_at: '2026-08-14T00:00:00Z',
  })
})

test('saves a calorie goal on nl_* via upsertNutriGoals', async () => {
  render(<NutriGoalsPage />, { wrapper })
  expect(await screen.findByRole('heading', { name: /daily goals/i })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText(/daily calories/i), { target: { value: '2200' } })
  fireEvent.change(screen.getByLabelText(/protein grams/i), { target: { value: '140' } })
  fireEvent.click(screen.getByRole('button', { name: /save goals/i }))
  await waitFor(() => {
    expect(mockPut).toHaveBeenCalledWith({ calorie_goal: 2200, protein_g: 140 })
  })
})
