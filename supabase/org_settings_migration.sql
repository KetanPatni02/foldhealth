-- Org settings: branding (logo, name) + social accounts for the Member/Leads → Org tab.
CREATE TABLE IF NOT EXISTS org_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  show_name BOOLEAN DEFAULT false,
  about TEXT,
  logo_url TEXT,            -- data URL (base64) or hosted URL
  twitter TEXT,
  instagram TEXT,
  facebook TEXT,
  linkedin TEXT,
  website TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- If the table already existed from an earlier draft, bring it up to schema.
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS show_name BOOLEAN DEFAULT false;
ALTER TABLE org_settings ADD COLUMN IF NOT EXISTS linkedin TEXT;

CREATE INDEX IF NOT EXISTS idx_org_settings_user_id ON org_settings(user_id);

ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own org settings" ON org_settings;
CREATE POLICY "Users can read their own org settings" ON org_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own org settings" ON org_settings;
CREATE POLICY "Users can update their own org settings" ON org_settings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own org settings" ON org_settings;
CREATE POLICY "Users can insert their own org settings" ON org_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
