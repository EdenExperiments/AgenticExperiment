import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieToSet = Parameters<NonNullable<CookieMethodsServer['setAll']>>[0][number]

/** Supabase server client for use in Route Handlers and Server Components.
 *  Note: `await cookies()` requires Next.js 15+. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()  // async in Next.js 15+

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
