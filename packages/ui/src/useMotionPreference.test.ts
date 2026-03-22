import { renderHook, act } from '@testing-library/react'
import { useMotionPreference } from './useMotionPreference'

// Helper to set --motion-scale on :root
function setMotionScale(value: number) {
  document.documentElement.style.setProperty('--motion-scale', String(value))
}

afterEach(() => {
  document.documentElement.style.removeProperty('--motion-scale')
  document.documentElement.removeAttribute('data-theme')
})

test('returns prefersMotion: false and motionScale: 0 when --motion-scale is 0', () => {
  setMotionScale(0)
  const { result } = renderHook(() => useMotionPreference())
  expect(result.current.prefersMotion).toBe(false)
  expect(result.current.motionScale).toBe(0)
})

test('returns prefersMotion: true and motionScale: 1 when --motion-scale is 1', () => {
  setMotionScale(1)
  const { result } = renderHook(() => useMotionPreference())
  expect(result.current.prefersMotion).toBe(true)
  expect(result.current.motionScale).toBe(1)
})

test('returns prefersMotion: false when --motion-scale is not set', () => {
  // Don't set any value -- default should be 0
  const { result } = renderHook(() => useMotionPreference())
  expect(result.current.prefersMotion).toBe(false)
  expect(result.current.motionScale).toBe(0)
})

test('updates when data-theme attribute changes', async () => {
  setMotionScale(0)
  const { result } = renderHook(() => useMotionPreference())
  expect(result.current.motionScale).toBe(0)

  // Simulate theme change
  act(() => {
    document.documentElement.style.setProperty('--motion-scale', '1')
    document.documentElement.setAttribute('data-theme', 'retro')
  })

  // MutationObserver fires asynchronously
  await vi.waitFor(() => {
    expect(result.current.motionScale).toBe(1)
    expect(result.current.prefersMotion).toBe(true)
  })
})
