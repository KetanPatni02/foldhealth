-- CIS-CMB10 tracker: where each vaccine dose was (or will be) given.
--
-- WHY
-- The dose popup on the Vaccine Calendar lets the care team record the
-- location for a dose (clinic, pharmacy, school clinic), next to its note.
-- It lives on public.cis_dose_notes, the per-dose row the note already uses.
--
-- Run after supabase/cis_dose_notes_migration.sql. Idempotent.
-- Ask Alok Kumar to run this migration on Supabase.

ALTER TABLE public.cis_dose_notes
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';
