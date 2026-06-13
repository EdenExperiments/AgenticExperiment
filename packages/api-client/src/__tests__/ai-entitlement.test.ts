import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAIEntitlement } from '../client'
import type { AIEntitlement } from '../types'

const mockFetch = vi.fn()
global.fetch = mockFetch as typeof fetch

beforeEach(() => {
  mockFetch.mockReset()
})

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

function errJson(body: unknown, status = 500) {
  return { ok: false, status, json: async () => body }
}

describe('getAIEntitlement', () => {
  it('calls GET /api/v1/account/ai-entitlement', async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({
        entitled: true,
        reason: 'ready',
        subscription_tier: 'pro',
        has_api_key: true,
      }),
    )

    await getAIEntitlement()

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/account/ai-entitlement',
      expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }),
    )
  })

  it('returns ready when entitled with pro tier and API key', async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({
        entitled: true,
        reason: 'ready',
        subscription_tier: 'pro',
        has_api_key: true,
      }),
    )

    const result = await getAIEntitlement()
    expect(result).toEqual({
      entitled: true,
      reason: 'ready',
      subscription_tier: 'pro',
      has_api_key: true,
    })
  })

  it('returns subscription_required when tier is free', async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({
        entitled: false,
        reason: 'subscription_required',
        subscription_tier: 'free',
        has_api_key: true,
      }),
    )

    const result = await getAIEntitlement()
    expect(result.entitled).toBe(false)
    expect(result.reason).toBe('subscription_required')
  })

  it('returns no_api_key when pro tier but no key', async () => {
    mockFetch.mockResolvedValueOnce(
      okJson({
        entitled: false,
        reason: 'no_api_key',
        subscription_tier: 'pro',
        has_api_key: false,
      }),
    )

    const result = await getAIEntitlement()
    expect(result.entitled).toBe(false)
    expect(result.reason).toBe('no_api_key')
  })

  it('returns unknown on network/unexpected errors (fail-closed)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network failure'))

    const result = await getAIEntitlement()
    expect(result).toEqual({ entitled: false, reason: 'unknown' })
  })

  it('returns unknown on non-OK HTTP response', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'internal server error' }, 500))

    const result = await getAIEntitlement()
    expect(result).toEqual({ entitled: false, reason: 'unknown' })
  })
})
