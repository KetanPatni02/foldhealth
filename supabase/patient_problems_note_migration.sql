-- Patient problems: a free-text note per problem.
--
-- The Add Problems drawer (Figma P360 8207:294267) captures an optional note
-- alongside onset, status, severity and type when a condition is added, and
-- the problem row's "View Note" link reads it back. One column, nullable in
-- effect via its default, so existing rows stay valid.
--
-- Idempotent: `add column if not exists` makes re-running safe.

ALTER TABLE public.patient_problems
  ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.patient_problems.note IS
  'Free-text clinical note captured when the problem was added.';
