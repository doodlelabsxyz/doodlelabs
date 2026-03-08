-- ================================================================
-- AgencyOS — Drop derived columns from users table
-- Run in Supabase SQL Editor (one-time migration)
-- Safe to run even if columns are already dropped
-- ================================================================

ALTER TABLE public.users DROP COLUMN IF EXISTS initials;
ALTER TABLE public.users DROP COLUMN IF EXISTS avatar_color;
