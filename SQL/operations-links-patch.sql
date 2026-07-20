-- Operations multi-link patch — run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ops_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  added_by_id uuid REFERENCES people(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ops_links_sort ON ops_links(sort_order);

ALTER TABLE ops_links ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "ops_links_read" ON ops_links
  FOR SELECT USING (auth.uid() IN (SELECT auth_user_id FROM people));

-- Only admins can write
CREATE POLICY "ops_links_write" ON ops_links
  FOR ALL USING (
    auth.uid() IN (
      SELECT auth_user_id FROM people WHERE access_tier = 'admin'
    )
  );
