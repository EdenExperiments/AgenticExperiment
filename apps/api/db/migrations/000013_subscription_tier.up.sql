-- Wave 4 T16: Entitlements foundation.
--
-- Adds a subscription_tier column to public.users.
-- The column is intentionally narrow (TEXT CHECK) rather than an enum type
-- so that adding new tiers (e.g. 'team', 'enterprise') in future migrations
-- does not require an ALTER TYPE that locks the table.
--
-- Provider-specific billing IDs (Stripe customer_id, etc.) are NOT stored here;
-- they belong in a separate billing table added when a payment provider is chosen.
--
-- Default is 'free' so existing users transparently remain on the free tier.

ALTER TABLE public.users
    ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free'
        CHECK (subscription_tier IN ('free', 'pro'));

COMMENT ON COLUMN public.users.subscription_tier IS
    'Subscription tier controlling access to premium features. free | pro.';
