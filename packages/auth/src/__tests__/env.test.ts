import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getSupabaseAnonKey, getSupabaseUrl } from '../env'

describe('getSupabaseAnonKey', () => {
  let savedAnon: string | undefined
  let savedPublishable: string | undefined

  beforeEach(() => {
    savedAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    savedPublishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  })

  afterEach(() => {
    if (savedAnon !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedAnon
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
    if (savedPublishable !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = savedPublishable
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
    }
  })

  it('returns NEXT_PUBLIC_SUPABASE_ANON_KEY when set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-value'
    expect(getSupabaseAnonKey()).toBe('anon-key-value')
  })

  it('falls back to NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY when ANON_KEY absent', () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'publishable-key-value'
    expect(getSupabaseAnonKey()).toBe('publishable-key-value')
  })

  it('prefers NEXT_PUBLIC_SUPABASE_ANON_KEY over fallback key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'primary-key'
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = 'fallback-key'
    expect(getSupabaseAnonKey()).toBe('primary-key')
  })

  it('returns empty string when neither key is set', () => {
    expect(getSupabaseAnonKey()).toBe('')
  })
})

describe('getSupabaseUrl', () => {
  let savedUrl: string | undefined

  beforeEach(() => {
    savedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  afterEach(() => {
    if (savedUrl !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = savedUrl
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  })

  it('returns NEXT_PUBLIC_SUPABASE_URL when set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co'
    expect(getSupabaseUrl()).toBe('https://abc.supabase.co')
  })

  it('returns empty string when NEXT_PUBLIC_SUPABASE_URL is not set', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(getSupabaseUrl()).toBe('')
  })
})
