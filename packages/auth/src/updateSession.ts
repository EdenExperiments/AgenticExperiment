import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseUrl, getSupabasePublishableKey } from './env'

type CookieToSet = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0][number]
type HeadersToSet = Parameters<NonNullable<CookieMethodsServer['setAll']>>[1]

/**
 * Supabase session refresh — matches the official Next.js + @supabase/ssr proxy pattern.
 * Call getClaims() immediately after createServerClient; return the mutable response.
 */
export async function updateSession(request: NextRequest): Promise<{
  supabase: ReturnType<typeof createServerClient>
  response: NextResponse
}> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[], headers: HeadersToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
          Object.entries(headers).forEach(([name, value]) => {
            response.headers.set(name, value)
          })
        },
      },
    },
  )

  // Do not add logic between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims()

  return { supabase, response, claims: data?.claims }
}
