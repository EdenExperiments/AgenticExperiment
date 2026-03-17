import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let client: ReturnType<typeof _createBrowserClient> | null = null

/** Singleton Supabase browser client. Call from Client Components only. */
export function createBrowserClient() {
  if (!client) {
    client = _createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return client
}
