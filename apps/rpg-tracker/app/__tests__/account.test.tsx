import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AccountPage from '../(app)/account/page'

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  )
}

// AccountPage must not have server-only imports (it uses 'use client')
test('renders account heading', () => {
  render(<AccountPage />, { wrapper })
  expect(screen.getByRole('heading', { name: /account/i })).toBeInTheDocument()
})
