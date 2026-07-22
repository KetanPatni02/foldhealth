-- ══════════════════════════════════════════════════════════════════════════════
-- HCC schema v3 — backing columns for the remaining More Filters entries
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Adds the columns / derived fields that the following filters need:
--   Step 2  city, state, tin
--   Step 3  hcc_gap_count, last_gap_activity  (VIEW-computed, no new columns)
--   Step 4  {support,coder,reviewer1,reviewer2}_{assigned,completed}_at
--
-- Idempotent, transactional. Safe to re-run against a partially-migrated DB.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2 — city / state / tin
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS city  TEXT;
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS state TEXT;   -- 2-letter US state
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS tin   TEXT;   -- 9-digit tax id

-- Deterministic seed: assign a plausible US city/state pair per member using
-- a hash of the id, then a fallback for any row that missed the join.
WITH us_cities(idx, state_code, city) AS (
  VALUES
    (0,  'CA', 'Los Angeles'),   (1,  'CA', 'San Francisco'),
    (2,  'CA', 'San Diego'),     (3,  'TX', 'Austin'),
    (4,  'TX', 'Houston'),       (5,  'TX', 'Dallas'),
    (6,  'NY', 'New York'),      (7,  'NY', 'Buffalo'),
    (8,  'FL', 'Miami'),         (9,  'FL', 'Tampa'),
    (10, 'WA', 'Seattle'),       (11, 'IL', 'Chicago'),
    (12, 'MA', 'Boston'),        (13, 'CO', 'Denver'),
    (14, 'GA', 'Atlanta'),       (15, 'AZ', 'Phoenix'),
    (16, 'OR', 'Portland'),      (17, 'NV', 'Las Vegas'),
    (18, 'OH', 'Columbus'),      (19, 'NC', 'Raleigh')
)
UPDATE hcc_members m
   SET city  = c.city,
       state = c.state_code
  FROM us_cities c
 WHERE m.city IS NULL
   AND (ABS(hashtext(m.id)) % 20) = c.idx;

-- Safety net for anything the join missed
UPDATE hcc_members SET city = 'Los Angeles', state = 'CA'
 WHERE city IS NULL;

-- TIN — 9 digits, deterministic per member id
UPDATE hcc_members
   SET tin = lpad((ABS(hashtext(id)) % 1000000000)::TEXT, 9, '0')
 WHERE tin IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4 — per-role assigned/completion timestamps
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS support_assigned_at    TIMESTAMPTZ;
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS support_completed_at   TIMESTAMPTZ;
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS coder_assigned_at      TIMESTAMPTZ;
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS coder_completed_at     TIMESTAMPTZ;
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS reviewer1_assigned_at  TIMESTAMPTZ;
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS reviewer1_completed_at TIMESTAMPTZ;
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS reviewer2_assigned_at  TIMESTAMPTZ;
ALTER TABLE hcc_members ADD COLUMN IF NOT EXISTS reviewer2_completed_at TIMESTAMPTZ;

-- Backfill: derive plausible timestamps from the existing name+status combo.
--   - assignee present → *_assigned_at  ≈ create_date
--   - status in a Completed-ish bucket → *_completed_at  ≈ create_date + N days
-- The N-day offsets stair-step through the workflow (support → coder → QA →
-- compliance) so completions are in a sensible order per record.
UPDATE hcc_members SET
  support_assigned_at =
    CASE WHEN support_name IS NOT NULL THEN create_date::TIMESTAMPTZ ELSE support_assigned_at END,
  support_completed_at =
    CASE WHEN support_status IN ('Completed','Records Received','Record Received')
         THEN (create_date + INTERVAL '3 days')::TIMESTAMPTZ ELSE support_completed_at END,
  coder_assigned_at =
    CASE WHEN coder_name IS NOT NULL THEN create_date::TIMESTAMPTZ ELSE coder_assigned_at END,
  coder_completed_at =
    CASE WHEN coder_status IN ('Completed','Records Received','Record Received')
         THEN (create_date + INTERVAL '5 days')::TIMESTAMPTZ ELSE coder_completed_at END,
  reviewer1_assigned_at =
    CASE WHEN reviewer1_name IS NOT NULL THEN create_date::TIMESTAMPTZ ELSE reviewer1_assigned_at END,
  reviewer1_completed_at =
    CASE WHEN reviewer1_status IN ('Completed')
         THEN (create_date + INTERVAL '7 days')::TIMESTAMPTZ ELSE reviewer1_completed_at END,
  reviewer2_assigned_at =
    CASE WHEN reviewer2_name IS NOT NULL THEN create_date::TIMESTAMPTZ ELSE reviewer2_assigned_at END,
  reviewer2_completed_at =
    CASE WHEN reviewer2_status IN ('Completed')
         THEN (create_date + INTERVAL '9 days')::TIMESTAMPTZ ELSE reviewer2_completed_at END;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3 + refresh — hcc_members_v2 view with the new columns + derived counts
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
  ) AS doc_status,
  (SELECT COUNT(*)::INTEGER
     FROM hcc_diagnosis_gaps g
    WHERE g.member_name = m.name)                                 AS hcc_gap_count,
  (SELECT MAX(g.last_activity)
     FROM hcc_diagnosis_gaps g
    WHERE g.member_name = m.name)                                 AS last_gap_activity
FROM hcc_members m;

GRANT SELECT ON hcc_members_v2 TO anon, authenticated;

COMMIT;

-- Verification queries — uncomment to sanity-check post-run:
--   SELECT city, state, tin, hcc_gap_count, last_gap_activity,
--          support_assigned_at, support_completed_at,
--          coder_assigned_at, coder_completed_at
--     FROM hcc_members_v2 LIMIT 5;
--   SELECT COUNT(*) AS with_city, COUNT(tin) AS with_tin FROM hcc_members;
--   SELECT COUNT(*) AS total_supp_assign, COUNT(*) FILTER (WHERE support_completed_at IS NOT NULL) AS supp_completed
--     FROM hcc_members;
