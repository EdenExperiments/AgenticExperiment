import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseUrl, getSupabasePublishableKey } from './env'

type CookieToSet = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0][number]

/** Supabase server client for use in Route Handlers and Server Components.
 *  Note: `await cookies()` requires Next.js 15+. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()  // async in Next.js 15+

  return createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
