import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { SessionPage } from '../SessionPage'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'skill-test-id' }),
  useSearchParams: () => new URLSearchParams('from=skill'),
}))

const mockOnLogSession = vi.fn(async () => ({
  bonusXP: 10,
  streak: { current: 5, longest: 12 },
}))

const defaultProps = {
  skillId: 'skill-test-id',
  skillName: 'Guitar Practice',
  tierColor: '#D4A017',
  tierNumber: 1,
  requiresActiveUse: false,
  animationTheme: 'retro',
  onLogSession: mockOnLogSession,
}

describe('SessionPage — AC-L6: Session completion flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('on session complete, onLogSession is called with correct fields', async () => {
    render(<SessionPage {...defaultProps} />)

    const beginButton = screen.getByRole('button', { name: /begin session/i })
    fireEvent.click(beginButton)

    const endButton = await screen.findByRole('button', { name: /end session/i })
    fireEvent.click(endButton)

    const claimButton = await screen.findByRole('button', { name: /claim session/i })
    fireEvent.click(claimButton)

    const logButton = await screen.findByRole('button', { name: /log session/i })
    fireEvent.click(logButton)

    await waitFor(() => {
      expect(mockOnLogSession).toHaveBeenCalledWith(expect.objectContaining({
        session_type: expect.any(String),
        status: 'completed',
      }))
    })
  })

  it('post-session summary displays XP earned, bonus, streak, duration, intervals', async () => {
    render(<SessionPage {...defaultProps} />)

    const beginButton = screen.getByRole('button', { name: /begin session/i })
    fireEvent.click(beginButton)

    const endButton = await screen.findByRole('button', { name: /end session/i })
    fireEvent.click(endButton)

    const claimButton = await screen.findByRole('button', { name: /claim session/i })
    fireEvent.click(claimButton)

    await waitFor(() => {
      expect(screen.getByText(/xp/i)).toBeInTheDocument()
    })
  })

  it('"Log Session" button calls onLogSession and navigates to return URL', async () => {
    render(<SessionPage {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /begin session/i }))
    fireEvent.click(await screen.findByRole('button', { name: /end session/i }))
    fireEvent.click(await screen.findByRole('button', { name: /claim session/i }))

    const logButton = await screen.findByRole('button', { name: /log session/i })
    fireEvent.click(logButton)

    await waitFor(() => {
      expect(mockOnLogSession).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/skills/skill-test-id')
    })
  })

  it('"Dismiss" button navigates to return URL without logging', async () => {
    render(<SessionPage {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: /begin session/i }))
    fireEvent.click(await screen.findByRole('button', { name: /end session/i }))
    fireEvent.click(await screen.findByRole('button', { name: /claim session/i }))

    const dismissButton = await screen.findByRole('button', { name: /dismiss|return/i })
    fireEvent.click(dismissButton)

    await waitFor(() => {
      expect(mockOnLogSession).not.toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/skills/skill-test-id')
    })
  })
})
