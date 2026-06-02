-- ChordOS — Brand Brain schema
-- Run in Supabase SQL Editor AFTER schema.sql

-- =====================================================
-- BRAND MEETINGS — one row per client call
-- =====================================================

create table if not exists brand_meetings (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid references brands(id) on delete cascade not null,
  logged_by_id    uuid references people(id) not null,
  meeting_date    date not null default current_date,
  raw_notes       text not null,
  ai_summary      text,
  decisions       jsonb default '[]'::jsonb,
  -- [{deliverable, task_type, estimated_hours, assignee_role, brief, priority}]
  tasks_suggested jsonb default '[]'::jsonb,
  -- [{rule, category}]  category: tone | visual | process | hard_no
  knowledge_delta jsonb default '[]'::jsonb,
  tasks_confirmed boolean default false,
  created_at      timestamptz default now()
);

create index if not exists brand_meetings_brand_idx on brand_meetings(brand_id);
create index if not exists brand_meetings_date_idx on brand_meetings(brand_id, meeting_date desc);

-- =====================================================
-- KNOWLEDGE column on brands
-- Accumulated brain: rules, rejections, approvals, contacts
-- Updated after every meeting confirmation
-- =====================================================

alter table brands
  add column if not exists knowledge jsonb default '{
    "rules": [],
    "rejections": [],
    "approvals": [],
    "contacts": []
  }'::jsonb;

-- meeting_id column on tasks so task cards can link back to the meeting brief
alter table tasks
  add column if not exists meeting_id uuid references brand_meetings(id);

alter table tasks
  add column if not exists brief text;

-- =====================================================
-- RLS for brand_meetings
-- =====================================================

alter table brand_meetings enable row level security;

create policy "meetings_read" on brand_meetings
  for select using (auth.uid() is not null);

create policy "meetings_insert" on brand_meetings
  for insert with check (auth.uid() is not null);

create policy "meetings_update_own" on brand_meetings
  for update using (auth.uid() is not null);
