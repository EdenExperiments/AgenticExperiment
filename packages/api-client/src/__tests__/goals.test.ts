import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  listMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  listCheckIns,
  createCheckIn,
} from '../client'
import type { Goal, Milestone, CheckIn } from '../types'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

function noContent() {
  return { ok: true, status: 204, json: async () => undefined }
}

function errJson(body: unknown, status = 400) {
  return { ok: false, status, json: async () => body }
}

const goal: Goal = {
  id: 'g1',
  user_id: 'u1',
  skill_id: null,
  title: 'Run a 5K',
  description: null,
  status: 'active',
  target_date: null,
  current_value: null,
  target_value: null,
  unit: null,
  created_at: '2026-05-04T00:00:00Z',
  updated_at: '2026-05-04T00:00:00Z',
}

const milestone: Milestone = {
  id: 'm1',
  goal_id: 'g1',
  title: 'Run 1K without stopping',
  description: null,
  position: 1,
  is_done: false,
  due_date: null,
  done_at: null,
  created_at: '2026-05-04T00:00:00Z',
  updated_at: '2026-05-04T00:00:00Z',
}

const checkin: CheckIn = {
  id: 'c1',
  goal_id: 'g1',
  note: 'Ran 2K today',
  value: 2,
  checked_in_at: '2026-05-04T00:00:00Z',
  created_at: '2026-05-04T00:00:00Z',
}

// ─── listGoals ────────────────────────────────────────────────────────────────

describe('listGoals', () => {
  it('GET /api/v1/goals without filter', async () => {
    mockFetch.mockResolvedValueOnce(okJson([goal]))
    const result = await listGoals()
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals', expect.objectContaining({}))
    expect(result).toEqual([goal])
  })

  it('appends ?status=active when filtering', async () => {
    mockFetch.mockResolvedValueOnce(okJson([goal]))
    await listGoals({ status: 'active' })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals?status=active', expect.anything())
  })

  it('appends ?status=completed', async () => {
    mockFetch.mockResolvedValueOnce(okJson([]))
    await listGoals({ status: 'completed' })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals?status=completed', expect.anything())
  })

  it('appends ?status=abandoned', async () => {
    mockFetch.mockResolvedValueOnce(okJson([]))
    await listGoals({ status: 'abandoned' })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals?status=abandoned', expect.anything())
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'unauthorized' }, 401))
    await expect(listGoals()).rejects.toThrow('unauthorized')
  })
})

// ─── getGoal ─────────────────────────────────────────────────────────────────

describe('getGoal', () => {
  it('GET /api/v1/goals/:id', async () => {
    mockFetch.mockResolvedValueOnce(okJson(goal))
    const result = await getGoal('g1')
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1', expect.anything())
    expect(result).toEqual(goal)
  })

  it('throws on 404', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'not found' }, 404))
    await expect(getGoal('missing')).rejects.toThrow('not found')
  })
})

// ─── createGoal ───────────────────────────────────────────────────────────────

describe('createGoal', () => {
  it('POST /api/v1/goals with JSON body', async () => {
    mockFetch.mockResolvedValueOnce(okJson(goal))
    await createGoal({ title: 'Run a 5K' })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'Run a 5K' }),
    }))
  })

  it('includes optional fields when provided', async () => {
    mockFetch.mockResolvedValueOnce(okJson(goal))
    const payload = {
      title: 'Lift 100kg',
      description: 'Bench press goal',
      skill_id: 's1',
      status: 'active' as const,
      target_date: '2026-12-31',
      current_value: 80,
      target_value: 100,
      unit: 'kg',
    }
    await createGoal(payload)
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload),
    }))
  })

  it('returns the created goal', async () => {
    mockFetch.mockResolvedValueOnce(okJson(goal))
    const result = await createGoal({ title: 'Run a 5K' })
    expect(result).toEqual(goal)
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'validation failed' }))
    await expect(createGoal({ title: 'Run a 5K' })).rejects.toThrow('validation failed')
  })
})

// ─── updateGoal ───────────────────────────────────────────────────────────────

describe('updateGoal', () => {
  it('PUT /api/v1/goals/:id with JSON body', async () => {
    const updated = { ...goal, status: 'completed' as const }
    mockFetch.mockResolvedValueOnce(okJson(updated))
    const result = await updateGoal('g1', { status: 'completed' })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ status: 'completed' }),
    }))
    expect(result.status).toBe('completed')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'forbidden' }, 403))
    await expect(updateGoal('g1', { title: 'New' })).rejects.toThrow('forbidden')
  })
})

// ─── deleteGoal ───────────────────────────────────────────────────────────────

describe('deleteGoal', () => {
  it('DELETE /api/v1/goals/:id', async () => {
    mockFetch.mockResolvedValueOnce(noContent())
    const result = await deleteGoal('g1')
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1', expect.objectContaining({ method: 'DELETE' }))
    expect(result).toBeUndefined()
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'not found' }, 404))
    await expect(deleteGoal('missing')).rejects.toThrow('not found')
  })
})

// ─── listMilestones ───────────────────────────────────────────────────────────

describe('listMilestones', () => {
  it('GET /api/v1/goals/:id/milestones', async () => {
    mockFetch.mockResolvedValueOnce(okJson([milestone]))
    const result = await listMilestones('g1')
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1/milestones', expect.anything())
    expect(result).toEqual([milestone])
  })
})

// ─── createMilestone ──────────────────────────────────────────────────────────

describe('createMilestone', () => {
  it('POST /api/v1/goals/:id/milestones with JSON body', async () => {
    mockFetch.mockResolvedValueOnce(okJson(milestone))
    await createMilestone('g1', { title: 'Run 1K without stopping', position: 1 })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1/milestones', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'Run 1K without stopping', position: 1 }),
    }))
  })

  it('returns the created milestone', async () => {
    mockFetch.mockResolvedValueOnce(okJson(milestone))
    const result = await createMilestone('g1', { title: 'Run 1K without stopping' })
    expect(result).toEqual(milestone)
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'goal not found' }, 404))
    await expect(createMilestone('bad', { title: 'X' })).rejects.toThrow('goal not found')
  })
})

// ─── updateMilestone ──────────────────────────────────────────────────────────

describe('updateMilestone', () => {
  it('PUT /api/v1/goals/:id/milestones/:mid with JSON body', async () => {
    const done = { ...milestone, is_done: true }
    mockFetch.mockResolvedValueOnce(okJson(done))
    const result = await updateMilestone('g1', 'm1', { is_done: true })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1/milestones/m1', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ is_done: true }),
    }))
    expect(result.is_done).toBe(true)
  })
})

// ─── deleteMilestone ──────────────────────────────────────────────────────────

describe('deleteMilestone', () => {
  it('DELETE /api/v1/goals/:id/milestones/:mid', async () => {
    mockFetch.mockResolvedValueOnce(noContent())
    const result = await deleteMilestone('g1', 'm1')
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1/milestones/m1', expect.objectContaining({ method: 'DELETE' }))
    expect(result).toBeUndefined()
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'not found' }, 404))
    await expect(deleteMilestone('g1', 'bad')).rejects.toThrow('not found')
  })
})

// ─── listCheckIns ─────────────────────────────────────────────────────────────

describe('listCheckIns', () => {
  it('GET /api/v1/goals/:id/checkins', async () => {
    mockFetch.mockResolvedValueOnce(okJson([checkin]))
    const result = await listCheckIns('g1')
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1/checkins', expect.anything())
    expect(result).toEqual([checkin])
  })
})

// ─── createCheckIn ────────────────────────────────────────────────────────────

describe('createCheckIn', () => {
  it('POST /api/v1/goals/:id/checkins with JSON body', async () => {
    mockFetch.mockResolvedValueOnce(okJson(checkin))
    await createCheckIn('g1', { note: 'Ran 2K today', value: 2 })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1/checkins', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ note: 'Ran 2K today', value: 2 }),
    }))
  })

  it('accepts check-in with only note', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ...checkin, value: null }))
    const result = await createCheckIn('g1', { note: 'Felt good' })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1/checkins', expect.objectContaining({
      body: JSON.stringify({ note: 'Felt good' }),
    }))
    expect(result.value).toBeNull()
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'validation failed' }))
    await expect(createCheckIn('g1', { note: '' })).rejects.toThrow('validation failed')
  })
})
