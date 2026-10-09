-- Care plan templates applied more than once.
--
-- A template on a patient's plan is now an *instance* with a start and an end.
-- When the same template is added again (typically because it is recommended
-- again), the template's `renewal` decides what happens, and the user confirms
-- it at apply time:
--
--   extend     disease-based: keep the instance and its start date, move its
--              end date out by the template's longest goal duration
--   reinstate  event-based (TOC): auto-close the current instance (completed
--              when every goal and intervention is met, closed otherwise),
--              start a new instance with fresh items, keep the old ones as
--              history
--
-- The old instance's goals, interventions and barriers stay in their tables
-- for history, marked with `retired_instance_id`, and leave the live lists.

ALTER TABLE public.care_plan_templates
  ADD COLUMN IF NOT EXISTS renewal text NOT NULL DEFAULT 'extend';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'care_plan_templates_renewal_check') THEN
    ALTER TABLE public.care_plan_templates
      ADD CONSTRAINT care_plan_templates_renewal_check CHECK (renewal IN ('extend', 'reinstate'));
  END IF;
END $$;

-- Defaults for the existing library: condition templates extend, general ones
-- and transition-of-care / post-event ones reinstate.
UPDATE public.care_plan_templates
SET renewal = 'reinstate'
WHERE coalesce(array_length(conditions, 1), 0) = 0
   OR name ~* '(\mTOC\M|transition|discharge|post-)';

CREATE TABLE IF NOT EXISTS public.patient_care_plan_template_instances (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       uuid NOT NULL REFERENCES public.patient_care_plans(id) ON DELETE CASCADE,
  template_id   uuid NOT NULL,
  template_name text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'closed')),
  -- True when a reinstate closed it rather than a person.
  auto_closed   boolean NOT NULL DEFAULT false,
  -- Null for templates applied before instances were recorded.
  started_at    timestamptz,
  ends_on       date,
  extended_at   timestamptz,
  ended_at      timestamptz,
  replaced_by   uuid REFERENCES public.patient_care_plan_template_instances(id) ON DELETE SET NULL,
  -- Goals / interventions met when it closed, for the history line.
  done_count    integer,
  total_count   integer,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_care_plan_template_instances_plan_idx
  ON public.patient_care_plan_template_instances (plan_id, template_id);

ALTER TABLE public.patient_care_plan_template_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage patient_care_plan_template_instances" ON public.patient_care_plan_template_instances;
CREATE POLICY "Staff manage patient_care_plan_template_instances" ON public.patient_care_plan_template_instances
  FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

ALTER TABLE public.patient_care_plan_goals
  ADD COLUMN IF NOT EXISTS retired_instance_id uuid
    REFERENCES public.patient_care_plan_template_instances(id) ON DELETE CASCADE;
ALTER TABLE public.patient_care_plan_interventions
  ADD COLUMN IF NOT EXISTS retired_instance_id uuid
    REFERENCES public.patient_care_plan_template_instances(id) ON DELETE CASCADE;
ALTER TABLE public.patient_care_plan_barriers
  ADD COLUMN IF NOT EXISTS retired_instance_id uuid
    REFERENCES public.patient_care_plan_template_instances(id) ON DELETE CASCADE;
