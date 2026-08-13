# Goals

Goals lets a user list goals by status, open manual creation, and enter the AI goal coach flow (subject to entitlement).

## Sub-features

- `goals-list` shows heading Goals and empty or card list.
- `goals-filter` switches All / Active / Completed / Abandoned tabs.
- `goals-new` opens `/goals/new` from + New Goal or Create your first goal.
- `goals-ai` opens `/goals/ai/new` from AI Plan (locked or entitled label differs).

## How to get to it (user POV)

- Open `/goals` while signed in (not currently in the primary sidebar; use URL or in-app links).
- Choose + New Goal or Create your first goal.
- Choose AI Plan (aria-label Unlock AI goal planning or Create goal with AI).

## Driving it with verify-lifequest

Preconditions:

- Doctor `--full` HEALTHY; signed in with verify credentials.

- **Open list.** Go to `/goals`. Heading `Goals` is visible; tablist Filter goals by status is present.
- **Filter.** Choose tab Active. `aria-selected=true` on Active; list reflects filter (or empty copy for that status).
- **Manual create.** Choose + New Goal. URL is `/goals/new`.
- **AI entry.** Choose AI Plan. URL is `/goals/ai/new` (gating UI may still appear on the wizard).
- **Proof.** Screenshot + ARIA under `artifacts/goals/` for list and for the create/AI destination.

## Gotchas

- Goals is not in the desktop Sidebar `NAV_ITEMS` today — URL `/goals` is the reliable entry.
- AI Plan locked vs entitled only changes aria-label/`data-testid`; both navigate to `/goals/ai/new`.
- Delete confirmation uses a dialog named Delete goal — cancel unless the recipe is explicitly testing delete, and only delete disposable verify goals.
