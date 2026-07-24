-- ═══════════════════════════════════════════════════════════════════════════
-- hcc_diagnosis_gaps: HCC-Not-Linked backfill support
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Context — client feature (src/store/useAppStore.js :: backfillMockNotLinkedGaps):
--   When a DiagPanel opens for a member, every mock "HCC Not Linked" ICD with
--   evidence (documents OR claims — the OR-either-side rule) is promoted from
--   frontend-only mock data into hcc_diagnosis_gaps with is_linked=false and
--   kind = Suspect / Recapture (from the mock's `type` field). The promotion
--   is fire-and-forget from the client; this migration makes sure the table
--   is shaped for those inserts on any environment that hasn't run every
--   earlier migration yet, and locks down duplicate-promotion via a partial
--   unique index scoped by member_id.
--
-- This file is idempotent — every DDL statement uses IF NOT EXISTS / DO $$
-- guards so it can be re-run safely.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1) Columns the backfill writes ──────────────────────────────────────────
-- Belt-and-suspenders: these were introduced by earlier migrations
-- (hcc_diag_kind_migration.sql, hcc_new_row_persistence_migration.sql) but
-- the guards below let this file run standalone in a fresh environment.
ALTER TABLE hcc_diagnosis_gaps
  ADD COLUMN IF NOT EXISTS member_id  TEXT
    REFERENCES hcc_members(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kind       TEXT NOT NULL DEFAULT 'Associated',
  ADD COLUMN IF NOT EXISTS is_linked  BOOLEAN DEFAULT true;

-- ── 2) Partial unique index on member_id ────────────────────────────────────
-- The existing UNIQUE index on (member_name, code) already prevents duplicate
-- promotions for the *same* patient across sessions/devices. Spawned rows
-- (see hcc_new_row_persistence_migration.sql) share member_name with their
-- source row but carry a distinct member_id — the code path is scoped by
-- member_id, so a matching partial index gives the DB a fast-path for the
-- fetch (fetchHccDiagnosisGaps filters on member_id) AND a second guard
-- against duplicate promotions when a code is unique per member_id but not
-- per member_name.
CREATE UNIQUE INDEX IF NOT EXISTS uq_hcc_diag_gaps_member_id_code
  ON hcc_diagnosis_gaps (member_id, code)
  WHERE member_id IS NOT NULL;

-- ── 3) Fast lookup for the promoted-row filter ──────────────────────────────
-- fetchHccDiagnosisGaps loads rows scoped by member_id; the DiagPanel then
-- partitions by is_linked. A composite index shaves the second filter off
-- the sequential scan on hot pages.
CREATE INDEX IF NOT EXISTS idx_hcc_diag_gaps_member_id_is_linked
  ON hcc_diagnosis_gaps (member_id, is_linked);

-- ── 4) kind values sanity check ─────────────────────────────────────────────
-- The backfill inserts kind ∈ {'Suspect', 'Recapture'}. Other client paths
-- also insert 'Associated' and 'Manual'. Add a lightweight CHECK so a typo
-- surfaces on write instead of poisoning downstream filters.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_hcc_diag_gaps_kind'
  ) THEN
    ALTER TABLE hcc_diagnosis_gaps
      ADD CONSTRAINT chk_hcc_diag_gaps_kind
      CHECK (kind IN ('Associated', 'Manual', 'Suspect', 'Recapture'));
  END IF;
END$$;

-- ── 5) Documentation ────────────────────────────────────────────────────────
COMMENT ON COLUMN hcc_diagnosis_gaps.is_linked IS
  'FALSE = HCC Not Linked ICD (Suspect/Recapture). Backfilled from the frontend '
  'mock into this table by backfillMockNotLinkedGaps once evidence (docs > 0 '
  'OR cmts > 0) exists for the member.';

COMMIT;
