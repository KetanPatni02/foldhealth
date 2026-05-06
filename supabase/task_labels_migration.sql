-- ============================================================
-- Task labels table (custom labels created from the Tasks page)
-- ============================================================

CREATE TABLE IF NOT EXISTS task_labels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for task_labels" ON task_labels FOR ALL USING (true) WITH CHECK (true);

-- Seed default labels
INSERT INTO task_labels (name) VALUES
  ('Hypertension'),
  ('Exercise'),
  ('Document Collection'),
  ('Medication'),
  ('Diabetes'),
  ('Follow-up')
ON CONFLICT (name) DO NOTHING;
