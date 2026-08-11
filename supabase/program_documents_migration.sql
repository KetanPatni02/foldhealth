-- Care-program documents: a patient's Program Documents library, scoped by
-- program_code + patient_id. Rows are created when a user uploads a file via
-- the inline DocumentUploader on the Program Documents step. The step is empty
-- by default (no seed rows) — documents accrue as they are uploaded.

CREATE TABLE IF NOT EXISTS program_documents (
  id           TEXT PRIMARY KEY,
  program_code TEXT,
  patient_id   TEXT,
  name         TEXT NOT NULL,
  type         TEXT,
  status       TEXT,
  size_bytes   BIGINT,
  updated_by   TEXT,
  updated_date TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- The app reads with the anon key, so a permissive policy is required or the
-- table returns 0 rows and the UI silently shows only session-local uploads.
ALTER TABLE program_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all program_documents" ON program_documents;
CREATE POLICY "Allow all program_documents"
  ON program_documents FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS program_documents_program_patient_idx
  ON program_documents (program_code, patient_id);
