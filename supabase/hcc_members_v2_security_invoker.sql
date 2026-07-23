-- Fix Supabase security advisor: "Security Definer View" on hcc_members_v2.
--
-- Postgres views inherit the creator's privileges by default (a.k.a.
-- SECURITY DEFINER semantics), so RLS on the underlying `hcc_members`,
-- `hcc_member_visits`, and `hcc_member_documents` tables is evaluated as
-- the view's owner (postgres) rather than the caller (anon/authenticated).
-- Setting `security_invoker = on` flips the view to evaluate under the
-- caller's role, so table RLS actually applies to whoever queries the view.
--
-- Idempotent — safe to run any time; also re-declares the GRANT because
-- ALTER VIEW does not affect them (and re-running is cheap).

BEGIN;

ALTER VIEW public.hcc_members_v2 SET (security_invoker = on);

GRANT SELECT ON public.hcc_members_v2 TO anon, authenticated;

-- The view aggregates from hcc_member_visits + hcc_member_documents via
-- correlated subqueries. Both had RLS enabled but NO policies, so under
-- security_invoker=on those subqueries return zero rows to authenticated
-- and anon — leaving dos_list / doc_status as empty [] in the UI. Mirror
-- the existing hcc_members "Enable read access for all users" policy so
-- SELECTs are allowed but writes still require an explicit policy.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'hcc_member_visits'
       AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users"
      ON public.hcc_member_visits FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'hcc_member_documents'
       AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users"
      ON public.hcc_member_documents FOR SELECT USING (true);
  END IF;
END $$;

GRANT SELECT ON public.hcc_member_visits, public.hcc_member_documents TO anon, authenticated;

COMMIT;

-- Verify from psql:
--   SELECT relname, reloptions
--     FROM pg_class
--    WHERE relname = 'hcc_members_v2';
--   → reloptions should contain 'security_invoker=on'.
