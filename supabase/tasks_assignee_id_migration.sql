-- ============================================================
-- Tasks: profile-id columns for assignee + creator
-- ============================================================
-- Replaces fragile name-string matching ("Assigned to Me" comparing
-- assigned_to text against the current user's display name) with
-- proper foreign keys to profiles(id). Keeps the legacy text columns
-- intact as a denormalized display cache; the app prefers the FK and
-- falls back to the text column for legacy rows.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_id  UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_assigned_to_id_idx ON tasks (assigned_to_id);
CREATE INDEX IF NOT EXISTS tasks_created_by_id_idx  ON tasks (created_by_id);

-- Best-effort backfill: map legacy text values to a profile by full_name.
-- Idempotent — only fills rows where the FK is currently null. Rows whose
-- assigned_to text doesn't match any profile (e.g., the seed string
-- "Dr. JeDee Potter") stay null; the app will show them under "All Tasks"
-- and the user can reassign them with the assignee dropdown.

UPDATE tasks
   SET assigned_to_id = (SELECT p.id FROM profiles p WHERE p.full_name = tasks.assigned_to LIMIT 1)
 WHERE assigned_to_id IS NULL
   AND assigned_to IS NOT NULL;

UPDATE tasks
   SET created_by_id = (SELECT p.id FROM profiles p WHERE p.full_name = tasks.created_by LIMIT 1)
 WHERE created_by_id IS NULL
   AND created_by IS NOT NULL;
