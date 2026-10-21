-- Demo: pediatric HEDIS members with two open gaps, CIS-CMB10 and WCV
-- (Child and Adolescent Well-Care Visits).
--
-- WHY
-- The worklist and care gap drawer had no member carrying more than one
-- gap alongside CIS-CMB10. These rows show a multi-gap pediatric member.
-- Note: WCV's HEDIS denominator is ages 3-21, so pairing it with a child
-- under 2 is demo-only, not a clinically valid combination.
--
-- Seeds three members (id = member_id, 19306-19308) with both gaps, plus
-- their immunization history in patient_immunizations so the Vaccine
-- Calendar has a real state for each. Dated against Oct 14, 2026.
--
-- No schema changes. Idempotent: NOT EXISTS / ON CONFLICT DO NOTHING.
--
-- Ask Alok Kumar to run this seed on Supabase.

BEGIN;

-- ── 1. Members ─────────────────────────────────────────────────────────
-- 19306 Isabella Cruz: 2-, 4- and 6-month visits done; no 12-month vaccines yet (On track, 18 of 24 doses, 5 due now)
INSERT INTO public.hedis_members (id, initials, name, gender, age, member_id, language, gaps, assignee, assignee_initials, start_date, adv_illness, frailty, risk_level, tasks, outreach_dots, outreach_date, member_status, phone, dob, ipa, hp_code, zip, city, state)
SELECT '19306', 'IC', 'Isabella Cruz', 'F', '14m', '19306', 'en',
  '[{"code":"CIS-CMB10","status":"Open","startDate":"09/01/2026"},{"code":"WCV","status":"Open","startDate":"09/01/2026"}]'::jsonb,
  NULL, NULL, '09/01/2026', 0, 0, NULL, NULL, '["pending","pending","pending"]'::jsonb, NULL, 'Active', '(555) 301-9306', '08/10/2025', 'Astrana', 'HP-001', '90012', 'Los Angeles', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM public.hedis_members WHERE id = '19306');

-- 19307 Ethan Brooks: 2- and 4-month visits done; missed the 6-month visit (At risk, 4 doses overdue)
INSERT INTO public.hedis_members (id, initials, name, gender, age, member_id, language, gaps, assignee, assignee_initials, start_date, adv_illness, frailty, risk_level, tasks, outreach_dots, outreach_date, member_status, phone, dob, ipa, hp_code, zip, city, state)
SELECT '19307', 'EB', 'Ethan Brooks', 'M', '9m', '19307', 'en',
  '[{"code":"CIS-CMB10","status":"Open","startDate":"09/01/2026"},{"code":"WCV","status":"Open","startDate":"09/01/2026"}]'::jsonb,
  NULL, NULL, '09/01/2026', 0, 0, NULL, NULL, '["pending","pending","pending"]'::jsonb, NULL, 'Active', '(555) 301-9307', '01/12/2026', 'Astrana', 'HP-001', '90012', 'Los Angeles', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM public.hedis_members WHERE id = '19307');

-- 19308 Zoe Kim: nearly complete; 2nd influenza and 4th DTaP still needed (At risk, 22 of 24 doses, 2 overdue)
INSERT INTO public.hedis_members (id, initials, name, gender, age, member_id, language, gaps, assignee, assignee_initials, start_date, adv_illness, frailty, risk_level, tasks, outreach_dots, outreach_date, member_status, phone, dob, ipa, hp_code, zip, city, state)
SELECT '19308', 'ZK', 'Zoe Kim', 'F', '19m', '19308', 'en',
  '[{"code":"CIS-CMB10","status":"Open","startDate":"09/01/2026"},{"code":"WCV","status":"Open","startDate":"09/01/2026"}]'::jsonb,
  NULL, NULL, '09/01/2026', 0, 0, NULL, NULL, '["pending","pending","pending"]'::jsonb, NULL, 'Active', '(555) 301-9308', '03/02/2025', 'Astrana', 'HP-001', '90012', 'Los Angeles', 'CA'
WHERE NOT EXISTS (SELECT 1 FROM public.hedis_members WHERE id = '19308');

-- ── 2. Immunization history ────────────────────────────────────────────
INSERT INTO public.patient_immunizations
  (id, patient_id, title, code, code_system, date_administered, dose_quantity, dose_units, status, sort_order)
VALUES
  ('pi-cis-19306-01', '19306', 'Hep B (pediatric)', '08', 'http://hl7.org/fhir/sid/cvx', '08/10/2025', '0.5', 'ml', 'Completed', 1),
  ('pi-cis-19306-02', '19306', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '10/10/2025', '0.5', 'ml', 'Completed', 2),
  ('pi-cis-19306-03', '19306', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '10/10/2025', '0.5', 'ml', 'Completed', 3),
  ('pi-cis-19306-04', '19306', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '10/10/2025', '0.5', 'ml', 'Completed', 4),
  ('pi-cis-19306-05', '19306', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '10/10/2025', '0.5', 'ml', 'Completed', 5),
  ('pi-cis-19306-06', '19306', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '12/10/2025', '0.5', 'ml', 'Completed', 6),
  ('pi-cis-19306-07', '19306', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '12/10/2025', '0.5', 'ml', 'Completed', 7),
  ('pi-cis-19306-08', '19306', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '12/10/2025', '0.5', 'ml', 'Completed', 8),
  ('pi-cis-19306-09', '19306', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '12/10/2025', '0.5', 'ml', 'Completed', 9),
  ('pi-cis-19306-10', '19306', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '02/10/2026', '0.5', 'ml', 'Completed', 10),
  ('pi-cis-19306-11', '19306', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '02/10/2026', '0.5', 'ml', 'Completed', 11),
  ('pi-cis-19306-12', '19306', 'Influenza, pediatric', '140', 'http://hl7.org/fhir/sid/cvx', '02/10/2026', '0.5', 'ml', 'Completed', 12),
  ('pi-cis-19306-13', '19306', 'Influenza, pediatric', '140', 'http://hl7.org/fhir/sid/cvx', '03/10/2026', '0.5', 'ml', 'Completed', 13),
  ('pi-cis-19307-01', '19307', 'Hep B (pediatric)', '08', 'http://hl7.org/fhir/sid/cvx', '01/12/2026', '0.5', 'ml', 'Completed', 1),
  ('pi-cis-19307-02', '19307', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '03/12/2026', '0.5', 'ml', 'Completed', 2),
  ('pi-cis-19307-03', '19307', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '03/12/2026', '0.5', 'ml', 'Completed', 3),
  ('pi-cis-19307-04', '19307', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '03/12/2026', '0.5', 'ml', 'Completed', 4),
  ('pi-cis-19307-05', '19307', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '03/12/2026', '0.5', 'ml', 'Completed', 5),
  ('pi-cis-19307-06', '19307', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '05/12/2026', '0.5', 'ml', 'Completed', 6),
  ('pi-cis-19307-07', '19307', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '05/12/2026', '0.5', 'ml', 'Completed', 7),
  ('pi-cis-19307-08', '19307', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '05/12/2026', '0.5', 'ml', 'Completed', 8),
  ('pi-cis-19307-09', '19307', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '05/12/2026', '0.5', 'ml', 'Completed', 9),
  ('pi-cis-19308-01', '19308', 'Hep B (pediatric)', '08', 'http://hl7.org/fhir/sid/cvx', '03/02/2025', '0.5', 'ml', 'Completed', 1),
  ('pi-cis-19308-02', '19308', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '05/02/2025', '0.5', 'ml', 'Completed', 2),
  ('pi-cis-19308-03', '19308', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '05/02/2025', '0.5', 'ml', 'Completed', 3),
  ('pi-cis-19308-04', '19308', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '05/02/2025', '0.5', 'ml', 'Completed', 4),
  ('pi-cis-19308-05', '19308', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '05/02/2025', '0.5', 'ml', 'Completed', 5),
  ('pi-cis-19308-06', '19308', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '07/02/2025', '0.5', 'ml', 'Completed', 6),
  ('pi-cis-19308-07', '19308', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '07/02/2025', '0.5', 'ml', 'Completed', 7),
  ('pi-cis-19308-08', '19308', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '07/02/2025', '0.5', 'ml', 'Completed', 8),
  ('pi-cis-19308-09', '19308', 'Rotarix (RV1)', '119', 'http://hl7.org/fhir/sid/cvx', '07/02/2025', '0.5', 'ml', 'Completed', 9),
  ('pi-cis-19308-10', '19308', 'Pediarix (DTaP-HepB-IPV)', '110', 'http://hl7.org/fhir/sid/cvx', '09/02/2025', '0.5', 'ml', 'Completed', 10),
  ('pi-cis-19308-11', '19308', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '09/02/2025', '0.5', 'ml', 'Completed', 11),
  ('pi-cis-19308-12', '19308', 'Influenza, pediatric', '140', 'http://hl7.org/fhir/sid/cvx', '09/02/2025', '0.5', 'ml', 'Completed', 12),
  ('pi-cis-19308-13', '19308', 'ActHIB (Hib PRP-T)', '48', 'http://hl7.org/fhir/sid/cvx', '03/02/2026', '0.5', 'ml', 'Completed', 13),
  ('pi-cis-19308-14', '19308', 'PCV20 (Prevnar 20)', '216', 'http://hl7.org/fhir/sid/cvx', '03/02/2026', '0.5', 'ml', 'Completed', 14),
  ('pi-cis-19308-15', '19308', 'MMR', '03', 'http://hl7.org/fhir/sid/cvx', '03/02/2026', '0.5', 'ml', 'Completed', 15),
  ('pi-cis-19308-16', '19308', 'Varicella', '21', 'http://hl7.org/fhir/sid/cvx', '03/02/2026', '0.5', 'ml', 'Completed', 16),
  ('pi-cis-19308-17', '19308', 'Hep A (pediatric)', '83', 'http://hl7.org/fhir/sid/cvx', '03/02/2026', '0.5', 'ml', 'Completed', 17),
  ('pi-cis-19308-18', '19308', 'Hep A (pediatric)', '83', 'http://hl7.org/fhir/sid/cvx', '09/02/2026', '0.5', 'ml', 'Completed', 18)
ON CONFLICT (id) DO NOTHING;

COMMIT;
