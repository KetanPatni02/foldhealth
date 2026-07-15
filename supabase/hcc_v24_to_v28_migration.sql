-- ============================================================
-- HCC label migration: CMS V24 → V28
--
-- The app now displays V28 chip labels ("(V28)") — but the seed
-- data in hcc_migration.sql was authored under V24 (HCC 18/85/96).
-- A coder loading a member card would see V24 labels next to a
-- V28 badge, which is exactly the kind of inconsistency a health-
-- plan reviewer flags as "not clinically credible."
--
-- Migration rules (ICD ranges determine the V28 target — CHF splits
-- by acuity, so we drive it off the ICD code rather than the old
-- HCC number):
--
--   HCC 18  → HCC 37   (Diabetes with Chronic Complications)
--   HCC 85 + I50.23 → HCC 224 (Acute on Chronic Heart Failure)
--   HCC 85 + I50.9  → HCC 226 (Heart Failure, Except End-Stage)
--   HCC 85 (other)  → HCC 226 (Heart Failure, Except End-Stage)
--   HCC 96  → HCC 238  (Cardiac Arrhythmias and Heart Block)
--
-- Idempotent: safe to re-run — WHERE clauses only match V24 labels.
-- ============================================================

UPDATE hcc_diagnosis_gaps
   SET hcc_category = 'HCC 37 - Diabetes with Chronic Complications'
 WHERE hcc_category = 'HCC 18 - Diabetes w/ Complications';

UPDATE hcc_diagnosis_gaps
   SET hcc_category = 'HCC 224 - Acute on Chronic Heart Failure'
 WHERE hcc_category = 'HCC 85 - Congestive Heart Failure'
   AND code = 'I50.23';

UPDATE hcc_diagnosis_gaps
   SET hcc_category = 'HCC 226 - Heart Failure, Except End-Stage'
 WHERE hcc_category = 'HCC 85 - Congestive Heart Failure';

UPDATE hcc_diagnosis_gaps
   SET hcc_category = 'HCC 238 - Cardiac Arrhythmias and Heart Block'
 WHERE hcc_category = 'HCC 96 - Atrial Fibrillation';

-- Verification queries (run manually after applying):
--   SELECT hcc_category, count(*) FROM hcc_diagnosis_gaps
--    WHERE hcc_category LIKE 'HCC 18%' OR hcc_category LIKE 'HCC 85%' OR hcc_category LIKE 'HCC 96%';
--   -- Expected: 0 rows.
