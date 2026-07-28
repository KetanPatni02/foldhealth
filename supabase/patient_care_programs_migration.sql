-- ============================================================
-- Patient Care Programs — programs a specific patient is enrolled in
-- ============================================================
--
-- One row per (patient_id, program code). When the user enrolls a patient
-- in a new program from the Care Programs tab, we insert a row here so
-- the enrollment survives page reload. On mount CareProgramsTab reads
-- back everything for the current patient and renders those rows.
--
-- Read by the app via the anon key (fetchCareProgramsForPatient in
-- useAppStore.js). Shared org-wide, so RLS is permissive like other
-- shared tables (apcm_patients, hcc_documents, ccm_billing_periods).

CREATE TABLE IF NOT EXISTS patient_care_programs (
  id             TEXT PRIMARY KEY,             -- 'pcp-<patient_id>-<code>'
  patient_id     TEXT NOT NULL,
  code           TEXT NOT NULL,                -- 'CCM' | 'SNP' | 'AWV' | …
  name           TEXT NOT NULL,                -- 'Chronic Care Management (CCM)'
  acuity         TEXT,
  status         TEXT DEFAULT 'New',
  status_color   TEXT,
  start_date     TEXT,
  end_date       TEXT,
  last_updated   TEXT,
  assignee       TEXT,
  pcp            TEXT,
  progress       NUMERIC(4,3) DEFAULT 0,       -- 0..1 for the progress ring
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (patient_id, code)
);

ALTER TABLE patient_care_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for patient_care_programs" ON patient_care_programs;
CREATE POLICY "Allow all for patient_care_programs" ON patient_care_programs FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_pcp_patient ON patient_care_programs (patient_id);
