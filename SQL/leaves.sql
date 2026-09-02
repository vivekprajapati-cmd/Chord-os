-- Leaves table for HR leave management
create table if not exists leaves (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  type text not null check (type in ('planned', 'urgent', 'birthday')),
  start_date date not null,
  end_date date not null,
  duration_days int not null generated always as (end_date - start_date + 1) stored,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references people(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Leave balance config per person per year
-- Probation defaults: planned=0, urgent=1, birthday=1
-- Regular defaults:   planned=12, urgent=8, birthday=1
create table if not exists leave_balances (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  year int not null default extract(year from now())::int,
  planned_total int not null default 12,
  urgent_total  int not null default 8,
  birthday_total int not null default 1,
  unique (person_id, year)
);

-- RLS: staff see only their own leaves; admins/ops see all
alter table leaves enable row level security;
alter table leave_balances enable row level security;

create policy "leaves_own" on leaves for all using (
  person_id = (select id from people where email = auth.jwt()->>'email')
  or exists (
    select 1 from people where email = auth.jwt()->>'email' and access_tier in ('admin', 'lead', 'operations')
  )
);

create policy "leave_balances_own" on leave_balances for all using (
  person_id = (select id from people where email = auth.jwt()->>'email')
  or exists (
    select 1 from people where email = auth.jwt()->>'email' and access_tier in ('admin', 'lead', 'operations')
  )
);
