'use client'

import { useEffect, useState } from 'react'
import { type Session, type User } from '@supabase/supabase-js'
import { createBrowserClient } from './client'

export interface SessionState {
  session: Session | null
  user: User | null
  loading: boolean
}

/** Returns the current Supabase session and user. Subscribes to auth state changes. */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    user: null,
    loading: true,
  })

  useEffect(() => {
    const supabase = createBrowserClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ session, user: session?.user ?? null, loading: false })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({ session, user: session?.user ?? null, loading: false })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return state
}

export type SubscriptionTier = 'free' | 'per-app' | 'bundle' | 'ai-addon' | 'power-user'

export interface SubscriptionState {
  tier: SubscriptionTier
  apps: string[]
  hasAI: boolean
  loading: boolean
}

/**
 * Returns the user's subscription state.
 * In this scaffold, returns a free-tier default.
 * Wired to the API in the LifeQuest port phase.
 */
export function useSubscription(): SubscriptionState {
  return { tier: 'free', apps: [], hasAI: false, loading: false }
}
