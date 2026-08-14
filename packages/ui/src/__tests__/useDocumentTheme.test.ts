import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { useDocumentTheme } from '../useDocumentTheme'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-mode')
})

describe('useDocumentTheme', () => {
  it('reads data-theme and data-mode from documentElement', () => {
    document.documentElement.setAttribute('data-theme', 'retro')
    document.documentElement.setAttribute('data-mode', 'stylish')

    const { result } = renderHook(() => useDocumentTheme())
    expect(result.current.theme).toBe('retro')
    expect(result.current.mode).toBe('stylish')
    expect(result.current.atmosphere).toBe('none')
  })

  it('defaults to minimal/clean when attributes are missing or invalid', () => {
    document.documentElement.setAttribute('data-theme', 'invalid')
    document.documentElement.setAttribute('data-mode', 'invalid')

    const { result } = renderHook(() => useDocumentTheme())
    expect(result.current.theme).toBe('minimal')
    expect(result.current.mode).toBe('clean')
    expect(result.current.atmosphere).toBe('none')
  })

  it('updates when data-mode changes', async () => {
    document.documentElement.setAttribute('data-theme', 'minimal')
    document.documentElement.setAttribute('data-mode', 'clean')

    const { result } = renderHook(() => useDocumentTheme())
    expect(result.current.mode).toBe('clean')

    act(() => {
      document.documentElement.setAttribute('data-mode', 'stylish')
    })

    await vi.waitFor(() => {
      expect(result.current.mode).toBe('stylish')
    })
  })
})
