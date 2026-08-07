-- Care-program letters library. Holds the program letter templates shown in
-- the Care Program → Letters step, including the PDF bytes themselves so the
-- app can preview/download without a separate storage bucket. Files are small
-- (~2.5KB each) so we store them base64-encoded in `content_base64`.
--
-- Seeded from supabase/seed-assets/letters/*.pdf by scripts/seed.js
-- (`bun run seed`).

CREATE TABLE IF NOT EXISTS letters (
  id             TEXT PRIMARY KEY,
  file_name      TEXT NOT NULL,
  file_type      TEXT,
  sent_via       TEXT[] DEFAULT '{}',   -- delivery channels: Email / SMS / Mailroom
  last_sent      TEXT,
  sent_by        TEXT,
  source_file    TEXT,                  -- original PDF filename
  content_base64 TEXT,                  -- the PDF, base64-encoded
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- The app reads with the anon key, so a permissive policy is required or the
-- table returns 0 rows and the UI silently falls back to the local mock.
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all letters" ON letters;
CREATE POLICY "Allow all letters" ON letters FOR ALL USING (true) WITH CHECK (true);
