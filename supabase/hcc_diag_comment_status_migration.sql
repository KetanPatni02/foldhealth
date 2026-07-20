-- ══════════════════════════════════════════════════════════════════════════════
-- HCC diag comments — status-change linkage
-- ══════════════════════════════════════════════════════════════════════════════
-- When a Coder flips a DOS to "Record Requested", the workflow now
-- REQUIRES a comment explaining what's needed. That comment must be
-- traceable back to the status transition it accompanies so the Comments
-- tab and the Activity Log can render the pair as a single event.
--
-- Adds two nullable columns to hcc_diag_comments — every existing row
-- stays valid; new rows can carry the transition context.
--
-- Run once. Idempotent.
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE hcc_diag_comments
  ADD COLUMN IF NOT EXISTS status_from text,
  ADD COLUMN IF NOT EXISTS status_to   text;

COMMIT;
