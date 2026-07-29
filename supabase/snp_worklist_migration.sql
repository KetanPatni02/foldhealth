-- ============================================================
-- SNP Worklist Members — patient-level worklist for the SNP shared list
-- ============================================================
--
-- One row per member in the Special Needs Plan (SNP) worklist. Populates the
-- SNP subnav worklist columns: Members, Program Sub Status, Care Plan Status,
-- Next Action Due, Outreach, Assignee, Trigger Date, Last Admission, Trigger,
-- Risk IQ, Tags, Tasks.
--
-- Read by the app via the anon key (fetchSnpWorklistMembers in
-- useAppStore.js); seeded from the local mock by `bun run seed`. `outreach`
-- and `tags` are JSONB so the attempt-dots + tag chips ride along on the row.

CREATE TABLE IF NOT EXISTS snp_worklist_members (
  id                  TEXT PRIMARY KEY,          -- e.g. 'snpw-001'
  initials            TEXT,
  name                TEXT NOT NULL,
  gender              TEXT,                      -- 'M' | 'F' | 'O'
  age                 TEXT,                      -- '69y 1m'
  member_id           TEXT,                      -- '#2468029990101'
  language            TEXT DEFAULT 'en',         -- 'en' | 'es' | ...
  program_sub_status  TEXT,                      -- 'Attempted' | '2nd Cont. – Fail' | ...
  care_plan_status    TEXT,                      -- 'Signed' | 'In Review' | 'No Care Plan' | 'Draft'
  next_action_due     TEXT,                      -- 'MM/DD/YYYY'
  outreach            JSONB,                     -- { kind, status, date, dots[] } | null
  assignee_id         TEXT,
  assignee_name       TEXT,                      -- rendered in success-green | null → "Assign"
  assignee_initials   TEXT,
  trigger_date        TEXT,                      -- 'MM/DD/YYYY'
  last_admission      TEXT,                      -- 'MM/DD/YYYY' | null
  trigger             TEXT,                      -- 'Reassessment' | 'New Member' | 'TOC'
  risk_iq             TEXT DEFAULT 'Undetermined',
  tags                JSONB DEFAULT '[]'::jsonb, -- [{ label, tone }]
  tags_more           INT DEFAULT 0,             -- "+N More" overflow count
  task_count          INT DEFAULT 0,
  patient_id          TEXT,                      -- FK to patients.id when linked
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE snp_worklist_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for snp_worklist_members" ON snp_worklist_members;
CREATE POLICY "Allow all for snp_worklist_members" ON snp_worklist_members FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_snp_worklist_sub_status ON snp_worklist_members (program_sub_status);
CREATE INDEX IF NOT EXISTS idx_snp_worklist_assignee   ON snp_worklist_members (assignee_id);
