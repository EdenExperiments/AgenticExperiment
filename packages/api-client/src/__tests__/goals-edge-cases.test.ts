/**
 * T11 supplemental tests: edge cases NOT covered by T10's goals.test.ts.
 * Covers: URL construction correctness, payload structure for validation scenarios,
 * error message propagation, and derived progress semantics at the call-site level.
 */
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

function created(body: unknown) {
  return { ok: true, status: 201, json: async () => body }
}

function noContent() {
  return { ok: true, status: 204, json: async () => undefined }
}

function errJson(body: unknown, status = 400) {
  return { ok: false, status, json: async () => body }
}

const baseGoal: Goal = {
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

const numericGoal: Goal = {
  ...baseGoal,
  id: 'g2',
  title: 'Run 100km',
  current_value: 20,
  target_value: 100,
  unit: 'km',
}

const completedGoal: Goal = {
  ...baseGoal,
  id: 'g3',
  title: 'Done Goal',
  status: 'completed',
}

const abandonedGoal: Goal = {
  ...baseGoal,
  id: 'g4',
  title: 'Given Up Goal',
  status: 'abandoned',
}

const ms1: Milestone = {
  id: 'm1',
  goal_id: 'g1',
  title: 'First step',
  description: null,
  position: 0,
  is_done: false,
  due_date: null,
  done_at: null,
  created_at: '2026-05-04T00:00:00Z',
  updated_at: '2026-05-04T00:00:00Z',
}

const ms2: Milestone = { ...ms1, id: 'm2', title: 'Second step', position: 1 }
const ms3: Milestone = { ...ms1, id: 'm3', title: 'Third step', position: 2 }

// ─── listGoals URL edge cases ──────────────────────────────────────────────────

describe('listGoals URL construction', () => {
  it('does not append query string when no params passed', async () => {
    mockFetch.mockResolvedValueOnce(okJson([baseGoal]))
    await listGoals()
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toBe('/api/v1/goals')
    expect(url).not.toContain('?')
  })

  it('does not append query string when params object empty', async () => {
    mockFetch.mockResolvedValueOnce(okJson([baseGoal]))
    await listGoals({})
    const url = mockFetch.mock.calls[0][0] as string
    expect(url).toBe('/api/v1/goals')
    expect(url).not.toContain('?')
  })

  it('appends ?status= for each valid status value', async () => {
    for (const status of ['active', 'completed', 'abandoned'] as const) {
      mockFetch.mockResolvedValueOnce(okJson([]))
      await listGoals({ status })
      const url = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string
      expect(url).toBe(`/api/v1/goals?status=${status}`)
    }
  })

  it('returns array even when response is empty', async () => {
    mockFetch.mockResolvedValueOnce(okJson([]))
    const result = await listGoals()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)
  })
})

// ─── Goal URL encoding ────────────────────────────────────────────────────────

describe('getGoal URL construction', () => {
  it('encodes goal ID directly into URL path', async () => {
    mockFetch.mockResolvedValueOnce(okJson(baseGoal))
    await getGoal('goal-abc-123')
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/goal-abc-123', expect.anything())
  })

  it('uses UUID-format IDs in URL', async () => {
    const id = '11111111-0000-0000-0000-000000000001'
    mockFetch.mockResolvedValueOnce(okJson({ ...baseGoal, id }))
    await getGoal(id)
    expect(mockFetch).toHaveBeenCalledWith(`/api/v1/goals/${id}`, expect.anything())
  })
})

// ─── createGoal payload structure ────────────────────────────────────────────

describe('createGoal payload structure', () => {
  it('sends only title when all optional fields omitted', async () => {
    mockFetch.mockResolvedValueOnce(okJson(baseGoal))
    await createGoal({ title: 'Simple goal' })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toEqual({ title: 'Simple goal' })
    expect(body).not.toHaveProperty('current_value')
    expect(body).not.toHaveProperty('target_value')
  })

  it('sends both current_value and target_value when numeric tracking specified', async () => {
    mockFetch.mockResolvedValueOnce(okJson(numericGoal))
    await createGoal({ title: 'Run 100km', current_value: 20, target_value: 100, unit: 'km' })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.current_value).toBe(20)
    expect(body.target_value).toBe(100)
    expect(body.unit).toBe('km')
  })

  it('sends skill_id when linking to a skill', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ...baseGoal, skill_id: 's1' }))
    await createGoal({ title: 'Linked goal', skill_id: 's1' })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.skill_id).toBe('s1')
  })

  it('sends target_date when specified', async () => {
    mockFetch.mockResolvedValueOnce(okJson(baseGoal))
    await createGoal({ title: 'Dated goal', target_date: '2026-12-31' })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.target_date).toBe('2026-12-31')
  })

  it('propagates validation error with message from API', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'current_value and target_value must both be set or both omitted' }, 422))
    await expect(createGoal({ title: 'Bad goal', current_value: 50 }))
      .rejects.toThrow('current_value and target_value must both be set or both omitted')
  })

  it('propagates unauthorized error', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'unauthorized' }, 401))
    await expect(createGoal({ title: 'Secret goal' })).rejects.toThrow('unauthorized')
  })
})

// ─── updateGoal payload structure ─────────────────────────────────────────────

describe('updateGoal payload structure', () => {
  it('sends only the fields specified in the update', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ...baseGoal, status: 'completed' }))
    await updateGoal('g1', { status: 'completed' })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toEqual({ status: 'completed' })
  })

  it('sends updated numeric values', async () => {
    mockFetch.mockResolvedValueOnce(okJson(numericGoal))
    await updateGoal('g2', { current_value: 50, target_value: 100 })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.current_value).toBe(50)
    expect(body.target_value).toBe(100)
  })

  it('propagates validation error (invalid status) from API', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'status must be one of: active, completed, abandoned' }, 422))
    await expect(updateGoal('g1', { status: 'invalid' as 'active' }))
      .rejects.toThrow('status must be one of: active, completed, abandoned')
  })

  it('propagates not-found for a goal not owned by user', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'not found' }, 404))
    await expect(updateGoal('other-user-goal', { title: 'Hijack' })).rejects.toThrow('not found')
  })
})

// ─── deleteGoal ───────────────────────────────────────────────────────────────

describe('deleteGoal ownership isolation at client', () => {
  it('sends DELETE to correct goal URL', async () => {
    mockFetch.mockResolvedValueOnce(noContent())
    await deleteGoal('g1')
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('propagates 404 for goal not owned by user', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'not found' }, 404))
    await expect(deleteGoal('other-goal')).rejects.toThrow('not found')
  })
})

// ─── Milestone URL and payload edge cases ─────────────────────────────────────

describe('listMilestones URL construction', () => {
  it('uses correct nested URL /api/v1/goals/:id/milestones', async () => {
    mockFetch.mockResolvedValueOnce(okJson([ms1, ms2, ms3]))
    await listMilestones('goal-123')
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/goal-123/milestones', expect.anything())
  })

  it('returns milestones in the order received (position order from API)', async () => {
    mockFetch.mockResolvedValueOnce(okJson([ms1, ms2, ms3]))
    const result = await listMilestones('g1')
    expect(result[0].position).toBe(0)
    expect(result[1].position).toBe(1)
    expect(result[2].position).toBe(2)
  })

  it('returns empty array when no milestones', async () => {
    mockFetch.mockResolvedValueOnce(okJson([]))
    const result = await listMilestones('g1')
    expect(result).toHaveLength(0)
  })
})

describe('createMilestone payload structure', () => {
  it('includes position field in payload', async () => {
    mockFetch.mockResolvedValueOnce(okJson(ms2))
    await createMilestone('g1', { title: 'Step 2', position: 1 })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.position).toBe(1)
  })

  it('sends due_date when provided', async () => {
    mockFetch.mockResolvedValueOnce(okJson(ms1))
    await createMilestone('g1', { title: 'Step 1', due_date: '2026-06-30' })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.due_date).toBe('2026-06-30')
  })

  it('propagates 404 when goal not found (ownership check)', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'not found' }, 404))
    await expect(createMilestone('other-goal', { title: 'X' })).rejects.toThrow('not found')
  })
})

describe('updateMilestone payload structure', () => {
  it('sends is_done field when marking complete', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ...ms1, is_done: true }))
    await updateMilestone('g1', 'm1', { is_done: true })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.is_done).toBe(true)
  })

  it('uses correct nested URL /api/v1/goals/:id/milestones/:mid', async () => {
    mockFetch.mockResolvedValueOnce(okJson(ms1))
    await updateMilestone('g1', 'm1', { title: 'Updated' })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1/milestones/m1', expect.objectContaining({ method: 'PUT' }))
  })
})

describe('deleteMilestone edge cases', () => {
  it('uses correct nested DELETE URL', async () => {
    mockFetch.mockResolvedValueOnce(noContent())
    await deleteMilestone('g1', 'm1')
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g1/milestones/m1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('propagates 404 for milestone not owned by user', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'not found' }, 404))
    await expect(deleteMilestone('g1', 'other-milestone')).rejects.toThrow('not found')
  })
})

// ─── Check-in URL and payload edge cases ─────────────────────────────────────

describe('listCheckIns URL construction', () => {
  it('uses correct nested URL /api/v1/goals/:id/checkins', async () => {
    const ci: CheckIn = {
      id: 'c1', goal_id: 'g1', note: 'Today run', value: null,
      checked_in_at: '2026-05-04T00:00:00Z', created_at: '2026-05-04T00:00:00Z',
    }
    mockFetch.mockResolvedValueOnce(okJson([ci]))
    await listCheckIns('goal-999')
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/goal-999/checkins', expect.anything())
  })

  it('returns check-ins as received from API (newest first expected)', async () => {
    const newer: CheckIn = {
      id: 'c2', goal_id: 'g1', note: 'Newer', value: null,
      checked_in_at: '2026-05-04T12:00:00Z', created_at: '2026-05-04T12:00:00Z',
    }
    const older: CheckIn = {
      id: 'c1', goal_id: 'g1', note: 'Older', value: null,
      checked_in_at: '2026-05-03T12:00:00Z', created_at: '2026-05-03T12:00:00Z',
    }
    // API is expected to return newest first; client should preserve order.
    mockFetch.mockResolvedValueOnce(okJson([newer, older]))
    const result = await listCheckIns('g1')
    expect(result[0].id).toBe('c2')
    expect(result[1].id).toBe('c1')
  })
})

describe('createCheckIn payload structure', () => {
  it('includes note and value in payload when both provided', async () => {
    const ci: CheckIn = {
      id: 'c1', goal_id: 'g1', note: 'Good run', value: 5.2,
      checked_in_at: '2026-05-04T00:00:00Z', created_at: '2026-05-04T00:00:00Z',
    }
    mockFetch.mockResolvedValueOnce(okJson(ci))
    await createCheckIn('g1', { note: 'Good run', value: 5.2 })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.note).toBe('Good run')
    expect(body.value).toBe(5.2)
  })

  it('sends only note when value omitted (qualitative check-in)', async () => {
    const ci: CheckIn = {
      id: 'c1', goal_id: 'g1', note: 'Made progress', value: null,
      checked_in_at: '2026-05-04T00:00:00Z', created_at: '2026-05-04T00:00:00Z',
    }
    mockFetch.mockResolvedValueOnce(okJson(ci))
    await createCheckIn('g1', { note: 'Made progress' })
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.note).toBe('Made progress')
    expect(body).not.toHaveProperty('value')
  })

  it('uses correct nested URL /api/v1/goals/:id/checkins', async () => {
    const ci: CheckIn = {
      id: 'c1', goal_id: 'g-target', note: 'Note', value: null,
      checked_in_at: '2026-05-04T00:00:00Z', created_at: '2026-05-04T00:00:00Z',
    }
    mockFetch.mockResolvedValueOnce(okJson(ci))
    await createCheckIn('g-target', { note: 'Note' })
    expect(mockFetch).toHaveBeenCalledWith('/api/v1/goals/g-target/checkins', expect.objectContaining({ method: 'POST' }))
  })

  it('propagates 404 for cross-user check-in attempt', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'not found' }, 404))
    await expect(createCheckIn('other-goal', { note: 'sneaky' })).rejects.toThrow('not found')
  })

  it('propagates validation error for empty note', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'note is required' }, 422))
    await expect(createCheckIn('g1', { note: '' })).rejects.toThrow('note is required')
  })
})

// ─── Derived progress display: types contract ──────────────────────────────────

describe('derived progress: type-level expectations for UI computation', () => {
  it('numeric goal has both current_value and target_value as non-null numbers', async () => {
    mockFetch.mockResolvedValueOnce(okJson([numericGoal]))
    const result = await listGoals()
    // The client should NOT modify these values — UI derives percentage from them.
    expect(result[0].current_value).toBe(20)
    expect(result[0].target_value).toBe(100)
  })

  it('qualitative goal has both current_value and target_value as null', async () => {
    mockFetch.mockResolvedValueOnce(okJson([baseGoal]))
    const result = await listGoals()
    expect(result[0].current_value).toBeNull()
    expect(result[0].target_value).toBeNull()
  })

  it('goal with status=completed has status field set correctly', async () => {
    mockFetch.mockResolvedValueOnce(okJson([completedGoal]))
    const result = await listGoals({ status: 'completed' })
    expect(result[0].status).toBe('completed')
  })

  it('goal with status=abandoned has status field set correctly', async () => {
    mockFetch.mockResolvedValueOnce(okJson([abandonedGoal]))
    const result = await listGoals({ status: 'abandoned' })
    expect(result[0].status).toBe('abandoned')
  })
})
