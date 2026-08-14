import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchNutriFoods, logNutriDiary, getNutriRemaining } from '../client'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

function json(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body }
}

describe('nutrilog diary client', () => {
  it('GET search', async () => {
    mockFetch.mockResolvedValueOnce(json({ source: 'off', foods: [] }))
    await searchNutriFoods('oats')
    expect(mockFetch.mock.calls[0][0]).toBe('/api/v1/nutrilog/foods/search?q=oats')
  })

  it('POST diary snapshot', async () => {
    mockFetch.mockResolvedValueOnce(json({ id: 'd1' }, 201))
    await logNutriDiary({ name: 'Oats', calories: 100, protein_g: 4, carbs_g: 18, fat_g: 2, serving_qty: 1 })
    expect(mockFetch.mock.calls[0][0]).toBe('/api/v1/nutrilog/diary')
  })

  it('GET remaining', async () => {
    mockFetch.mockResolvedValueOnce(json({ calories_remaining: 1700 }))
    await getNutriRemaining()
    expect(mockFetch.mock.calls[0][0]).toBe('/api/v1/nutrilog/remaining')
  })
})
