# Sign in and auth gate

Auth gate sends signed-out users to the login page, lets them open registration, and shows a visible error when email/password sign-in fails.

## Sub-features

- `auth-redirect` sends `/dashboard` (and other protected routes) to `/login` when there is no session.
- `auth-login-form` renders Email, Password, and Sign in on `/login`.
- `auth-register-link` opens `/register` from Create account.
- `auth-invalid` shows a role `alert` after a failed password sign-in.

## How to get to it (user POV)

- Open `http://localhost:3000/login` directly.
- Open any protected URL such as `/dashboard` while signed out (middleware redirects to `/login`).
- Choose Create account on the login page to reach `/register`.

## Driving it with verify-lifequest

Preconditions:

- LifeQuest is healthy at `LIFEQUEST_URL` (Doctor without `--full` is enough).
- No session cookies for the verify browser profile.
- `node .cursor/skills/verify-lifequest/scripts/doctor.mjs` reports HEALTHY.

- **Redirect.** Open `/dashboard` signed out. Run `node .cursor/skills/verify-lifequest/scripts/drive.mjs auth-login` (covers this and the steps below) or navigate manually. The URL becomes `/login`.
- **Login form.** On `/login`, assert heading `RPG Tracker`, labels Email and Password, button name `Sign in` (exact — social buttons also contain “Sign in”), link Create account.
- **Register entry.** Choose Create account. URL is `/register` and a Create account submit button is visible.
- **Invalid credentials.** On `/login`, fill a non-existent email and wrong password, choose Sign in. A role `alert` appears; URL stays on `/login`.
- **Proof.** Artifacts under `.cursor/skills/verify-lifequest/artifacts/auth-login/` include redirect, form, register, and invalid-credentials screenshots plus `.aria.txt` snapshots and `meta.json`.

## Gotchas

- Login brand text is `RPG Tracker`; the signed-in sidebar says `LifeQuest`. Assert the surface you are on.
- Social auth buttons may appear; password form proof does not require completing OAuth.
- A successful real sign-in needs valid Supabase users (`VERIFY_EMAIL` / `VERIFY_PASSWORD`) and is covered by authenticated feature files, not this one.
- Playwright’s `webServer` in `apps/rpg-tracker/playwright.config.ts` can start its own dev server during `e2e` runs — prefer this skill’s Launch ownership for agent verification.
- Driving `http://127.0.0.1:3000` while Next advertises `http://localhost:3000` blocks client JS (no React handlers → native GET form submit to `/login?` with no alert). Always use `localhost`.
