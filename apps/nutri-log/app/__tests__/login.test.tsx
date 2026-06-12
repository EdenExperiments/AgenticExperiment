import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoginPage from '../(auth)/login/page'

vi.mock('@rpgtracker/auth/client', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}))

describe('Login page', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('renders NutriLog branding', () => {
    render(<LoginPage />)
    expect(screen.getByRole('heading', { name: /nutrilog/i })).toBeInTheDocument()
  })
})
