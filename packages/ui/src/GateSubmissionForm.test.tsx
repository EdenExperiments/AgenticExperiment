import { render, screen, fireEvent } from '@testing-library/react'
import { GateSubmissionForm } from './GateSubmissionForm'

const defaultProps = {
  gateId: 'gate-1',
  path: 'self_report' as const,
  onPathChange: vi.fn(),
  onSubmit: vi.fn(),
  isLoading: false,
  hasApiKey: false,
  submissionError: null,
  previousSubmission: null,
}

afterEach(() => {
  vi.clearAllMocks()
})

// AC-G2: Character counter updates on keystroke; turns green at threshold (min 50 chars for evidence_what)
test('character counter updates on keystroke in evidence_what field', () => {
  render(<GateSubmissionForm {...defaultProps} />)

  const textarea = screen.getByLabelText(/what did you accomplish/i)
  fireEvent.change(textarea, { target: { value: 'Hello World' } })

  // Counter must show "11 / 50"
  expect(screen.getByText('11 / 50')).toBeInTheDocument()
})

test('character counter becomes green when minimum character threshold is met', () => {
  render(<GateSubmissionForm {...defaultProps} />)

  const textarea = screen.getByLabelText(/what did you accomplish/i)
  const fiftyChars = 'a'.repeat(50)
  fireEvent.change(textarea, { target: { value: fiftyChars } })

  // Counter should show "50 / 50" and have a green class
  const counter = screen.getByText('50 / 50')
  expect(counter).toBeInTheDocument()
  // Check green class — implementation uses a green CSS class or data attribute at threshold
  const hasGreenClass =
    counter.classList.contains('text-green-500') ||
    counter.classList.contains('text-green-600') ||
    counter.classList.contains('green') ||
    counter.getAttribute('data-met') === 'true'
  expect(hasGreenClass).toBe(true)
})

// AC-G3: AI loading state renders "Assessing your evidence..." with submit button disabled
test('AI loading state renders "Assessing your evidence..." with disabled submit', () => {
  render(<GateSubmissionForm {...defaultProps} isLoading={true} />)

  expect(screen.getByText(/assessing your evidence/i)).toBeInTheDocument()

  const submitButton = screen.getByRole('button', { name: /submit|assess/i })
  expect(submitButton).toBeDisabled()
})

// AC-G3: Rejected state — form hidden, feedback shown, retry button disabled, shows date not countdown
test('rejected state shows feedback and disabled retry with date-based message (no countdown)', () => {
  render(
    <GateSubmissionForm
      {...defaultProps}
      previousSubmission={{
        verdict: 'rejected',
        aiFeedback: 'Your evidence lacked specific examples. Please provide more detail.',
        nextRetryAt: '2026-03-22',
        attemptNumber: 1,
      }}
    />
  )

  // The submission form (textareas) should be hidden
  expect(screen.queryByLabelText(/what did you accomplish/i)).not.toBeInTheDocument()

  // AI feedback paragraph should be shown
  expect(screen.getByText(/your evidence lacked specific examples/i)).toBeInTheDocument()

  // Retry button should be present but disabled
  const retryButton = screen.getByRole('button', { name: /retry/i })
  expect(retryButton).toBeDisabled()

  // Date-based message — must NOT show hours/minutes countdown
  // Should show a date like "Retry available on 2026-03-22" or "Retry available tomorrow"
  const retryMessage = screen.getByText(/retry available/i)
  expect(retryMessage).toBeInTheDocument()
  // Must not contain hours or minutes (no live countdown per spec G3)
  expect(retryMessage.textContent).not.toMatch(/\d+\s*(hour|minute|min|hr)/i)
})

// AC-G3: AI-unavailable error — path selector remains visible alongside evidence content
test('AI-unavailable error keeps path selector visible alongside pre-filled evidence', () => {
  render(
    <GateSubmissionForm
      {...defaultProps}
      path="ai"
      hasApiKey={true}
      submissionError="ai_unavailable"
    />
  )

  // Inline error message
  expect(screen.getByText(/ai assessment is unavailable/i)).toBeInTheDocument()

  // Path selector (AI / Self-report toggle) must still be visible
  // so the user can switch to self-report without losing their content
  expect(screen.getByRole('radio', { name: /ai/i })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /self.?report/i })).toBeInTheDocument()

  // Evidence textareas should still be visible (content preserved)
  expect(screen.getByLabelText(/what did you accomplish/i)).toBeInTheDocument()
})
