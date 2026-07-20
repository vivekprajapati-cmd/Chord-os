-- Client Portal: Phase 1
-- Run on both staging and production Supabase before deploying.

-- Table: client_accounts
-- One row per client login. Links a Supabase auth user to a brand.
create table if not exists client_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  email text not null unique,
  brand_id uuid not null references brands(id) on delete cascade,
  created_by_person_id uuid references people(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- RLS: strict — client can only read their own row
alter table client_accounts enable row level security;

create policy "client can read own account"
  on client_accounts for select
  using (auth.uid() = auth_user_id);

-- Internal staff (any authenticated Supabase user) can read all — for admin UI
create policy "staff can read all client accounts"
  on client_accounts for select
  using (
    exists (
      select 1 from people
      where people.auth_user_id = auth.uid()
    )
  );

create policy "staff can insert client accounts"
  on client_accounts for insert
  with check (
    exists (
      select 1 from people
      where people.auth_user_id = auth.uid()
    )
  );

create policy "staff can update client accounts"
  on client_accounts for update
  using (
    exists (
      select 1 from people
      where people.auth_user_id = auth.uid()
    )
  );
