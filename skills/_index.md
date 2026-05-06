# Repository Skills Index

Use these repository-local skills to keep agent behavior consistent across Cursor IDE, cloud agents, and CI/CD automation.

## Skill Taxonomy

- `skills/backend/rpgtracker-backend/SKILL.md` - Go API work in `apps/api/`.
- `skills/frontend/rpgtracker-frontend/SKILL.md` - Next.js and UI work in app frontends and `packages/ui/`.
- `skills/testing/rpgtracker-testing/SKILL.md` - test strategy for logic/API/UI behavior.
- `skills/docs/requirements-docs-maintainer/SKILL.md` - product/planning/tracker documentation maintenance.
- `skills/release/finish-branch-and-pr/SKILL.md` - merge-readiness workflow and release hygiene.
- `skills/security/security-and-dependency-triage/SKILL.md` - triage and fix workflow for dependency/security findings.
- `skills/ops/local-dev-and-ci/SKILL.md` - local environment, CI baseline, and operational checks.

## Usage Rule

- Each skill defines `File Focus` and `Search Boundaries`. Follow those first.
- Start with the narrowest directory/file scope and expand only if required by concrete dependencies.
- Whole-repo scanning is an exception, not a default. Require explicit evidence or explicit user request before widening scope.