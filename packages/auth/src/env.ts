/**
 * Supabase env for @rpgtracker/auth — same names as apps/api, with NEXT_PUBLIC_ for the browser.
 *
 *   NEXT_PUBLIC_SUPABASE_URL              — project URL (same value as SUPABASE_URL on the API)
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  — publishable key (same value as SUPABASE_PUBLISHABLE_KEY)
 *
 * These values are safe to expose to the client (publishable key, not secret/service_role).
 */

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
}

export function getSupabasePublishableKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''
}
