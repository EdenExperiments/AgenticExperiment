import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the client module
const mockSignInWithOAuth = vi.fn()
vi.mock('../client', () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}))

import { signInWithProvider } from '../social'

describe('signInWithProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://auth.example.com' }, error: null })
  })

  it('calls supabase.auth.signInWithOAuth with provider google', async () => {
    await signInWithProvider('google')
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' })
    )
  })

  it('calls supabase.auth.signInWithOAuth with provider github', async () => {
    await signInWithProvider('github')
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'github' })
    )
  })

  it('calls supabase.auth.signInWithOAuth with provider apple', async () => {
    await signInWithProvider('apple')
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'apple' })
    )
  })

  it('uses NEXT_PUBLIC_APP_URL for redirect when available', async () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.rpgtracker.com'

    await signInWithProvider('google')

    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: 'https://app.rpgtracker.com/dashboard',
        }),
      })
    )

    process.env.NEXT_PUBLIC_APP_URL = originalEnv
  })

  it('falls back to localhost when NEXT_PUBLIC_APP_URL is not set', async () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_APP_URL

    await signInWithProvider('github')

    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: 'http://localhost:3000/dashboard',
        }),
      })
    )

    process.env.NEXT_PUBLIC_APP_URL = originalEnv
  })

  it('returns error from Supabase OAuth response', async () => {
    const authError = { message: 'Provider not configured', status: 400 }
    mockSignInWithOAuth.mockResolvedValue({ data: { url: null }, error: authError })

    const result = await signInWithProvider('apple')

    expect(result.error).toEqual(authError)
  })

  it('allows custom redirectTo override', async () => {
    await signInWithProvider('google', { redirectTo: 'https://custom.example.com/callback' })

    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: 'https://custom.example.com/callback',
        }),
      })
    )
  })
})
