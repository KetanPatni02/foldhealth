-- ══════════════════════════════════════════════════════════════════════════════
-- HCC schema v2 — native types + normalization
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Phase 1: replace "stringly-typed" columns with native Postgres types so the
--          worklist can sort/filter/aggregate at the DB layer.
-- Phase 2: normalize `dos_list` and `doc_status` JSONB into child tables
--          (`hcc_member_visits`, `hcc_member_documents`), then expose a view
--          `hcc_members_v2` that rebuilds the old JSON shape for the frontend.
--
-- Run this AFTER hcc_migration.sql + hcc_members_seed_batch2.sql have already
-- populated hcc_members / hcc_diagnosis_gaps. The script is idempotent — safe
-- to re-run against a partially-migrated DB.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 1a — hcc_members: text → native types
-- ─────────────────────────────────────────────────────────────────────────────

-- age (text like '67y 3m') → date_of_birth (DATE)
-- Parse years/months out of the current age string and subtract from today.
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS date_of_birth DATE;

UPDATE hcc_members
   SET date_of_birth = CURRENT_DATE - (
         (COALESCE(NULLIF((regexp_match(age, '(\d+)\s*y'))[1], ''), '0')::int || ' years')::interval +
         (COALESCE(NULLIF((regexp_match(age, '(\d+)\s*m'))[1], ''), '0')::int || ' months')::interval
       )
 WHERE date_of_birth IS NULL AND age IS NOT NULL;

ALTER TABLE hcc_members DROP COLUMN IF EXISTS age;

-- create_date (text 'MM/DD/YYYY') → DATE
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_name = 'hcc_members' AND column_name = 'create_date') = 'text' THEN
    ALTER TABLE hcc_members
      ALTER COLUMN create_date TYPE DATE
      USING to_date(NULLIF(create_date, ''), 'MM/DD/YYYY');
  END IF;
END$$;

-- raf_score, raf_impact (text like '3.579') → NUMERIC(8,3)
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_name = 'hcc_members' AND column_name = 'raf_score') = 'text' THEN
    ALTER TABLE hcc_members ALTER COLUMN raf_score TYPE NUMERIC(8,3)
      USING NULLIF(raf_score, '')::NUMERIC;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_name = 'hcc_members' AND column_name = 'raf_impact') = 'text' THEN
    ALTER TABLE hcc_members ALTER COLUMN raf_impact TYPE NUMERIC(8,3)
      USING NULLIF(raf_impact, '')::NUMERIC;
  END IF;
END$$;

-- decile, advillness, frailty (text like '9') → INTEGER
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_name = 'hcc_members' AND column_name = 'decile') = 'text' THEN
    ALTER TABLE hcc_members ALTER COLUMN decile TYPE INTEGER
      USING NULLIF(decile, '')::INTEGER;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_name = 'hcc_members' AND column_name = 'advillness') = 'text' THEN
    ALTER TABLE hcc_members ALTER COLUMN advillness TYPE INTEGER
      USING NULLIF(advillness, '')::INTEGER;
  END IF;
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_name = 'hcc_members' AND column_name = 'frailty') = 'text' THEN
    ALTER TABLE hcc_members ALTER COLUMN frailty TYPE INTEGER
      USING NULLIF(frailty, '')::INTEGER;
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 1b — hcc_diagnosis_gaps: last_activity text → DATE
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_name = 'hcc_diagnosis_gaps' AND column_name = 'last_activity') = 'text' THEN
    ALTER TABLE hcc_diagnosis_gaps ALTER COLUMN last_activity TYPE DATE
      USING to_date(NULLIF(last_activity, ''), 'MM/DD/YYYY');
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2a — hcc_member_visits (normalized dos_list)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hcc_member_visits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     TEXT NOT NULL REFERENCES hcc_members(id) ON DELETE CASCADE,
  dos_date      DATE NOT NULL,
  status_label  TEXT,
  status_color  TEXT,
  visit_index   INTEGER NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (member_id, visit_index)
);

CREATE INDEX IF NOT EXISTS idx_hcc_member_visits_member ON hcc_member_visits(member_id);
CREATE INDEX IF NOT EXISTS idx_hcc_member_visits_date   ON hcc_member_visits(dos_date);

-- Backfill from hcc_members.dos_list (JSONB array) — only if the column still
-- exists (rerun-safe). Each JSON entry becomes one hcc_member_visits row.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'hcc_members' AND column_name = 'dos_list') THEN
    INSERT INTO hcc_member_visits (member_id, dos_date, status_label, status_color, visit_index)
    SELECT m.id,
           to_date(elem->>'date', 'MM/DD/YYYY'),
           elem->>'label',
           elem->>'labelColor',
           (ord - 1)::INTEGER
      FROM hcc_members m
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(m.dos_list, '[]'::jsonb))
        WITH ORDINALITY AS t(elem, ord)
     WHERE elem->>'date' IS NOT NULL
    ON CONFLICT (member_id, visit_index) DO NOTHING;
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2b — hcc_member_documents (normalized doc_status)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hcc_member_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     TEXT NOT NULL REFERENCES hcc_members(id) ON DELETE CASCADE,
  doc_index     INTEGER NOT NULL,
  status        TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (member_id, doc_index)
);

CREATE INDEX IF NOT EXISTS idx_hcc_member_documents_member ON hcc_member_documents(member_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'hcc_members' AND column_name = 'doc_status') THEN
    INSERT INTO hcc_member_documents (member_id, doc_index, status)
    SELECT m.id,
           (ord - 1)::INTEGER,
           elem::TEXT
      FROM hcc_members m
      CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(m.doc_status, '[]'::jsonb))
        WITH ORDINALITY AS t(elem, ord)
    ON CONFLICT (member_id, doc_index) DO NOTHING;
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2c — drop the legacy JSONB columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hcc_members DROP COLUMN IF EXISTS dos_list;
ALTER TABLE hcc_members DROP COLUMN IF EXISTS doc_status;

-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2d — compatibility view
-- Rebuilds the old JSON shape so the frontend's fetchHccMembers only has to
-- swap the FROM clause. dos_list dates come back as MM/DD/YYYY strings because
-- other parts of the app use them as lookup keys (hccDosAssignments map).
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS hcc_members_v2;
CREATE VIEW hcc_members_v2 AS
SELECT
  m.*,
  COALESCE(
    (SELECT jsonb_agg(
              jsonb_build_object(
                'date',       to_char(v.dos_date, 'MM/DD/YYYY'),
                'label',      v.status_label,
                'labelColor', v.status_color
              )
              ORDER BY v.visit_index
            )
       FROM hcc_member_visits v WHERE v.member_id = m.id),
    '[]'::jsonb
  ) AS dos_list,
  COALESCE(
    (SELECT jsonb_agg(d.status ORDER BY d.doc_index)
       FROM hcc_member_documents d WHERE d.member_id = m.id),
    '[]'::jsonb
  ) AS doc_status
FROM hcc_members m;

-- Make the view accessible to PostgREST clients (Supabase JS uses the anon
-- role for reads and authenticated for writes; views need explicit grants).
GRANT SELECT ON hcc_members_v2 TO anon, authenticated;
GRANT SELECT ON hcc_member_visits, hcc_member_documents TO anon, authenticated;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════════════
-- Post-migration verification
-- ══════════════════════════════════════════════════════════════════════════════
-- Uncomment to sanity-check after running:
--
--   SELECT COUNT(*) AS members,
--          COUNT(date_of_birth) AS with_dob,
--          MIN(create_date) AS oldest_create, MAX(create_date) AS newest_create,
--          MIN(raf_score) AS min_raf, MAX(raf_score) AS max_raf
--     FROM hcc_members;
--
--   SELECT COUNT(*) AS total_visits, COUNT(DISTINCT member_id) AS members_with_visits
--     FROM hcc_member_visits;
--
--   SELECT COUNT(*) AS total_docs, COUNT(DISTINCT member_id) AS members_with_docs
--     FROM hcc_member_documents;
--
--   SELECT id, name, date_of_birth, create_date, raf_score, decile,
--          jsonb_array_length(dos_list) AS dos_ct,
--          jsonb_array_length(doc_status) AS doc_ct
--     FROM hcc_members_v2 LIMIT 5;
