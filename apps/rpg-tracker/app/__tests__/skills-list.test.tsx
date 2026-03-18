import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SkillsPage from '../(app)/skills/page'

// vi.mock is hoisted by Vitest's AST transform — do NOT use jest.mock here
vi.mock('@rpgtracker/api-client', () => ({
  listSkills: vi.fn().mockResolvedValue([]),
}))

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

test('shows empty state when no skills', async () => {
  render(<SkillsPage />, { wrapper })
  // After loading, should show empty state CTA
  await screen.findByRole('link', { name: /create your first skill/i })
})
