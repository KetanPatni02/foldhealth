-- Track which Care Plan Library templates are applied to a patient plan.
-- Rendered as badges in the Care Plan problems bar (CarePlanView).

ALTER TABLE public.patient_care_plans
  ADD COLUMN IF NOT EXISTS applied_template_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS patient_care_plans_applied_templates_idx
  ON public.patient_care_plans USING GIN (applied_template_ids);
