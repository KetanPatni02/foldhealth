-- Merge the 24 AWV<->JSA same-name pairs onto their AWV member id (canonical).
-- Same pattern as duplicate_name_identity_merge_migration.sql: re-key references,
-- dedupe programs where both sides had one, and collapse JSA worklist rows so
-- each person shows one Fold ID on both worklists. William Davis (M-JSA-1003)
-- was already merged in the SNP pass.
--
--   Barbara Harris      M-JSA-1010 -> 10968
--   Charles Jackson     M-JSA-1013 -> 11085
--   Christopher Hall    M-JSA-1018 -> 11174
--   Daniel Young        M-JSA-1020 -> 10958
--   Donna Baker         M-JSA-1025 -> 11027
--   Elizabeth White     M-JSA-1009 -> 11110
--   James Wilson        M-JSA-1005 -> 11065
--   Jennifer Thomas     M-JSA-1008 -> 11061
--   John Smith          M-JSA-1001 -> 11037
--   Joseph Lee          M-JSA-1014 -> 10955
--   Karen Allen         M-JSA-1019 -> 11188
--   Linda Martinez      M-JSA-1004 -> 10988
--   Lisa Scott          M-JSA-1023 -> 11031
--   Margaret Perez      M-JSA-1015 -> 11129
--   Mark Green          M-JSA-1024 -> 11054
--   Mary Johnson        M-JSA-1002 -> 11049
--   Nancy King          M-JSA-1021 -> 11040
--   Patricia Taylor     M-JSA-1006 -> 11098
--   Paul Wright         M-JSA-1022 -> 11024
--   Richard Martin      M-JSA-1011 -> 10993
--   Robert Anderson     M-JSA-1007 -> 11076
--   Sarah White         M-JSA-1017 -> 11092
--   Susan Moore         M-JSA-1012 -> 11173
--   Thomas Thompson     M-JSA-1016 -> 11175

BEGIN;
SET LOCAL session_replication_role = replica;

CREATE TEMP TABLE _merge(old_id text PRIMARY KEY, canonical text) ON COMMIT DROP;
INSERT INTO _merge(old_id, canonical) VALUES
  ('M-JSA-1010','10968'),('M-JSA-1013','11085'),('M-JSA-1018','11174'),
  ('M-JSA-1020','10958'),('M-JSA-1025','11027'),('M-JSA-1009','11110'),
  ('M-JSA-1005','11065'),('M-JSA-1008','11061'),('M-JSA-1001','11037'),
  ('M-JSA-1014','10955'),('M-JSA-1019','11188'),('M-JSA-1004','10988'),
  ('M-JSA-1023','11031'),('M-JSA-1015','11129'),('M-JSA-1024','11054'),
  ('M-JSA-1002','11049'),('M-JSA-1021','11040'),('M-JSA-1006','11098'),
  ('M-JSA-1022','11024'),('M-JSA-1011','10993'),('M-JSA-1007','11076'),
  ('M-JSA-1017','11092'),('M-JSA-1012','11173'),('M-JSA-1016','11175');

-- Snapshot the tables this touches (idempotent).
CREATE SCHEMA IF NOT EXISTS awvjsa_bak;
DO $$
DECLARE t text;
DECLARE tbls text[] := ARRAY[
  'patient_care_programs','patient_care_plans','awv_members','jsa_members',
  'patient_program_activity','p360_profiles','ccm_billing_periods','pop_group_memberships'
];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS awvjsa_bak.%I AS SELECT * FROM public.%I', t, t);
  END LOOP;
END $$;

-- 1. Dedupe the 5 unique-constraint tables (keep the row on the canonical side).
DELETE FROM public.patient_care_programs x USING (
  SELECT x2.ctid, row_number() OVER (
    PARTITION BY COALESCE((SELECT canonical FROM _merge WHERE old_id=x2.patient_id), x2.patient_id), x2.code
    ORDER BY (x2.status <> 'New') DESC, x2.created_at ASC, x2.ctid) rn
  FROM public.patient_care_programs x2) d
WHERE x.ctid = d.ctid AND d.rn > 1;

DELETE FROM public.patient_care_plans x USING (
  SELECT x2.ctid, row_number() OVER (
    PARTITION BY COALESCE((SELECT canonical FROM _merge WHERE old_id=x2.patient_id), x2.patient_id), x2.program_id
    ORDER BY x2.ctid) rn
  FROM public.patient_care_plans x2) d
WHERE x.ctid = d.ctid AND d.rn > 1;

DELETE FROM public.p360_profiles x USING (
  SELECT x2.ctid, row_number() OVER (
    PARTITION BY COALESCE((SELECT canonical FROM _merge WHERE old_id=x2.patient_id), x2.patient_id)
    ORDER BY x2.ctid) rn
  FROM public.p360_profiles x2) d
WHERE x.ctid = d.ctid AND d.rn > 1;

DELETE FROM public.ccm_billing_periods x USING (
  SELECT x2.ctid, row_number() OVER (
    PARTITION BY COALESCE((SELECT canonical FROM _merge WHERE old_id=x2.patient_id), x2.patient_id), x2.year_month
    ORDER BY x2.ctid) rn
  FROM public.ccm_billing_periods x2) d
WHERE x.ctid = d.ctid AND d.rn > 1;

DELETE FROM public.pop_group_memberships x USING (
  SELECT x2.ctid, row_number() OVER (
    PARTITION BY x2.group_id, COALESCE((SELECT canonical FROM _merge WHERE old_id=x2.patient_id), x2.patient_id)
    ORDER BY x2.ctid) rn
  FROM public.pop_group_memberships x2) d
WHERE x.ctid = d.ctid AND d.rn > 1;

-- 2. Re-key patient_id in every referencing table via the map.
DO $$
DECLARE t text;
DECLARE tbls text[] := ARRAY[
  'appointments','awv_members','call_details','call_sessions','care_plan_audit',
  'care_plan_links','care_plan_shares','ccm_billable_activities','ccm_billing_periods',
  'ccm_billing_reports','ccm_worklist_members','clinical_notes','hcc_activity_log',
  'p360_profiles','patient_care_plan_versions','patient_care_plans','patient_care_programs',
  'patient_clinical_events','patient_medications','patient_program_activity',
  'pop_group_memberships','program_documents','snp_worklist_members','sticky_note_history',
  'sticky_notes','tasks'
];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format(
      'UPDATE public.%I x SET patient_id = m.canonical FROM _merge m '
      'WHERE x.patient_id = m.old_id', t);
  END LOOP;
END $$;

-- 3. Delete care plans orphaned by the program dedupe (program_id no longer exists),
--    for the canonical ids only, plus their GBI.
CREATE TEMP TABLE _orphanplan ON COMMIT DROP AS
  SELECT p.id FROM public.patient_care_plans p
  WHERE p.patient_id IN (SELECT DISTINCT canonical FROM _merge)
    AND NOT EXISTS (SELECT 1 FROM public.patient_care_programs c WHERE c.id = p.program_id);
DELETE FROM public.patient_care_plan_goal_measurements m USING public.patient_care_plan_goals g
  WHERE m.goal_id=g.id AND g.plan_id IN (SELECT id FROM _orphanplan);
DELETE FROM public.patient_care_plan_barrier_goals bg USING public.patient_care_plan_goals g
  WHERE bg.goal_id=g.id AND g.plan_id IN (SELECT id FROM _orphanplan);
DELETE FROM public.patient_care_plan_automations   WHERE plan_id IN (SELECT id FROM _orphanplan);
DELETE FROM public.patient_care_plan_interventions WHERE plan_id IN (SELECT id FROM _orphanplan);
DELETE FROM public.patient_care_plan_barriers      WHERE plan_id IN (SELECT id FROM _orphanplan);
DELETE FROM public.patient_care_plan_goals         WHERE plan_id IN (SELECT id FROM _orphanplan);
DELETE FROM public.patient_care_plan_versions      WHERE plan_id IN (SELECT id FROM _orphanplan);
DELETE FROM public.patient_care_plans              WHERE id     IN (SELECT id FROM _orphanplan);

-- 4. Collapse the JSA worklist rows onto the canonical AWV id
--    (both id and member_id, so the merged patient shows one Fold ID everywhere).
UPDATE public.jsa_members j SET id = m.canonical, member_id = m.canonical FROM _merge m WHERE j.id = m.old_id;

COMMIT;
