-- CIS-CMB10 (Childhood Immunization Status, Combination 10), phase 1.
--
-- WHY
-- The HEDIS drawer now evaluates CIS-CMB10 from the member's
-- patient_immunizations rows (src/features/hedis-worklist/cis/cisRules.js)
-- and shows it in a read-only Immunizations tab. This migration:
--   1. Renames the measure code CISCMG10 to CIS-CMB10 in hedis_members.gaps
--      and on the "CISCMG10 Visit Note" form (name + gap_code), matching the
--      app's MEASURE_NAMES / GAP_TEMPLATES keys.
--   2. Seeds five pediatric HEDIS members (id = member_id, 19301-19305), one
--      per tracker state, each with a CIS-CMB10 gap.
--   3. Seeds their immunization history into patient_immunizations
--      (patient_id = member id, CVX coded, MM/DD/YYYY dates).
--
-- The scenarios are dated against Oct 6, 2026, so the states drift as time
-- passes (an infant "On track" today becomes "Due now" later). That is
-- expected for demo data.
--
-- No schema changes. Idempotent: inserts are guarded by NOT EXISTS /
-- ON CONFLICT DO NOTHING, and the rename finds nothing left on a re-run.
--
-- Ask Alok Kumar to run this migration on Supabase.

BEGIN;

-- ── 1. CISCMG10 -> CIS-CMB10 ───────────────────────────────────────────
UPDATE public.hedis_members h
SET gaps = (
  SELECT jsonb_agg(
    CASE WHEN g->>'code' = 'CISCMG10'
      THEN jsonb_set(g, '{code}', '"CIS-CMB10"')
      ELSE g
    END
  )
  FROM jsonb_array_elements(h.gaps) AS g
)
WHERE h.gaps @> '[{"code":"CISCMG10"}]'::jsonb;

UPDATE public.forms
SET name = 'CIS-CMB10 Visit Note', gap_code = 'CIS-CMB10', updated_at = now()
WHERE (name = 'CISCMG10 Visit Note' OR gap_code = 'CISCMG10')
  AND NOT EXISTS (SELECT 1 FROM public.forms WHERE name = 'CIS-CMB10 Visit Note');

-- ── 2. Pediatric members ───────────────────────────────────────────────
-- 19301 Mateo Alvarez: all 10 vaccines complete (Compliant)
INSERT INTO public.hedis_members (id, initials, name, gender, age, member_id, language, gaps, assignee, assignee_initials, start_date, adv_illness, frailty, risk_level, tasks, outreach_dots, outreach_date, member_status, phone, dob, ipa, hp_code, zip, city, state)
SELECT '19301', 'MA', 'Mateo Alvarez', 'M', '22m', '19301', 'en',
  '[{"code":"CIS-CMB10","status":"Open","startDate":"09/01/2026"}]'::jsonb,
  NULL, NULL, '09/01/2026', 0, 0, NULL, NULL, '["pending","pending","pending"]'::jsonb, NULL, 'Active', '(555) 301-9301', '11/20/2024', 'Astrana', 'HP-001', '90012', 'Los Angeles', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM public.hedis_members WHERE id = '19301');

-- 19302 Ava Thompson: 2nd influenza dose overdue, 70 days to 2nd birthday (At risk)
INSERT INTO public.hedis_members (id, initials, name, gender, age, member_id, language, gaps, assignee, assignee_initials, start_date, adv_illness, frailty, risk_level, tasks, outreach_dots, outreach_date, member_status, phone, dob, ipa, hp_code, zip, city, state)
SELECT '19302', 'AT', 'Ava Thompson', 'F', '21m', '19302', 'en',
  '[{"code":"CIS-CMB10","status":"Open","startDate":"09/01/2026"}]'::jsonb,
  NULL, NULL, '09/01/2026', 0, 0, NULL, NULL, '["pending","pending","pending"]'::jsonb, NULL, 'Active', '(555) 301-9302', '12/15/2024', 'Astrana', 'HP-001', '90012', 'Los Angeles', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM public.hedis_members WHERE id = '19302');

-- 19303 Liam Nguyen: 1 of 4 PCV doses, 3 remaining cannot fit before 11/05/2026 (Can't be met)
INSERT INTO public.hedis_members (id, initials, name, gender, age, member_id, language, gaps, assignee, assignee_initials, start_date, adv_illness, frailty, risk_level, tasks, outreach_dots, outreach_date, member_status, phone, dob, ipa, hp_code, zip, city, state)
SELECT '19303', 'LN', 'Liam Nguyen', 'M', '23m', '19303', 'en',
  '[{"code":"CIS-CMB10","status":"Open","startDate":"09/01/2026"}]'::jsonb,
  NULL, NULL, '09/01/2026', 0, 0, NULL, NULL, '["pending","pending","pending"]'::jsonb, NULL, 'Active', '(555) 301-9303', '11/05/2024', 'Astrana', 'HP-001', '90012', 'Los Angeles', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM public.hedis_members WHERE id = '19303');

-- 19304 Sofia Ramirez: 2- and 4-month visits done, measured in MY 2028 (On track)
INSERT INTO public.hedis_members (id, initials, name, gender, age, member_id, language, gaps, assignee, assignee_initials, start_date, adv_illness, frailty, risk_level, tasks, outreach_dots, outreach_date, member_status, phone, dob, ipa, hp_code, zip, city, state)
SELECT '19304', 'SR', 'Sofia Ramirez', 'F', '5m', '19304', 'en',
  '[{"code":"CIS-CMB10","status":"Open","startDate":"09/01/2026"}]'::jsonb,
  NULL, NULL, '09/01/2026', 0, 0, NULL, NULL, '["pending","pending","pending"]'::jsonb, NULL, 'Active', '(555) 301-9304', '04/10/2026', 'Astrana', 'HP-001', '90012', 'Los Angeles', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM public.hedis_members WHERE id = '19304');

-- 19305 Noah Patel: Hep B birth dose only, measured in MY 2028 (On track)
INSERT INTO public.hedis_members (id, initials, name, gender, age, member_id, language, gaps, assignee, assignee_initials, start_date, adv_illness, frailty, risk_level, tasks, outreach_dots, outreach_date, member_status, phone, dob, ipa, hp_code, zip, city, state)
SELECT '19305', 'NP', 'Noah Patel', 'M', '1m', '19305', 'en',
  '[{"code":"CIS-CMB10","status":"Open","startDate":"09/01/2026"}]'::jsonb,
  NULL, NULL, '09/01/2026', 0, 0, NULL, NULL, '["pending","pending","pending"]'::jsonb, NULL, 'Active', '(555) 301-9305', '08/25/2026', 'Astrana', 'HP-001', '90012', 'Los Angeles', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM public.hedis_members WHERE id = '19305');

-- ── 3. Immunization history ────────────────────────────────────────────
INSERT INTO public.patient_immunizations
  (id, patient_id, title, code, code_system, date_administered, dose_quantity, dose_units, status, sort_order)
VALUES
  ('pi-cis-19301-01', '19301', 'Hep B (pediatric)', '08', 'http://hl7.org/fhir/sid/cvx', '11/20/2024', '0.5', 'ml', 'Completed', 1),
  ('pi-cis-19301-02', '19301', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '01/20/2025', '0.5', 'ml', 'Completed', 2),
  ('pi-cis-19301-03', '19301', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '01/20/2025', '0.5', 'ml', 'Completed', 3),
  ('pi-cis-19301-04', '19301', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '01/20/2025', '0.5', 'ml', 'Completed', 4),
  ('pi-cis-19301-05', '19301', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '01/20/2025', '0.5', 'ml', 'Completed', 5),
  ('pi-cis-19301-06', '19301', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '03/20/2025', '0.5', 'ml', 'Completed', 6),
  ('pi-cis-19301-07', '19301', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '03/20/2025', '0.5', 'ml', 'Completed', 7),
  ('pi-cis-19301-08', '19301', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '03/20/2025', '0.5', 'ml', 'Completed', 8),
  ('pi-cis-19301-09', '19301', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '03/20/2025', '0.5', 'ml', 'Completed', 9),
  ('pi-cis-19301-10', '19301', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '05/20/2025', '0.5', 'ml', 'Completed', 10),
  ('pi-cis-19301-11', '19301', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '05/20/2025', '0.5', 'ml', 'Completed', 11),
  ('pi-cis-19301-12', '19301', 'Influenza, pediatric', '140', 'http://hl7.org/fhir/sid/cvx', '05/20/2025', '0.5', 'ml', 'Completed', 12),
  ('pi-cis-19301-13', '19301', 'Influenza, pediatric', '140', 'http://hl7.org/fhir/sid/cvx', '06/20/2025', '0.5', 'ml', 'Completed', 13),
  ('pi-cis-19301-14', '19301', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '11/20/2025', '0.5', 'ml', 'Completed', 14),
  ('pi-cis-19301-15', '19301', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '11/20/2025', '0.5', 'ml', 'Completed', 15),
  ('pi-cis-19301-16', '19301', 'MMR', '03', 'http://hl7.org/fhir/sid/cvx', '11/20/2025', '0.5', 'ml', 'Completed', 16),
  ('pi-cis-19301-17', '19301', 'Varicella', '21', 'http://hl7.org/fhir/sid/cvx', '11/20/2025', '0.5', 'ml', 'Completed', 17),
  ('pi-cis-19301-18', '19301', 'Hep A (pediatric)', '83', 'http://hl7.org/fhir/sid/cvx', '11/20/2025', '0.5', 'ml', 'Completed', 18),
  ('pi-cis-19301-19', '19301', 'DTaP', '20', 'http://hl7.org/fhir/sid/cvx', '02/20/2026', '0.5', 'ml', 'Completed', 19),
  ('pi-cis-19302-01', '19302', 'Hep B (pediatric)', '08', 'http://hl7.org/fhir/sid/cvx', '12/15/2024', '0.5', 'ml', 'Completed', 1),
  ('pi-cis-19302-02', '19302', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '02/15/2025', '0.5', 'ml', 'Completed', 2),
  ('pi-cis-19302-03', '19302', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '02/15/2025', '0.5', 'ml', 'Completed', 3),
  ('pi-cis-19302-04', '19302', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '02/15/2025', '0.5', 'ml', 'Completed', 4),
  ('pi-cis-19302-05', '19302', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '02/15/2025', '0.5', 'ml', 'Completed', 5),
  ('pi-cis-19302-06', '19302', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '04/15/2025', '0.5', 'ml', 'Completed', 6),
  ('pi-cis-19302-07', '19302', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '04/15/2025', '0.5', 'ml', 'Completed', 7),
  ('pi-cis-19302-08', '19302', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '04/15/2025', '0.5', 'ml', 'Completed', 8),
  ('pi-cis-19302-09', '19302', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '04/15/2025', '0.5', 'ml', 'Completed', 9),
  ('pi-cis-19302-10', '19302', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '06/15/2025', '0.5', 'ml', 'Completed', 10),
  ('pi-cis-19302-11', '19302', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '06/15/2025', '0.5', 'ml', 'Completed', 11),
  ('pi-cis-19302-12', '19302', 'Influenza, pediatric', '140', 'http://hl7.org/fhir/sid/cvx', '06/15/2025', '0.5', 'ml', 'Completed', 12),
  ('pi-cis-19302-13', '19302', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '12/15/2025', '0.5', 'ml', 'Completed', 13),
  ('pi-cis-19302-14', '19302', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '12/15/2025', '0.5', 'ml', 'Completed', 14),
  ('pi-cis-19302-15', '19302', 'MMR', '03', 'http://hl7.org/fhir/sid/cvx', '12/15/2025', '0.5', 'ml', 'Completed', 15),
  ('pi-cis-19302-16', '19302', 'Varicella', '21', 'http://hl7.org/fhir/sid/cvx', '12/15/2025', '0.5', 'ml', 'Completed', 16),
  ('pi-cis-19302-17', '19302', 'Hep A (pediatric)', '83', 'http://hl7.org/fhir/sid/cvx', '12/15/2025', '0.5', 'ml', 'Completed', 17),
  ('pi-cis-19302-18', '19302', 'DTaP', '20', 'http://hl7.org/fhir/sid/cvx', '03/15/2026', '0.5', 'ml', 'Completed', 18),
  ('pi-cis-19303-01', '19303', 'Hep B (pediatric)', '08', 'http://hl7.org/fhir/sid/cvx', '11/05/2024', '0.5', 'ml', 'Completed', 1),
  ('pi-cis-19303-02', '19303', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '01/05/2025', '0.5', 'ml', 'Completed', 2),
  ('pi-cis-19303-03', '19303', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '01/05/2025', '0.5', 'ml', 'Completed', 3),
  ('pi-cis-19303-04', '19303', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '01/05/2025', '0.5', 'ml', 'Completed', 4),
  ('pi-cis-19303-05', '19303', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '01/05/2025', '0.5', 'ml', 'Completed', 5),
  ('pi-cis-19303-06', '19303', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '03/05/2025', '0.5', 'ml', 'Completed', 6),
  ('pi-cis-19303-07', '19303', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '03/05/2025', '0.5', 'ml', 'Completed', 7),
  ('pi-cis-19303-08', '19303', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '03/05/2025', '0.5', 'ml', 'Completed', 8),
  ('pi-cis-19303-09', '19303', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '05/05/2025', '0.5', 'ml', 'Completed', 9),
  ('pi-cis-19303-10', '19303', 'Influenza, pediatric', '140', 'http://hl7.org/fhir/sid/cvx', '05/05/2025', '0.5', 'ml', 'Completed', 10),
  ('pi-cis-19303-11', '19303', 'Influenza, pediatric', '140', 'http://hl7.org/fhir/sid/cvx', '06/05/2025', '0.5', 'ml', 'Completed', 11),
  ('pi-cis-19303-12', '19303', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '11/05/2025', '0.5', 'ml', 'Completed', 12),
  ('pi-cis-19303-13', '19303', 'MMR', '03', 'http://hl7.org/fhir/sid/cvx', '11/05/2025', '0.5', 'ml', 'Completed', 13),
  ('pi-cis-19303-14', '19303', 'Varicella', '21', 'http://hl7.org/fhir/sid/cvx', '11/05/2025', '0.5', 'ml', 'Completed', 14),
  ('pi-cis-19303-15', '19303', 'Hep A (pediatric)', '83', 'http://hl7.org/fhir/sid/cvx', '11/05/2025', '0.5', 'ml', 'Completed', 15),
  ('pi-cis-19303-16', '19303', 'DTaP', '20', 'http://hl7.org/fhir/sid/cvx', '02/05/2026', '0.5', 'ml', 'Completed', 16),
  ('pi-cis-19304-01', '19304', 'Hep B (pediatric)', '08', 'http://hl7.org/fhir/sid/cvx', '04/10/2026', '0.5', 'ml', 'Completed', 1),
  ('pi-cis-19304-02', '19304', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '06/10/2026', '0.5', 'ml', 'Completed', 2),
  ('pi-cis-19304-03', '19304', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '06/10/2026', '0.5', 'ml', 'Completed', 3),
  ('pi-cis-19304-04', '19304', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '06/10/2026', '0.5', 'ml', 'Completed', 4),
  ('pi-cis-19304-05', '19304', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '06/10/2026', '0.5', 'ml', 'Completed', 5),
  ('pi-cis-19304-06', '19304', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '08/10/2026', '0.5', 'ml', 'Completed', 6),
  ('pi-cis-19304-07', '19304', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '08/10/2026', '0.5', 'ml', 'Completed', 7),
  ('pi-cis-19304-08', '19304', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '08/10/2026', '0.5', 'ml', 'Completed', 8),
  ('pi-cis-19304-09', '19304', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '08/10/2026', '0.5', 'ml', 'Completed', 9),
  ('pi-cis-19305-01', '19305', 'Hep B (pediatric)', '08', 'http://hl7.org/fhir/sid/cvx', '08/25/2026', '0.5', 'ml', 'Completed', 1)
ON CONFLICT (id) DO NOTHING;

COMMIT;
