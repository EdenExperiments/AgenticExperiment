import { createBrowserClient } from './client'

type SocialProvider = 'google' | 'github' | 'apple'

interface SignInOptions {
  redirectTo?: string
}

/**
 * Initiate social auth via Supabase OAuth.
 * Redirects the user to the provider's auth page.
 */
export async function signInWithProvider(
  provider: SocialProvider,
  options?: SignInOptions
) {
  const supabase = createBrowserClient()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const redirectTo = options?.redirectTo ?? `${baseUrl}/dashboard`

  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  })
}
