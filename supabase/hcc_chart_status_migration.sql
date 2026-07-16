-- ============================================================
-- HCC chart Pass/Fail decisions.
--
-- The Chart Detail drawer lets a coder mark each chart's compliance
-- status ('passed' / 'failed' / 'pending'). This lives in
-- `useAppStore.hccChartStatus[memberId][docId]` today — in-memory
-- only, so a reload reverts every mark. This table gives each
-- (member × doc) its own persistent decision.
--
-- Keyed by (member_id, doc_id) — deterministic upsert. Doc ids
-- include both system-seeded defaults (`{memberId}::sys{i}`) and
-- uploaded chart ids from `hcc_added_charts`. Permissive RLS
-- matches the other HCC tables (writes are org-wide in Phase 2).
-- ============================================================

CREATE TABLE IF NOT EXISTS hcc_chart_status (
  id          TEXT PRIMARY KEY,             -- `${member_id}|${doc_id}`
  member_id   TEXT NOT NULL,
  doc_id      TEXT NOT NULL,
  status      TEXT NOT NULL,                -- 'passed' | 'failed' | 'pending'
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (member_id, doc_id)
);
CREATE INDEX IF NOT EXISTS idx_hcc_chart_status_member
  ON hcc_chart_status (member_id);

ALTER TABLE hcc_chart_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_chart_status" ON hcc_chart_status;
CREATE POLICY "Allow all for hcc_chart_status"
  ON hcc_chart_status
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'hcc_chart_status' ORDER BY ordinal_position;
