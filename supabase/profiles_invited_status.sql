-- ============================================================
-- Fix "Invited" user status flow.
--
-- Bug 1: profiles.status CHECK previously only allowed
-- 'Active'|'Inactive'|'Suspended', so the InviteUserDrawer's upsert
-- with status='Invited' failed the constraint and the row kept the
-- default 'Active' written by the on_auth_user_created trigger.
--
-- Bug 2: no transition path from 'Invited' → 'Active' when the
-- invited user finally logs in.
--
-- This migration:
--   1. Widens the CHECK to include 'Invited'.
--   2. Rewrites handle_new_user() so the invite flow can pass
--      raw_user_meta_data.invited = 'true' to land on 'Invited'.
--   3. Adds an AFTER-UPDATE trigger on auth.users that flips the
--      matching profile from 'Invited' → 'Active' the first time
--      last_sign_in_at is set (== the user completes login).
-- ============================================================

-- 1. Widen the status CHECK to include 'Invited'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('Active', 'Inactive', 'Suspended', 'Invited'));

-- 2. Update the signup trigger to honor the `invited` meta flag.
--    When present it writes 'Invited'; otherwise the default 'Active'
--    behaviour is preserved for self-signups / OAuth flows.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NULLIF(TRIM(
        COALESCE(NEW.raw_user_meta_data->>'first_name', '') ||
        ' ' ||
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      ), '')
    ),
    CASE
      WHEN NEW.raw_user_meta_data->>'invited' = 'true' THEN 'Invited'
      ELSE 'Active'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. First-login transition: when auth.users.last_sign_in_at goes
--    from NULL to non-NULL, flip the linked profile from 'Invited'
--    to 'Active'. Only touches rows with status='Invited' so existing
--    Inactive/Suspended users aren't reactivated on login.
CREATE OR REPLACE FUNCTION handle_user_first_login()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.last_sign_in_at IS NULL AND NEW.last_sign_in_at IS NOT NULL) THEN
    UPDATE public.profiles
       SET status = 'Active'
     WHERE id = NEW.id
       AND status = 'Invited';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_first_login ON auth.users;
CREATE TRIGGER on_auth_user_first_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION handle_user_first_login();

-- Verify:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--    WHERE conname = 'profiles_status_check';
--   -- Should include 'Invited'.
