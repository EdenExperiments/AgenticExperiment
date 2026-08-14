import { describe, it, expect, vi, beforeEach } from 'vitest'
import { upsertNutriGoals, getNutriGoals } from '../client'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

function json(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body }
}

describe('nutrilog goals client', () => {
  it('PUT /api/v1/nutrilog/goals', async () => {
    mockFetch.mockResolvedValueOnce(json({ calorie_goal: 2000 }))
    await upsertNutriGoals({ calorie_goal: 2000, protein_g: 120 })
    expect(mockFetch.mock.calls[0][0]).toBe('/api/v1/nutrilog/goals')
    expect(mockFetch.mock.calls[0][1]).toMatchObject({ method: 'PUT' })
    expect(JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      calorie_goal: 2000,
      protein_g: 120,
    })
  })

  it('GET /api/v1/nutrilog/goals', async () => {
    mockFetch.mockResolvedValueOnce(json({ calorie_goal: 2000 }))
    await getNutriGoals()
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/nutrilog/goals', {
      headers: { 'Content-Type': 'application/json' },
    })
  })
})
