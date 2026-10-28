-- DEV ONLY (Foldhealth Dev, uwswpbiyhlmpnubxtipc). Never run on production.
-- Test data for the patient app's profiles (W2) and booking (W12).
-- Idempotent: safe to re-run.
--
--   • the Dev test patient (patient.test@example.com, created through the
--     admin API with app_metadata.role = 'patient') manages two people:
--     Andrew Lewis (11010, self) and Andrew Evans (11048, dependent)
--   • three visit types become bookable online
--   • Abhijit Gupta gets a weekday 9 AM – 5 PM block for the next 60 days

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

commit;
