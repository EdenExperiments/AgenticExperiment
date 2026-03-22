'use client'

import { useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getSkill, createSession } from '@rpgtracker/api-client'
import { SessionPage } from '@rpgtracker/ui'
import type { SessionLogData, SessionLogResult } from '@rpgtracker/ui'

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

  const handleLogSession = useCallback(async (data: SessionLogData): Promise<SessionLogResult> => {
    const result = await createSession(skillId, {
      session_type: data.session_type === 'simple' ? 'manual' : 'pomodoro',
      status: data.status,
      xp_delta: data.xp_delta,
      planned_duration_sec: data.planned_duration_sec,
      actual_duration_sec: data.actual_duration_sec,
      log_note: data.log_note,
      reflection_what: data.reflection_what,
      reflection_how: data.reflection_how,
      reflection_feeling: data.reflection_feeling,
      pomodoro_work_sec: data.pomodoro_work_sec,
      pomodoro_break_sec: data.pomodoro_break_sec,
      pomodoro_intervals_completed: data.pomodoro_intervals_completed,
      pomodoro_intervals_planned: data.pomodoro_intervals_planned,
    })

    const streak = result.streak as { current: number; longest: number } | null
    return {
      bonusXP: result.session.bonus_xp,
      streak,
    }
  }, [skillId])

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
      onLogSession={handleLogSession}
    />
  )
}
