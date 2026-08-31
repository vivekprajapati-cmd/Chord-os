-- Run this in Supabase SQL editor

create table if not exists nps_forms (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  form_id text not null,
  quarter text not null, -- e.g. "Q3 2026"
  created_at timestamptz default now()
);

create index if not exists nps_forms_brand_id_idx on nps_forms(brand_id);
