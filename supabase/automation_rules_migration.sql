-- Automation Rules (Settings > Automation Rules): account-level auto-apply
-- rules evaluated when a patient is enrolled in a care program.
--
-- A rule names the programs it watches (empty = any), conditions over the
-- patient's chronic conditions, assessment answers, recent events and labs
-- (matched all or any), the care plan templates to attach, and who reviews.
-- When it matches, the templates are attached to the program's care plan
-- unsigned (a draft) and a care manager review task is queued. Every
-- evaluation is logged in automation_rule_runs with the reasons it did or
-- didn't match. The engine is src/features/settings/automation-rules/lib.
--
-- Also: form_responses.patient_id, so assessment-answer conditions can read
-- a patient's latest responses once forms are filled for a patient.
--
-- Additive and idempotent. RLS: signed-in staff only.

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  description    text NOT NULL DEFAULT '',
  enabled        boolean NOT NULL DEFAULT true,
  -- Program codes (CARE_PROGRAM_CATALOG) the rule runs on; empty = any.
  program_codes  text[] NOT NULL DEFAULT '{}',
  match          text NOT NULL DEFAULT 'all' CHECK (match IN ('all', 'any')),
  -- [{ type: 'condition' | 'lab' | 'assessment' | 'event', ... }]
  conditions     jsonb NOT NULL DEFAULT '[]'::jsonb,
  template_ids   uuid[] NOT NULL DEFAULT '{}',
  -- Who the review task goes to: { id, name } of a staff member, or null for
  -- the program's assignee (unassigned when it has none).
  reviewer       jsonb,
  sort_order     integer NOT NULL DEFAULT 0,
  created_by     text,
  updated_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_rule_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id        uuid REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  patient_id     text NOT NULL,
  program_code   text,
  matched        boolean NOT NULL,
  -- ["HbA1c 9.4 % on 05/20/2026 is above 9", …], one line per condition
  reasons        jsonb NOT NULL DEFAULT '[]'::jsonb,
  template_ids   uuid[] NOT NULL DEFAULT '{}',
  task_id        text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS automation_rule_runs_rule_idx ON public.automation_rule_runs (rule_id, created_at DESC);
CREATE INDEX IF NOT EXISTS automation_rule_runs_patient_idx ON public.automation_rule_runs (patient_id);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rule_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage automation_rules" ON public.automation_rules;
CREATE POLICY "Staff manage automation_rules"
  ON public.automation_rules
  FOR ALL TO authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

DROP POLICY IF EXISTS "Staff manage automation_rule_runs" ON public.automation_rule_runs;
CREATE POLICY "Staff manage automation_rule_runs"
  ON public.automation_rule_runs
  FOR ALL TO authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

-- Assessment answers per patient.
ALTER TABLE public.form_responses ADD COLUMN IF NOT EXISTS patient_id text;
CREATE INDEX IF NOT EXISTS form_responses_patient_idx ON public.form_responses (patient_id) WHERE patient_id IS NOT NULL;

-- The example from the brief, off until someone turns it on: Diabetes with
-- HbA1c above 9 attaches the diabetes template. Skipped when no diabetes
-- template exists, and only seeded once.
INSERT INTO public.automation_rules (name, description, enabled, program_codes, match, conditions, template_ids, created_by)
SELECT
  'Diabetes + HbA1c > 9 → Diabetes template',
  'Uncontrolled diabetes at enrollment gets the diabetes care plan template for review.',
  false,
  '{}',
  'all',
  '[{"type":"condition","value":"Diabetes"},{"type":"lab","lab":"hba1c","op":">","value":9,"withinDays":365}]'::jsonb,
  ARRAY[t.id],
  'Fold Health'
FROM (
  SELECT id FROM public.care_plan_templates
  WHERE name ILIKE '%diabetes%' AND COALESCE(status, 'published') = 'published' AND COALESCE(scope, 'org') = 'org'
  ORDER BY (name ILIKE '%intensive%') DESC, created_at
  LIMIT 1
) t
WHERE NOT EXISTS (SELECT 1 FROM public.automation_rules WHERE name = 'Diabetes + HbA1c > 9 → Diabetes template');
