import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const mockRedirect = vi.fn()
const mockGetSession = vi.fn()

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}))

vi.mock('@rpgtracker/auth/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getSession: mockGetSession },
  })),
}))

import RootPage from '../page'

describe('auth guard (AC-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('proxy.ts wires createAuthMiddleware with nutri-saas theme', () => {
    const source = readFileSync(resolve(__dirname, '../../proxy.ts'), 'utf-8')
    expect(source).toContain('createAuthMiddleware')
    expect(source).toContain("defaultTheme: 'nutri-saas'")
  })

  it('root page redirects unauthenticated users to /login', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    await RootPage()
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('root page redirects authenticated users to /dashboard', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token' } } })
    await RootPage()
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard')
  })
})
