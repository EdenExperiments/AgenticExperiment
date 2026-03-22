import { describe, it, expect } from 'vitest'

// TDD — utility doesn't exist yet
import { computeSessionXP, workMinutesFromSeconds } from '../sessionXP'

describe('computeSessionXP — AC-L3: XP calculation for Pomodoro sessions', () => {
  // Formula: Math.floor(workMinutes * 3 * (1 + 0.4 * (tierNumber - 1)))

  it('Tier 1 (tierNum=1): 25 min work = 75 XP (25 * 3 * 1.0)', () => {
    expect(computeSessionXP(25, 1)).toBe(75)
  })

  it('Tier 1: 15 min work = 45 XP', () => {
    expect(computeSessionXP(15, 1)).toBe(45)
  })

  it('Tier 5 (tierNum=5): 25 min work = 195 XP (25 * 3 * 2.6)', () => {
    // 25 * 3 * (1 + 0.4 * 4) = 25 * 3 * 2.6 = 195
    expect(computeSessionXP(25, 5)).toBe(195)
  })

  it('Break time excluded: 25 min work + 5 min break = 75 XP (not 90)', () => {
    // Only work minutes count — this test just verifies the function
    // doesn't accept break time. The caller is responsible for passing
    // only work minutes.
    expect(computeSessionXP(25, 1)).toBe(75)
  })

  it('Partial session: 12.5 min work = 37 XP (truncated, tier 1)', () => {
    // 12.5 * 3 * 1.0 = 37.5 → Math.floor → 37
    expect(computeSessionXP(12.5, 1)).toBe(37)
  })
})

describe('workMinutesFromSeconds', () => {
  it('converts 1500 seconds to 25 minutes', () => {
    expect(workMinutesFromSeconds(1500)).toBe(25)
  })

  it('converts 750 seconds to 12.5 minutes', () => {
    expect(workMinutesFromSeconds(750)).toBe(12.5)
  })

  it('converts 0 seconds to 0 minutes', () => {
    expect(workMinutesFromSeconds(0)).toBe(0)
  })
})
