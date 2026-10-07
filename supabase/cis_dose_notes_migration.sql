-- CIS-CMB10 tracker: one note per vaccine dose.
--
-- WHY
-- The Immunizations tab on a CIS-CMB10 care gap lets the care team write a
-- note against each dose of each vaccine, given or still planned (e.g.
-- "Parent wants to wait until the next visit"). Given doses themselves are
-- saved to public.patient_immunizations; this table only holds the notes.
--
-- KEY
-- One row per (hedis_member_id, antigen_key, dose_number). antigen_key is
-- the tracker's vaccine key (dtap, ipv, mmr, hib, hepb, vzv, pcv, hepa, rv,
-- flu) and dose_number is the 1-based row in that vaccine's dose list.
-- id = '<hedis_member_id>:<antigen_key>:<dose_number>' so the app can
-- upsert on it.
--
-- Idempotent. Ask Alok Kumar to run this migration on Supabase.

CREATE TABLE IF NOT EXISTS public.cis_dose_notes (
  id               text PRIMARY KEY,
  hedis_member_id  text NOT NULL,
  antigen_key      text NOT NULL,
  dose_number      integer NOT NULL CHECK (dose_number > 0),
  note             text NOT NULL DEFAULT '',
  updated_by       uuid,
  updated_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hedis_member_id, antigen_key, dose_number)
);

CREATE INDEX IF NOT EXISTS cis_dose_notes_member_idx
  ON public.cis_dose_notes (hedis_member_id);

ALTER TABLE public.cis_dose_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on cis_dose_notes" ON public.cis_dose_notes;
CREATE POLICY "Allow all on cis_dose_notes" ON public.cis_dose_notes
  FOR ALL TO authenticated
  USING ((select auth.uid()) is not null) WITH CHECK ((select auth.uid()) is not null);
