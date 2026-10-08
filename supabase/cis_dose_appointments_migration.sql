-- CIS-CMB10 tracker: vaccine appointments the care team booked for a child
-- with the child's own provider.
--
-- WHY
-- We don't give vaccines; the appointment lives with the PCP. The team
-- still needs to know which doses were booked for when, so they can follow
-- up after the visit and record the dose (or reschedule). The Vaccine
-- Calendar shows "Scheduled <date>" on each covered dose, and "Confirm
-- given" once the date passes with the dose still unrecorded. Saving an
-- appointment also creates a caregap_reminders row for the day after.
--
-- KEY
-- doses is a JSON array of "<antigen_key>:<dose_number>" strings, e.g.
-- ["ipv:2","hepb:3"], matching cis_dose_notes' keys. status is 'Scheduled'
-- or 'Cancelled'; follow-up state is derived from the date and the
-- patient's recorded doses, not stored.
--
-- Idempotent, including the demo rows. Ask Alok Kumar to run this
-- migration on Supabase.

CREATE TABLE IF NOT EXISTS public.cis_dose_appointments (
  id                text PRIMARY KEY,
  hedis_member_id   text NOT NULL,
  appointment_date  date NOT NULL,
  appointment_time  text,
  provider          text NOT NULL DEFAULT '',
  doses             jsonb NOT NULL DEFAULT '[]'::jsonb,
  note              text NOT NULL DEFAULT '',
  status            text NOT NULL DEFAULT 'Scheduled'
                    CHECK (status IN ('Scheduled', 'Cancelled')),
  reminder_id       text,
  booked_by         uuid,
  booked_by_name    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cis_dose_appointments_member_idx
  ON public.cis_dose_appointments (hedis_member_id, appointment_date);

ALTER TABLE public.cis_dose_appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on cis_dose_appointments" ON public.cis_dose_appointments;
CREATE POLICY "Allow all on cis_dose_appointments" ON public.cis_dose_appointments
  FOR ALL TO authenticated
  USING ((select auth.uid()) is not null) WITH CHECK ((select auth.uid()) is not null);

-- Demo rows (members from cis_cmb10_migration.sql):
--   19304 Sofia Ramirez: upcoming visit covering the overdue IPV dose 2 and Hep B dose 3.
--   19305 Noah Patel: a visit that has passed with Hep B dose 2 still unrecorded (Confirm given).
INSERT INTO public.cis_dose_appointments
  (id, hedis_member_id, appointment_date, appointment_time, provider, doses, note, status, booked_by_name)
VALUES
  ('cisappt-19304-01', '19304', '2026-10-20', '10:30 AM', 'Dr. Maria Lopez, Sunrise Pediatrics',
   '["ipv:2","hepb:3"]'::jsonb, 'Mom confirmed by phone.', 'Scheduled', 'Care Coordinator'),
  ('cisappt-19305-01', '19305', '2026-10-01', '9:00 AM', 'Dr. Kevin Shah, Valley Kids Clinic',
   '["hepb:2"]'::jsonb, '', 'Scheduled', 'Care Coordinator')
ON CONFLICT (id) DO NOTHING;
