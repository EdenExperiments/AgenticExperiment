import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSkill, getPresets } from '../client'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe('createSkill', () => {
  it('POST to /api/v1/skills with correct body and returns skill', async () => {
    const skill = { id: 'abc', name: 'Piano', unit: 'session', current_xp: 0, current_level: 1 }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => skill,
    })

    const result = await createSkill({ name: 'Piano', unit: 'session' })

    expect(mockFetch).toHaveBeenCalledWith('/api/v1/skills', expect.objectContaining({
      method: 'POST',
    }))
    expect(result).toEqual(skill)
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'unauthorized' }),
    })

    await expect(createSkill({ name: 'Piano', unit: 'session' })).rejects.toThrow('unauthorized')
  })
})

describe('getPresets', () => {
  it('GET /api/presets and returns array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '1', name: 'Piano' }],
    })

    const result = await getPresets({})
    expect(result).toHaveLength(1)
  })
})
