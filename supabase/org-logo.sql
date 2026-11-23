-- Agency logo: stores the Storage PATH (bucket 'assets') on the organization.
-- Kept separate from logo_url, which invoice pages use as a direct <img src>.
-- Idempotent. Review before applying. Requires assets-storage.sql (bucket + RLS).

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_path TEXT;

-- orgs_update policy (multi-tenant.sql) already restricts updates to admins of the own org.
