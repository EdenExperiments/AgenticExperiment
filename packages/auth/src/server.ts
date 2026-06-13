import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseUrl, getSupabasePublishableKey } from './env'

type CookieToSet = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0][number]
type HeadersToSet = Parameters<NonNullable<CookieMethodsServer['setAll']>>[1]

/** Supabase server client for Route Handlers, Server Components, and Server Actions. */
export async function createSupabaseServerClient(responseHeaders?: Headers) {
  const cookieStore = await cookies()

  return createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[], headers: HeadersToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll from a Server Component — proxy refreshes sessions instead.
          }
          if (responseHeaders) {
            Object.entries(headers).forEach(([name, value]) => {
              responseHeaders.set(name, value)
            })
          }
        },
      },
    },
  )
}
