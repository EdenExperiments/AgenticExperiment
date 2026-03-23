'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePomodoro } from './usePomodoro'
import { useBrowserNotification } from './useBrowserNotification'
import { useSessionNavigation } from './useSessionNavigation'
import { computeSessionXP, workMinutesFromSeconds } from './sessionXP'
import { SessionConfig, type SessionConfigResult } from './SessionConfig'
import { SessionTimer } from './SessionTimer'
import { SessionEndEarly } from './SessionEndEarly'
import { SessionSummary } from './SessionSummary'

export interface SessionLogData {
  session_type: 'pomodoro' | 'simple'
  status: 'completed' | 'abandoned'
  xp_delta?: number
  planned_duration_sec: number
  actual_duration_sec: number
  log_note?: string
  reflection_what?: string
  reflection_how?: string
  reflection_feeling?: string
  pomodoro_work_sec?: number
  pomodoro_break_sec?: number
  pomodoro_intervals_completed?: number
  pomodoro_intervals_planned?: number
}

export interface SessionLogResult {
  bonusXP: number
  streak?: { current: number; longest: number } | null
}

interface SessionPageProps {
  skillId: string
  skillName: string
  tierColor: string
  tierNumber: number
  requiresActiveUse: boolean
  animationTheme: string
  onLogSession?: (data: SessionLogData) => Promise<SessionLogResult | void>
}

type PagePhase = 'config' | 'timer' | 'end-early' | 'summary'

export function SessionPage({
  skillId,
  skillName,
  tierColor,
  tierNumber,
  onLogSession,
}: SessionPageProps) {
  const router = useRouter()
  const { returnUrl } = useSessionNavigation()
  const notification = useBrowserNotification()

  const [pagePhase, setPagePhase] = useState<PagePhase>('config')
  const [sessionConfig, setSessionConfig] = useState<SessionConfigResult | null>(null)
  const [earnedXP, setEarnedXP] = useState(0)
  const [bonusPercentage, setBonusPercentage] = useState(0)
  const [streakStatus, setStreakStatus] = useState<{ current: number; longest: number } | null>(null)
  const [isAbandoned, setIsAbandoned] = useState(false)

  const pomodoro = usePomodoro(
    sessionConfig
      ? { workSec: sessionConfig.workSec, breakSec: sessionConfig.breakSec, rounds: sessionConfig.rounds }
      : undefined
  )

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start ticking when timer is active
  useEffect(() => {
    if (pagePhase === 'timer' && (pomodoro.state === 'work' || pomodoro.state === 'break')) {
      tickRef.current = setInterval(() => {
        pomodoro.tick()
      }, 250) // Tick every 250ms for smooth countdown
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [pagePhase, pomodoro.state, pomodoro.tick])

  // Watch for state transitions to fire notifications
  const prevStateRef = useRef(pomodoro.state)
  useEffect(() => {
    const prev = prevStateRef.current
    const curr = pomodoro.state

    if (prev !== curr) {
      if (curr === 'break' && prev === 'work') {
        notification.notify({ title: skillName, body: 'Break time! Take a rest.' })
      } else if (curr === 'work' && prev === 'break') {
        notification.notify({ title: skillName, body: 'Back to work!' })
      } else if (curr === 'complete') {
        notification.notify({ title: skillName, body: 'Session complete! Great work.' })
        handleSessionComplete(false)
      }
      prevStateRef.current = curr
    }
  }, [pomodoro.state]) // eslint-disable-line react-hooks/exhaustive-deps

  // beforeunload during active timer
  useEffect(() => {
    if (pagePhase !== 'timer') return
    if (pomodoro.state !== 'work' && pomodoro.state !== 'break') return

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pagePhase, pomodoro.state])

  function handleBegin(config: SessionConfigResult) {
    setSessionConfig(config)
    setPagePhase('timer')
    notification.requestPermission()
    // Start will be called after config state update triggers re-render with new pomodoro config
    // We need to start after the usePomodoro hook re-initializes with new config
    setTimeout(() => pomodoro.start(), 0)
  }

  // Need stable ref for session complete handler
  const handleSessionComplete = useCallback((abandoned: boolean) => {
    setIsAbandoned(abandoned)
    if (!abandoned) {
      const xp = computeSessionXP(workMinutesFromSeconds(pomodoro.elapsedWorkSeconds), tierNumber)
      setEarnedXP(xp)
    } else {
      setEarnedXP(0)
    }
    setPagePhase('summary')
  }, [pomodoro.elapsedWorkSeconds, tierNumber])

  function handleEndEarly() {
    pomodoro.endEarly()
    setPagePhase('end-early')
  }

  function handleKeepGoing() {
    pomodoro.resume()
    setPagePhase('timer')
  }

  function handleClaim() {
    pomodoro.claim()
    handleSessionComplete(false)
  }

  function handleAbandon() {
    pomodoro.abandon()
    handleSessionComplete(true)
  }

  async function handleLogSession(reflections: { what: string; how: string; feeling: string }) {
    const status: 'completed' | 'abandoned' = isAbandoned ? 'abandoned' : 'completed'
    const data: SessionLogData = {
      session_type: sessionConfig?.type ?? 'pomodoro',
      status,
      xp_delta: earnedXP > 0 ? earnedXP : undefined,
      planned_duration_sec: sessionConfig
        ? sessionConfig.workSec * sessionConfig.rounds + sessionConfig.breakSec * (sessionConfig.rounds - 1)
        : 0,
      actual_duration_sec: pomodoro.elapsedWorkSeconds,
      log_note: reflections.what || undefined,
      reflection_what: reflections.what || undefined,
      reflection_how: reflections.how || undefined,
      reflection_feeling: reflections.feeling || undefined,
      pomodoro_work_sec: sessionConfig?.workSec,
      pomodoro_break_sec: sessionConfig?.breakSec,
      pomodoro_intervals_completed: pomodoro.currentRound,
      pomodoro_intervals_planned: sessionConfig?.rounds,
    }

    try {
      if (onLogSession) {
        const result = await onLogSession(data)
        if (result) {
          if (result.streak) setStreakStatus(result.streak)
          if (result.bonusXP > 0 && earnedXP > 0) {
            setBonusPercentage(Math.round((result.bonusXP / earnedXP) * 100))
          }
        }
      }
    } catch {
      // If API fails, still navigate
    }
    router.push(returnUrl)
  }

  // ── Render based on phase ───────────────────────────────

  if (pagePhase === 'config') {
    return (
      <SessionConfig
        skillName={skillName}
        tierColor={tierColor}
        onBegin={handleBegin}
        onCancel={() => router.push(returnUrl)}
      />
    )
  }

  if (pagePhase === 'end-early') {
    return (
      <SessionEndEarly
        elapsedSeconds={pomodoro.elapsedWorkSeconds}
        tierColor={tierColor}
        onKeepGoing={handleKeepGoing}
        onClaim={handleClaim}
        onAbandon={handleAbandon}
      />
    )
  }

  if (pagePhase === 'summary') {
    return (
      <SessionSummary
        earnedXP={earnedXP}
        bonusPercentage={bonusPercentage}
        streakStatus={streakStatus}
        durationSeconds={pomodoro.elapsedWorkSeconds}
        intervalsCompleted={pomodoro.currentRound}
        intervalsPlanned={sessionConfig?.rounds}
        returnUrl={returnUrl}
        onSubmit={handleLogSession}
      />
    )
  }

  // Timer phase
  return (
    <SessionTimer
      phase={pomodoro.state === 'break' ? 'break' : 'work'}
      remainingSeconds={pomodoro.remainingSeconds}
      currentRound={pomodoro.currentRound}
      totalRounds={pomodoro.totalRounds}
      skillName={skillName}
      tierColor={tierColor}
      tierNumber={tierNumber}
      elapsedWorkSeconds={pomodoro.elapsedWorkSeconds}
      isPaused={pomodoro.state === 'paused'}
      totalWorkSec={sessionConfig?.workSec ?? 1500}
      totalBreakSec={sessionConfig?.breakSec ?? 300}
      onEndEarly={handleEndEarly}
      onPause={pomodoro.pause}
      onResume={pomodoro.resume}
    />
  )
}
