-- Brand documents table — run in Supabase SQL Editor
create table if not exists brand_documents (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete cascade not null,
  name text not null,
  file_path text not null,        -- storage path: briefings/{brand-slug}/{filename}
  file_type text not null,        -- pdf, doc, ppt, etc.
  file_size integer,              -- bytes
  uploaded_by_id uuid references people(id),
  created_at timestamptz default now()
);

create index if not exists brand_documents_brand_idx on brand_documents(brand_id);

-- RLS
alter table brand_documents enable row level security;

create policy "brand_documents_read" on brand_documents for select using (
  auth.uid() in (select auth_user_id from people)
);
create policy "brand_documents_insert" on brand_documents for insert with check (
  auth.uid() in (select auth_user_id from people where is_team_lead = true)
);
create policy "brand_documents_delete" on brand_documents for delete using (
  auth.uid() in (select auth_user_id from people where is_team_lead = true)
);

-- Supabase Storage bucket (run separately in Storage dashboard or via API)
-- Bucket name: briefings
-- Public: false (authenticated access only)
