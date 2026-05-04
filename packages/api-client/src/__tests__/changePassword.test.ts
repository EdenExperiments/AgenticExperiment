// Wave 1 – T2 api-client regression tests for changePassword()
//
// T2 contract: packages/api-client exports changePassword({current_password, new_password, confirm_new_password?})
//   - POSTs form-urlencoded to /api/v1/account/password
//   - Sends current_password and new_password as form fields
//   - Sends confirm_new_password only when provided
//   - Returns { status: 'password_changed' } on success
//   - Throws on API error with error message from body
//
// INTENTIONAL RED on main: changePassword() does not exist in the api-client.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

// Dynamic import so the test file doesn't crash when the export is missing on main.
// The import error itself constitutes the intentional-red state.
describe('changePassword', () => {
  it('[INTENTIONAL RED on main] is exported from @rpgtracker/api-client', async () => {
    const mod = await import('../client')
    expect(typeof (mod as Record<string, unknown>)['changePassword']).toBe('function')
  })

  it('[INTENTIONAL RED on main] POSTs form-urlencoded to /api/v1/account/password', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'password_changed' }),
    })

    const mod = await import('../client')
    const changePassword = (mod as Record<string, unknown>)['changePassword'] as Function
    if (typeof changePassword !== 'function') {
      throw new Error('[INTENTIONAL RED] changePassword not found in api-client')
    }

    await changePassword({ current_password: 'oldpass', new_password: 'newpass123' })

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/account/password', expect.objectContaining({
      method: 'POST',
    }))

    const callInit = mockFetch.mock.calls[0][1] as RequestInit
    expect(callInit.headers).toMatchObject({
      'Content-Type': 'application/x-www-form-urlencoded',
    })

    const body = callInit.body as string
    const parsed = new URLSearchParams(body)
    expect(parsed.get('current_password')).toBe('oldpass')
    expect(parsed.get('new_password')).toBe('newpass123')
  })

  it('[INTENTIONAL RED on main] omits confirm_new_password when not provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'password_changed' }),
    })

    const mod = await import('../client')
    const changePassword = (mod as Record<string, unknown>)['changePassword'] as Function
    if (typeof changePassword !== 'function') {
      throw new Error('[INTENTIONAL RED] changePassword not found in api-client')
    }

    await changePassword({ current_password: 'oldpass', new_password: 'newpass123' })

    const callInit = mockFetch.mock.calls[0][1] as RequestInit
    const body = callInit.body as string
    const parsed = new URLSearchParams(body)
    expect(parsed.has('confirm_new_password')).toBe(false)
  })

  it('[INTENTIONAL RED on main] sends confirm_new_password when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'password_changed' }),
    })

    const mod = await import('../client')
    const changePassword = (mod as Record<string, unknown>)['changePassword'] as Function
    if (typeof changePassword !== 'function') {
      throw new Error('[INTENTIONAL RED] changePassword not found in api-client')
    }

    await changePassword({
      current_password: 'oldpass',
      new_password: 'newpass123',
      confirm_new_password: 'newpass123',
    })

    const callInit = mockFetch.mock.calls[0][1] as RequestInit
    const body = callInit.body as string
    const parsed = new URLSearchParams(body)
    expect(parsed.get('confirm_new_password')).toBe('newpass123')
  })

  it('[INTENTIONAL RED on main] returns {status:"password_changed"} on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'password_changed' }),
    })

    const mod = await import('../client')
    const changePassword = (mod as Record<string, unknown>)['changePassword'] as Function
    if (typeof changePassword !== 'function') {
      throw new Error('[INTENTIONAL RED] changePassword not found in api-client')
    }

    const result = await changePassword({ current_password: 'oldpass', new_password: 'newpass123' })
    expect(result).toEqual({ status: 'password_changed' })
  })

  it('[INTENTIONAL RED on main] throws with error message from API on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: 'current password is incorrect' }),
    })

    const mod = await import('../client')
    const changePassword = (mod as Record<string, unknown>)['changePassword'] as Function
    if (typeof changePassword !== 'function') {
      throw new Error('[INTENTIONAL RED] changePassword not found in api-client')
    }

    await expect(
      changePassword({ current_password: 'wrong', new_password: 'newpass123' })
    ).rejects.toThrow('current password is incorrect')
  })
})
