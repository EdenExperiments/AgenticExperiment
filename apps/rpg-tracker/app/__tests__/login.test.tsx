import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LoginPage from '../(auth)/login/page'

describe('Login page', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('renders link to register page', () => {
    render(<LoginPage />)
    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/register')
  })
})
