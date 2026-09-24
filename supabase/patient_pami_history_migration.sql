-- The PAMI/Hx tab's Medical, Surgical and Family History cards. (Social
-- History is a questionnaire, not a list, so it has its own table: see
-- patient_social_history_migration.sql.)
-- Until now these were constants in PAMIHxTab.jsx, so every patient showed
-- the same "Appendectomy" and the same father with heart disease.
--
-- (Recent Clinical Events and Lab / Imaging Reports stay static in the tab
-- for now; they have no source to read from yet, so they get no table.)
--
-- Read with the anon key, so the table needs a permissive policy or it
-- returns 0 rows and the cards render empty.

-- One row per history entry. Which fields matter depends on `kind`:
--   medical  → title + recorded_on (when it was noted)
--   surgical → title + recorded_on (the performed date) + code / code_system
--   family   → relation + title (the relative's name) + detail
-- `synced` = false drives each card's "Not Synced (N)" footer.
--
-- Surgical codes come from the NLM Clinical Tables procedure list. Its key is
-- NLM's own id for the procedure, not CPT or SNOMED, and code_system says so
-- rather than letting it pass for a standard terminology.
CREATE TABLE IF NOT EXISTS public.patient_history_entries (
  id           text PRIMARY KEY,
  patient_id   text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('medical', 'surgical', 'family')),
  title        text NOT NULL,
  code         text,
  code_system  text,
  detail       text NOT NULL DEFAULT '',
  relation     text,
  recorded_on  date,
  synced       boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_history_entries_patient_id_idx
  ON public.patient_history_entries (patient_id);
ALTER TABLE public.patient_history_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on patient_history_entries" ON public.patient_history_entries;
CREATE POLICY "Allow all on patient_history_entries" ON public.patient_history_entries
  FOR ALL USING (true) WITH CHECK (true);
