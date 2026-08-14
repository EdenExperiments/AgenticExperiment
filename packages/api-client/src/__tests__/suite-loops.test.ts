import { beforeEach, describe, expect, it, vi } from 'vitest'
import { startFast, cookRecipe, startWorkout, createMoodLog, ApiRequestError } from '../client'

function okJson(body: unknown, status = 200) {
  return {
    ok: true,
    status,
    json: async () => body,
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

describe('suite first-loop client', () => {
  it('starts a fast with target hours', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okJson({ id: 'f1', target_hours: 16 }) as Response)
    await startFast(16)
    expect(fetch).toHaveBeenCalledWith('/api/v1/nutrilog/fasts', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ target_hours: 16 }),
    }))
  })

  it('maps empty pantry cook errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: 'empty_pantry' }),
    } as Response)
    await expect(cookRecipe({ recipe_id: 'r1' })).rejects.toBeInstanceOf(ApiRequestError)
  })

  it('starts a workout session', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okJson({ id: 's1', title: 'Workout' }) as Response)
    await startWorkout('Lower')
    expect(fetch).toHaveBeenCalledWith('/api/v1/workout/sessions', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('posts a mood check-in', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okJson({ id: 'm1', valence: 3 }) as Response)
    await createMoodLog({ valence: 3, energy: 2 })
    expect(fetch).toHaveBeenCalledWith('/api/v1/mindtrack/mood', expect.objectContaining({
      method: 'POST',
    }))
  })
})
