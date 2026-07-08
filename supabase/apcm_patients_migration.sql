-- ============================================================
-- APCM Patients — Advanced Primary Care Management billing worklist
-- ============================================================
--
-- One row per patient/month in the APCM billing review queue (Settings →
-- Billing). Read by the app via the anon key in fetchApcmPatients()
-- (src/store/useAppStore.js); seeded from the local mock by `bun run seed`.
--
-- Structure MUST match the store's row → object mapping and scripts/seed.js
-- (apcmToRow). icd_codes and reasons are JSONB arrays.
--
-- Org-level shared queue (every reviewer sees the same rows), so RLS is
-- permissive like the other shared tables (hcc_documents, care_teams).

CREATE TABLE IF NOT EXISTS apcm_patients (
  id                          TEXT PRIMARY KEY,            -- client id, e.g. 'ap1'
  name                        TEXT NOT NULL,
  member_id                   TEXT,
  language                    TEXT DEFAULT 'en',
  ehr_id                      TEXT,
  billing_month               TEXT,
  date_of_service             TEXT,
  is_qmb                      BOOLEAN DEFAULT false,
  chronic_condition_count     INT     DEFAULT 0,
  cpt_code                    TEXT,
  icd_codes                   JSONB   DEFAULT '[]',        -- [{ code, description }]
  last_encounter_date         TEXT,
  reasons                     JSONB   DEFAULT '[]',        -- string[]
  rendering_provider          TEXT,
  rendering_provider_initials TEXT,
  comment                     TEXT    DEFAULT '',
  tab                         TEXT,                        -- 'eligible' | 'new-changes' | …
  billing_status              TEXT    DEFAULT 'pending',
  program_id                  TEXT,
  created_at                  TIMESTAMPTZ DEFAULT now()
);

-- The app reads with the anon key, so an "allow all" read/write policy is
-- required — without this, RLS returns 0 rows and the UI silently falls
-- back to the local mock.
ALTER TABLE apcm_patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for apcm_patients" ON apcm_patients;
CREATE POLICY "Allow all for apcm_patients" ON apcm_patients FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_apcm_patients_name ON apcm_patients (name);
CREATE INDEX IF NOT EXISTS idx_apcm_patients_tab  ON apcm_patients (tab);
