-- Follow-up to client-privacy.sql: clients lost SELECT on content_pieces, so the
-- feedback_comments policies (select + client insert branch) that subquery
-- content_pieces as the invoker returned nothing for clients. Use a SECURITY
-- DEFINER helper that returns the ids of the caller's own client content.
-- Idempotent.

CREATE OR REPLACE FUNCTION public.my_client_content_ids()
RETURNS SETOF TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.content_pieces
  WHERE org_id = public.get_my_org_id()
    AND client_id = public.get_my_client_id();
$$;

REVOKE ALL ON FUNCTION public.my_client_content_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_client_content_ids() TO authenticated;

DROP POLICY IF EXISTS "feedback_select" ON public.feedback_comments;
CREATE POLICY "feedback_select" ON public.feedback_comments FOR SELECT
  USING (
    org_id = public.get_my_org_id()
    AND (
      public.is_admin()
      OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
      OR (public.get_my_role() = 'client'
          AND content_id IN (SELECT public.my_client_content_ids()))
    )
  );

DROP POLICY IF EXISTS "feedback_insert" ON public.feedback_comments;
CREATE POLICY "feedback_insert" ON public.feedback_comments FOR INSERT
  WITH CHECK (
    org_id = public.get_my_org_id()
    AND author_id = auth.uid()
    AND resolved = false
    AND (
      (public.get_my_role() = 'client'
        AND author_type = 'client'
        AND content_id IN (SELECT public.my_client_content_ids()))
      OR
      (public.get_my_role() <> 'client'
        AND author_type = 'team'
        AND content_id IN (SELECT id FROM public.content_pieces WHERE org_id = public.get_my_org_id()))
    )
  );
