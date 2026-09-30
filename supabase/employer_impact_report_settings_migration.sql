-- Employer Impact Report: Print drawer Personalize settings, shared.
--
-- One row per employer (the report's Employer filter; 'all' when none is
-- picked). Everyone who opens that employer's Print drawer gets the same
-- settings, and edits save back here as they're made.
--
-- `settings` holds: title, includeCover, coverDescription, logoScale,
-- logoAlign, clientLogoScale, clientLogoAlign, bgType, bgColor, bgGradient,
-- bgCustomGradient, bgImage (an uploaded image, or { photo } for a stock
-- photo that's fetched again on open), customLogo (an uploaded employer
-- logo), showHeader, showFooter, headerId, footerId.
--
-- Shared by every signed-in user; anon gets no access (same as
-- employer_impact_report_notes).

CREATE TABLE IF NOT EXISTS public.employer_impact_report_settings (
  employer    text PRIMARY KEY,
  settings    jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by  text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.employer_impact_report_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on employer_impact_report_settings" ON public.employer_impact_report_settings;
CREATE POLICY "Allow all on employer_impact_report_settings" ON public.employer_impact_report_settings
  FOR ALL TO authenticated
  USING ((select auth.uid()) is not null) WITH CHECK ((select auth.uid()) is not null);

-- Rollback:
--   DROP TABLE IF EXISTS public.employer_impact_report_settings;
