-- ============================================================
-- Care Teams: Settings → Member/Leads → Care Team
-- Admin-managed teams for the auto-assignment workflow.
-- Org-level config (shared across users), so RLS is permissive
-- like other config tables (embed_domains, audit_logs).
-- ============================================================

CREATE TABLE IF NOT EXISTS care_teams (
  id TEXT PRIMARY KEY,                       -- client-generated ('seed-rt1', 'team-…')
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'hcc',          -- 'hcc' | 'care-program' | 'hedis'
  team_type TEXT,                            -- 'Reviewer 1' | 'Coder' | 'SNP' | 'Assignee' | …
  allocated_tins JSONB NOT NULL DEFAULT '[]',
  created_label TEXT,                        -- display date 'MM/DD/YYYY'
  created_by TEXT,
  modified_label TEXT,                       -- display date 'MM/DD/YYYY'
  modified_by TEXT,
  members JSONB NOT NULL DEFAULT '[]',        -- [{ userId, name, initials, roles, capacityPct, assignTo:[{dim,value,pct}] }]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE care_teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for care_teams" ON care_teams;
CREATE POLICY "Allow all for care_teams" ON care_teams FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_care_teams_created ON care_teams (created_at DESC);

-- Seed the five reference teams (matches the in-app fallback).
-- ON CONFLICT DO NOTHING so re-running never clobbers later edits.
INSERT INTO care_teams (id, name, kind, team_type, allocated_tins, created_label, created_by, modified_label, modified_by, members)
VALUES
  ('seed-rt1', 'Reviewer 1 Team', 'hcc', 'Reviewer 1', '["12-3456789"]', '02/21/2026', 'Dina Morries', '08/30/2024', 'Richard Willson',
   '[{"userId":"MA","name":"M. Almeda","initials":"MA","roles":"Reviewer 1","capacityPct":50,"assignTo":[{"dim":"Coder","value":"DH","pct":50}]}]'),
  ('seed-rt2', 'Coder Team', 'hcc', 'Coder', '["12-3456789","98-7654321"]', '02/21/2026', 'Dina Morries', '08/30/2024', 'Richard Willson',
   '[{"userId":"DH","name":"Deborah Hintz","initials":"DH","roles":"Coder","capacityPct":60,"assignTo":[{"dim":"TIN","value":"12-3456789","pct":60}]},{"userId":"PP","name":"P. Plourde","initials":"PP","roles":"Coder","capacityPct":40,"assignTo":[{"dim":"TIN","value":"98-7654321","pct":30}]}]'),
  ('seed-rt3', 'SNP Team', 'care-program', 'SNP', '[]', '02/21/2026', 'Dina Morries', '08/30/2024', 'Richard Willson',
   '[{"userId":"fallback-1","name":"Michael Corleone","initials":"MC","roles":"Nurse","capacityPct":60,"assignTo":[]},{"userId":"fallback-2","name":"Larry Sanders","initials":"LS","roles":"Medical Assistant","capacityPct":60,"assignTo":[]}]'),
  ('seed-rt4', 'TOC Team', 'care-program', 'TCM', '[]', '02/21/2026', 'Dina Morries', '08/30/2024', 'Richard Willson',
   '[{"userId":"fallback-3","name":"Tina Turner","initials":"TT","roles":"Admin/Practice Manager","capacityPct":80,"assignTo":[]}]'),
  ('seed-rt5', 'Care Gap Team', 'hedis', 'Assignee', '[]', '02/21/2026', 'Dina Morries', '08/30/2024', 'Richard Willson',
   '[{"userId":"fallback-4","name":"Manny Grizwald","initials":"MG","roles":"Billing Specialist","capacityPct":30,"assignTo":[]},{"userId":"fallback-5","name":"Bobby Brown","initials":"BB","roles":"Front Desk Staff/Receptionist","capacityPct":30,"assignTo":[]}]')
ON CONFLICT (id) DO NOTHING;
