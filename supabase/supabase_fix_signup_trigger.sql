-- ============================================================
-- Fix: "Database error saving new user" on email + Google signup
--
-- Root cause: an old version of public.handle_new_user() still tries to
-- INSERT into public.user_profiles, which was dropped by
-- supabase_consolidate_profiles.sql. Every new auth.users insert (email
-- signup, OAuth signup) fires the on_auth_user_created trigger, the
-- trigger function fails on the missing table, and Supabase aborts the
-- signup with a generic DB error.
--
-- This script:
--   1. Redefines handle_new_user() to insert into the consolidated
--      `profiles` table.
--   2. Wraps the body in EXCEPTION WHEN OTHERS so a profile-row error can
--      never block auth.users creation again. The app already does an
--      idempotent upsert into profiles on first login (AppLayout.jsx), so
--      a missed trigger insert is fully recoverable.
--   3. Reattaches the trigger to auth.users.
--
-- Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_first_name TEXT;
  v_last_name  TEXT;
  v_full_name  TEXT;
BEGIN
  v_first_name := NEW.raw_user_meta_data->>'first_name';
  v_last_name  := NEW.raw_user_meta_data->>'last_name';
  v_full_name  := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NULLIF(TRIM(CONCAT(COALESCE(v_first_name, ''), ' ', COALESCE(v_last_name, ''))), ''),
    split_part(NEW.email, '@', 1)
  );

  BEGIN
    INSERT INTO public.profiles (
      id, email, first_name, last_name, full_name,
      status, role, clinical_roles, admin_role, updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      v_first_name,
      v_last_name,
      v_full_name,
      'Active',
      'Viewer',
      '{}'::text[],
      'Employer',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email      = EXCLUDED.email,
      first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
      last_name  = COALESCE(EXCLUDED.last_name,  public.profiles.last_name),
      full_name  = COALESCE(EXCLUDED.full_name,  public.profiles.full_name),
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    -- Never block signup on a profile-row failure. The app upserts the
    -- profile on first login, so the row will be created then.
    RAISE WARNING 'handle_new_user: profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Reattach the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: any auth.users rows that don't have a profile row (e.g. signups
-- that failed mid-flight while the trigger was broken) get one now.
INSERT INTO public.profiles (
  id, email, first_name, last_name, full_name,
  status, role, clinical_roles, admin_role, updated_at
)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'first_name',
  u.raw_user_meta_data->>'last_name',
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    NULLIF(TRIM(CONCAT(
      COALESCE(u.raw_user_meta_data->>'first_name', ''), ' ',
      COALESCE(u.raw_user_meta_data->>'last_name',  '')
    )), ''),
    split_part(u.email, '@', 1)
  ),
  'Active',
  'Viewer',
  '{}'::text[],
  'Employer',
  NOW()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;
