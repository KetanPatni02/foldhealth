-- CMS Place of Service (POS) reference codes
--
-- Standard US POS code set (NUCC/CMS) backing every POS dropdown in the HCC
-- flows. Seeded from src/features/hcc/data/posCodes.js via `bun run seed`.

CREATE TABLE IF NOT EXISTS pos_codes (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE pos_codes ENABLE ROW LEVEL SECURITY;

-- Anon key is public: read-only. Seeding uses the service role (bypasses RLS).
DROP POLICY IF EXISTS "Allow all on pos_codes" ON pos_codes;
DROP POLICY IF EXISTS "Read pos_codes" ON pos_codes;
CREATE POLICY "Read pos_codes" ON pos_codes FOR SELECT USING (true);
