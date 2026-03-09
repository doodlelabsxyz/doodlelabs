-- ================================================================
-- AgencyOS — Full Data Reset (Multi-Tenant Ready)
-- Wipes ALL data. Schema, RLS, functions, triggers remain intact.
-- Run in Supabase SQL Editor → then delete auth users from Dashboard.
-- ================================================================

-- Disable triggers temporarily so truncate is clean
SET session_replication_role = replica;

TRUNCATE TABLE
  public.audit_log,
  public.notifications,
  public.invites,
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
  public.clients,
  public.organizations
CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ================================================================
-- After running this SQL:
-- Supabase Dashboard → Authentication → Users → select all → Delete
-- ================================================================
