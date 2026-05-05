export { createBrowserClient } from './client'
export { signInWithProvider } from './social'
// Server client excluded from barrel — import from '@rpgtracker/auth/server' directly
export { createAuthMiddleware } from './middleware'
export { useSession, useSubscription } from './hooks'
export type { SessionState, SubscriptionState, SubscriptionTier } from './hooks'
export { getSupabaseUrl, getSupabaseAnonKey } from './env'
