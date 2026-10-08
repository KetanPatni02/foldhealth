-- Patient education content staff send from a worklist row ("Send Education"
-- → Send Content drawer). Public pages (MedlinePlus), so links open without
-- sign-in. Seeded by scripts/seed.js.
--
-- Read only by the signed-in app, so the policy is for authenticated users.

CREATE TABLE IF NOT EXISTS public.patient_education_content (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  category    text NOT NULL DEFAULT '',
  summary     text NOT NULL DEFAULT '',
  url         text NOT NULL,
  source      text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_education_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on patient_education_content" ON public.patient_education_content;
CREATE POLICY "Allow all on patient_education_content" ON public.patient_education_content
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
