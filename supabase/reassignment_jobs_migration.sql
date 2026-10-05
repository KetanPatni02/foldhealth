-- Appointment reassignment (Reassign Appointments drawer → Confirm).
--
-- A reassignment job is a plan that was confirmed: which of a provider's
-- appointments move to which covering provider, and which are cancelled.
-- The job carries out the plan on `appointments` and keeps the outcome
-- here, which feeds the "summary is ready" notification, the Appointment
-- Reassignment Summary drawer and the drawer's History tab.
--
-- Shared by every signed-in user; anon gets no access (as ooo_records).

CREATE TABLE IF NOT EXISTS public.reassignment_jobs (
  id               text PRIMARY KEY,
  from_user        text NOT NULL,            -- the provider whose appointments moved (by name)
  from_user_role   text,
  type             text NOT NULL,            -- 'ooo' | 'permanent' | 'other' (One-time)
  window_start     timestamptz,
  window_end       timestamptz,              -- null for Permanent (from now on)
  ooo_record_id    text,                     -- the Out of Office record, for 'ooo'
  status           text NOT NULL DEFAULT 'done',   -- 'running' | 'done'
  reassigned_count integer NOT NULL DEFAULT 0,
  cancelled_count  integer NOT NULL DEFAULT 0,
  conflicting_count integer NOT NULL DEFAULT 0,
  failed_count     integer NOT NULL DEFAULT 0,
  -- One entry per appointment in the plan:
  -- { appointmentId, outcome: 'reassigned'|'cancelled'|'failed', to?, conflict?, reason?,
  --   appointment: { patientName, date, timeStart, timeEnd, type, location } }
  results          jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reassignment_jobs_from_idx ON public.reassignment_jobs (lower(from_user), created_at DESC);
ALTER TABLE public.reassignment_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on reassignment_jobs" ON public.reassignment_jobs;
CREATE POLICY "Allow all on reassignment_jobs" ON public.reassignment_jobs
  FOR ALL TO authenticated
  USING ((select auth.uid()) is not null) WITH CHECK ((select auth.uid()) is not null);

-- On appointments: who an appointment was moved from and by which job, so
-- it leaves the original provider's list and can be moved back (the edit
-- drawer's "Move reassigned appointments … back" checkbox).
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reassigned_from text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reassignment_job_id text;
-- Demo only: the EHR no longer has this appointment, so a job can't move it
-- (shows as "Failed Reassignment: Unable to Find Appointment").
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS ehr_missing boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS appointments_reassigned_from_idx ON public.appointments (lower(reassigned_from));
