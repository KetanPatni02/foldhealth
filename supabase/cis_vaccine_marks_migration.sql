-- CIS-CMB10 tracker: vaccines the care team marked Immune or Contraindicated.
--
-- WHY
-- The Vaccine Calendar status spec adds two user-set states:
--   * Immune (Hep A, Hep B, MMR, VZV): a date and free-text details (history
--     of illness or a positive blood test). MMR lists the diseases covered
--     and needs all three (Measles, Mumps, Rubella). Counts toward HEDIS when
--     dated on or before the 2nd birthday.
--   * Contraindicated (any of the 10 vaccines): a date and a free-text
--     contraindication, on one dose (`dose_number`) only.
-- Either can be undone, which deletes the row; the dose(s) go back to their
-- normal status.
--
-- KEY
-- Immune: one row per vaccine, id = '<hedis_member_id>:<antigen_key>',
-- dose_number NULL. Contraindicated: one row per dose,
-- id = '<hedis_member_id>:<antigen_key>:<dose_number>'. The app upserts on
-- id. `mark_date` is MM/DD/YYYY, like patient_immunizations.date_administered.
--
-- Idempotent. Ask Alok Kumar to run this migration on Supabase.

CREATE TABLE IF NOT EXISTS public.cis_vaccine_marks (
  id               text PRIMARY KEY,
  hedis_member_id  text NOT NULL,
  antigen_key      text NOT NULL,
  kind             text NOT NULL CHECK (kind IN ('immune', 'contraindicated')),
  dose_number      integer CHECK (dose_number IS NULL OR dose_number > 0),
  mark_date        text NOT NULL,
  details          text NOT NULL,
  diseases         text[] NOT NULL DEFAULT '{}',
  updated_by       uuid,
  updated_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'immune') = (dose_number IS NULL))
);

CREATE INDEX IF NOT EXISTS cis_vaccine_marks_member_idx
  ON public.cis_vaccine_marks (hedis_member_id);

ALTER TABLE public.cis_vaccine_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on cis_vaccine_marks" ON public.cis_vaccine_marks;
CREATE POLICY "Allow all on cis_vaccine_marks" ON public.cis_vaccine_marks
  FOR ALL TO authenticated
  USING ((select auth.uid()) is not null) WITH CHECK ((select auth.uid()) is not null);
