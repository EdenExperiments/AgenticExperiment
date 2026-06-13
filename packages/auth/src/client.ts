import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import { type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabasePublishableKey } from './env'

let client: SupabaseClient | null = null

/** Singleton Supabase browser client. Call from Client Components only. */
export function createBrowserClient(): SupabaseClient {
  if (!client) {
    client = _createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      // Avoid Web Locks deadlocks in React Strict Mode during sign-in.
      auth: {
        lock: async (_name, _acquireTimeout, fn) => fn(),
      },
    })
  }
  return client
}
