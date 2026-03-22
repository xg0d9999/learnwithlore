-- Add level and language tracking to profiles for better assignment filtering
alter table profiles 
add column if not exists level text check (level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')) default 'A1',
add column if not exists language text default 'English';

-- Create an index for faster filtering in the assignment modal
create index if not exists idx_profiles_level_language on profiles(level, language);
