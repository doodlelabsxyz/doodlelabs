-- ============================================================
-- AgencyOS — Repair: set org_id on all dummy-data.sql rows
-- Fill in your org UUID on the line below, then run.
-- ============================================================

DO $$
DECLARE
  v_org_id UUID := '34f8ca8a-dd5c-4ed6-93ce-883fcae5b64d';   -- ← paste your org UUID here

  -- All dummy user UUIDs inserted by dummy-data.sql
  dummy_user_ids UUID[] := ARRAY[
    'aa000001-0000-0000-0000-000000000001'::UUID,
    'aa000001-0000-0000-0000-000000000002'::UUID,
    'aa000001-0000-0000-0000-000000000003'::UUID,
    'aa000002-0000-0000-0000-000000000001'::UUID,
    'aa000002-0000-0000-0000-000000000002'::UUID,
    'aa000003-0000-0000-0000-000000000001'::UUID,
    'aa000003-0000-0000-0000-000000000002'::UUID,
    'aa000004-0000-0000-0000-000000000001'::UUID,
    'aa000004-0000-0000-0000-000000000002'::UUID,
    'aa000005-0000-0000-0000-000000000001'::UUID,
    'aa000005-0000-0000-0000-000000000002'::UUID,
    'aa000006-0000-0000-0000-000000000001'::UUID,
    'aa000006-0000-0000-0000-000000000002'::UUID,
    'aa000006-0000-0000-0000-000000000003'::UUID
  ];

  -- All dummy client company IDs inserted by dummy-data.sql
  dummy_client_ids TEXT[] := ARRAY['cl-4','cl-5','cl-6','cl-7','cl-8'];

BEGIN

  -- ── users ──────────────────────────────────────────────────────────────────
  UPDATE public.users
  SET org_id = v_org_id
  WHERE id = ANY(dummy_user_ids);

  -- ── clients ────────────────────────────────────────────────────────────────
  UPDATE public.clients
  SET org_id = v_org_id
  WHERE id = ANY(dummy_client_ids);

  -- ── client_users ───────────────────────────────────────────────────────────
  UPDATE public.client_users
  SET org_id = v_org_id
  WHERE user_id = ANY(dummy_user_ids);

  -- ── salary_records ─────────────────────────────────────────────────────────
  UPDATE public.salary_records
  SET org_id = v_org_id
  WHERE user_id = ANY(dummy_user_ids);

  -- ── tasks (any tasks assigned to dummy users) ───────────────────────────────
  UPDATE public.tasks
  SET org_id = v_org_id
  WHERE assigned_to = ANY(dummy_user_ids);

  -- ── content_pieces (any content belonging to dummy clients) ─────────────────
  UPDATE public.content_pieces
  SET org_id = v_org_id
  WHERE client_id = ANY(dummy_client_ids);

  -- ── assets (belonging to dummy clients) ────────────────────────────────────
  UPDATE public.assets
  SET org_id = v_org_id
  WHERE client_id = ANY(dummy_client_ids)
     OR uploaded_by = ANY(dummy_user_ids);

  -- ── invoices (belonging to dummy clients) ───────────────────────────────────
  UPDATE public.invoices
  SET org_id = v_org_id
  WHERE client_id = ANY(dummy_client_ids);

  -- ── ideas (created by dummy users) ─────────────────────────────────────────
  UPDATE public.ideas
  SET org_id = v_org_id
  WHERE created_by = ANY(dummy_user_ids)
     OR client_id = ANY(dummy_client_ids);

  -- ── feedback_comments (by dummy users) ─────────────────────────────────────
  UPDATE public.feedback_comments
  SET org_id = v_org_id
  WHERE author_id = ANY(dummy_user_ids);

  -- ── expenses (paid by dummy users) ─────────────────────────────────────────
  UPDATE public.expenses
  SET org_id = v_org_id
  WHERE paid_by = ANY(dummy_user_ids);

  -- ── notifications (for dummy users) ────────────────────────────────────────
  UPDATE public.notifications
  SET org_id = v_org_id
  WHERE for_user_id = ANY(dummy_user_ids);

  RAISE NOTICE 'org_id repair complete for org %', v_org_id;
END $$;
