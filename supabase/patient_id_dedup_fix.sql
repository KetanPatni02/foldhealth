-- ============================================================
-- Fold ID de-collision fix
-- ============================================================
--
-- patient_id_unification_migration.sql collapsed every row's member_id to
-- a Fold ID by looking up the row's OWN (normalized) payer member_id in
-- patient_registry. That's correct in general, but exposed a pre-existing
-- seed-data bug: a handful of `patients` rows (p2, p3, p4, p5, p6, p7) and
-- one `snp_worklist_members` row (snpw-006) were seeded with the exact
-- same placeholder payer member_id as `patients.p1` (Ralph Halvorson) —
-- so they all joined to the SAME registry entry and now display the
-- identical Fold ID (#10003) despite being different people. Separately,
-- one `hcc_members` row ('Anita Brave', hcc-5) was seeded sharing a payer
-- member_id with an unrelated 'Annette Brave' hcc_members row, colliding
-- on #10067.
--
-- Fix, in two parts:
--   1) The `all_patients` table was independently seeded with correct,
--      already-distinct member_id values for these same six people
--      (ap-005..ap-010, already mapped to fold_ids 10004-10009). Re-point
--      the buggy `patients`/`snp_worklist_members` rows at those existing,
--      correct fold_ids instead of re-deriving new ones.
--   2) For the #10067 pair, neither row has an unambiguous canonical match
--      elsewhere (multiple other unrelated "Annette Brave" mock rows exist
--      at other fold_ids already) — minting a fresh Fold ID for each is
--      safer than guessing a merge and repeating this exact bug.
--
-- Idempotent: re-running finds the target rows already fixed and updates 0.

BEGIN;

-- ── 1) Re-point the #10003 victims at their real, existing Fold IDs ──
UPDATE patients SET member_id = '10004' WHERE id = 'p2';  -- Terri Schulist
UPDATE patients SET member_id = '10005' WHERE id = 'p3';  -- Annette Brave
UPDATE patients SET member_id = '10006' WHERE id = 'p4';  -- Glenn Bauch
UPDATE patients SET member_id = '10007' WHERE id = 'p5';  -- Marcus Ziemann
UPDATE patients SET member_id = '10008' WHERE id = 'p6';  -- Ms. Lloyd Pagac
UPDATE patients SET member_id = '10009' WHERE id = 'p7';  -- Kendra Crona
UPDATE snp_worklist_members SET member_id = '10005' WHERE id = 'snpw-006'; -- Annette Brave

-- ── 2) Split the #10067 pair into two fresh, distinct Fold IDs ──
-- Guarded so re-running finds them already split (different member_id
-- values) and does nothing — nextval() must not advance on a no-op re-run.
DO $$
DECLARE
  new_id_1 INT;
  new_id_2 INT;
  still_colliding BOOLEAN;
BEGIN
  SELECT count(DISTINCT member_id) = 1 INTO still_colliding
  FROM hcc_members
  WHERE id IN ('12a269a0-b36a-44b2-a3b7-151bef493504', 'hcc-5');

  IF still_colliding THEN
    new_id_1 := nextval('patient_fold_id_seq');
    new_id_2 := nextval('patient_fold_id_seq');

    INSERT INTO patient_registry (fold_id, member_id)
    VALUES (new_id_1, 'hcc_members:12a269a0-b36a-44b2-a3b7-151bef493504')
    ON CONFLICT (fold_id) DO NOTHING;

    INSERT INTO patient_registry (fold_id, member_id)
    VALUES (new_id_2, 'hcc_members:hcc-5')
    ON CONFLICT (fold_id) DO NOTHING;

    UPDATE hcc_members SET member_id = new_id_1::text
      WHERE id = '12a269a0-b36a-44b2-a3b7-151bef493504'; -- Annette Brave

    UPDATE hcc_members SET member_id = new_id_2::text
      WHERE id = 'hcc-5'; -- Anita Brave
  END IF;
END $$;

COMMIT;
