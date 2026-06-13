'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@rpgtracker/auth/server'

export type AuthActionResult = { error: string }

export async function signInWithPasswordAction(
  email: string,
  password: string,
): Promise<AuthActionResult | void> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  if (!data.session) {
    return {
      error: 'Sign-in did not create a session. Confirm your email or try again.',
    }
  }

  redirect('/dashboard')
}

export async function signUpWithPasswordAction(
  email: string,
  password: string,
): Promise<AuthActionResult | void> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { error: error.message }
  }

  if (!data.session) {
    return {
      error: 'Account created. Check your email to confirm, then sign in.',
    }
  }

  redirect('/dashboard')
}
