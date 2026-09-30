-- Employer Impact Report: section notes written in the Print drawer.
--
-- One shared note per report section, so everyone who opens the drawer sees
-- (and edits) the same notes. `html` is the rich-text note as shown in the
-- PDF; `plain` is its text, used to tell an empty note from a real one.
--
-- Shared by every signed-in user. The report viewer build reads a snapshot,
-- never this table, so anon gets no access.

CREATE TABLE IF NOT EXISTS public.employer_impact_report_notes (
  section_id  text PRIMARY KEY,
  html        text NOT NULL DEFAULT '',
  plain       text NOT NULL DEFAULT '',
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employer_impact_report_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on employer_impact_report_notes" ON public.employer_impact_report_notes;
CREATE POLICY "Allow all on employer_impact_report_notes" ON public.employer_impact_report_notes
  FOR ALL TO authenticated
  USING ((select auth.uid()) is not null) WITH CHECK ((select auth.uid()) is not null);
