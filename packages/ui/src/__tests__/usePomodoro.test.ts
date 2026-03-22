import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The hook we're testing — doesn't exist yet, so this import will fail (TDD)
import { usePomodoro } from '../usePomodoro'

describe('usePomodoro — AC-L1: Pomodoro timer state machine', () => {
  let realDateNow: () => number
  let now: number

  beforeEach(() => {
    realDateNow = Date.now
    now = 1000000
    Date.now = vi.fn(() => now)
  })

  afterEach(() => {
    Date.now = realDateNow
  })

  function advanceTime(seconds: number) {
    now += seconds * 1000
  }

  it('initial state is idle with default config (work=1500s, break=300s, rounds=4)', () => {
    const { result } = renderHook(() => usePomodoro())
    expect(result.current.state).toBe('idle')
    expect(result.current.currentRound).toBe(0)
    expect(result.current.totalRounds).toBe(4)
    expect(result.current.elapsedWorkSeconds).toBe(0)
  })

  it('start() transitions state from idle to work', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    expect(result.current.state).toBe('work')
    expect(result.current.currentRound).toBe(1)
  })

  it('after work duration elapses, state transitions from work to break', () => {
    const { result } = renderHook(() => usePomodoro({ workSec: 10, breakSec: 5, rounds: 2 }))
    act(() => result.current.start())

    advanceTime(10)
    act(() => result.current.tick())

    expect(result.current.state).toBe('break')
  })

  it('after break duration elapses, state transitions from break to work', () => {
    const { result } = renderHook(() => usePomodoro({ workSec: 10, breakSec: 5, rounds: 2 }))
    act(() => result.current.start())

    // Complete first work interval
    advanceTime(10)
    act(() => result.current.tick())
    expect(result.current.state).toBe('break')

    // Complete break
    advanceTime(5)
    act(() => result.current.tick())
    expect(result.current.state).toBe('work')
    expect(result.current.currentRound).toBe(2)
  })

  it('after last work interval, state transitions to complete (no final break)', () => {
    const { result } = renderHook(() => usePomodoro({ workSec: 10, breakSec: 5, rounds: 2 }))
    act(() => result.current.start())

    // Round 1: work + break
    advanceTime(10)
    act(() => result.current.tick())
    advanceTime(5)
    act(() => result.current.tick())

    // Round 2: work only → complete (skip break)
    advanceTime(10)
    act(() => result.current.tick())

    expect(result.current.state).toBe('complete')
  })

  it('pause() during work sets state to paused, resume() returns to work', () => {
    const { result } = renderHook(() => usePomodoro({ workSec: 100, breakSec: 30, rounds: 2 }))
    act(() => result.current.start())
    expect(result.current.state).toBe('work')

    act(() => result.current.pause())
    expect(result.current.state).toBe('paused')

    act(() => result.current.resume())
    expect(result.current.state).toBe('work')
  })

  it('pause() during break sets state to paused, resume() returns to break', () => {
    const { result } = renderHook(() => usePomodoro({ workSec: 10, breakSec: 30, rounds: 2 }))
    act(() => result.current.start())

    advanceTime(10)
    act(() => result.current.tick())
    expect(result.current.state).toBe('break')

    act(() => result.current.pause())
    expect(result.current.state).toBe('paused')

    act(() => result.current.resume())
    expect(result.current.state).toBe('break')
  })

  it('endEarly() from any active state transitions to end-early', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    expect(result.current.state).toBe('work')

    act(() => result.current.endEarly())
    expect(result.current.state).toBe('end-early')
  })

  it('claim() from end-early transitions to complete', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    act(() => result.current.endEarly())
    expect(result.current.state).toBe('end-early')

    act(() => result.current.claim())
    expect(result.current.state).toBe('complete')
  })

  it('abandon() from end-early transitions to abandoned', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    act(() => result.current.endEarly())

    act(() => result.current.abandon())
    expect(result.current.state).toBe('abandoned')
  })

  it('currentRound increments after each work+break cycle', () => {
    const { result } = renderHook(() => usePomodoro({ workSec: 10, breakSec: 5, rounds: 3 }))
    act(() => result.current.start())
    expect(result.current.currentRound).toBe(1)

    // Complete round 1
    advanceTime(10)
    act(() => result.current.tick())
    advanceTime(5)
    act(() => result.current.tick())
    expect(result.current.currentRound).toBe(2)

    // Complete round 2
    advanceTime(10)
    act(() => result.current.tick())
    advanceTime(5)
    act(() => result.current.tick())
    expect(result.current.currentRound).toBe(3)
  })

  it('elapsedWorkSeconds accumulates only during work phases (not break)', () => {
    const { result } = renderHook(() => usePomodoro({ workSec: 10, breakSec: 5, rounds: 2 }))
    act(() => result.current.start())

    // Work for 10s
    advanceTime(10)
    act(() => result.current.tick())
    expect(result.current.elapsedWorkSeconds).toBe(10)

    // Break for 5s — should NOT increase work seconds
    advanceTime(5)
    act(() => result.current.tick())
    expect(result.current.elapsedWorkSeconds).toBe(10)

    // Second work for 7s (mid-round)
    advanceTime(7)
    act(() => result.current.tick())
    expect(result.current.elapsedWorkSeconds).toBe(17)
  })

  it('remainingSeconds counts down from phase duration', () => {
    const { result } = renderHook(() => usePomodoro({ workSec: 100, breakSec: 30, rounds: 2 }))
    act(() => result.current.start())
    expect(result.current.remainingSeconds).toBe(100)

    advanceTime(25)
    act(() => result.current.tick())
    expect(result.current.remainingSeconds).toBe(75)
  })

  it('custom config (work=900s, break=600s, rounds=2) is respected', () => {
    const { result } = renderHook(() => usePomodoro({ workSec: 900, breakSec: 600, rounds: 2 }))
    expect(result.current.totalRounds).toBe(2)

    act(() => result.current.start())
    expect(result.current.remainingSeconds).toBe(900)

    // Complete first work
    advanceTime(900)
    act(() => result.current.tick())
    expect(result.current.state).toBe('break')
    expect(result.current.remainingSeconds).toBe(600)
  })

  it('timer uses Date.now() delta internally', () => {
    const { result } = renderHook(() => usePomodoro({ workSec: 100, breakSec: 30, rounds: 2 }))
    act(() => result.current.start())

    // Advance Date.now by 42 seconds
    advanceTime(42)
    act(() => result.current.tick())

    expect(result.current.remainingSeconds).toBe(58)
    expect(result.current.elapsedWorkSeconds).toBe(42)
  })
})

describe('usePomodoro — AC-L7: Session duration safety', () => {
  let realDateNow: () => number
  let now: number

  beforeEach(() => {
    realDateNow = Date.now
    now = 1000000
    Date.now = vi.fn(() => now)
  })

  afterEach(() => {
    Date.now = realDateNow
  })

  function advanceTime(seconds: number) {
    now += seconds * 1000
  }

  it('after 14400s (4h) of work time, isOverCap flag is true', () => {
    // Use long work intervals to accumulate 4h
    const { result } = renderHook(() => usePomodoro({ workSec: 14400, breakSec: 60, rounds: 2 }))
    act(() => result.current.start())

    advanceTime(14400)
    act(() => result.current.tick())

    expect(result.current.isOverCap).toBe(true)
  })

  it('session with 0 elapsed work time: elapsedWorkSeconds is 0', () => {
    const { result } = renderHook(() => usePomodoro())
    act(() => result.current.start())
    act(() => result.current.endEarly())
    expect(result.current.elapsedWorkSeconds).toBe(0)
  })
})
