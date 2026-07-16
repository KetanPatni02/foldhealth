-- ============================================================
-- hcc_members writes were silently failing in the browser
-- because the table's RLS was left in its Supabase default
-- (enabled with no policy), which rejects every UPDATE from the
-- anon key. Row-level assignee changes on the worklist looked
-- correct in-memory but reverted on reload because
-- persistHccMemberRoleStatus() never wrote to Supabase.
--
-- Open it up to match the other HCC tables (hcc_diagnosis_gaps,
-- hcc_documents, hcc_diag_*, etc.) with a single permissive
-- "Allow all" policy so both reads and writes go through.
-- ============================================================

ALTER TABLE hcc_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for hcc_members" ON hcc_members;
CREATE POLICY "Allow all for hcc_members"
  ON hcc_members
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify:
--   SELECT policyname, cmd FROM pg_policies
--    WHERE tablename = 'hcc_members';
--   -- Expected: one row with cmd = 'ALL' and permissive USING/WITH CHECK.
