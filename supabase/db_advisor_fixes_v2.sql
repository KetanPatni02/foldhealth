-- ============================================================
-- Supabase DB advisor fixes — round 2
-- ============================================================
--
-- This migration cleans up every advisor warning that has a safe,
-- non-app-breaking SQL fix. The ~65 `rls_policy_always_true` warnings for
-- domain/worklist tables (and the `profiles` / `user_tour_status` anon
-- policies) are intentionally NOT touched — the app currently runs under
-- the anon key without per-user tenanting, and tightening a subset would
-- break flows that rely on the permissive pattern used everywhere else.
-- When real auth-scoped access lands, that's when those get rewritten.
--
-- Fixed here:
--   1. 14 trigger functions had mutable search_paths → pinned to
--      `pg_catalog, public`.
--   2. 6 SECURITY DEFINER trigger functions were RPC-callable by
--      anon/authenticated → EXECUTE revoked (they're trigger-only).
--   3. 3 public storage buckets had broad SELECT policies on
--      storage.objects → dropped (public URL access is unaffected;
--      anonymous listing gets locked down).
--   4. `apcm_patients` had a duplicate `Allow all for apcm_patients`
--      policy shadowing the newer `Allow all` one → older one dropped.
--
-- Not fixable via SQL:
--   - `auth_leaked_password_protection` — toggle in Supabase dashboard
--     (Auth → Providers → Email → Leaked password protection).
--
-- Idempotent: safe to re-run.

BEGIN;

-- ── 1) Pin search_path on 14 trigger functions ──
-- `pg_catalog, public` is a non-mutable, safe path — satisfies the linter
-- and keeps unqualified references (now(), format(), …) resolvable.
ALTER FUNCTION public.update_appointments_updated_at()    SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_p360_profiles_updated_at()   SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_sticky_notes_updated_at()    SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_profiles_updated_at()        SET search_path = pg_catalog, public;
ALTER FUNCTION public.all_patients_touch_updated_at()     SET search_path = pg_catalog, public;
ALTER FUNCTION public.population_groups_touch_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.population_groups_set_created_by()  SET search_path = pg_catalog, public;
ALTER FUNCTION public.touch_campaigns_updated_by()        SET search_path = pg_catalog, public;
ALTER FUNCTION public.touch_campaigns_updated_at()        SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_new_user()                   SET search_path = pg_catalog, public;
ALTER FUNCTION public.touch_forms_updated()               SET search_path = pg_catalog, public;
ALTER FUNCTION public.sync_form_response_count()          SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_user_first_login()           SET search_path = pg_catalog, public;
ALTER FUNCTION public.update_updated_at()                 SET search_path = pg_catalog, public;

-- ── 2) Revoke EXECUTE on SECURITY DEFINER trigger functions ──
-- These fire from row/event triggers only; they should never be reachable
-- via /rest/v1/rpc/*. Revoke from every public role so PostgREST won't
-- expose them.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_first_login()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_form_response_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_campaigns_updated_by() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_forms_updated()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()          FROM PUBLIC, anon, authenticated;

-- ── 3) Drop broad storage.objects SELECT policies ──
-- Public buckets still return objects via their public URL; a broad
-- SELECT policy is only needed to LIST files, which none of these
-- workflows do. Dropping locks anonymous listing without breaking image
-- reads.
DROP POLICY IF EXISTS "chart-uploads read"                ON storage.objects;
DROP POLICY IF EXISTS "Chat media is publicly readable"   ON storage.objects;
DROP POLICY IF EXISTS "Public read access"                ON storage.objects;

-- ── 4) Drop the duplicate apcm_patients policy ──
-- `Allow all` (added in db_advisor_fixes.sql) and the older
-- `Allow all for apcm_patients` are functionally identical. Keep the
-- newer, canonically-named one and drop the legacy sibling.
DROP POLICY IF EXISTS "Allow all for apcm_patients" ON public.apcm_patients;

COMMIT;
