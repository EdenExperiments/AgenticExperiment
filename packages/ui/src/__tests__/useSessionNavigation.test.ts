import { describe, it, expect, vi } from 'vitest'

// TDD — hook doesn't exist yet
import { useSessionNavigation } from '../useSessionNavigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'skill-abc-123' })),
  useSearchParams: vi.fn(() => new URLSearchParams('')),
}))

import { useParams, useSearchParams } from 'next/navigation'
import { renderHook } from '@testing-library/react'

describe('useSessionNavigation — AC-L5: Context-aware return navigation', () => {
  it('returns /skills/{id} when ?from=skill', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('from=skill') as any)
    vi.mocked(useParams).mockReturnValue({ id: 'skill-abc-123' })

    const { result } = renderHook(() => useSessionNavigation())
    expect(result.current.returnUrl).toBe('/skills/skill-abc-123')
    expect(result.current.entryPoint).toBe('skill')
  })

  it('returns /dashboard when ?from=dashboard', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('from=dashboard') as any)
    vi.mocked(useParams).mockReturnValue({ id: 'skill-xyz-789' })

    const { result } = renderHook(() => useSessionNavigation())
    expect(result.current.returnUrl).toBe('/dashboard')
    expect(result.current.entryPoint).toBe('dashboard')
  })

  it('returns /skills/{id} when from param is missing (default)', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('') as any)
    vi.mocked(useParams).mockReturnValue({ id: 'skill-def-456' })

    const { result } = renderHook(() => useSessionNavigation())
    expect(result.current.returnUrl).toBe('/skills/skill-def-456')
    expect(result.current.entryPoint).toBe('skill')
  })

  it('skillId is extracted from the route path', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('') as any)
    vi.mocked(useParams).mockReturnValue({ id: 'my-specific-skill-id' })

    const { result } = renderHook(() => useSessionNavigation())
    expect(result.current.skillId).toBe('my-specific-skill-id')
  })
})
