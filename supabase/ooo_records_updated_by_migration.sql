-- Out of Office records: who last changed each one, for the records table's
-- "Last Updated" column (created_by / created_at / updated_at already exist).
-- Existing rows take their creator. Safe to re-run.
--
-- Run after supabase/ooo_records_migration.sql.

ALTER TABLE public.ooo_records ADD COLUMN IF NOT EXISTS updated_by text;

UPDATE public.ooo_records SET updated_by = created_by WHERE updated_by IS NULL;
