-- ══════════════════════════════════════════════════════════════════════════════
-- HCC batch-2 seed — 18 new patients (hcc-34 … hcc-51) + their ICD gaps
-- ══════════════════════════════════════════════════════════════════════════════
-- Brings the worklist to 50 patients. Every patient in this batch has
-- exactly ONE DOS (per product spec — batch 1 patients kept multi-DOS
-- histories, batch 2 covers single-visit records). ICD sets are grouped
-- into ~5 clinical archetypes so a coder looking at these rows sees
-- realistic comorbidity patterns rather than random codes.
--
-- Idempotent-ish: keyed on hcc-34…hcc-51 ids and (member_name, code)
-- pairs. Re-running would fail on the unique index we added in
-- hcc_diag_kind_migration; run once.
--
-- Archetypes:
--   • Diabetic complications  — E11.22 / E11.65 / N18.3 / G62.9
--   • Heart failure           — I50.9 / I50.23 / I48.91 / I10
--   • COPD                    — J44.1 / J45.50 / F17.210 / Z87.891
--   • Cancer follow-up        — C50.911 / Z85.3 / D64.9 / Z79.899
--   • Behavioral / obesity    — F32.1 / F33.1 / E66.01 / G47.33
-- ══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── hcc-34 · Robert Nakamura · Diabetic complications ────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-34', 'M-1601-3712', 'Robert Nakamura', 'RN', 'M', '71y 2m',
  1, 1, '[{"date":"03/12/2026","label":"Due in 5 Days","labelColor":"var(--status-warning)"}]'::jsonb,
  2, '["pending","pending"]'::jsonb, 6,
  '02/28/2026', 'Due in 5D', 'var(--status-warning)',
  'A. Beauchamp', 'In Progress', NULL, 'Assign',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Nadia Farooq', 'Walk-in', '3.412', '0.245', true,
  'ACP', 'Scan', 'Dr. Ravi K.', '8', 'HCC', 'High',
  '4', '3', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Robert Nakamura', 'E11.22', 'Type 2 diabetes mellitus with diabetic chronic kidney disease', 'HCC 37 - Diabetes with Chronic Complications', 'New', NULL, 'Associated', 2, 0, 0, 0.302, '03/12/2026', 'A. Beauchamp (Support Team)', true),
  ('Robert Nakamura', 'N18.3', 'Chronic kidney disease, stage 3', 'HCC 329 - Chronic Kidney Disease, Stage 3', 'New', NULL, 'Associated', 1, 0, 0, 0.127, '03/12/2026', 'A. Beauchamp (Support Team)', true),
  ('Robert Nakamura', 'G62.9', 'Polyneuropathy, unspecified', 'HCC Not Linked', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.000, '03/12/2026', 'A. Beauchamp (Support Team)', true),
  ('Robert Nakamura', 'I10',    'Essential (primary) hypertension', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '03/12/2026', 'A. Beauchamp (Support Team)', true);

-- ─── hcc-35 · Elena Vasquez · CKD stage 4 + HTN ───────────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-35', 'M-1624-3751', 'Elena Vasquez', 'EV', 'F', '68y 7m',
  1, 1, '[{"date":"04/02/2026","label":"Due in 2 weeks","labelColor":"var(--neutral-200)"}]'::jsonb,
  3, '["passed","passed","pending"]'::jsonb, 5,
  '03/15/2026', 'Due in 2w', 'var(--neutral-200)',
  'M. Thompson', 'Completed', 'Deborah Hintz', 'In Progress',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Elena Vasquez', 'Telehealth', '3.980', '0.312', true,
  'IPA-1', 'Lab', 'Dr. Sandra K.', '9', 'HCC', 'High',
  '5', '3', 'es'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Elena Vasquez', 'N18.4', 'Chronic kidney disease, stage 4 (severe)', 'HCC 328 - Chronic Kidney Disease, Stage 4', 'Accepted', NULL, 'Associated', 3, 1, 1, 0.237, '04/02/2026', 'Deborah Hintz (Coder)', true),
  ('Elena Vasquez', 'I12.0', 'Hypertensive chronic kidney disease with stage 5 CKD or ESRD', 'HCC 226 - Heart Failure, Except End-Stage', 'New', NULL, 'Associated', 2, 0, 0, 0.302, '04/02/2026', 'M. Thompson (Support Team)', true),
  ('Elena Vasquez', 'E11.65', 'Type 2 diabetes mellitus with hyperglycemia', 'HCC 38 - Diabetes with Glycemic Complications', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.166, '04/02/2026', 'Deborah Hintz (Coder)', true),
  ('Elena Vasquez', 'D63.1', 'Anemia in chronic kidney disease', 'HCC Not Linked', 'New', 'Recapture', 'Recapture', 1, 0, 0, 0.000, '04/02/2026', 'Deborah Hintz (Coder)', false);

-- ─── hcc-36 · Marcus Whitfield · Heart failure ────────────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-36', 'M-1647-3785', 'Marcus Whitfield', 'MW', 'M', '74y 4m',
  1, 1, '[{"date":"01/22/2026","label":"Overdue by 8 Days","labelColor":"var(--status-error)"}]'::jsonb,
  4, '["passed","passed","passed","pending"]'::jsonb, 7,
  '01/10/2026', 'Overdue: 8D', 'var(--status-error)',
  'O. Twist', 'Completed', 'P. Plourde', 'Completed',
  'M. Almeda', 'In Progress', NULL, 'Assign', NULL, 'Assign',
  'Dr. Vera Hollingsworth', 'Walk-in', '4.512', '0.398', true,
  'IPA-2', 'Scan', 'Dr. Elias N.', '10', 'HCC', 'High',
  '6', '5', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Marcus Whitfield', 'I50.23', 'Acute on chronic systolic (congestive) heart failure', 'HCC 224 - Acute on Chronic Heart Failure', 'Accepted', NULL, 'Associated', 4, 2, 1, 0.389, '01/22/2026', 'M. Almeda (QA)', true),
  ('Marcus Whitfield', 'I48.91', 'Unspecified atrial fibrillation', 'HCC 238 - Cardiac Arrhythmias and Heart Block', 'Accepted', NULL, 'Associated', 2, 1, 0, 0.268, '01/22/2026', 'P. Plourde (Coder)', true),
  ('Marcus Whitfield', 'I25.10', 'Atherosclerotic heart disease of native coronary artery without angina pectoris', 'HCC 264 - Vascular Disease', 'New', NULL, 'Associated', 2, 0, 0, 0.288, '01/22/2026', 'P. Plourde (Coder)', true),
  ('Marcus Whitfield', 'E11.9',  'Type 2 diabetes mellitus without complications', 'HCC 36 - Diabetes without Complication', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.105, '01/22/2026', 'P. Plourde (Coder)', true);

-- ─── hcc-37 · Aisha Bello · COPD ──────────────────────────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-37', 'M-1662-3820', 'Aisha Bello', 'AB', 'F', '66y 5m',
  1, 1, '[{"date":"05/18/2026","label":"Due in 3 weeks","labelColor":"var(--neutral-200)"}]'::jsonb,
  2, '["pending","pending"]'::jsonb, 4,
  '04/28/2026', 'Due in 3w', 'var(--neutral-200)',
  'E. Johnson', 'Action Needed', NULL, 'Assign',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Zayn Okonkwo', 'Telehealth', '2.640', '0.180', false,
  'ACP', 'Lab', 'Dr. Zayn O.', '5', 'PCP', 'Medium',
  '3', '2', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Aisha Bello', 'J44.1', 'Chronic obstructive pulmonary disease with acute exacerbation', 'HCC 280 - Chronic Obstructive Pulmonary Disease', 'New', NULL, 'Associated', 2, 0, 0, 0.331, '05/18/2026', 'E. Johnson (Support Team)', true),
  ('Aisha Bello', 'J45.50', 'Severe persistent asthma, uncomplicated', 'HCC 279 - Asthma', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.271, '05/18/2026', 'E. Johnson (Support Team)', true),
  ('Aisha Bello', 'F17.210', 'Nicotine dependence, cigarettes, uncomplicated', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '05/18/2026', 'E. Johnson (Support Team)', true);

-- ─── hcc-38 · Thomas O'Reilly · Breast cancer survivor F/U ────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-38', 'M-1683-3844', 'Thomas O''Reilly', 'TO', 'M', '79y 1m',
  1, 1, '[{"date":"02/08/2026","label":"Due Today","labelColor":"var(--status-warning)"}]'::jsonb,
  3, '["passed","pending","pending"]'::jsonb, 5,
  '01/24/2026', 'Due Today', 'var(--status-warning)',
  'L. Torrance', 'In Progress', NULL, 'Assign',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Amanda Kirkpatrick', 'Walk-in', '4.010', '0.325', true,
  'IPA-3', 'Scan', 'Dr. Amanda K.', '8', 'HCC', 'High',
  '4', '5', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Thomas O''Reilly', 'Z85.3',  'Personal history of malignant neoplasm of breast', 'HCC Not Linked', 'New', NULL, 'Associated', 2, 0, 0, 0.000, '02/08/2026', 'L. Torrance (Support Team)', true),
  ('Thomas O''Reilly', 'D64.9',  'Anemia, unspecified', 'HCC Not Linked', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.000, '02/08/2026', 'L. Torrance (Support Team)', true),
  ('Thomas O''Reilly', 'Z79.899', 'Other long-term (current) drug therapy', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '02/08/2026', 'L. Torrance (Support Team)', true),
  ('Thomas O''Reilly', 'E11.9',   'Type 2 diabetes mellitus without complications', 'HCC 36 - Diabetes without Complication', 'New', NULL, 'Associated', 1, 0, 0, 0.105, '02/08/2026', 'L. Torrance (Support Team)', true);

-- ─── hcc-39 · Priya Sharma · Behavioral + obesity ─────────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-39', 'M-1704-3878', 'Priya Sharma', 'PS', 'F', '62y 8m',
  1, 1, '[{"date":"03/25/2026","label":"Due in 10 Days","labelColor":"var(--neutral-200)"}]'::jsonb,
  2, '["pending","pending"]'::jsonb, 5,
  '03/15/2026', 'Due in 10D', 'var(--neutral-200)',
  'K. Stroman', 'Assign', NULL, 'Assign',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Marisol Vaquero', 'Telehealth', '2.220', '0.128', false,
  'ACP', 'Lab', 'Dr. Marisol V.', '4', 'PCP', 'Medium',
  '2', '1', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Priya Sharma', 'F33.1', 'Major depressive disorder, recurrent, moderate', 'HCC 155 - Major Depressive Disorder, Moderate', 'New', NULL, 'Associated', 1, 0, 0, 0.309, '03/25/2026', 'K. Stroman (Support Team)', true),
  ('Priya Sharma', 'F41.1', 'Generalized anxiety disorder', 'HCC Not Linked', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.000, '03/25/2026', 'K. Stroman (Support Team)', true),
  ('Priya Sharma', 'E66.01', 'Morbid (severe) obesity due to excess calories', 'HCC 22 - Morbid Obesity', 'New', NULL, 'Associated', 1, 0, 0, 0.272, '03/25/2026', 'K. Stroman (Support Team)', true),
  ('Priya Sharma', 'G47.33', 'Obstructive sleep apnea (adult) (pediatric)', 'HCC 86 - Sleep Apnea', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.164, '03/25/2026', 'K. Stroman (Support Team)', true);

-- ─── hcc-40 · Wei Chen · Diabetes + neuropathy ────────────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-40', 'M-1727-3902', 'Wei Chen', 'WC', 'M', '70y 6m',
  1, 1, '[{"date":"04/14/2026","label":"Due in 2 weeks","labelColor":"var(--neutral-200)"}]'::jsonb,
  3, '["passed","passed","pending"]'::jsonb, 6,
  '03/30/2026', 'Due in 2w', 'var(--neutral-200)',
  'M. Thompson', 'Completed', 'Deborah Hintz', 'Records Requested',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Marcus Yeoh', 'Walk-in', '3.756', '0.276', true,
  'IPA-1', 'Scan', 'Dr. Marcus Y.', '7', 'HCC', 'High',
  '4', '2', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Wei Chen', 'E11.42', 'Type 2 diabetes mellitus with diabetic polyneuropathy', 'HCC 37 - Diabetes with Chronic Complications', 'Accepted', NULL, 'Associated', 3, 1, 0, 0.302, '04/14/2026', 'Deborah Hintz (Coder)', true),
  ('Wei Chen', 'E11.65', 'Type 2 diabetes mellitus with hyperglycemia', 'HCC 38 - Diabetes with Glycemic Complications', 'New', NULL, 'Associated', 1, 0, 0, 0.166, '04/14/2026', 'Deborah Hintz (Coder)', true),
  ('Wei Chen', 'I25.10', 'Atherosclerotic heart disease of native coronary artery without angina pectoris', 'HCC 264 - Vascular Disease', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.288, '04/14/2026', 'M. Thompson (Support Team)', true),
  ('Wei Chen', 'H35.9', 'Unspecified retinal disorder', 'HCC Not Linked', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.000, '04/14/2026', 'M. Thompson (Support Team)', true);

-- ─── hcc-41 · Isabella Romano · Afib + HF ─────────────────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-41', 'M-1749-3941', 'Isabella Romano', 'IR', 'F', '72y 3m',
  1, 1, '[{"date":"05/07/2026","label":"Due in 12 Days","labelColor":"var(--neutral-200)"}]'::jsonb,
  3, '["passed","passed","passed"]'::jsonb, 5,
  '04/18/2026', 'Due in 12D', 'var(--neutral-200)',
  'A. Beauchamp', 'Completed', 'P. Plourde', 'In Progress',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Sofia Bianchi', 'Telehealth', '3.910', '0.301', true,
  'IPA-2', 'Lab', 'Dr. Sofia B.', '8', 'HCC', 'High',
  '5', '4', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Isabella Romano', 'I48.0', 'Paroxysmal atrial fibrillation', 'HCC 238 - Cardiac Arrhythmias and Heart Block', 'Accepted', NULL, 'Associated', 3, 1, 0, 0.268, '05/07/2026', 'P. Plourde (Coder)', true),
  ('Isabella Romano', 'I50.9', 'Heart failure, unspecified', 'HCC 226 - Heart Failure, Except End-Stage', 'New', NULL, 'Associated', 2, 0, 0, 0.331, '05/07/2026', 'P. Plourde (Coder)', true),
  ('Isabella Romano', 'Z79.01', 'Long term (current) use of anticoagulants', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '05/07/2026', 'A. Beauchamp (Support Team)', true),
  ('Isabella Romano', 'M81.0', 'Age-related osteoporosis without current pathological fracture', 'HCC Not Linked', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.000, '05/07/2026', 'A. Beauchamp (Support Team)', true);

-- ─── hcc-42 · Devon Alexander · Vascular disease ──────────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-42', 'M-1771-3975', 'Devon Alexander', 'DA', 'M', '67y 9m',
  1, 1, '[{"date":"06/02/2026","label":"Due in 3 weeks","labelColor":"var(--neutral-200)"}]'::jsonb,
  2, '["pending","pending"]'::jsonb, 5,
  '05/15/2026', 'Due in 3w', 'var(--neutral-200)',
  'K. Stroman', 'In Progress', NULL, 'Assign',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Mallory Hayes', 'Walk-in', '3.245', '0.221', true,
  'ACP', 'Scan', 'Dr. Mallory H.', '7', 'HCC', 'High',
  '4', '3', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Devon Alexander', 'I70.201', 'Unspecified atherosclerosis of native arteries of extremities, right leg', 'HCC 264 - Vascular Disease', 'New', NULL, 'Associated', 2, 0, 0, 0.288, '06/02/2026', 'K. Stroman (Support Team)', true),
  ('Devon Alexander', 'I73.9', 'Peripheral vascular disease, unspecified', 'HCC 264 - Vascular Disease', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.288, '06/02/2026', 'K. Stroman (Support Team)', true),
  ('Devon Alexander', 'E78.5', 'Hyperlipidemia, unspecified', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '06/02/2026', 'K. Stroman (Support Team)', true),
  ('Devon Alexander', 'I10', 'Essential (primary) hypertension', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '06/02/2026', 'K. Stroman (Support Team)', true);

-- ─── hcc-43 · Camille Beauchamp · COPD + early dementia ───────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-43', 'M-1793-4008', 'Camille Beauchamp', 'CB', 'F', '78y 11m',
  1, 1, '[{"date":"03/28/2026","label":"Due in 6 Days","labelColor":"var(--status-warning)"}]'::jsonb,
  4, '["passed","passed","failed","pending"]'::jsonb, 6,
  '03/12/2026', 'Due in 6D', 'var(--status-warning)',
  'O. Twist', 'In Progress', NULL, 'Assign',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Roland G.', 'Walk-in', '4.410', '0.387', true,
  'IPA-3', 'Scan', 'Dr. Roland G.', '9', 'HCC', 'High',
  '5', '6', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Camille Beauchamp', 'J44.0', 'Chronic obstructive pulmonary disease with acute lower respiratory infection', 'HCC 280 - Chronic Obstructive Pulmonary Disease', 'New', NULL, 'Associated', 3, 0, 0, 0.331, '03/28/2026', 'O. Twist (Support Team)', true),
  ('Camille Beauchamp', 'G30.9', 'Alzheimer''s disease, unspecified', 'HCC 52 - Dementia With Complications', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.346, '03/28/2026', 'O. Twist (Support Team)', true),
  ('Camille Beauchamp', 'R41.81', 'Age-related cognitive decline', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '03/28/2026', 'O. Twist (Support Team)', true),
  ('Camille Beauchamp', 'F41.1', 'Generalized anxiety disorder', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '03/28/2026', 'O. Twist (Support Team)', true);

-- ─── hcc-44 · Hiroshi Tanaka · CKD stage 4 ────────────────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-44', 'M-1814-4045', 'Hiroshi Tanaka', 'HT', 'M', '69y 4m',
  1, 1, '[{"date":"04/22/2026","label":"Due in 2 weeks","labelColor":"var(--neutral-200)"}]'::jsonb,
  3, '["passed","passed","pending"]'::jsonb, 5,
  '04/06/2026', 'Due in 2w', 'var(--neutral-200)',
  'M. Thompson', 'Completed', 'J. Levesque', 'New',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Indigo I', 'Telehealth', '3.812', '0.298', true,
  'IPA-1', 'Lab', 'Dr. Indigo I.', '7', 'HCC', 'High',
  '4', '3', 'ja'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Hiroshi Tanaka', 'N18.4', 'Chronic kidney disease, stage 4 (severe)', 'HCC 328 - Chronic Kidney Disease, Stage 4', 'New', NULL, 'Associated', 3, 0, 0, 0.237, '04/22/2026', 'M. Thompson (Support Team)', true),
  ('Hiroshi Tanaka', 'E11.22', 'Type 2 diabetes mellitus with diabetic chronic kidney disease', 'HCC 37 - Diabetes with Chronic Complications', 'New', NULL, 'Associated', 2, 0, 0, 0.302, '04/22/2026', 'M. Thompson (Support Team)', true),
  ('Hiroshi Tanaka', 'I10', 'Essential (primary) hypertension', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '04/22/2026', 'M. Thompson (Support Team)', true),
  ('Hiroshi Tanaka', 'D63.1', 'Anemia in chronic kidney disease', 'HCC Not Linked', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.000, '04/22/2026', 'M. Thompson (Support Team)', true);

-- ─── hcc-45 · Sophia Petrov · Breast cancer active ────────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-45', 'M-1836-4079', 'Sophia Petrov', 'SP', 'F', '65y 2m',
  1, 1, '[{"date":"05/28/2026","label":"Due in 3 weeks","labelColor":"var(--neutral-200)"}]'::jsonb,
  4, '["passed","passed","passed","pending"]'::jsonb, 6,
  '05/07/2026', 'Due in 3w', 'var(--neutral-200)',
  'L. Torrance', 'Completed', 'M. Almeda', 'Completed',
  'K. Patel', 'In Progress', NULL, 'Assign', NULL, 'Assign',
  'Dr. Amanda Kirkpatrick', 'Walk-in', '4.720', '0.412', true,
  'IPA-2', 'Scan', 'Dr. Amanda K.', '9', 'HCC', 'High',
  '6', '5', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Sophia Petrov', 'C50.911', 'Malignant neoplasm of unspecified site of right female breast', 'HCC 12 - Breast, Prostate, and Other Cancers and Tumors', 'Accepted', NULL, 'Associated', 3, 2, 1, 0.150, '05/28/2026', 'K. Patel (Compliance)', true),
  ('Sophia Petrov', 'Z79.899', 'Other long-term (current) drug therapy', 'HCC Not Linked', 'Accepted', NULL, 'Associated', 2, 0, 0, 0.000, '05/28/2026', 'M. Almeda (QA)', true),
  ('Sophia Petrov', 'D64.9', 'Anemia, unspecified', 'HCC Not Linked', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.000, '05/28/2026', 'L. Torrance (Support Team)', true),
  ('Sophia Petrov', 'R53.83', 'Other fatigue', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '05/28/2026', 'L. Torrance (Support Team)', true);

-- ─── hcc-46 · Marcus Johnson · Multiple comorbidities ─────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-46', 'M-1858-4114', 'Marcus Johnson', 'MJ', 'M', '76y 8m',
  1, 1, '[{"date":"02/24/2026","label":"Overdue by 3 Days","labelColor":"var(--status-error)"}]'::jsonb,
  5, '["passed","passed","failed","passed","pending"]'::jsonb, 8,
  '02/10/2026', 'Overdue: 3D', 'var(--status-error)',
  'A. Beauchamp', 'In Progress', NULL, 'Assign',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Sandra Kwon', 'Walk-in', '5.120', '0.478', true,
  'IPA-3', 'Scan', 'Dr. Sandra K.', '10', 'HCC', 'High',
  '7', '6', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Marcus Johnson', 'I50.9', 'Heart failure, unspecified', 'HCC 226 - Heart Failure, Except End-Stage', 'New', NULL, 'Associated', 2, 0, 0, 0.331, '02/24/2026', 'A. Beauchamp (Support Team)', true),
  ('Marcus Johnson', 'E11.22', 'Type 2 diabetes mellitus with diabetic chronic kidney disease', 'HCC 37 - Diabetes with Chronic Complications', 'New', NULL, 'Associated', 2, 0, 0, 0.302, '02/24/2026', 'A. Beauchamp (Support Team)', true),
  ('Marcus Johnson', 'N18.3', 'Chronic kidney disease, stage 3', 'HCC 329 - Chronic Kidney Disease, Stage 3', 'New', NULL, 'Associated', 1, 0, 0, 0.127, '02/24/2026', 'A. Beauchamp (Support Team)', true),
  ('Marcus Johnson', 'J44.1', 'Chronic obstructive pulmonary disease with acute exacerbation', 'HCC 280 - Chronic Obstructive Pulmonary Disease', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.331, '02/24/2026', 'A. Beauchamp (Support Team)', true),
  ('Marcus Johnson', 'I48.91', 'Unspecified atrial fibrillation', 'HCC 238 - Cardiac Arrhythmias and Heart Block', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.268, '02/24/2026', 'A. Beauchamp (Support Team)', true);

-- ─── hcc-47 · Delia Contreras · Diabetes + morbid obesity ─────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-47', 'M-1879-4148', 'Delia Contreras', 'DC', 'F', '71y 5m',
  1, 1, '[{"date":"03/16/2026","label":"Due in 1 week","labelColor":"var(--neutral-200)"}]'::jsonb,
  2, '["passed","pending"]'::jsonb, 5,
  '02/28/2026', 'Due in 1w', 'var(--neutral-200)',
  'E. Johnson', 'Completed', 'J. Levesque', 'In Progress',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Marisol Vaquero', 'Telehealth', '3.564', '0.267', true,
  'IPA-1', 'Lab', 'Dr. Marisol V.', '7', 'HCC', 'Medium',
  '4', '3', 'es'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Delia Contreras', 'E11.65', 'Type 2 diabetes mellitus with hyperglycemia', 'HCC 38 - Diabetes with Glycemic Complications', 'Accepted', NULL, 'Associated', 2, 1, 0, 0.166, '03/16/2026', 'J. Levesque (Coder)', true),
  ('Delia Contreras', 'E66.01', 'Morbid (severe) obesity due to excess calories', 'HCC 22 - Morbid Obesity', 'New', NULL, 'Associated', 1, 0, 0, 0.272, '03/16/2026', 'J. Levesque (Coder)', true),
  ('Delia Contreras', 'G47.33', 'Obstructive sleep apnea (adult) (pediatric)', 'HCC 86 - Sleep Apnea', 'New', NULL, 'Associated', 1, 0, 0, 0.164, '03/16/2026', 'J. Levesque (Coder)', true),
  ('Delia Contreras', 'E78.5', 'Hyperlipidemia, unspecified', 'HCC Not Linked', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.000, '03/16/2026', 'E. Johnson (Support Team)', true);

-- ─── hcc-48 · Bernard Adeyemi · Prostate cancer ───────────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-48', 'M-1901-4183', 'Bernard Adeyemi', 'BA', 'M', '68y 10m',
  1, 1, '[{"date":"04/06/2026","label":"Due in 12 Days","labelColor":"var(--neutral-200)"}]'::jsonb,
  3, '["passed","passed","pending"]'::jsonb, 4,
  '03/18/2026', 'Due in 12D', 'var(--neutral-200)',
  'L. Torrance', 'Completed', 'P. Plourde', 'Records Received',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Zayn Okonkwo', 'Walk-in', '3.895', '0.312', true,
  'IPA-2', 'Scan', 'Dr. Zayn O.', '8', 'HCC', 'High',
  '4', '3', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Bernard Adeyemi', 'C61', 'Malignant neoplasm of prostate', 'HCC 12 - Breast, Prostate, and Other Cancers and Tumors', 'Accepted', NULL, 'Associated', 3, 1, 1, 0.150, '04/06/2026', 'P. Plourde (Coder)', true),
  ('Bernard Adeyemi', 'Z79.899', 'Other long-term (current) drug therapy', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '04/06/2026', 'L. Torrance (Support Team)', true),
  ('Bernard Adeyemi', 'R33.9', 'Retention of urine, unspecified', 'HCC Not Linked', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.000, '04/06/2026', 'L. Torrance (Support Team)', true);

-- ─── hcc-49 · Rosalind Kaur · Osteoporosis + arthritis ────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-49', 'M-1922-4218', 'Rosalind Kaur', 'RK', 'F', '74y 7m',
  1, 1, '[{"date":"05/20/2026","label":"Due in 3 weeks","labelColor":"var(--neutral-200)"}]'::jsonb,
  2, '["pending","pending"]'::jsonb, 4,
  '05/02/2026', 'Due in 3w', 'var(--neutral-200)',
  'K. Stroman', 'Assign', NULL, 'Assign',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Ravi Kapoor', 'Telehealth', '2.910', '0.192', false,
  'ACP', 'Lab', 'Dr. Ravi K.', '5', 'PCP', 'Medium',
  '3', '4', 'pa'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Rosalind Kaur', 'M81.0', 'Age-related osteoporosis without current pathological fracture', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '05/20/2026', 'K. Stroman (Support Team)', true),
  ('Rosalind Kaur', 'M06.9', 'Rheumatoid arthritis, unspecified', 'HCC 40 - Rheumatoid Arthritis and Inflammatory Connective Tissue Disease', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.421, '05/20/2026', 'K. Stroman (Support Team)', true),
  ('Rosalind Kaur', 'M17.9', 'Osteoarthritis of knee, unspecified', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '05/20/2026', 'K. Stroman (Support Team)', true),
  ('Rosalind Kaur', 'F32.9', 'Major depressive disorder, single episode, unspecified', 'HCC 155 - Major Depressive Disorder, Moderate', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.309, '05/20/2026', 'K. Stroman (Support Team)', true);

-- ─── hcc-50 · Julian Rossi · Frailty / advanced age ───────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-50', 'M-1944-4252', 'Julian Rossi', 'JR', 'M', '82y 1m',
  1, 1, '[{"date":"03/04/2026","label":"Overdue by 5 Days","labelColor":"var(--status-error)"}]'::jsonb,
  3, '["passed","pending","pending"]'::jsonb, 7,
  '02/18/2026', 'Overdue: 5D', 'var(--status-error)',
  'O. Twist', 'In Progress', NULL, 'Assign',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Sofia Bianchi', 'Walk-in', '5.412', '0.502', true,
  'IPA-3', 'Scan', 'Dr. Sofia B.', '10', 'HCC', 'High',
  '7', '7', 'it'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Julian Rossi', 'R54', 'Age-related physical debility', 'HCC Not Linked', 'New', NULL, 'Associated', 2, 0, 0, 0.000, '03/04/2026', 'O. Twist (Support Team)', true),
  ('Julian Rossi', 'W19.XXXA', 'Unspecified fall, initial encounter', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '03/04/2026', 'O. Twist (Support Team)', true),
  ('Julian Rossi', 'G30.9', 'Alzheimer''s disease, unspecified', 'HCC 52 - Dementia With Complications', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.346, '03/04/2026', 'O. Twist (Support Team)', true),
  ('Julian Rossi', 'I50.9', 'Heart failure, unspecified', 'HCC 226 - Heart Failure, Except End-Stage', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.331, '03/04/2026', 'O. Twist (Support Team)', true),
  ('Julian Rossi', 'N39.0', 'Urinary tract infection, site not specified', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '03/04/2026', 'O. Twist (Support Team)', true);

-- ─── hcc-51 · Naomi Kirkland · Asthma + anxiety ───────────────────────────
INSERT INTO hcc_members (id, member_id, name, initials, gender, age, current_visit, total_visits, dos_list, chart_count, doc_status, open_icds, create_date, due_label, due_color, support_name, support_status, coder_name, coder_status, reviewer1_name, reviewer1_status, reviewer2_name, reviewer2_status, reviewer3_name, reviewer3_status, rendering_provider, visit_type, raf_score, raf_impact, risk_utilization, ipa, health_plan, pcp, decile, cohort, risk_level, advillness, frailty, language) VALUES (
  'hcc-51', 'M-1965-4287', 'Naomi Kirkland', 'NK', 'F', '63y 4m',
  1, 1, '[{"date":"05/12/2026","label":"Due in 2 weeks","labelColor":"var(--neutral-200)"}]'::jsonb,
  2, '["passed","pending"]'::jsonb, 4,
  '04/24/2026', 'Due in 2w', 'var(--neutral-200)',
  'A. Beauchamp', 'Completed', 'J. Levesque', 'New',
  NULL, 'Assign', NULL, 'Assign', NULL, 'Assign',
  'Dr. Marcus Yeoh', 'Telehealth', '2.418', '0.156', false,
  'ACP', 'Lab', 'Dr. Marcus Y.', '4', 'PCP', 'Medium',
  '2', '1', 'en'
);
INSERT INTO hcc_diagnosis_gaps (member_name, code, description, hcc_category, status, type, kind, docs_count, comments_count, notes_count, raf_weight, last_activity, last_activity_by, is_linked) VALUES
  ('Naomi Kirkland', 'J45.50', 'Severe persistent asthma, uncomplicated', 'HCC 279 - Asthma', 'New', NULL, 'Associated', 2, 0, 0, 0.271, '05/12/2026', 'A. Beauchamp (Support Team)', true),
  ('Naomi Kirkland', 'F41.1', 'Generalized anxiety disorder', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '05/12/2026', 'A. Beauchamp (Support Team)', true),
  ('Naomi Kirkland', 'J30.9', 'Allergic rhinitis, unspecified', 'HCC Not Linked', 'New', NULL, 'Associated', 1, 0, 0, 0.000, '05/12/2026', 'A. Beauchamp (Support Team)', true),
  ('Naomi Kirkland', 'E66.9', 'Obesity, unspecified', 'HCC Not Linked', 'New', 'Suspect', 'Suspect', 1, 0, 0, 0.000, '05/12/2026', 'A. Beauchamp (Support Team)', true);

COMMIT;

-- ── Verification ──────────────────────────────────────────────────────────
-- SELECT COUNT(*) AS total_members FROM hcc_members;           -- expect 50
-- SELECT COUNT(*) FROM hcc_diagnosis_gaps
--   WHERE member_name IN (
--     'Robert Nakamura','Elena Vasquez','Marcus Whitfield','Aisha Bello',
--     'Thomas O''Reilly','Priya Sharma','Wei Chen','Isabella Romano',
--     'Devon Alexander','Camille Beauchamp','Hiroshi Tanaka','Sophia Petrov',
--     'Marcus Johnson','Delia Contreras','Bernard Adeyemi','Rosalind Kaur',
--     'Julian Rossi','Naomi Kirkland');                        -- expect 73
