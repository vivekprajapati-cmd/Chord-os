-- =====================================================
-- ChordOS Features Patch — run in Supabase SQL Editor
-- Adds: acknowledgment, submission, revision tracking,
--       delay counts, member stats
-- =====================================================

-- Add new columns to tasks table
alter table tasks
  add column if not exists acknowledged_at timestamptz,
  add column if not exists submission_link text,
  add column if not exists submitted_at timestamptz,
  add column if not exists on_time boolean,
  add column if not exists revision_round integer default 0,
  add column if not exists delay_count integer default 0;

-- Revision history — one row per rework round
create table if not exists task_revisions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  round integer not null,                    -- 1, 2, 3...
  submission_link text,                      -- what was submitted this round
  feedback_notes text,                       -- rework notes from reviewer
  submitted_by_id uuid references people(id),
  reviewed_by_id uuid references people(id),
  created_at timestamptz default now()
);

create index if not exists task_revisions_task_idx on task_revisions(task_id);

-- Member stats view — auto-calculated, no extra writes needed
create or replace view member_stats as
select
  p.id as person_id,
  p.name,
  p.department,
  count(t.id) filter (where t.status not in ('cancelled')) as total_tasks,
  count(t.id) filter (where t.status = 'approved') as completed_tasks,
  count(t.id) filter (where t.on_time = true) as on_time_count,
  count(t.id) filter (where t.on_time = false) as late_count,
  coalesce(sum(t.delay_count), 0) as total_delays,
  round(
    count(t.id) filter (where t.on_time = true)::numeric /
    nullif(count(t.id) filter (where t.on_time is not null), 0) * 100,
    1
  ) as on_time_rate,
  round(
    avg(
      extract(epoch from (t.submitted_at - t.created_at)) / 3600
    ) filter (where t.submitted_at is not null),
    1
  ) as avg_turnaround_hours,
  count(t.id) filter (where t.status in ('scheduled', 'in_progress')) as active_tasks
from people p
left join tasks t on t.owner_id = p.id
group by p.id, p.name, p.department;

-- RLS for task_revisions
alter table task_revisions enable row level security;

create policy "task_revisions_read" on task_revisions for select using (
  auth.uid() in (select auth_user_id from people)
);
create policy "task_revisions_modify" on task_revisions for all using (
  auth.uid() in (select auth_user_id from people)
);
