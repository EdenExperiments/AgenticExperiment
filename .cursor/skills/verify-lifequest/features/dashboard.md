# Dashboard

Dashboard is the signed-in home: empty-state onboarding when the user has no skills, or focus/stats/activity when they do.

## Sub-features

- `dashboard-empty` shows Begin Your Quest and Create your first skill when there are no skills.
- `dashboard-populated` shows heading Dashboard, stats region, and activity when skills exist.
- `dashboard-quick-log` opens Log XP from the dashboard when skills exist.

## How to get to it (user POV)

- After sign-in, land on `/dashboard` (root `/` redirects session users here).
- Choose Dashboard in the desktop sidebar or mobile Main navigation.

## Driving it with verify-lifequest

Preconditions:

- Full stack healthy: `node .cursor/skills/verify-lifequest/scripts/doctor.mjs --full`.
- `VERIFY_EMAIL` and `VERIFY_PASSWORD` set.
- Browser signed in (fill Email/Password on `/login`, choose Sign in, wait for `/dashboard`).

- **Open dashboard.** Navigate to `/dashboard` or choose sidebar link Dashboard. Heading `Dashboard` or empty-state heading `Begin Your Quest` is visible; sidebar shows `LifeQuest`.
- **Empty state.** With zero skills, choose Create your first skill. URL becomes `/skills/new`.
- **Populated state.** With skills, assert `role=region` name `/Stats/i` (`data-testid=stats-grid`) and activity content.
- **Proof.** Screenshot + ARIA snapshot under `artifacts/dashboard/` showing brand `LifeQuest` and either empty CTA or stats. For empty→create, capture `/skills/new` as the resulting state.

## Gotchas

- Unauthenticated visits redirect to `/login` — that proves the auth gate, not dashboard.
- Dashboard data requires the Go API and local Postgres; frontend-only Launch is insufficient.
- Quick Log and tier modals depend on existing skills; do not invent DOM via test hooks.
