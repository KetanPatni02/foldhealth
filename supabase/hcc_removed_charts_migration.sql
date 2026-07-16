-- ============================================================
-- Tombstones for removed chart documents.
--
-- `hcc_added_charts` stores uploaded chart metadata and gets a real
-- DELETE when a coder removes an uploaded chart. But the Chart Detail
-- drawer also lets the coder remove SYSTEM-SEEDED docs (client-only
-- ids like `${memberId}::sys0`, `${memberId}::sys1`, …) — those
-- never had a row to delete, so today the removal only survives the
-- session (`useAppStore.hccRemovedCharts` in-memory).
--
-- This table records "member X removed doc-id Y" so getChartDocs()
-- can filter both system defaults and uploaded charts uniformly
-- after a reload.
-- ============================================================

CREATE TABLE IF NOT EXISTS hcc_removed_charts (
  id          TEXT PRIMARY KEY,             -- `${member_id}|${doc_id}`
  member_id   TEXT NOT NULL,
  doc_id      TEXT NOT NULL,
  removed_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (member_id, doc_id)
);
CREATE INDEX IF NOT EXISTS idx_hcc_removed_charts_member
  ON hcc_removed_charts (member_id);

ALTER TABLE hcc_removed_charts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_removed_charts" ON hcc_removed_charts;
CREATE POLICY "Allow all for hcc_removed_charts"
  ON hcc_removed_charts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'hcc_removed_charts' ORDER BY ordinal_position;
