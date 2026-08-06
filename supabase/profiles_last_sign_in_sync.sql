-- Mirror auth.users.last_sign_in_at → profiles.last_active_at so the
-- Settings → Account → Users table (which selects from profiles under the
-- anon key) can show it. Direct client reads on auth.users are blocked by
-- Supabase; this trigger keeps the profiles column in sync.
--
-- Idempotent — safe to re-run.

-- 1. Backfill every existing profile from its auth.users row.
UPDATE profiles p
   SET last_active_at = u.last_sign_in_at
  FROM auth.users u
 WHERE u.id = p.id
   AND u.last_sign_in_at IS DISTINCT FROM p.last_active_at;

-- 2. Trigger — mirror future sign-ins forward. Owned by the postgres role
--    so it can read/write auth.users; the function itself only touches
--    profiles.
CREATE OR REPLACE FUNCTION public.sync_profile_last_sign_in()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE profiles
       SET last_active_at = NEW.last_sign_in_at
     WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_last_sign_in ON auth.users;
CREATE TRIGGER sync_profile_last_sign_in
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_last_sign_in();
