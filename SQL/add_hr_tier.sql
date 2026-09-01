-- Add 'hr' value to the existing access_tier enum
alter type access_tier_enum add value if not exists 'hr';
