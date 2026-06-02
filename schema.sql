-- ChordOS — Supabase schema
-- Run this in Supabase SQL Editor after creating a new project.
-- Auth: Google SSO restricted to @1702digital.com domain (+ Kuldip whitelist) — enforced in app callback.

-- =====================================================
-- CORE TABLES
-- =====================================================

-- People: the 19 humans on the team
create table people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) unique,  -- null until they first log in
  name text not null,
  email text not null unique,
  role text not null,                       -- e.g. "Art Director", "Copywriter"
  department text not null,                 -- e.g. "Creative", "Video", "Account"
  seniority text,                           -- Exec / Lead / Senior / Mid / Junior / Trainee / Intern
  location text default 'Mumbai',
  is_team_lead boolean default false,       -- can use chat allocator + approve work
  default_hours_per_day int default 8,
  created_at timestamptz default now()
);

create index people_email_idx on people(email);
create index people_lead_idx on people(is_team_lead) where is_team_lead = true;

-- Brands the agency works on
create table brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                -- IndiaGate, TrueSilver, AlphaKid, Vadilal
  name text not null,
  category text,                            -- FMCG / Luxury / D2C / etc
  tier text default 'tier-2',               -- tier-1 (hard AI gates) | tier-2 | tier-3
  account_lead_id uuid references people(id),
  brand_pack_path text,                     -- /second-brain/brands/IndiaGate/ for MD lookups
  typography jsonb default '{}'::jsonb,     -- {display: ..., body: ..., weights: ...}
  colors jsonb default '{}'::jsonb,         -- {primary: "#...", secondary: "#...", ...}
  voice_summary text,                       -- short voice doc (cached from Tone & Voice.md)
  status text default 'active',             -- active / paused / churned
  created_at timestamptz default now()
);

-- Tasks — units of work
create table tasks (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) not null,
  deliverable text not null,                -- "Video edit", "3 carousels", "SEO blog draft"
  task_type text not null,                  -- copy / design / video / seo / content / strategy / other
  owner_id uuid references people(id) not null,
  reviewer_id uuid references people(id),
  assigned_by_id uuid references people(id) not null,
  priority text default 'P1',               -- P0 / P1 / P2
  estimated_hours numeric not null,
  status text default 'scheduled',          -- scheduled / in_progress / ready_for_review / approved / done / cancelled
  notes text,
  deadline timestamptz,
  started_at timestamptz,
  done_marked_at timestamptz,
  approved_at timestamptz,
  approved_by_id uuid references people(id),
  created_at timestamptz default now()
);

create index tasks_owner_idx on tasks(owner_id);
create index tasks_brand_idx on tasks(brand_id);
create index tasks_status_idx on tasks(status);

-- Blocks — calendar entries that hold a slot for a task
create table blocks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  person_id uuid references people(id) not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text default 'scheduled',          -- scheduled / in_progress / done / overrun / cancelled
  actual_hours numeric,                     -- filled when marked done
  created_at timestamptz default now()
);

create index blocks_person_time_idx on blocks(person_id, start_at, end_at);
create index blocks_task_idx on blocks(task_id);

-- References — assets attached to a task (storyboard, mood board, image links)
create table task_references (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  ref_type text not null,                   -- storyboard / mood / image / video / doc / link
  url text,                                 -- external link
  storage_path text,                        -- supabase storage path if uploaded
  caption text,
  attached_by_id uuid references people(id),
  created_at timestamptz default now()
);

create index task_references_task_idx on task_references(task_id);

-- AI gate results — Step 6 of Project Optimize
create table ai_gate_results (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  gate_type text not null,                  -- brief_alignment / originality / tone / ai_mock / storyboard / motion / voice
  status text not null,                     -- pending / passed / failed / overridden
  score numeric,                            -- 1-10 where applicable
  result_notes text,
  override_reason text,
  override_by_id uuid references people(id),
  created_at timestamptz default now()
);

create index ai_gate_results_task_idx on ai_gate_results(task_id);

-- Chat messages — for the chat allocator interface
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references people(id) not null,
  thread_id text not null,                  -- e.g. user's daily thread, or per-brand thread
  role text not null,                       -- user / assistant / tool
  content jsonb not null,                   -- {text, tool_use, tool_result}
  task_id uuid references tasks(id),        -- if this message created/affected a task
  created_at timestamptz default now()
);

create index chat_messages_thread_idx on chat_messages(thread_id, created_at);
create index chat_messages_user_idx on chat_messages(user_id, created_at);

-- Activity log — audit trail
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references people(id),
  action text not null,                     -- task_created / task_assigned / block_created / done_marked / approved / overrun / etc
  task_id uuid references tasks(id),
  block_id uuid references blocks(id),
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index activity_log_task_idx on activity_log(task_id, created_at);
create index activity_log_actor_idx on activity_log(actor_id, created_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table people enable row level security;
alter table brands enable row level security;
alter table tasks enable row level security;
alter table blocks enable row level security;
alter table task_references enable row level security;
alter table ai_gate_results enable row level security;
alter table chat_messages enable row level security;
alter table activity_log enable row level security;

-- People — everyone can read all people; only admins update
create policy "people_read_all" on people for select using (
  auth.uid() in (select auth_user_id from people)
);

-- Brands — everyone in the org can read; team leads update
create policy "brands_read_all" on brands for select using (
  auth.uid() in (select auth_user_id from people)
);
create policy "brands_modify_leads" on brands for all using (
  auth.uid() in (select auth_user_id from people where is_team_lead = true)
);

-- Tasks — owner + assigner + reviewer can see; everyone can read at v1 (small team)
create policy "tasks_read_all" on tasks for select using (
  auth.uid() in (select auth_user_id from people)
);
create policy "tasks_modify_leads_or_owner" on tasks for all using (
  auth.uid() in (
    select auth_user_id from people
    where id = tasks.owner_id or id = tasks.assigned_by_id or id = tasks.reviewer_id or is_team_lead = true
  )
);

-- Blocks — visible to all (so people see each other's loads); modifiable by leads or block-owner
create policy "blocks_read_all" on blocks for select using (
  auth.uid() in (select auth_user_id from people)
);
create policy "blocks_modify_leads_or_owner" on blocks for all using (
  auth.uid() in (
    select auth_user_id from people
    where id = blocks.person_id or is_team_lead = true
  )
);

-- References, gates, chat, activity — same pattern
create policy "task_references_read" on task_references for select using (
  auth.uid() in (select auth_user_id from people)
);
create policy "task_references_modify" on task_references for all using (
  auth.uid() in (select auth_user_id from people where is_team_lead = true)
  or auth.uid() in (
    select p.auth_user_id from people p
    join tasks t on t.owner_id = p.id or t.assigned_by_id = p.id
    where t.id = task_references.task_id
  )
);

create policy "ai_gate_results_read" on ai_gate_results for select using (
  auth.uid() in (select auth_user_id from people)
);
create policy "ai_gate_results_modify" on ai_gate_results for all using (
  auth.uid() in (select auth_user_id from people)
);

create policy "chat_messages_self" on chat_messages for all using (
  auth.uid() in (select auth_user_id from people where id = chat_messages.user_id)
);

create policy "activity_log_read" on activity_log for select using (
  auth.uid() in (select auth_user_id from people)
);
create policy "activity_log_insert" on activity_log for insert with check (
  auth.uid() in (select auth_user_id from people where id = activity_log.actor_id)
);
