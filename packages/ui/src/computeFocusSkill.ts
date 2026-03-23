import type { SkillDetail } from '@rpgtracker/api-client'

/**
 * Determines the primary focus skill for the dashboard.
 *
 * Algorithm (spec P4-D3):
 * 1. If primarySkillId matches a skill in the list → use it (user-pinned)
 * 2. If primarySkillId is set but not found → fall through to algorithm
 * 3. Highest current_streak (> 0), treating undefined as 0
 * 4. Tie-break: prefer favourited skills
 * 5. Tie-break: most recently updated (updated_at DESC)
 * 6. Fallback: first by updated_at DESC
 */
export function computeFocusSkill(
  skills: SkillDetail[],
  primarySkillId: string | null,
): SkillDetail | null {
  if (skills.length === 0) return null

  // Step 1: If pinned and exists in list, use it
  if (primarySkillId) {
    const pinned = skills.find(s => s.id === primarySkillId)
    if (pinned) return pinned
  }

  // Steps 3-6: Algorithmic selection
  const sorted = [...skills].sort((a, b) => {
    const streakA = a.current_streak ?? 0
    const streakB = b.current_streak ?? 0

    // Highest streak first
    if (streakB !== streakA) return streakB - streakA

    // Tie-break: favourites first
    if (a.is_favourite !== b.is_favourite) return a.is_favourite ? -1 : 1

    // Tie-break: most recently updated
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  return sorted[0]
}
