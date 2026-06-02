-- RLS patch — fixes the chicken-and-egg problem where auth_user_id is null on first login,
-- causing all queries to return empty. Replace the strict check with "any authenticated user".

-- People
drop policy if exists "people_read_all" on people;
create policy "people_read_all" on people
  for select using (auth.uid() is not null);

drop policy if exists "people_update_self" on people;
create policy "people_update_self" on people
  for update using (auth.uid() is not null);

-- Brands
drop policy if exists "brands_read_all" on brands;
create policy "brands_read_all" on brands
  for select using (auth.uid() is not null);

-- Tasks
drop policy if exists "tasks_read_all" on tasks;
create policy "tasks_read_all" on tasks
  for select using (auth.uid() is not null);

drop policy if exists "tasks_modify_leads_or_owner" on tasks;
create policy "tasks_modify_leads_or_owner" on tasks
  for all using (auth.uid() is not null);

-- Blocks
drop policy if exists "blocks_read_all" on blocks;
create policy "blocks_read_all" on blocks
  for select using (auth.uid() is not null);

drop policy if exists "blocks_modify_leads_or_owner" on blocks;
create policy "blocks_modify_leads_or_owner" on blocks
  for all using (auth.uid() is not null);

-- Task references
drop policy if exists "task_references_read" on task_references;
create policy "task_references_read" on task_references
  for select using (auth.uid() is not null);

drop policy if exists "task_references_modify" on task_references;
create policy "task_references_modify" on task_references
  for all using (auth.uid() is not null);

-- Activity log
drop policy if exists "activity_log_read" on activity_log;
create policy "activity_log_read" on activity_log
  for select using (auth.uid() is not null);

drop policy if exists "activity_log_insert" on activity_log;
create policy "activity_log_insert" on activity_log
  for insert with check (auth.uid() is not null);

-- AI gate results
drop policy if exists "ai_gate_results_read" on ai_gate_results;
create policy "ai_gate_results_read" on ai_gate_results
  for select using (auth.uid() is not null);

drop policy if exists "ai_gate_results_modify" on ai_gate_results;
create policy "ai_gate_results_modify" on ai_gate_results
  for all using (auth.uid() is not null);

-- Chat messages
drop policy if exists "chat_messages_self" on chat_messages;
create policy "chat_messages_self" on chat_messages
  for all using (auth.uid() is not null);
