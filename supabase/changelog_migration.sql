-- In-house changelog backing the Help → "What's New" drawer.
--
-- Rows are written ONLY by the GitHub Action (.github/workflows/changelog.yml)
-- using the service-role key (bypasses RLS) — one row per qualifying commit
-- pushed to main. The app reads with the anon/authenticated key, so RLS gets
-- a read-only policy; there is intentionally NO write policy.

CREATE TABLE IF NOT EXISTS changelog_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  -- 'New' | 'Improved' | 'Fixed' — drives the Badge on each row.
  kind        TEXT NOT NULL DEFAULT 'New',
  -- Commit sha — unique so Action re-runs / force-pushes can't duplicate.
  sha         TEXT UNIQUE,
  compare_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'changelog_entries'
       AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users"
      ON public.changelog_entries FOR SELECT USING (true);
  END IF;
END $$;

GRANT SELECT ON public.changelog_entries TO anon, authenticated;
