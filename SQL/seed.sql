-- ChordOS — Seed data
-- Run AFTER schema.sql in Supabase SQL Editor.
-- Re-runnable: uses ON CONFLICT to avoid duplicates.

-- =====================================================
-- 19 PEOPLE — Chord / 1702 team
-- =====================================================

insert into people (name, email, role, department, seniority, location, is_team_lead) values
  -- Admin (tester / ops)
  ('Darshit Raut', 'darshit@ampmnetwork.com', 'Founders Office', 'Ops', 'Lead', 'Mumbai', true),
  -- Leadership
  ('Shivangi Shekhar', 'shivangi.shekhar@1702digital.com', 'Chief of Creative and Strategy', 'Leadership', 'Exec', 'Mumbai', true),
  -- Account
  ('Trupti Maidh', 'trupti.maidh@1702digital.com', 'Account Lead', 'Account', 'Lead', 'Mumbai', true),
  -- Creative
  ('Pierre Santos', 'pierre@1702digital.com', 'Sr. ACD', 'Creative', 'Senior', 'Mumbai', true),
  ('Pratik Kshirsagar', 'pratik.kshirsagar@1702digital.com', 'Art Director', 'Creative', 'Senior', 'Mumbai', true),
  ('Manan Shah', 'manan.shah@1702digital.com', 'Copywriter', 'Creative', 'Mid', 'Mumbai', false),
  ('Kuldip Mankar', 'kuldipmankarr@gmail.com', 'AI Motion Graphic', 'Creative', 'Mid', 'Mumbai', false),
  ('Yashika Mistry', 'yashika.mistry@1702digital.com', 'Jr. Graphic Designer', 'Creative', 'Junior', 'Mumbai', false),
  -- Video
  ('Nimesh Shinde', 'nimesh.shinde@1702digital.com', 'Video Lead', 'Video', 'Lead', 'Mumbai', true),
  ('Vineet Shelar', 'vineet@1702digital.com', 'Video Editor', 'Video', 'Mid', 'Mumbai', false),
  ('Tarun', 'tarun@1702digital.com', 'Video Editor', 'Video', 'Mid', 'Ahmedabad', false),
  -- SEO
  ('Aman Adodra', 'aman@1702digital.com', 'SEO Business Head', 'SEO', 'Lead', 'Mumbai', true),
  -- Content
  ('Dhwani Chhelavda', 'dhwani.chhelavda@1702digital.com', 'Content Creator', 'Content', 'Mid', 'Ahmedabad', false),
  -- Sales
  ('Muskaan Madnani', 'muskaan@1702digital.com', 'Brand Solutions Executive', 'Sales', 'Mid', 'Mumbai', false),
  ('Moksha Mehta', 'moksha@1702digital.com', 'Brand Solutions Executive', 'Sales', 'Mid', 'Mumbai', false),
  ('Shivani Reshamwala', 'shivani.reshamwala@1702digital.com', 'Brand Solutions Executive', 'Sales', 'Mid', 'Mumbai', false),
  -- Marketing
  ('Rajat Dey', 'rajat@1702digital.com', 'Marketing and Alliance', 'Marketing', 'Mid', 'Mumbai', true),
  ('Shawn Dsouza', 'shawn@1702digital.com', 'Influencer Marketing Intern', 'Marketing', 'Intern', 'Mumbai', false),
  ('Shanvi Patel', 'shanvi@1702digital.com', 'Marketing Trainee', 'Marketing', 'Trainee', 'Mumbai', false),
  ('Yassha Gada', 'yassha@1702digital.com', 'Marketing Trainee', 'Marketing', 'Trainee', 'Mumbai', false)
on conflict (email) do update set
  role = excluded.role,
  department = excluded.department,
  seniority = excluded.seniority,
  is_team_lead = excluded.is_team_lead;

-- =====================================================
-- 4 PILOT BRANDS
-- =====================================================

insert into brands (slug, name, category, tier, brand_pack_path, status) values
  ('indiagate', 'IndiaGate', 'FMCG — Basmati Rice', 'tier-1', '/second-brain/brands/IndiaGate/', 'active'),
  ('truesilver', 'TrueSilver', 'Jewellery', 'tier-2', '/second-brain/brands/TrueSilver/', 'active'),
  ('alphakid', 'AlphaKid', 'Kids', 'tier-2', '/second-brain/brands/AlphaKid/', 'active'),
  ('vadilal', 'Vadilal', 'FMCG — Ice Cream / Dairy', 'tier-2', '/second-brain/brands/Vadilal/', 'active')
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  brand_pack_path = excluded.brand_pack_path,
  status = excluded.status;

-- Set account lead = Trupti across all brands
update brands set account_lead_id = (select id from people where email = 'trupti.maidh@1702digital.com')
where slug in ('indiagate', 'truesilver', 'alphakid', 'vadilal');

-- =====================================================
-- INDIAGATE BRAND DETAILS
-- =====================================================

update brands set
  typography = '{"display": "Playfair Display", "body": "Lato", "labels": "Montserrat", "weights": "400 / 600 / 700"}'::jsonb,
  colors     = '{"primary": "#1A3C6E", "secondary": "#D4AF37", "accent": "#FFFFFF", "warm": "#F5E6C8"}'::jsonb,
  voice_summary = 'Premium, heritage, trusted. Rooted in India — national, not regional. Never cheap or pushy. Speaks to the homemaker who takes cooking seriously. Warmth first, aspiration second. Short sentences. No exclamation marks. Gold and navy are load-bearing — never swap them out.'
where slug = 'indiagate';

-- =====================================================
-- DEMO TASKS — assigned to Darshit (re-runnable)
-- =====================================================

do $$
declare
  darshit_id        uuid;
  indiagate_id      uuid;
  vadilal_id        uuid;
  task1_id          uuid;
  task2_id          uuid;
  tomorrow_start    timestamptz;
  tomorrow_end      timestamptz;
  vadilal_start     timestamptz;
  vadilal_end       timestamptz;
begin
  select id into darshit_id   from people where email = 'darshit@ampmnetwork.com';
  select id into indiagate_id from brands where slug  = 'indiagate';
  select id into vadilal_id   from brands where slug  = 'vadilal';

  -- IndiaGate statics: 3h block tomorrow 10am–1pm IST
  tomorrow_start := (now() at time zone 'Asia/Kolkata')::date + interval '1 day' + interval '10 hours';
  tomorrow_end   := tomorrow_start + interval '3 hours';

  -- Vadilal reel: 1h block today from now
  vadilal_start  := now();
  vadilal_end    := now() + interval '1 hour';

  if not exists (
    select 1 from tasks
    where deliverable = '3 static posts — IndiaGate Eid campaign'
      and owner_id = darshit_id
  ) then
    insert into tasks (brand_id, deliverable, task_type, owner_id, assigned_by_id, priority, estimated_hours, status, deadline, notes)
    values (
      indiagate_id,
      '3 static posts — IndiaGate Eid campaign',
      'design',
      darshit_id,
      darshit_id,
      'P1',
      3,
      'scheduled',
      tomorrow_end,
      'Formats: 1:1 feed, 4:5 feed, 9:16 story. Heritage look — navy + gold. No discount messaging. Ref: brand pack /second-brain/brands/IndiaGate/'
    )
    returning id into task1_id;

    insert into blocks (task_id, person_id, start_at, end_at, status)
    values (task1_id, darshit_id, tomorrow_start, tomorrow_end, 'scheduled');
  end if;

  if not exists (
    select 1 from tasks
    where deliverable = 'Vadilal summer reel — first cut review'
      and owner_id = darshit_id
  ) then
    insert into tasks (brand_id, deliverable, task_type, owner_id, assigned_by_id, priority, estimated_hours, status, deadline, notes)
    values (
      vadilal_id,
      'Vadilal summer reel — first cut review',
      'video',
      darshit_id,
      darshit_id,
      'P1',
      1,
      'in_progress',
      vadilal_end,
      'Review rough cut, note timecodes. Send feedback before EOD.'
    )
    returning id into task2_id;

    insert into blocks (task_id, person_id, start_at, end_at, status)
    values (task2_id, darshit_id, vadilal_start, vadilal_end, 'in_progress');
  end if;
end $$;
