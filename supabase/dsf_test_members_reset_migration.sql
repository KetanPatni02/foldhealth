-- Reset DSF-A / DSF-B test members to a clean, never-worked state.
--
-- WHY
-- Test sessions from before DSF-A + DSF-B became one consolidated
-- clinical note (2026-09-21), plus dsfb_orphan_cleanup_migration.sql
-- deleting DSF-B gaps that already had notes, left these members with
-- notes that no longer match their gaps:
--   • signed DSF-A + DSF-B notes while DSF-A is still Open and the
--     DSF-B gap is gone
--   • DSF-B notes submitted for sign-off with no DSF-B gap
--   • split legacy notes (DSF-A draft + DSF-B submitted separately)
--   • drafts whose PHQ-2 is stamped "saved" with no DSF-B to pair with
-- The drawer then opens a single-gap editor pre-filled from the legacy
-- draft instead of the consolidated note.
--
-- WHAT IT DOES (only for the member ids below)
--   1. Deletes their sign-off tasks (linked from a note's
--      review_task_id, or pool 'HEDIS Sign-Off' on the member).
--      task_audit_log and notifications cascade.
--   2. Deletes their clinical notes that cover DSF-A or DSF-B.
--      clinical_note_versions cascade.
--   3. Deletes their caregap_activity rows (these members carry DSF
--      gaps only, and no activity is seeded for them).
--   4. Rewrites their gaps: drops Fold-native DSF-B rows (re-created by
--      a Positive PHQ-2 save), sets DSF-A and Astrana DSF-B back to
--      Open, and strips any `draft` / `linkedTo` keys. Assignee,
--      startDate, source and dueDateISO are kept.
--
-- Not touched: ap-dsfa-10 (Carla Vargas), ap-dsfb-03 (Aisha Williams),
-- ap-dsfb-04 (Paul Tanaka), ap-dsfb-05 (Nadia Mehta), whose data is
-- consistent. Comments are kept.
--
-- Idempotent: a re-run finds nothing left to delete and rewrites the
-- same gaps.
--
-- Ask Alok Kumar to run this migration on Supabase.

BEGIN;

CREATE TEMP TABLE dsf_reset_members (id text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO dsf_reset_members (id) VALUES
  ('ap-dsfa-01'),   -- Rita Naidoo
  ('ap-dsfa-02'),   -- Elena Sanchez
  ('ap-dsfa-03'),   -- Marcus Trent
  ('ap-dsfa-04'),   -- Priya Kapoor
  ('ap-dsfa-05'),   -- Henry Chen
  ('ap-dsfa-06'),   -- Diana Okafor
  ('ap-dsfa-07'),   -- Rafael Aguilar
  ('ap-dsfa-08'),   -- Sophia Nakamura
  ('ap-dsfa-09'),   -- Jamal Brooks
  ('ap-dsfa-solo'), -- Maria Perez
  ('ap-dsfb-01'),   -- Linda Becker
  ('ap-dsfb-02');   -- Gustavo Ortiz

-- 1. Sign-off tasks. Runs before the notes are deleted so the
--    review_task_id links can still be read.
DELETE FROM public.tasks t
WHERE t.id IN (
    SELECT n.review_task_id
    FROM public.clinical_notes n
    JOIN dsf_reset_members m ON m.id = n.hedis_member_id
    WHERE n.review_task_id IS NOT NULL
  )
  OR (
    t.pool = 'HEDIS Sign-Off'
    AND t.hedis_member_id IN (SELECT id FROM dsf_reset_members)
  );

-- 2. DSF clinical notes (versions cascade).
DELETE FROM public.clinical_notes n
USING dsf_reset_members m
WHERE n.hedis_member_id = m.id
  AND n.gap_codes && ARRAY['DSF-A', 'DSF-B']::text[];

-- 3. Activity timeline.
DELETE FROM public.caregap_activity a
USING dsf_reset_members m
WHERE a.member_id = m.id;

-- 4. Gaps back to Open.
UPDATE public.hedis_members h
SET gaps = (
  SELECT COALESCE(jsonb_agg(
    CASE
      WHEN g->>'code' IN ('DSF-A', 'DSF-B')
        THEN jsonb_set(g - 'draft' - 'linkedTo', '{status}', '"Open"')
      ELSE g
    END
  ), '[]'::jsonb)
  FROM jsonb_array_elements(h.gaps) AS g
  WHERE NOT (g->>'code' = 'DSF-B' AND g->>'source' = 'fold-native')
)
WHERE h.id IN (SELECT id FROM dsf_reset_members);

COMMIT;
