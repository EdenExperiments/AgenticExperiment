# Session index

Copy a prompt from the workstream file. Do not start until `requirements.md` is signed.

| ID | Workstream file | Stack | Depends | Tracker IDs | Verification |
|----|-----------------|-------|---------|-------------|--------------|
| LQ-01 | `01-lifequest-sufficient.md` | Go | — | F-009b | `cd apps/api && go test ./internal/handlers/ ./internal/skills/` |
| LQ-02 | `01-lifequest-sufficient.md` | TS | LQ-01 | F-009b | `pnpm --filter rpg-tracker test skill-detail` |
| LQ-03 | `01-lifequest-sufficient.md` | Go+TS | — | F-007 | handlers + skill-detail + QuickLogPanel |
| LQ-04 | `01-lifequest-sufficient.md` | TS | LQ-02 | F-010 | skill-detail |
| LQ-05 | `01-lifequest-sufficient.md` | Go+TS | LQ-03 | F-012 | handlers + skill-detail |
| NL-01 | `02-nutrilog-nutrition.md` | Go | — | F-018 | `go test ./internal/nutrilog/ ./internal/handlers/` |
| NL-02 | `02-nutrilog-nutrition.md` | TS | NL-01 | F-018 | api-client + nutri-log |
| NL-03 | `02-nutrilog-nutrition.md` | Go | — | F-014 | nutrilog + handlers (OFF stub) |
| NL-04 | `02-nutrilog-nutrition.md` | TS | NL-03 | F-014 | api-client + nutri-log |
| NL-05 | `02-nutrilog-nutrition.md` | Go+TS | NL-04 | F-016 | nutrilog + nutri-log |
| NL-06 | `02-nutrilog-nutrition.md` | Go+TS | NL-04 | F-015 | optional |
| RP-01 | `03-recipes-food-waste.md` | Go | NL-03 | F-076 | nutrilog + handlers |
| RP-02 | `03-recipes-food-waste.md` | TS | RP-01 | F-076 | nutri-log |
| RP-03 | `03-recipes-food-waste.md` | Go+TS | RP-02, NL-04 | F-017 | grounding unit tests + UI |
| RP-04 | `03-recipes-food-waste.md` | Go+TS | RP-03 | F-077 | cook → food_logs |
| WO-01 | `04-workout-proposed.md` | Go | D-067 build | F-078 | `internal/workout` |
| WO-02 | `04-workout-proposed.md` | TS | WO-01, D-067 | F-078 | `pnpm --filter workout test` |
| WO-03 | `04-workout-proposed.md` | Go+TS | WO-02 | F-078 | optional templates |

Parallel: LQ-* with NL-01/NL-03. Serial: NL-04 before RP-01. Never WO-* without D-067.
