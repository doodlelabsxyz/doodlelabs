-- ============================================================
-- AgencyOS — Complete Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES (must come before functions that reference them)
-- ============================================================

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','writer','designer','videographer','editor','poster','client')),
  tasks_today   INT  NOT NULL DEFAULT 0,
  tasks_total   INT  NOT NULL DEFAULT 0,
  salary        NUMERIC,
  email         TEXT,
  phone         TEXT,
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  active        BOOLEAN DEFAULT TRUE
);

-- ─── Clients ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                     TEXT NOT NULL,
  industry                 TEXT NOT NULL,
  brand_color              TEXT NOT NULL DEFAULT 'hsl(200,82%,58%)',
  platforms                TEXT[] NOT NULL DEFAULT '{}',
  requires_client_approval BOOLEAN DEFAULT FALSE,
  initials                 TEXT NOT NULL,
  content_quota       INT DEFAULT 0,
  pending_approvals        INT DEFAULT 0,
  monthly_retainer         NUMERIC,
  contact_name             TEXT,
  contact_email            TEXT,
  contract_start           DATE,
  notes                    TEXT,
  drive_folder_id          TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Client ↔ User link (for client-role users) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_users (
  user_id   UUID REFERENCES public.users(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, client_id)
);

-- ─── Content Pieces ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_pieces (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id      TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('graphic','video','reel','story')),
  platforms      TEXT[] NOT NULL DEFAULT '{}',
  scheduled_date DATE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
                   'planned','brief-ready','in-design','in-editing',
                   'ready-for-review','client-review','approved','scheduled','posted','overdue'
                 )),
  caption        TEXT,
  brief          TEXT,
  assigned_to    TEXT[] NOT NULL DEFAULT '{}',
  asset_ids      TEXT[] NOT NULL DEFAULT '{}',
  notes          TEXT,
  thumbnail      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tasks ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content_id  TEXT NOT NULL REFERENCES public.content_pieces(id) ON DELETE CASCADE,
  client_id   TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  due_date    DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in-progress','done','overdue')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Assets ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assets (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content_id    TEXT NOT NULL REFERENCES public.content_pieces(id) ON DELETE CASCADE,
  client_id     TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('graphic','raw-footage','edited-video','brand-material')),
  file_name     TEXT NOT NULL,
  uploaded_by   UUID NOT NULL REFERENCES public.users(id),
  uploaded_at   TIMESTAMPTZ DEFAULT NOW(),
  file_size     TEXT,
  drive_file_id TEXT
);

-- ─── Content Scripts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.content_scripts (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content_id       TEXT NOT NULL UNIQUE REFERENCES public.content_pieces(id) ON DELETE CASCADE,
  graphic_copy     JSONB,
  scenes           JSONB,
  frames           JSONB,
  hook_line        TEXT,
  total_duration   TEXT,
  music_direction  TEXT,
  hashtag_strategy TEXT,
  alt_text         TEXT,
  internal_notes   TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Ideas ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ideas (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title      TEXT NOT NULL,
  type       TEXT CHECK (type IN ('graphic','video','reel','story')),
  client_id  TEXT REFERENCES public.clients(id) ON DELETE SET NULL,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'raw' CHECK (status IN ('raw','shortlisted','converted')),
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tags       TEXT[] DEFAULT '{}'
);

-- ─── Feedback Comments ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback_comments (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content_id  TEXT NOT NULL REFERENCES public.content_pieces(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.users(id),
  author_name TEXT NOT NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('team','client')),
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved    BOOLEAN DEFAULT FALSE,
  parent_id   TEXT REFERENCES public.feedback_comments(id) ON DELETE CASCADE
);

-- ─── Invoices ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id   TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month       TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue')),
  due_date    DATE NOT NULL,
  paid_at     TIMESTAMPTZ,
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Salary Records ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.salary_records (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month      TEXT NOT NULL,
  amount     NUMERIC NOT NULL,
  paid       BOOLEAN DEFAULT FALSE,
  paid_at    TIMESTAMPTZ,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Expenses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category    TEXT NOT NULL CHECK (category IN ('software','equipment','freelance','marketing','office','other')),
  description TEXT NOT NULL,
  amount      NUMERIC NOT NULL,
  date        DATE NOT NULL,
  paid_by     UUID NOT NULL REFERENCES public.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  for_roles   TEXT[] NOT NULL DEFAULT '{}',
  for_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
                'task-assigned','task-overdue','approval-needed',
                'client-note','plan-reminder','content-approved'
              )),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  read        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  content_id  TEXT REFERENCES public.content_pieces(id) ON DELETE SET NULL
);

-- ============================================================
-- HELPER FUNCTIONS (after tables exist)
-- ============================================================

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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pieces    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_scripts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE POLICY "users_select" ON public.users FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "users_insert" ON public.users FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "users_update" ON public.users FOR UPDATE
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "users_delete" ON public.users FOR DELETE
  USING (public.is_admin());

-- ─── clients ─────────────────────────────────────────────────────────────────
CREATE POLICY "clients_select" ON public.clients FOR SELECT
  USING (
    public.is_admin()
    OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
    OR id = public.get_my_client_id()
  );

CREATE POLICY "clients_insert" ON public.clients FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "clients_update" ON public.clients FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "clients_delete" ON public.clients FOR DELETE
  USING (public.is_admin());

-- ─── client_users ────────────────────────────────────────────────────────────
CREATE POLICY "client_users_select" ON public.client_users FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "client_users_insert" ON public.client_users FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "client_users_delete" ON public.client_users FOR DELETE
  USING (public.is_admin());

-- ─── content_pieces ──────────────────────────────────────────────────────────
CREATE POLICY "content_select" ON public.content_pieces FOR SELECT
  USING (
    public.is_admin()
    OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
    OR client_id = public.get_my_client_id()
  );

CREATE POLICY "content_insert" ON public.content_pieces FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin','writer'));

CREATE POLICY "content_update" ON public.content_pieces FOR UPDATE
  USING (
    public.is_admin()
    OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
  );

CREATE POLICY "content_delete" ON public.content_pieces FOR DELETE
  USING (public.is_admin());

-- ─── tasks ───────────────────────────────────────────────────────────────────
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT
  USING (public.is_admin() OR assigned_to = auth.uid());

CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE
  USING (public.is_admin() OR assigned_to = auth.uid());

CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE
  USING (public.is_admin());

-- ─── assets ──────────────────────────────────────────────────────────────────
CREATE POLICY "assets_select" ON public.assets FOR SELECT
  USING (
    public.is_admin()
    OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
    OR client_id = public.get_my_client_id()
  );

CREATE POLICY "assets_insert" ON public.assets FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin','designer','videographer','editor'));

CREATE POLICY "assets_delete" ON public.assets FOR DELETE
  USING (public.is_admin());

-- ─── content_scripts ─────────────────────────────────────────────────────────
CREATE POLICY "scripts_select" ON public.content_scripts FOR SELECT
  USING (
    public.is_admin()
    OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
  );

CREATE POLICY "scripts_insert" ON public.content_scripts FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin','writer'));

CREATE POLICY "scripts_update" ON public.content_scripts FOR UPDATE
  USING (public.get_my_role() IN ('admin','writer'));

-- ─── ideas ───────────────────────────────────────────────────────────────────
CREATE POLICY "ideas_select" ON public.ideas FOR SELECT
  USING (
    public.is_admin()
    OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
  );

CREATE POLICY "ideas_insert" ON public.ideas FOR INSERT
  WITH CHECK (public.get_my_role() IN ('admin','writer','designer','videographer','editor','poster'));

CREATE POLICY "ideas_update" ON public.ideas FOR UPDATE
  USING (public.is_admin() OR created_by = auth.uid());

CREATE POLICY "ideas_delete" ON public.ideas FOR DELETE
  USING (public.is_admin() OR created_by = auth.uid());

-- ─── feedback_comments ───────────────────────────────────────────────────────
CREATE POLICY "feedback_select" ON public.feedback_comments FOR SELECT
  USING (
    public.is_admin()
    OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
    OR (public.get_my_role() = 'client' AND author_id = auth.uid())
  );

CREATE POLICY "feedback_insert" ON public.feedback_comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "feedback_update" ON public.feedback_comments FOR UPDATE
  USING (public.is_admin() OR author_id = auth.uid());

-- ─── invoices ────────────────────────────────────────────────────────────────
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT
  USING (public.is_admin());

CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE
  USING (public.is_admin());

-- ─── salary_records ──────────────────────────────────────────────────────────
CREATE POLICY "salary_select" ON public.salary_records FOR SELECT
  USING (public.is_admin() OR user_id = auth.uid());

CREATE POLICY "salary_insert" ON public.salary_records FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "salary_update" ON public.salary_records FOR UPDATE
  USING (public.is_admin());

-- ─── expenses ────────────────────────────────────────────────────────────────
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT
  USING (public.is_admin());

CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE
  USING (public.is_admin());

-- ─── notifications ───────────────────────────────────────────────────────────
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  USING (
    for_user_id = auth.uid()
    OR public.get_my_role() = ANY(for_roles)
  );

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  USING (
    for_user_id = auth.uid()
    OR public.get_my_role() = ANY(for_roles)
  );

CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_content_client   ON public.content_pieces(client_id);
CREATE INDEX IF NOT EXISTS idx_content_date     ON public.content_pieces(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_status   ON public.content_pieces(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned   ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due        ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_client  ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status  ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_salary_user      ON public.salary_records(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_content ON public.feedback_comments(content_id);
CREATE INDEX IF NOT EXISTS idx_notif_user       ON public.notifications(for_user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status     ON public.ideas(status);
