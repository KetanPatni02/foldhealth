-- ══════════════════════════════════════════════════════════════════════════════
-- Table: hcc_added_charts
--
-- Manually-uploaded chart documents for HCC members (the "Upload New Chart" CTA
-- in the ChartPopover and the inline "Upload" panel in the Document Available
-- drawer). System/default docs are generated client-side; only user uploads are
-- persisted here so they survive a reload.
--
-- The uploaded file bytes live in the `chart-uploads` Storage bucket (created
-- below); `pdf_url` holds the public URL and `storage_path` the object path.
--
-- No hard FK to hcc_members (matches hcc_documents) so uploads for members not
-- yet synced to the table still persist. Writes are fire-and-forget from the
-- client, which updates optimistically first.
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hcc_added_charts (
  id            text PRIMARY KEY,          -- client-generated, e.g. 'hcc-10::upload1699999999999'
  hcc_member_id text NOT NULL,             -- hcc_members.id, e.g. 'hcc-10'
  caption       text,
  doc_type      text,
  file_name     text,
  date_added    text,
  added_by      text,
  meta          text,
  status        text DEFAULT 'Pending',
  pdf_url       text,                       -- public Storage URL of the uploaded file
  storage_path  text,                       -- object path inside the chart-uploads bucket
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE hcc_added_charts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_added_charts" ON hcc_added_charts;
CREATE POLICY "Allow all for hcc_added_charts" ON hcc_added_charts FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_hcc_added_charts_member ON hcc_added_charts (hcc_member_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- Storage: chart-uploads bucket (public read) + permissive object policies
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('chart-uploads', 'chart-uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chart-uploads read"  ON storage.objects;
DROP POLICY IF EXISTS "chart-uploads write" ON storage.objects;
CREATE POLICY "chart-uploads read"  ON storage.objects FOR SELECT USING (bucket_id = 'chart-uploads');
CREATE POLICY "chart-uploads write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chart-uploads');

-- ══════════════════════════════════════════════════════════════════════════════
-- Seed: system (default) chart documents
--
-- Mirrors chartDocs.generateDefaultCharts exactly — the Progress Note /
-- Laboratory Report each charted member already shows — so those become
-- DB-backed rows that open the bundled PDFs. `::sys` ids match the client
-- generation, so once seeded the app uses these rows instead of regenerating
-- them (no duplication). Members with no chart on file are omitted.
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO hcc_added_charts (id, hcc_member_id, caption, doc_type, file_name, date_added, added_by, meta, status, pdf_url, storage_path) VALUES
  ('hcc-10::sys0', 'hcc-10', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '07/04/2026', 'Oliver Twist (Support Team)', '07/04/2026 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-21::sys0', 'hcc-21', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '08/12/2025', 'M. Thompson (Support Team)', '08/12/2025 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-9::sys0', 'hcc-9', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '01/15/2026', 'O. Twist (Support Team)', '01/15/2026 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-20::sys0', 'hcc-20', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '07/01/2025', 'A. Beauchamp (Support Team)', '07/01/2025 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-20::sys1', 'hcc-20', 'Laboratory Report.pdf', 'Lab Report', 'Laboratory Report.pdf', '07/01/2025', 'A. Beauchamp (Support Team)', '07/01/2025 · Lab Report', 'Passed', '/charts/laboratory-report.pdf', NULL),
  ('hcc-17::sys0', 'hcc-17', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '05/01/2025', 'E. Johnson (Support Team)', '05/01/2025 · Visit Note', 'Pending', '/charts/progress-note.pdf', NULL),
  ('hcc-17::sys1', 'hcc-17', 'Laboratory Report.pdf', 'Lab Report', 'Laboratory Report.pdf', '05/01/2025', 'E. Johnson (Support Team)', '05/01/2025 · Lab Report', 'Pending', '/charts/laboratory-report.pdf', NULL),
  ('hcc-24::sys0', 'hcc-24', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '11/20/2025', 'E. Johnson (Support Team)', '11/20/2025 · Visit Note', 'Pending', '/charts/progress-note.pdf', NULL),
  ('hcc-24::sys1', 'hcc-24', 'Laboratory Report.pdf', 'Lab Report', 'Laboratory Report.pdf', '11/20/2025', 'E. Johnson (Support Team)', '11/20/2025 · Lab Report', 'Pending', '/charts/laboratory-report.pdf', NULL),
  ('hcc-23::sys0', 'hcc-23', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '10/18/2025', 'L. Torrance (Support Team)', '10/18/2025 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-5::sys0', 'hcc-5', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '03/04/2026', 'D. Hintz (Support Team)', '03/04/2026 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-6::sys0', 'hcc-6', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '01/15/2026', 'O. Twist (Support Team)', '01/15/2026 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-6::sys1', 'hcc-6', 'Laboratory Report.pdf', 'Lab Report', 'Laboratory Report.pdf', '01/15/2026', 'O. Twist (Support Team)', '01/15/2026 · Lab Report', 'Passed', '/charts/laboratory-report.pdf', NULL),
  ('hcc-18::sys0', 'hcc-18', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '04/25/2025', 'K. Stroman (Support Team)', '04/25/2025 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-16::sys0', 'hcc-16', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '02/28/2026', 'O. Twist (Support Team)', '02/28/2026 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-32::sys0', 'hcc-32', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '07/22/2026', 'O. Twist (Support Team)', '07/22/2026 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-29::sys0', 'hcc-29', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '04/12/2026', 'A. Beauchamp (Support Team)', '04/12/2026 · Visit Note', 'Pending', '/charts/progress-note.pdf', NULL),
  ('hcc-4::sys0', 'hcc-4', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '03/08/2026', 'E. Johnson (Support Team)', '03/08/2026 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-4::sys1', 'hcc-4', 'Laboratory Report.pdf', 'Lab Report', 'Laboratory Report.pdf', '03/08/2026', 'E. Johnson (Support Team)', '03/08/2026 · Lab Report', 'Passed', '/charts/laboratory-report.pdf', NULL),
  ('hcc-15::sys0', 'hcc-15', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '03/18/2025', 'L. Torrance (Support Team)', '03/18/2025 · Visit Note', 'Failed', '/charts/progress-note.pdf', NULL),
  ('hcc-15::sys1', 'hcc-15', 'Laboratory Report.pdf', 'Lab Report', 'Laboratory Report.pdf', '03/18/2025', 'L. Torrance (Support Team)', '03/18/2025 · Lab Report', 'Failed', '/charts/laboratory-report.pdf', NULL),
  ('hcc-3::sys0', 'hcc-3', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '11/29/2023', 'L. Torrance (Support Team)', '11/29/2023 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-30::sys0', 'hcc-30', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '05/05/2026', 'L. Torrance (Support Team)', '05/05/2026 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-25::sys0', 'hcc-25', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '12/08/2025', 'O. Twist (Support Team)', '12/08/2025 · Visit Note', 'Failed', '/charts/progress-note.pdf', NULL),
  ('hcc-2::sys0', 'hcc-2', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '09/28/2023', 'M. Thompson (Support Team)', '09/28/2023 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-2::sys1', 'hcc-2', 'Laboratory Report.pdf', 'Lab Report', 'Laboratory Report.pdf', '09/28/2023', 'M. Thompson (Support Team)', '09/28/2023 · Lab Report', 'Passed', '/charts/laboratory-report.pdf', NULL),
  ('hcc-33::sys0', 'hcc-33', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '08/28/2026', 'E. Johnson (Support Team)', '08/28/2026 · Visit Note', 'Pending', '/charts/progress-note.pdf', NULL),
  ('hcc-33::sys1', 'hcc-33', 'Laboratory Report.pdf', 'Lab Report', 'Laboratory Report.pdf', '08/28/2026', 'E. Johnson (Support Team)', '08/28/2026 · Lab Report', 'Pending', '/charts/laboratory-report.pdf', NULL),
  ('hcc-12::sys0', 'hcc-12', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '02/14/2025', 'A. Beauchamp (Support Team)', '02/14/2025 · Visit Note', 'Pending', '/charts/progress-note.pdf', NULL),
  ('hcc-1::sys0', 'hcc-1', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '03/04/2026', 'A. Beauchamp (Support Team)', '03/04/2026 · Visit Note', 'Pending', '/charts/progress-note.pdf', NULL),
  ('hcc-26::sys0', 'hcc-26', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '01/30/2026', 'K. Stroman (Support Team)', '01/30/2026 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-26::sys1', 'hcc-26', 'Laboratory Report.pdf', 'Lab Report', 'Laboratory Report.pdf', '01/30/2026', 'K. Stroman (Support Team)', '01/30/2026 · Lab Report', 'Passed', '/charts/laboratory-report.pdf', NULL),
  ('hcc-14::sys0', 'hcc-14', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '01/22/2025', 'M. Thompson (Support Team)', '01/22/2025 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-28::sys0', 'hcc-28', 'Progress Note.pdf', 'Visit Note', 'Progress Note.pdf', '03/20/2026', 'M. Thompson (Support Team)', '03/20/2026 · Visit Note', 'Passed', '/charts/progress-note.pdf', NULL),
  ('hcc-28::sys1', 'hcc-28', 'Laboratory Report.pdf', 'Lab Report', 'Laboratory Report.pdf', '03/20/2026', 'M. Thompson (Support Team)', '03/20/2026 · Lab Report', 'Passed', '/charts/laboratory-report.pdf', NULL)
ON CONFLICT (id) DO NOTHING;
