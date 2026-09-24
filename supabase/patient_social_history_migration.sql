-- Social History questionnaire, one row per patient: the PAMI/Hx Social
-- History drawer (Tobacco, Exercise, SDOH, and Alcohol, tobacco and other
-- substances) and the answers its card lists.
--
-- Answers live in one jsonb object keyed by question id rather than a column
-- per question: the form has ~20 questions that change together, several are
-- multi-selects whose options themselves contain commas, and the question set
-- is defined in src/reference-data/socialHistoryQuestionnaire.js. Shapes:
--   select → "Former user"
--   multi  → ["Cigarettes", "Cigar/Pipe"]
--   text   → "1 pack per day for 10 years"
--   yes/no → "Yes" | "No"
--
-- Read with the anon key, so the table needs a permissive policy or it
-- returns 0 rows and the card renders empty.

CREATE TABLE IF NOT EXISTS public.patient_social_history (
  patient_id    text PRIMARY KEY,
  answers       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_social_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on patient_social_history" ON public.patient_social_history;
CREATE POLICY "Allow all on patient_social_history" ON public.patient_social_history
  FOR ALL USING (true) WITH CHECK (true);
