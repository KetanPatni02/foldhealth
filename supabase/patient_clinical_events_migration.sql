-- patient_clinical_events: Event-level clinical data for coded terminology
-- rule evaluation (ICD-10, SNOMED, CPT, LOINC, RxNorm).
-- Supports temporal queries, numeric observations, and count aggregation.

CREATE TABLE IF NOT EXISTS public.patient_clinical_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      text NOT NULL,
  event_type      text NOT NULL
    CHECK (event_type IN ('diagnosis','procedure','medication','lab','encounter','immunization')),
  code            text,
  code_system     text,
  display         text,
  effective_date  date,
  end_date        date,
  status          text DEFAULT 'active',
  numeric_value   numeric,
  unit            text,
  reference_low   numeric,
  reference_high  numeric,
  source          text DEFAULT 'ehr',
  raw_meta        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pce_patient_type
  ON public.patient_clinical_events (patient_id, event_type);
CREATE INDEX IF NOT EXISTS idx_pce_code
  ON public.patient_clinical_events (code, code_system);
CREATE INDEX IF NOT EXISTS idx_pce_effective
  ON public.patient_clinical_events (effective_date);
CREATE INDEX IF NOT EXISTS idx_pce_patient_code
  ON public.patient_clinical_events (patient_id, code, effective_date);

ALTER TABLE public.patient_clinical_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.patient_clinical_events;
CREATE POLICY "Allow all" ON public.patient_clinical_events
  FOR ALL USING (true);


-- pop_group_triggers: Automation triggers fired when population group
-- membership changes (member added/removed, rule match, scheduled).

CREATE TABLE IF NOT EXISTS public.pop_group_triggers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        uuid NOT NULL,
  name            text NOT NULL,
  enabled         boolean NOT NULL DEFAULT true,
  trigger_event   text NOT NULL
    CHECK (trigger_event IN ('member_added', 'member_removed', 'rule_matched', 'scheduled')),
  action_type     text NOT NULL
    CHECK (action_type IN ('invoke_agent', 'send_notification', 'add_tag', 'enroll_program', 'webhook')),
  action_config   jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pop_group_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.pop_group_triggers;
CREATE POLICY "Allow all" ON public.pop_group_triggers
  FOR ALL USING (true);


-- pop_group_memberships: Snapshot of which patients belong to which
-- population group, enabling diff-based trigger detection.

CREATE TABLE IF NOT EXISTS public.pop_group_memberships (
  group_id    uuid NOT NULL,
  patient_id  text NOT NULL,
  joined_at   timestamptz NOT NULL DEFAULT now(),
  left_at     timestamptz,
  PRIMARY KEY (group_id, patient_id)
);

ALTER TABLE public.pop_group_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.pop_group_memberships;
CREATE POLICY "Allow all" ON public.pop_group_memberships
  FOR ALL USING (true);
