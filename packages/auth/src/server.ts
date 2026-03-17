import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Supabase server client for use in Route Handlers and Server Components.
 *  Note: `cookies()` is synchronous in Next.js 14; `await cookies()` is Next.js 15+ only. */
export async function createSupabaseServerClient() {
  const cookieStore = cookies()  // synchronous in Next.js 14

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
