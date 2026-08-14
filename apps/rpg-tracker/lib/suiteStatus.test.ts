import { describe, expect, test } from 'vitest'
import {
  fastProgress,
  formatElapsed,
  hubFastValue,
  hubLastWorkoutValue,
  hubMoodValue,
  hubPantryValue,
  hubWeightValue,
  hubWorkoutValue,
} from './suiteStatus'
import type { Fast, MoodLog, WeightLog, WorkoutSession } from '@rpgtracker/api-client'

const now = Date.parse('2026-08-14T12:00:00Z')

function fast(overrides: Partial<Fast> = {}): Fast {
  return {
    id: 'f1',
    started_at: '2026-08-14T10:00:00Z',
    target_hours: 16,
    created_at: '2026-08-14T10:00:00Z',
    ...overrides,
  }
}

function session(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 's1',
    title: 'Lower body',
    started_at: '2026-08-14T09:00:00Z',
    created_at: '2026-08-14T09:00:00Z',
    sets: [],
    set_count: 0,
    rep_count: 0,
    volume_kg: 0,
    ...overrides,
  }
}

test('formatElapsed counts whole minutes', () => {
  expect(formatElapsed('2026-08-14T10:05:00Z', now)).toBe('1h 55m')
})

test('fastProgress caps at 1 past the target', () => {
  expect(fastProgress({ startedAt: '2026-08-14T10:00:00Z', targetHours: 16, now })).toBe(2 / 16)
  expect(fastProgress({ startedAt: '2026-08-13T10:00:00Z', targetHours: 16, now })).toBe(1)
  expect(fastProgress({ startedAt: '2026-08-14T12:00:00Z', targetHours: 0, now })).toBe(0)
})

describe('hub values stay honest when empty', () => {
  test('fast none vs elapsed', () => {
    expect(hubFastValue(null, now)).toBe('None')
    expect(hubFastValue(fast(), now)).toBe('2h 0m')
  })

  test('weight and pantry', () => {
    expect(hubWeightValue([])).toBe('None')
    expect(hubWeightValue([{ id: 'w1', weight_kg: 72.5, note: '', measured_at: '', created_at: '' } satisfies WeightLog])).toBe('72.5 kg')
    expect(hubPantryValue(0)).toBe('0 items')
    expect(hubPantryValue(1)).toBe('1 item')
    expect(hubPantryValue(3)).toBe('3 items')
  })

  test('workout and mood', () => {
    expect(hubWorkoutValue(null)).toBe('None')
    expect(hubWorkoutValue(session())).toBe('Lower body')
    expect(hubWorkoutValue(session({ title: '   ' }))).toBe('In progress')
    expect(hubLastWorkoutValue([])).toBe('None')
    expect(hubLastWorkoutValue([session({ title: 'Push' })])).toBe('Push')
    expect(hubMoodValue([])).toBe('None')
    expect(hubMoodValue([{ id: 'm1', logged_at: '', valence: 4, energy: 2, note: '', created_at: '' } satisfies MoodLog])).toBe('4')
  })
})
