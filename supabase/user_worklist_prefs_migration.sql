-- ============================================================
-- User Worklist Prefs — per-user SubNav worklist ordering
-- ============================================================
--
-- One row per user. `worklist_order` is a JSONB array of worklist labels
-- (e.g. ["TOC","SNP","HCC",…]) in the user's preferred display order.
-- The SubNav renders worklists in this order and lands the user on the
-- first entry when they open Population. Written by saveWorklistOrder()
-- and read by fetchWorklistOrder() in src/store/useAppStore.js.
--
-- user_id is TEXT (not a FK) because dev-mode sessions may not have an
-- auth user; the store falls back to a stable local identifier.

CREATE TABLE IF NOT EXISTS user_worklist_prefs (
  user_id        TEXT PRIMARY KEY,
  worklist_order JSONB NOT NULL DEFAULT '[]',
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- The app reads with the anon key, so an "allow all" policy is required —
-- without it RLS returns 0 rows and the UI silently falls back to the
-- default order.
ALTER TABLE user_worklist_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON user_worklist_prefs;
CREATE POLICY "Allow all" ON user_worklist_prefs FOR ALL USING (true) WITH CHECK (true);
