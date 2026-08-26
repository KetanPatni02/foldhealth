-- Add a `form_type` classification to public.forms and seed the CBP Visit
-- Note template row.
--
-- WHY
-- The Settings > Content > Forms tab lists every form the org has authored,
-- but until now the only classification was the free-text `category` column
-- (values like "Program" / "Service" / "Others" carried over from an earlier
-- consent-component grouping). The care-gap Clinical Note workspace has to
-- pick a form template per gap by TYPE (Note vs Assessment vs Consent…),
-- and staff filtering by "show me all Notes" cannot rely on a freeform
-- string. This adds a discrete `form_type` enum that both the Settings
-- Forms table and the care-gap workspace can key off.
--
-- ENUM
--   'Note'        — clinical / visit notes (CBP Visit Note, DM Foot Exam…)
--   'Assessment'  — screenings and assessments (PHQ-9, ACEs…)
--   'Intake'      — new-patient / program intake
--   'Consent'     — attestations and consents
--   'Other'       — default; anything unclassified
--
-- Kept as a text column with a CHECK constraint (not a Postgres ENUM type)
-- so future values can be added by a plain ALTER TABLE without the type-
-- alter dance a Postgres ENUM requires.
--
-- SAFETY
--   • Column is added with DEFAULT 'Other' so existing rows backfill in the
--     same statement.
--   • Seed uses ON CONFLICT (id) DO NOTHING so re-running the migration is
--     safe and won't overwrite hand-edits to the template.

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS form_type text NOT NULL DEFAULT 'Other';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'forms'
      AND constraint_name = 'forms_form_type_check'
  ) THEN
    ALTER TABLE public.forms
      ADD CONSTRAINT forms_form_type_check
      CHECK (form_type IN ('Note', 'Assessment', 'Intake', 'Consent', 'Other'));
  END IF;
END $$;

-- Seed the CBP Visit Note template. UUID is stable so downstream references
-- (feature code that opens this specific template) can rely on the id.
INSERT INTO public.forms (
  id, name, description, category, form_type, status, response_count, updated_at
) VALUES (
  '9c1b7f60-cbc0-4ecb-8a76-cb00cbcbcb00',
  'CBP Visit Note',
  'Controlling Blood Pressure — visit note capturing BP reading, method, and follow-up plan.',
  'Care Gap',
  'Note',
  'active',
  0,
  now()
) ON CONFLICT (id) DO NOTHING;
