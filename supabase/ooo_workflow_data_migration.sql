-- Out of Office workflow: data clean-up and demo seed.
--
-- Run after supabase/ooo_records_migration.sql (the table must exist).
-- Everything here is data only (no schema changes) and safe to re-run:
-- records upsert on their fixed ids, appointments skip slots already booked.
-- It mirrors what `bun run seed` does for Out of Office (scripts/seed.js +
-- src/features/ooo/oooSeed.js), for running straight in the SQL editor.
--
-- Dates are worked out in Asia/Kolkata (the demo's local time), as the
-- seed script did when it was run.

BEGIN;

-- 1. Reasons start with a capital letter (the app now saves them that way;
--    older rows like "personal" become "Personal").
UPDATE public.ooo_records
SET reason = upper(left(reason, 1)) || substr(reason, 2),
    updated_at = now()
WHERE reason <> ''
  AND left(reason, 1) <> upper(left(reason, 1));


-- 2. Sample records for the first 7 staff profiles (alphabetical, leaving
--    out Abhay Chaudhary, who gets his own set below), dated around today
--    so ongoing, upcoming and past all show. Plan per profile:
--    [days from today, start hour, length in days, reason].
WITH plan(n, day_offset, start_hour, len_days, reason) AS (
  VALUES
    (1,   0, 0, 2, 'Out on Planned Leave'),   -- ongoing
    (2,   3, 9, 2, 'Personal'),
    (3,   6, 0, 1, 'Medical Leave'),
    (4,  10, 8, 3, 'Annual Leave'),
    (5,  14, 0, 5, 'Professional Development'),
    (6, -12, 0, 2, 'Family Emergency'),       -- past
    (7, -25, 9, 1, 'Jury Duty')               -- past
),
staff AS (
  SELECT p.id::text AS id, trim(p.full_name) AS name, p.email, coalesce(p.role, 'Physician') AS role,
         row_number() OVER (ORDER BY trim(p.full_name)) AS n
  FROM public.profiles p
  WHERE p.full_name IS NOT NULL
    AND trim(p.full_name) !~* '^abhay.*chaudhary'
),
today AS (
  SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date AS d
)
INSERT INTO public.ooo_records
  (id, user_id, user_name, user_email, user_role, start_at, end_at, reason,
   auto_reply, auto_reply_message, created_by, created_at, updated_at)
SELECT
  'ooo-sample-' || plan.n,
  staff.id, staff.name, staff.email, staff.role,
  ((today.d + plan.day_offset)::timestamp + make_interval(hours => plan.start_hour)) AT TIME ZONE 'Asia/Kolkata',
  ((today.d + plan.day_offset + plan.len_days)::timestamp + make_interval(hours => plan.start_hour)) AT TIME ZONE 'Asia/Kolkata',
  plan.reason,
  plan.n = 1,
  CASE WHEN plan.n = 1 THEN 'Hi! Thanks for reaching out. I''m currently unavailable but will get back to you as soon as I can.' ELSE '' END,
  staff.name,
  ((today.d + plan.day_offset - 7)::timestamp + interval '10 hours') AT TIME ZONE 'Asia/Kolkata',
  ((today.d + plan.day_offset - 7)::timestamp + interval '10 hours') AT TIME ZONE 'Asia/Kolkata'
FROM plan
JOIN staff ON staff.n = plan.n
CROSS JOIN today
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id, user_name = EXCLUDED.user_name, user_email = EXCLUDED.user_email,
  user_role = EXCLUDED.user_role, start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at,
  reason = EXCLUDED.reason, auto_reply = EXCLUDED.auto_reply,
  auto_reply_message = EXCLUDED.auto_reply_message, updated_at = now();


-- 3. Abhay Chaudhary's demo: three more Out of Office records (his own
--    1-15 Oct record is left as is) ...
WITH abhay AS (
  SELECT p.id::text AS id, trim(p.full_name) AS name, p.email, coalesce(p.role, 'Physician') AS role
  FROM public.profiles p
  WHERE trim(p.full_name) ~* '^abhay.*chaudhary'
  LIMIT 1
),
demo(id, start_at, end_at, reason) AS (
  VALUES
    ('ooo-demo-abhay-1', timestamptz '2026-09-22 00:00:00+05:30', timestamptz '2026-09-24 00:00:00+05:30', 'Personal'),                  -- past
    ('ooo-demo-abhay-2', timestamptz '2026-10-20 09:00:00+05:30', timestamptz '2026-10-20 13:00:00+05:30', 'Professional Development'),  -- half day
    ('ooo-demo-abhay-3', timestamptz '2026-10-27 00:00:00+05:30', timestamptz '2026-10-29 00:00:00+05:30', 'Annual Leave')
)
INSERT INTO public.ooo_records
  (id, user_id, user_name, user_email, user_role, start_at, end_at, reason,
   auto_reply, auto_reply_message, created_by, created_at, updated_at)
SELECT demo.id, abhay.id, abhay.name, abhay.email, abhay.role, demo.start_at, demo.end_at, demo.reason,
       false, '', abhay.name, timestamptz '2026-09-01 10:00:00+05:30', timestamptz '2026-09-01 10:00:00+05:30'
FROM demo CROSS JOIN abhay
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id, user_name = EXCLUDED.user_name, user_email = EXCLUDED.user_email,
  start_at = EXCLUDED.start_at, end_at = EXCLUDED.end_at, reason = EXCLUDED.reason, updated_at = now();


-- ... and appointments on his out-of-office days and across 1-15 Oct, so
-- the calendar shows appointments inside OOO time and the records table's
-- "N to reassign" has something to count. Days: every weekday 1-15 Oct,
-- plus 22-23 Sep, 20 Oct and 27-28 Oct. Two appointments a day, three on
-- every third day (9:00, 11:00, 2:30). September ones are Completed.
WITH abhay AS (
  SELECT trim(p.full_name) AS name
  FROM public.profiles p
  WHERE trim(p.full_name) ~* '^abhay.*chaudhary'
  LIMIT 1
),
days AS (
  SELECT d::date AS d, row_number() OVER (ORDER BY o, d) - 1 AS i
  FROM (
    SELECT d, 0 AS o FROM generate_series(date '2026-10-01', date '2026-10-15', interval '1 day') d
    WHERE extract(isodow FROM d) < 6
    UNION ALL
    SELECT unnest(ARRAY[date '2026-09-22', date '2026-09-23', date '2026-10-20', date '2026-10-27', date '2026-10-28']), 1
  ) x
),
slots(j, time_start, time_end) AS (
  VALUES (0, '9:00 am', '9:30 am'), (1, '11:00 am', '11:45 am'), (2, '2:30 pm', '3:00 pm')
),
types(k, type_name, calendar_id, mode, reason) AS (
  VALUES
    (0, 'Follow-up Appointment',         'followup',   'In-person', 'Medication review'),
    (1, 'Annual Wellness Visit',         'awv',        'In-person', 'Yearly check-up'),
    (2, 'Chronic Care Management Visit', 'telehealth', 'Virtual',   'Blood pressure follow-up'),
    (3, 'Specialty Consultation',        'specialty',  'In-person', 'Cardiology referral')
),
patients(k, name) AS (
  VALUES (0, 'Sandra Nguyen'), (1, 'Marcus Bell'), (2, 'Priya Raman'), (3, 'Helen Ortiz'),
         (4, 'James Whitfield'), (5, 'Aisha Khan'), (6, 'Robert Diaz'), (7, 'Linda Park')
),
appt_rows AS (
  SELECT abhay.name AS primary_user,
         to_char(days.d, 'MM-DD-YYYY') AS date,
         slots.time_start, slots.time_end,
         types.type_name, types.calendar_id, types.mode, types.reason,
         patients.name AS patient_name,
         CASE WHEN days.d < (now() AT TIME ZONE 'Asia/Kolkata')::date THEN 'Completed' ELSE 'Scheduled' END AS status
  FROM abhay
  CROSS JOIN days
  JOIN slots ON slots.j < CASE WHEN days.i % 3 = 0 THEN 3 ELSE 2 END
  JOIN types ON types.k = (days.i + slots.j) % 4
  JOIN patients ON patients.k = (days.i * 3 + slots.j) % 8
)
INSERT INTO public.appointments
  (patient_id, patient_name, appointment_type_id, appointment_type_name, mode, location,
   primary_user, secondary_users, date, time_start, time_end, reason_for_visit,
   member_instruction, staff_instruction, require_rsvp, recurring, recurring_config, status, calendar_id)
SELECT NULL, r.patient_name, NULL, r.type_name, r.mode, 'Fold Health, New York',
       r.primary_user, '[]'::jsonb, r.date, r.time_start, r.time_end, r.reason,
       '', '', false, false, NULL, r.status, r.calendar_id
FROM appt_rows r
WHERE NOT EXISTS (
  SELECT 1 FROM public.appointments a
  WHERE a.primary_user = r.primary_user AND a.date = r.date AND a.time_start = r.time_start
);

COMMIT;
