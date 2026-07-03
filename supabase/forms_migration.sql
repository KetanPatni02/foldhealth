-- ============================================================
-- Forms: Settings → Content → Forms (form builder)
-- Run this in the Supabase SQL Editor.
--
-- Mirrors the campaigns table conventions:
--   • snake_case columns, BIGSERIAL pk, RLS "allow all" policy
--   • updated_by UUID → public.profiles(id) so PostgREST can resolve the
--     "Last Updated By" join the list table selects
--   • triggers stamp updated_by + updated_at on every write
--
-- Large JSONB lives in `schema` (the FHIR-shaped questionnaire item tree) and
-- `scoring` (scores[] + criticalTriggers[], consumed by the scoring engine in
-- src/features/forms/scoring). These are excluded from the list select for
-- performance and fetched on demand when the builder opens.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.forms (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  description    TEXT,
  category       TEXT,
  status         TEXT DEFAULT 'draft',          -- 'draft' | 'published'
  schema         JSONB DEFAULT '{"items":[]}'::jsonb,
  scoring        JSONB DEFAULT '{"scores":[],"criticalTriggers":[]}'::jsonb,
  settings       JSONB DEFAULT '{}'::jsonb,      -- layout mode, theme, etc.
  response_count INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  updated_by     UUID REFERENCES public.profiles(id)
);

-- Captured form submissions. response_count on forms is the denormalized count
-- the list table reads; this table holds the actual QuestionnaireResponse-shaped
-- answers + the evaluated scores at submit time.
CREATE TABLE IF NOT EXISTS public.form_responses (
  id          BIGSERIAL PRIMARY KEY,
  form_id     BIGINT REFERENCES public.forms(id) ON DELETE CASCADE,
  answers     JSONB DEFAULT '{}'::jsonb,
  scores      JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now(),
  created_by  UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to forms" ON public.forms;
CREATE POLICY "Allow all access to forms"
  ON public.forms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to form_responses" ON public.form_responses;
CREATE POLICY "Allow all access to form_responses"
  ON public.form_responses FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS forms_updated_by_idx ON public.forms (updated_by);
CREATE INDEX IF NOT EXISTS forms_category_idx   ON public.forms (category);
CREATE INDEX IF NOT EXISTS forms_status_idx     ON public.forms (status);
CREATE INDEX IF NOT EXISTS form_responses_form_id_idx ON public.form_responses (form_id);

-- Stamp updated_at + updated_by on every write. auth.uid() is the session
-- user (null for service-role / unauthenticated — falls back to "—" in the UI).
CREATE OR REPLACE FUNCTION public.touch_forms_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS forms_touch_updated ON public.forms;
CREATE TRIGGER forms_touch_updated
  BEFORE INSERT OR UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.touch_forms_updated();

-- Keep forms.response_count in sync as submissions arrive / are removed.
CREATE OR REPLACE FUNCTION public.sync_form_response_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.forms SET response_count = response_count + 1 WHERE id = NEW.form_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.forms SET response_count = GREATEST(0, response_count - 1) WHERE id = OLD.form_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS form_responses_count_sync ON public.form_responses;
CREATE TRIGGER form_responses_count_sync
  AFTER INSERT OR DELETE ON public.form_responses
  FOR EACH ROW EXECUTE FUNCTION public.sync_form_response_count();
