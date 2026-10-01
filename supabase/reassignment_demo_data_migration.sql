-- Reassignment demo data: departments, who works where, and appointments
-- spread across departments so the Reassign Appointments drawer has real
-- groups, covering providers, an empty "No users available" group,
-- conflicts and failures to show.
--
-- Run after supabase/reassignment_jobs_migration.sql (needs ehr_missing)
-- and supabase/ooo_workflow_data_migration.sql (Abhay Chaudhary's demo
-- appointments). Data only and safe to re-run.
--
-- Departments are practice locations (Settings → Account → Locations); a
-- person's departments are profiles.locations; an appointment's department
-- is appointments.location. This makes all three use the same names.

BEGIN;

-- 1. The departments from the reassignment designs, as practice locations.
INSERT INTO public.practice_locations (id, name, ehr_instance, address_line_1, city, state, zip_code, timezone, default_phone)
VALUES
  ('loc-dept-7hills',     '7 Hills Department',   'Fold EHR', '7 Hills Road',         'Albany',     'NY', '12207', 'America/New_York',    '(518) 555-0107'),
  ('loc-dept-homehealth', 'Home Health Centre',   'Fold EHR', '22 Harbor Street',     'Newark',     'NJ', '07102', 'America/New_York',    '(973) 555-0122'),
  ('loc-dept-palm',       'Palm Health Centre',   'Fold EHR', '410 Palm Avenue',      'Palm Springs','CA', '92262', 'America/Los_Angeles', '(760) 555-0410'),
  ('loc-dept-mary',       'Mary Health',          'Fold EHR', '18 St Mary Lane',      'Buffalo',    'NY', '14201', 'America/New_York',    '(716) 555-0118'),
  ('loc-dept-sunrise',    'Sunrise Medical',      'Fold EHR', '900 Sunrise Blvd',     'Las Vegas',  'NV', '89101', 'America/Los_Angeles', '(702) 555-0900'),
  ('loc-dept-lifeline',   'Lifeline Clinic',      'Fold EHR', '55 Lifeline Way',      'Reno',       'NV', '89501', 'America/Los_Angeles', '(775) 555-0155'),
  ('loc-dept-rockwell',   'Rockwell Health',      'Fold EHR', '301 Rockwell Drive',   'Trenton',    'NJ', '08608', 'America/New_York',    '(609) 555-0301'),
  ('loc-dept-greenvalley','Green Valley Clinic',  'Fold EHR', '76 Green Valley Road', 'Fresno',     'CA', '93721', 'America/Los_Angeles', '(559) 555-0076')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, city = EXCLUDED.city, state = EXCLUDED.state, deleted_at = NULL, updated_at = now();


-- 2. Who works where. Everyone keeps the locations they already have and
--    gains one covering department and one other practice location, picked
--    by their place in the A–Z list. Rockwell Health and Green Valley Clinic
--    get nobody but Abhay, so they land in "No users available".
WITH covering(i, name) AS (
  VALUES (0, '7 Hills Department'), (1, 'Home Health Centre'), (2, 'Palm Health Centre'),
         (3, 'Mary Health'), (4, 'Sunrise Medical'), (5, 'Lifeline Clinic')
),
others AS (
  SELECT name, row_number() OVER (ORDER BY name) - 1 AS i, count(*) OVER () AS n
  FROM public.practice_locations
  WHERE deleted_at IS NULL AND id NOT LIKE 'loc-dept-%'
),
staff AS (
  SELECT id, row_number() OVER (ORDER BY trim(full_name)) - 1 AS i
  FROM public.profiles
  WHERE full_name IS NOT NULL AND trim(full_name) !~* '^abhay.*chaudhary'
)
UPDATE public.profiles p
SET locations = (
  SELECT array_agg(DISTINCT l ORDER BY l)
  FROM unnest(coalesce(p.locations, '{}') || ARRAY[c.name, o.name]) AS l
  WHERE l IS NOT NULL
)
FROM staff
JOIN covering c ON c.i = staff.i % 6
LEFT JOIN others o ON o.i = staff.i % greatest((SELECT max(n) FROM others), 1)
WHERE p.id = staff.id;

-- Abhay works at all eight departments.
UPDATE public.profiles
SET locations = ARRAY['7 Hills Department', 'Green Valley Clinic', 'Home Health Centre', 'Lifeline Clinic',
                      'Mary Health', 'Palm Health Centre', 'Rockwell Health', 'Sunrise Medical']
WHERE trim(full_name) ~* '^abhay.*chaudhary';


-- 3. Appointment departments. Abhay's are spread across the eight in turn
--    (by date and time); everyone else's appointments that don't name a
--    real practice location get one, so every appointment has a department.
WITH depts(i, name) AS (
  VALUES (0, '7 Hills Department'), (1, 'Home Health Centre'), (2, 'Palm Health Centre'), (3, 'Mary Health'),
         (4, 'Sunrise Medical'), (5, 'Lifeline Clinic'), (6, 'Rockwell Health'), (7, 'Green Valley Clinic')
),
mine AS (
  SELECT id, row_number() OVER (
    ORDER BY to_date(date, 'MM-DD-YYYY'), to_timestamp(time_start, 'HH12:MI am')::time, id) - 1 AS i
  FROM public.appointments
  WHERE primary_user ~* '^abhay.*chaudhary'
)
UPDATE public.appointments a
SET location = depts.name
FROM mine JOIN depts ON depts.i = mine.i % 8
WHERE a.id = mine.id;

WITH places AS (
  SELECT name, row_number() OVER (ORDER BY name) - 1 AS i, count(*) OVER () AS n
  FROM public.practice_locations WHERE deleted_at IS NULL
),
loose AS (
  SELECT id, row_number() OVER (ORDER BY id) - 1 AS i
  FROM public.appointments a
  WHERE coalesce(primary_user, '') !~* '^abhay.*chaudhary'
    AND NOT EXISTS (SELECT 1 FROM public.practice_locations l WHERE l.deleted_at IS NULL AND l.name = a.location)
)
UPDATE public.appointments a
SET location = places.name
FROM loose JOIN places ON places.i = loose.i % places.n
WHERE a.id = loose.id;


-- 4. Conflicts: the first covering provider (A–Z) of Mary Health and of
--    Home Health Centre already has an appointment at the same time as some
--    of Abhay's upcoming ones there (two in Mary Health, one in Home Health
--    Centre), so reassigning to them shows in the summary's Conflicting tab.
WITH firsts AS (
  SELECT DISTINCT ON (d) d AS dept, trim(p.full_name) AS name
  FROM public.profiles p, unnest(p.locations) AS d
  WHERE d IN ('Mary Health', 'Home Health Centre')
    AND p.full_name IS NOT NULL AND trim(p.full_name) !~* '^abhay.*chaudhary'
  ORDER BY d, trim(p.full_name)
),
upcoming AS (
  SELECT a.*, row_number() OVER (PARTITION BY a.location ORDER BY to_date(a.date, 'MM-DD-YYYY'), a.time_start) AS k
  FROM public.appointments a
  WHERE a.primary_user ~* '^abhay.*chaudhary'
    AND a.location IN ('Mary Health', 'Home Health Centre')
    AND a.status <> 'Cancelled'
    AND to_date(a.date, 'MM-DD-YYYY') >= (now() AT TIME ZONE 'Asia/Kolkata')::date
),
picked AS (
  SELECT u.*, f.name AS covering
  FROM upcoming u JOIN firsts f ON f.dept = u.location
  WHERE (u.location = 'Mary Health' AND u.k <= 2) OR (u.location = 'Home Health Centre' AND u.k = 1)
)
INSERT INTO public.appointments
  (patient_id, patient_name, appointment_type_id, appointment_type_name, mode, location,
   primary_user, secondary_users, date, time_start, time_end, reason_for_visit,
   member_instruction, staff_instruction, require_rsvp, recurring, recurring_config, status, calendar_id)
SELECT NULL,
       (ARRAY['Oliver Dunphy', 'Haley Santiago', 'Alex Meyers'])[row_number() OVER (ORDER BY picked.date, picked.time_start)],
       NULL, 'LTC Psyc Chronic Visit', 'In-person', picked.location,
       picked.covering, '[]'::jsonb, picked.date, picked.time_start, picked.time_end, 'Routine check-in',
       '', '', false, false, NULL, 'Scheduled', 'followup'
FROM picked
WHERE NOT EXISTS (
  SELECT 1 FROM public.appointments b
  WHERE b.primary_user = picked.covering AND b.date = picked.date AND b.time_start = picked.time_start
);


-- 5. Failures: two of Abhay's later upcoming Mary Health appointments are
--    no longer in the EHR, so the job can't move them ("Unable to Find
--    Appointment").
UPDATE public.appointments a
SET ehr_missing = true
WHERE a.id IN (
  SELECT id FROM public.appointments
  WHERE primary_user ~* '^abhay.*chaudhary' AND location = 'Mary Health' AND status <> 'Cancelled'
    AND to_date(date, 'MM-DD-YYYY') >= (now() AT TIME ZONE 'Asia/Kolkata')::date
  ORDER BY to_date(date, 'MM-DD-YYYY') DESC, time_start DESC
  LIMIT 2
);

COMMIT;
