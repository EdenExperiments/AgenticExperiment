import type { Fast, MoodLog, WeightLog, WorkoutSession } from '@rpgtracker/api-client'

export function formatElapsed(startedAt: string, now = Date.now()): string {
  const ms = now - new Date(startedAt).getTime()
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  return `${hours}h ${mins}m`
}

export function fastProgress(input: { startedAt: string; targetHours: number; now?: number }): number {
  const now = input.now ?? Date.now()
  if (input.targetHours <= 0) return 0
  const elapsedHours = Math.max(0, (now - new Date(input.startedAt).getTime()) / 3_600_000)
  return Math.min(1, elapsedHours / input.targetHours)
}

export function hubFastValue(fast: Fast | null, now = Date.now()): string {
  if (!fast) return 'None'
  return formatElapsed(fast.started_at, now)
}

export function hubWeightValue(logs: WeightLog[]): string {
  const latest = logs[0]
  if (!latest) return 'None'
  return `${latest.weight_kg} kg`
}

export function hubPantryValue(count: number): string {
  return count === 1 ? '1 item' : `${count} items`
}

export function hubWorkoutValue(current: WorkoutSession | null): string {
  if (!current) return 'None'
  const title = current.title.trim()
  return title.length > 0 ? title : 'In progress'
}

export function hubLastWorkoutValue(history: WorkoutSession[]): string {
  const last = history[0]
  if (!last) return 'None'
  const title = last.title.trim()
  return title.length > 0 ? title : 'Finished'
}

export function hubMoodValue(logs: MoodLog[]): string {
  const latest = logs[0]
  if (!latest) return 'None'
  return String(latest.valence)
}
