import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BlockerGateSection } from '../BlockerGateSection'

const defaultProps = {
  gateLevel: 9,
  title: 'Novice Gate: Prove Your Apprentice Mastery',
  description: 'Complete a project and share your work',
  currentXP: 105680,
  rawLevel: 26,
  firstNotifiedAt: '2026-03-20T10:00:00Z',
  isCleared: false,
  activeGateSubmission: {
    verdict: 'pending' as const,
    aiFeedback: null,
    nextRetryAt: null,
    attemptNumber: 2,
  },
  hasApiKey: true,
  onSubmitForAssessment: () => {},
}

describe('BlockerGateSection — AC-01: no hardcoded colour classes', () => {
  it('renders no element with class bg-amber-50', () => {
    const { container } = render(<BlockerGateSection {...defaultProps} />)
    // Inspect all elements' className strings for bg-amber-50
    const allClassStrings = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ')
    expect(allClassStrings).not.toMatch(/bg-amber-50/)
  })

  it('renders no element with a dark: breakpoint class', () => {
    const { container } = render(<BlockerGateSection {...defaultProps} />)
    const allClassStrings = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ')
    expect(allClassStrings).not.toMatch(/dark:/)
  })
})

describe('BlockerGateSection — AC-20: no border-amber-300 class', () => {
  it('renders no element with class border-amber-300', () => {
    const { container } = render(<BlockerGateSection {...defaultProps} />)
    const allClassStrings = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ')
    expect(allClassStrings).not.toMatch(/border-amber-300/)
  })
})

describe('BlockerGateSection — AC-04: no "future update" copy', () => {
  it('does not render the text "future update" when firstNotifiedAt is null', () => {
    const { container } = render(
      <BlockerGateSection
        {...defaultProps}
        firstNotifiedAt={null}
        activeGateSubmission={null}
      />
    )
    expect(container.textContent).not.toMatch(/future update/i)
  })

  it('does not render the text "future update" when firstNotifiedAt is set', () => {
    const { container } = render(<BlockerGateSection {...defaultProps} />)
    expect(container.textContent).not.toMatch(/future update/i)
  })
})

describe('BlockerGateSection — AC-05: submit button uses CSS variable, not hardcoded amber', () => {
  it('submit-gate-btn has no hardcoded bg-amber-500 class', () => {
    render(<BlockerGateSection {...defaultProps} />)
    const btn = screen.getByTestId('submit-gate-btn')
    expect(btn.className).not.toMatch(/bg-amber-500/)
  })

  it('submit-gate-btn has no hardcoded hover:bg-amber-600 class', () => {
    render(<BlockerGateSection {...defaultProps} />)
    const btn = screen.getByTestId('submit-gate-btn')
    expect(btn.className).not.toMatch(/hover:bg-amber-600/)
  })
})

describe('BlockerGateSection — AC-06: attempt count hidden when attemptNumber is 0', () => {
  it('does not render data-testid="attempt-count" when attemptNumber is 0', () => {
    render(
      <BlockerGateSection
        {...defaultProps}
        activeGateSubmission={{
          verdict: 'pending',
          aiFeedback: null,
          nextRetryAt: null,
          attemptNumber: 0,
        }}
      />
    )
    expect(screen.queryByTestId('attempt-count')).not.toBeInTheDocument()
  })

  it('does not render data-testid="attempt-count" when activeGateSubmission is null', () => {
    render(
      <BlockerGateSection
        {...defaultProps}
        activeGateSubmission={null}
      />
    )
    expect(screen.queryByTestId('attempt-count')).not.toBeInTheDocument()
  })
})

describe('BlockerGateSection — AC-03: Requirements area hidden when description is empty', () => {
  it('does not render the Requirements area when description is empty string', () => {
    render(
      <BlockerGateSection
        {...defaultProps}
        description=""
      />
    )
    // When description is empty, no "Requirements" heading or empty callout box should render
    expect(screen.queryByText(/requirements/i)).not.toBeInTheDocument()
    // Also assert no empty paragraph for description is present (a div with empty content)
    const allTexts = screen.getAllByRole('paragraph', { hidden: true }).map((el) => el.textContent)
    const hasEmptyDescription = allTexts.some((t) => t === '')
    expect(hasEmptyDescription).toBe(false)
  })
})
