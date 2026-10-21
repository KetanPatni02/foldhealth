-- Settings → Billing: billable claims, monthly billing reports and the
-- billing-timer visibility rule per care program. Patient billing data:
-- signed-in users only; anon gets no access.

CREATE TABLE IF NOT EXISTS care_program_billable (
  id                TEXT PRIMARY KEY,
  member_name       TEXT NOT NULL,
  gender            TEXT,
  age               INT,
  ehr_id            TEXT,
  date_of_service   DATE,
  program_type      TEXT,
  cpt_code          TEXT,
  bill              NUMERIC(10, 2),
  provider          TEXT,
  chronic_condition TEXT,
  time_spent_mins   NUMERIC(10, 1),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- One row per monthly report; the billed members ride along as JSON
-- (same shape as care_program_billable rows).
CREATE TABLE IF NOT EXISTS care_program_billing_reports (
  id             TEXT PRIMARY KEY,
  month          DATE NOT NULL,
  est_amount     NUMERIC(10, 2),
  integrated_ehr TEXT,
  members        JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Who sees the billing timer on a patient's profile, per program.
-- access: 'team' | 'team_plus' | 'all'. user_names / roles only apply to
-- 'team_plus'.
CREATE TABLE IF NOT EXISTS billing_timer_settings (
  id             TEXT PRIMARY KEY,
  program        TEXT NOT NULL UNIQUE,
  access         TEXT NOT NULL DEFAULT 'team',
  user_names     JSONB NOT NULL DEFAULT '[]',
  roles          JSONB NOT NULL DEFAULT '[]',
  modified_label TEXT,
  modified_by    TEXT,
  -- Every change, newest first: { at, actor, kind, from?, to?, users?, roles? }
  history        JSONB NOT NULL DEFAULT '[]',
  updated_at     TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE billing_timer_settings ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]';

ALTER TABLE care_program_billable ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_program_billing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_timer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for care_program_billable" ON care_program_billable;
CREATE POLICY "Allow all for care_program_billable" ON care_program_billable FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for care_program_billing_reports" ON care_program_billing_reports;
CREATE POLICY "Allow all for care_program_billing_reports" ON care_program_billing_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for billing_timer_settings" ON billing_timer_settings;
CREATE POLICY "Allow all for billing_timer_settings" ON billing_timer_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
