-- Storage bucket for program / care gap document files.
--
-- WHY
-- program_documents_file_migration.sql added file_url / storage_path and
-- left creating the `program-documents` bucket as a manual dashboard step.
-- It was never created, so every upload since then failed with "Bucket not
-- found": the row saved but file_url stayed null, and the document preview
-- (e.g. the CIS-CMB10 Immunization Record) is blank after a reload.
--
-- Public bucket so getPublicUrl() links resolve without a signed URL, like
-- report-covers. Signed-in users can upload, overwrite (the app uploads
-- with upsert), read and delete. Files already saved without bytes stay
-- empty; new uploads work once this runs.
--
-- Idempotent. Ask Alok Kumar to run this migration on Supabase.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('program-documents', 'program-documents', true, 26214400)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "program-documents upload" ON storage.objects;
CREATE POLICY "program-documents upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'program-documents');

-- upsert: true overwrites an existing object, which needs UPDATE.
DROP POLICY IF EXISTS "program-documents update" ON storage.objects;
CREATE POLICY "program-documents update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'program-documents')
  WITH CHECK (bucket_id = 'program-documents');

-- Storage's remove() reads the object row before deleting it.
DROP POLICY IF EXISTS "program-documents read" ON storage.objects;
CREATE POLICY "program-documents read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'program-documents');

DROP POLICY IF EXISTS "program-documents delete" ON storage.objects;
CREATE POLICY "program-documents delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'program-documents');

-- ── Verify ──
--   SELECT id, public FROM storage.buckets WHERE id = 'program-documents';

-- ── Rollback ──
--   DROP POLICY IF EXISTS "program-documents upload" ON storage.objects;
--   DROP POLICY IF EXISTS "program-documents update" ON storage.objects;
--   DROP POLICY IF EXISTS "program-documents read" ON storage.objects;
--   DROP POLICY IF EXISTS "program-documents delete" ON storage.objects;
--   -- empty the bucket in the dashboard, then: DELETE FROM storage.buckets WHERE id = 'program-documents';
