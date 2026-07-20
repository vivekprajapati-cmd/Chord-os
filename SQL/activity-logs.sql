-- Activity logs table for Harmony
-- Run on staging (develop) Supabase

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  actor_name text,
  actor_email text,
  action text not null,           -- e.g. 'task.create', 'brand.edit', 'file.upload'
  entity_type text,               -- 'task', 'brand', 'file', 'briefing', 'client_account'
  entity_id text,
  description text not null,      -- human-readable summary
  metadata jsonb                  -- extra context (brand name, old/new values, etc.)
);

create index if not exists activity_logs_created_at_idx on activity_logs(created_at desc);
create index if not exists activity_logs_action_idx on activity_logs(action);
