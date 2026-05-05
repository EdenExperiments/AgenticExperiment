# Analytics Instrumentation Plan

Wave 4 Track T18 adds a provider-neutral analytics scaffold for the AI goal product funnel. The implementation intentionally avoids a vendor SDK; app code emits typed events through `apps/rpg-tracker/lib/analytics.ts`.

## Privacy rules

- Do not include user-authored goal statements, check-in notes, milestone titles, AI prompts, AI completions, API keys, email addresses, or display names.
- Prefer booleans, counts, IDs already used by the app, and coarse buckets.
- Payloads must be safe to forward to any future analytics provider without additional redaction.
- A provider adapter should be registered at the app boundary via `setAnalyticsDispatcher`; until then the default browser implementation dispatches `rpgtracker:analytics` CustomEvents.

## Event schema

| Event | Payload | Current implementation point |
| --- | --- | --- |
| `goal_created` | `goal_id`, `source` (`manual`/`ai_plan`), `has_target_date`, `has_linked_skill`, `has_value_tracking` | Manual goal success in `/goals/new`; AI accepted-plan success in `/goals/ai/new`. |
| `ai_plan_generated` | `degraded_response`, `has_deadline`, `has_context`, `milestone_count`, `weekly_cadence_count`, `risk_count` | Successful `planGoal` mutation in `/goals/ai/new`. |
| `ai_plan_accepted` | `goal_id`, `degraded_response`, `generated_milestone_count`, `selected_milestone_count`, `edited_milestone_count`, `has_deadline` | Successful accepted-plan goal creation in `/goals/ai/new`. |
| `weekly_checkin_completed` | `goal_id`, `has_value`, `note_length_bucket` (`short`/`medium`/`long`), `previous_track_state` | Successful check-in creation in goal detail. |
| `offtrack_recovered` | `goal_id`, `previous_track_state` (`at_risk`/`behind`), `recovery_action` (`checkin`) | Emitted with check-in success when the latest forecast was `at_risk` or `behind`; this is an app-side recovery attempt signal until the backend returns a confirmed recovery state. |
| `paywall_viewed` | `surface`, `trigger` | Typed in scaffold; pending paywall surface from entitlement/billing track. |
| `upgrade_clicked` | `surface`, `trigger` | Typed in scaffold; pending upgrade CTA surface from entitlement/billing track. |

## Provider integration notes

Future provider adapters should translate the typed `AnalyticsEvent` object without changing call sites. Keep adapter configuration outside shared packages unless multiple apps need the same provider.

## Dependencies and gaps

- This branch is based on `origin/cursor/ai-goal-coach-ui-c6a8-0504`, so AI goal creation, plan generation, plan acceptance, goal forecast, and check-in surfaces are available.
- Paywall and upgrade UI are not present on this base branch. The events are reserved in the typed schema and should be wired when entitlement/billing UI lands.
- Recovery is inferred from the forecast state visible before check-in submission. If backend recovery semantics become stricter later, move `offtrack_recovered` emission to a server-confirmed recovery response.
