-- Seed: specialties for users with the Physician/Doctor role.
--
-- Uses profiles.specialties (profiles_specialties_migration.sql). Only fills
-- users who have no specialty yet, so it never overwrites one set in
-- Settings > Users. Safe to re-run.

begin;

update public.profiles
   set specialties = array['Gastroenterologist']
 where lower(email) = 'akankshas@fold.health'
   and coalesce(array_length(specialties, 1), 0) = 0;

update public.profiles
   set specialties = array['Cardiologist', 'General Physician']
 where lower(email) = 'ketanp@fold.health'
   and coalesce(array_length(specialties, 1), 0) = 0;

-- Any other doctor still without a specialty gets General Physician.
update public.profiles
   set specialties = array['General Physician']
 where ('Physician/Doctor' = any(coalesce(clinical_roles, '{}')) or role = 'Physician/Doctor')
   and coalesce(array_length(specialties, 1), 0) = 0;

commit;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   select full_name, specialties from public.profiles
--    where 'Physician/Doctor' = any(coalesce(clinical_roles, '{}')) or role = 'Physician/Doctor';
