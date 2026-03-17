import { type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@rpgtracker/auth/server'

const GO_API_URL = process.env.GO_API_URL ?? 'http://localhost:8080'

async function proxy(request: NextRequest, path: string): Promise<Response> {
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const url = `${GO_API_URL}/api/v1/${path}${request.nextUrl.search}`
  const isReadRequest = request.method === 'GET' || request.method === 'HEAD'

  const response = await fetch(url, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: isReadRequest ? undefined : await request.text(),
  })

  const data = await response.text()
  return new Response(data, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
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
