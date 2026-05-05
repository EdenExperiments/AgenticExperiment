// Wave 3 T15 — AI contract regression tests for the api-client layer.
//
// These tests pin the URL, method, request body shape, and error handling
// for planGoal (POST /api/v1/goals/plan) and getGoalForecast
// (GET /api/v1/goals/{id}/forecast). They serve as a regression guard
// against any future refactoring that silently changes the wire format.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { planGoal, getGoalForecast } from '../client'
import type { PlanGoalResponse, GoalForecast } from '../types'

const mockFetch = vi.fn()
global.fetch = mockFetch as typeof fetch

beforeEach(() => {
  mockFetch.mockReset()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}

function errJson(body: unknown, status = 400) {
  return { ok: false, status, json: async () => body }
}

const validPlanResponse: PlanGoalResponse = {
  plan: {
    objective: 'Run a 5k in under 30 minutes.',
    milestones: [
      { title: 'Run 1k', description: 'Week 1', week_offset: 1 },
      { title: 'Run 5k', description: 'Goal', week_offset: 8 },
    ],
    weekly_cadence: ['3 runs per week', 'Rest on weekends'],
    risks: ['Injury risk'],
    fallback_plan: 'Walk-run intervals if needed.',
  },
  degraded_response: false,
}

const degradedPlanResponse: PlanGoalResponse = {
  plan: {
    objective: 'Unable to parse AI-generated plan. Please try again.',
    milestones: [{ title: 'Define your first concrete step', description: '', week_offset: 0 }],
    weekly_cadence: ['Break your goal into small daily tasks.'],
    risks: ['Plan could not be generated automatically.'],
    fallback_plan: 'Work toward your goal using small, consistent daily actions.',
  },
  degraded_response: true,
}

const validForecast: GoalForecast = {
  track_state: 'on_track',
  confidence_score: 0.82,
  drift_pct: 5,
  drift_direction: 'ahead',
  expected_progress: 40,
  actual_progress: 45,
  milestone_done_ratio: 0.5,
  checkin_count: 3,
  days_remaining: 180,
  recommend_checkin: false,
  recommend_review: false,
  recommend_stretch: true,
}

// ─── planGoal — URL and method contract ────────────────────────────────────────

describe('planGoal — URL and method', () => {
  it('calls POST /api/v1/goals/plan', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validPlanResponse))
    await planGoal({ goal_statement: 'Run a 5k' })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/goals/plan',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends JSON body with goal_statement', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validPlanResponse))
    await planGoal({ goal_statement: 'Learn Spanish' })
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/goals/plan',
      expect.objectContaining({
        body: JSON.stringify({ goal_statement: 'Learn Spanish' }),
      }),
    )
  })

  it('includes deadline in body when provided', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validPlanResponse))
    await planGoal({ goal_statement: 'Run a 5k', deadline: '2026-12-31T00:00:00.000Z' })
    const [[, opts]] = mockFetch.mock.calls
    const body = JSON.parse(opts.body as string)
    expect(body.deadline).toBe('2026-12-31T00:00:00.000Z')
  })

  it('includes context in body when provided', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validPlanResponse))
    await planGoal({ goal_statement: 'Run a 5k', context: 'Beginner runner' })
    const [[, opts]] = mockFetch.mock.calls
    const body = JSON.parse(opts.body as string)
    expect(body.context).toBe('Beginner runner')
  })

  it('omits deadline and context when not provided', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validPlanResponse))
    await planGoal({ goal_statement: 'Read 12 books' })
    const [[, opts]] = mockFetch.mock.calls
    const body = JSON.parse(opts.body as string)
    expect(body.deadline).toBeUndefined()
    expect(body.context).toBeUndefined()
  })
})

// ─── planGoal — response shape contract ───────────────────────────────────────

describe('planGoal — response shape', () => {
  it('returns plan and degraded_response=false on success', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validPlanResponse))
    const result = await planGoal({ goal_statement: 'Run a 5k' })
    expect(result.degraded_response).toBe(false)
    expect(result.plan).toBeDefined()
    expect(result.plan.objective).toBe('Run a 5k in under 30 minutes.')
  })

  it('returns degraded_response=true on degraded response', async () => {
    mockFetch.mockResolvedValueOnce(okJson(degradedPlanResponse))
    const result = await planGoal({ goal_statement: 'Ambiguous goal' })
    expect(result.degraded_response).toBe(true)
    expect(result.plan).toBeDefined()
    expect(result.plan.fallback_plan).not.toBe('')
  })

  it('plan.milestones is an array', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validPlanResponse))
    const result = await planGoal({ goal_statement: 'Run a 5k' })
    expect(Array.isArray(result.plan.milestones)).toBe(true)
  })

  it('plan.risks is an array', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validPlanResponse))
    const result = await planGoal({ goal_statement: 'Run a 5k' })
    expect(Array.isArray(result.plan.risks)).toBe(true)
  })

  it('plan.weekly_cadence is an array', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validPlanResponse))
    const result = await planGoal({ goal_statement: 'Run a 5k' })
    expect(Array.isArray(result.plan.weekly_cadence)).toBe(true)
  })

  it('plan.fallback_plan is a string', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validPlanResponse))
    const result = await planGoal({ goal_statement: 'Run a 5k' })
    expect(typeof result.plan.fallback_plan).toBe('string')
  })
})

// ─── planGoal — error handling contract ───────────────────────────────────────

describe('planGoal — error handling', () => {
  it('throws on 402 (no API key) with error message', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'no AI key configured' }, 402))
    await expect(planGoal({ goal_statement: 'Run a 5k' })).rejects.toThrow()
  })

  it('throws on 422 (invalid input)', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'goal_statement is required' }, 422))
    await expect(planGoal({ goal_statement: '' })).rejects.toThrow('goal_statement is required')
  })

  it('throws on 429 (rate limit)', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'Claude API rate limit reached' }, 429))
    await expect(planGoal({ goal_statement: 'Build a SaaS' })).rejects.toThrow()
  })

  it('throws on 502 (AI unavailable)', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'AI planner unavailable' }, 502))
    await expect(planGoal({ goal_statement: 'Get fit' })).rejects.toThrow()
  })

  it('throws on 401 (unauthorized)', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'unauthorized' }, 401))
    await expect(planGoal({ goal_statement: 'Run' })).rejects.toThrow()
  })

  it('throws on 500 (server error)', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'internal server error' }, 500))
    await expect(planGoal({ goal_statement: 'Run' })).rejects.toThrow()
  })

  it('propagates the server error message in the thrown error', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'goal_statement is required' }, 422))
    await expect(planGoal({ goal_statement: '' })).rejects.toThrow('goal_statement is required')
  })
})

// ─── getGoalForecast — URL and method contract ─────────────────────────────────

describe('getGoalForecast — URL and method', () => {
  it('calls GET /api/v1/goals/{id}/forecast', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    await getGoalForecast('goal-123')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/goals/goal-123/forecast',
      expect.anything(),
    )
  })

  it('interpolates goalId into the URL path', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    await getGoalForecast('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/goals/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/forecast',
      expect.anything(),
    )
  })

  it('uses GET method (no body)', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    await getGoalForecast('g1')
    const [[, opts]] = mockFetch.mock.calls
    // GET should not have POST/PUT/DELETE method
    const method = (opts as RequestInit)?.method
    if (method) {
      expect(method.toUpperCase()).toBe('GET')
    }
    // body should not be set for GET
    expect((opts as RequestInit)?.body).toBeUndefined()
  })
})

// ─── getGoalForecast — response shape contract ────────────────────────────────

describe('getGoalForecast — response shape', () => {
  it('returns a GoalForecast with track_state', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    const result = await getGoalForecast('g1')
    expect(result.track_state).toBe('on_track')
  })

  it('returns confidence_score as number in [0,1]', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    const result = await getGoalForecast('g1')
    expect(typeof result.confidence_score).toBe('number')
    expect(result.confidence_score).toBeGreaterThanOrEqual(0)
    expect(result.confidence_score).toBeLessThanOrEqual(1)
  })

  it('returns drift_pct as number', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    const result = await getGoalForecast('g1')
    expect(typeof result.drift_pct).toBe('number')
  })

  it('returns drift_direction as string', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    const result = await getGoalForecast('g1')
    expect(typeof result.drift_direction).toBe('string')
  })

  it('returns recommend_checkin as boolean', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    const result = await getGoalForecast('g1')
    expect(typeof result.recommend_checkin).toBe('boolean')
  })

  it('returns recommend_review as boolean', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    const result = await getGoalForecast('g1')
    expect(typeof result.recommend_review).toBe('boolean')
  })

  it('returns recommend_stretch as boolean', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    const result = await getGoalForecast('g1')
    expect(typeof result.recommend_stretch).toBe('boolean')
  })

  it('returns checkin_count as number', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    const result = await getGoalForecast('g1')
    expect(typeof result.checkin_count).toBe('number')
  })

  it('returns days_remaining as number', async () => {
    mockFetch.mockResolvedValueOnce(okJson(validForecast))
    const result = await getGoalForecast('g1')
    expect(typeof result.days_remaining).toBe('number')
  })

  it('handles all valid track_state values', async () => {
    const validStates = ['on_track', 'at_risk', 'behind', 'complete', 'unknown'] as const
    for (const state of validStates) {
      mockFetch.mockResolvedValueOnce(okJson({ ...validForecast, track_state: state }))
      const result = await getGoalForecast('g1')
      expect(result.track_state).toBe(state)
    }
  })

  it('handles completed goal with confidence_score=1.0', async () => {
    mockFetch.mockResolvedValueOnce(okJson({
      ...validForecast,
      track_state: 'complete',
      confidence_score: 1.0,
      recommend_checkin: false,
      recommend_review: false,
      recommend_stretch: false,
    }))
    const result = await getGoalForecast('g1')
    expect(result.track_state).toBe('complete')
    expect(result.confidence_score).toBe(1.0)
  })
})

// ─── getGoalForecast — error handling contract ─────────────────────────────────

describe('getGoalForecast — error handling', () => {
  it('throws on 404 (goal not found)', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'goal not found' }, 404))
    await expect(getGoalForecast('missing')).rejects.toThrow('goal not found')
  })

  it('throws on 401 (unauthorized)', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'unauthorized' }, 401))
    await expect(getGoalForecast('g1')).rejects.toThrow()
  })

  it('throws on 500 (server error)', async () => {
    mockFetch.mockResolvedValueOnce(errJson({ error: 'internal server error' }, 500))
    await expect(getGoalForecast('g1')).rejects.toThrow()
  })
})
