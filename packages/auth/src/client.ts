import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import { getSupabaseUrl, getSupabasePublishableKey } from './env'

let client: ReturnType<typeof _createBrowserClient> | null = null

/** Singleton Supabase browser client. Call from Client Components only. */
export function createBrowserClient() {
  if (!client) {
    client = _createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey())
  }
  return client
}
