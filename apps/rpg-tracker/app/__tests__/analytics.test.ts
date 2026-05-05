import { getNoteLengthBucket, setAnalyticsDispatcher, trackEvent } from '@/lib/analytics'

beforeEach(() => {
  setAnalyticsDispatcher(null)
})

afterEach(() => {
  setAnalyticsDispatcher(null)
})

test('dispatches typed analytics events to configured dispatcher', () => {
  const dispatch = vi.fn()
  setAnalyticsDispatcher(dispatch)

  trackEvent('goal_created', {
    goal_id: 'goal-1',
    source: 'manual',
    has_target_date: true,
    has_linked_skill: false,
    has_value_tracking: true,
  })

  expect(dispatch).toHaveBeenCalledWith({
    name: 'goal_created',
    payload: {
      goal_id: 'goal-1',
      source: 'manual',
      has_target_date: true,
      has_linked_skill: false,
      has_value_tracking: true,
    },
    timestamp: expect.any(String),
  })
})

test('dispatches browser CustomEvent when no dispatcher is configured', () => {
  const listener = vi.fn()
  window.addEventListener('rpgtracker:analytics', listener)

  trackEvent('paywall_viewed', {
    surface: 'ai_goal_coach',
    trigger: 'feature_gate',
  })

  expect(listener).toHaveBeenCalledTimes(1)
  const event = listener.mock.calls[0][0] as CustomEvent
  expect(event.detail).toEqual({
    name: 'paywall_viewed',
    payload: {
      surface: 'ai_goal_coach',
      trigger: 'feature_gate',
    },
    timestamp: expect.any(String),
  })

  window.removeEventListener('rpgtracker:analytics', listener)
})

test('buckets check-in note length without storing note content', () => {
  expect(getNoteLengthBucket('Brief update')).toBe('short')
  expect(getNoteLengthBucket('a'.repeat(120))).toBe('medium')
  expect(getNoteLengthBucket('a'.repeat(320))).toBe('long')
})
