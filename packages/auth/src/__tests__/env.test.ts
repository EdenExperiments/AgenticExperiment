import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getSupabasePublishableKey, getSupabaseUrl } from '../env'

describe('getSupabasePublishableKey', () => {
  let saved: string | undefined

  beforeEach(() => {
    saved = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  })

  afterEach(() => {
    if (saved !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = saved
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    }
  })

  it('returns NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY when set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xxx'
    expect(getSupabasePublishableKey()).toBe('sb_publishable_xxx')
  })

  it('returns empty string when unset', () => {
    expect(getSupabasePublishableKey()).toBe('')
  })
})

describe('getSupabaseUrl', () => {
  let saved: string | undefined

  beforeEach(() => {
    saved = process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  afterEach(() => {
    if (saved !== undefined) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = saved
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL
    }
  })

  it('returns NEXT_PUBLIC_SUPABASE_URL when set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abc.supabase.co'
    expect(getSupabaseUrl()).toBe('https://abc.supabase.co')
  })

  it('returns empty string when unset', () => {
    expect(getSupabaseUrl()).toBe('')
  })
})
