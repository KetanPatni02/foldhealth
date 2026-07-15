-- ============================================================
-- HCC per-ICD confidence / evidence / MEAT-note store.
--
-- The IcdRow drill-down panel currently reads from three parallel
-- maps in src/features/hcc/data/confidence.js:
--   • CONFIDENCE_DATA   — score + status + evidence list
--   • EVIDENCE_FACTORS  — 7 factor bars for the score breakdown chart
--   • MEAT_NOTE_DATA    — the Monitor/Evaluate/Assess/Treat paragraph
-- All three are keyed by ICD code and are org-scoped (identical for
-- every patient in Phase 2). This table pulls them together so the
-- drill-down can load a single row per code.
--
-- Codes not present in the seed keep the JS defaults from
-- getConfidence / getEvidenceFactors / getMeatNote so the panel
-- never renders empty.
-- ============================================================

CREATE TABLE IF NOT EXISTS hcc_gap_confidence (
  code       TEXT PRIMARY KEY,            -- ICD-10 code (E11.22, I50.43, ...)
  score      INT  NOT NULL,               -- 0-100
  status     TEXT NOT NULL,               -- 'Ready to Close' | 'High Confidence' | 'Batch Review' | 'Suppressed'
  evidence   JSONB NOT NULL DEFAULT '[]', -- [{ text }]
  factors    JSONB,                       -- [{ label, value, color }] — 7 factor bars
  meat_note  TEXT,                        -- full MEAT paragraph
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hcc_gap_confidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_gap_confidence" ON hcc_gap_confidence;
CREATE POLICY "Allow all for hcc_gap_confidence" ON hcc_gap_confidence FOR ALL USING (true);


-- ============================================================
-- Seed — mirrors src/features/hcc/data/confidence.js
-- ============================================================

TRUNCATE hcc_gap_confidence;

INSERT INTO hcc_gap_confidence (code, score, status, evidence, factors, meat_note) VALUES
  ('N18.32', 85, 'Ready to Close',
    '[{"text":"eGFR: 37 mL/min/1.73m² → 38 mL/min/1.73m²"},{"text":"UACR 115 mg/g (01/15/26) indicating macroalbuminuria."},{"text":"Currently on lisinopril 20mg daily."},{"text":"eGFR has remained stable between 38–42 over the past 14 months."}]'::jsonb,
    NULL,
    'CKD Stage 3b (N18.32) is actively managed with quarterly labs and nephrology follow-up. Most recent eGFR 37 mL/min, creatinine 2.0 mg/dL, UACR 115 mg/g (01/15/2026), reflecting slow progressive decline with macroalbuminuria. Assessed as high risk for progression given diabetes and declining eGFR trajectory, continued on lisinopril 20mg daily for renoprotection. CMP repeated every 3 months.'),

  ('E11.319', 78, 'Ready to Close',
    '[{"text":"HbA1c 8.4% (02/10/2026) — consistently above target."},{"text":"Ophthalmology visit 01/20/2026: mild non-proliferative DR confirmed."},{"text":"Currently on metformin 1000mg BID + insulin glargine 20U nightly."},{"text":"Diabetic retinopathy noted in retinal imaging report."}]'::jsonb,
    NULL,
    'Type 2 DM with diabetic retinopathy (E11.319) is monitored with annual ophthalmology visits and quarterly HbA1c checks. Most recent HbA1c 8.4% (02/10/2026). Ophthalmology confirmed mild non-proliferative retinopathy on 01/20/2026 retinal imaging. Current regimen: metformin 1000mg BID, insulin glargine 20U nightly. Patient counseled on glucose control and eye care adherence.'),

  ('F32.1', 72, 'High Confidence',
    '[{"text":"PHQ-9 score 14 (01/25/2026) — moderate severity."},{"text":"Patient on sertraline 100mg daily for 6+ months."},{"text":"Psychiatry follow-up 12/15/2025: single episode confirmed."},{"text":"DSM-5 criteria met per behavioral health note."}]'::jsonb,
    NULL,
    'Major Depressive Disorder, single episode, moderate (F32.1) managed with pharmacotherapy and outpatient behavioral health follow-up. PHQ-9 score 14 as of 01/25/2026. Patient on sertraline 100mg daily with reported partial response. Psychiatry last seen 12/15/2025, noted stable mood with residual low energy. No suicidal ideation. Next follow-up scheduled in 4 weeks.'),

  ('I50.43', 91, 'Ready to Close',
    '[{"text":"Echo 01/08/2026: EF 30%, combined systolic and diastolic failure."},{"text":"BNP 820 pg/mL (01/10/2026) — elevated, consistent with decompensation."},{"text":"Carvedilol 12.5mg BID + lisinopril 10mg daily active."},{"text":"Cardiology note 01/12/2026 documents acute-on-chronic exacerbation."}]'::jsonb,
    NULL,
    'Acute-on-chronic combined systolic and diastolic heart failure (I50.43) actively managed by cardiology. Echo 01/08/2026 shows EF 30% with biventricular dysfunction. BNP 820 pg/mL on 01/10/2026. Patient admitted briefly for decompensation and stabilized. Current regimen: carvedilol 12.5mg BID, lisinopril 10mg, furosemide 40mg daily. Daily weight monitoring in place.'),

  ('G47.33', 80, 'Ready to Close',
    '[{"text":"Sleep study (12/20/2025): AHI 28 events/hr — moderate-severe OSA."},{"text":"CPAP therapy initiated, compliance report 72% usage."},{"text":"BMI 34.2 — risk factor documented in chart."},{"text":"Pulmonology referral note confirms ongoing active diagnosis."}]'::jsonb,
    '[{"label":"Confidence Base","value":38,"color":"#8C5AE2"},{"label":"Evidence Strength","value":65,"color":"#8C5AE2"},{"label":"Recency Decay","value":22,"color":"#8C5AE2"},{"label":"Fold-Unique","value":30,"color":"#1E9DAE"},{"label":"Med Stacking","value":28,"color":"#1E9DAE"},{"label":"LLM Evidence","value":20,"color":"#D9A50B"},{"label":"Comorbidity","value":18,"color":"#8C5AE2"}]'::jsonb,
    'Obstructive sleep apnea, moderate-severe (G47.33) confirmed by polysomnography 12/20/2025 with AHI 28/hr. CPAP therapy initiated with 72% compliance. BMI 34.2 contributing to airway obstruction. Pulmonology follow-up scheduled. Patient reports improved daytime alertness with CPAP use. No hypoxic events recorded in last 30 days per CPAP device data.'),

  -- Factor-only rows (drill-down bar chart) with no confidence/MEAT payload.
  -- Score defaults to the JS DEFAULT_CONFIDENCE (70) so the row still ranks
  -- into the "High Confidence" band when accessed via drill-down.
  ('E11.22', 70, 'High Confidence', '[]'::jsonb,
    '[{"label":"Confidence Base","value":42,"color":"#8C5AE2"},{"label":"Evidence Strength","value":78,"color":"#8C5AE2"},{"label":"Recency Decay","value":18,"color":"#8C5AE2"},{"label":"Fold-Unique","value":26,"color":"#1E9DAE"},{"label":"Med Stacking","value":34,"color":"#1E9DAE"},{"label":"LLM Evidence","value":30,"color":"#D9A50B"},{"label":"Comorbidity","value":22,"color":"#8C5AE2"}]'::jsonb,
    NULL),
  ('I48.91', 70, 'High Confidence', '[]'::jsonb,
    '[{"label":"Confidence Base","value":50,"color":"#8C5AE2"},{"label":"Evidence Strength","value":82,"color":"#8C5AE2"},{"label":"Recency Decay","value":14,"color":"#8C5AE2"},{"label":"Fold-Unique","value":20,"color":"#1E9DAE"},{"label":"Med Stacking","value":40,"color":"#1E9DAE"},{"label":"LLM Evidence","value":35,"color":"#D9A50B"},{"label":"Comorbidity","value":28,"color":"#8C5AE2"}]'::jsonb,
    NULL),
  ('I50.23', 70, 'High Confidence', '[]'::jsonb,
    '[{"label":"Confidence Base","value":55,"color":"#8C5AE2"},{"label":"Evidence Strength","value":88,"color":"#8C5AE2"},{"label":"Recency Decay","value":12,"color":"#8C5AE2"},{"label":"Fold-Unique","value":22,"color":"#1E9DAE"},{"label":"Med Stacking","value":45,"color":"#1E9DAE"},{"label":"LLM Evidence","value":40,"color":"#D9A50B"},{"label":"Comorbidity","value":32,"color":"#8C5AE2"}]'::jsonb,
    NULL),
  ('J45.50', 70, 'High Confidence', '[]'::jsonb,
    '[{"label":"Confidence Base","value":35,"color":"#8C5AE2"},{"label":"Evidence Strength","value":60,"color":"#8C5AE2"},{"label":"Recency Decay","value":20,"color":"#8C5AE2"},{"label":"Fold-Unique","value":18,"color":"#1E9DAE"},{"label":"Med Stacking","value":25,"color":"#1E9DAE"},{"label":"LLM Evidence","value":22,"color":"#D9A50B"},{"label":"Comorbidity","value":15,"color":"#8C5AE2"}]'::jsonb,
    NULL);

-- Verify:
--   SELECT count(*), count(*) FILTER (WHERE meat_note IS NOT NULL) AS with_meat FROM hcc_gap_confidence;
--   -- Expected: 9 rows, 5 with meat.
