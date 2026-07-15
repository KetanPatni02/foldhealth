-- ============================================================
-- HCC RAF-breakdown per member.
--
-- Feeds the RafTooltip on the worklist row (hover over the RAF Score
-- / RAF Impact cell). Ported from src/features/hcc/data/raf.js —
-- keyed by member_name so a future rename campaign can migrate to
-- member_id without touching the tooltip code.
--
-- The `_default` row (member_name = '_default') is looked up when a
-- member has no explicit breakdown seeded, matching the JS fallback.
-- ============================================================

CREATE TABLE IF NOT EXISTS hcc_member_raf (
  id           TEXT PRIMARY KEY,
  member_name  TEXT NOT NULL,        -- '_default' for the fallback set
  hcc          TEXT NOT NULL,        -- 'HCC 18'
  hcc_name     TEXT NOT NULL,        -- 'Diabetes with Chronic Complications'
  impact       NUMERIC(6,3) NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hcc_member_raf_member ON hcc_member_raf (member_name, sort_order);

ALTER TABLE hcc_member_raf ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_member_raf" ON hcc_member_raf;
CREATE POLICY "Allow all for hcc_member_raf" ON hcc_member_raf FOR ALL USING (true);

TRUNCATE hcc_member_raf;

INSERT INTO hcc_member_raf (id, member_name, hcc, hcc_name, impact, sort_order) VALUES
  ('raf-ab-1', 'Annette Brave', 'HCC 18',  'Diabetes with Chronic Complications',  0.302, 0),
  ('raf-ab-2', 'Annette Brave', 'HCC 85',  'Congestive Heart Failure',              0.323, 1),
  ('raf-ab-3', 'Annette Brave', 'HCC 112', 'Fibrosis of Lung',                      0.156, 2),
  ('raf-ab-4', 'Annette Brave', 'HCC 120', 'COPD',                                  0.302, 3),
  ('raf-fg-1', 'Frank Green',   'HCC 22',  'Morbid Obesity',                        0.368, 0),
  ('raf-fg-2', 'Frank Green',   'HCC 55',  'Drug/Alcohol Psychosis',                0.429, 1),
  ('raf-bc-1', 'Brian Carter',  'HCC 18',  'Diabetes with Chronic Complications',   0.302, 0),
  ('raf-bc-2', 'Brian Carter',  'HCC 111', 'Chronic Obstructive Pulmonary Disease', 0.335, 1),
  ('raf-bc-3', 'Brian Carter',  'HCC 85',  'Congestive Heart Failure',              0.323, 2),
  ('raf-de-1', 'David Evans',   'HCC 17',  'Diabetes with Acute Complications',     0.318, 0),
  ('raf-de-2', 'David Evans',   'HCC 85',  'Congestive Heart Failure',              0.323, 1),
  ('raf-de-3', 'David Evans',   'HCC 59',  'Major Depressive Disorder',             0.309, 2),
  ('raf-de-4', 'David Evans',   'HCC 34',  'Chronic Kidney Disease Stage 5',        0.289, 3),
  ('raf-gh-1', 'Grace Hill',    'HCC 22',  'Morbid Obesity',                        0.368, 0),
  ('raf-gh-2', 'Grace Hill',    'HCC 85',  'Congestive Heart Failure',              0.323, 1),
  ('raf-gh-3', 'Grace Hill',    'HCC 106', 'Atherosclerosis of Arteries',           0.288, 2),
  ('raf-df-1', '_default',      'HCC 18',  'Diabetes with Chronic Complications',   0.185, 0),
  ('raf-df-2', '_default',      'HCC 22',  'Morbid Obesity',                        0.129, 1),
  ('raf-df-3', '_default',      'HCC 85',  'Congestive Heart Failure',              0.195, 2);

-- Verify:
--   SELECT member_name, count(*) FROM hcc_member_raf GROUP BY member_name ORDER BY member_name;
