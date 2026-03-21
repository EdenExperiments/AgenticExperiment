# Deployment Setup

## Database architecture

This project uses a **split-database architecture**:

| Database | Where | Purpose |
|---|---|---|
| Supabase (cloud) | `https://[project].supabase.co` | Auth only — `auth.users`, JWT signing |
| Docker postgres | `localhost:5432/rpgtracker` | All application data — `public.users`, `public.skills`, etc. |

The Go API validates JWTs against Supabase, but reads and writes all application data against the local Docker container. **These are separate databases — data written to one is never visible in the other.**

## Local development: no trigger needed

For local dev, the `ensureUserMiddleware` in `apps/api/internal/server/server.go` handles user
provisioning automatically. On every authenticated request, it calls `GetOrCreateUser` which
upserts the `public.users` row in the local Docker postgres. No manual setup required.

If you wipe the local DB (`docker compose down -v`) and restart, users will re-provision on their
next API request.

---

## Cloud / production deployment: Supabase auth trigger

For a production deployment where both auth and application data live in Supabase, you can
optionally install a database trigger so that new users get a `public.users` row immediately
on sign-up (rather than waiting for first API request).

> **Note:** This trigger fires inside Supabase's postgres only. It has no effect on a local
> Docker postgres. For local dev, rely on `ensureUserMiddleware` instead.

### Installing the trigger

1. Open the Supabase dashboard for your project.
2. Navigate to **SQL Editor**.
3. Run the following SQL:

```sql
-- Step 1: Create the trigger function in the public schema.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Step 2: Attach the trigger to auth.users.
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

### Verification (cloud only)

After creating a user via Supabase Auth, verify the trigger fired by running in the Supabase SQL Editor:

```sql
SELECT id, email, created_at FROM public.users ORDER BY created_at DESC LIMIT 5;
```

The newly registered user should appear. If they don't, the `ensureUserMiddleware` will still
create their row on first API request — the trigger is an optimisation, not a hard requirement.
