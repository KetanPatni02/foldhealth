-- HCC worklist — reset all role assignments + role activity to a fresh state.
--
-- Purpose: wipe every role assignee and status on every hcc_members row and
-- clear the role-activity tables so the worklist starts blank. Runs as a
-- single transaction; you can preview the counts before COMMIT.
--
-- WHAT THIS DOES (destructive)
--   1. hcc_members — for every row:
--        support_name    → NULL     support_status    → 'Assign'
--        coder_name      → NULL     coder_status      → 'Assign'
--        reviewer1_name  → NULL     reviewer1_status  → 'Assign'
--        reviewer2_name  → NULL     reviewer2_status  → 'Assign'
--   2. hcc_activity_log      — DELETE ALL rows (assignee/status/role events)
--   3. hcc_diag_history      — DELETE ALL rows (per-record history drawer)
--   4. hcc_gap_activity      — DELETE ALL rows (ICD-level activity feed)
--   5. hcc_gap_dos_actions   — DELETE ALL rows (per-(ICD × DOS) coder picks)
--
-- WHAT THIS DOES NOT TOUCH (by design — flip on the guarded blocks below
-- only if you want them included in the reset)
--   • hcc_diagnosis_gaps   — the ICD gaps themselves
--   • hcc_diag_comments    — comments on records
--   • hcc_diag_notes       — notes on records
--   • hcc_diag_documents / hcc_added_charts / hcc_removed_charts /
--     hcc_chart_status     — uploaded chart docs + their pass/fail
--   • hcc_gap_confidence / hcc_gap_sweep / hcc_member_raf — reference data
--   • hcc_documents        — SFTP-imported document metadata
--
-- HOW TO RUN
--   1. Paste this whole file into the Supabase SQL editor (or `psql`).
--   2. Run it. The transaction reports before/after row counts.
--   3. If the counts look wrong, `ROLLBACK;` — nothing persists until COMMIT.
--   4. If they look right, `COMMIT;` — done. This file already includes COMMIT
--      at the bottom, so a straight run commits automatically. Delete or
--      comment out that COMMIT if you want to inspect first.
--
-- Idempotent — safe to re-run. All UPDATEs and DELETEs converge to the same
-- state.

BEGIN;

-- Before snapshot — counts to verify against after.
SELECT 'BEFORE'                                        AS phase,
       (SELECT count(*) FROM hcc_members)              AS hcc_members_total,
       (SELECT count(*) FROM hcc_members
          WHERE support_name  IS NOT NULL
             OR coder_name    IS NOT NULL
             OR reviewer1_name IS NOT NULL
             OR reviewer2_name IS NOT NULL)            AS members_with_any_assignee,
       (SELECT count(*) FROM hcc_activity_log)         AS hcc_activity_log_rows,
       (SELECT count(*) FROM hcc_diag_history)         AS hcc_diag_history_rows,
       (SELECT count(*) FROM hcc_gap_activity)         AS hcc_gap_activity_rows,
       (SELECT count(*) FROM hcc_gap_dos_actions)      AS hcc_gap_dos_actions_rows;

-- 1) Wipe every role name + reset every role status to the unassigned default.
UPDATE hcc_members
   SET support_name      = NULL,
       support_status    = 'Assign',
       coder_name        = NULL,
       coder_status      = 'Assign',
       reviewer1_name    = NULL,
       reviewer1_status  = 'Assign',
       reviewer2_name    = NULL,
       reviewer2_status  = 'Assign';

-- 2..5) Clear role-activity tables.
DELETE FROM hcc_activity_log;
DELETE FROM hcc_diag_history;
DELETE FROM hcc_gap_activity;
DELETE FROM hcc_gap_dos_actions;

-- ── Optional wipes ────────────────────────────────────────────────────
-- Uncomment any of these if you want that surface reset too. They are
-- OFF by default because they may hold real work (typed comments, notes,
-- uploaded PDFs) that a role-reset alone shouldn't destroy.
--
-- DELETE FROM hcc_diag_comments;
-- DELETE FROM hcc_diag_notes;
-- DELETE FROM hcc_chart_status;
-- DELETE FROM hcc_added_charts;
-- DELETE FROM hcc_removed_charts;
-- DELETE FROM hcc_diag_documents;
-- ──────────────────────────────────────────────────────────────────────

-- After snapshot — everything except hcc_members_total should be 0.
SELECT 'AFTER'                                         AS phase,
       (SELECT count(*) FROM hcc_members)              AS hcc_members_total,
       (SELECT count(*) FROM hcc_members
          WHERE support_name  IS NOT NULL
             OR coder_name    IS NOT NULL
             OR reviewer1_name IS NOT NULL
             OR reviewer2_name IS NOT NULL)            AS members_with_any_assignee,
       (SELECT count(*) FROM hcc_activity_log)         AS hcc_activity_log_rows,
       (SELECT count(*) FROM hcc_diag_history)         AS hcc_diag_history_rows,
       (SELECT count(*) FROM hcc_gap_activity)         AS hcc_gap_activity_rows,
       (SELECT count(*) FROM hcc_gap_dos_actions)      AS hcc_gap_dos_actions_rows;

COMMIT;
