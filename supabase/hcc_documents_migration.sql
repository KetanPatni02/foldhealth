-- ============================================================
-- HCC Documents — per-document OCR tier + 5-point compliance state
-- ============================================================
--
-- Each row tracks one uploaded document (SFTP or manual). The compliance
-- column carries the live state of the 5-point checklist; manual Support
-- decisions persist here so HCC submission audits can answer "who passed
-- what, when, and why" across reloads and across reviewers.
--
-- Org-level config (every reviewer / Support member sees the same queue),
-- so RLS is permissive like the other shared HCC tables (care_teams,
-- audit_logs, hcc_activity_log).

CREATE TABLE IF NOT EXISTS hcc_documents (
  id            TEXT PRIMARY KEY,            -- client-generated; matches hccSftpBatches[].id
  file_name     TEXT NOT NULL,
  ocr_tier      TEXT NOT NULL DEFAULT 'clean', -- 'clean' | 'degraded' | 'unreadable'
  compliance    JSONB,                       -- 5-check object, see src/features/hcc/compliance.js
  encounters    JSONB NOT NULL DEFAULT '[]',
  source        TEXT,                        -- 'sftp' | 'manual'
  status        TEXT,                        -- 'pending' | 'done'
  ingested_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE hcc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_documents" ON hcc_documents;
CREATE POLICY "Allow all for hcc_documents" ON hcc_documents FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_hcc_documents_created ON hcc_documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hcc_documents_status  ON hcc_documents (status);
