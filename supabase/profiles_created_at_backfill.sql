-- Align profiles.created_at + profiles.last_active_at with the auth.users
-- source of truth, and make handle_new_user() carry them forward for every
-- future signup. Idempotent — safe to re-run.
--
-- Coverage matrix once this migration + the earlier trigger are in place:
--   • profiles.created_at    = auth.users.created_at        (INSERT via handle_new_user, one-time backfill here)
--   • profiles.last_active_at = auth.users.last_sign_in_at  (INSERT initial value here; ongoing sync via sync_profile_last_sign_in trigger)

-- 1. Backfill created_at drift + any missing last_active_at.
UPDATE profiles p
   SET created_at     = u.created_at,
       last_active_at = COALESCE(p.last_active_at, u.last_sign_in_at)
  FROM auth.users u
 WHERE u.id = p.id
   AND (u.created_at IS DISTINCT FROM p.created_at
        OR (p.last_active_at IS NULL AND u.last_sign_in_at IS NOT NULL));

-- 2. Rewrite handle_new_user so every future signup lands with the
--    correct created_at + last_active_at right away — no reliance on a
--    downstream update trigger for the first row.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status, created_at, last_active_at)
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
    END,
    NEW.created_at,
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
