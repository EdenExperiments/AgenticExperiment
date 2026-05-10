import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import { type SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabasePublishableKey } from './env'

let client: SupabaseClient | null = null

/** Singleton Supabase browser client. Call from Client Components only. */
export function createBrowserClient(): SupabaseClient {
  if (!client) {
    client = _createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey())
  }
  return client
}
