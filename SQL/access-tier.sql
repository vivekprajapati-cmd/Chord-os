-- Run this in Supabase SQL Editor
-- Adds access_tier to people and promotes existing team leads to admin

alter table people
  add column if not exists access_tier text not null default 'staff'
  check (access_tier in ('admin', 'poc', 'staff'));

-- Anyone already flagged as team lead becomes admin
update people set access_tier = 'admin' where is_team_lead = true;

-- Brand solutions POCs — uncomment after they've signed in and have rows in people
-- update people set access_tier = 'poc' where name in (
--   'Muskaan Madnani',
--   'Moksha Mehta',
--   'Shivani Reshamwala',
--   'Shanvi Patel'
-- );
