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
