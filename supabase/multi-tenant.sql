-- ============================================================
-- AgencyOS — Multi-Tenancy Migration
-- Run AFTER schema.sql and seed.sql in Supabase SQL Editor
-- ============================================================

-- ─── 1. Organizations ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL,
  slug                   TEXT NOT NULL UNIQUE,
  logo_url               TEXT,
  plan                   TEXT NOT NULL DEFAULT 'starter'
                           CHECK (plan IN ('starter','growth','pro')),
  plan_status            TEXT NOT NULL DEFAULT 'trialing'
                           CHECK (plan_status IN ('trialing','active','past_due','canceled')),
  trial_ends_at          TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  -- Billing placeholders — will be populated when payment provider is chosen
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Invites ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('admin','writer','designer','videographer','editor','poster','client')),
  token        TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Add org_id column to all existing tables ─────────────────────────────

ALTER TABLE public.users             ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.clients           ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.client_users      ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.content_pieces    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.tasks             ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.assets            ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.content_scripts   ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.ideas             ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.feedback_comments ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.invoices          ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.salary_records    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.expenses          ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.notifications     ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- client_team and audit_log may or may not exist — use DO blocks
DO $$ BEGIN
  ALTER TABLE public.client_team ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END; $$;

DO $$ BEGIN
  ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END; $$;

-- ─── 4. Backfill: create default org for existing demo data ──────────────────

INSERT INTO public.organizations (id, name, slug, plan, plan_status, trial_ends_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Agency', 'demo-agency', 'pro', 'active', NULL)
ON CONFLICT DO NOTHING;

UPDATE public.users             SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.clients           SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.client_users      SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.content_pieces    SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.tasks             SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.assets            SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.content_scripts   SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.ideas             SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.feedback_comments SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.invoices          SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.salary_records    SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.expenses          SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.notifications     SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

DO $$ BEGIN
  UPDATE public.client_team SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL; END; $$;

DO $$ BEGIN
  UPDATE public.audit_log SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL; END; $$;

-- ─── 5. Helper Functions (org-scoped, SECURITY DEFINER bypasses RLS) ──────────

CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Existing functions re-declared (no change needed, but ensures they exist)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_my_client_id()
RETURNS TEXT AS $$
  SELECT client_id FROM public.client_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── 6. RLS on new tables ─────────────────────────────────────────────────────

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites       ENABLE ROW LEVEL SECURITY;

-- organizations: any member can read their own org; only admin can update
DROP POLICY IF EXISTS "orgs_select" ON public.organizations;
CREATE POLICY "orgs_select" ON public.organizations FOR SELECT
  USING (id = public.get_my_org_id());

DROP POLICY IF EXISTS "orgs_update" ON public.organizations;
CREATE POLICY "orgs_update" ON public.organizations FOR UPDATE
  USING (id = public.get_my_org_id() AND public.is_admin());

-- Insert is handled exclusively by service role (API route) — block all regular inserts
DROP POLICY IF EXISTS "orgs_insert" ON public.organizations;
CREATE POLICY "orgs_insert" ON public.organizations FOR INSERT
  WITH CHECK (false);

-- invites: admin can read/create; accept is handled by service role
DROP POLICY IF EXISTS "invites_select" ON public.invites;
CREATE POLICY "invites_select" ON public.invites FOR SELECT
  USING (org_id = public.get_my_org_id() AND public.is_admin());

DROP POLICY IF EXISTS "invites_insert" ON public.invites;
CREATE POLICY "invites_insert" ON public.invites FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND public.is_admin());

DROP POLICY IF EXISTS "invites_update" ON public.invites;
CREATE POLICY "invites_update" ON public.invites FOR UPDATE
  USING (false); -- only service role can mark invites as accepted

-- ─── 7. Update RLS on all existing tables ────────────────────────────────────
-- Strategy: drop existing policies, recreate with org_id scoping added.
-- Self-access (id = auth.uid()) does NOT need org check — SECURITY DEFINER
-- functions in the helper make the check safe against cross-org leakage.

-- ── users ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (id = auth.uid() OR (public.is_admin() AND org_id = public.get_my_org_id()));

CREATE POLICY "users_insert" ON public.users FOR INSERT
  WITH CHECK (false); -- only service role (API routes)

CREATE POLICY "users_update" ON public.users FOR UPDATE
  USING (id = auth.uid() OR (public.is_admin() AND org_id = public.get_my_org_id()));

CREATE POLICY "users_delete" ON public.users FOR DELETE
  USING (public.is_admin() AND org_id = public.get_my_org_id());

-- ── clients ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

CREATE POLICY "clients_select" ON public.clients FOR SELECT
  USING (
    org_id = public.get_my_org_id()
    AND (
      public.is_admin()
      OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
      OR id = public.get_my_client_id()
    )
  );

CREATE POLICY "clients_insert" ON public.clients FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND public.is_admin());

CREATE POLICY "clients_update" ON public.clients FOR UPDATE
  USING (org_id = public.get_my_org_id() AND public.is_admin());

CREATE POLICY "clients_delete" ON public.clients FOR DELETE
  USING (org_id = public.get_my_org_id() AND public.is_admin());

-- ── client_users ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "client_users_select" ON public.client_users;
DROP POLICY IF EXISTS "client_users_insert" ON public.client_users;
DROP POLICY IF EXISTS "client_users_delete" ON public.client_users;

CREATE POLICY "client_users_select" ON public.client_users FOR SELECT
  USING (org_id = public.get_my_org_id() AND (user_id = auth.uid() OR public.is_admin()));

CREATE POLICY "client_users_insert" ON public.client_users FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND public.is_admin());

CREATE POLICY "client_users_delete" ON public.client_users FOR DELETE
  USING (org_id = public.get_my_org_id() AND public.is_admin());

-- ── content_pieces ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "content_select" ON public.content_pieces;
DROP POLICY IF EXISTS "content_insert" ON public.content_pieces;
DROP POLICY IF EXISTS "content_update" ON public.content_pieces;
DROP POLICY IF EXISTS "content_delete" ON public.content_pieces;

CREATE POLICY "content_select" ON public.content_pieces FOR SELECT
  USING (
    org_id = public.get_my_org_id()
    AND (
      public.is_admin()
      OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
      OR client_id = public.get_my_client_id()
    )
  );

CREATE POLICY "content_insert" ON public.content_pieces FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','writer'));

CREATE POLICY "content_update" ON public.content_pieces FOR UPDATE
  USING (
    org_id = public.get_my_org_id()
    AND (
      public.is_admin()
      OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
    )
  );

CREATE POLICY "content_delete" ON public.content_pieces FOR DELETE
  USING (org_id = public.get_my_org_id() AND public.is_admin());

-- ── tasks ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT
  USING (org_id = public.get_my_org_id() AND (public.is_admin() OR assigned_to = auth.uid()));

CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND public.is_admin());

CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE
  USING (org_id = public.get_my_org_id() AND (public.is_admin() OR assigned_to = auth.uid()));

CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE
  USING (org_id = public.get_my_org_id() AND public.is_admin());

-- ── assets ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "assets_select" ON public.assets;
DROP POLICY IF EXISTS "assets_insert" ON public.assets;
DROP POLICY IF EXISTS "assets_delete" ON public.assets;

CREATE POLICY "assets_select" ON public.assets FOR SELECT
  USING (
    org_id = public.get_my_org_id()
    AND (
      public.is_admin()
      OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
      OR client_id = public.get_my_client_id()
    )
  );

CREATE POLICY "assets_insert" ON public.assets FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','designer','videographer','editor'));

CREATE POLICY "assets_delete" ON public.assets FOR DELETE
  USING (org_id = public.get_my_org_id() AND public.is_admin());

-- ── content_scripts ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "scripts_select" ON public.content_scripts;
DROP POLICY IF EXISTS "scripts_insert" ON public.content_scripts;
DROP POLICY IF EXISTS "scripts_update" ON public.content_scripts;

CREATE POLICY "scripts_select" ON public.content_scripts FOR SELECT
  USING (
    org_id = public.get_my_org_id()
    AND (public.is_admin() OR public.get_my_role() IN ('writer','designer','videographer','editor','poster'))
  );

CREATE POLICY "scripts_insert" ON public.content_scripts FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','writer'));

CREATE POLICY "scripts_update" ON public.content_scripts FOR UPDATE
  USING (org_id = public.get_my_org_id() AND public.get_my_role() IN ('admin','writer'));

-- ── ideas ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ideas_select" ON public.ideas;
DROP POLICY IF EXISTS "ideas_insert" ON public.ideas;
DROP POLICY IF EXISTS "ideas_update" ON public.ideas;
DROP POLICY IF EXISTS "ideas_delete" ON public.ideas;

CREATE POLICY "ideas_select" ON public.ideas FOR SELECT
  USING (
    org_id = public.get_my_org_id()
    AND (public.is_admin() OR public.get_my_role() IN ('writer','designer','videographer','editor','poster'))
  );

CREATE POLICY "ideas_insert" ON public.ideas FOR INSERT
  WITH CHECK (
    org_id = public.get_my_org_id()
    AND public.get_my_role() IN ('admin','writer','designer','videographer','editor','poster')
  );

CREATE POLICY "ideas_update" ON public.ideas FOR UPDATE
  USING (org_id = public.get_my_org_id() AND (public.is_admin() OR created_by = auth.uid()));

CREATE POLICY "ideas_delete" ON public.ideas FOR DELETE
  USING (org_id = public.get_my_org_id() AND (public.is_admin() OR created_by = auth.uid()));

-- ── feedback_comments ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "feedback_select" ON public.feedback_comments;
DROP POLICY IF EXISTS "feedback_insert" ON public.feedback_comments;
DROP POLICY IF EXISTS "feedback_update" ON public.feedback_comments;

CREATE POLICY "feedback_select" ON public.feedback_comments FOR SELECT
  USING (
    org_id = public.get_my_org_id()
    AND (
      public.is_admin()
      OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
      OR (public.get_my_role() = 'client' AND author_id = auth.uid())
    )
  );

CREATE POLICY "feedback_insert" ON public.feedback_comments FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND auth.uid() IS NOT NULL);

CREATE POLICY "feedback_update" ON public.feedback_comments FOR UPDATE
  USING (org_id = public.get_my_org_id() AND (public.is_admin() OR author_id = auth.uid()));

-- ── invoices ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
DROP POLICY IF EXISTS "invoices_delete" ON public.invoices;

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT
  USING (org_id = public.get_my_org_id() AND public.is_admin());

CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND public.is_admin());

CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE
  USING (org_id = public.get_my_org_id() AND public.is_admin());

CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE
  USING (org_id = public.get_my_org_id() AND public.is_admin());

-- ── salary_records ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "salary_select" ON public.salary_records;
DROP POLICY IF EXISTS "salary_insert" ON public.salary_records;
DROP POLICY IF EXISTS "salary_update" ON public.salary_records;

CREATE POLICY "salary_select" ON public.salary_records FOR SELECT
  USING (org_id = public.get_my_org_id() AND (public.is_admin() OR user_id = auth.uid()));

CREATE POLICY "salary_insert" ON public.salary_records FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND public.is_admin());

CREATE POLICY "salary_update" ON public.salary_records FOR UPDATE
  USING (org_id = public.get_my_org_id() AND public.is_admin());

-- ── expenses ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;

CREATE POLICY "expenses_select" ON public.expenses FOR SELECT
  USING (org_id = public.get_my_org_id() AND public.is_admin());

CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND public.is_admin());

CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE
  USING (org_id = public.get_my_org_id() AND public.is_admin());

-- ── notifications ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  USING (
    org_id = public.get_my_org_id()
    AND (for_user_id = auth.uid() OR public.get_my_role() = ANY(for_roles))
  );

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  USING (
    org_id = public.get_my_org_id()
    AND (for_user_id = auth.uid() OR public.get_my_role() = ANY(for_roles))
  );

CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT
  WITH CHECK (org_id = public.get_my_org_id() AND public.is_admin());

-- ── client_team (if it exists) ────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "client_team_select" ON public.client_team;
  DROP POLICY IF EXISTS "client_team_insert" ON public.client_team;
  DROP POLICY IF EXISTS "client_team_update" ON public.client_team;
  DROP POLICY IF EXISTS "client_team_delete" ON public.client_team;

  EXECUTE $p$
    CREATE POLICY "client_team_select" ON public.client_team FOR SELECT
      USING (org_id = public.get_my_org_id()
        AND (public.is_admin() OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')));
    CREATE POLICY "client_team_insert" ON public.client_team FOR INSERT
      WITH CHECK (org_id = public.get_my_org_id() AND public.is_admin());
    CREATE POLICY "client_team_update" ON public.client_team FOR UPDATE
      USING (org_id = public.get_my_org_id() AND public.is_admin());
    CREATE POLICY "client_team_delete" ON public.client_team FOR DELETE
      USING (org_id = public.get_my_org_id() AND public.is_admin());
  $p$;
EXCEPTION WHEN undefined_table THEN NULL; END; $$;

-- ── audit_log (if it exists) ──────────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "audit_select" ON public.audit_log;
  EXECUTE $p$
    CREATE POLICY "audit_select" ON public.audit_log FOR SELECT
      USING (org_id = public.get_my_org_id() AND public.is_admin());
  $p$;
EXCEPTION WHEN undefined_table THEN NULL; END; $$;

-- ─── 8. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_org         ON public.users(org_id);
CREATE INDEX IF NOT EXISTS idx_clients_org       ON public.clients(org_id);
CREATE INDEX IF NOT EXISTS idx_content_org       ON public.content_pieces(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org         ON public.tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_assets_org        ON public.assets(org_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(org_id);
CREATE INDEX IF NOT EXISTS idx_invites_token     ON public.invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_org       ON public.invites(org_id);
CREATE INDEX IF NOT EXISTS idx_orgs_slug         ON public.organizations(slug);
