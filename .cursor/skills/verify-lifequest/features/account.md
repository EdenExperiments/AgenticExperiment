# Account

Account shows profile fields, theme/visual mode controls, subscription/API key links, and Sign Out.

## Sub-features

- `account-open` shows settings grid and security actions.
- `account-api-key` links to `/account/api-key` for Add API key or Update or remove key.
- `account-password` links to Change Password (`/account/password`).
- `account-sign-out` returns the user to `/login`.

## How to get to it (user POV)

- Choose Account in the desktop sidebar or mobile Main navigation.
- Open `/account` while signed in.

## Driving it with verify-lifequest

Preconditions:

- Doctor `--full` HEALTHY; signed in with verify credentials.

- **Open account.** Go to `/account` or choose Account. `data-testid=settings-grid` is visible; Sign Out button is present.
- **API key entry.** Choose Add API key or Update or remove key. URL is `/account/api-key`.
- **Sign out.** Choose Sign Out. URL becomes `/login`; `/dashboard` again redirects to login.
- **Proof.** Screenshot + ARIA under `artifacts/account/` before and after sign-out.

## Gotchas

- Sign Out clears the session for that browser context — re-authenticate before further authenticated recipes.
- Subscription upgrade UI depends on tier; assert `data-testid=subscription-section` presence, not a specific paid state, unless the recipe sets tier up front.
- Do not paste real Claude API keys into proof artifacts or logs.
