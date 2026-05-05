export type AnalyticsEventName =
  | 'goal_created'
  | 'ai_plan_generated'
  | 'ai_plan_accepted'
  | 'weekly_checkin_completed'
  | 'offtrack_recovered'
  | 'paywall_viewed'
  | 'upgrade_clicked'

type GoalSource = 'manual' | 'ai_plan'
type TrackState = 'on_track' | 'at_risk' | 'behind' | 'complete' | 'unknown'
type BillingSurface = 'ai_goal_coach' | 'weekly_review' | 'account' | 'unknown'

export type AnalyticsEventPayloads = {
  goal_created: {
    goal_id: string
    source: GoalSource
    has_target_date: boolean
    has_linked_skill: boolean
    has_value_tracking: boolean
  }
  ai_plan_generated: {
    degraded_response: boolean
    has_deadline: boolean
    has_context: boolean
    milestone_count: number
    weekly_cadence_count: number
    risk_count: number
  }
  ai_plan_accepted: {
    goal_id: string
    degraded_response: boolean
    generated_milestone_count: number
    selected_milestone_count: number
    edited_milestone_count: number
    has_deadline: boolean
  }
  weekly_checkin_completed: {
    goal_id: string
    has_value: boolean
    note_length_bucket: 'short' | 'medium' | 'long'
    previous_track_state: TrackState
  }
  offtrack_recovered: {
    goal_id: string
    previous_track_state: 'at_risk' | 'behind'
    recovery_action: 'checkin'
  }
  paywall_viewed: {
    surface: BillingSurface
    trigger: 'ai_limit' | 'feature_gate' | 'upgrade_prompt'
  }
  upgrade_clicked: {
    surface: BillingSurface
    trigger: 'paywall' | 'upgrade_prompt'
  }
}

export type AnalyticsEvent<TName extends AnalyticsEventName = AnalyticsEventName> = {
  name: TName
  payload: AnalyticsEventPayloads[TName]
  timestamp: string
}

export type AnalyticsDispatcher = <TName extends AnalyticsEventName>(
  event: AnalyticsEvent<TName>
) => void | Promise<void>

let dispatcher: AnalyticsDispatcher | null = null

export function setAnalyticsDispatcher(nextDispatcher: AnalyticsDispatcher | null) {
  dispatcher = nextDispatcher
}

export function trackEvent<TName extends AnalyticsEventName>(
  name: TName,
  payload: AnalyticsEventPayloads[TName]
) {
  const event: AnalyticsEvent<TName> = {
    name,
    payload,
    timestamp: new Date().toISOString(),
  }

  if (dispatcher) {
    try {
      void Promise.resolve(dispatcher(event)).catch(() => undefined)
    } catch {
      // Analytics must not block the product funnel.
    }
    return
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rpgtracker:analytics', { detail: event }))
  }
}

export function getNoteLengthBucket(note: string): AnalyticsEventPayloads['weekly_checkin_completed']['note_length_bucket'] {
  const length = note.trim().length
  if (length < 80) return 'short'
  if (length < 300) return 'medium'
  return 'long'
}
