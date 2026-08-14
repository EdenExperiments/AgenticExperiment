# Agentic Pipeline — Operator Checklist (Dashboard-Side Setup)

The repo-side configuration for CI agent jobs lives in code and is covered by CI. The items below CANNOT be expressed as repo code — they are GitHub/Cursor dashboard settings an operator must apply. Track completion here.

## M0 — Foundation controls

### GitHub repo settings

- [ ] **Branch protection on `main`**: require pull request review (1 human approval), require
  status checks: `CI`, `SonarCloud Code Analysis` quality gate, and (after M3) the Bugbot
  "no open medium+ findings" check. Disallow force pushes.
- [ ] **Repo variable `AGENTS_ENABLED`** created (value `true`). Setting it to `false` is the
  repo-side kill-switch: all `cursor-*` agent workflows skip. Note: Cursor-side Automations do
  NOT respect this variable — see Cursor dashboard section.
- [ ] **CODEOWNERS enforcement**: "Require review from Code Owners" enabled on `main` so
  `.github/`, `.cursor/`, `BUGBOT.md`, and `packages/cursor-agents/` changes need owner approval.
- [ ] Confirm `tech-debt` label exists (Pillar C intake) plus `deps:safe` / `deps:breaking`
  (Pillar A) and `agentic-pipeline` labels.

### Cursor dashboard (team settings)

- [ ] **Usage caps / budget**: set a monthly usage cap for the team pool covering Bugbot runs
  (~$1.00–$1.50/run; autofix loops multiply runs per PR) and Automations (Max Mode billing).
  Model expected runs/month per pillar (brief §8.6) before enabling auto-dispatch.
- [ ] **Kill-switch equivalents**: know where to disable each Automation and Bugbot for this repo;
  these are the Cursor-side mirrors of `AGENTS_ENABLED` (brief §6 governance gap).
- [ ] **Cloud agent environment**: verify cloud agents pick up `.cursor/environment.json` +
  `.cursor/Dockerfile` and can run `pnpm install`, `pnpm test:ci`, and `go test ./...`. Add scoped
  secrets (none currently required for build/test) via Dashboard → Cloud Agents → Secrets.

## M3 — Bugbot + Autofix (Pillar B)

- [ ] Enable **Bugbot** on this repo (it reads `BUGBOT.md` at repo root for standards).
- [ ] Enable **Autofix in propose mode** (fix-as-comment, merge via `@cursor` command). Do NOT
  enable direct-push until golden-PR evidence justifies it (D-056).
- [ ] Set the **iteration cap** (recommended: 3 review→fix cycles, then escalate to human).
- [ ] Add the **"no open medium+ Bugbot findings" status check** to branch protection required
  checks once it starts reporting.
- [ ] Confirm custom SDK pipeline reviewer is retired in repo (D-060); Bugbot is the sole PR reviewer.

## M4 — Maintenance queue dispatch (Pillar C)

- [ ] *(Optional)* Create a **Cursor Automation: weekly tech-debt cron** (suggested: Monday 06:00 UTC) when cloud dispatch is preferred over running agents from GH Actions alone.
  Prompt: run the maintenance queue selection (`pnpm --filter @rpgtracker/cursor-agents run
  maintenance-queue`) and dispatch one cloud agent per eligible item, each producing a small
  test-backed PR referencing the originating finding. Respect the concurrent bot-PR cap reported
  by the queue script.
- [ ] Create a **Cursor Automation: Renovate PR event trigger** for `deps:breaking` PRs to run the
  dependency assessment flow when GitHub Actions capacity is not preferred (the GitHub workflow
  `cursor-security-triage.yml` covers this by default; the Automation is the §4 dispatch-layer
  alternative).
- [ ] Confirm Automations run under a team-owned service account and bill to the team pool;
  review permission scope explicitly (brief §6).

## M6 — Telemetry

- [ ] Create (or designate) a **metrics dashboard issue** and set repo variable
  `CURSOR_METRICS_ISSUE_NUMBER` so the weekly metrics workflow upserts its report there.

## Standing controls

- Concurrent open bot PRs capped at 3–5 (enforced by the maintenance queue selection; spot-check
  it is holding).
- All agent PRs converge through the same path: Bugbot review, severity gate, CI + Sonar, human
  approval. No silent merges, ever.
