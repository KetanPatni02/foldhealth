-- CRM Activity: every communication with a patient (chat, call, email, SMS,
-- eFax, plus visits, assessments and tasks sent to them), one row each. Read
-- by the patient's CRM tab, newest first, grouped by month.
--
-- channel: chat | call | email | sms | efax | visit | assessment | task
-- status:  free text ("Completed", "Pending", "In Progress"), may be empty.
--
-- Read with the anon key, so the table needs a permissive policy or it
-- returns 0 rows and the tab falls back to sample data.

CREATE TABLE IF NOT EXISTS public.patient_crm_activities (
  id                 text PRIMARY KEY,
  patient_id         text NOT NULL,
  channel            text NOT NULL,
  title              text NOT NULL,
  status             text NOT NULL DEFAULT '',
  performed_by       text,
  performed_by_role  text,
  occurred_at        timestamptz NOT NULL DEFAULT now(),
  note               text NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_crm_activities_patient_idx
  ON public.patient_crm_activities (patient_id, occurred_at DESC);

ALTER TABLE public.patient_crm_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on patient_crm_activities" ON public.patient_crm_activities;
CREATE POLICY "Allow all on patient_crm_activities" ON public.patient_crm_activities
  FOR ALL USING (true) WITH CHECK (true);
