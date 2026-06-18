-- HCC Activity Log — append-only event store
-- Spec: docs/features/hcc-activity-log-spec.md
-- Single canonical event table; all four UI surfaces (Worklist History,
-- DiagPanel ActivityTab, Patient History, Batch Dashboard) read filtered
-- views of this table.

CREATE TABLE IF NOT EXISTS hcc_activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts              timestamptz NOT NULL DEFAULT now(),

  -- Event identity
  category        text NOT NULL,                          -- 'intake' | 'ocr' | 'matching' | 'review' | 'worklist' | 'icd' | 'dedup' | 'claim' | 'audit'
  event_name      text NOT NULL,                          -- e.g. 'assignee.changed', 'encounter.approved'
  severity        text NOT NULL DEFAULT 'info',           -- 'info' | 'warning' | 'error' | 'success'

  -- Actor snapshot — captured at write time, never updated even if the
  -- user is later renamed or has their role changed. Per HIPAA we keep
  -- the value as it was when the action occurred.
  actor_id        text,                                   -- auth.users.id or 'system'
  actor_name      text,
  actor_role      text,
  source          text NOT NULL,                          -- 'manual' | 'sftp' | 'system' | 'astrana'

  -- Scope — every event sets the subset that applies. Indexed columns
  -- below are the common filter axes; everything else lives in payload.
  batch_id        text,
  file_id         text,
  encounter_id    text,
  patient_id      text,
  dos             text,
  icd             text,
  claim_id        text,

  -- Human-facing copy — rendered as-is in the timeline. Producers fill
  -- templates from spec §3 / §5–§7. Keeping it denormalised keeps reads
  -- cheap and avoids re-rendering when source rows change.
  headline        text NOT NULL,

  -- Free-form structured detail. Edit events carry { fieldName,
  -- originalValues, modifiedValues, ocrConfidence? } per spec §8.
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Forensics — set server-side via RLS / edge function, never trusted
  -- from the client. Null when running unauthenticated (dev/seed).
  ip_address      inet,
  user_agent      text
);

-- Common filter axes: keep these indexed so timeline reads stay fast.
CREATE INDEX IF NOT EXISTS idx_hcc_activity_patient_ts  ON hcc_activity_log (patient_id, ts DESC) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcc_activity_batch_ts    ON hcc_activity_log (batch_id, ts DESC)   WHERE batch_id   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hcc_activity_event_ts    ON hcc_activity_log (event_name, ts DESC);
CREATE INDEX IF NOT EXISTS idx_hcc_activity_ts          ON hcc_activity_log (ts DESC);
CREATE INDEX IF NOT EXISTS idx_hcc_activity_encounter   ON hcc_activity_log (encounter_id) WHERE encounter_id IS NOT NULL;

-- Append-only enforcement. The log is evidence for HIPAA disclosure
-- requests — once a row lands it must not be edited or deleted from
-- the app. Only privileged service roles (running migrations or a
-- redaction workflow) should be able to mutate.
ALTER TABLE hcc_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hcc_activity_log_select ON hcc_activity_log;
CREATE POLICY hcc_activity_log_select  ON hcc_activity_log FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS hcc_activity_log_insert ON hcc_activity_log;
CREATE POLICY hcc_activity_log_insert  ON hcc_activity_log FOR INSERT TO authenticated, anon WITH CHECK (true);

-- No UPDATE / DELETE policies created — RLS denies by default, which is
-- exactly the append-only behavior we want. To redact, run via the
-- service-role key from a controlled script, not from the app.

COMMENT ON TABLE  hcc_activity_log IS 'Append-only event store for the HCC pipeline. See docs/features/hcc-activity-log-spec.md.';
COMMENT ON COLUMN hcc_activity_log.source IS 'manual | sftp | system | astrana';
COMMENT ON COLUMN hcc_activity_log.payload IS 'Event-specific structured data. Edit events carry originalValues / modifiedValues / ocrConfidence per spec §8.';
