-- Operations patch — run in Supabase SQL Editor
-- Adds a simple app_settings table for key/value config (ops embed URL etc.)

CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_by_id uuid REFERENCES people(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Seed the ops embed URL row
INSERT INTO app_settings (key, value)
VALUES ('ops_embed_url', '')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "app_settings_read" ON app_settings
  FOR SELECT USING (auth.uid() IN (SELECT auth_user_id FROM people));

-- Only admins can write
CREATE POLICY "app_settings_write" ON app_settings
  FOR ALL USING (
    auth.uid() IN (
      SELECT auth_user_id FROM people WHERE access_tier = 'admin'
    )
  );
