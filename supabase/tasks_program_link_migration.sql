-- ============================================================
-- Program Related Tasks: persist the link between a task and a
-- patient's care program so a program's tasks survive reload.
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS program_code TEXT,
  ADD COLUMN IF NOT EXISTS patient_id TEXT;

CREATE INDEX IF NOT EXISTS tasks_program_patient_idx ON tasks (program_code, patient_id);

-- tasks already has an open RLS policy ("Allow all for tasks"), so no new
-- policy is needed. Program tasks are user-created at runtime, so there is no
-- seed data for this migration.
