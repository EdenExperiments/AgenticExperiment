/**
 * Tier constants — single source of truth for D-014/D-016/D-020.
 *
 * 11 tiers (Novice through Legend) with 10 gate boundary levels.
 * Tier colours follow the cold→warm→gold arc from D-020.
 */

export interface Tier {
  number: number
  name: string
  minLevel: number
  maxLevel: number
  gateLevel: number | null // Legend (tier 11) has no gate within the picker range
  color: string // D-020 primary colour for badges/accents
}

export const TIERS: Tier[] = [
  { number: 1,  name: 'Novice',       minLevel: 1,   maxLevel: 9,   gateLevel: 9,   color: '#9ca3af' },
  { number: 2,  name: 'Apprentice',   minLevel: 10,  maxLevel: 19,  gateLevel: 19,  color: '#3b82f6' },
  { number: 3,  name: 'Adept',        minLevel: 20,  maxLevel: 29,  gateLevel: 29,  color: '#14b8a6' },
  { number: 4,  name: 'Journeyman',   minLevel: 30,  maxLevel: 39,  gateLevel: 39,  color: '#22c55e' },
  { number: 5,  name: 'Practitioner', minLevel: 40,  maxLevel: 49,  gateLevel: 49,  color: '#84cc16' },
  { number: 6,  name: 'Expert',       minLevel: 50,  maxLevel: 59,  gateLevel: 59,  color: '#9333ea' },
  { number: 7,  name: 'Veteran',      minLevel: 60,  maxLevel: 69,  gateLevel: 69,  color: '#c026d3' },
  { number: 8,  name: 'Elite',        minLevel: 70,  maxLevel: 79,  gateLevel: 79,  color: '#d97706' },
  { number: 9,  name: 'Master',       minLevel: 80,  maxLevel: 89,  gateLevel: 89,  color: '#ea580c' },
  { number: 10, name: 'Grandmaster',  minLevel: 90,  maxLevel: 99,  gateLevel: 99,  color: '#dc2626' },
  { number: 11, name: 'Legend',       minLevel: 100, maxLevel: 200, gateLevel: null, color: '#eab308' },
]

export const GATE_LEVELS = [9, 19, 29, 39, 49, 59, 69, 79, 89, 99] as const

export function getTierForLevel(level: number): Tier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (level >= TIERS[i].minLevel) return TIERS[i]
  }
  return TIERS[0]
}
