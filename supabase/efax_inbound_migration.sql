-- Comms → E-fax: inbound faxes, what was read off each one and the patient
-- it's linked to. Holds patient details: signed-in users only; anon gets no
-- access.

CREATE TABLE IF NOT EXISTS efax_inbound (
  id             TEXT PRIMARY KEY,
  sender_name    TEXT NOT NULL,
  sender_fax     TEXT,
  document_type  TEXT,
  document_name  TEXT,
  pages          INTEGER,
  note           TEXT,
  received_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- high | review | none: how sure the patient match is
  scenario       TEXT NOT NULL DEFAULT 'none',
  -- { name, dob, memberId } as read off the fax
  extracted      JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- snapshot of the suggested patient { id, name, dob, memberId, gender, age, phone }
  suggested      JSONB,
  -- { patientId, name, by, at } once filed under a patient
  linked         JSONB,
  read           BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS efax_inbound_received_idx ON efax_inbound (received_at DESC);

ALTER TABLE efax_inbound ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for efax_inbound" ON efax_inbound;
CREATE POLICY "Allow all for efax_inbound" ON efax_inbound FOR ALL TO authenticated USING (true) WITH CHECK (true);
