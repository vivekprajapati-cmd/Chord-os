-- Migrate leave types: earned/casual/sick/unpaid → planned/urgent/birthday
-- Run on both staging and production Supabase

-- 1. Update existing leave rows to new type names
update leaves set type = 'planned'  where type = 'earned';
update leaves set type = 'urgent'   where type = 'casual';
update leaves set type = 'birthday' where type = 'sick';
delete from leaves where type = 'unpaid'; -- no unpaid in new structure

-- 2. Drop old check constraint, add new one
alter table leaves drop constraint if exists leaves_type_check;
alter table leaves add constraint leaves_type_check
  check (type in ('planned', 'urgent', 'birthday'));

-- 3. Rename leave_balances columns
alter table leave_balances rename column earned_total  to planned_total;
alter table leave_balances rename column casual_total  to urgent_total;
alter table leave_balances rename column sick_total    to birthday_total;
alter table leave_balances drop column if exists unpaid_total;

-- 4. Update defaults
alter table leave_balances alter column planned_total  set default 12;
alter table leave_balances alter column urgent_total   set default 8;
alter table leave_balances alter column birthday_total set default 1;

-- 5. Correct existing balance rows to new totals
update leave_balances set planned_total = 12, urgent_total = 8, birthday_total = 1
where planned_total = 18 or urgent_total = 8; -- adjust if values were the old defaults
