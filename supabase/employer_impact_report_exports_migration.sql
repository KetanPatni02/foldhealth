-- Employer Impact Report: export history (the report header's History button).
--
-- One row each time someone exports the report from the Print drawer:
-- Download PDF, Download HTML or Print. Records the format and what the
-- report covered (employer, time frame, date range) when it was exported.
--
-- Shared by every signed-in user; anon gets no access.

CREATE TABLE IF NOT EXISTS public.employer_impact_report_exports (
  id           text PRIMARY KEY,
  format       text NOT NULL CHECK (format IN ('pdf', 'html', 'print')),
  employer     text,
  time_frame   text,
  date_range   text,
  filename     text,
  exported_by  text,
  exported_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS employer_impact_report_exports_at_idx
  ON public.employer_impact_report_exports (exported_at DESC);
ALTER TABLE public.employer_impact_report_exports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on employer_impact_report_exports" ON public.employer_impact_report_exports;
CREATE POLICY "Allow all on employer_impact_report_exports" ON public.employer_impact_report_exports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
