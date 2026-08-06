-- ============================================================
-- Practice Locations — Settings → Account → Locations tab
-- ============================================================
--
-- One row per practice location the org operates from. Read by the app
-- via the anon key in fetchPracticeLocations() (src/store/useAppStore.js);
-- seeded from the local mock by `bun run seed`.
--
-- Also drives the "Location" MultiSelectField in the Users drawers — every
-- user pick comes from this table so the two surfaces stay in sync.
--
-- Structure MUST match the store's row → object mapping and
-- scripts/seed.js (practiceLocationToRow).
--
-- Org-level shared record (every admin manages the same set), so RLS is
-- permissive like the other shared tables (profiles, hcc_documents).

CREATE TABLE IF NOT EXISTS practice_locations (
  id                TEXT PRIMARY KEY,           -- client id, e.g. 'loc-01'
  name              TEXT NOT NULL,
  ehr_instance      TEXT,                       -- 'Fold EHR' | 'Elation Montrose' | 'NEXTGEN'
  address_line_1    TEXT,
  address_line_2    TEXT,
  city              TEXT,
  state             TEXT,
  zip_code          TEXT,
  timezone          TEXT,                       -- IANA tz, e.g. 'America/New_York'
  google_map_link   TEXT,
  default_phone     TEXT,
  business_hours    JSONB DEFAULT '[]',         -- [{ days: ['M','T','W'], from: '09:00', to: '17:00', timezone, locationId? }]
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- The app reads with the anon key; RLS returns 0 rows without a permissive
-- policy and the UI silently falls back to the local mock.
ALTER TABLE practice_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for practice_locations" ON practice_locations;
CREATE POLICY "Allow all for practice_locations" ON practice_locations FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_practice_locations_name         ON practice_locations (name);
CREATE INDEX IF NOT EXISTS idx_practice_locations_ehr_instance ON practice_locations (ehr_instance);
CREATE INDEX IF NOT EXISTS idx_practice_locations_deleted_at   ON practice_locations (deleted_at);
