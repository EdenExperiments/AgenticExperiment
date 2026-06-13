'use client'

import { useDocumentTheme } from './useDocumentTheme'
import { SessionTimerMinimal } from './SessionTimerMinimal'
import { SessionTimerRetro } from './SessionTimerRetro'
import { SessionTimerModern } from './SessionTimerModern'

interface SessionTimerProps {
  phase: 'work' | 'break'
  remainingSeconds: number
  currentRound: number
  totalRounds: number
  skillName: string
  tierColor: string
  tierNumber: number
  elapsedWorkSeconds: number
  isPaused: boolean
  totalWorkSec: number
  totalBreakSec: number
  isSimple?: boolean
  onEndEarly: () => void
  onPause: () => void
  onResume: () => void
}

export function SessionTimer(props: SessionTimerProps) {
  const { theme } = useDocumentTheme()

  const commonProps = {
    phase: props.phase,
    remainingSeconds: props.remainingSeconds,
    currentRound: props.currentRound,
    totalRounds: props.totalRounds,
    skillName: props.skillName,
    elapsedWorkSeconds: props.elapsedWorkSeconds,
    isPaused: props.isPaused,
    isSimple: props.isSimple,
    onEndEarly: props.onEndEarly,
    onPause: props.onPause,
    onResume: props.onResume,
  }

  if (theme === 'retro') {
    return <SessionTimerRetro {...commonProps} tierNumber={props.tierNumber} />
  }

  if (theme === 'modern') {
    return (
      <SessionTimerModern
        {...commonProps}
        totalWorkSec={props.totalWorkSec}
        totalBreakSec={props.totalBreakSec}
      />
    )
  }

  return <SessionTimerMinimal {...commonProps} />
}
