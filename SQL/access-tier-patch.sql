-- Access tier patch — run in Supabase SQL Editor
-- =====================================================

-- 1. Add columns
alter table people
  add column if not exists access_tier text default 'staff',
  add column if not exists manager_id uuid references people(id),
  add column if not exists view_all boolean default false;

-- 2. Set access tiers by name (update emails to match your DB)
-- ADMINS
update people set access_tier = 'admin', view_all = true where name ilike '%Shivangi%';

-- LEADS
update people set access_tier = 'lead', view_all = true  where name ilike '%Trupti%';
update people set access_tier = 'lead', view_all = false where name ilike '%Pierre%';
update people set access_tier = 'lead', view_all = false where name ilike '%Nimesh%';
update people set access_tier = 'lead', view_all = false where name ilike '%Pratik%';

-- VIEWERS
update people set access_tier = 'viewer', view_all = true  where name ilike '%Simran%';
update people set access_tier = 'viewer', view_all = false where name ilike '%Shivani%';
update people set access_tier = 'viewer', view_all = false where name ilike '%Shanvi%';
update people set access_tier = 'viewer', view_all = false where name ilike '%Aakansha%';

-- 3. Set manager_id relationships
-- Trupti's team
update people set manager_id = (select id from people where name ilike '%Trupti%' limit 1)
  where name ilike any(array['%Shanvi%','%Shivani%','%Aakansha%','%Sakshi%','%Nipra%']);

-- Pierre's direct reports
update people set manager_id = (select id from people where name ilike '%Pierre%' limit 1)
  where name ilike any(array['%Nimesh%','%Shruti%']);

-- Nimesh's direct reports
update people set manager_id = (select id from people where name ilike '%Nimesh%' limit 1)
  where name ilike any(array['%Pratik%','%Vineet%','%Kuldip%']);

-- Pratik's direct reports
update people set manager_id = (select id from people where name ilike '%Pratik%' limit 1)
  where name ilike any(array['%Yashika%','%Dhanashree%']);

-- Verify
select name, access_tier, view_all,
  (select name from people p2 where p2.id = people.manager_id) as manager
from people
order by access_tier, name;
