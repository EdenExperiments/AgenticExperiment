import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// TDD — hook doesn't exist yet
import { useBrowserNotification } from '../useBrowserNotification'

describe('useBrowserNotification — AC-L4: Browser notifications', () => {
  const originalNotification = globalThis.Notification

  beforeEach(() => {
    // Mock Notification constructor
    const MockNotification = vi.fn() as unknown as typeof Notification
    Object.defineProperty(MockNotification, 'permission', {
      get: vi.fn(() => 'default'),
      configurable: true,
    })
    MockNotification.requestPermission = vi.fn(async () => 'granted')
    globalThis.Notification = MockNotification
  })

  afterEach(() => {
    globalThis.Notification = originalNotification
  })

  it('requestPermission() calls Notification.requestPermission()', async () => {
    const { result } = renderHook(() => useBrowserNotification())
    await act(async () => {
      await result.current.requestPermission()
    })
    expect(Notification.requestPermission).toHaveBeenCalled()
  })

  it('notify() creates a new Notification when permission is granted', () => {
    Object.defineProperty(Notification, 'permission', {
      get: () => 'granted',
      configurable: true,
    })

    const { result } = renderHook(() => useBrowserNotification())
    act(() => {
      result.current.notify({ title: 'Break time!', body: 'Take a rest' })
    })
    expect(Notification).toHaveBeenCalledWith('Break time!', { body: 'Take a rest' })
  })

  it('notify() does nothing when permission is denied (no throw)', () => {
    Object.defineProperty(Notification, 'permission', {
      get: () => 'denied',
      configurable: true,
    })

    const { result } = renderHook(() => useBrowserNotification())
    expect(() => {
      act(() => {
        result.current.notify({ title: 'Test', body: 'Should not fire' })
      })
    }).not.toThrow()
    expect(Notification).not.toHaveBeenCalledWith('Test', expect.anything())
  })

  it('notify() does nothing when permission is default (no throw)', () => {
    Object.defineProperty(Notification, 'permission', {
      get: () => 'default',
      configurable: true,
    })

    const { result } = renderHook(() => useBrowserNotification())
    expect(() => {
      act(() => {
        result.current.notify({ title: 'Test', body: 'Should not fire' })
      })
    }).not.toThrow()
  })

  it('isSupported is false when window.Notification is undefined', () => {
    // Remove Notification from globalThis
    const saved = globalThis.Notification
    // @ts-expect-error — intentionally removing for test
    delete globalThis.Notification

    const { result } = renderHook(() => useBrowserNotification())
    expect(result.current.isSupported).toBe(false)

    globalThis.Notification = saved
  })

  it('permission reflects current Notification.permission value', () => {
    Object.defineProperty(Notification, 'permission', {
      get: () => 'granted',
      configurable: true,
    })

    const { result } = renderHook(() => useBrowserNotification())
    expect(result.current.permission).toBe('granted')
  })
})
