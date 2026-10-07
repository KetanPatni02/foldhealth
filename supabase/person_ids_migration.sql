-- People by id, not name: two staff can share a name, so appointments,
-- reassignments and Out of Office records point at the profile's id.
-- Names stay for display. Existing rows get the id of the profile with that
-- name, only where exactly one profile has it; rows with a shared or unknown
-- name keep a NULL id (the app falls back to the name for those) and are
-- listed by the last query for someone to fix by hand. Safe to re-run.
--
-- Run after supabase/reassignment_jobs_migration.sql and
-- supabase/ooo_records_migration.sql.

BEGIN;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS primary_user_id text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reassigned_from_id text;
ALTER TABLE public.reassignment_jobs ADD COLUMN IF NOT EXISTS from_user_id text;
CREATE INDEX IF NOT EXISTS appointments_primary_user_id_idx ON public.appointments (primary_user_id);
CREATE INDEX IF NOT EXISTS appointments_reassigned_from_id_idx ON public.appointments (reassigned_from_id);
CREATE INDEX IF NOT EXISTS ooo_records_user_id_idx ON public.ooo_records (user_id);

-- Names held by exactly one profile, and that profile's id.
CREATE TEMP TABLE unique_names ON COMMIT DROP AS
  SELECT lower(trim(full_name)) AS name, min(id::text) AS id
  FROM public.profiles
  WHERE full_name IS NOT NULL AND trim(full_name) <> ''
  GROUP BY lower(trim(full_name))
  HAVING count(*) = 1;

UPDATE public.appointments a SET primary_user_id = u.id
FROM unique_names u
WHERE a.primary_user_id IS NULL AND lower(trim(a.primary_user)) = u.name;

UPDATE public.appointments a SET reassigned_from_id = u.id
FROM unique_names u
WHERE a.reassigned_from_id IS NULL AND a.reassigned_from IS NOT NULL AND lower(trim(a.reassigned_from)) = u.name;

UPDATE public.ooo_records r SET user_id = u.id
FROM unique_names u
WHERE r.user_id IS NULL AND lower(trim(r.user_name)) = u.name;

UPDATE public.reassignment_jobs j SET from_user_id = u.id
FROM unique_names u
WHERE j.from_user_id IS NULL AND lower(trim(j.from_user)) = u.name;

COMMIT;

-- Rows still without an id (a name shared by several profiles, or no
-- profile by that name): point each at the right person by hand.
SELECT 'appointments' AS "table", id::text, primary_user AS name FROM public.appointments WHERE primary_user_id IS NULL AND coalesce(primary_user, '') <> ''
UNION ALL
SELECT 'ooo_records', id, user_name FROM public.ooo_records WHERE user_id IS NULL;
