/**
 * Canonical Supabase environment variable resolution for @rpgtracker/auth.
 *
 * Strategy — anon/publishable key:
 *   Primary:  NEXT_PUBLIC_SUPABASE_ANON_KEY   (standard naming, used by client & server)
 *   Fallback: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY  (Supabase dashboard newer naming)
 *
 * If neither is set at runtime the caller receives an empty string and Supabase
 * will reject requests — fail-fast by design (same behaviour as `process.env.X!`).
 *
 * SECURITY: Both env vars are publishable/anon keys safe for the browser. Never
 * store service_role or secret keys in NEXT_PUBLIC_* variables.
 */

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
}

export function getSupabaseAnonKey(): string {
  const primary = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (primary) return primary

  // @deprecated NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY — migrate to NEXT_PUBLIC_SUPABASE_ANON_KEY
  const fallback = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  if (fallback) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[rpgtracker/auth] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY is deprecated. ' +
        'Rename it to NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env files.'
      )
    }
    return fallback
  }

  return ''
}
