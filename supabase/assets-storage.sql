-- Asset uploads via Supabase Storage (private, org-scoped bucket 'assets')
-- Path convention: <org_id>/<client_id | 'general'>/<uuid>-<filename>
-- Idempotent. Review before applying.

-- 1. assets table: storage pointer + allow standalone / non-client uploads
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.assets ALTER COLUMN content_id DROP NOT NULL;
ALTER TABLE public.assets ALTER COLUMN client_id  DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_storage_path ON public.assets(storage_path);

-- 2. Bucket (private, 25 MB, common media/doc types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets', 'assets', false, 26214400,
  ARRAY[
    'image/png','image/jpeg','image/webp','image/gif','image/svg+xml',
    'video/mp4','video/quicktime','video/webm','video/x-matroska',
    'application/pdf','application/zip','application/x-zip-compressed',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. storage.objects policies (first path segment = org_id)
DROP POLICY IF EXISTS "assets_obj_select" ON storage.objects;
DROP POLICY IF EXISTS "assets_obj_insert" ON storage.objects;
DROP POLICY IF EXISTS "assets_obj_delete" ON storage.objects;

-- Staff read everything in their org; clients read only their own client's folder
CREATE POLICY "assets_obj_select" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
    AND (
      public.is_admin()
      OR public.get_my_role() IN ('writer','designer','videographer','editor','poster')
      OR (
        public.get_my_role() = 'client'
        AND (storage.foldername(name))[2] = public.get_my_client_id()::text
      )
    )
  );

-- Same roles as assets_insert on the table
CREATE POLICY "assets_obj_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
    AND public.get_my_role() IN ('admin','designer','videographer','editor')
  );

-- Admin only
CREATE POLICY "assets_obj_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'assets'
    AND (storage.foldername(name))[1] = public.get_my_org_id()::text
    AND public.is_admin()
  );
