-- ============================================================
-- hcc_diagnosis_gaps was created with a SELECT-only RLS policy,
-- so every write from the app (addHccGap, acceptHccGap,
-- dismissHccGap, reopenHccGap, deleteHccGap) fails with
-- "new row violates row-level security policy". Open it up to
-- match the other HCC tables (hcc_documents, hcc_diag_*, etc.)
-- which use a single permissive "Allow all" policy.
-- ============================================================

DROP POLICY IF EXISTS "Allow all for hcc_diagnosis_gaps" ON hcc_diagnosis_gaps;
CREATE POLICY "Allow all for hcc_diagnosis_gaps"
  ON hcc_diagnosis_gaps
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify:
--   SELECT policyname, cmd FROM pg_policies
--    WHERE tablename = 'hcc_diagnosis_gaps';
--   -- Expected: at least one row with cmd = 'ALL'.
