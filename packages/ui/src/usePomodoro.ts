'use client'

import { useState, useCallback, useRef } from 'react'

export type PomodoroState = 'idle' | 'work' | 'break' | 'paused' | 'end-early' | 'complete' | 'abandoned'

export interface PomodoroConfig {
  workSec?: number
  breakSec?: number
  rounds?: number
}

interface PomodoroResult {
  state: PomodoroState
  currentRound: number
  totalRounds: number
  elapsedWorkSeconds: number
  remainingSeconds: number
  isOverCap: boolean
  start: () => void
  pause: () => void
  resume: () => void
  endEarly: () => void
  claim: () => void
  abandon: () => void
  reset: () => void
  tick: () => void
}

const MAX_WORK_SECONDS = 14400 // 4 hours

export function usePomodoro(config?: PomodoroConfig): PomodoroResult {
  const workSec = config?.workSec ?? 1500
  const breakSec = config?.breakSec ?? 300
  const rounds = config?.rounds ?? 4

  // Use refs for mutable state that needs synchronous reads during tick
  const stateRef = useRef<PomodoroState>('idle')
  const roundRef = useRef(0)
  const workAccRef = useRef(0)
  const phaseStartRef = useRef(0)
  const phaseRemainingRef = useRef(workSec)
  const pausedFromRef = useRef<'work' | 'break'>('work')

  // React state for triggering re-renders
  const [, forceRender] = useState(0)
  const rerender = useCallback(() => forceRender((n) => n + 1), [])

  // Derived values read from refs
  const [remainingSeconds, setRemainingSeconds] = useState(workSec)
  const [elapsedWorkSeconds, setElapsedWorkSeconds] = useState(0)

  const start = useCallback(() => {
    stateRef.current = 'work'
    roundRef.current = 1
    workAccRef.current = 0
    phaseStartRef.current = Date.now()
    phaseRemainingRef.current = workSec
    setRemainingSeconds(workSec)
    setElapsedWorkSeconds(0)
    rerender()
  }, [workSec, rerender])

  const tick = useCallback(() => {
    const now = Date.now()
    const elapsed = Math.floor((now - phaseStartRef.current) / 1000)
    const s = stateRef.current

    if (s === 'work') {
      const newRemaining = Math.max(0, phaseRemainingRef.current - elapsed)
      const workThisPhase = Math.min(elapsed, phaseRemainingRef.current)
      const totalWork = workAccRef.current + workThisPhase

      setRemainingSeconds(newRemaining)
      setElapsedWorkSeconds(totalWork)

      if (newRemaining <= 0) {
        // Work phase done
        workAccRef.current = totalWork
        phaseStartRef.current = now

        if (roundRef.current >= rounds) {
          // Last round — complete (skip break)
          stateRef.current = 'complete'
          setRemainingSeconds(0)
        } else {
          // Go to break
          stateRef.current = 'break'
          phaseRemainingRef.current = breakSec
          setRemainingSeconds(breakSec)
        }
        rerender()
      }
      return
    }

    if (s === 'break') {
      const newRemaining = Math.max(0, phaseRemainingRef.current - elapsed)
      setRemainingSeconds(newRemaining)

      if (newRemaining <= 0) {
        // Break done — next work round
        roundRef.current += 1
        stateRef.current = 'work'
        phaseStartRef.current = now
        phaseRemainingRef.current = workSec
        setRemainingSeconds(workSec)
        rerender()
      }
    }
  }, [workSec, breakSec, rounds, rerender])

  const pause = useCallback(() => {
    const now = Date.now()
    const elapsed = Math.floor((now - phaseStartRef.current) / 1000)
    const s = stateRef.current

    if (s === 'work') {
      const newRemaining = Math.max(0, phaseRemainingRef.current - elapsed)
      const workThisPhase = Math.min(elapsed, phaseRemainingRef.current)
      workAccRef.current += workThisPhase
      phaseRemainingRef.current = newRemaining
      setRemainingSeconds(newRemaining)
      setElapsedWorkSeconds(workAccRef.current)
      pausedFromRef.current = 'work'
    } else if (s === 'break') {
      const newRemaining = Math.max(0, phaseRemainingRef.current - elapsed)
      phaseRemainingRef.current = newRemaining
      setRemainingSeconds(newRemaining)
      pausedFromRef.current = 'break'
    }

    stateRef.current = 'paused'
    rerender()
  }, [rerender])

  const resume = useCallback(() => {
    phaseStartRef.current = Date.now()
    stateRef.current = pausedFromRef.current
    rerender()
  }, [rerender])

  const endEarly = useCallback(() => {
    stateRef.current = 'end-early'
    rerender()
  }, [rerender])

  const claim = useCallback(() => {
    stateRef.current = 'complete'
    rerender()
  }, [rerender])

  const abandon = useCallback(() => {
    stateRef.current = 'abandoned'
    rerender()
  }, [rerender])

  const reset = useCallback(() => {
    stateRef.current = 'idle'
    roundRef.current = 0
    workAccRef.current = 0
    phaseRemainingRef.current = workSec
    setRemainingSeconds(workSec)
    setElapsedWorkSeconds(0)
    rerender()
  }, [workSec, rerender])

  return {
    state: stateRef.current,
    currentRound: roundRef.current,
    totalRounds: rounds,
    elapsedWorkSeconds,
    remainingSeconds,
    isOverCap: elapsedWorkSeconds >= MAX_WORK_SECONDS,
    start,
    pause,
    resume,
    endEarly,
    claim,
    abandon,
    reset,
    tick,
  }
}
