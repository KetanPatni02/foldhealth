-- ============================================================
-- Tasks table for the Tasks page
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  meta TEXT DEFAULT '',
  parent_task TEXT DEFAULT NULL,
  is_subtask BOOLEAN DEFAULT FALSE,
  attachments INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'missed', 'completed')),
  due_date TEXT DEFAULT NULL,
  due_missed BOOLEAN DEFAULT FALSE,
  member TEXT DEFAULT '',
  labels TEXT[] DEFAULT '{}',
  assigned_to TEXT DEFAULT NULL,
  created_by TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (open for prototype)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
