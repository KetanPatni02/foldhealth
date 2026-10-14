-- A patient's other contacts (Care Giver, Emergency Contact, Decision Maker,
-- Alternate Decision Maker): who the patient send drawers can address via
-- "Send To", and the details their protected links verify against.

CREATE TABLE IF NOT EXISTS patient_contacts (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL,
  type        TEXT NOT NULL,   -- 'Care Giver' | 'Emergency Contact' | 'Decision Maker' | 'Alternate Decision Maker'
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  dob         DATE,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS patient_contacts_patient_idx ON patient_contacts (patient_id);

ALTER TABLE patient_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for patient_contacts" ON patient_contacts;
CREATE POLICY "Allow all for patient_contacts" ON patient_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
