export interface Skill {
  id: string
  user_id: string
  name: string
  description: string
  unit: string
  preset_id: string | null
  starting_level: number
  current_xp: number
  current_level: number
  created_at: string
  updated_at: string
}

export interface Preset {
  id: string
  name: string
  description: string
  unit: string
  category_id: string
  category_name: string
  category_slug: string
}

export interface Account {
  id: string
  email: string
  display_name: string | null
  timezone?: string
}

export interface APIKeyStatus {
  has_key: boolean
  key_hint?: string
}

export interface APIError {
  error: string
}

export interface BlockerGate {
  id: string
  skill_id: string
  gate_level: number
  title: string
  description: string
  first_notified_at: string | null
  is_cleared: boolean
  cleared_at: string | null
}

export interface XPEvent {
  id: string
  skill_id: string
  xp_delta: number
  log_note: string
}

export interface SkillStreak {
  current: number
  longest: number
}

export interface GateSubmission {
  verdict: 'pending' | 'approved' | 'rejected' | 'self_reported'
  aiFeedback: string | null
  nextRetryAt: string | null
  attemptNumber: number
}

export interface TrainingSession {
  id: string
  skill_id: string
  status: 'completed' | 'abandoned'
  xp_delta: number
  bonus_xp: number
  duration_seconds: number
  log_note?: string
  pomodoro_work_sec: number
  pomodoro_break_sec: number
  pomodoro_intervals_completed: number
  pomodoro_intervals_planned: number
  created_at: string
}

export interface XPChartEntry {
  date: string
  xp_total: number
}

export interface XPChartResponse {
  days: number
  data: XPChartEntry[]
}

export interface SkillDetail extends Skill {
  effective_level: number
  quick_log_chips: [number, number, number, number]
  tier_name: string
  tier_number: number
  gates: BlockerGate[]
  recent_logs: XPEvent[]
  xp_to_next_level: number
  xp_for_current_level: number
  streak?: SkillStreak
  active_gate_submission?: GateSubmission | null
  requires_active_use?: boolean
  animation_theme?: string
  current_streak?: number
  is_custom?: boolean
}

export interface XPLogResponse {
  skill: Skill
  xp_added: number
  level_before: number
  level_after: number
  tier_crossed: boolean
  tier_name: string
  tier_number: number
  quick_log_chips: [number, number, number, number]
  gate_first_hit: BlockerGate | null
}

export interface CalibrateRequest {
  name: string
  description: string
}

export interface CalibrateResponse {
  suggested_level: number
  rationale: string
  gate_descriptions: string[]
}

export interface ActivityEvent {
  id: string
  skill_id: string
  skill_name: string
  xp_delta: number
  log_note: string
  created_at: string
}
