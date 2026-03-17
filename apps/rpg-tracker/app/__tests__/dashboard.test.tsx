import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DashboardPage from '../(app)/dashboard/page'

describe('Dashboard page', () => {
  it('renders the dashboard heading', () => {
    render(<DashboardPage />)
    expect(screen.getByRole('heading', { name: /lifequest dashboard/i })).toBeInTheDocument()
  })
})
