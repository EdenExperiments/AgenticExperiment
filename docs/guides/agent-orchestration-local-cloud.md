# Agent Orchestration: Local and Cloud

SDK automation in `packages/cursor-agents/` supports a **local vs cloud** runtime split.
PR **review** is owned by **Bugbot** (`BUGBOT.md`); SDK scripts supplement with highlights and
optional gated remediation.

Full architecture: `docs/CURSOR-AGENT-HANDBOOK.md` · Brief: `Documentation/agentic-pipeline/`.

## Runtime selector

- `CURSOR_RUNTIME`: `local` (default) or `cloud`
- Cloud runs need `CURSOR_CLOUD_REPO_URL` or `GITHUB_REPOSITORY` in CI

## Active SDK scripts

```bash
# Security / dependency triage (comments)
pnpm --filter @rpgtracker/cursor-agents run security-triage:local

# Renovate breaking-dep assessment (highlight-only comments)
pnpm --filter @rpgtracker/cursor-agents run dep-assess

# Optional gated remediation (Sonar-first; /cursor-fix in PR comments)
pnpm --filter @rpgtracker/cursor-agents run fix-attempt:cloud

# Maintenance queue artifact (for Automations or manual dispatch)
pnpm --filter @rpgtracker/cursor-agents run maintenance-queue
```

## SDK vs Cursor Automations

| Use GitHub Actions + SDK when | Use Cursor Automations when |
|-------------------------------|-----------------------------|
| Renovate PR opened → `dep-assess` | Prefer cloud sandbox dispatch over GH runner capacity |
| Daily digest / queue scoring | Weekly maintenance cron dispatching cloud agents |
| `/cursor-fix` remediation with repo gates | Event triggers already configured in Cursor dashboard |

Automations are **optional**; the repo ships working GH Action entry points by default.

## SDK remediation gates

1. `CURSOR_AUTO_FIX_ENABLED=true` (repo variable)
2. PR label `cursor:auto-fix` (or `CURSOR_AUTO_FIX_LABEL`)
3. Trigger: `/cursor-fix` comment or `workflow_dispatch`

Sonar/check context is primary; Bugbot and `dep-assess` comments are **advisory**.

## Related

- Agent PR labeling: `.github/workflows/cursor-agent-pr-labels.yml`
- Operator checklist: `docs/guides/agentic-pipeline-operator-checklist.md`
