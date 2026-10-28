-- DEV ONLY (Foldhealth Dev, uwswpbiyhlmpnubxtipc). Never run on production.
-- Test data for the patient app's profiles (W2) and booking (W12).
-- Idempotent: safe to re-run.
--
--   • the Dev test patient (patient.test@example.com, created through the
--     admin API with app_metadata.role = 'patient') manages two people:
--     Andrew Lewis (11010, self) and Andrew Evans (11048, dependent)
--   • three visit types become bookable online
--   • Abhijit Gupta gets a weekday 9 AM – 5 PM block for the next 60 days
--   • Andrew Evans gets a few problems, allergies, medications and immunizations

begin;

insert into public.patient_accounts (user_id, member_id, relationship, is_primary)
select u.id, m.member_id, m.relationship, m.is_primary
  from auth.users u
 cross join (values ('11010', 'self', true), ('11048', 'dependent', false))
       as m(member_id, relationship, is_primary)
 where u.email = 'patient.test@example.com'
on conflict (user_id, member_id) do update
  set relationship = excluded.relationship, is_primary = excluded.is_primary;

update public.appointment_types
   set patient_bookable = true
 where name in ('Follow-up Appointment', 'Telehealth Consultation', 'Lab Results Discussion');

insert into public.user_availability (
  id, user_id, user_name, user_email, location, timezone, advanced, repeat,
  repeat_interval, days, weeks, start_date, end_date, slots, skip_holidays, allow_overlap)
values (
  'a7a11ab1-0000-4000-8000-00000000d3e0',
  'cdb8c35f-6f74-4117-a91c-a48825f2a467', 'Abhijit Gupta', 'abhi@fold.health',
  '7 Hills Department', 'America/New_York', false, 'weekly',
  1, '{1,2,3,4,5}', '{}', current_date, current_date + 60,
  '[{"start": "09:00", "end": "17:00", "appointmentType": "All appointment types"}]'::jsonb,
  true, false)
on conflict (id) do update
  set start_date = excluded.start_date, end_date = excluded.end_date, slots = excluded.slots;

-- Health records for Andrew Evans (11048), so W6 has something to show.
insert into public.patient_problems (id, patient_id, title, status, severity, onset_label, problem_type, sort_order) values
  ('dev-seed-prob-11048-1', '11048', 'Asthma', 'Active', 'Mild', '2019', 'Chronic', 1),
  ('dev-seed-prob-11048-2', '11048', 'Seasonal allergic rhinitis', 'Active', 'Mild', '2021', 'Chronic', 2),
  ('dev-seed-prob-11048-3', '11048', 'Ear infection', 'Resolved', 'Moderate', '2024', 'Acute', 3)
on conflict (id) do nothing;
insert into public.patient_allergies (id, patient_id, title, criticality, reaction_type, since_date, reactions, status, sort_order) values
  ('dev-seed-allergy-11048-1', '11048', 'Peanuts', 'High', 'Allergy', '2018', '[{"display": "Hives", "severity": "Severe"}]', 'Active', 1),
  ('dev-seed-allergy-11048-2', '11048', 'Penicillin', 'Low', 'Allergy', '2020', '[{"display": "Rash", "severity": "Mild"}]', 'Active', 2)
on conflict (id) do nothing;
insert into public.patient_medications (id, patient_id, name, sig, start_date, status) values
  ('a7a11ab1-0000-4000-8000-0000000d3e01', '11048', 'Albuterol inhaler 90 mcg', '2 puffs • as needed for wheezing', '03/12/2021', 'Active'),
  ('a7a11ab1-0000-4000-8000-0000000d3e02', '11048', 'Cetirizine 5 mg', '1 tab • 1 time a day', '04/01/2025', 'Active'),
  ('a7a11ab1-0000-4000-8000-0000000d3e03', '11048', 'Amoxicillin 250 mg', '1 tab • 3 times a day', '01/10/2024', 'Stopped')
on conflict (id) do nothing;
insert into public.patient_immunizations (id, patient_id, title, date_administered, status, sort_order) values
  ('dev-seed-imm-11048-1', '11048', 'DTaP', '06/27/2020', 'Completed', 1),
  ('dev-seed-imm-11048-2', '11048', 'Influenza (seasonal)', '10/02/2026', 'Completed', 2)
on conflict (id) do nothing;

commit;
