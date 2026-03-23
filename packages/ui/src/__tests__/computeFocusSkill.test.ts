import { describe, it, expect } from 'vitest'
import type { SkillDetail } from '@rpgtracker/api-client'
import { computeFocusSkill } from '../computeFocusSkill'

function makeSkill(overrides: {
  id: string
  current_streak?: number
  is_favourite?: boolean
  updated_at?: string
}): SkillDetail {
  return {
    id: overrides.id,
    user_id: 'user-1',
    name: `Skill ${overrides.id}`,
    description: '',
    unit: 'rep',
    preset_id: null,
    category_id: null,
    category_name: null,
    category_slug: null,
    category_emoji: null,
    tags: [],
    starting_level: 1,
    current_xp: 0,
    current_level: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
    is_favourite: overrides.is_favourite ?? false,
    current_streak: overrides.current_streak ?? 0,
    effective_level: 1,
    quick_log_chips: [10, 25, 50, 100],
    tier_name: 'Novice',
    tier_number: 1,
    gates: [],
    recent_logs: [],
    xp_to_next_level: 100,
    xp_for_current_level: 0,
  } as SkillDetail
}

describe('computeFocusSkill — AC-L6: algorithmic fallback', () => {

  it('returns the pinned skill when primary_skill_id matches a skill in the list', () => {
    const pinned = makeSkill({ id: 'skill-pinned', current_streak: 0 })
    const other = makeSkill({ id: 'skill-other', current_streak: 10 })
    const result = computeFocusSkill([other, pinned], 'skill-pinned')
    expect(result?.id).toBe('skill-pinned')
  })

  it('falls through to algorithm when primary_skill_id is not found in the skills list', () => {
    const highStreak = makeSkill({ id: 'skill-a', current_streak: 7 })
    const lowStreak = makeSkill({ id: 'skill-b', current_streak: 1 })
    const result = computeFocusSkill([lowStreak, highStreak], 'skill-missing')
    expect(result?.id).toBe('skill-a')
  })

  it('selects the skill with the highest current_streak, treating undefined as 0', () => {
    const noStreak = makeSkill({ id: 'skill-no-streak' })
    const lowStreak = makeSkill({ id: 'skill-low', current_streak: 2 })
    const highStreak = makeSkill({ id: 'skill-high', current_streak: 5 })
    const result = computeFocusSkill([noStreak, highStreak, lowStreak], null)
    expect(result?.id).toBe('skill-high')
  })

  it('prefers a favourited skill when two skills have equal current_streak', () => {
    const updated = '2026-03-01T00:00:00Z'
    const notFav = makeSkill({ id: 'skill-not-fav', current_streak: 3, is_favourite: false, updated_at: updated })
    const fav = makeSkill({ id: 'skill-fav', current_streak: 3, is_favourite: true, updated_at: updated })
    const result = computeFocusSkill([notFav, fav], null)
    expect(result?.id).toBe('skill-fav')
  })

  it('prefers the most recently updated skill when streak and favourite are tied', () => {
    const older = makeSkill({ id: 'skill-older', current_streak: 3, is_favourite: true, updated_at: '2026-02-01T00:00:00Z' })
    const newer = makeSkill({ id: 'skill-newer', current_streak: 3, is_favourite: true, updated_at: '2026-03-15T00:00:00Z' })
    const result = computeFocusSkill([older, newer], null)
    expect(result?.id).toBe('skill-newer')
  })

  it('returns the most recently updated skill when all skills have zero streak', () => {
    const old = makeSkill({ id: 'skill-old', current_streak: 0, updated_at: '2026-01-01T00:00:00Z' })
    const mid = makeSkill({ id: 'skill-mid', current_streak: 0, updated_at: '2026-02-01T00:00:00Z' })
    const recent = makeSkill({ id: 'skill-recent', current_streak: 0, updated_at: '2026-03-20T00:00:00Z' })
    const result = computeFocusSkill([old, recent, mid], null)
    expect(result?.id).toBe('skill-recent')
  })

  it('returns null when the skills array is empty', () => {
    const result = computeFocusSkill([], null)
    expect(result).toBeNull()
  })

  it('returns the single skill regardless of its streak or favourite status', () => {
    const skill = makeSkill({ id: 'skill-only', current_streak: 0, is_favourite: false })
    const result = computeFocusSkill([skill], null)
    expect(result?.id).toBe('skill-only')
  })

  it('uses the algorithm when primary_skill_id is null', () => {
    const low = makeSkill({ id: 'skill-low', current_streak: 1 })
    const high = makeSkill({ id: 'skill-high', current_streak: 8 })
    const result = computeFocusSkill([low, high], null)
    expect(result?.id).toBe('skill-high')
  })

})
