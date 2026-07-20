-- Add start_date to tasks — run in Supabase SQL Editor
alter table tasks
  add column if not exists start_date timestamptz;
