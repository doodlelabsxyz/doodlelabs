-- ================================================================
-- AgencyOS — Client Team Assignment Table
-- Run AFTER schema.sql in Supabase SQL Editor
-- Maps one default assignee per role per client
-- ================================================================

CREATE TABLE IF NOT EXISTS public.client_team (
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  role      TEXT NOT NULL CHECK (role IN ('writer','designer','videographer','editor','poster')),
  user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (client_id, role)
);

ALTER TABLE public.client_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_team_select" ON public.client_team FOR SELECT
  USING (
    public.is_admin()
    OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
  );

CREATE POLICY "client_team_insert" ON public.client_team FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "client_team_update" ON public.client_team FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "client_team_delete" ON public.client_team FOR DELETE
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_client_team_client ON public.client_team(client_id);
CREATE INDEX IF NOT EXISTS idx_client_team_user   ON public.client_team(user_id);
