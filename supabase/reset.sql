-- ================================================================
-- AgencyOS — Full Data Reset
-- Wipes all table data. Schema, RLS, triggers remain intact.
-- Run in Supabase SQL Editor when starting fresh.
-- ================================================================
-- NOTE: After running this, also delete users manually:
--   Supabase Dashboard → Authentication → Users → select all → Delete

-- Truncate in reverse-dependency order (CASCADE handles FKs automatically)
TRUNCATE TABLE
  public.audit_log,
  public.notifications,
  public.client_team,
  public.client_users,
  public.assets,
  public.content_scripts,
  public.feedback_comments,
  public.tasks,
  public.ideas,
  public.salary_records,
  public.expenses,
  public.invoices,
  public.content_pieces,
  public.users,
  public.clients
CASCADE;

-- ================================================================
-- OPTIONAL: Also wipe auth users via SQL (needs superuser access)
-- If the above doesn't work for auth.users, use the Dashboard UI instead:
--   Authentication → Users → select all → Delete
-- ================================================================
-- DELETE FROM auth.users;
