/**
 * Compute XP earned from a training session.
 * Formula: Math.floor(workMinutes * 3 * (1 + 0.4 * (tierNumber - 1)))
 * Per decision D-034.
 */
export function computeSessionXP(workMinutes: number, tierNumber: number): number {
  return Math.floor(workMinutes * 3 * (1 + 0.4 * (tierNumber - 1)))
}

/**
 * Convert elapsed work seconds to minutes.
 */
export function workMinutesFromSeconds(elapsedWorkSeconds: number): number {
  return elapsedWorkSeconds / 60
}
