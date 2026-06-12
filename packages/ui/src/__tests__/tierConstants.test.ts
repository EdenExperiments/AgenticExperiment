import {
  TIERS,
  GATE_LEVELS,
  TIER_COLOR_CSS,
  getTierForLevel,
  tierColor,
} from '../tierConstants'

test('TIERS has 11 entries covering levels 1–200 without gaps', () => {
  expect(TIERS).toHaveLength(11)
  expect(TIERS[0].minLevel).toBe(1)
  expect(TIERS[TIERS.length - 1].maxLevel).toBe(200)

  for (let i = 0; i < TIERS.length - 1; i++) {
    expect(TIERS[i].maxLevel + 1).toBe(TIERS[i + 1].minLevel)
  }

  for (let level = 1; level <= 200; level++) {
    const tier = getTierForLevel(level)
    expect(level).toBeGreaterThanOrEqual(tier.minLevel)
    expect(level).toBeLessThanOrEqual(tier.maxLevel)
  }
})

test('Legend tier has gateLevel null', () => {
  const legend = TIERS.find((t) => t.name === 'Legend')
  expect(legend).toBeDefined()
  expect(legend!.gateLevel).toBeNull()
})

test('GATE_LEVELS equals expected boundary levels', () => {
  expect([...GATE_LEVELS]).toEqual([9, 19, 29, 39, 49, 59, 69, 79, 89, 99])
})

test('getTierForLevel maps key levels to correct tier names', () => {
  expect(getTierForLevel(1).name).toBe('Novice')
  expect(getTierForLevel(10).name).toBe('Apprentice')
  expect(getTierForLevel(100).name).toBe('Legend')
})

test('each tier has a unique colorVar matching --color-tier-* pattern', () => {
  const colorVars = TIERS.map((t) => t.colorVar)
  expect(new Set(colorVars).size).toBe(11)
  for (const tier of TIERS) {
    expect(tier.colorVar).toMatch(/^--color-tier-[a-z]+$/)
  }
})

test('TIER_COLOR_CSS contains all 11 --color-tier-* definitions', () => {
  for (const tier of TIERS) {
    expect(TIER_COLOR_CSS).toContain(`${tier.colorVar}:`)
  }
})

test('tierColor returns var(--color-tier-...) for each tier', () => {
  for (const tier of TIERS) {
    expect(tierColor(tier)).toBe(`var(${tier.colorVar})`)
  }
})
