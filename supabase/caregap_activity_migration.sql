-- ============================================================
-- Care Gap Activity — per-member activity feed for the HEDIS
-- Care Gap Details drawer (Activity Log tab)
-- ============================================================
--
-- One row per activity entry, keyed by HEDIS member id. Common columns are
-- lifted out; everything variant-specific (callDetails, detailCard,
-- fromAssignee/toAssignee, commentBody, file, …) rides in `payload` JSONB so
-- new ActivityLog variants never need a schema change.
--
-- Read/written by the app via the anon key (fetchCaregapActivity /
-- persistCaregapActivityInsert in useAppStore.js); seeded from the local mock
-- by `bun run seed`.

CREATE TABLE IF NOT EXISTS caregap_activity (
  id         TEXT PRIMARY KEY,           -- e.g. 'a1-1', 'assign-1753…'
  member_id  TEXT NOT NULL,              -- HEDIS member id ('hd1', …)
  at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor      TEXT,                       -- display name of who did it
  t          TEXT,                       -- ActivityLog variant key ('outreach' | 'status_change' | …)
  title      TEXT,
  payload    JSONB DEFAULT '{}'::jsonb,  -- variant-specific fields
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE caregap_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for caregap_activity" ON caregap_activity;
CREATE POLICY "Allow all for caregap_activity" ON caregap_activity FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_caregap_activity_member ON caregap_activity (member_id, at DESC);
