import { render, screen } from '@testing-library/react'
import { BlockerGateSection } from './BlockerGateSection'

const baseProps = {
  gateLevel: 9,
  title: 'Novice Gate',
  description: 'Complete 10 sessions to unlock Apprentice.',
  currentXP: 8500,
  rawLevel: 10,
}

test('shows gate title and description', () => {
  render(
    <BlockerGateSection
      {...baseProps}
    />
  )
  expect(screen.getByText('Novice Gate')).toBeInTheDocument()
  expect(screen.getByText(/complete 10 sessions/i)).toBeInTheDocument()
  expect(screen.getByText(/gate locked/i)).toBeInTheDocument()
})

test('shows XP accruing value', () => {
  render(
    <BlockerGateSection
      {...baseProps}
      currentXP={9000}
    />
  )
  expect(screen.getByText(/9,000/)).toBeInTheDocument()
})

// AC-G1: "Submit for Assessment" button rendered when first_notified_at is set and is_cleared=false
test('"Submit for Assessment" button is shown when first_notified_at is set and gate is not cleared', () => {
  render(
    <BlockerGateSection
      {...baseProps}
      firstNotifiedAt="2026-03-20T10:00:00Z"
      isCleared={false}
    />
  )
  expect(
    screen.getByRole('button', { name: /submit for assessment/i })
  ).toBeInTheDocument()
})

// AC-G1: Button absent when is_cleared=true
test('"Submit for Assessment" button is absent when gate is already cleared', () => {
  render(
    <BlockerGateSection
      {...baseProps}
      firstNotifiedAt="2026-03-20T10:00:00Z"
      isCleared={true}
    />
  )
  expect(
    screen.queryByRole('button', { name: /submit for assessment/i })
  ).not.toBeInTheDocument()
})

// AC-G1: Button absent when first_notified_at is null (gate not yet reached)
test('"Submit for Assessment" button is absent when first_notified_at is null', () => {
  render(
    <BlockerGateSection
      {...baseProps}
      firstNotifiedAt={null}
      isCleared={false}
    />
  )
  expect(
    screen.queryByRole('button', { name: /submit for assessment/i })
  ).not.toBeInTheDocument()
})

// AC-G8: Shows "Attempt N of ∞" using active_gate_submission.attempt_number
test('shows "Attempt 2 of ∞" when active_gate_submission has attempt_number=2', () => {
  render(
    <BlockerGateSection
      {...baseProps}
      firstNotifiedAt="2026-03-20T10:00:00Z"
      isCleared={false}
      activeGateSubmission={{
        verdict: 'rejected',
        aiFeedback: 'Not enough detail provided.',
        nextRetryAt: '2026-03-22',
        attemptNumber: 2,
      }}
    />
  )
  expect(screen.getByText(/attempt 2 of ∞/i)).toBeInTheDocument()
})
