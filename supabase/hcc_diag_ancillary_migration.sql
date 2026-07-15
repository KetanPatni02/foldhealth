-- ============================================================
-- HCC Diagnosis-Panel ancillary tabs — persist the drawer sub-tab
-- data (Comments, Notes, Documents, History) that today lives in
-- src/features/hcc/data/ancillary.js as static mock content.
--
-- Phase 2 stub: same content shown across every drawer, no
-- per-member scoping yet. Tables are created keyless-of-member
-- so a future Phase 3 add-column-and-backfill can attach them
-- per patient without a data reshuffle.
--
-- Org-level config (every reviewer sees the same rows), permissive
-- RLS matching the other shared HCC tables.
-- ============================================================

-- ---- Comments ---------------------------------------------------
CREATE TABLE IF NOT EXISTS hcc_diag_comments (
  id          TEXT PRIMARY KEY,
  author      TEXT NOT NULL,
  role        TEXT NOT NULL,
  date        TEXT NOT NULL,
  time        TEXT NOT NULL,
  edited      BOOLEAN DEFAULT false,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hcc_diag_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_diag_comments" ON hcc_diag_comments;
CREATE POLICY "Allow all for hcc_diag_comments" ON hcc_diag_comments FOR ALL USING (true);

-- ---- Documents -------------------------------------------------
CREATE TABLE IF NOT EXISTS hcc_diag_documents (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  ext          TEXT NOT NULL,               -- 'pdf' | 'doc' | 'img'
  doc_type     TEXT NOT NULL,               -- 'Clinical Note' | 'Lab Report' | ...
  uploaded_by  TEXT NOT NULL,
  role         TEXT NOT NULL,
  date         TEXT NOT NULL,
  time         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'passed',
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hcc_diag_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_diag_documents" ON hcc_diag_documents;
CREATE POLICY "Allow all for hcc_diag_documents" ON hcc_diag_documents FOR ALL USING (true);

-- ---- Notes -----------------------------------------------------
CREATE TABLE IF NOT EXISTS hcc_diag_notes (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  author     TEXT NOT NULL,
  role       TEXT NOT NULL,
  date       TEXT NOT NULL,
  time       TEXT NOT NULL,
  signed     BOOLEAN DEFAULT true,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hcc_diag_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_diag_notes" ON hcc_diag_notes;
CREATE POLICY "Allow all for hcc_diag_notes" ON hcc_diag_notes FOR ALL USING (true);

-- ---- History (per-DOS audit trail) ------------------------------
CREATE TABLE IF NOT EXISTS hcc_diag_history (
  id            TEXT PRIMARY KEY,
  dos           TEXT NOT NULL,
  hcc_code      TEXT NOT NULL,
  hcc_name      TEXT NOT NULL,
  reviewed_at   TEXT NOT NULL,
  reviewed_by   TEXT NOT NULL,
  role          TEXT NOT NULL,
  claims        INT NOT NULL DEFAULT 0,
  icd_status    TEXT NOT NULL,                -- 'open' | 'accepted' | 'dismissed'
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE hcc_diag_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_diag_history" ON hcc_diag_history;
CREATE POLICY "Allow all for hcc_diag_history" ON hcc_diag_history FOR ALL USING (true);


-- ============================================================
-- Seed data — mirrors src/features/hcc/data/ancillary.js exactly
-- ============================================================

-- Wipe first so re-running the seed is idempotent.
TRUNCATE hcc_diag_comments, hcc_diag_documents, hcc_diag_notes, hcc_diag_history;

INSERT INTO hcc_diag_comments (id, author, role, date, time, edited, body) VALUES
  ('c1', 'Deborah Hintz', 'Coder',        '06/01/2026', '12:30 PM', false, 'E11.21 supported by 04/18/2026 progress note — creatinine 1.8, ACR 320 mg/g documented. Accepting under HCC 37 (Diabetes with Chronic Complications).'),
  ('c2', 'M. Almeda',     'QA',           '06/02/2026', '09:15 AM', true,  'Requesting supporting evidence for I50.9 → suggest confirming with recent BNP or echo. Note from 03/08/2026 mentions "history of CHF" only — MEAT criteria not clearly documented for this DOS.'),
  ('c3', 'A. Beauchamp',  'Support Team', '06/03/2026', '02:45 PM', false, 'Records requested from PCP for I48.91 (a-fib). ECG report expected within 5 business days. Placing DOS on hold pending documentation.');

INSERT INTO hcc_diag_documents (id, name, ext, doc_type, uploaded_by, role, date, time, status) VALUES
  ('d1', 'Progress Note - 04-18-2026.pdf',              'pdf', 'Clinical Note',    'A. Beauchamp',   'Support Team', '04/19/2026', '09:12', 'passed'),
  ('d2', 'Comprehensive Metabolic Panel.pdf',           'pdf', 'Lab Report',       'A. Beauchamp',   'Support Team', '04/19/2026', '09:14', 'passed'),
  ('d3', 'ECG - Atrial Fibrillation.png',               'img', 'Diagnostic',       'M. Thompson',    'Support Team', '04/22/2026', '11:03', 'passed'),
  ('d4', 'Physical Therapy Discharge Summary.docx',     'doc', 'Physical Therapy', 'Deborah Hintz',  'Coder',        '04/25/2026', '14:45', 'passed');

INSERT INTO hcc_diag_notes (id, title, author, role, date, time, signed, body) VALUES
  ('n1', 'Inpatient Discharge Summary', 'Dr. Sarah Chen', 'Physician', '04/18/2026', '14:45', true,
     'Acute-on-Chronic Combined Systolic and Diastolic Heart Failure (I50.43) confirmed via 04/18/2026 inpatient admission. Admission BNP 380 pg/mL with clinical decompensation — dyspnea, orthopnea, 6 lb weight gain, bilateral pitting edema. Echo confirmed EF 45% with Grade II diastolic dysfunction. IV diuresis with Furosemide 80 mg BID resulted in 4.2 L net negative fluid balance. Discharge BNP 210 pg/mL. AKI (N17.9) noted as secondary cardiorenal complication and resolved at discharge.'),
  ('n2', 'HCC Coding Summary',          'Deborah Hintz',  'Coder',     '04/20/2026', '10:12', true,
     'Accepted I50.43 → HCC 224 (Acute on Chronic Heart Failure) based on the 04/18/2026 discharge summary. E11.22 → HCC 37 (Diabetes with Chronic Complications) supported by CMP with eGFR 42. Deferred G47.33 (OSA) — sleep study not on file; requesting records from PCP.');

INSERT INTO hcc_diag_history (id, dos, hcc_code, hcc_name, reviewed_at, reviewed_by, role, claims, icd_status) VALUES
  ('h1', '03/04/2025', 'HCC 37',  'Diabetes with Chronic Complications',    '06/27/2025', 'A. Beauchamp',    'Support Team', 1, 'open'),
  ('h2', '06/11/2025', 'HCC 226', 'Heart Failure, Except End-Stage',        '06/27/2025', 'Deborah Hintz',   'Coder',        1, 'accepted'),
  ('h3', '01/10/2026', 'HCC 238', 'Cardiac Arrhythmias and Heart Block',    '02/12/2026', 'Dr. Sarah Chen',  'Physician',    1, 'open'),
  ('h4', '03/10/2026', 'HCC 280', 'Chronic Obstructive Pulmonary Disease',  '04/02/2026', 'Deborah Hintz',   'Coder',        1, 'dismissed');
