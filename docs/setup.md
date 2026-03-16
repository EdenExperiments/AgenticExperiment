# Deployment Setup

## Supabase Auth Trigger (MANUAL STEP — one-time setup)

After deploying the application for the first time, you must manually create the
auth trigger in the Supabase dashboard. **This cannot be automated via golang-migrate**
because the migrate tool does not have access to the `auth` schema.

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
    VALUES (
        NEW.id,
        NEW.email,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Step 2: Attach the trigger to auth.users.
-- Must be run in the Supabase SQL Editor (requires access to the auth schema).
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

After running this SQL, any new user who registers via Supabase Auth will
automatically get a corresponding row in `public.users`.

## Verification

After creating a user via Supabase Auth, verify the trigger works by running
in the Supabase SQL Editor:

```sql
SELECT id, email, created_at FROM public.users ORDER BY created_at DESC LIMIT 5;
```

The newly created user should appear in the results.
