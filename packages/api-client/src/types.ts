export interface Tag {
  id: string
  name: string
}

export interface TagWithCount extends Tag {
  skill_count: number
}

export interface SkillCategory {
  id: string
  name: string
  slug: string
  emoji: string
  sort_order: number
}

export interface Skill {
  id: string
  user_id: string
  name: string
  description: string
  unit: string
  preset_id: string | null
  category_id: string | null
  category_name: string | null
  category_slug: string | null
  category_emoji: string | null
  is_favourite: boolean
  tags: Tag[]
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
  primary_skill_id: string | null
  avatar_url: string | null
}

export interface AccountStats {
  total_xp: number
  longest_streak: number
  skill_count: number
  category_distribution: { category: string; count: number }[]
}

export interface APIKeyStatus {
  has_key: boolean
  key_hint?: string
}

export interface AIEntitlement {
  entitled: boolean
  reason: 'api_key_set' | 'no_api_key' | 'unknown'
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
  current_streak: number
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
  experience: string
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

// Goals

export type GoalStatus = 'active' | 'completed' | 'abandoned'

export interface Goal {
  id: string
  user_id: string
  skill_id: string | null
  title: string
  description: string | null
  status: GoalStatus
  target_date: string | null
  current_value: number | null
  target_value: number | null
  unit: string | null
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  goal_id: string
  title: string
  description: string | null
  position: number
  is_done: boolean
  due_date: string | null
  done_at: string | null
  created_at: string
  updated_at: string
}

export interface CheckIn {
  id: string
  goal_id: string
  note: string
  value: number | null
  checked_in_at: string
  created_at: string
}

export interface CreateGoalRequest {
  title: string
  description?: string
  skill_id?: string
  status?: GoalStatus
  target_date?: string
  current_value?: number
  target_value?: number
  unit?: string
}

export interface UpdateGoalRequest {
  title?: string
  description?: string
  skill_id?: string | null
  status?: GoalStatus
  target_date?: string | null
  current_value?: number | null
  target_value?: number | null
  unit?: string | null
}

export interface CreateMilestoneRequest {
  title: string
  description?: string
  position?: number
  due_date?: string
}

export interface UpdateMilestoneRequest {
  title?: string
  description?: string
  position?: number
  is_done?: boolean
  due_date?: string | null
}

export interface CreateCheckInRequest {
  note: string
  value?: number
  checked_in_at?: string
}

// AI Goal Planner (T12)

export interface GoalPlanMilestone {
  title: string
  description?: string
  due_date?: string
}

export interface GoalPlan {
  objective: string
  milestones: GoalPlanMilestone[]
  weekly_cadence: string[]
  risks: string[]
  fallback_plan: string
}

export interface PlanGoalRequest {
  goal_statement: string
  deadline?: string
  context?: string
}

export interface PlanGoalResponse {
  plan: GoalPlan
  degraded_response: boolean
}

// Goal Forecast (T13)

export type TrackState = 'on_track' | 'at_risk' | 'behind' | 'complete' | 'unknown'
export type DriftDirection = 'ahead' | 'behind' | 'neutral'

export interface GoalForecast {
  track_state: TrackState
  confidence_score: number
  drift_pct: number
  drift_direction: DriftDirection
  expected_progress: number
  actual_progress: number
  milestone_done_ratio: number
  checkin_count: number
  days_remaining: number
  recommend_checkin: boolean
  recommend_review: boolean
  recommend_stretch: boolean
}
