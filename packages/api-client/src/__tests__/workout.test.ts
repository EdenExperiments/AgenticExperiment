import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  startWorkoutSession,
  listWorkoutSessions,
  addWorkoutSet,
  finishWorkoutSession,
} from '../client'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

function json(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body }
}

describe('workout api-client', () => {
  it('POST /api/v1/workout/sessions', async () => {
    mockFetch.mockResolvedValueOnce(json({ id: 's1', status: 'in_progress' }, 201))
    await startWorkoutSession()
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/workout/sessions', {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({}),
    })
  })

  it('GET /api/v1/workout/sessions', async () => {
    mockFetch.mockResolvedValueOnce(json([]))
    await listWorkoutSessions()
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/workout/sessions', {
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('POST set JSON body', async () => {
    mockFetch.mockResolvedValueOnce(json({ id: 'set1' }, 201))
    await addWorkoutSet('ex1', { reps: 5, load_kg: 100, rpe: 8 })
    const [, init] = mockFetch.mock.calls[0]
    expect(mockFetch.mock.calls[0][0]).toBe('/api/v1/workout/exercises/ex1/sets')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      reps: 5,
      load_kg: 100,
      rpe: 8,
    })
  })

  it('POST finish', async () => {
    mockFetch.mockResolvedValueOnce(json({ id: 's1', status: 'completed', volume_kg: 500 }))
    await finishWorkoutSession('s1')
    expect(mockFetch.mock.calls[0][0]).toBe('/api/v1/workout/sessions/s1/finish')
  })
})
