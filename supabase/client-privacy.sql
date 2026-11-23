-- ============================================================================
-- client-privacy.sql  (T5: hide internal content_pieces.notes / brief from clients)
-- Idempotent. NOT yet applied. Review, then run once in the Supabase SQL editor.
--
-- PROBLEM
--   RLS is row-level only. A user with role 'client' passes content_select for
--   their client's rows and can therefore SELECT every column, incl. `notes`.
--
-- DESIGN CHOSEN: client-safe view + clients removed from base-table SELECT
--   Column-level REVOKE/GRANT was rejected: every logged-in user (admin, staff,
--   client) connects as the SAME Postgres role `authenticated`, so a column
--   grant cannot distinguish a client from staff; revoking `notes` would break
--   every staff query that selects it (brief page, '*' selects, realtime).
--
--   1. public.content_pieces_client: view with explicit safe columns (no
--      notes, no brief). security_invoker = false (runs as owner, bypasses
--      RLS) on purpose, because clients no longer have base-table SELECT; the
--      view therefore does its own tenant + client filtering using the
--      SECURITY DEFINER helpers (get_my_org_id / get_my_client_id / role).
--      anon and PUBLIC have no access.
--   2. content_select is narrowed to admin + staff roles in the caller's org.
--      Clients get zero rows from the base table.
--   3. Postgres applies SELECT policies to UPDATE ... WHERE/RETURNING, so the
--      old direct client UPDATE (policy content_client_update) would stop
--      working once clients lose SELECT. It is replaced by a SECURITY DEFINER
--      RPC public.client_review_content(p_id, p_action) that validates org,
--      ownership and status, and only ever sets status to 'approved' or
--      'in-design'. The policy is dropped (clients get no direct UPDATE).
--      The app's approval page calls the RPC (same commit).
--
-- TRADEOFFS / RISKS
--   * Definer view: correctness depends on the WHERE clause below; keep it in
--     sync with content_select if roles change.
--   * Any other client-side read of content_pieces (embedded joins such as
--     feedback_comments -> content_pieces, notification joins, RLS policies on
--     other tables that subquery content_pieces as the invoker) now returns
--     nothing for clients. Pages in app/(shell)/client/* were switched to the
--     view; verify notifications for client accounts after applying.
--   * DB triggers on content_pieces that are not SECURITY DEFINER and read
--     content_pieces as the client will see no rows (only notification text).
--   * audit_log stores to_jsonb(NEW) incl. notes: keep audit_log admin-only.
-- ============================================================================

-- ── 1. Client-safe view ──────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.content_pieces_client
WITH (security_invoker = false) AS
SELECT
  cp.id,
  cp.client_id,
  cp.org_id,
  cp.title,
  cp.type,
  cp.platforms,
  cp.scheduled_date,
  cp.status,
  cp.caption,
  cp.assigned_to,
  cp.thumbnail,
  cp.created_at
FROM public.content_pieces cp
WHERE cp.org_id = public.get_my_org_id()
  AND (
    public.is_admin()
    OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
    OR cp.client_id = public.get_my_client_id()
  );

REVOKE ALL ON public.content_pieces_client FROM PUBLIC, anon;
GRANT SELECT ON public.content_pieces_client TO authenticated;

-- ── 2. Base table: clients no longer SELECT ──────────────────────────────────
DROP POLICY IF EXISTS "content_select" ON public.content_pieces;
CREATE POLICY "content_select" ON public.content_pieces FOR SELECT
  USING (
    org_id = public.get_my_org_id()
    AND (
      public.is_admin()
      OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
    )
  );

-- ── 3. Client approve / request-changes via RPC instead of direct UPDATE ─────
DROP POLICY IF EXISTS "content_client_update" ON public.content_pieces;

CREATE OR REPLACE FUNCTION public.client_review_content(p_id TEXT, p_action TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status TEXT;
  v_row        public.content_pieces%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  v_new_status := CASE p_action
    WHEN 'approve' THEN 'approved'
    WHEN 'changes' THEN 'in-design'
    ELSE NULL
  END;
  IF v_new_status IS NULL THEN
    RAISE EXCEPTION 'invalid action' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.content_pieces WHERE id = p_id;
  IF NOT FOUND
     OR v_row.org_id IS DISTINCT FROM public.get_my_org_id()
     OR NOT (
       v_row.client_id = public.get_my_client_id()
       OR public.is_admin()
       OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
     )
  THEN
    RAISE EXCEPTION 'content not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.status NOT IN ('client-review','ready-for-review') THEN
    RAISE EXCEPTION 'content is not awaiting client review' USING ERRCODE = '22023';
  END IF;

  UPDATE public.content_pieces SET status = v_new_status WHERE id = p_id;
  RETURN v_new_status;
END;
$$;

REVOKE ALL ON FUNCTION public.client_review_content(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_review_content(TEXT, TEXT) TO authenticated;

-- ── Verification (run manually, as comments) ─────────────────────────────────
-- -- In SQL editor, impersonate a client user:
-- --   SET LOCAL ROLE authenticated;
-- --   SELECT set_config('request.jwt.claims', '{"sub":"<client-user-uuid>","role":"authenticated"}', true);
-- --   SELECT count(*) FROM public.content_pieces;          -- expect 0
-- --   SELECT * FROM public.content_pieces_client LIMIT 3;   -- rows, no notes/brief columns
-- --   SELECT notes FROM public.content_pieces_client;       -- expect ERROR column does not exist
-- -- Impersonate admin/staff:
-- --   SELECT count(*) FROM public.content_pieces;          -- full rows incl. notes
-- -- Anon:
-- --   SET LOCAL ROLE anon; SELECT * FROM public.content_pieces_client;  -- permission denied
-- -- Policies / function:
-- --   SELECT policyname FROM pg_policies WHERE tablename = 'content_pieces';  -- no content_client_update
-- --   SELECT public.client_review_content('<piece-id-in-client-review>', 'approve'); -- 'approved'
