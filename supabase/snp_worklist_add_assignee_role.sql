-- ============================================================
-- snp_worklist_members: add assignee_role column
-- ============================================================
--
-- The Assignee cell renders a name + role sub-line. Prior to this change the
-- role was mock-only (introduced in PR #93) — Supabase held everything else
-- for the row but not the role, so reassigning through the drawer never
-- persisted and reloading dropped the change back to a computed fallback.
--
-- One nullable text column: null means "unknown / not set", the row falls
-- through to the 3-tier client fallback (platformUsers lookup →
-- DEMO_ASSIGNEE_ROLE table) so pre-existing rows keep rendering while we
-- backfill.

ALTER TABLE snp_worklist_members
  ADD COLUMN IF NOT EXISTS assignee_role TEXT;
