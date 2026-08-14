# Docs

Permanent product and platform notes. **How a feature actually behaves lives in code and tests.** If a doc disagrees with a test, the test wins; fix the doc.

## Contract

| Kind | Where | Lifetime |
|------|--------|----------|
| Architecture, app split, practices, rough logic | this folder | Keep, keep short |
| Behaviour, edge cases, API contracts | `apps/` + `packages/` + `go test` / Vitest | Source of truth |
| In-depth agent plans | `docs/briefs/` (gitignored except README) | Delete after merge; promote any lasting rule here first |

Keep this folder short. Lasting rules are a couple of sentences, not a tracker or decision log.

## Read

| File | What |
|------|------|
| `product.md` | What we are building (suite, price, proof, rest) |
| `architecture.md` | Stack, data, sharing, namespaces |
| `monorepo.md` | Nx + pnpm, project names, how to add an app |
| `practices.md` | Security, tests, UI tokens, agent rules |
| `apps/` | Rough logic per app |
| `setup.md` | Local Supabase trigger notes |
| `CURSOR-AGENT-HANDBOOK.md` | CI / Bugbot / SDK automation (ops, not product) |
| `guides/` | Operator runbooks |
