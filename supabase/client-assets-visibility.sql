-- Clients should only see assets that are client-appropriate:
--   * deliverables whose content piece is in client-review / approved / scheduled / posted
--   * brand-material assets with no content piece (shared brand files)
-- Staff behavior is unchanged. Applies to the assets table AND the storage bucket.
-- Idempotent.

CREATE OR REPLACE FUNCTION public.client_can_see_asset(p_content_id TEXT, p_type TEXT, p_client_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_client_id IS NOT DISTINCT FROM public.get_my_client_id()::text
    AND (
      (p_content_id IS NULL AND p_type = 'brand-material')
      OR EXISTS (
        SELECT 1 FROM public.content_pieces cp
        WHERE cp.id = p_content_id
          AND cp.org_id = public.get_my_org_id()
          AND cp.status IN ('client-review','approved','scheduled','posted')
      )
    );
$$;
REVOKE ALL ON FUNCTION public.client_can_see_asset(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_can_see_asset(TEXT, TEXT, TEXT) TO authenticated;

-- Storage side: map an object path to its asset row and apply the same rule
CREATE OR REPLACE FUNCTION public.client_can_see_asset_path(p_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.storage_path = p_path
      AND a.org_id = public.get_my_org_id()
      AND public.client_can_see_asset(a.content_id::text, a.type::text, a.client_id::text)
  );
$$;
REVOKE ALL ON FUNCTION public.client_can_see_asset_path(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_can_see_asset_path(TEXT) TO authenticated;

DROP POLICY IF EXISTS "assets_select" ON public.assets;
CREATE POLICY "assets_select" ON public.assets FOR SELECT
  USING (
    org_id = public.get_my_org_id()
    AND (
      public.is_admin()
      OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
      OR (public.get_my_role() = 'client'
          AND public.client_can_see_asset(content_id::text, type::text, client_id::text))
    )
  );

DROP POLICY IF EXISTS "assets_obj_select" ON storage.objects;
CREATE POLICY "assets_obj_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
    AND (
      public.is_admin()
      OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
      OR (public.get_my_role() = 'client' AND public.client_can_see_asset_path(name))
    )
  );
