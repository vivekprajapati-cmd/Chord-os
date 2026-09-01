-- Feedback table for HR module
-- Flow: manager submits → status pending_hr → HR publishes → status published
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,   -- the employee being reviewed
  submitted_by uuid not null references people(id),                  -- the manager who wrote it
  period text not null,                                              -- e.g. "Q2 2026", "August 2026"
  content text not null,                                             -- manager's written feedback
  hr_notes text,                                                     -- optional notes added by HR before publishing
  status text not null default 'pending_hr'
    check (status in ('pending_hr', 'published')),
  published_by uuid references people(id),                           -- HR person who published
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table feedback enable row level security;

-- Employees see only their own published feedback
-- Managers see feedback they submitted
-- Admin and HR see everything
create policy "feedback_access" on feedback for all using (
  -- the employee sees their own published feedback
  (person_id = (select id from people where email = auth.jwt()->>'email') and status = 'published')
  -- the manager who wrote it sees their own submissions
  or submitted_by = (select id from people where email = auth.jwt()->>'email')
  -- admin and hr see everything
  or exists (
    select 1 from people where email = auth.jwt()->>'email' and access_tier in ('admin', 'hr')
  )
);
