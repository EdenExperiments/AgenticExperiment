import { render, screen, fireEvent } from '@testing-library/react'
import { SkillCard } from './SkillCard'
import type { SkillDetail } from '@rpgtracker/api-client'

const mockSkill: SkillDetail = {
  id: 'abc-123',
  user_id: 'user-1',
  name: 'Running',
  description: '',
  unit: 'km',
  preset_id: null,
  starting_level: 1,
  current_xp: 200,
  current_level: 2,
  effective_level: 2,
  quick_log_chips: [50, 100, 250, 500],
  tier_name: 'Novice',
  tier_number: 1,
  gates: [],
  recent_logs: [],
  xp_to_next_level: 700,
  xp_for_current_level: 100,
  created_at: '',
  updated_at: '',
}

test('renders skill name and tier', () => {
  render(<SkillCard skill={mockSkill} onLogXP={vi.fn()} onClick={vi.fn()} />)
  expect(screen.getByText('Running')).toBeInTheDocument()
  expect(screen.getByText('Novice')).toBeInTheDocument()
  expect(screen.getByText('Level 2')).toBeInTheDocument()
})

test('calls onLogXP when + Log is clicked', () => {
  const onLogXP = vi.fn()
  render(<SkillCard skill={mockSkill} onLogXP={onLogXP} onClick={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /log/i }))
  expect(onLogXP).toHaveBeenCalledWith('abc-123')
})

test('shows lock icon when gate is active', () => {
  const skillWithGate = {
    ...mockSkill,
    effective_level: 9,
    current_level: 10,
    gates: [{ id: 'g1', skill_id: 'abc-123', gate_level: 9, title: 'Test Gate',
               description: '', first_notified_at: '2026-01-01', is_cleared: false, cleared_at: null }],
  }
  render(<SkillCard skill={skillWithGate} onLogXP={vi.fn()} onClick={vi.fn()} />)
  expect(screen.getByRole('img', { name: /gate locked/i })).toBeInTheDocument()
})

test('calls onClick when card is clicked', () => {
  const onClick = vi.fn()
  render(<SkillCard skill={mockSkill} onLogXP={vi.fn()} onClick={onClick} />)
  fireEvent.click(screen.getByRole('button', { name: 'Running' }))
  expect(onClick).toHaveBeenCalledWith('abc-123')
})

test('does not call onClick when + Log button is clicked', () => {
  const onClick = vi.fn()
  render(<SkillCard skill={mockSkill} onLogXP={vi.fn()} onClick={onClick} />)
  fireEvent.click(screen.getByRole('button', { name: /log/i }))
  expect(onClick).not.toHaveBeenCalled()
})

test('does not show lock icon when gate is cleared', () => {
  const skillWithClearedGate = {
    ...mockSkill,
    gates: [{ id: 'g1', skill_id: 'abc-123', gate_level: 2, title: 'Test Gate',
               description: '', first_notified_at: '2026-01-01', is_cleared: true, cleared_at: '2026-01-02' }],
  }
  render(<SkillCard skill={skillWithClearedGate} onLogXP={vi.fn()} onClick={vi.fn()} />)
  expect(screen.queryByRole('img', { name: /gate locked/i })).not.toBeInTheDocument()
})

// AC-E6: Streak badge hidden when current_streak=0 (or absent from props)
test('streak badge is hidden when current_streak is 0', () => {
  const skillWithNoStreak = {
    ...mockSkill,
    current_streak: 0,
  }
  render(<SkillCard skill={skillWithNoStreak} onLogXP={vi.fn()} onClick={vi.fn()} />)
  // No streak badge should be rendered when streak is 0
  expect(screen.queryByTestId('streak-badge')).not.toBeInTheDocument()
})

// AC-E6: Streak badge shown on SkillCard only when current_streak >= 2
test('streak badge is shown when current_streak is 2', () => {
  const skillWithStreak = {
    ...mockSkill,
    current_streak: 2,
  }
  render(<SkillCard skill={skillWithStreak} onLogXP={vi.fn()} onClick={vi.fn()} />)
  // Streak badge must appear (AC-E6: shown when >= 2 days)
  expect(screen.getByTestId('streak-badge')).toBeInTheDocument()
  expect(screen.getByText('2')).toBeInTheDocument()
})

// --- AC-09: Colour migration — no hardcoded orange- classes ---
describe('AC-09: colour migration', () => {
  test('rendered HTML contains no hardcoded orange-500 or orange-400 class tokens', () => {
    const skillWithStreak = { ...mockSkill, current_streak: 3 }
    const { container } = render(
      <SkillCard skill={skillWithStreak} onLogXP={vi.fn()} onClick={vi.fn()} />
    )
    expect(container.innerHTML).not.toMatch(/orange-500|orange-400/)
  })

  test('streak badge uses CSS variable for background colour (--color-accent-muted)', () => {
    const skillWithStreak = { ...mockSkill, current_streak: 3 }
    const { container } = render(
      <SkillCard skill={skillWithStreak} onLogXP={vi.fn()} onClick={vi.fn()} />
    )
    const badge = container.querySelector('[data-testid="streak-badge"]')
    expect(badge).not.toBeNull()
    // Must reference CSS variable, not hardcoded colour class
    const style = badge!.getAttribute('style') ?? ''
    const className = badge!.getAttribute('class') ?? ''
    const usesAccentMuted =
      style.includes('--color-accent-muted') || className.includes('--color-accent-muted')
    expect(usesAccentMuted).toBe(true)
  })

  test('streak badge uses CSS variable for text colour (--color-accent)', () => {
    const skillWithStreak = { ...mockSkill, current_streak: 3 }
    const { container } = render(
      <SkillCard skill={skillWithStreak} onLogXP={vi.fn()} onClick={vi.fn()} />
    )
    const badge = container.querySelector('[data-testid="streak-badge"]')
    expect(badge).not.toBeNull()
    const style = badge!.getAttribute('style') ?? ''
    const className = badge!.getAttribute('class') ?? ''
    const usesAccent =
      style.includes('--color-accent') || className.includes('--color-accent')
    expect(usesAccent).toBe(true)
  })
})

// --- AC-14: Hover lift with motion-scale gating ---
describe('AC-14: hover lift effect', () => {
  test('card wrapper transition includes var(--motion-scale) for motion-scale gating', () => {
    const { container } = render(
      <SkillCard skill={mockSkill} onLogXP={vi.fn()} onClick={vi.fn()} />
    )
    const card = container.firstChild as HTMLElement
    // Transition must reference --motion-scale so minimal (motion-scale=0.3) gives reduced duration
    const transition = card.style.transition ?? ''
    expect(transition).toMatch(/var\(--motion-scale/)
  })

  test('card wrapper has hover lift classes using @media(hover:hover) guard', () => {
    const { container } = render(
      <SkillCard skill={mockSkill} onLogXP={vi.fn()} onClick={vi.fn()} />
    )
    const card = container.firstChild as HTMLElement
    const className = card.className
    // Must use Tailwind arbitrary variant or transition class referencing hover guard
    // The class should include hover:-translate-y- (lift) inside media(hover:hover)
    expect(className).toMatch(/\[@media\(hover:hover\)\]:hover:-translate-y/)
  })

  test('card wrapper has focus-visible outline using --color-accent', () => {
    const { container } = render(
      <SkillCard skill={mockSkill} onLogXP={vi.fn()} onClick={vi.fn()} />
    )
    const card = container.firstChild as HTMLElement
    const className = card.className
    // focus-visible outline must reference --color-accent
    expect(className).toMatch(/focus-visible:outline-\[var\(--color-accent/)
  })
})

// --- AC-17: minimal reduced motion transitions (motion-scale gates duration) ---
describe('AC-17: minimal reduced motion transitions', () => {
  test('card transition string uses var(--duration-fast) * var(--motion-scale) so 0ms when scale=0', () => {
    const { container } = render(
      <SkillCard skill={mockSkill} onLogXP={vi.fn()} onClick={vi.fn()} />
    )
    const card = container.firstChild as HTMLElement
    const transition = card.style.transition ?? ''
    expect(transition).toMatch(/var\(--duration-fast/)
    expect(transition).toMatch(/var\(--motion-scale/)
  })
})

// --- AC-19: Card hierarchy — bg-elevated + border ---
describe('AC-19: card hierarchy CSS variables', () => {
  test('card wrapper background references --color-bg-elevated', () => {
    const { container } = render(
      <SkillCard skill={mockSkill} onLogXP={vi.fn()} onClick={vi.fn()} />
    )
    const card = container.firstChild as HTMLElement
    expect(card.style.backgroundColor).toMatch(/var\(--color-bg-elevated/)
  })

  test('card wrapper border references --color-border', () => {
    const { container } = render(
      <SkillCard skill={mockSkill} onLogXP={vi.fn()} onClick={vi.fn()} />
    )
    const card = container.firstChild as HTMLElement
    expect(card.style.borderColor).toMatch(/var\(--color-border/)
  })
})

// --- AC-22: 44px minimum tap target ---
describe('AC-22: tap target minimum 44px', () => {
  test('card clickable wrapper has min-h-[44px] class', () => {
    const { container } = render(
      <SkillCard skill={mockSkill} onLogXP={vi.fn()} onClick={vi.fn()} />
    )
    const card = container.firstChild as HTMLElement
    expect(card.className).toMatch(/min-h-\[44px\]|min-h-11/)
  })
})
