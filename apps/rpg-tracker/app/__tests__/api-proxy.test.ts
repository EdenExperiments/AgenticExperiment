import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@rpgtracker/auth/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

import { createSupabaseServerClient } from '@rpgtracker/auth/server'

function makeRequest(
  method: string,
  url: string,
  opts: { body?: string; contentType?: string } = {}
) {
  const headers = new Headers()
  if (opts.contentType) {
    headers.set('Content-Type', opts.contentType)
  }

  return {
    method,
    nextUrl: new URL(url),
    headers,
    text: async () => opts.body ?? '',
  } as unknown as import('next/server').NextRequest
}

function makeUpstreamResponse(opts: {
  status?: number
  contentType?: string
  body?: string
  extraHeaders?: Record<string, string>
}) {
  const headers = new Headers()
  if (opts.contentType) headers.set('Content-Type', opts.contentType)
  if (opts.extraHeaders) {
    for (const [k, v] of Object.entries(opts.extraHeaders)) {
      headers.set(k, v)
    }
  }
  return {
    status: opts.status ?? 200,
    headers,
    text: async () => opts.body ?? '',
  } as unknown as Response
}

describe('BFF API proxy - route.ts', () => {
  const mockFetch = vi.fn()
  const mockGetSession = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    mockFetch.mockReset()
    mockGetSession.mockReset()

    mockGetSession.mockResolvedValue({ data: { session: null } })
    ;(createSupabaseServerClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getSession: mockGetSession },
    })

    globalThis.fetch = mockFetch
  })

  async function importProxy() {
    const mod = await import('../api/[...path]/route')
    return mod
  }

  it('preserves JSON Content-Type from upstream response', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/skills')
    const response = await GET(req, { params: Promise.resolve({ path: ['skills'] }) })
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.status).toBe(200)
  })

  it('preserves plain-text Content-Type from upstream response', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'hello' })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/health')
    const response = await GET(req, { params: Promise.resolve({ path: ['health'] }) })
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
  })

  it('preserves CSV Content-Type from upstream response', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 200, contentType: 'text/csv', body: 'id,name\n1,foo' })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/export')
    const response = await GET(req, { params: Promise.resolve({ path: ['export'] }) })
    expect(response.headers.get('content-type')).toBe('text/csv')
  })

  it('passes through 201 Created status', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 201, contentType: 'application/json', body: '{}' })
    )
    const { POST } = await importProxy()
    const req = makeRequest('POST', 'http://localhost:3000/api/skills', {
      body: '{"name":"Chess"}',
      contentType: 'application/json',
    })
    const response = await POST(req, { params: Promise.resolve({ path: ['skills'] }) })
    expect(response.status).toBe(201)
  })

  it('passes through 204 No Content status', async () => {
    mockFetch.mockResolvedValue(makeUpstreamResponse({ status: 204, body: '' }))
    const { DELETE } = await importProxy()
    const req = makeRequest('DELETE', 'http://localhost:3000/api/skills/1')
    const response = await DELETE(req, { params: Promise.resolve({ path: ['skills', '1'] }) })
    expect(response.status).toBe(204)
  })

  it('passes through 404 status', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 404, contentType: 'application/json', body: '{"error":"not found"}' })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/skills/999')
    const response = await GET(req, { params: Promise.resolve({ path: ['skills', '999'] }) })
    expect(response.status).toBe(404)
  })

  it('passes through 500 status', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 500, contentType: 'application/json', body: '{"error":"internal"}' })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/crash')
    const response = await GET(req, { params: Promise.resolve({ path: ['crash'] }) })
    expect(response.status).toBe(500)
  })

  it('forwards Authorization header when session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok-abc' } } })
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 200, contentType: 'application/json', body: '{}' })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/skills')
    await GET(req, { params: Promise.resolve({ path: ['skills'] }) })
    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect((fetchOpts.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-abc')
  })

  it('omits Authorization header when no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 401, contentType: 'application/json', body: '{}' })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/skills')
    await GET(req, { params: Promise.resolve({ path: ['skills'] }) })
    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect((fetchOpts.headers as Record<string, string>)['Authorization']).toBeUndefined()
  })

  it('does not send Content-Type for GET requests', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 200, contentType: 'application/json', body: '{}' })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/skills')
    await GET(req, { params: Promise.resolve({ path: ['skills'] }) })
    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect((fetchOpts.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('does not send Content-Type for DELETE requests', async () => {
    mockFetch.mockResolvedValue(makeUpstreamResponse({ status: 204, body: '' }))
    const { DELETE } = await importProxy()
    const req = makeRequest('DELETE', 'http://localhost:3000/api/skills/1')
    await DELETE(req, { params: Promise.resolve({ path: ['skills', '1'] }) })
    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect((fetchOpts.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('does not send body for GET requests', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 200, contentType: 'application/json', body: '{}' })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/skills')
    await GET(req, { params: Promise.resolve({ path: ['skills'] }) })
    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect(fetchOpts.body).toBeUndefined()
  })

  it('forwards JSON body and Content-Type for POST', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 201, contentType: 'application/json', body: '{"id":1}' })
    )
    const { POST } = await importProxy()
    const req = makeRequest('POST', 'http://localhost:3000/api/skills', {
      body: '{"name":"Piano"}',
      contentType: 'application/json',
    })
    await POST(req, { params: Promise.resolve({ path: ['skills'] }) })
    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect((fetchOpts.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(fetchOpts.body).toBe('{"name":"Piano"}')
  })

  it('forwards multipart/form-data Content-Type for POST', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 200, contentType: 'application/json', body: '{}' })
    )
    const { POST } = await importProxy()
    const req = makeRequest('POST', 'http://localhost:3000/api/upload', {
      body: '--boundary\r\n...\r\n--boundary--',
      contentType: 'multipart/form-data; boundary=boundary',
    })
    await POST(req, { params: Promise.resolve({ path: ['upload'] }) })
    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect((fetchOpts.headers as Record<string, string>)['Content-Type']).toBe(
      'multipart/form-data; boundary=boundary'
    )
  })

  it('does not set Content-Type when POST has no Content-Type header', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 200, contentType: 'application/json', body: '{}' })
    )
    const { POST } = await importProxy()
    const req = makeRequest('POST', 'http://localhost:3000/api/webhooks', { body: '' })
    await POST(req, { params: Promise.resolve({ path: ['webhooks'] }) })
    const [, fetchOpts] = mockFetch.mock.calls[0]
    expect((fetchOpts.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('passes extra upstream headers (e.g. X-Request-Id) to the client', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({
        status: 200,
        contentType: 'application/json',
        body: '{}',
        extraHeaders: { 'X-Request-Id': 'req-42' },
      })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/skills')
    const response = await GET(req, { params: Promise.resolve({ path: ['skills'] }) })
    expect(response.headers.get('x-request-id')).toBe('req-42')
  })

  it('strips transfer-encoding hop-by-hop header from upstream response', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({
        status: 200,
        contentType: 'application/json',
        body: '{}',
        extraHeaders: { 'Transfer-Encoding': 'chunked' },
      })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/skills')
    const response = await GET(req, { params: Promise.resolve({ path: ['skills'] }) })
    expect(response.headers.get('transfer-encoding')).toBeNull()
  })

  it('appends query string to upstream URL', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 200, contentType: 'application/json', body: '[]' })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/skills?page=2&limit=10')
    await GET(req, { params: Promise.resolve({ path: ['skills'] }) })
    const [upstreamUrl] = mockFetch.mock.calls[0]
    expect(upstreamUrl).toContain('?page=2&limit=10')
  })

  it('builds correct upstream path from catch-all segments', async () => {
    mockFetch.mockResolvedValue(
      makeUpstreamResponse({ status: 200, contentType: 'application/json', body: '{}' })
    )
    const { GET } = await importProxy()
    const req = makeRequest('GET', 'http://localhost:3000/api/skills/42/sessions')
    await GET(req, { params: Promise.resolve({ path: ['skills', '42', 'sessions'] }) })
    const [upstreamUrl] = mockFetch.mock.calls[0]
    expect(upstreamUrl).toContain('/api/skills/42/sessions')
  })
})
