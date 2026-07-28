-- ============================================================
-- CCM Worklist Members — patient-level worklist for the CCM shared list
-- ============================================================
--
-- One row per patient enrolled (or eligible) for the Chronic Care
-- Management program. Populates the CCM subnav worklist columns in the
-- Figma reference (515:16813): Members, Status, Next Action Due, Outreach,
-- Assignee, Start Date, Last Admission, Risk Level, Task, Care Plan Status.
--
-- Billable Mins + Unlogged Mins are rolled up client-side from
-- ccm_billable_activities, so they intentionally don't live on this table.
-- Read by the app via the anon key (fetchCcmWorklistMembers in
-- useAppStore.js); seeded from the local mock by `bun run seed`.

CREATE TABLE IF NOT EXISTS ccm_worklist_members (
  id                    TEXT PRIMARY KEY,        -- e.g. 'ccmw-001'
  initials              TEXT,
  name                  TEXT NOT NULL,
  gender                TEXT,                    -- 'M' | 'F'
  age                   TEXT,                    -- '67y 3m'
  member_id             TEXT,                    -- '#837261495203'
  language              TEXT DEFAULT 'en',       -- 'en' | 'ch' | ...
  status                TEXT NOT NULL,           -- 'New' | 'Engaged' | 'Enrolled' | 'Unable to Reach'
  next_action_due       TEXT,                    -- 'MM/DD'
  next_action_overdue   BOOLEAN DEFAULT false,   -- render date in status-error when true
  outreach_status       TEXT,                    -- 'Attended' | 'Missed' | null
  outreach_date         TEXT,                    -- 'MM/DD/YY' when outreach_status is set
  assignee_id           TEXT,                    -- 'ib' | 'rb' | 'dc' | null
  assignee_name         TEXT,                    -- 'Ignacio Beer' | 'You' | null
  assignee_initials     TEXT,                    -- 'IB' | 'DC' | null
  start_date            TEXT,                    -- 'MM/DD'
  last_admission        TEXT,                    -- 'MM/DD/YYYY'
  risk_level            TEXT,                    -- 'High' | 'Medium' | 'Low' | null
  task_count            INT DEFAULT 0,
  care_plan_status      TEXT,                    -- 'Updated' | 'Pending' | null
  billable_seconds      INT DEFAULT 0,           -- monthly roll-up; overwritten from activities when available
  unlogged_seconds      INT DEFAULT 0,           -- untracked time waiting to be classified
  -- Extended filterable dimensions surfaced in the CCM worklist chip row.
  dob                   TEXT,                    -- 'YYYY-MM-DD'
  utr_flag              TEXT DEFAULT 'No',       -- 'Yes' | 'No'
  utr_age_days          INT DEFAULT 0,           -- days since UTR flag was set
  program_due_date      TEXT,                    -- 'MM/DD/YYYY'
  last_outreach_outcome TEXT,                    -- 'Reached' | 'Voicemail' | 'No Answer' | null
  assignment_date       TEXT,                    -- 'MM/DD/YYYY'
  ipa                   TEXT,                    -- 'CFC' | 'Astrana'
  hp_code               TEXT,                    -- 'H1234' | 'H5678'
  member_status         TEXT DEFAULT 'Active'    -- 'Active' | 'Inactive' | 'On Hold'
  patient_id            TEXT,                    -- FK to patients.id when linked
  created_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ccm_worklist_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for ccm_worklist_members" ON ccm_worklist_members;
CREATE POLICY "Allow all for ccm_worklist_members" ON ccm_worklist_members FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_ccm_worklist_status   ON ccm_worklist_members (status);
CREATE INDEX IF NOT EXISTS idx_ccm_worklist_assignee ON ccm_worklist_members (assignee_id);
