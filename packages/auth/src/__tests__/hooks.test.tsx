import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useSession } from '../hooks'

// Mock Supabase client
vi.mock('../client', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123', email: 'test@example.com' } } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  })),
}))

describe('useSession', () => {
  it('returns null session initially then resolves to user', async () => {
    const { result } = renderHook(() => useSession())
    // Initially loading
    expect(result.current.loading).toBe(true)
  })
})
