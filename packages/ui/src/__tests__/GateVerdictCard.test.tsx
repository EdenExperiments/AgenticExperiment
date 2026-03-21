import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GateVerdictCard } from '../GateVerdictCard'

describe('GateVerdictCard — AC-13: approved verdict uses no hardcoded green-900', () => {
  it('rendered output contains no class string "green-900" for verdict="approved"', () => {
    const { container } = render(
      <GateVerdictCard verdict="approved" aiFeedback="Well done!" />
    )
    const allClassStrings = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ')
    expect(allClassStrings).not.toMatch(/green-900/)
  })

  it('rendered output contains no class string "red-900" for verdict="approved"', () => {
    const { container } = render(
      <GateVerdictCard verdict="approved" />
    )
    const allClassStrings = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ')
    expect(allClassStrings).not.toMatch(/red-900/)
  })

  it('rendered output contains no class string "blue-900" for verdict="approved"', () => {
    const { container } = render(
      <GateVerdictCard verdict="approved" />
    )
    const allClassStrings = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ')
    expect(allClassStrings).not.toMatch(/blue-900/)
  })
})

describe('GateVerdictCard — AC-14: rejected verdict uses no hardcoded red-900', () => {
  it('rendered output contains no class string "red-900" for verdict="rejected"', () => {
    const { container } = render(
      <GateVerdictCard verdict="rejected" aiFeedback="Try again." nextRetryAt="2026-03-25" attemptNumber={1} />
    )
    const allClassStrings = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ')
    expect(allClassStrings).not.toMatch(/red-900/)
  })
})

describe('GateVerdictCard — AC-15: pending verdict uses no hardcoded blue-900', () => {
  it('rendered output contains no class string "blue-900" for verdict="pending"', () => {
    const { container } = render(
      <GateVerdictCard verdict="pending" />
    )
    const allClassStrings = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ')
    expect(allClassStrings).not.toMatch(/blue-900/)
  })
})

describe('GateVerdictCard — AC-16: emoji characters have aria-label wrappers', () => {
  it('raw ✅ emoji does not appear as a bare text node — must be wrapped with aria-label', () => {
    render(<GateVerdictCard verdict="approved" />)
    // If ✅ is a bare text node it will be found by queryByText
    // The test expects it is NOT a bare text node (no bare ✅ element)
    expect(screen.queryByText('✅')).not.toBeInTheDocument()
    // Instead it must exist as an element with role="img" and an aria-label
    expect(screen.getByRole('img', { name: /gate cleared/i })).toBeInTheDocument()
  })

  it('raw ❌ emoji does not appear as a bare text node — must be wrapped with aria-label', () => {
    render(<GateVerdictCard verdict="rejected" />)
    expect(screen.queryByText('❌')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /assessment rejected/i })).toBeInTheDocument()
  })

  it('pending spinner icon has aria-label wrapping', () => {
    render(<GateVerdictCard verdict="pending" />)
    expect(screen.getByRole('img', { name: /assessment pending/i })).toBeInTheDocument()
  })
})
