-- Merge the 4 "Annette Brave" identities into one patient, keeping the SNP
-- sample care plan.
--
-- After the member_id re-identification, "Annette Brave" existed as 4 separate
-- patients: 11089 (patients / TOC IP), 10039 & 10003 (two SNP rows), 10045 (CCM).
-- They are actually one person. This collapses them onto the central patient
-- 11089, so she appears once per worklist (SNP, CCM, TOC IP) with the care
-- programs of all of them, and her SNP sample care plan (seed plan
-- 8d30c3c8, program pcp-snpw-001-SNP-1) is what shows on her SNP program.
--
-- Her clinical data (notes, meds, appts, p360, tasks) is already all under
-- 11089; only care programs/plans, the worklist rows, and program-activity rows
-- reference the other ids.

BEGIN;
SET LOCAL session_replication_role = replica;

-- 0. Snapshot the tables this touches (idempotent; keeps the first snapshot).
CREATE SCHEMA IF NOT EXISTS annette_bak;
DO $$
DECLARE t text;
DECLARE tbls text[] := ARRAY[
  'patient_care_programs','patient_care_plans','patient_care_plan_goals',
  'patient_care_plan_interventions','patient_care_plan_barriers',
  'patient_care_plan_automations','patient_care_plan_versions',
  'snp_worklist_members','ccm_worklist_members','patient_program_activity'
];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS annette_bak.%I AS SELECT * FROM public.%I', t, t);
  END LOOP;
END $$;

-- 1. Delete the 3 redundant SNP care plans (their GBI first) and their programs.
--    Plans: 4d9329e1 (pcp-p3-SNP), 41469191 (pcp-10003-SNP-1), b1996a7a (pcp-snpw-006-SNP-1).
--    This removes 11089's own SNP program so the sample can take its place.
DELETE FROM public.patient_care_plan_goal_measurements m USING public.patient_care_plan_goals g
  WHERE m.goal_id = g.id AND g.plan_id IN
    ('4d9329e1-7ed1-4975-b60c-e1856e66709f','41469191-5efa-4c85-86c6-7e4071abd953','b1996a7a-bab7-4216-9ce8-eae0bfe3859c');
DELETE FROM public.patient_care_plan_barrier_goals bg USING public.patient_care_plan_goals g
  WHERE bg.goal_id = g.id AND g.plan_id IN
    ('4d9329e1-7ed1-4975-b60c-e1856e66709f','41469191-5efa-4c85-86c6-7e4071abd953','b1996a7a-bab7-4216-9ce8-eae0bfe3859c');
DELETE FROM public.patient_care_plan_automations WHERE plan_id IN
    ('4d9329e1-7ed1-4975-b60c-e1856e66709f','41469191-5efa-4c85-86c6-7e4071abd953','b1996a7a-bab7-4216-9ce8-eae0bfe3859c');
DELETE FROM public.patient_care_plan_interventions WHERE plan_id IN
    ('4d9329e1-7ed1-4975-b60c-e1856e66709f','41469191-5efa-4c85-86c6-7e4071abd953','b1996a7a-bab7-4216-9ce8-eae0bfe3859c');
DELETE FROM public.patient_care_plan_barriers WHERE plan_id IN
    ('4d9329e1-7ed1-4975-b60c-e1856e66709f','41469191-5efa-4c85-86c6-7e4071abd953','b1996a7a-bab7-4216-9ce8-eae0bfe3859c');
DELETE FROM public.patient_care_plan_goals WHERE plan_id IN
    ('4d9329e1-7ed1-4975-b60c-e1856e66709f','41469191-5efa-4c85-86c6-7e4071abd953','b1996a7a-bab7-4216-9ce8-eae0bfe3859c');
DELETE FROM public.patient_care_plan_versions WHERE plan_id IN
    ('4d9329e1-7ed1-4975-b60c-e1856e66709f','41469191-5efa-4c85-86c6-7e4071abd953','b1996a7a-bab7-4216-9ce8-eae0bfe3859c');
DELETE FROM public.patient_care_plans WHERE id IN
    ('4d9329e1-7ed1-4975-b60c-e1856e66709f','41469191-5efa-4c85-86c6-7e4071abd953','b1996a7a-bab7-4216-9ce8-eae0bfe3859c');
DELETE FROM public.patient_care_programs WHERE id IN ('pcp-p3-SNP','pcp-10003-SNP-1','pcp-snpw-006-SNP-1');

-- 2. Keep the sample: move its SNP program + plan onto the canonical patient
--    (safe now that 11089 no longer holds an SNP program).
UPDATE public.patient_care_programs SET patient_id = '11089' WHERE id = 'pcp-snpw-001-SNP-1';
UPDATE public.patient_care_plans    SET patient_id = '11089' WHERE id = '8d30c3c8-519a-4167-955f-d264f4564937';

-- 3. CCM: keep the canonical patient's CCM program, drop the duplicate under 10045.
DELETE FROM public.patient_care_programs WHERE patient_id = '10045' AND code = 'CCM';

-- 4. Re-key remaining references to the canonical id.
UPDATE public.patient_program_activity SET patient_id = '11089' WHERE patient_id IN ('10039','10003','10045');

-- 5. Merge the worklist rows so Annette appears once per worklist under 11089.
UPDATE public.snp_worklist_members SET id = '11089', member_id = '11089' WHERE id = '10039';
DELETE FROM public.snp_worklist_members WHERE id = '10003';
UPDATE public.ccm_worklist_members SET id = '11089', member_id = '11089' WHERE id = '10045';

COMMIT;
