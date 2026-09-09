-- Merge the remaining same-person duplicate identities (the snp-row + patients-row
-- splits, same pattern as Annette Brave) onto their central patients id. None of
-- these carry care-plan content, so the merge only re-keys references, dedupes
-- programs, and collapses the worklist rows. Canonical = the patients member_id.
--
--   Diana Welch     10014 -> 10985
--   Elena Garcia    10020 -> 11053
--   Helen Jackson   10032 -> 11045
--   James Rivera    10015 -> 11039
--   Lisa Brown      10026 -> 11145
--   Maria Lopez     10018 -> 11119
--   Ralph Halvorson 11195 -> 11020
--   William Davis   10029, M-JSA-1003 -> 11143
--
-- The AWV<->JSA same-name pairs are intentionally NOT merged (different worklists
-- and id schemes; same-person unproven).

BEGIN;
SET LOCAL session_replication_role = replica;

CREATE TEMP TABLE _merge(old_id text PRIMARY KEY, canonical text) ON COMMIT DROP;
INSERT INTO _merge(old_id, canonical) VALUES
  ('10014','10985'),('10020','11053'),('10032','11045'),('10015','11039'),
  ('10026','11145'),('10018','11119'),('11195','11020'),
  ('10029','11143'),('M-JSA-1003','11143');

-- Snapshot the tables this touches (idempotent).
CREATE SCHEMA IF NOT EXISTS dupmerge_bak;
DO $$
DECLARE t text;
DECLARE tbls text[] := ARRAY[
  'patient_care_programs','patient_care_plans','snp_worklist_members','jsa_members',
  'patient_program_activity','p360_profiles','ccm_billing_periods','pop_group_memberships'
];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS dupmerge_bak.%I AS SELECT * FROM public.%I', t, t);
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

-- 4. Collapse the worklist rows: the merged snp/jsa rows take the canonical id
--    (both id and member_id, so the merged patient shows one Fold ID everywhere).
UPDATE public.snp_worklist_members s SET id = m.canonical, member_id = m.canonical FROM _merge m WHERE s.id = m.old_id;
UPDATE public.jsa_members         j SET id = m.canonical, member_id = m.canonical FROM _merge m WHERE j.id = m.old_id;

COMMIT;
