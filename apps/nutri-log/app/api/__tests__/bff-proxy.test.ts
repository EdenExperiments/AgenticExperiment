import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetSession = vi.fn()
vi.mock('@rpgtracker/auth/server', () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getSession: mockGetSession,
      },
    })
  ),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(body: string, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'application/json' } })
}

describe('NutriLog BFF proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-jwt-token' } },
    })
    mockFetch.mockResolvedValue(
      jsonResponse(JSON.stringify([{ id: 'wl-1', weight_kg: 72.5 }]))
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('GET /api/v1/nutrilog/weight-logs proxies to Go API (no double v1)', async () => {
    const { GET } = await import('../[...path]/route')

    const request = {
      method: 'GET',
      headers: { get: (name: string) => (name === 'Content-Type' ? 'application/json' : null) },
      nextUrl: { search: '' },
    } as any

    const params = Promise.resolve({ path: ['v1', 'nutrilog', 'weight-logs'] })
    const response = await GET(request, { params })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toBe('http://localhost:8080/api/v1/nutrilog/weight-logs')
    expect(calledUrl).not.toContain('v1/v1')
    expect(response.status).toBe(200)
  })
})
