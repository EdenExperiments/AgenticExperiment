/**
 * Tier constants — single source of truth for D-014/D-016/D-020.
 *
 * 11 tiers (Novice through Legend) with 10 gate boundary levels.
 * Tier colours follow the cold→warm→gold arc from D-020.
 *
 * Colours are expressed as CSS custom property names. Components consume
 * them via `var(--color-tier-novice)` etc. The actual hex values are
 * injected by `TierColorVars` (a <style> block) — theme-independent
 * because D-020 is constant across all themes.
 */

export interface Tier {
  number: number
  name: string
  minLevel: number
  maxLevel: number
  gateLevel: number | null
  /** CSS custom property name, e.g. '--color-tier-novice' */
  colorVar: string
}

export const TIERS: Tier[] = [
  { number: 1,  name: 'Novice',       minLevel: 1,   maxLevel: 9,   gateLevel: 9,   colorVar: '--color-tier-novice' },
  { number: 2,  name: 'Apprentice',   minLevel: 10,  maxLevel: 19,  gateLevel: 19,  colorVar: '--color-tier-apprentice' },
  { number: 3,  name: 'Adept',        minLevel: 20,  maxLevel: 29,  gateLevel: 29,  colorVar: '--color-tier-adept' },
  { number: 4,  name: 'Journeyman',   minLevel: 30,  maxLevel: 39,  gateLevel: 39,  colorVar: '--color-tier-journeyman' },
  { number: 5,  name: 'Practitioner', minLevel: 40,  maxLevel: 49,  gateLevel: 49,  colorVar: '--color-tier-practitioner' },
  { number: 6,  name: 'Expert',       minLevel: 50,  maxLevel: 59,  gateLevel: 59,  colorVar: '--color-tier-expert' },
  { number: 7,  name: 'Veteran',      minLevel: 60,  maxLevel: 69,  gateLevel: 69,  colorVar: '--color-tier-veteran' },
  { number: 8,  name: 'Elite',        minLevel: 70,  maxLevel: 79,  gateLevel: 79,  colorVar: '--color-tier-elite' },
  { number: 9,  name: 'Master',       minLevel: 80,  maxLevel: 89,  gateLevel: 89,  colorVar: '--color-tier-master' },
  { number: 10, name: 'Grandmaster',  minLevel: 90,  maxLevel: 99,  gateLevel: 99,  colorVar: '--color-tier-grandmaster' },
  { number: 11, name: 'Legend',       minLevel: 100, maxLevel: 200, gateLevel: null, colorVar: '--color-tier-legend' },
]

export const GATE_LEVELS = [9, 19, 29, 39, 49, 59, 69, 79, 89, 99] as const

export function getTierForLevel(level: number): Tier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (level >= TIERS[i].minLevel) return TIERS[i]
  }
  return TIERS[0]
}

/**
 * D-020 tier colour definitions as CSS custom properties.
 * Theme-independent — same colours across all themes.
 * Render this once in the app root or layout.
 */
export const TIER_COLOR_CSS = `:root {
  --color-tier-novice: #9ca3af;
  --color-tier-apprentice: #3b82f6;
  --color-tier-adept: #14b8a6;
  --color-tier-journeyman: #22c55e;
  --color-tier-practitioner: #84cc16;
  --color-tier-expert: #9333ea;
  --color-tier-veteran: #c026d3;
  --color-tier-elite: #d97706;
  --color-tier-master: #ea580c;
  --color-tier-grandmaster: #dc2626;
  --color-tier-legend: #eab308;
}`

/** Helper to get the CSS var() value for a tier */
export function tierColor(tier: Tier): string {
  return `var(${tier.colorVar})`
}
