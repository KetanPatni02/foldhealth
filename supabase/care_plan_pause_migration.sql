-- Care plan Pause: a plan-level status (active / paused) with why, from when,
-- until when, and whether it resumes on its own.
--
-- While a plan is paused the app treats it as on hold: no overdue flags, no
-- next touchpoint, and its automations read as paused (isCarePlanPaused in
-- care-plan/lib/carePlanPause.js is the gate any cadence or outreach job must
-- check). Resuming (by hand, or when the plan is next opened on or after
-- resume_on with auto_resume set) returns it to active and recomputes
-- next_touchpoint. Every pause and resume writes a care_plan_audit row
-- (entity_type 'plan', action 'paused' / 'resumed').
--
-- Additive and idempotent. No new table, so RLS is unchanged.

ALTER TABLE public.patient_care_plans
  ADD COLUMN IF NOT EXISTS status          text    NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS pause_reason    text,
  ADD COLUMN IF NOT EXISTS pause_note      text,
  ADD COLUMN IF NOT EXISTS paused_on       date,
  ADD COLUMN IF NOT EXISTS resume_on       date,
  ADD COLUMN IF NOT EXISTS auto_resume     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paused_by       text,
  ADD COLUMN IF NOT EXISTS next_touchpoint date;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_care_plans_status_check') THEN
    ALTER TABLE public.patient_care_plans
      ADD CONSTRAINT patient_care_plans_status_check CHECK (status IN ('active', 'paused'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_care_plans_pause_reason_check') THEN
    ALTER TABLE public.patient_care_plans
      ADD CONSTRAINT patient_care_plans_pause_reason_check
      CHECK (pause_reason IS NULL OR pause_reason IN ('hospitalized', 'traveling', 'patient_request', 'other'));
  END IF;
  -- A paused plan says why and since when; a planned resume can't come first.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_care_plans_pause_fields_check') THEN
    ALTER TABLE public.patient_care_plans
      ADD CONSTRAINT patient_care_plans_pause_fields_check CHECK (
        status <> 'paused'
        OR (pause_reason IS NOT NULL AND paused_on IS NOT NULL
            AND (resume_on IS NULL OR resume_on >= paused_on)
            AND (NOT auto_resume OR resume_on IS NOT NULL))
      );
  END IF;
END $$;

-- Reports and worklists filter on status.
CREATE INDEX IF NOT EXISTS patient_care_plans_status_idx
  ON public.patient_care_plans (status)
  WHERE status = 'paused';
