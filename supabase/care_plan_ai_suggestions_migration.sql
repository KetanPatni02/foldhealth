-- Individualized Plan AI: goals, interventions and barriers UnityAI drafted
-- onto a patient's care plan stay flagged for care manager review, with the
-- reasoning and the patient inputs that drove each one.
--
--   ai_suggested    true on an item UnityAI drafted
--   ai_rationale    why it was suggested, in a sentence
--   ai_citations    [{ fact, kind, text, date }]: the conditions, labs and lab
--                   trends, events, assessments and barriers it cites, as they
--                   read when the plan was drafted
--   ai_reviewed_by / ai_reviewed_at
--                   who cleared the flag and when (null while awaiting review)
--
-- The pipeline is care-plan/lib/individualizedPlan.js (facts, prompt,
-- validation) and /api/care-plan-individualized. Additive and idempotent;
-- these tables keep their existing RLS.

ALTER TABLE public.patient_care_plan_goals
  ADD COLUMN IF NOT EXISTS ai_suggested   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_rationale   text,
  ADD COLUMN IF NOT EXISTS ai_citations   jsonb,
  ADD COLUMN IF NOT EXISTS ai_reviewed_by text,
  ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamptz;

ALTER TABLE public.patient_care_plan_interventions
  ADD COLUMN IF NOT EXISTS ai_suggested   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_rationale   text,
  ADD COLUMN IF NOT EXISTS ai_citations   jsonb,
  ADD COLUMN IF NOT EXISTS ai_reviewed_by text,
  ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamptz;

ALTER TABLE public.patient_care_plan_barriers
  ADD COLUMN IF NOT EXISTS ai_suggested   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_rationale   text,
  ADD COLUMN IF NOT EXISTS ai_citations   jsonb,
  ADD COLUMN IF NOT EXISTS ai_reviewed_by text,
  ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamptz;

-- "Awaiting review" counts per plan.
CREATE INDEX IF NOT EXISTS patient_care_plan_goals_ai_pending_idx
  ON public.patient_care_plan_goals (plan_id) WHERE ai_suggested AND ai_reviewed_at IS NULL;
CREATE INDEX IF NOT EXISTS patient_care_plan_interventions_ai_pending_idx
  ON public.patient_care_plan_interventions (plan_id) WHERE ai_suggested AND ai_reviewed_at IS NULL;
CREATE INDEX IF NOT EXISTS patient_care_plan_barriers_ai_pending_idx
  ON public.patient_care_plan_barriers (plan_id) WHERE ai_suggested AND ai_reviewed_at IS NULL;
