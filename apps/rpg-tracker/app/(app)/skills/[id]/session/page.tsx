'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getSkill } from '@rpgtracker/api-client'
import { SessionPage } from '@rpgtracker/ui'

const TIER_COLORS: Record<number, string> = {
  1: '#6B7280', // Novice — gray
  2: '#3B82F6', // Apprentice — blue
  3: '#10B981', // Journeyman — green
  4: '#8B5CF6', // Expert — purple
  5: '#F59E0B', // Artisan — amber
  6: '#EF4444', // Master — red
  7: '#EC4899', // Grandmaster — pink
  8: '#14B8A6', // Legend — teal
  9: '#D4A017', // Paragon — gold
  10: '#9333EA', // Transcendent — violet
  11: '#DC2626', // Mythic — deep red
}

export default function SessionRoutePage() {
  const params = useParams()
  const skillId = params.id as string

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skills', skillId],
    queryFn: () => getSkill(skillId),
  })

  if (isLoading || !skill) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <p style={{ color: 'var(--color-muted)' }}>Loading...</p>
      </div>
    )
  }

  return (
    <SessionPage
      skillId={skillId}
      skillName={skill.name}
      tierColor={TIER_COLORS[skill.tier_number] ?? '#6B7280'}
      tierNumber={skill.tier_number}
      requiresActiveUse={skill.requires_active_use ?? false}
      animationTheme={skill.animation_theme ?? 'minimal'}
    />
  )
}
