-- ============================================================
-- CCM Billing — Chronic Care Management monthly billing + activities
-- ============================================================
--
-- Two tables backing the CCM program's Billing Review step in the patient
-- Care Programs tab:
--
--   ccm_billing_periods     — one row per (patient_id, year_month), tracks
--                              complexity, required-minute threshold, and
--                              bill/claim send state.
--   ccm_billable_activities — individual logged sessions that roll up into
--                              a period's Total Billable Time.
--
-- Read by the app via the anon key (fetchCcmBillingPeriods /
-- fetchCcmBillableActivities in useAppStore.js); seeded from the local mock
-- by `bun run seed`.
--
-- Column names MUST match scripts/seed.js (ccmPeriodToRow / ccmActivityToRow)
-- and the store's row → object mapping. Shared org-wide worklist, so RLS is
-- permissive like other shared tables (apcm_patients, hcc_documents).

-- ── ccm_billing_periods ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ccm_billing_periods (
  id                     TEXT PRIMARY KEY,        -- e.g. 'p1-2026-07'
  patient_id             TEXT NOT NULL,           -- FK to patients.id (client id, e.g. 'p1')
  program_id             TEXT,                    -- FK to the CCM program row in care_programs
  year_month             TEXT NOT NULL,           -- 'YYYY-MM', e.g. '2026-07'
  complexity             TEXT DEFAULT 'moderate', -- 'moderate' | 'high'
  required_minutes       INT  DEFAULT 20,         -- CCM threshold; 20 for moderate, 60 for high
  bill_status            TEXT DEFAULT 'draft',    -- 'draft' | 'ready' | 'generated' | 'sent'
  claim_status           TEXT DEFAULT 'unsent',   -- 'unsent' | 'sent' | 'accepted' | 'denied'
  generated_at           TIMESTAMPTZ,
  sent_at                TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  UNIQUE (patient_id, year_month)
);

ALTER TABLE ccm_billing_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for ccm_billing_periods" ON ccm_billing_periods;
CREATE POLICY "Allow all for ccm_billing_periods" ON ccm_billing_periods FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_ccm_periods_patient ON ccm_billing_periods (patient_id);
CREATE INDEX IF NOT EXISTS idx_ccm_periods_month   ON ccm_billing_periods (year_month);

-- ── ccm_billable_activities ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ccm_billable_activities (
  id                  TEXT PRIMARY KEY,             -- 'act-<uuid-ish>' — deterministic in seed
  period_id           TEXT REFERENCES ccm_billing_periods(id) ON DELETE CASCADE,
  patient_id          TEXT NOT NULL,
  activity_type       TEXT NOT NULL,                -- 'Care Planning, Patient Assessment', 'Clinical Documentation', ...
  description         TEXT DEFAULT '',
  duration_seconds    INT  NOT NULL DEFAULT 0,      -- store seconds so 07:15 = 435
  logged_by           TEXT,                         -- author display name
  logged_by_initials  TEXT,
  occurred_at         TIMESTAMPTZ NOT NULL,         -- when the work happened
  is_unlogged         BOOLEAN DEFAULT false,        -- true if pulled from unlogged-time review
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ccm_billable_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for ccm_billable_activities" ON ccm_billable_activities;
CREATE POLICY "Allow all for ccm_billable_activities" ON ccm_billable_activities FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_ccm_activities_period  ON ccm_billable_activities (period_id);
CREATE INDEX IF NOT EXISTS idx_ccm_activities_patient ON ccm_billable_activities (patient_id);
CREATE INDEX IF NOT EXISTS idx_ccm_activities_time    ON ccm_billable_activities (occurred_at DESC);

-- ── ccm_billing_reports ──────────────────────────────────────────────────
-- Immutable snapshot of a monthly claim once "Generate Bill" is fired.
-- Kept separate from ccm_billing_periods so the current-month state can
-- keep changing without mutating the historical record. cpt_codes is a
-- JSONB array like [{code, minutes, amount}] so the drawer can render an
-- arbitrary number of CPT lines per report.
CREATE TABLE IF NOT EXISTS ccm_billing_reports (
  id                        TEXT PRIMARY KEY,             -- 'p1-BR-48'
  report_number             INT NOT NULL,                 -- monotonically increasing per org
  patient_id                TEXT NOT NULL,
  period_id                 TEXT REFERENCES ccm_billing_periods(id) ON DELETE SET NULL,
  year_month                TEXT NOT NULL,                -- 'YYYY-MM'
  generated_at              TIMESTAMPTZ NOT NULL,
  est_billing_amount        NUMERIC(10,2) NOT NULL,       -- rolled-up total in dollars
  total_seconds             INT NOT NULL DEFAULT 0,
  integrated_ehr            TEXT,                         -- 'Athena Health' | 'Epic' | …
  provider_name             TEXT,
  provider_initials         TEXT,
  medical_decision_making   TEXT DEFAULT 'moderate',      -- 'moderate' | 'high'
  cpt_codes                 JSONB DEFAULT '[]',           -- [{code, minutes, amount}]
  created_at                TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ccm_billing_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for ccm_billing_reports" ON ccm_billing_reports;
CREATE POLICY "Allow all for ccm_billing_reports" ON ccm_billing_reports FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_ccm_reports_patient ON ccm_billing_reports (patient_id);
CREATE INDEX IF NOT EXISTS idx_ccm_reports_time    ON ccm_billing_reports (generated_at DESC);
