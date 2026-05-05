-- Reverse of 000013_subscription_tier.up.sql
ALTER TABLE public.users DROP COLUMN IF EXISTS subscription_tier;
