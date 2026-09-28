-- Remove the duplicate patient rows that `bun run seed` kept re-adding, without
-- losing anything that was logged against them, and fold Annette Brave's
-- duplicate SNP program into her real one (11089).
--
-- BACKGROUND
-- scripts/seed.js upserted worklist mocks on their synthetic ids (ap-001,
-- ccmw-002, snpw-001, ap15) after patient_reident_member_id_migration.sql had
-- re-keyed the live rows to id = member_id, so every seed run inserted a second
-- row for people who were already there. The seed is now insert-only per person
-- (withoutExistingPeople), so this should only be needed once.
--
-- worklist_dedupe_synthetic_ids_migration.sql deleted the same kind of row, but
-- it missed apcm_patients and deleted rows that other data still pointed at.
-- Users had worked on the duplicates: care-gap history, lab orders and program
-- enrollments were logged against them.
--
-- ANNETTE BRAVE
-- Her history sits under two earlier ids. 10039 (old snpw-001) is already on her
-- program pcp-snpw-001-SNP-1 but invisible, because the app reads care-plan
-- audit and shares by patient_id. 10003 (old snpw-006) is on
-- pcp-snpw-006-SNP-1, whose program row was lost and then recreated, empty, by
-- an SNP enrollment on the duplicate row. All of it moves to 11089 on
-- pcp-snpw-001-SNP-1, and the empty duplicate program is dropped; her real
-- program keeps its own status and assignee. The 7 audit rows on
-- pcp-10003-SNP-1 are left alone: 10003 was also used by a Ralph Halvorson row,
-- so they can't be attributed.
--
-- DUPLICATE RULE
-- A row is a duplicate when id <> member_id and its table has exactly one row
-- with the same name where id = member_id (the canonical row, always kept).
-- References in caregap_activity and patient_program_activity move to the
-- canonical row first. A duplicate that still owns a care program is left alone.
--
-- Every changed or deleted row is copied into worklist_bak.seed_dupes first.
-- Idempotent: a second run finds nothing to change.

BEGIN;

CREATE SCHEMA IF NOT EXISTS worklist_bak;
CREATE TABLE IF NOT EXISTS worklist_bak.seed_dupes (
  tbl          text        NOT NULL,
  row_data     jsonb       NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

-- ── 1. Annette Brave: merge into 11089 / pcp-snpw-001-SNP-1 ──────────────────

INSERT INTO worklist_bak.seed_dupes (tbl, row_data)
  SELECT 'care_plan_audit', to_jsonb(x) FROM public.care_plan_audit x
  WHERE (x.program_id = 'pcp-snpw-006-SNP-1' AND x.patient_id = '10003')
     OR (x.program_id = 'pcp-snpw-001-SNP-1' AND x.patient_id = '10039');
INSERT INTO worklist_bak.seed_dupes (tbl, row_data)
  SELECT 'care_plan_shares', to_jsonb(x) FROM public.care_plan_shares x
  WHERE (x.program_id = 'pcp-snpw-006-SNP-1' AND x.patient_id = '10003')
     OR (x.program_id = 'pcp-snpw-001-SNP-1' AND x.patient_id = '10039');
INSERT INTO worklist_bak.seed_dupes (tbl, row_data)
  SELECT 'patient_care_programs', to_jsonb(x) FROM public.patient_care_programs x
  WHERE x.id = 'pcp-snpw-006-SNP-1' AND x.patient_id = 'snpw-006';

UPDATE public.care_plan_audit
   SET patient_id = '11089', program_id = 'pcp-snpw-001-SNP-1'
 WHERE (program_id = 'pcp-snpw-006-SNP-1' AND patient_id = '10003')
    OR (program_id = 'pcp-snpw-001-SNP-1' AND patient_id = '10039');
UPDATE public.care_plan_shares
   SET patient_id = '11089', program_id = 'pcp-snpw-001-SNP-1'
 WHERE (program_id = 'pcp-snpw-006-SNP-1' AND patient_id = '10003')
    OR (program_id = 'pcp-snpw-001-SNP-1' AND patient_id = '10039');

-- Only drop it while it is the empty re-creation owned by the duplicate row.
DELETE FROM public.patient_care_programs p
 WHERE p.id = 'pcp-snpw-006-SNP-1' AND p.patient_id = 'snpw-006'
   AND NOT EXISTS (SELECT 1 FROM public.patient_care_plans c WHERE c.program_id = p.id)
   AND NOT EXISTS (SELECT 1 FROM public.care_plan_audit a WHERE a.program_id = p.id)
   AND NOT EXISTS (SELECT 1 FROM public.care_plan_shares s WHERE s.program_id = p.id);

-- ── 2. Duplicate worklist rows ───────────────────────────────────────────────

CREATE TEMP TABLE _dupe_map ON COMMIT DROP AS
WITH d AS (
  SELECT 'hedis_members' AS tbl, id::text AS id, name FROM public.hedis_members WHERE id::text <> member_id::text
  UNION ALL SELECT 'ccm_worklist_members', id::text, name FROM public.ccm_worklist_members WHERE id::text <> member_id::text
  UNION ALL SELECT 'snp_worklist_members', id::text, name FROM public.snp_worklist_members WHERE id::text <> member_id::text
  UNION ALL SELECT 'apcm_patients',        id::text, name FROM public.apcm_patients        WHERE id::text <> member_id::text
), c AS (
  SELECT 'hedis_members' AS tbl, id::text AS id, name FROM public.hedis_members WHERE id::text = member_id::text
  UNION ALL SELECT 'ccm_worklist_members', id::text, name FROM public.ccm_worklist_members WHERE id::text = member_id::text
  UNION ALL SELECT 'snp_worklist_members', id::text, name FROM public.snp_worklist_members WHERE id::text = member_id::text
  UNION ALL SELECT 'apcm_patients',        id::text, name FROM public.apcm_patients        WHERE id::text = member_id::text
)
SELECT d.tbl, d.id AS dupe_id, min(c.id) AS canon_id
FROM d JOIN c ON c.tbl = d.tbl AND c.name = d.name
WHERE NOT EXISTS (SELECT 1 FROM public.patient_care_programs p WHERE p.patient_id = d.id)
GROUP BY d.tbl, d.id
HAVING count(*) = 1;

INSERT INTO worklist_bak.seed_dupes (tbl, row_data)
  SELECT 'hedis_members', to_jsonb(x) FROM public.hedis_members x
  WHERE x.id::text IN (SELECT dupe_id FROM _dupe_map WHERE tbl = 'hedis_members');
INSERT INTO worklist_bak.seed_dupes (tbl, row_data)
  SELECT 'ccm_worklist_members', to_jsonb(x) FROM public.ccm_worklist_members x
  WHERE x.id::text IN (SELECT dupe_id FROM _dupe_map WHERE tbl = 'ccm_worklist_members');
INSERT INTO worklist_bak.seed_dupes (tbl, row_data)
  SELECT 'snp_worklist_members', to_jsonb(x) FROM public.snp_worklist_members x
  WHERE x.id::text IN (SELECT dupe_id FROM _dupe_map WHERE tbl = 'snp_worklist_members');
INSERT INTO worklist_bak.seed_dupes (tbl, row_data)
  SELECT 'apcm_patients', to_jsonb(x) FROM public.apcm_patients x
  WHERE x.id::text IN (SELECT dupe_id FROM _dupe_map WHERE tbl = 'apcm_patients');
INSERT INTO worklist_bak.seed_dupes (tbl, row_data)
  SELECT 'caregap_activity', to_jsonb(x) FROM public.caregap_activity x
  WHERE x.member_id IN (SELECT dupe_id FROM _dupe_map);
INSERT INTO worklist_bak.seed_dupes (tbl, row_data)
  SELECT 'patient_program_activity', to_jsonb(x) FROM public.patient_program_activity x
  WHERE x.patient_id IN (SELECT dupe_id FROM _dupe_map);

-- Synthetic ids are table-specific (ap-, ccmw-, snpw-, ap<n>), so dupe_id
-- alone identifies the person.
UPDATE public.caregap_activity a SET member_id = m.canon_id
  FROM _dupe_map m WHERE a.member_id = m.dupe_id;
UPDATE public.patient_program_activity a SET patient_id = m.canon_id
  FROM _dupe_map m WHERE a.patient_id = m.dupe_id;

DELETE FROM public.hedis_members x USING _dupe_map m
  WHERE m.tbl = 'hedis_members' AND x.id::text = m.dupe_id;
DELETE FROM public.ccm_worklist_members x USING _dupe_map m
  WHERE m.tbl = 'ccm_worklist_members' AND x.id::text = m.dupe_id;
DELETE FROM public.snp_worklist_members x USING _dupe_map m
  WHERE m.tbl = 'snp_worklist_members' AND x.id::text = m.dupe_id;
DELETE FROM public.apcm_patients x USING _dupe_map m
  WHERE m.tbl = 'apcm_patients' AND x.id::text = m.dupe_id;

COMMIT;
