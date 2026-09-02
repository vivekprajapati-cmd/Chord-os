-- Add approver_id column to leaves table
-- This is who the employee selected to approve their leave (manager or team lead)
alter table leaves add column if not exists approver_id uuid references people(id);
