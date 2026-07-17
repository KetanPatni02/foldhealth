-- ══════════════════════════════════════════════════════════════════════════════
-- HCC Diagnosis Gaps — canonical `kind` identity
-- ══════════════════════════════════════════════════════════════════════════════
-- Replaces the ambiguous (type, is_linked) pair with a single authoritative
-- column so the UI never has to reconstruct which bucket a row belongs to:
--
--   Associated — verified linked HCC gap (the default)
--   Manual     — coder-added ICD
--   Suspect    — AI-suggested new diagnosis
--   Recapture  — AI-suggested prior-year recapture
--
-- Also enforces (member_name, code) uniqueness so worklog + DiagPanel
-- can no longer render the same code twice.
--
-- Run once. Idempotent.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Dedup any pre-existing (member_name, code) duplicates. Priority when
--    collapsing: Manual > Recapture > Suspect > Associated. Latest updated_at
--    breaks ties. The winning row keeps its id; losers are deleted.
WITH ranked AS (
  SELECT
    id,
    member_name,
    code,
    ROW_NUMBER() OVER (
      PARTITION BY member_name, code
      ORDER BY
        CASE type
          WHEN 'Manual'    THEN 1
          WHEN 'Recapture' THEN 2
          WHEN 'Suspect'   THEN 3
          ELSE 4
        END,
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST
    ) AS rn
  FROM hcc_diagnosis_gaps
)
DELETE FROM hcc_diagnosis_gaps
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Add the kind column with a CHECK constraint. Default 'Associated' means
--    any INSERT that forgets `kind` still lands somewhere sensible.
ALTER TABLE hcc_diagnosis_gaps
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'Associated';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hcc_diagnosis_gaps_kind_check'
  ) THEN
    ALTER TABLE hcc_diagnosis_gaps
      ADD CONSTRAINT hcc_diagnosis_gaps_kind_check
      CHECK (kind IN ('Associated', 'Manual', 'Suspect', 'Recapture'));
  END IF;
END $$;

-- 3. Backfill from the legacy (type, is_linked) pair.
UPDATE hcc_diagnosis_gaps
SET kind = CASE
  WHEN type = 'Manual'    THEN 'Manual'
  WHEN type = 'Recapture' THEN 'Recapture'
  WHEN type = 'Suspect'   THEN 'Suspect'
  WHEN is_linked = false  THEN 'Suspect'   -- unlinked with no type flag → treat as Suspect
  ELSE 'Associated'
END
WHERE kind = 'Associated' OR kind IS NULL;  -- don't clobber rows already set explicitly

-- 4. Uniqueness — one row per (member_name, code). Prevents the WorklogTab /
--    DiagPanel from ever rendering the same code twice for a single patient.
CREATE UNIQUE INDEX IF NOT EXISTS uq_hcc_diag_gaps_member_code
  ON hcc_diagnosis_gaps (member_name, code);

-- 5. Index on kind for fast bucketing.
CREATE INDEX IF NOT EXISTS idx_hcc_diag_gaps_kind
  ON hcc_diagnosis_gaps (kind);

COMMIT;

-- ── Verification ──────────────────────────────────────────────────────────
-- Distribution across kinds (expect Associated ≫ Suspect ≥ Recapture ≥ Manual):
--   SELECT kind, COUNT(*) FROM hcc_diagnosis_gaps GROUP BY kind ORDER BY 2 DESC;
-- Duplicates left after dedup (must be 0):
--   SELECT member_name, code, COUNT(*) FROM hcc_diagnosis_gaps
--     GROUP BY 1, 2 HAVING COUNT(*) > 1;
