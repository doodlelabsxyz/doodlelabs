-- Security hardening: remove anon exposure (Supabase advisor findings).
-- Idempotent; safe to re-run.
--
-- RISK: Low. Verified in code that no logged-out path queries tables with the
-- anon key: login/onboarding/reset-password read `users` only AFTER sign-in
-- (authenticated role); signup, invite GET/accept, superadmin use the
-- service-role client (bypasses grants). Service_role and authenticated keep
-- their privileges. Anything calling PostgREST/GraphQL with no JWT will now get 401/permission denied.
-- Manual (dashboard): Auth > Providers/Sign In > enable "Leaked password protection".

-- 1. Tables and view: no anon access
REVOKE ALL ON TABLE
  public.assets, public.audit_log, public.client_team, public.client_users,
  public.clients, public.content_pieces, public.content_scripts, public.expenses,
  public.feedback_comments, public.ideas, public.invites, public.invoices,
  public.notifications, public.organizations, public.salary_records,
  public.tasks, public.users
FROM anon;

DO $$
BEGIN
  IF to_regclass('public.content_pieces_client') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON public.content_pieces_client FROM anon';
  END IF;
END $$;

-- 2. Functions (looked up by name so missing/overloaded ones don't abort the script)
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN
      ('get_org_users_safe','feedback_comments_lock_identity','get_my_org_id','get_my_role','get_my_client_id','is_admin')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    IF f.proname = 'feedback_comments_lock_identity' THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', f.sig);
    ELSE
      -- RLS helpers and the RPC must stay callable by signed-in users
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
    END IF;
  END LOOP;
END $$;

-- 3. Future objects created by the migration owner (postgres) are not exposed to anon
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- ROLLBACK (uncomment to restore previous exposure):
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
-- GRANT EXECUTE ON FUNCTION public.get_org_users_safe(), public.feedback_comments_lock_identity(),
--   public.get_my_org_id(), public.get_my_role(), public.get_my_client_id(), public.is_admin() TO anon;
-- GRANT EXECUTE ON FUNCTION public.feedback_comments_lock_identity() TO authenticated;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
