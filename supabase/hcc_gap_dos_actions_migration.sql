-- ============================================================
-- HCC per-(ICD × DOS) coder actions.
--
-- The DiagPanel's IcdDosCard maintains three parallel maps in the
-- store today:
--   • hccGapDosActions[code|dos] = 'accepted' | 'rejected' | 'missed' | 'deferred'
--   • hccGapDosMeta[code|dos]    = { reason, note }   (only for dismissals)
--   • hccGapDosDeleted[code|dos] = true               (row removed on manual ICDs)
--
-- All three are currently in-memory only, so every accept/reject on a
-- DOS row is lost on reload. This table folds them into a single row
-- keyed by (member_name, code, dos) so the DiagPanel can hydrate the
-- state on member open.
--
-- Scoped by member_name (matches hcc_diagnosis_gaps). Permissive RLS
-- mirrors the rest of the HCC tables — writes are org-wide in Phase 2.
-- ============================================================

CREATE TABLE IF NOT EXISTS hcc_gap_dos_actions (
  id             TEXT PRIMARY KEY,             -- `${member_name}|${code}|${dos}` — deterministic so upsert works
  member_name    TEXT NOT NULL,
  code           TEXT NOT NULL,                -- ICD-10 code
  dos            TEXT NOT NULL,                -- MM/DD/YYYY (matches the JS shape)
  action         TEXT,                          -- 'accepted' | 'rejected' | 'missed' | 'deferred' | NULL
  dismiss_reason TEXT,
  dismiss_note   TEXT,
  removed        BOOLEAN NOT NULL DEFAULT false, -- true == removeIcdDos tombstone
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (member_name, code, dos)
);
CREATE INDEX IF NOT EXISTS idx_hcc_gap_dos_actions_member
  ON hcc_gap_dos_actions (member_name);
CREATE INDEX IF NOT EXISTS idx_hcc_gap_dos_actions_code_dos
  ON hcc_gap_dos_actions (code, dos);

ALTER TABLE hcc_gap_dos_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_gap_dos_actions" ON hcc_gap_dos_actions;
CREATE POLICY "Allow all for hcc_gap_dos_actions"
  ON hcc_gap_dos_actions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'hcc_gap_dos_actions' ORDER BY ordinal_position;
