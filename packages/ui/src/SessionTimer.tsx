'use client'

import { useEffect, useState } from 'react'
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
  onEndEarly: () => void
  onPause: () => void
  onResume: () => void
}

function getTheme(): string {
  if (typeof document === 'undefined') return 'minimal'
  return document.documentElement.getAttribute('data-theme') ?? 'minimal'
}

export function SessionTimer(props: SessionTimerProps) {
  const [theme, setTheme] = useState('minimal')

  useEffect(() => {
    setTheme(getTheme())

    const observer = new MutationObserver(() => {
      setTheme(getTheme())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  const commonProps = {
    phase: props.phase,
    remainingSeconds: props.remainingSeconds,
    currentRound: props.currentRound,
    totalRounds: props.totalRounds,
    skillName: props.skillName,
    elapsedWorkSeconds: props.elapsedWorkSeconds,
    isPaused: props.isPaused,
    onEndEarly: props.onEndEarly,
    onPause: props.onPause,
    onResume: props.onResume,
  }

  if (theme === 'retro') {
    return <SessionTimerRetro {...commonProps} tierNumber={props.tierNumber} />
  }

  if (theme === 'modern') {
    return <SessionTimerModern {...commonProps} totalWorkSec={props.totalWorkSec} />
  }

  return <SessionTimerMinimal {...commonProps} />
}
