-- ICD code cache
--
-- Write-through cache of ICD codes fetched from the WHO ICD-11 API (see
-- api/_lib/icd.js). The proxy upserts fetched codes here so repeated lookups
-- are fast and the app builds up a local ICD catalog over time. Seeded from the
-- bundled fallback catalog (src/lib/icd/catalog.js) via `bun run seed`.

CREATE TABLE IF NOT EXISTS icd_codes (
  code        text PRIMARY KEY,
  title       text NOT NULL,
  chapter     text,
  hcc         text,
  entity_id   text,
  source      text DEFAULT 'seed',
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icd_codes_title ON icd_codes USING gin (to_tsvector('english', title));

ALTER TABLE icd_codes ENABLE ROW LEVEL SECURITY;

-- Anon key is public (bundled into the browser): read-only. Writes go through
-- the server-side proxy, whose service-role key bypasses RLS.
DROP POLICY IF EXISTS "Allow all on icd_codes" ON icd_codes;
DROP POLICY IF EXISTS "Read icd_codes" ON icd_codes;
CREATE POLICY "Read icd_codes" ON icd_codes FOR SELECT USING (true);
