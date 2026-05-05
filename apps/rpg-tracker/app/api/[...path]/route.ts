import { type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@rpgtracker/auth/server'

const GO_API_URL = process.env.GO_API_URL ?? 'http://localhost:8080'

const NO_BODY_METHODS = new Set(['GET', 'HEAD', 'DELETE', 'OPTIONS'])

// Statuses that must not carry a body per the Fetch spec (null body status).
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304])

async function proxy(request: NextRequest, path: string): Promise<Response> {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const url = `${GO_API_URL}/api/${path}${request.nextUrl.search}`
  const hasBody = !NO_BODY_METHODS.has(request.method)

  const requestHeaders: HeadersInit = {}
  if (session?.access_token) {
    requestHeaders['Authorization'] = `Bearer ${session.access_token}`
  }

  // Only forward Content-Type when the request actually has a body.
  // For no-body methods (GET, HEAD, DELETE, OPTIONS) omit it entirely
  // so the upstream does not receive a misleading Content-Type header.
  if (hasBody) {
    const contentType = request.headers.get('Content-Type')
    if (contentType) {
      requestHeaders['Content-Type'] = contentType
    }
  }

  const response = await fetch(url, {
    method: request.method,
    headers: requestHeaders,
    body: hasBody ? await request.text() : undefined,
  })

  // Preserve upstream response headers verbatim; pass through Content-Type,
  // Cache-Control, X-Request-Id, etc. without overriding them.
  // Strip hop-by-hop headers that must not be forwarded to clients.
  const responseHeaders = new Headers()
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (
      lower === 'transfer-encoding' ||
      lower === 'connection' ||
      lower === 'keep-alive' ||
      lower === 'upgrade' ||
      lower === 'proxy-authenticate' ||
      lower === 'proxy-authorization' ||
      lower === 'te' ||
      lower === 'trailers'
    ) {
      return
    }
    responseHeaders.set(key, value)
  })

  // Null-body statuses (204, 205, 304) must not carry a response body.
  if (NULL_BODY_STATUSES.has(response.status)) {
    return new Response(null, { status: response.status, headers: responseHeaders })
  }

  const data = await response.text()
  return new Response(data, { status: response.status, headers: responseHeaders })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(request, path.join('/'))
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(request, path.join('/'))
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(request, path.join('/'))
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(request, path.join('/'))
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return proxy(request, path.join('/'))
}
