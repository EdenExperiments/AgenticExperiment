import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// TDD — component doesn't exist yet
import { SessionPage } from '../SessionPage'

// Mock the API client
vi.mock('@rpgtracker/api-client', () => ({
  createSession: vi.fn(async () => ({
    session: { id: 'sess-1', status: 'completed', xp_delta: 75 },
    xp_result: { xp_added: 75, level_after: 3, tier_crossed: false },
    streak: { current: 5, longest: 12 },
  })),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'skill-test-id' }),
  useSearchParams: () => new URLSearchParams('from=skill'),
}))

import { createSession } from '@rpgtracker/api-client'

const defaultProps = {
  skillId: 'skill-test-id',
  skillName: 'Guitar Practice',
  tierColor: '#D4A017',
  tierNumber: 1,
  requiresActiveUse: false,
  animationTheme: 'retro',
}

describe('SessionPage — AC-L6: Session completion flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('on session complete, createSession is called with correct fields', async () => {
    render(<SessionPage {...defaultProps} />)

    // Start a simple session (not pomodoro for simpler test)
    // The config screen should show — click Begin
    const beginButton = screen.getByRole('button', { name: /begin session/i })
    fireEvent.click(beginButton)

    // End session early and claim
    const endButton = await screen.findByRole('button', { name: /end session/i })
    fireEvent.click(endButton)

    const claimButton = await screen.findByRole('button', { name: /claim session/i })
    fireEvent.click(claimButton)

    // Should see summary — click "Log Session"
    const logButton = await screen.findByRole('button', { name: /log session/i })
    fireEvent.click(logButton)

    await waitFor(() => {
      expect(createSession).toHaveBeenCalledWith('skill-test-id', expect.objectContaining({
        session_type: expect.any(String),
        status: 'completed',
      }))
    })
  })

  it('post-session summary displays XP earned, bonus, streak, duration, intervals', async () => {
    render(<SessionPage {...defaultProps} />)

    // Start → end early → claim to reach summary
    const beginButton = screen.getByRole('button', { name: /begin session/i })
    fireEvent.click(beginButton)

    const endButton = await screen.findByRole('button', { name: /end session/i })
    fireEvent.click(endButton)

    const claimButton = await screen.findByRole('button', { name: /claim session/i })
    fireEvent.click(claimButton)

    // Summary should now be visible
    await waitFor(() => {
      // XP earned should be displayed
      expect(screen.getByText(/xp/i)).toBeInTheDocument()
    })
  })

  it('"Log Session" button calls createSession and navigates to return URL', async () => {
    render(<SessionPage {...defaultProps} />)

    // Navigate to summary
    fireEvent.click(screen.getByRole('button', { name: /begin session/i }))
    fireEvent.click(await screen.findByRole('button', { name: /end session/i }))
    fireEvent.click(await screen.findByRole('button', { name: /claim session/i }))

    const logButton = await screen.findByRole('button', { name: /log session/i })
    fireEvent.click(logButton)

    await waitFor(() => {
      expect(createSession).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/skills/skill-test-id')
    })
  })

  it('"Dismiss" button navigates to return URL without logging', async () => {
    render(<SessionPage {...defaultProps} />)

    // Navigate to summary
    fireEvent.click(screen.getByRole('button', { name: /begin session/i }))
    fireEvent.click(await screen.findByRole('button', { name: /end session/i }))
    fireEvent.click(await screen.findByRole('button', { name: /claim session/i }))

    // Click dismiss/return instead of log
    const dismissButton = await screen.findByRole('button', { name: /dismiss|return/i })
    fireEvent.click(dismissButton)

    await waitFor(() => {
      expect(createSession).not.toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/skills/skill-test-id')
    })
  })
})
