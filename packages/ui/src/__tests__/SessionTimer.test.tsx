import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { SessionTimer } from '../SessionTimer'

const defaultProps = {
  phase: 'work' as const,
  remainingSeconds: 1200,
  currentRound: 1,
  totalRounds: 4,
  skillName: 'Guitar Practice',
  tierColor: '#D4A017',
  tierNumber: 2,
  elapsedWorkSeconds: 300,
  isPaused: false,
  totalWorkSec: 1500,
  totalBreakSec: 300,
  onEndEarly: () => {},
  onPause: () => {},
  onResume: () => {},
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-mode')
})

describe('SessionTimer — mode-aware class hooks', () => {
  it('renders minimal variant with session-page work classes', async () => {
    document.documentElement.setAttribute('data-theme', 'minimal')
    document.documentElement.setAttribute('data-mode', 'clean')

    const { container } = render(<SessionTimer {...defaultProps} />)

    await waitFor(() => {
      expect(container.querySelector('.session-page.session-page--work')).toBeTruthy()
    })
    expect(container.querySelector('.session-page__timer-ring')).toBeTruthy()
    expect(container.querySelector('.session-page__timer')).toBeTruthy()
  })

  it('renders retro variant with XP and progress hooks', async () => {
    document.documentElement.setAttribute('data-theme', 'retro')

    const { container } = render(<SessionTimer {...defaultProps} />)

    await waitFor(() => {
      expect(container.querySelector('.session-page__xp')).toBeTruthy()
    })
    expect(container.querySelector('.session-page__progress-fill')).toBeTruthy()
    expect(container.querySelector('.session-page__backdrop')).toBeTruthy()
  })

  it('renders modern variant with ring progress and glow hooks', async () => {
    document.documentElement.setAttribute('data-theme', 'modern')

    const { container } = render(<SessionTimer {...defaultProps} />)

    await waitFor(() => {
      expect(container.querySelector('.session-page__timer-ring-progress')).toBeTruthy()
    })
    expect(container.querySelector('.session-page__timer-glow')).toBeTruthy()
  })

  it('applies break phase modifier class', async () => {
    document.documentElement.setAttribute('data-theme', 'minimal')

    const { container } = render(<SessionTimer {...defaultProps} phase="break" />)

    await waitFor(() => {
      expect(container.querySelector('.session-page.session-page--break')).toBeTruthy()
    })
    expect(container.querySelector('.session-page__break-indicator')).toBeTruthy()
  })

  it('applies paused modifier class', async () => {
    document.documentElement.setAttribute('data-theme', 'minimal')

    const { container } = render(<SessionTimer {...defaultProps} isPaused />)

    await waitFor(() => {
      expect(container.querySelector('.session-page.session-page--paused')).toBeTruthy()
    })
  })
})
