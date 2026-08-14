# Docs

Permanent product and platform notes. **How a feature actually behaves lives in code and tests.** If a doc disagrees with a test, the test wins; fix the doc.

## Contract

| Kind | Where | Lifetime |
|------|--------|----------|
| Architecture, app split, practices, rough logic | this folder | Keep, keep short |
| Behaviour, edge cases, API contracts | `apps/` + `packages/` + `go test` / Vitest | Source of truth |
| In-depth agent plans | `docs/briefs/` (gitignored except README) | Delete after merge; promote any lasting rule here first |

Do not recreate a feature tracker, decision log, or `Documentation/delivery/` pack. Those went stale by design.

## Read

| File | What |
|------|------|
| `product.md` | What we are building (suite, price, proof, rest) |
| `architecture.md` | Stack, data, sharing, namespaces |
| `monorepo.md` | Nx + pnpm, how to add an app |
| `practices.md` | Security, tests, UI tokens, agent rules |
| `apps/` | Rough logic per app |
| `setup.md` | Local Supabase trigger notes |
| `CURSOR-AGENT-HANDBOOK.md` | CI / Bugbot / SDK automation (ops, not product) |
| `guides/` | Operator runbooks |

## Now (until the code catches up)

1. LifeQuest: users can **complete** blocker gates (API store is stubbed; UI form is not wired).
2. NutriLog: calorie/macro diary + goals on top of shipped weight logs.
3. Recipes: pantry-first, grounded in on-hand food (inside NutriLog).
4. Workout: later, own app, strength log first.
5. MindTrack: conversation in `apps/mindtrack.md` **before** any code.
