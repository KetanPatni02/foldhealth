-- ============================================================
-- HCC sweep-mode ICD data — deduplicated ICDs per member with
-- per-DOS status/RAF/claim in a JSONB payload.
--
-- Feeds the DiagPanel's "sweep by DOS" grouping (DiagPanel.jsx
-- cardIcds memo). Ported from src/features/hcc/data/sweepIcds.js.
-- Only Annette Brave (design reference) + a '_default' fallback
-- row are seeded; members without a sweep record use the standard
-- DOS spread across dos_list dates.
-- ============================================================

CREATE TABLE IF NOT EXISTS hcc_gap_sweep (
  id                TEXT PRIMARY KEY,
  member_name       TEXT NOT NULL,       -- '_default' for the fallback
  code              TEXT NOT NULL,
  description       TEXT NOT NULL,
  hcc               TEXT,
  type              TEXT,                -- 'Suspect' | 'Recapture' | 'Manual' | null
  dos_entries       JSONB NOT NULL,      -- [{ dos, status, raf, claimed }]
  docs              INT DEFAULT 0,
  cmts              INT DEFAULT 0,
  notes             INT DEFAULT 0,
  last_activity     TEXT,
  last_activity_by  TEXT,
  sort_order        INT DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hcc_gap_sweep_member ON hcc_gap_sweep (member_name, sort_order);

ALTER TABLE hcc_gap_sweep ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_gap_sweep" ON hcc_gap_sweep;
CREATE POLICY "Allow all for hcc_gap_sweep" ON hcc_gap_sweep FOR ALL USING (true);

TRUNCATE hcc_gap_sweep;

INSERT INTO hcc_gap_sweep (id, member_name, code, description, hcc, type, dos_entries, docs, cmts, notes, last_activity, last_activity_by, sort_order) VALUES
  ('sweep-ab-1', 'Annette Brave', 'E11.22',
    'Type 2 diabetes mellitus with diabetic chronic kidney disease',
    'HCC 37 - Diabetes with Chronic Complications', NULL,
    '[{"dos":"03/04/2026","status":"Accepted","raf":0.302,"claimed":true},{"dos":"03/31/2026","status":"New","raf":0.302,"claimed":false}]'::jsonb,
    3, 3, 0, '06/27/2025', 'Dr. Benjamin Cummings (Physician)', 0),
  ('sweep-ab-2', 'Annette Brave', 'F32.1',
    'Major depressive disorder, single episode, moderate',
    'HCC 155 - Major Depressive Disorder, Moderate', NULL,
    '[{"dos":"03/04/2026","status":"New","raf":0.309,"claimed":false},{"dos":"03/31/2026","status":"New","raf":0.309,"claimed":false},{"dos":"06/11/2025","status":"New","raf":0.309,"claimed":false}]'::jsonb,
    3, 3, 0, '06/27/2025', 'Dr. Benjamin Cummings (Physician)', 1),
  ('sweep-ab-3', 'Annette Brave', 'I50.43',
    'Acute on chronic combined systolic and diastolic heart failure',
    'HCC 224 - Acute on Chronic Heart Failure', NULL,
    '[{"dos":"03/31/2026","status":"New","raf":0.368,"claimed":false},{"dos":"06/11/2025","status":"New","raf":0.368,"claimed":false}]'::jsonb,
    3, 3, 0, '06/27/2025', 'Dr. Benjamin Cummings (Physician)', 2),
  ('sweep-ab-4', 'Annette Brave', 'E41.0',
    'Nutritional marasmus',
    'HCC Not Linked', 'Manual',
    '[{"dos":"06/11/2025","status":"New","raf":0.000,"claimed":false}]'::jsonb,
    3, 3, 0, '06/11/2025', 'Deborah Hintz (Coder)', 3),
  ('sweep-df-1', '_default', 'E11.22',
    'Type 2 diabetes mellitus with diabetic chronic kidney disease',
    'HCC 37 - Diabetes with Chronic Complications', 'Suspect',
    '[{"dos":"03/04/2026","status":"New","raf":0.302,"claimed":false}]'::jsonb,
    2, 1, 0, '06/27/2025', 'System', 0);

-- Verify:
--   SELECT member_name, count(*) FROM hcc_gap_sweep GROUP BY member_name;
