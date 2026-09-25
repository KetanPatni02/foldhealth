-- Medical specialty for system users (profiles).
--
-- The Care Gap "Send Referral" provider picker filters and labels users by
-- specialty (Cardiology, OB/GYN, General Practice, ...). Roles such as
-- Coder / QA / Compliance are app permissions, not specialties, so they
-- can't serve here. A provider can hold more than one specialty.
--
-- No seed: specialties are a fact about each real provider and must be set
-- per user (Settings > user profile, or the SQL editor), e.g.
--   update public.profiles set specialties = array['Cardiology']
--    where id = '<profile id>';

begin;

alter table public.profiles
  add column if not exists specialties text[] not null default '{}';

create index if not exists profiles_specialties_idx
  on public.profiles using gin (specialties);

commit;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   select column_name, data_type from information_schema.columns
--    where table_name = 'profiles' and column_name = 'specialties';
--
-- ── Rollback ────────────────────────────────────────────────────────────────
--   drop index if exists public.profiles_specialties_idx;
--   alter table public.profiles drop column if exists specialties;
