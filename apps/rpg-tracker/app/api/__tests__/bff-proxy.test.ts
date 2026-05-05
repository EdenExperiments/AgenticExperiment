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

describe('BFF proxy route handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-jwt-token' } },
    })
    mockFetch.mockResolvedValue(
      jsonResponse(JSON.stringify([{ id: '1', name: 'Test Skill' }]))
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('GET /api/v1/skills proxies to Go API (no double v1)', async () => {
    const { GET } = await import('../[...path]/route')

    const request = {
      method: 'GET',
      headers: { get: (name: string) => (name === 'Content-Type' ? 'application/json' : null) },
      nextUrl: { search: '' },
    } as any

    const params = Promise.resolve({ path: ['v1', 'skills'] })
    const response = await GET(request, { params })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toBe('http://localhost:8080/api/v1/skills')
    expect(calledUrl).not.toContain('v1/v1')
    expect(response.status).toBe(200)
  })

  it('POST forwards body and Content-Type', async () => {
    const { POST } = await import('../[...path]/route')

    mockFetch.mockResolvedValue(
      jsonResponse(JSON.stringify({ id: 'new-1', name: 'New Skill' }), 201)
    )

    const request = {
      method: 'POST',
      headers: {
        get: (name: string) =>
          name === 'Content-Type' ? 'application/x-www-form-urlencoded' : null,
      },
      nextUrl: { search: '' },
      text: () => Promise.resolve('name=New+Skill&description=Test'),
    } as any

    const params = Promise.resolve({ path: ['v1', 'skills'] })
    const response = await POST(request, { params })

    const calledUrl = mockFetch.mock.calls[0][0]
    expect(calledUrl).toBe('http://localhost:8080/api/v1/skills')

    const fetchInit = mockFetch.mock.calls[0][1]
    expect(fetchInit.body).toBe('name=New+Skill&description=Test')
    expect(fetchInit.method).toBe('POST')
    expect(fetchInit.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    expect(response.status).toBe(201)
  })

  it('DELETE returns 204 with no body from client response', async () => {
    const { DELETE } = await import('../[...path]/route')

    mockFetch.mockResolvedValue(new Response(null, { status: 204 }))

    const request = {
      method: 'DELETE',
      headers: { get: () => 'application/json' },
      nextUrl: { search: '' },
      text: () => Promise.resolve(''),
    } as any

    const params = Promise.resolve({ path: ['v1', 'skills', 'abc-123'] })
    const response = await DELETE(request, { params })

    expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:8080/api/v1/skills/abc-123')
    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
  })

  it('forwards Authorization when session exists', async () => {
    const { GET } = await import('../[...path]/route')

    const request = {
      method: 'GET',
      headers: { get: () => 'application/json' },
      nextUrl: { search: '' },
    } as any

    const params = Promise.resolve({ path: ['v1', 'skills'] })
    await GET(request, { params })

    const fetchInit = mockFetch.mock.calls[0][1]
    expect(fetchInit.headers.Authorization).toBe('Bearer test-jwt-token')
  })

  it('omits Authorization when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { GET } = await import('../[...path]/route')

    const request = {
      method: 'GET',
      headers: { get: () => 'application/json' },
      nextUrl: { search: '' },
    } as any

    const params = Promise.resolve({ path: ['v1', 'skills'] })
    await GET(request, { params })

    const fetchInit = mockFetch.mock.calls[0][1]
    expect(fetchInit.headers.Authorization).toBeUndefined()
  })

  it('forwards query string', async () => {
    const { GET } = await import('../[...path]/route')

    const request = {
      method: 'GET',
      headers: { get: () => 'application/json' },
      nextUrl: { search: '?limit=5&skill_id=abc' },
    } as any

    const params = Promise.resolve({ path: ['v1', 'activity'] })
    await GET(request, { params })

    expect(mockFetch.mock.calls[0][0]).toBe(
      'http://localhost:8080/api/v1/activity?limit=5&skill_id=abc'
    )
  })

  it('does not send body for GET', async () => {
    const { GET } = await import('../[...path]/route')

    const request = {
      method: 'GET',
      headers: { get: () => 'application/json' },
      nextUrl: { search: '' },
    } as any

    const params = Promise.resolve({ path: ['v1', 'skills'] })
    await GET(request, { params })

    expect(mockFetch.mock.calls[0][1].body).toBeUndefined()
  })
})
